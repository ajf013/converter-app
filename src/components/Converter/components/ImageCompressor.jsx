import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage, createZipArchive } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry, getSettings } from '../../../utils/historyUtils';

const formatOptions = [
    { key: 'original', text: 'Original Format', value: 'original' },
    { key: 'webp', text: 'WEBP (Best Size)', value: 'webp' },
    { key: 'jpg', text: 'JPG', value: 'jpg' },
    { key: 'png', text: 'PNG', value: 'png' },
];

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImageCompressor = () => {
    const [imagesList, setImagesList] = useState([]);
    const [quality, setQuality] = useState(0.75); // Default 75%
    const [targetFormat, setTargetFormat] = useState('original');
    const [compressing, setCompressing] = useState(false);

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
                        compressedSize: null,
                        status: 'pending', // 'pending', 'compressing', 'success', 'error'
                        resultBlob: null,
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

    const getOutputFileFormat = (file, formatSetting) => {
        if (formatSetting !== 'original') return formatSetting;
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext)) {
            return ext === 'jpeg' ? 'jpg' : ext;
        }
        return 'jpg';
    };

    const compressSingleItem = async (item) => {
        const outFormat = getOutputFileFormat(item.file, targetFormat);
        const options = {
            width: item.originalWidth,
            height: item.originalHeight,
            quality: Number(quality)
        };

        const compressedBlob = await convertImage(item.file, outFormat, options);
        return { blob: compressedBlob, outFormat };
    };

    const handleCompressAll = async () => {
        if (imagesList.length === 0) return;
        setCompressing(true);

        const settings = getSettings();
        let successCount = 0;

        const updatedList = [...imagesList];

        for (let i = 0; i < updatedList.length; i++) {
            const item = updatedList[i];
            if (item.status === 'success' && item.resultBlob) continue;

            setImagesList(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'compressing' } : img));

            try {
                const { blob, outFormat } = await compressSingleItem(item);

                setImagesList(prev => prev.map((img, idx) =>
                    idx === i ? {
                        ...img,
                        status: 'success',
                        resultBlob: blob,
                        compressedSize: blob.size,
                        finalFormat: outFormat
                    } : img
                ));

                successCount++;
                const savings = item.originalSize > 0 
                    ? Math.round(((item.originalSize - blob.size) / item.originalSize) * 100)
                    : 0;

                addHistoryEntry(
                    `${item.file.name} compressed (${savings > 0 ? '-' + savings + '%' : '0%'})`,
                    'Image Compression',
                    'Success'
                );

                if (settings.autoDownload && updatedList.length === 1) {
                    saveAs(blob, `compressed_${item.file.name.replace(/\.[^/.]+$/, '')}.${outFormat}`);
                }
            } catch (err) {
                console.error(err);
                setImagesList(prev => prev.map((img, idx) =>
                    idx === i ? { ...img, status: 'error' } : img
                ));
                addHistoryEntry(item.file.name, 'Image Compression', 'Failed');
            }
        }

        setCompressing(false);

        if (settings.autoDownload && updatedList.length > 1 && successCount > 0) {
            handleDownloadAllZip();
        }
    };

    const handleDownloadAllZip = async () => {
        const successes = imagesList.filter(item => item.status === 'success' && item.resultBlob);
        if (successes.length === 0) return;

        try {
            const zipFiles = successes.map(item => ({
                name: `compressed_${item.file.name.replace(/\.[^/.]+$/, '')}.${item.finalFormat || 'jpg'}`,
                blob: item.resultBlob
            }));
            const zipBlob = await createZipArchive(zipFiles);
            saveAs(zipBlob, `compressed_images_${Date.now()}.zip`);
        } catch (err) {
            console.error('ZIP generation failed:', err);
            alert('Failed to package ZIP archive.');
        }
    };

    const handleShareItem = async (item) => {
        if (!item.resultBlob) return;
        const outFormat = item.finalFormat || 'jpg';
        const outName = `compressed_${item.file.name.replace(/\.[^/.]+$/, '')}.${outFormat}`;
        const mime = `image/${outFormat}`;
        const shared = await shareFile(item.resultBlob, outName, mime);
        if (!shared) {
            saveAs(item.resultBlob, outName);
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)' }}>
                <Icon name='compress' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Image Compressor</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Compress JPG, PNG, WEBP, and GIF images locally with real-time size reduction tracking.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file image outline' size='large' style={{ marginBottom: '10px' }} />
                <p>Drag & Drop Images here to compress, or click to browse</p>
            </div>

            {/* Compression Level & Output Format Controls */}
            <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600' }}>Compression Presets</span>
                    <strong style={{ color: '#f9d423', fontSize: '0.9rem' }}>{Math.round(quality * 100)}% Quality</strong>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <Button
                        size='mini'
                        active={quality === 0.4}
                        onClick={() => setQuality(0.4)}
                        color={quality === 0.4 ? 'orange' : 'grey'}
                        style={{ flex: 1, minWidth: '90px' }}
                    >
                        Max Size Reduction (40%)
                    </Button>
                    <Button
                        size='mini'
                        active={quality === 0.75}
                        onClick={() => setQuality(0.75)}
                        color={quality === 0.75 ? 'orange' : 'grey'}
                        style={{ flex: 1, minWidth: '90px' }}
                    >
                        Balanced (75%)
                    </Button>
                    <Button
                        size='mini'
                        active={quality === 0.9}
                        onClick={() => setQuality(0.9)}
                        color={quality === 0.9 ? 'orange' : 'grey'}
                        style={{ flex: 1, minWidth: '90px' }}
                    >
                        High Quality (90%)
                    </Button>
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        Custom Quality Slider
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#ff4e50' }}
                    />
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <label style={{ color: 'white', fontSize: '0.85rem', margin: 0 }}>Output Format:</label>
                    <Dropdown
                        selection
                        options={formatOptions}
                        value={targetFormat}
                        onChange={(_, { value }) => setTargetFormat(value)}
                        style={{ minWidth: '170px' }}
                    />
                </div>
            </div>

            {/* List of files added */}
            {imagesList.length > 0 && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>Images ({imagesList.length})</span>
                    </div>

                    <div style={{ maxHeight: '240px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {imagesList.map((item) => {
                            const savingsPercent = (item.compressedSize && item.originalSize)
                                ? Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)
                                : null;

                            return (
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '55%' }}>
                                        <img
                                            src={item.previewUrl}
                                            alt="thumbnail"
                                            style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                        <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                                            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {item.file.name}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span>{formatBytes(item.originalSize)}</span>
                                                {item.compressedSize && (
                                                    <>
                                                        <Icon name='right arrow' size='tiny' />
                                                        <span style={{ color: '#00dbde', fontWeight: 'bold' }}>{formatBytes(item.compressedSize)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {savingsPercent !== null && (
                                            <span style={{
                                                background: savingsPercent > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: savingsPercent > 0 ? '#4ade80' : '#f87171',
                                                border: `1px solid ${savingsPercent > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                borderRadius: '12px',
                                                padding: '2px 8px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {savingsPercent > 0 ? `-${savingsPercent}%` : `${savingsPercent}%`}
                                            </span>
                                        )}

                                        {item.status === 'success' ? (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <Button
                                                    icon='download'
                                                    size='mini'
                                                    color='green'
                                                    onClick={() => saveAs(item.resultBlob, `compressed_${item.file.name.replace(/\.[^/.]+$/, '')}.${item.finalFormat || 'jpg'}`)}
                                                    aria-label="Download compressed image"
                                                />
                                                <Button
                                                    icon='share alternate'
                                                    size='mini'
                                                    color='blue'
                                                    onClick={() => handleShareItem(item)}
                                                    aria-label="Share compressed image"
                                                />
                                            </div>
                                        ) : item.status === 'compressing' ? (
                                            <Icon name='spinner' loading style={{ color: '#ff4e50' }} />
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
                            );
                        })}
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
                            disabled={compressing}
                            style={{ flex: 1 }}
                        >
                            Clear
                        </Button>
                        <Button
                            primary
                            onClick={handleCompressAll}
                            loading={compressing}
                            style={{ flex: 2, background: 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)', color: 'white' }}
                        >
                            Compress All
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
                        <Icon name='file archive' /> Download All Compressed as ZIP ({successesCount} Files)
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

export default ImageCompressor;
