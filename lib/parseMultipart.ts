import Busboy from 'busboy';
import type { IncomingMessage } from 'node:http';

export interface ParsedMultipartFile {
    buffer: Buffer;
    filename: string;
    mimeType: string;
}

export interface ParsedMultipart {
    fields: Record<string, string>;
    file?: ParsedMultipartFile;
}

export function parseMultipart(
    req: IncomingMessage,
    maxFileBytes: number,
): Promise<ParsedMultipart> {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] ?? '';
        if (!contentType.toLowerCase().includes('multipart/form-data')) {
            reject(new Error('invalid_multipart'));
            return;
        }

        const fields: Record<string, string> = {};
        let file: ParsedMultipartFile | undefined;
        let fileTooLarge = false;

        const busboy = Busboy({
            headers: req.headers,
            limits: { fileSize: maxFileBytes, files: 1, fields: 8 },
        });

        busboy.on('field', (name, value) => {
            fields[name] = value;
        });

        busboy.on('file', (_name, stream, info) => {
            const chunks: Buffer[] = [];
            let size = 0;
            stream.on('data', (chunk: Buffer) => {
                size += chunk.length;
                chunks.push(chunk);
            });
            stream.on('limit', () => {
                fileTooLarge = true;
            });
            stream.on('end', () => {
                if (!fileTooLarge) {
                    file = {
                        buffer: Buffer.concat(chunks),
                        filename: info.filename,
                        mimeType: info.mimeType,
                    };
                }
            });
        });

        busboy.on('error', (err) => reject(err));
        busboy.on('finish', () => {
            if (fileTooLarge) {
                reject(new Error('file_too_large'));
                return;
            }
            resolve({ fields, file });
        });

        req.pipe(busboy);
    });
}
