import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { addWatermarkToPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfSign = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [signatureImage, setSignatureImage] = useState(null); // PNG blob of signature
    const [isDrawing, setIsDrawing] = useState(false);
    const [pageRange, setPageRange] = useState('last'); // 'first', 'last', 'all', or custom
    const [scale, setScale] = useState(0.8);
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);
    
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    // Initialize drawing canvas
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = canvas.offsetWidth * 2; // high-dpi
        canvas.height = 150 * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000'; // Black signature
        ctx.lineWidth = 3;
        ctxRef.current = ctx;
    }, [pdfFile]);

    const onDropPdf = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
            setSignatureImage(null);
        }
    };

    const { getRootProps: getPdfProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
        onDrop: onDropPdf,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    // Drawing handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        // Handle touch vs mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        ctxRef.current.lineTo(clientX - rect.left, clientY - rect.top);
        ctxRef.current.stroke();
        e.preventDefault();
    };

    const stopDrawing = () => {
        ctxRef.current.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureImage(null);
        setResultBlob(null);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        // Check if canvas is blank/empty by checking pixel data
        const ctx = canvas.getContext('2d');
        const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const blank = !buffer.data.some(channel => channel !== 0);
        
        if (blank) {
            alert('Please draw your signature first.');
            return;
        }

        canvas.toBlob((blob) => {
            const file = new File([blob], 'signature.png', { type: 'image/png' });
            setSignatureImage(file);
        }, 'image/png');
    };

    const handleSignPDF = async () => {
        if (!pdfFile || !signatureImage) return;
        setProcessing(true);
        try {
            // Translate keywords 'first' or 'last' to page ranges
            let targetPages = pageRange;
            if (pageRange === 'first') {
                targetPages = '1';
            } else if (pageRange === 'last') {
                targetPages = 'last'; // handled inside pdf-lib parsing, or let's resolve it here
            }

            const settings = {
                type: 'image',
                imageFile: signatureImage,
                scale,
                opacity: 1.0,
                angle: 0,
                pageRange: targetPages
            };

            const blob = await addWatermarkToPDF(pdfFile, settings);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_signed.pdf`, 'PDF Sign', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error signing PDF. Please verify that the PDF is not protected.');
            addHistoryEntry(pdfFile.name, 'PDF Sign Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `signed_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(resultBlob, fileName);
        }
    };

    const pageOptions = [
        { key: 'last', text: 'Last Page (Recommended)', value: 'last' },
        { key: 'first', text: 'First Page', value: 'first' },
        { key: 'all', text: 'All Pages', value: 'all' },
        { key: 'custom', text: 'Custom Page Range...', value: 'custom' }
    ];

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: '540px' }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)' }}>
                <Icon name='pencil' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Sign PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Draw your digital signature and apply it to target pages of your PDF document.
            </p>

            <div {...getPdfProps()} className={`dropzone ${isPdfDragActive ? 'active' : ''}`} style={{ padding: '25px 15px', marginBottom: '20px' }}>
                <input {...getPdfInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '5px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600', margin: 0 }}>{pdfFile.name}</p> : <p style={{ margin: 0 }}>Drag & drop target PDF here, or click</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    
                    {/* Draw area */}
                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Draw Signature:
                        </label>
                        <div style={{ position: 'relative', background: 'white', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                style={{ width: '100%', height: '150px', cursor: 'crosshair', display: 'block' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <Button size="mini" color="grey" onClick={clearCanvas} style={{ flex: 1 }}>Clear Pad</Button>
                            <Button size="mini" color={signatureImage ? 'green' : 'blue'} onClick={saveSignature} style={{ flex: 1 }}>
                                {signatureImage ? <><Icon name='check' /> Signature Created</> : 'Confirm Signature'}
                            </Button>
                        </div>
                    </div>

                    {signatureImage && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Apply to:</label>
                                    <Dropdown
                                        fluid
                                        selection
                                        options={pageOptions}
                                        value={pageRange === 'first' || pageRange === 'last' || pageRange === 'all' ? pageRange : 'custom'}
                                        onChange={(e, { value }) => {
                                            if (value !== 'custom') {
                                                setPageRange(value);
                                            } else {
                                                setPageRange('1');
                                            }
                                            setResultBlob(null);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Signature Scale ({scale.toFixed(1)}x):</label>
                                    <input 
                                        type="range" 
                                        min="0.2" 
                                        max="2.5" 
                                        step="0.1"
                                        value={scale} 
                                        onChange={(e) => { setScale(Number(e.target.value)); setResultBlob(null); }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {!(pageRange === 'first' || pageRange === 'last' || pageRange === 'all') && (
                                <div>
                                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Custom Page Range:</label>
                                    <Input 
                                        fluid
                                        value={pageRange} 
                                        placeholder="e.g. 1, 3, 5" 
                                        onChange={(e) => { setPageRange(e.target.value); setResultBlob(null); }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleSignPDF} 
                    loading={processing} 
                    disabled={!pdfFile || !signatureImage}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)', color: 'white' }}
                >
                    Sign PDF Document
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_signed.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfSign;
