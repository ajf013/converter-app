import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage, createZipArchive } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry, getSettings } from '../../../utils/historyUtils';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ExifCleaner = () => {
    const [imagesList, setImagesList] = useState([]);
    const [cleaning, setCleaning] = useState(false);

    // Clean up object URLs on unmount
    useEffect(() => {
        return () => {
            imagesList.forEach(item => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDropImages = useCallback((acceptedFiles) => {
        if (!acceptedFiles?.length) return;

        acceptedFiles.forEach((file) => {
            const previewUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                setImagesList((prev) => [
                    ...prev,
                    {
                        id: Math.random().toString(),
                        file,
                        previewUrl,
                        originalSize: file.size,
                        cleanedBlob: null,
                        status: 'pending', // 'pending', 'cleaning', 'success', 'error'
                        originalWidth: img.width,
                        originalHeight: img.height,
                    },
                ]);
            };
            img.src = previewUrl;
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropImages,
        accept: { 'image/*': [] }
    });

    const removeItem = (id, previewUrl) => {
        URL.revokeObjectURL(previewUrl);
        setImagesList(prev => prev.filter(item => item.id !== id));
    };

    const clearAll = () => {
        imagesList.forEach(item => URL.revokeObjectURL(item.previewUrl));
        setImagesList([]);
    };

    const stripExifSingleItem = async (item) => {
        // Redrawing on HTML5 canvas strips all EXIF metadata headers cleanly
        const ext = item.file.name.split('.').pop().toLowerCase();
        let targetFormat = 'jpg';
        if (['png', 'webp', 'bmp', 'gif'].includes(ext)) {
            targetFormat = ext;
        }

        const options = {
            width: item.originalWidth,
            height: item.originalHeight,
            quality: 0.95
        };

        const cleanedBlob = await convertImage(item.file, targetFormat, options);
        return { blob: cleanedBlob, targetFormat };
    };

    const handleCleanAll = async () => {
        if (imagesList.length === 0) return;
        setCleaning(true);

        const settings = getSettings();
        let successCount = 0;
        const updatedList = [...imagesList];

        for (let i = 0; i < updatedList.length; i++) {
            const item = updatedList[i];
            if (item.status === 'success' && item.cleanedBlob) continue;

            setImagesList(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'cleaning' } : img));

            try {
                const { blob, targetFormat } = await stripExifSingleItem(item);

                setImagesList(prev => prev.map((img, idx) =>
                    idx === i ? {
                        ...img,
                        status: 'success',
                        cleanedBlob: blob,
                        format: targetFormat
                    } : img
                ));

                successCount++;
                addHistoryEntry(`${item.file.name} EXIF Stripped`, 'EXIF Privacy Cleaning', 'Success');

                if (settings.autoDownload && updatedList.length === 1) {
                    saveAs(blob, `clean_${item.file.name.replace(/\.[^/.]+$/, '')}.${targetFormat}`);
                }
            } catch (err) {
                console.error(err);
                setImagesList(prev => prev.map((img, idx) =>
                    idx === i ? { ...img, status: 'error' } : img
                ));
                addHistoryEntry(item.file.name, 'EXIF Cleaning', 'Failed');
            }
        }

        setCleaning(false);

        if (settings.autoDownload && updatedList.length > 1 && successCount > 0) {
            handleDownloadAllZip();
        }
    };

    const handleDownloadAllZip = async () => {
        const successes = imagesList.filter(item => item.status === 'success' && item.cleanedBlob);
        if (successes.length === 0) return;

        try {
            const zipFiles = successes.map(item => ({
                name: `clean_${item.file.name.replace(/\.[^/.]+$/, '')}.${item.format || 'jpg'}`,
                blob: item.cleanedBlob
            }));
            const zipBlob = await createZipArchive(zipFiles);
            saveAs(zipBlob, `privacy_cleaned_photos_${Date.now()}.zip`);
        } catch (err) {
            console.error('ZIP generation failed:', err);
            alert('Failed to package ZIP archive.');
        }
    };

    const handleShareItem = async (item) => {
        if (!item.cleanedBlob) return;
        const outFormat = item.format || 'jpg';
        const outName = `clean_${item.file.name.replace(/\.[^/.]+$/, '')}.${outFormat}`;
        const mime = `image/${outFormat}`;
        const shared = await shareFile(item.cleanedBlob, outName, mime);
        if (!shared) {
            saveAs(item.cleanedBlob, outName);
        }
    };

    const successesCount = imagesList.filter(img => img.status === 'success').length;

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' }}>
                <Icon name='eye slash' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>EXIF Metadata Cleaner</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Strip hidden camera models, timestamps, and GPS geolocation metadata from photos before sharing online.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='user secret' size='large' style={{ marginBottom: '10px' }} />
                <p>Drag & Drop Photos here to clean metadata, or click to browse</p>
            </div>

            {/* List of files added */}
            {imagesList.length > 0 && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>Photos ({imagesList.length})</span>
                    </div>

                    <div style={{ maxHeight: '240px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {imagesList.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '60%' }}>
                                    <img
                                        src={item.previewUrl}
                                        alt="thumbnail"
                                        style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.file.name}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                            {item.originalWidth}x{item.originalHeight}px • {formatBytes(item.originalSize)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.status === 'success' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                background: 'rgba(34, 197, 94, 0.2)',
                                                color: '#4ade80',
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                borderRadius: '12px',
                                                padding: '2px 8px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                EXIF Cleaned ✓
                                            </span>
                                            <Button
                                                icon='download'
                                                size='mini'
                                                color='green'
                                                onClick={() => saveAs(item.cleanedBlob, `clean_${item.file.name.replace(/\.[^/.]+$/, '')}.${item.format || 'jpg'}`)}
                                                aria-label="Download clean photo"
                                            />
                                            <Button
                                                icon='share alternate'
                                                size='mini'
                                                color='blue'
                                                onClick={() => handleShareItem(item)}
                                                aria-label="Share clean photo"
                                            />
                                        </div>
                                    ) : item.status === 'cleaning' ? (
                                        <Icon name='spinner' loading style={{ color: '#00c6ff' }} />
                                    ) : item.status === 'error' ? (
                                        <Icon name='exclamation circle' color='red' />
                                    ) : null}

                                    <Button
                                        icon='close'
                                        circular
                                        size='mini'
                                        color='red'
                                        onClick={() => removeItem(item.id, item.previewUrl)}
                                        style={{ padding: '4px' }}
                                        aria-label="Delete image"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions Panel */}
            <div className="controls" style={{ width: '100%', display: 'flex', gap: '10px' }}>
                {imagesList.length > 0 && (
                    <>
                        <Button
                            color='red'
                            onClick={clearAll}
                            disabled={cleaning}
                            style={{ flex: 1 }}
                        >
                            Clear
                        </Button>
                        <Button
                            primary
                            onClick={handleCleanAll}
                            loading={cleaning}
                            style={{ flex: 2, background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', color: 'white' }}
                        >
                            Clean Privacy & EXIF Tags
                        </Button>
                    </>
                )}
            </div>

            {/* Batch ZIP download trigger */}
            {successesCount > 1 && (
                <div style={{ width: '100%', marginTop: '15px' }}>
                    <Button
                        color='green'
                        fluid
                        onClick={handleDownloadAllZip}
                    >
                        <Icon name='file archive' /> Download All Clean Photos as ZIP ({successesCount} Files)
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

export default ExifCleaner;
