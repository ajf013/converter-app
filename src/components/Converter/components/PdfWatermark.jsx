import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { addWatermarkToPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfWatermark = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [watermarkType, setWatermarkType] = useState('text'); // 'text' or 'image'
    
    // Text watermark settings
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
    const [fontColor, setFontColor] = useState('#ff0000');
    const [fontSize, setFontSize] = useState(50);
    
    // Image watermark settings
    const [watermarkImage, setWatermarkImage] = useState(null);
    const [scale, setScale] = useState(1.0);
    
    // Common settings
    const [opacity, setOpacity] = useState(0.4);
    const [angle, setAngle] = useState(45);
    const [pageRange, setPageRange] = useState('all');
    
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDropPdf = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
        }
    };

    const onDropImage = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setWatermarkImage(acceptedFiles[0]);
            setResultBlob(null);
        }
    };

    const { getRootProps: getPdfProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
        onDrop: onDropPdf,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const { getRootProps: getImageProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        multiple: false
    });

    const handleApplyWatermark = async () => {
        if (!pdfFile) return;
        if (watermarkType === 'text' && !watermarkText) {
            alert('Please enter watermark text.');
            return;
        }
        if (watermarkType === 'image' && !watermarkImage) {
            alert('Please upload a watermark image.');
            return;
        }

        setProcessing(true);
        try {
            const settings = {
                type: watermarkType,
                text: watermarkText,
                fontColor,
                fontSize,
                imageFile: watermarkImage,
                scale,
                opacity,
                angle,
                pageRange
            };
            const blob = await addWatermarkToPDF(pdfFile, settings);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_watermarked.pdf`, 'PDF Watermark', 'Success');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error applying watermark. Please make sure the PDF is not password protected.');
            addHistoryEntry(pdfFile.name, 'PDF Watermark Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `watermarked_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(resultBlob, fileName);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: '540px' }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #13f1fc 0%, #0470f5 100%)' }}>
                <Icon name='stamp' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Watermark PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Add a text overlay or image watermark over your PDF document pages.
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button 
                    active={watermarkType === 'text'}
                    color={watermarkType === 'text' ? 'blue' : 'grey'}
                    onClick={() => { setWatermarkType('text'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='font' /> Text Watermark
                </Button>
                <Button 
                    active={watermarkType === 'image'}
                    color={watermarkType === 'image' ? 'blue' : 'grey'}
                    onClick={() => { setWatermarkType('image'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='image' /> Image Watermark
                </Button>
            </div>

            <div {...getPdfProps()} className={`dropzone ${isPdfDragActive ? 'active' : ''}`} style={{ padding: '25px 15px', marginBottom: '20px' }}>
                <input {...getPdfInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '5px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600', margin: 0 }}>{pdfFile.name}</p> : <p style={{ margin: 0 }}>Drag & drop target PDF here, or click</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    {watermarkType === 'text' ? (
                        <>
                            <div>
                                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Watermark Text:
                                </label>
                                <Input 
                                    fluid
                                    value={watermarkText} 
                                    onChange={(e) => { setWatermarkText(e.target.value); setResultBlob(null); }}
                                    placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Text Color:
                                    </label>
                                    <input 
                                        type="color" 
                                        value={fontColor} 
                                        onChange={(e) => { setFontColor(e.target.value); setResultBlob(null); }}
                                        style={{ width: '100%', height: '40px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '2px', cursor: 'pointer' }}
                                    />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Font Size ({fontSize}px):
                                    </label>
                                    <input 
                                        type="range" 
                                        min="12" 
                                        max="150" 
                                        value={fontSize} 
                                        onChange={(e) => { setFontSize(Number(e.target.value)); setResultBlob(null); }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                Watermark Image (PNG/JPG):
                            </label>
                            <div {...getImageProps()} className={`dropzone ${isImageDragActive ? 'active' : ''}`} style={{ padding: '20px', borderStyle: 'dotted', background: 'rgba(255,255,255,0.02)', marginBottom: '5px' }}>
                                <input {...getImageInputProps()} />
                                {watermarkImage ? (
                                    <p style={{ color: '#00dbde', fontWeight: '600', margin: 0 }}><Icon name='check' /> {watermarkImage.name}</p>
                                ) : (
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Drag & drop image here or click</p>
                                )}
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Image Scale ({scale.toFixed(1)}x):
                                </label>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="3.0" 
                                    step="0.1"
                                    value={scale} 
                                    onChange={(e) => { setScale(Number(e.target.value)); setResultBlob(null); }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                Opacity ({Math.round(opacity * 100)}%):
                            </label>
                            <input 
                                type="range" 
                                min="0.05" 
                                max="1.0" 
                                step="0.05"
                                value={opacity} 
                                onChange={(e) => { setOpacity(Number(e.target.value)); setResultBlob(null); }}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                                Rotation Angle ({angle}°):
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={angle} 
                                onChange={(e) => { setAngle(Number(e.target.value)); setResultBlob(null); }}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                            Page Range:
                        </label>
                        <Input 
                            fluid
                            value={pageRange} 
                            placeholder="e.g. 'all', '1, 3', '2-5'" 
                            onChange={(e) => { setPageRange(e.target.value); setResultBlob(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleApplyWatermark} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #13f1fc 0%, #0470f5 100%)', color: 'white' }}
                >
                    Apply Watermark
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_watermarked.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfWatermark;
