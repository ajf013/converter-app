import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown, Checkbox } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { removeFileWatermark } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';
import { 
    detectPdfWatermark, 
    detectDocxWatermarkText 
} from '../../../utils/azureAiService';

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

const WatermarkRemover = () => {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [fileType, setFileType] = useState(null); // 'pdf', 'docx', 'xlsx'
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    // PDF specific states
    const [pageRange, setPageRange] = useState('all');
    const [pdfDocument, setPdfDocument] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [previewPage, setPreviewPage] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Draggable Erase Box state for PDF
    const [erasePreset, setErasePreset] = useState('bottom'); // 'bottom', 'top', 'custom'
    const [eraseBox, setEraseBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [eraseColor, setEraseColor] = useState('#ffffff');
    const cropBoxInitializedRef = useRef(false);

    // Word specific states
    const [docxRemoveText, setDocxRemoveText] = useState(true);
    const [docxRemoveImage, setDocxRemoveImage] = useState(true);
    const [docxRemoveBackground, setDocxRemoveBackground] = useState(true);
    const [docxCustomText, setDocxCustomText] = useState('');

    // Excel specific states
    const [xlsxRemoveBackground, setXlsxRemoveBackground] = useState(true);
    const [xlsxRemoveDrawings, setXlsxRemoveDrawings] = useState(true);

    // AI status states
    const [aiDetecting, setAiDetecting] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [aiExplanation, setAiExplanation] = useState(null);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Helper: extract candidate text strings from DOCX layout
    const extractDocxCandidates = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const parser = new DOMParser();
        const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
        const candidates = new Set();

        for (const name of xmlFiles) {
            if (!name.includes('header') && !name.includes('footer') && !name.includes('document')) {
                continue;
            }
            try {
                const xmlText = await zip.files[name].async('text');
                if (xmlText.includes('<v:textpath') || xmlText.includes('<w:t')) {
                    const doc = parser.parseFromString(xmlText, 'application/xml');
                    
                    // Extract text from textpaths inside v:shape
                    const textpaths = doc.getElementsByTagName('v:textpath');
                    for (const tp of textpaths) {
                        const text = tp.getAttribute('string');
                        if (text && text.trim().length > 1) {
                            candidates.add(text.trim());
                        }
                    }
                    
                    // Extract text from w:t elements inside headers or footers
                    if (name.includes('header') || name.includes('footer')) {
                        const ts = doc.getElementsByTagName('w:t');
                        for (const t of ts) {
                            const text = t.textContent;
                            if (text && text.trim().length > 1 && text.trim().length < 50) {
                                candidates.add(text.trim());
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing zip file part for candidates:', e);
            }
        }
        return Array.from(candidates);
    };

    // PDF AI scan handler
    const handleAiDetectPdf = async () => {
        if (!canvasRef.current) return;
        setAiDetecting(true);
        setAiError(null);
        setAiExplanation(null);

        try {
            const canvas = canvasRef.current;
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

            const detection = await detectPdfWatermark(imageBase64);
            if (detection.found && detection.coordinates) {
                const coords = detection.coordinates;
                setErasePreset('custom');

                // Convert percentages to canvas pixels
                const wVal = (coords.w / 100) * containerWidth;
                const hVal = (coords.h / 100) * containerHeight;
                const xPos = (coords.x / 100) * containerWidth;
                
                // AI 'y' starts from bottom-left. In canvas, 'y' starts from top-left.
                const yPos = containerHeight - hVal - ((coords.y / 100) * containerHeight);

                setEraseBox({
                    x: Math.max(0, Math.min(containerWidth - wVal, xPos)),
                    y: Math.max(0, Math.min(containerHeight - hVal, yPos)),
                    w: Math.max(10, Math.min(containerWidth, wVal)),
                    h: Math.max(10, Math.min(containerHeight, hVal))
                });

                if (detection.suggestedEraserColor) {
                    setEraseColor(detection.suggestedEraserColor);
                }
                
                setAiExplanation(detection.explanation || 'Watermark detected and eraser positioned.');
            } else {
                setAiExplanation('No watermark was detected on this page by the AI.');
            }
        } catch (err) {
            console.error(err);
            setAiError(err.message || 'Error occurred during AI detection.');
        } finally {
            setAiDetecting(false);
        }
    };

    // DOCX AI scan handler
    const handleAiDetectDocx = async () => {
        if (!uploadedFile) return;
        setAiDetecting(true);
        setAiError(null);
        setAiExplanation(null);

        try {
            const candidates = await extractDocxCandidates(uploadedFile);
            if (candidates.length === 0) {
                setAiExplanation('No candidate text strings found in document layout headers/footers.');
                setAiDetecting(false);
                return;
            }

            const watermarkText = await detectDocxWatermarkText(candidates);
            if (watermarkText) {
                setDocxCustomText(watermarkText);
                setDocxRemoveText(true);
                setAiExplanation(`Detected watermark: "${watermarkText}"`);
            } else {
                setAiExplanation('AI scanned the document but found no likely repeating watermark string.');
            }
        } catch (err) {
            console.error(err);
            setAiError(err.message || 'Error occurred during AI detection.');
        } finally {
            setAiDetecting(false);
        }
    };


    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setUploadedFile(file);
            setResultBlob(null);
            setPdfDocument(null);
            setTotalPages(1);
            setPreviewPage(1);
            setPageRange('all');
            cropBoxInitializedRef.current = false;

            // Detect file type
            const name = file.name.toLowerCase();
            if (name.endsWith('.pdf')) {
                setFileType('pdf');
            } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
                setFileType('docx');
            } else if (name.endsWith('.xlsx')) {
                setFileType('xlsx');
            } else {
                setFileType(null);
                alert('Unsupported file format. Please upload a PDF, Word, or Excel file.');
                setUploadedFile(null);
            }
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        multiple: false
    });

    // 1. PDF Loader
    useEffect(() => {
        if (!uploadedFile || fileType !== 'pdf') return;

        const loadPDF = async () => {
            setPdfLoading(true);
            setPdfError(false);
            try {
                const pdfjsLib = await loadPdfJs();
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const doc = await loadingTask.promise;
                setPdfDocument(doc);
                setTotalPages(doc.numPages);
                setPreviewPage(1);
            } catch (err) {
                console.error('Error loading PDF:', err);
                setPdfError(true);
            } finally {
                setPdfLoading(false);
            }
        };

        loadPDF();
    }, [uploadedFile, fileType]);

    // 2. Sync range inputs with preview page for PDF
    const handlePageRangeChange = (val) => {
        setPageRange(val);
        setResultBlob(null);

        const pageNum = parseInt(val.trim());
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setPreviewPage(pageNum);
        } else if (val.trim().toLowerCase() === 'last') {
            setPreviewPage(totalPages);
        }
    };

    // 3. Render PDF Page on Canvas
    useEffect(() => {
        if (!pdfDocument || fileType !== 'pdf') return;

        const renderPage = async () => {
            try {
                const page = await pdfDocument.getPage(previewPage);
                const canvas = canvasRef.current;
                if (!canvas) return;

                const desiredWidth = 340;
                const originalViewport = page.getViewport({ scale: 1.0 });
                const scale = desiredWidth / originalViewport.width;
                const viewport = page.getViewport({ scale });

                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                setContainerWidth(viewport.width);
                setContainerHeight(viewport.height);

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;

                if (!cropBoxInitializedRef.current || eraseBox.w === 0) {
                    updateEraseBoxDimensions(erasePreset, viewport.width, viewport.height);
                    cropBoxInitializedRef.current = true;
                }
            } catch (err) {
                console.error('Error rendering page:', err);
            }
        };

        renderPage();
    }, [pdfDocument, previewPage, fileType]);

    const updateEraseBoxDimensions = (preset, width = containerWidth, height = containerHeight) => {
        if (width === 0 || height === 0) return;
        if (preset === 'bottom') {
            setEraseBox({
                x: 0,
                y: height * 0.85,
                w: width,
                h: height * 0.15
            });
        } else if (preset === 'top') {
            setEraseBox({
                x: 0,
                y: 0,
                w: width,
                h: height * 0.15
            });
        } else {
            setEraseBox({
                x: width * 0.25,
                y: height * 0.4,
                w: width * 0.5,
                h: height * 0.2
            });
        }
    };

    useEffect(() => {
        updateEraseBoxDimensions(erasePreset);
    }, [erasePreset]);

    const navigatePage = (direction) => {
        let nextPage = previewPage + direction;
        if (nextPage < 1) nextPage = 1;
        if (nextPage > totalPages) nextPage = totalPages;
        setPreviewPage(nextPage);
        setPageRange(nextPage.toString());
        setResultBlob(null);
    };

    // Mouse handlers for PDF Eraser Box
    const handleEraseMouseDown = (e, action) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startBox = { ...eraseBox };

        const handleMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            let x = startBox.x;
            let y = startBox.y;
            let w = startBox.w;
            let h = startBox.h;

            if (erasePreset === 'bottom') {
                h = Math.max(10, Math.min(containerHeight, startBox.h - dy));
                y = containerHeight - h;
            } else if (erasePreset === 'top') {
                h = Math.max(10, Math.min(containerHeight, startBox.h + dy));
            } else {
                if (action === 'move') {
                    x = Math.max(0, Math.min(containerWidth - startBox.w, startBox.x + dx));
                    y = Math.max(0, Math.min(containerHeight - startBox.h, startBox.y + dy));
                } else if (action === 'nw') {
                    const limitDx = Math.min(dx, startBox.w - 15);
                    x = Math.max(0, startBox.x + limitDx);
                    w = startBox.w - (x - startBox.x);
                    const limitDy = Math.min(dy, startBox.h - 15);
                    y = Math.max(0, startBox.y + limitDy);
                    h = startBox.h - (y - startBox.y);
                } else if (action === 'ne') {
                    w = Math.max(15, Math.min(containerWidth - startBox.x, startBox.w + dx));
                    const limitDy = Math.min(dy, startBox.h - 15);
                    y = Math.max(0, startBox.y + limitDy);
                    h = startBox.h - (y - startBox.y);
                } else if (action === 'sw') {
                    const limitDx = Math.min(dx, startBox.w - 15);
                    x = Math.max(0, startBox.x + limitDx);
                    w = startBox.w - (x - startBox.x);
                    h = Math.max(15, Math.min(containerHeight - startBox.y, startBox.h + dy));
                } else if (action === 'se') {
                    w = Math.max(15, Math.min(containerWidth - startBox.x, startBox.w + dx));
                    h = Math.max(15, Math.min(containerHeight - startBox.y, startBox.h + dy));
                }
            }

            setEraseBox({ x, y, w, h });
            setResultBlob(null);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleEraseTouchStart = (e, action) => {
        e.preventDefault();
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const startBox = { ...eraseBox };

        const handleTouchMove = (moveEvent) => {
            const currentTouch = moveEvent.touches[0];
            const dx = currentTouch.clientX - startX;
            const dy = currentTouch.clientY - startY;

            let x = startBox.x;
            let y = startBox.y;
            let w = startBox.w;
            let h = startBox.h;

            if (erasePreset === 'bottom') {
                h = Math.max(10, Math.min(containerHeight, startBox.h - dy));
                y = containerHeight - h;
            } else if (erasePreset === 'top') {
                h = Math.max(10, Math.min(containerHeight, startBox.h + dy));
            } else {
                if (action === 'move') {
                    x = Math.max(0, Math.min(containerWidth - startBox.w, startBox.x + dx));
                    y = Math.max(0, Math.min(containerHeight - startBox.h, startBox.y + dy));
                } else if (action === 'nw') {
                    const limitDx = Math.min(dx, startBox.w - 15);
                    x = Math.max(0, startBox.x + limitDx);
                    w = startBox.w - (x - startBox.x);
                    const limitDy = Math.min(dy, startBox.h - 15);
                    y = Math.max(0, startBox.y + limitDy);
                    h = startBox.h - (y - startBox.y);
                } else if (action === 'ne') {
                    w = Math.max(15, Math.min(containerWidth - startBox.x, startBox.w + dx));
                    const limitDy = Math.min(dy, startBox.h - 15);
                    y = Math.max(0, startBox.y + limitDy);
                    h = startBox.h - (y - startBox.y);
                } else if (action === 'sw') {
                    const limitDx = Math.min(dx, startBox.w - 15);
                    x = Math.max(0, startBox.x + limitDx);
                    w = startBox.w - (x - startBox.x);
                    h = Math.max(15, Math.min(containerHeight - startBox.y, startBox.h + dy));
                } else if (action === 'se') {
                    w = Math.max(15, Math.min(containerWidth - startBox.x, startBox.w + dx));
                    h = Math.max(15, Math.min(containerHeight - startBox.y, startBox.h + dy));
                }
            }

            setEraseBox({ x, y, w, h });
            setResultBlob(null);
        };

        const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    };

    const resetEraserBox = () => {
        if (containerWidth > 0 && containerHeight > 0) {
            updateEraseBoxDimensions(erasePreset);
            setResultBlob(null);
        }
    };

    // Action Dispatcher
    const handleRemoveWatermark = async () => {
        if (!uploadedFile) return;
        setProcessing(true);
        try {
            let settings = {};
            if (fileType === 'pdf') {
                settings = {
                    pageRange,
                    preset: erasePreset,
                    color: eraseColor,
                    unit: 'percentage'
                };
                if (erasePreset === 'bottom' || erasePreset === 'top') {
                    settings.presetValue = (eraseBox.h / containerHeight) * 100;
                } else {
                    settings.customX = (eraseBox.x / containerWidth) * 100;
                    settings.customY = ((containerHeight - (eraseBox.y + eraseBox.h)) / containerHeight) * 100;
                    settings.customWidth = (eraseBox.w / containerWidth) * 100;
                    settings.customHeight = (eraseBox.h / containerHeight) * 100;
                }
            } else if (fileType === 'docx') {
                settings = {
                    removeText: docxRemoveText,
                    removeImage: docxRemoveImage,
                    removeBackground: docxRemoveBackground,
                    customText: docxCustomText
                };
            } else if (fileType === 'xlsx') {
                settings = {
                    removeBackground: xlsxRemoveBackground,
                    removeDrawings: xlsxRemoveDrawings
                };
            }

            const blob = await removeFileWatermark(uploadedFile, fileType, settings);
            setResultBlob(blob);
            addHistoryEntry(`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_clean.${fileType}`, 'Watermark Remover', 'Success');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error stripping watermarks from document. Verify security parameters.');
            addHistoryEntry(uploadedFile.name, 'Watermark Remover Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const getExtension = () => {
        return fileType || 'bin';
    };

    const presetOptions = [
        { key: 'bottom', text: 'Erase Bottom Section (Footers / Watermarks)', value: 'bottom' },
        { key: 'top', text: 'Erase Top Section (Headers)', value: 'top' },
        { key: 'custom', text: 'Erase Custom Area', value: 'custom' }
    ];

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: '580px', width: '100%' }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' }}>
                <Icon name='shield alternate' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Watermark Remover</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Strip backgrounds, text, and image watermarks from PDF, Word, and Excel files.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: '25px 15px', marginBottom: '20px' }}>
                <input {...getInputProps()} />
                <Icon name='file alternate outline' size='large' style={{ marginBottom: '5px' }} />
                {uploadedFile ? (
                    <p style={{ color: 'white', fontWeight: '600', margin: 0 }}>
                        {uploadedFile.name} ({fileType?.toUpperCase()})
                    </p>
                ) : (
                    <p style={{ margin: 0 }}>Drag & drop PDF, DOCX, or XLSX file here, or click to browse</p>
                )}
            </div>
            {uploadedFile && fileType !== 'pdf' && (
                <FilePreview 
                    file={uploadedFile} 
                    onRemove={() => {
                        setUploadedFile(null);
                        setFileType(null);
                        setResultBlob(null);
                    }} 
                />
            )}

            {uploadedFile && (

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px', textAlign: 'left' }}>
                    
                    {/* FORMAT SPECIFIC INPUT PANELS */}

                    {/* 1. PDF WATERMARK ERASER VIEW */}
                    {fileType === 'pdf' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    <Button 
                                        circular 
                                        icon='chevron left' 
                                        size='small' 
                                        disabled={previewPage <= 1 || pdfLoading} 
                                        onClick={() => navigatePage(-1)}
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                    <span style={{ color: 'white', fontWeight: 'bold' }}>
                                        Page {previewPage} of {totalPages}
                                    </span>
                                    <Button 
                                        circular 
                                        icon='chevron right' 
                                        size='small' 
                                        disabled={previewPage >= totalPages || pdfLoading} 
                                        onClick={() => navigatePage(1)}
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </div>

                                {pdfLoading ? (
                                    <div style={{ padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
                                        <Icon name='spinner' loading /> Rendering Preview...
                                    </div>
                                ) : pdfError ? (
                                    <div style={{ color: '#ff4d4f', padding: '20px' }}>Preview unavailable.</div>
                                ) : (
                                    <div 
                                        ref={containerRef}
                                        style={{ 
                                            position: 'relative', 
                                            width: containerWidth, 
                                            height: containerHeight,
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            background: '#fff'
                                        }}
                                    >
                                        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

                                        {aiDetecting && (
                                            <>
                                                <div className="ai-scan-overlay" />
                                                <div className="ai-scan-laser" />
                                            </>
                                        )}

                                        {containerWidth > 0 && !aiDetecting && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                                                {/* Eraser area overlay */}
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: eraseBox.x,
                                                        top: eraseBox.y,
                                                        width: eraseBox.w,
                                                        height: eraseBox.h,
                                                        background: eraseColor,
                                                        border: '2px solid #e03997',
                                                        opacity: 0.85,
                                                        cursor: erasePreset === 'custom' ? 'move' : 'ns-resize',
                                                        pointerEvents: 'auto',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 10px rgba(224, 57, 151, 0.4)'
                                                    }}
                                                    onMouseDown={(e) => handleEraseMouseDown(e, 'move')}
                                                    onTouchStart={(e) => handleEraseTouchStart(e, 'move')}
                                                >
                                                    <span style={{ 
                                                        color: eraseColor === '#ffffff' ? '#333' : '#fff', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 'bold', 
                                                        padding: '2px 6px', 
                                                        background: 'rgba(255,255,255,0.4)',
                                                        borderRadius: '3px',
                                                        pointerEvents: 'none' 
                                                    }}>
                                                        Eraser Area
                                                    </span>

                                                    {erasePreset === 'bottom' && (
                                                        <div 
                                                            style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '30px', height: '8px', borderRadius: '4px', background: '#e03997', cursor: 'ns-resize', border: '1px solid white' }}
                                                            onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'top-edge'); }}
                                                            onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'top-edge'); }}
                                                        />
                                                    )}
                                                    {erasePreset === 'top' && (
                                                        <div 
                                                            style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '30px', height: '8px', borderRadius: '4px', background: '#e03997', cursor: 'ns-resize', border: '1px solid white' }}
                                                            onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'bottom-edge'); }}
                                                            onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'bottom-edge'); }}
                                                        />
                                                    )}
                                                    {erasePreset === 'custom' && (
                                                        <>
                                                            <div 
                                                                style={{ position: 'absolute', left: '-4px', top: '-4px', width: '8px', height: '8px', background: '#e03997', cursor: 'nwse-resize', border: '1px solid white' }} 
                                                                onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'nw'); }}
                                                                onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'nw'); }}
                                                            />
                                                            <div 
                                                                style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', background: '#e03997', cursor: 'nesw-resize', border: '1px solid white' }} 
                                                                onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'ne'); }}
                                                                onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'ne'); }}
                                                            />
                                                            <div 
                                                                style={{ position: 'absolute', left: '-4px', bottom: '-4px', width: '8px', height: '8px', background: '#e03997', cursor: 'nesw-resize', border: '1px solid white' }} 
                                                                onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'sw'); }}
                                                                onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'sw'); }}
                                                            />
                                                            <div 
                                                                style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '8px', height: '8px', background: '#e03997', cursor: 'nwse-resize', border: '1px solid white' }} 
                                                                onMouseDown={(e) => { e.stopPropagation(); handleEraseMouseDown(e, 'se'); }}
                                                                onTouchStart={(e) => { e.stopPropagation(); handleEraseTouchStart(e, 'se'); }}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PDF AI Auto-Detect Section */}
                            <div style={{ 
                                background: 'rgba(0, 198, 255, 0.08)', 
                                border: '1px solid rgba(0, 198, 255, 0.2)', 
                                borderRadius: '10px', 
                                padding: '12px 15px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '10px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Icon name='magic' style={{ color: '#00dbde' }} /> AI Auto-Detection
                                    </span>
                                    <Button 
                                        size='tiny' 
                                        style={{ background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', color: 'white' }}
                                        loading={aiDetecting} 
                                        disabled={aiDetecting || pdfLoading} 
                                        onClick={handleAiDetectPdf}
                                    >
                                        Run AI Detector
                                    </Button>
                                </div>
                                {aiError && (
                                    <p style={{ color: '#ff4d4f', fontSize: '0.8rem', margin: 0, fontWeight: '500' }}>
                                        <Icon name='exclamation triangle' /> {aiError}
                                    </p>
                                )}
                                {aiExplanation && (
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', margin: 0, lineHeight: '1.3' }}>
                                        <Icon name='info circle' style={{ color: '#00dbde' }} /> {aiExplanation}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Page Range (to apply eraser):
                                </label>
                                <Input 
                                    fluid
                                    value={pageRange} 
                                    placeholder="e.g. 'all', '114', '1-5', 'last'" 
                                    onChange={(e) => handlePageRangeChange(e.target.value)}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold', margin: 0 }}>
                                        Eraser Type:
                                    </label>
                                    <Button size="mini" compact onClick={resetEraserBox}>
                                        Reset Box
                                    </Button>
                                </div>
                                <Dropdown
                                    fluid
                                    selection
                                    options={presetOptions}
                                    value={erasePreset}
                                    onChange={(e, { value }) => {
                                        setErasePreset(value);
                                        setResultBlob(null);
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Eraser Color:
                                </label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input 
                                        type="color" 
                                        value={eraseColor} 
                                        onChange={(e) => { setEraseColor(e.target.value); setResultBlob(null); }}
                                        style={{ border: 'none', background: 'transparent', width: '40px', height: '40px', cursor: 'pointer', borderRadius: '5px', padding: 0 }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                        {eraseColor.toUpperCase()} (Match page background color)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. WORD (DOCX) OPTIONS */}
                    {fileType === 'docx' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <SemanticHeader as='h4' style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                                Word Watermark Filters:
                            </SemanticHeader>

                            {/* DOCX AI Auto-Detect Section */}
                            <div style={{ 
                                background: 'rgba(0, 198, 255, 0.08)', 
                                border: '1px solid rgba(0, 198, 255, 0.2)', 
                                borderRadius: '10px', 
                                padding: '12px 15px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '10px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Icon name='magic' style={{ color: '#00dbde' }} /> AI Auto-Detection
                                    </span>
                                    <Button 
                                        size='tiny' 
                                        style={{ background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', color: 'white' }}
                                        loading={aiDetecting} 
                                        disabled={aiDetecting} 
                                        onClick={handleAiDetectDocx}
                                    >
                                        Scan Word Watermark
                                    </Button>
                                </div>
                                {aiError && (
                                    <p style={{ color: '#ff4d4f', fontSize: '0.8rem', margin: 0, fontWeight: '500' }}>
                                        <Icon name='exclamation triangle' /> {aiError}
                                    </p>
                                )}
                                {aiExplanation && (
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', margin: 0, lineHeight: '1.3' }}>
                                        <Icon name='info circle' style={{ color: '#00dbde' }} /> {aiExplanation}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Checkbox 
                                    label={{ children: <span style={{ color: 'white' }}>Remove Text Watermarks (e.g. WordArt "DRAFT")</span> }} 
                                    checked={docxRemoveText}
                                    onChange={() => { setDocxRemoveText(!docxRemoveText); setResultBlob(null); }}
                                    style={{ marginBottom: '10px', display: 'block' }}
                                />
                                <Checkbox 
                                    label={{ children: <span style={{ color: 'white' }}>Remove Image Watermarks (Header & Footer overlays)</span> }} 
                                    checked={docxRemoveImage}
                                    onChange={() => { setDocxRemoveImage(!docxRemoveImage); setResultBlob(null); }}
                                    style={{ marginBottom: '10px', display: 'block' }}
                                />
                                <Checkbox 
                                    label={{ children: <span style={{ color: 'white' }}>Strip Page Backgrounds / Colors</span> }} 
                                    checked={docxRemoveBackground}
                                    onChange={() => { setDocxRemoveBackground(!docxRemoveBackground); setResultBlob(null); }}
                                    style={{ marginBottom: '10px', display: 'block' }}
                                />
                            </div>

                            <div>
                                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Match Custom Watermark Text (Optional):
                                </label>
                                <Input 
                                    fluid
                                    value={docxCustomText} 
                                    placeholder="e.g. CONFIDENTIAL (Leave empty to strip all text watermarks)" 
                                    onChange={(e) => { setDocxCustomText(e.target.value); setResultBlob(null); }}
                                />
                            </div>
                        </div>
                    )}

                    {/* 3. EXCEL (XLSX) OPTIONS */}
                    {fileType === 'xlsx' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <SemanticHeader as='h4' style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                                Excel Watermark Filters:
                            </SemanticHeader>
                            <div>
                                <Checkbox 
                                    label={{ children: <span style={{ color: 'white' }}>Remove Worksheet Background Pictures</span> }} 
                                    checked={xlsxRemoveBackground}
                                    onChange={() => { setXlsxRemoveBackground(!xlsxRemoveBackground); setResultBlob(null); }}
                                    style={{ marginBottom: '10px', display: 'block' }}
                                />
                                <Checkbox 
                                    label={{ children: <span style={{ color: 'white' }}>Strip Drawing Shape Watermark Overlays</span> }} 
                                    checked={xlsxRemoveDrawings}
                                    onChange={() => { setXlsxRemoveDrawings(!xlsxRemoveDrawings); setResultBlob(null); }}
                                    style={{ marginBottom: '10px', display: 'block' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleRemoveWatermark} 
                    loading={processing} 
                    disabled={!uploadedFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', color: 'white' }}
                >
                    Remove Watermark
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button 
                        color="green" 
                        size="small" 
                        onClick={() => saveAs(resultBlob, `${uploadedFile.name.replace(/\.[^/.]+$/, '')}_clean.${getExtension()}`)}
                    >
                        Download Result
                    </Button>
                    <Button color="blue" size="small" onClick={handleShare}>
                        <Icon name="share alternate" /> Share
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

export default WatermarkRemover;
