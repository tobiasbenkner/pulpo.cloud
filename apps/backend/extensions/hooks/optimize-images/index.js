module.exports = ({ filter }, { exceptions }) => {
    // Wir klinken uns in den Upload-Prozess ein
    filter('files.upload', async (input, meta, { schema }) => {
        // Prüfen, ob es ein Bild ist
        if (input.type && input.type.startsWith('image/')) {
            const sharp = require('sharp');

            // SVG und GIFs ignorieren
            if (input.type.includes('svg')) return input;

            try {
                const image = sharp(input.file, { animated: true });
                const metadata = await image.metadata();

                // Bedingung: Optimieren nötig?
                if (metadata.width > 1500 || metadata.height > 1500 || metadata.format !== 'webp') {

                    // 1. Konvertierung durchführen
                    const buffer = await image
                        .resize({
                            width: 1500,
                            height: 1500,
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .toFormat('webp', { quality: 80, effort: 4 })
                        .toBuffer();

                    // 2. Metadaten des NEUEN Bildes auslesen
                    // Da wir resized haben, wissen wir die exakten Maße nicht (wegen Aspect Ratio),
                    // deshalb fragen wir Sharp kurz nach den Daten des Buffers.
                    const optimizedImage = sharp(buffer);
                    const newMetadata = await optimizedImage.metadata();

                    // 3. Input Objekt aktualisieren
                    // Diese Werte werden so in die DB geschrieben:
                    input.file = buffer;
                    input.width = newMetadata.width;
                    input.height = newMetadata.height;
                    input.filesize = buffer.length;
                    input.type = "image/webp";

                    // Dateinamen anpassen
                    input.filename_disk = input.filename_disk.replace(/\.[^/.]+$/, "") + ".webp";
                    input.filename_download = input.filename_download.replace(/\.[^/.]+$/, "") + ".webp";
                }
            } catch (error) {
                console.error('Image Optimization Error:', error);
            }
        }

        return input;
    });
};