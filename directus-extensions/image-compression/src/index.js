import sharp from 'sharp';

export default ({ filter }, { services, logger }) => {
    filter('files.upload', async (input, meta, context) => {
        if (!input.type?.startsWith('image/') || input.type === 'image/svg+xml') {
            return input;
        }

        try {
            const fileBuffer = input.stream
                ? await streamToBuffer(input.stream)
                : input;

            const image = sharp(fileBuffer);
            const metadata = await image.metadata();

            let processedImage = image;

            if (metadata.width > 1000) {
                processedImage = processedImage.resize(1000, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                });
            }

            const compressed = await processedImage
                .webp({ quality: 85 })
                .toBuffer();

            input.stream = bufferToStream(compressed);
            input.type = 'image/webp';
            input.filename = input.filename.replace(/\.[^.]+$/, '.webp');

            logger.info(`Bild konvertiert: ${input.filename}`);

            return input;
        } catch (error) {
            logger.error('Fehler bei Bildkomprimierung:', error);
            return input;
        }
    });
};

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function bufferToStream(buffer) {
    const { Readable } = await import('stream');
    return Readable.from(buffer);
}