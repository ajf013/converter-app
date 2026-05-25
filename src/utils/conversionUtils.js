import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import JSZip from 'jszip';

// --- Image Conversion ---
export const convertImage = (file, targetFormat, options = {}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                let targetWidth = img.width;
                let targetHeight = img.height;
                
                if (options.width) targetWidth = Number(options.width);
                if (options.height) targetHeight = Number(options.height);

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Determine mime type
                let mimeType = 'image/png';
                if (targetFormat === 'jpg' || targetFormat === 'jpeg') mimeType = 'image/jpeg';
                if (targetFormat === 'webp') mimeType = 'image/webp';
                if (targetFormat === 'bmp') mimeType = 'image/bmp';
                if (targetFormat === 'gif') mimeType = 'image/gif';

                const quality = options.quality !== undefined ? Number(options.quality) : 0.92;

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Conversion failed'));
                    }
                }, mimeType, quality);
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

export const cutAudio = async (file, start, end, targetFormat) => {
    if (!ffmpeg) await loadFFmpeg();
    const { name } = file;
    await ffmpeg.writeFile(name, await fetchFile(file));
    const outputName = `output_${Date.now()}.${targetFormat}`;

    // -ss: start time, -to: end time
    // Re-encoding is generally safer for cutting to avoid keyframe issues
    await ffmpeg.exec(['-i', name, '-ss', start.toString(), '-to', end.toString(), outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(name);
    await ffmpeg.deleteFile(outputName);

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};

export const joinAudio = async (files, targetFormat) => {
    if (!ffmpeg) await loadFFmpeg();

    const inputNames = [];
    let concatList = '';

    // Write all files
    for (const file of files) {
        const safeName = `input_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        await ffmpeg.writeFile(safeName, await fetchFile(file));
        inputNames.push(safeName);
        concatList += `file '${safeName}'\n`;
    }

    const listFileName = 'concat_list.txt';
    await ffmpeg.writeFile(listFileName, concatList);
    const outputName = `joined_${Date.now()}.${targetFormat}`;

    // -f concat -safe 0 -i list.txt
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', listFileName, outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(listFileName);
    await ffmpeg.deleteFile(outputName);
    for (const name of inputNames) {
        await ffmpeg.deleteFile(name);
    }

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};


// --- YouTube Conversion ---
// RapidAPI and Internal FFmpeg conversion removed. External redirect used in UI.

// --- ZIP Archiver ---
export const createZipArchive = async (filesArray) => {
    const zip = new JSZip();
    filesArray.forEach((file) => {
        zip.file(file.name, file.blob);
    });
    return await zip.generateAsync({ type: 'blob' });
};

// --- PDF Merging ---
export const mergePDFs = async (files) => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const pdfBytes = await mergedPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- PDF Splitting ---
export const parsePageRanges = (rangeStr, totalPages) => {
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr.trim(), 10);
            const end = parseInt(endStr.trim(), 10);
            if (!isNaN(start) && !isNaN(end)) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                for (let i = low; i <= high; i++) {
                    if (i >= 1 && i <= totalPages) {
                        pages.add(i - 1); // 0-based
                    }
                }
            }
        } else {
            const pageNum = parseInt(part, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages.add(pageNum - 1); // 0-based
            }
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
};

export const splitPDF = async (file, rangeStr) => {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    if (rangeStr.trim().toLowerCase() === 'all' || !rangeStr.trim()) {
        // Split all pages into individual files
        const splitFiles = [];
        for (let i = 0; i < totalPages; i++) {
            const newDoc = await PDFDocument.create();
            const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
            newDoc.addPage(copiedPage);
            const pdfBytes = await newDoc.save();
            splitFiles.push({
                name: `${file.name.replace(/\.pdf$/i, '')}_page_${i + 1}.pdf`,
                blob: new Blob([pdfBytes], { type: 'application/pdf' })
            });
        }
        return splitFiles; // returns array of {name, blob}
    } else {
        // Extract specific pages into a single PDF
        const indices = parsePageRanges(rangeStr, totalPages);
        if (indices.length === 0) {
            throw new Error('No valid pages found in range.');
        }
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, indices);
        copiedPages.forEach((page) => newDoc.addPage(page));
        const pdfBytes = await newDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' }); // returns single blob
    }
};

// --- PDF Security ---
export const encryptPDFFile = async (file, password) => {
    const arrayBuffer = await file.arrayBuffer();
    const encryptedBytes = encryptPDF(new Uint8Array(arrayBuffer), password);
    return new Blob([encryptedBytes], { type: 'application/pdf' });
};

export const decryptPDFFile = async (file, password) => {
    const arrayBuffer = await file.arrayBuffer();
    const decryptedBytes = decryptPDF(new Uint8Array(arrayBuffer), password);
    return new Blob([decryptedBytes], { type: 'application/pdf' });
};
