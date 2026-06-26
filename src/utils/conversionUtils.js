import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
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

// --- PDF Rotate ---
export const rotatePDFPages = async (file, rotationAngle, rangeStr) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    let targetIndices = [];
    if (rangeStr.trim().toLowerCase() === 'all' || !rangeStr.trim()) {
        targetIndices = Array.from({ length: count }, (_, i) => i);
    } else {
        targetIndices = parsePageRanges(rangeStr, count);
    }
    
    for (const index of targetIndices) {
        const page = pdfDoc.getPage(index);
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + rotationAngle) % 360;
        page.setRotation(degrees(newRotation));
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- PDF Watermarking ---
export const addWatermarkToPDF = async (file, watermarkSettings) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    const { 
        type, 
        text, 
        fontColor = '#ff0000', 
        fontSize = 50, 
        opacity = 0.5, 
        angle = 45, 
        imageFile,
        pageRange = 'all'
    } = watermarkSettings;
    
    let targetIndices = [];
    if (pageRange.trim().toLowerCase() === 'all' || !pageRange.trim()) {
        targetIndices = Array.from({ length: count }, (_, i) => i);
    } else {
        targetIndices = parsePageRanges(pageRange, count);
    }
    
    let embeddedImage = null;
    if (type === 'image' && imageFile) {
        const imgBuffer = await imageFile.arrayBuffer();
        const lowerName = imageFile.name.toLowerCase();
        if (lowerName.endsWith('.png')) {
            embeddedImage = await pdfDoc.embedPng(imgBuffer);
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
            embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        } else {
            throw new Error('Only PNG and JPG images are supported for watermarks.');
        }
    }
    
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 0, b: 0 };
    };
    
    const rgbColor = hexToRgb(fontColor);
    
    for (const index of targetIndices) {
        const page = pdfDoc.getPage(index);
        const { width, height } = page.getSize();
        
        if (type === 'text' && text) {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = fontSize;
            
            page.drawText(text, {
                x: width / 2 - (textWidth / 2) * Math.cos(angle * Math.PI / 180),
                y: height / 2 - textHeight / 2,
                size: fontSize,
                font: font,
                color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                opacity: Number(opacity),
                rotate: degrees(angle),
            });
        } else if (type === 'image' && embeddedImage) {
            const imgDims = embeddedImage.scale(0.5);
            const scaleFactor = Number(watermarkSettings.scale || 1.0);
            const finalWidth = imgDims.width * scaleFactor;
            const finalHeight = imgDims.height * scaleFactor;
            
            page.drawImage(embeddedImage, {
                x: width / 2 - finalWidth / 2,
                y: height / 2 - finalHeight / 2,
                width: finalWidth,
                height: finalHeight,
                opacity: Number(opacity),
                rotate: degrees(angle),
            });
        }
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- Images to PDF ---
export const convertImagesToPDF = async (imageFiles, settings) => {
    const pdfDoc = await PDFDocument.create();
    const { pageSize = 'fit', orientation = 'portrait', margin = 'none' } = settings;
    
    let m = 0;
    if (margin === 'small') m = 20;
    if (margin === 'large') m = 40;
    
    for (const file of imageFiles) {
        const imgBuffer = await file.arrayBuffer();
        const lowerName = file.name.toLowerCase();
        let embeddedImage = null;
        if (lowerName.endsWith('.png')) {
            embeddedImage = await pdfDoc.embedPng(imgBuffer);
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
            embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        } else {
            const pngBlob = await convertImageToPng(file);
            const pngBuffer = await pngBlob.arrayBuffer();
            embeddedImage = await pdfDoc.embedPng(pngBuffer);
        }
        
        let imgWidth = embeddedImage.width;
        let imgHeight = embeddedImage.height;
        
        let pageWidth = imgWidth + m * 2;
        let pageHeight = imgHeight + m * 2;
        
        if (pageSize === 'a4') {
            pageWidth = 595.27;
            pageHeight = 841.89;
        } else if (pageSize === 'letter') {
            pageWidth = 612;
            pageHeight = 792;
        }
        
        if (pageSize !== 'fit') {
            const isLandscape = orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight);
            if (isLandscape && pageWidth < pageHeight) {
                const temp = pageWidth;
                pageWidth = pageHeight;
                pageHeight = temp;
            } else if (!isLandscape && pageWidth > pageHeight) {
                const temp = pageWidth;
                pageWidth = pageHeight;
                pageHeight = temp;
            }
        }
        
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        const printableWidth = pageWidth - m * 2;
        const printableHeight = pageHeight - m * 2;
        
        let displayWidth = imgWidth;
        let displayHeight = imgHeight;
        
        if (displayWidth > printableWidth || displayHeight > printableHeight || pageSize !== 'fit') {
            const widthRatio = printableWidth / displayWidth;
            const heightRatio = printableHeight / displayHeight;
            const scale = Math.min(widthRatio, heightRatio);
            displayWidth = displayWidth * scale;
            displayHeight = displayHeight * scale;
        }
        
        const x = m + (printableWidth - displayWidth) / 2;
        const y = m + (printableHeight - displayHeight) / 2;
        
        page.drawImage(embeddedImage, {
            x,
            y,
            width: displayWidth,
            height: displayHeight
        });
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

const convertImageToPng = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas conversion to PNG failed'));
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- PDF Page Numbers ---
export const addPageNumbersToPDF = async (file, settings) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    const {
        format = 'page-of', 
        position = 'bottom-center', 
        fontSize = 10,
        fontColor = '#888888',
        pageRange = 'all'
    } = settings;
    
    let targetIndices = [];
    if (pageRange.trim().toLowerCase() === 'all' || !pageRange.trim()) {
        targetIndices = Array.from({ length: count }, (_, i) => i);
    } else {
        targetIndices = parsePageRanges(pageRange, count);
    }
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0.5, g: 0.5, b: 0.5 };
    };
    
    const rgbColor = hexToRgb(fontColor);
    
    for (const index of targetIndices) {
        const page = pdfDoc.getPage(index);
        const { width, height } = page.getSize();
        
        let text = '';
        const currentPageNum = index + 1;
        
        if (format === 'single') {
            text = `${currentPageNum}`;
        } else if (format === 'page-of') {
            text = `Page ${currentPageNum} of ${count}`;
        } else {
            text = `Page ${currentPageNum}`;
        }
        
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;
        const margin = 30;
        
        let x = 0;
        let y = 0;
        
        if (position.startsWith('top')) {
            y = height - margin - textHeight;
        } else {
            y = margin;
        }
        
        if (position.endsWith('left')) {
            x = margin;
        } else if (position.endsWith('right')) {
            x = width - margin - textWidth;
        } else {
            x = (width - textWidth) / 2;
        }
        
        page.drawText(text, {
            x,
            y,
            size: fontSize,
            font: font,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        });
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- PDF Page Organizer ---
export const organizePDFPages = async (file, pageOrderStr, pagesToDelete) => {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();
    
    let orderIndices = [];
    if (pageOrderStr && pageOrderStr.trim()) {
        const parts = pageOrderStr.split(',');
        for (let part of parts) {
            const pageNum = parseInt(part.trim(), 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                orderIndices.push(pageNum - 1);
            }
        }
    } else {
        orderIndices = Array.from({ length: totalPages }, (_, i) => i);
    }
    
    const deleteSet = new Set();
    if (pagesToDelete && pagesToDelete.trim()) {
        const deleteIndices = parsePageRanges(pagesToDelete, totalPages);
        for (const idx of deleteIndices) {
            deleteSet.add(idx);
        }
    }
    
    const finalIndices = orderIndices.filter(idx => !deleteSet.has(idx));
    
    if (finalIndices.length === 0) {
        throw new Error('No pages left after organization.');
    }
    
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, finalIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    
    const pdfBytes = await newDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- Dynamic PDF.js Loader ---
const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// --- PDF to JPG (Render PDF pages to images) ---
export const renderPDFPagesToImages = async (file, onProgress) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const images = [];

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        images.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_page_${i}.jpg`,
            blob
        });
        
        if (onProgress) {
            onProgress(Math.round((i / numPages) * 100));
        }
    }
    return images;
};

// --- HTML to PDF ---
export const convertHtmlToPDF = async (htmlElementOrString) => {
    let element = htmlElementOrString;
    let needsCleanup = false;
    if (typeof htmlElementOrString === 'string') {
        element = document.createElement('div');
        element.style.padding = '40px';
        element.style.width = '800px';
        element.style.background = 'white';
        element.style.color = 'black';
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.innerHTML = htmlElementOrString;
        document.body.appendChild(element);
        needsCleanup = true;
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
    });
    
    if (needsCleanup) {
        document.body.removeChild(element);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    return pdf.output('blob');
};

// --- PDF Compression ---
export const compressPDF = async (file, quality = 0.5, scale = 1.0, onProgress) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const compressedPdf = await PDFDocument.create();
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        const imgBuffer = await blob.arrayBuffer();
        const embeddedImage = await compressedPdf.embedJpg(imgBuffer);
        
        const newPage = compressedPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height
        });
        
        if (onProgress) {
            onProgress(Math.round((i / numPages) * 100));
        }
    }
    
    const pdfBytes = await compressedPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- Word to PDF ---
export const convertWordToPDF = async (file) => {
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
};

// --- PowerPoint to PDF ---
export const convertPptxToPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
    });

    const doc = new jsPDF();
    let first = true;
    
    for (let i = 0; i < slideFiles.length; i++) {
        const xmlText = await zip.files[slideFiles[i]].async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('a:t');
        const slideText = Array.from(textNodes).map(node => node.textContent).join(' ');
        
        if (!first) {
            doc.addPage();
        } else {
            first = false;
        }
        
        doc.setFontSize(16);
        doc.text(`Slide ${i + 1}`, 15, 20);
        doc.line(15, 23, 195, 23);
        
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(slideText, 170);
        doc.text(splitText, 15, 35);
    }
    return doc.output('blob');
};

// --- Excel to PDF ---
export const convertExcelToPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(14);
    doc.text(`Sheet: ${sheetName}`, 14, y);
    y += 10;
    doc.setFontSize(9);
    
    for (const row of rows) {
        const rowText = row.map(cell => String(cell ?? '')).join('  |  ');
        if (y > 280) {
            doc.addPage();
            y = 15;
        }
        doc.text(rowText, 14, y);
        y += 8;
    }
    return doc.output('blob');
};

// --- PDF to Word ---
export const convertPDFToWord = async (file) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `<p><b>--- Page ${i} ---</b></p><p>${pageText.replace(/\n/g, '<br>')}</p>`;
    }
    
    const content = `<html>
    <head>
    <meta charset="utf-8">
    <title>${file.name.replace(/\.pdf$/i, '')}</title>
    </head>
    <body>
    ${fullText}
    </body>
    </html>`;
    
    return new Blob([content], { type: 'application/msword' });
};

// --- PDF to Excel ---
export const convertPDFToExcel = async (file) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const aoa = [];
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items;
        const rowsMap = {};
        
        for (const item of items) {
            const y = Math.round(item.transform[5]);
            if (!rowsMap[y]) {
                rowsMap[y] = [];
            }
            rowsMap[y].push(item);
        }
        
        const sortedY = Object.keys(rowsMap).map(Number).sort((a, b) => b - a);
        
        aoa.push([`--- Page ${i} ---`]);
        for (const y of sortedY) {
            const rowItems = rowsMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
            const rowText = rowItems.map(item => item.str).join(' ');
            const cells = rowText.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell);
            if (cells.length > 0) {
                aoa.push(cells);
            }
        }
        aoa.push([]);
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
};

// --- PDF to PowerPoint ---
export const convertPDFToPptx = async (file) => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    let textContent = '';
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        const pageText = text.items.map(item => item.str).join(' ');
        textContent += `Slide ${i}:\n${pageText}\n\n`;
    }
    
    return new Blob([textContent], { type: 'text/plain;charset=utf-8' });
};

// --- PDF to PDF/A ---
export const convertToPDFA = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    pdfDoc.setTitle(file.name.replace(/\.pdf$/i, ''));
    pdfDoc.setProducer('ConverterApp PDF/A Compiler');
    pdfDoc.setCreator('ConverterApp');
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- PDF Crop ---
export const cropPDFPages = async (file, settings) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    const { 
        pageRange = 'all', 
        cropLeft = 0, 
        cropRight = 0, 
        cropTop = 0, 
        cropBottom = 0, 
        unit = 'percentage' 
    } = settings;
    
    let targetIndices = [];
    if (pageRange.trim().toLowerCase() === 'all' || !pageRange.trim()) {
        targetIndices = Array.from({ length: count }, (_, i) => i);
    } else {
        targetIndices = parsePageRanges(pageRange, count);
    }
    
    for (const index of targetIndices) {
        if (index < 0 || index >= count) continue;
        const page = pdfDoc.getPage(index);
        const { width, height } = page.getSize();
        
        let left = Number(cropLeft);
        let right = Number(cropRight);
        let top = Number(cropTop);
        let bottom = Number(cropBottom);
        
        if (unit === 'percentage') {
            left = (left / 100) * width;
            right = (right / 100) * width;
            top = (top / 100) * height;
            bottom = (bottom / 100) * height;
        }
        
        const newX = left;
        const newY = bottom;
        const newWidth = width - left - right;
        const newHeight = height - bottom - top;
        
        if (newWidth > 0 && newHeight > 0) {
            page.setCropBox(newX, newY, newWidth, newHeight);
            page.setMediaBox(newX, newY, newWidth, newHeight);
        } else {
            throw new Error(`Invalid crop boundaries for page ${index + 1}. Crop dimensions cannot exceed page size.`);
        }
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- PDF Erase Regions (Watermark Eraser) ---
export const erasePDFRegions = async (file, settings) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    const { 
        pageRange = 'all', 
        preset = 'bottom', // 'bottom', 'top', 'custom'
        presetValue = 20, // percentage/points to erase
        customX = 0,
        customY = 0,
        customWidth = 100,
        customHeight = 100,
        unit = 'percentage',
        color = '#ffffff' // white background default
    } = settings;
    
    let targetIndices = [];
    if (pageRange.trim().toLowerCase() === 'all' || !pageRange.trim()) {
        targetIndices = Array.from({ length: count }, (_, i) => i);
    } else {
        targetIndices = parsePageRanges(pageRange, count);
    }
    
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 1, b: 1 };
    };
    
    const rgbColor = hexToRgb(color);
    
    for (const index of targetIndices) {
        if (index < 0 || index >= count) continue;
        const page = pdfDoc.getPage(index);
        const { width, height } = page.getSize();
        
        let rectX = 0;
        let rectY = 0;
        let rectWidth = 0;
        let rectHeight = 0;
        
        if (preset === 'bottom') {
            rectX = 0;
            rectY = 0;
            rectWidth = width;
            rectHeight = unit === 'percentage' 
                ? (Number(presetValue) / 100) * height 
                : Number(presetValue);
        } else if (preset === 'top') {
            rectX = 0;
            rectHeight = unit === 'percentage' 
                ? (Number(presetValue) / 100) * height 
                : Number(presetValue);
            rectY = height - rectHeight;
            rectWidth = width;
        } else {
            // custom region
            let cx = Number(customX);
            let cy = Number(customY);
            let cw = Number(customWidth);
            let ch = Number(customHeight);
            
            if (unit === 'percentage') {
                rectX = (cx / 100) * width;
                rectY = (cy / 100) * height;
                rectWidth = (cw / 100) * width;
                rectHeight = (ch / 100) * height;
            } else {
                rectX = cx;
                rectY = cy;
                rectWidth = cw;
                rectHeight = ch;
            }
        }
        
        // draw the rectangle overlay
        page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity: 1.0,
        });
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

// --- Word (DOCX) Watermark Stripper ---
export const removeDocxWatermark = async (file, options = {}) => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    const {
        removeText = true,
        removeImage = true,
        removeBackground = true,
        customText = ''
    } = options;

    const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));

    for (const name of xmlFiles) {
        let xmlText = await zip.files[name].async('text');
        let modified = false;

        if (!xmlText.includes('<v:shape') && !xmlText.includes('<w:background') && !xmlText.includes('<w:displayBackgroundShape')) {
            continue;
        }

        const doc = parser.parseFromString(xmlText, 'application/xml');

        // 1. Remove background shapes
        if (removeBackground) {
            const backgrounds = doc.getElementsByTagName('w:background');
            while (backgrounds.length > 0) {
                backgrounds[0].parentNode.removeChild(backgrounds[0]);
                modified = true;
            }
            const displayBg = doc.getElementsByTagName('w:displayBackgroundShape');
            while (displayBg.length > 0) {
                displayBg[0].parentNode.removeChild(displayBg[0]);
                modified = true;
            }
        }

        // 2. Remove VML shapes (Text and Image watermarks)
        const shapes = Array.from(doc.getElementsByTagName('v:shape'));
        for (const shape of shapes) {
            let shouldRemove = false;

            // Check for textpath watermarks
            const textpaths = shape.getElementsByTagName('v:textpath');
            if (textpaths.length > 0 && removeText) {
                if (customText) {
                    const textStr = textpaths[0].getAttribute('string') || '';
                    if (textStr.toLowerCase().includes(customText.toLowerCase())) {
                        shouldRemove = true;
                    }
                } else {
                    shouldRemove = true; // remove all textpath watermarks
                }
            }

            // Check for image watermarks inside header/footer VML shapes
            const imagedatas = shape.getElementsByTagName('v:imagedata');
            if (imagedatas.length > 0 && removeImage && (name.includes('header') || name.includes('footer'))) {
                const style = shape.getAttribute('style') || '';
                if (style.includes('position:absolute') || style.includes('mso-position-horizontal:center')) {
                    shouldRemove = true;
                }
            }

            if (shouldRemove) {
                shape.parentNode.removeChild(shape);
                modified = true;
            }
        }

        if (modified) {
            const newXmlText = serializer.serializeToString(doc);
            zip.file(name, newXmlText);
        }
    }

    const outputBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    return new Blob([outputBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

// --- Excel (XLSX) Watermark Stripper ---
export const removeXlsxWatermark = async (file, options = {}) => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    const {
        removeBackground = true,
        removeDrawings = true
    } = options;

    const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));

    for (const name of xmlFiles) {
        let xmlText = await zip.files[name].async('text');
        let modified = false;

        if (!xmlText.includes('backgroundImage') && !xmlText.includes('drawing')) {
            continue;
        }

        const doc = parser.parseFromString(xmlText, 'application/xml');

        // 1. Remove background image watermarks from sheets
        if (removeBackground) {
            const bgImages = doc.getElementsByTagName('backgroundImage');
            while (bgImages.length > 0) {
                bgImages[0].parentNode.removeChild(bgImages[0]);
                modified = true;
            }
        }

        if (modified) {
            const newXmlText = serializer.serializeToString(doc);
            zip.file(name, newXmlText);
        }
    }

    // 2. Remove drawing overlays/pictures matching "watermark" or "background" names
    const drawingFiles = Object.keys(zip.files).filter(name => name.startsWith('xl/drawings/drawing') && name.endsWith('.xml'));
    for (const name of drawingFiles) {
        let xmlText = await zip.files[name].async('text');
        const doc = parser.parseFromString(xmlText, 'application/xml');
        let modified = false;

        const pics = Array.from(doc.getElementsByTagName('xdr:pic'));
        for (const pic of pics) {
            const nvPicPr = pic.getElementsByTagName('xdr:nvPicPr');
            if (nvPicPr.length > 0) {
                const cNvPr = nvPicPr[0].getElementsByTagName('xdr:cNvPr');
                if (cNvPr.length > 0) {
                    const picName = cNvPr[0].getAttribute('name') || '';
                    if (picName.toLowerCase().includes('watermark') || picName.toLowerCase().includes('background')) {
                        let anchor = pic.parentNode;
                        while (anchor && anchor.nodeName !== 'xdr:twoCellAnchor' && anchor.nodeName !== 'xdr:oneCellAnchor') {
                            anchor = anchor.parentNode;
                        }
                        if (anchor && anchor.parentNode) {
                            anchor.parentNode.removeChild(anchor);
                            modified = true;
                        }
                    }
                }
            }
        }

        if (modified) {
            const newXmlText = serializer.serializeToString(doc);
            zip.file(name, newXmlText);
        }
    }

    const outputBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    return new Blob([outputBuffer], { type: 'application/octet-stream' });
};

// --- Universal Controller ---
export const removeFileWatermark = async (file, fileType, options = {}) => {
    if (fileType === 'pdf') {
        return erasePDFRegions(file, options);
    } else if (fileType === 'docx') {
        return removeDocxWatermark(file, options);
    } else if (fileType === 'xlsx') {
        return removeXlsxWatermark(file, options);
    } else {
        throw new Error('Unsupported file type for watermark removal.');
    }
};
