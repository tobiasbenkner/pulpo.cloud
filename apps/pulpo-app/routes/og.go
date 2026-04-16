package routes

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

// MenuHandler serves static files from fsys, injecting Open Graph meta tags
// into HTML responses so that link previews (WhatsApp, Facebook, etc.) show
// the restaurant name, address, and logo.
func MenuHandler(app core.App, fsys fs.FS) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		reqPath := e.Request.PathValue("path")

		filePath, data, err := resolveFile(fsys, reqPath)
		if err != nil {
			// SPA fallback
			filePath = "index.html"
			data, err = fs.ReadFile(fsys, filePath)
			if err != nil {
				return e.NotFoundError("", nil)
			}
		}

		if strings.HasSuffix(filePath, ".html") {
			ogTags := buildOGTags(app, e.Request)
			html := strings.Replace(string(data), "<!-- OG_META -->", ogTags, 1)
			html = replaceTitle(app, html, reqPath)
			data = []byte(html)
		}

		ct := mime.TypeByExtension(filepath.Ext(filePath))
		if ct == "" {
			ct = http.DetectContentType(data)
		}

		e.Response.Header().Set("Content-Type", ct)
		_, _ = e.Response.Write(data)
		return nil
	}
}

func resolveFile(fsys fs.FS, reqPath string) (string, []byte, error) {
	reqPath = strings.TrimSuffix(reqPath, "/")
	if reqPath == "" {
		return readFSFile(fsys, "index.html")
	}

	// Try as file
	if filePath, data, err := readFSFile(fsys, reqPath); err == nil {
		return filePath, data, nil
	}

	// Try as directory (path/index.html)
	return readFSFile(fsys, reqPath+"/index.html")
}

func readFSFile(fsys fs.FS, path string) (string, []byte, error) {
	data, err := fs.ReadFile(fsys, path)
	if err != nil {
		return "", nil, err
	}
	return path, data, nil
}

func buildOGTags(app core.App, r *http.Request) string {
	company, err := app.FindFirstRecordByFilter("company", "1=1")
	if err != nil {
		return ""
	}

	name := company.GetString("name")
	street := company.GetString("street")
	city := company.GetString("city")
	postcode := company.GetString("postcode")

	var descParts []string
	if street != "" {
		descParts = append(descParts, street)
	}
	if postcode != "" && city != "" {
		descParts = append(descParts, postcode+" "+city)
	} else if city != "" {
		descParts = append(descParts, city)
	}

	// Build absolute base URL from request for og:image
	scheme := r.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		scheme = "https"
	}
	baseURL := scheme + "://" + r.Host

	var b strings.Builder
	if name != "" {
		b.WriteString(`<meta property="og:title" content="`)
		b.WriteString(escapeAttr(name))
		b.WriteString("\">\n    ")
	}
	if len(descParts) > 0 {
		b.WriteString(`<meta property="og:description" content="`)
		b.WriteString(escapeAttr(strings.Join(descParts, ", ")))
		b.WriteString("\">\n    ")
	}
	b.WriteString(`<meta property="og:type" content="website">`)

	config, err := app.FindFirstRecordByFilter("website_config", "1=1")
	if err == nil {
		logo := config.GetString("logo")
		if logo != "" {
			logoURL := baseURL + "/api/files/" + config.Collection().Id + "/" + config.Id + "/" + logo
			b.WriteString("\n    ")
			b.WriteString(`<meta property="og:image" content="`)
			b.WriteString(logoURL)
			b.WriteString(`">`)
		}
	}

	return b.String()
}

func replaceTitle(app core.App, html string, reqPath string) string {
	company, err := app.FindFirstRecordByFilter("company", "1=1")
	if err != nil {
		return html
	}
	name := company.GetString("name")
	if name == "" {
		return html
	}

	// Map path to page suffix (Spanish default for crawlers)
	pageName := "Carta"
	cleanPath := strings.TrimSuffix(strings.TrimPrefix(reqPath, "/"), "/")
	switch cleanPath {
	case "contact":
		pageName = "Contacto"
	case "imprint":
		pageName = "Aviso Legal"
	case "privacy":
		pageName = "Privacidad"
	}

	newTitle := "<title>" + pageName + " | " + escapeAttr(name) + "</title>"

	// Replace existing <title>...</title>
	start := strings.Index(html, "<title>")
	end := strings.Index(html, "</title>")
	if start != -1 && end != -1 {
		html = html[:start] + newTitle + html[end+len("</title>"):]
	}

	return html
}

func escapeAttr(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}
