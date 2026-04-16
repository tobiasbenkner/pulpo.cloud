package hooks

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"strings"

	"github.com/gabriel-vasile/mimetype"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
	"golang.org/x/image/draw"
)

const (
	maxImageDimension = 1200
	jpegQuality       = 80
)

// registerImageCompressionHook resizes and re-encodes uploaded images for
// every file field across every collection. Opaque images become JPEG (Q=80),
// images with actual transparent pixels stay as PNG. Files whose re-encoded
// size would be larger than the original are passed through unchanged.
func registerImageCompressionHook(app core.App) {
	handle := func(e *core.RecordEvent) error {
		processRecordImages(e.Record)
		return e.Next()
	}
	app.OnRecordCreate().BindFunc(handle)
	app.OnRecordUpdate().BindFunc(handle)
}

func processRecordImages(record *core.Record) {
	collection := record.Collection()
	if collection == nil {
		return
	}
	for _, field := range collection.Fields {
		ff, ok := field.(*core.FileField)
		if !ok {
			continue
		}
		for _, f := range record.GetUnsavedFiles(ff.Name) {
			if err := compressImageFile(f); err != nil {
				log.Printf("image compression: %s/%s: %v", collection.Name, f.OriginalName, err)
			}
		}
	}
}

func compressImageFile(f *filesystem.File) error {
	src, err := f.Reader.Open()
	if err != nil {
		return err
	}
	data, err := io.ReadAll(src)
	src.Close()
	if err != nil {
		return err
	}

	mime := mimetype.Detect(data).String()
	switch {
	case mime == "image/webp":
		return nil // already a compressed web format
	case strings.HasPrefix(mime, "image/svg"):
		return nil // vector, nothing to recompress
	case !strings.HasPrefix(mime, "image/"):
		return nil
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}

	img = resizeIfLarger(img, maxImageDimension)

	var out bytes.Buffer
	var newExt string
	if hasTransparentPixel(img) {
		if err := (&png.Encoder{CompressionLevel: png.BestCompression}).Encode(&out, img); err != nil {
			return fmt.Errorf("encode png: %w", err)
		}
		newExt = ".png"
	} else {
		if err := jpeg.Encode(&out, img, &jpeg.Options{Quality: jpegQuality}); err != nil {
			return fmt.Errorf("encode jpeg: %w", err)
		}
		newExt = ".jpg"
	}

	if int64(out.Len()) >= f.Size {
		return nil // keep original when re-encoding wouldn't save space
	}

	f.Name = swapExt(f.Name, newExt)
	f.OriginalName = swapExt(f.OriginalName, newExt)
	f.Size = int64(out.Len())
	f.Reader = &filesystem.BytesReader{Bytes: out.Bytes()}
	return nil
}

func resizeIfLarger(img image.Image, maxDim int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxDim && h <= maxDim {
		return img
	}
	var newW, newH int
	if w >= h {
		newW = maxDim
		newH = int(float64(h) * float64(maxDim) / float64(w))
	} else {
		newH = maxDim
		newW = int(float64(w) * float64(maxDim) / float64(h))
	}
	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)
	return dst
}

// hasTransparentPixel returns true only when the image actually contains
// non-opaque pixels. An RGBA-modeled image with all alpha=1.0 (e.g. a PNG
// screenshot) returns false so it can be stored as JPEG.
func hasTransparentPixel(img image.Image) bool {
	switch img.ColorModel() {
	case color.YCbCrModel, color.GrayModel, color.Gray16Model, color.CMYKModel, color.NYCbCrAModel:
		return false
	}
	b := img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			if _, _, _, a := img.At(x, y).RGBA(); a < 0xffff {
				return true
			}
		}
	}
	return false
}

func swapExt(name, newExt string) string {
	if idx := strings.LastIndex(name, "."); idx > 0 {
		return name[:idx] + newExt
	}
	return name + newExt
}
