import React, { useEffect, useState, useRef } from 'react';
import { Icon, Button } from 'semantic-ui-react';
import { motion } from 'framer-motion';

// Dynamically load PDF.js to render PDF previews
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

const FilePreview = ({ file, onRemove }) => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [pdfError, setPdfError] = useState(false);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!file) return;

        let url = '';
        if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else if (file.type === 'application/pdf') {
            url = URL.createObjectURL(file);
            setPreviewUrl(url);
            renderPdfFirstPage(file);
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [file]);

    const renderPdfFirstPage = async (pdfFile) => {
        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
        } catch (err) {
            console.error('PDF preview error:', err);
            setPdfError(true);
        }
    };

    if (!file) return null;

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '15px',
                padding: '15px',
                marginTop: '10px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
        >
            {onRemove && (
                <Button 
                    circular 
                    icon='close' 
                    size='mini' 
                    color='red'
                    onClick={onRemove}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 10,
                        margin: 0
                    }}
                />
            )}

            {isImage && previewUrl && (
                <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '150px', 
                        borderRadius: '8px', 
                        objectFit: 'contain',
                        marginBottom: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }} 
                />
            )}

            {isPdf && (
                <div style={{ position: 'relative', marginBottom: '10px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <canvas 
                        ref={canvasRef} 
                        style={{ 
                            maxHeight: '180px', 
                            maxWidth: '100%', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                            background: '#ffffff',
                            display: pdfError ? 'none' : 'block'
                        }} 
                    />
                    {pdfError && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Icon name="file pdf" size="huge" style={{ color: '#ff4d4f' }} />
                        </div>
                    )}
                </div>
            )}

            {isAudio && previewUrl && (
                <audio 
                    src={previewUrl} 
                    controls 
                    style={{ 
                        width: '100%', 
                        height: '40px', 
                        marginTop: '5px',
                        marginBottom: '10px' 
                    }} 
                />
            )}

            {isVideo && previewUrl && (
                <video 
                    src={previewUrl} 
                    controls 
                    style={{ 
                        width: '100%', 
                        maxHeight: '160px', 
                        borderRadius: '8px', 
                        marginBottom: '10px' 
                    }} 
                />
            )}

            {!isImage && !isPdf && !isAudio && !isVideo && (
                <div style={{ margin: '15px 0' }}>
                    <Icon name="file outline" size="huge" style={{ opacity: 0.8 }} />
                </div>
            )}

            <div style={{ textAlign: 'center', width: '90%', wordBreak: 'break-all' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ffffff', marginBottom: '4px' }}>
                    {file.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {formatSize(file.size)} • {file.type || 'Unknown Type'}
                </div>
            </div>
        </motion.div>
    );
};

export default FilePreview;
