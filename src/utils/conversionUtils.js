import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// --- Image Conversion ---
export const convertImage = (file, targetFormat) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Determine mime type
                let mimeType = 'image/png';
                if (targetFormat === 'jpg' || targetFormat === 'jpeg') mimeType = 'image/jpeg';
                if (targetFormat === 'webp') mimeType = 'image/webp';
                if (targetFormat === 'bmp') mimeType = 'image/bmp';
                if (targetFormat === 'gif') mimeType = 'image/gif';

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Conversion failed'));
                    }
                }, mimeType);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// --- Spreadsheet Conversion ---
export const convertSpreadsheet = (file, targetFormat) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                let outputData;
                let mimeType = 'text/plain';

                if (targetFormat === 'csv') {
                    outputData = XLSX.utils.sheet_to_csv(worksheet);
                    mimeType = 'text/csv;charset=utf-8';
                } else if (targetFormat === 'json') {
                    outputData = JSON.stringify(XLSX.utils.sheet_to_json(worksheet), null, 2);
                    mimeType = 'application/json;charset=utf-8';
                } else if (targetFormat === 'html') {
                    outputData = XLSX.utils.sheet_to_html(worksheet);
                    mimeType = 'text/html;charset=utf-8';
                } else {
                    reject(new Error('Unsupported spreadsheet target'));
                    return;
                }

                resolve(new Blob([outputData], { type: mimeType }));
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

// --- Document Conversion ---
export const convertDocument = async (file, targetFormat) => {
    const fileName = file.name.toLowerCase();

    // TXT -> PDF
    if (fileName.endsWith('.txt') && targetFormat === 'pdf') {
        const text = await file.text();
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(text, 180);
        let y = 10;
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(splitText[i], 10, y);
            y += 7;
        }
        return doc.output('blob');
    }

    // DOCX -> PDF (Text only)
    if (fileName.endsWith('.docx') && targetFormat === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(text, 180);
        let y = 10;
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(splitText[i], 10, y);
            y += 7;
        }
        return doc.output('blob');
    }

    // DOCX -> TXT
    if (fileName.endsWith('.docx') && targetFormat === 'txt') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return new Blob([result.value], { type: 'text/plain' });
    }

    throw new Error(`Conversion from ${file.name} to ${targetFormat} not fully supported client-side yet.`);
};

// --- Audio Conversion using FFmpeg.wasm ---
let ffmpeg = null;

export const loadFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    // Using default CDN
    await ffmpeg.load();
    return ffmpeg;
};

export const convertAudio = async (file, targetFormat, onProgress) => {
    if (!ffmpeg) await loadFFmpeg();

    const { name } = file;
    await ffmpeg.writeFile(name, await fetchFile(file));

    const outputName = `output.${targetFormat}`;

    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(progress * 100);
        });
    }

    await ffmpeg.exec(['-i', name, outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(name);
    await ffmpeg.deleteFile(outputName);

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};
