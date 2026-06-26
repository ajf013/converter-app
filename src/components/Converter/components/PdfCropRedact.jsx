import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { cropPDFPages, erasePDFRegions } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

// Dynamically load PDF.js to render previews
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

const PdfCropRedact = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [activeTab, setActiveTab] = useState('crop'); // 'crop' or 'erase'
    const [pageRange, setPageRange] = useState('all');
    const [unit, setUnit] = useState('percentage'); // 'percentage' or 'points'
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    // PDF rendering states
    const [pdfDocument, setPdfDocument] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [previewPage, setPreviewPage] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);

    // Canvas container size
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Draggable Crop Box state (in pixels, relative to canvas size)
    const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const cropBoxInitializedRef = useRef(false);

    // Draggable Erase Box state (in pixels, relative to canvas size)
    const [erasePreset, setErasePreset] = useState('bottom'); // 'bottom', 'top', 'custom'
    const [eraseBox, setEraseBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [eraseColor, setEraseColor] = useState('#ffffff');

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
            setPdfDocument(null);
            setTotalPages(1);
            setPreviewPage(1);
            setPageRange('all');
            cropBoxInitializedRef.current = false;
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    // 1. Load PDF document
    useEffect(() => {
        if (!pdfFile) return;

        const loadPDF = async () => {
            setPdfLoading(true);
            setPdfError(false);
            try {
                const pdfjsLib = await loadPdfJs();
                const arrayBuffer = await pdfFile.arrayBuffer();
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
    }, [pdfFile]);

    // 2. Sync range inputs with preview page
    const handlePageRangeChange = (val) => {
        setPageRange(val);
        setResultBlob(null);

        // Try to parse page number to jump preview to
        const pageNum = parseInt(val.trim());
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setPreviewPage(pageNum);
        } else if (val.trim().toLowerCase() === 'last') {
            setPreviewPage(totalPages);
        }
    };

    // 3. Render PDF Page on Canvas
    useEffect(() => {
        if (!pdfDocument) return;

        const renderPage = async () => {
            try {
                const page = await pdfDocument.getPage(previewPage);
                const canvas = canvasRef.current;
                if (!canvas) return;

                const desiredWidth = 340; // elegant size to fit bento layout
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

                // Initialize selection boxes for first render or page dimensions update
                if (!cropBoxInitializedRef.current || cropBox.w === 0) {
                    setCropBox({
                        x: viewport.width * 0.1,
                        y: viewport.height * 0.1,
                        w: viewport.width * 0.8,
                        h: viewport.height * 0.8
                    });
                    
                    updateEraseBoxDimensions(erasePreset, viewport.width, viewport.height);
                    cropBoxInitializedRef.current = true;
                }
            } catch (err) {
                console.error('Error rendering page:', err);
            }
        };

        renderPage();
    }, [pdfDocument, previewPage]);

    // Helper to size eraser box based on preset selection
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
            // custom area
            setEraseBox({
                x: width * 0.25,
                y: height * 0.4,
                w: width * 0.5,
                h: height * 0.2
            });
        }
    };

    // Watch preset changes to adjust erase overlay dimensions
    useEffect(() => {
        updateEraseBoxDimensions(erasePreset);
    }, [erasePreset]);

    // Page switcher controls
    const navigatePage = (direction) => {
        let nextPage = previewPage + direction;
        if (nextPage < 1) nextPage = 1;
        if (nextPage > totalPages) nextPage = totalPages;
        setPreviewPage(nextPage);
        setPageRange(nextPage.toString());
        setResultBlob(null);
    };

    // Calculate crop margins and crop PDF
    const handleApplyCrop = async () => {
        if (!pdfFile || containerWidth === 0 || containerHeight === 0) return;
        setProcessing(true);
        try {
            // Convert canvas pixel crop margins to percentages
            const cropLeft = (cropBox.x / containerWidth) * 100;
            const cropRight = ((containerWidth - (cropBox.x + cropBox.w)) / containerWidth) * 100;
            const cropTop = (cropBox.y / containerHeight) * 100;
            const cropBottom = ((containerHeight - (cropBox.y + cropBox.h)) / containerHeight) * 100;

            const settings = {
                pageRange,
                cropLeft,
                cropRight,
                cropTop,
                cropBottom,
                unit: 'percentage'
            };
            const blob = await cropPDFPages(pdfFile, settings);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_cropped.pdf`, 'PDF Crop', 'Success');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error cropping PDF. Verify coordinates and page range.');
            addHistoryEntry(pdfFile.name, 'PDF Crop Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    // Calculate redact coordinates and white-out PDF
    const handleApplyErase = async () => {
        if (!pdfFile || containerWidth === 0 || containerHeight === 0) return;
        setProcessing(true);
        try {
            let settings = {
                pageRange,
                preset: erasePreset,
                color: eraseColor,
                unit: 'percentage'
            };

            if (erasePreset === 'bottom') {
                // Erase thickness relative to the bottom edge
                settings.presetValue = (eraseBox.h / containerHeight) * 100;
            } else if (erasePreset === 'top') {
                // Erase thickness relative to the top edge
                settings.presetValue = (eraseBox.h / containerHeight) * 100;
            } else {
                // Custom coordinates: PDF bottom-left origin
                settings.customX = (eraseBox.x / containerWidth) * 100;
                settings.customY = ((containerHeight - (eraseBox.y + eraseBox.h)) / containerHeight) * 100;
                settings.customWidth = (eraseBox.w / containerWidth) * 100;
                settings.customHeight = (eraseBox.h / containerHeight) * 100;
            }

            const blob = await erasePDFRegions(pdfFile, settings);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_redacted.pdf`, 'PDF Content Eraser', 'Success');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error redacting PDF regions.');
            addHistoryEntry(pdfFile.name, 'PDF Content Eraser Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const prefix = activeTab === 'crop' ? 'cropped' : 'redacted';
        const fileName = `${prefix}_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(resultBlob, fileName);
        }
    };

    // Mouse handlers for dragging/resizing Crop Box
    const handleCropMouseDown = (e, action) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startBox = { ...cropBox };

        const handleMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            let x = startBox.x;
            let y = startBox.y;
            let w = startBox.w;
            let h = startBox.h;

            if (action === 'move') {
                x = Math.max(0, Math.min(containerWidth - startBox.w, startBox.x + dx));
                y = Math.max(0, Math.min(containerHeight - startBox.h, startBox.y + dy));
            } else if (action === 'nw') {
                const limitDx = Math.min(dx, startBox.w - 20);
                x = Math.max(0, startBox.x + limitDx);
                w = startBox.w - (x - startBox.x);
                const limitDy = Math.min(dy, startBox.h - 20);
                y = Math.max(0, startBox.y + limitDy);
                h = startBox.h - (y - startBox.y);
            } else if (action === 'ne') {
                w = Math.max(20, Math.min(containerWidth - startBox.x, startBox.w + dx));
                const limitDy = Math.min(dy, startBox.h - 20);
                y = Math.max(0, startBox.y + limitDy);
                h = startBox.h - (y - startBox.y);
            } else if (action === 'sw') {
                const limitDx = Math.min(dx, startBox.w - 20);
                x = Math.max(0, startBox.x + limitDx);
                w = startBox.w - (x - startBox.x);
                h = Math.max(20, Math.min(containerHeight - startBox.y, startBox.h + dy));
            } else if (action === 'se') {
                w = Math.max(20, Math.min(containerWidth - startBox.x, startBox.w + dx));
                h = Math.max(20, Math.min(containerHeight - startBox.y, startBox.h + dy));
            }

            setCropBox({ x, y, w, h });
            setResultBlob(null);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Touch handlers for dragging/resizing Crop Box (Mobile)
    const handleCropTouchStart = (e, action) => {
        e.preventDefault();
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        const startBox = { ...cropBox };

        const handleTouchMove = (moveEvent) => {
            const currentTouch = moveEvent.touches[0];
            const dx = currentTouch.clientX - startX;
            const dy = currentTouch.clientY - startY;

            let x = startBox.x;
            let y = startBox.y;
            let w = startBox.w;
            let h = startBox.h;

            if (action === 'move') {
                x = Math.max(0, Math.min(containerWidth - startBox.w, startBox.x + dx));
                y = Math.max(0, Math.min(containerHeight - startBox.h, startBox.y + dy));
            } else if (action === 'nw') {
                const limitDx = Math.min(dx, startBox.w - 20);
                x = Math.max(0, startBox.x + limitDx);
                w = startBox.w - (x - startBox.x);
                const limitDy = Math.min(dy, startBox.h - 20);
                y = Math.max(0, startBox.y + limitDy);
                h = startBox.h - (y - startBox.y);
            } else if (action === 'ne') {
                w = Math.max(20, Math.min(containerWidth - startBox.x, startBox.w + dx));
                const limitDy = Math.min(dy, startBox.h - 20);
                y = Math.max(0, startBox.y + limitDy);
                h = startBox.h - (y - startBox.y);
            } else if (action === 'sw') {
                const limitDx = Math.min(dx, startBox.w - 20);
                x = Math.max(0, startBox.x + limitDx);
                w = startBox.w - (x - startBox.x);
                h = Math.max(20, Math.min(containerHeight - startBox.y, startBox.h + dy));
            } else if (action === 'se') {
                w = Math.max(20, Math.min(containerWidth - startBox.x, startBox.w + dx));
                h = Math.max(20, Math.min(containerHeight - startBox.y, startBox.h + dy));
            }

            setCropBox({ x, y, w, h });
            setResultBlob(null);
        };

        const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    };

    // Mouse handlers for Eraser Box (Watermark Remover)
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
                // Shaded from bottom, resizing height via dragging top boundary
                h = Math.max(10, Math.min(containerHeight, startBox.h - dy));
                y = containerHeight - h;
            } else if (erasePreset === 'top') {
                // Shaded from top, resizing height via dragging bottom boundary
                h = Math.max(10, Math.min(containerHeight, startBox.h + dy));
            } else {
                // Custom bounds
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

    // Touch handlers for Eraser Box (Mobile)
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

    const resetSelectionBoxes = () => {
        if (containerWidth > 0 && containerHeight > 0) {
            setCropBox({
                x: containerWidth * 0.1,
                y: containerHeight * 0.1,
                w: containerWidth * 0.8,
                h: containerHeight * 0.8
            });
            updateEraseBoxDimensions(erasePreset);
            setResultBlob(null);
        }
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #a83279 0%, #3d1b5a 100%)' }}>
                <Icon name={activeTab === 'crop' ? 'crop' : 'eraser'} size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF Crop & Eraser</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Drag & crop margins visually, or position an eraser block to mask out watermarks and text.
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button 
                    active={activeTab === 'crop'}
                    color={activeTab === 'crop' ? 'purple' : 'grey'}
                    onClick={() => { setActiveTab('crop'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='crop' /> Visual Crop
                </Button>
                <Button 
                    active={activeTab === 'erase'}
                    color={activeTab === 'erase' ? 'purple' : 'grey'}
                    onClick={() => { setActiveTab('erase'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='eraser' /> Erase / Redact
                </Button>
            </div>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: '25px 15px', marginBottom: '20px' }}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '5px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600', margin: 0 }}>{pdfFile.name}</p> : <p style={{ margin: 0 }}>Drag & drop target PDF here, or click to browse</p>}
            </div>

            {/* Render Preview Visual Crop / Erase Area */}
            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                    
                    {/* Live interactive preview canvas */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                            <div style={{ padding: '50px', color: 'rgba(255,255,255,0.6)' }}>
                                <Icon name='spinner' loading size='large' /> Loading PDF Page...
                            </div>
                        ) : pdfError ? (
                            <div style={{ padding: '40px', color: '#ff4d4f', textAlign: 'center' }}>
                                <Icon name='warning sign' size='large' /><br/>
                                Error rendering PDF preview page.
                            </div>
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
                                    background: '#fff',
                                    userSelect: 'none'
                                }}
                            >
                                <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

                                {/* CROP INTERACTIVE OVERLAY */}
                                {activeTab === 'crop' && containerWidth > 0 && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                                        {/* Crop Shaded backdrops */}
                                        <div style={{ position: 'absolute', left: 0, top: 0, width: cropBox.x, height: containerHeight, background: 'rgba(0,0,0,0.55)' }} />
                                        <div style={{ position: 'absolute', left: cropBox.x + cropBox.w, top: 0, width: containerWidth - (cropBox.x + cropBox.w), height: containerHeight, background: 'rgba(0,0,0,0.55)' }} />
                                        <div style={{ position: 'absolute', left: cropBox.x, top: 0, width: cropBox.w, height: cropBox.y, background: 'rgba(0,0,0,0.55)' }} />
                                        <div style={{ position: 'absolute', left: cropBox.x, top: cropBox.y + cropBox.h, width: cropBox.w, height: containerHeight - (cropBox.y + cropBox.h), background: 'rgba(0,0,0,0.55)' }} />

                                        {/* Crop Bounding Box Selector */}
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                left: cropBox.x,
                                                top: cropBox.y,
                                                width: cropBox.w,
                                                height: cropBox.h,
                                                border: '2px dashed #00dbde',
                                                boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0)',
                                                cursor: 'move',
                                                pointerEvents: 'auto'
                                            }}
                                            onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                                            onTouchStart={(e) => handleCropTouchStart(e, 'move')}
                                        >
                                            {/* Resize handles */}
                                            <div 
                                                style={{ position: 'absolute', left: '-5px', top: '-5px', width: '10px', height: '10px', background: '#00dbde', border: '1px solid white', cursor: 'nwse-resize' }} 
                                                onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'nw'); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, 'nw'); }}
                                            />
                                            <div 
                                                style={{ position: 'absolute', right: '-5px', top: '-5px', width: '10px', height: '10px', background: '#00dbde', border: '1px solid white', cursor: 'nesw-resize' }} 
                                                onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'ne'); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, 'ne'); }}
                                            />
                                            <div 
                                                style={{ position: 'absolute', left: '-5px', bottom: '-5px', width: '10px', height: '10px', background: '#00dbde', border: '1px solid white', cursor: 'nesw-resize' }} 
                                                onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'sw'); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, 'sw'); }}
                                            />
                                            <div 
                                                style={{ position: 'absolute', right: '-5px', bottom: '-5px', width: '10px', height: '10px', background: '#00dbde', border: '1px solid white', cursor: 'nwse-resize' }} 
                                                onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'se'); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, 'se'); }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ERASER / REDACT INTERACTIVE OVERLAY */}
                                {activeTab === 'erase' && containerWidth > 0 && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                                        {/* Eraser box */}
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

                                            {/* Resize Handle at the edge if preset-driven, or corners if custom */}
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

                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Page Range input */}
                        <div>
                            <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                Target Page Range (to apply modifications):
                            </label>
                            <Input 
                                fluid
                                value={pageRange} 
                                placeholder="e.g. '114', 'all', 'last', '1-5'" 
                                onChange={(e) => handlePageRangeChange(e.target.value)}
                            />
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                Entering specific page numbers (e.g. 114) will automatically update the preview.
                            </span>
                        </div>

                        {activeTab === 'crop' ? (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold', margin: 0 }}>
                                        Calculated Crop Box:
                                    </label>
                                    <Button size="mini" compact onClick={resetSelectionBoxes}>
                                        Reset Box
                                    </Button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Left</div>
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>{((cropBox.x / (containerWidth || 1)) * 100).toFixed(0)}%</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Right</div>
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>{(((containerWidth - (cropBox.x + cropBox.w)) / (containerWidth || 1)) * 100).toFixed(0)}%</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Top</div>
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>{((cropBox.y / (containerHeight || 1)) * 100).toFixed(0)}%</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Bottom</div>
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>{(((containerHeight - (cropBox.y + cropBox.h)) / (containerHeight || 1)) * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold', margin: 0 }}>
                                            Redaction/Eraser Mode:
                                        </label>
                                        <Button size="mini" compact onClick={resetSelectionBoxes}>
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
                                        Eraser Block Color:
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input 
                                            type="color" 
                                            value={eraseColor} 
                                            onChange={(e) => { setEraseColor(e.target.value); setResultBlob(null); }}
                                            style={{ border: 'none', background: 'transparent', width: '40px', height: '40px', cursor: 'pointer', borderRadius: '5px', padding: 0 }}
                                        />
                                        <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                            {eraseColor.toUpperCase()} (Set to match page background)
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={activeTab === 'crop' ? handleApplyCrop : handleApplyErase} 
                    loading={processing} 
                    disabled={!pdfFile || containerWidth === 0}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #a83279 0%, #3d1b5a 100%)', color: 'white' }}
                >
                    {activeTab === 'crop' ? 'Crop PDF Pages' : 'Erase PDF Content'}
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button 
                        color="green" 
                        size="small" 
                        onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_${activeTab === 'crop' ? 'cropped' : 'redacted'}.pdf`)}
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

export default PdfCropRedact;
