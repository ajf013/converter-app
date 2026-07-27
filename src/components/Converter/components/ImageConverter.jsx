import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader, Input, Checkbox } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage, createZipArchive } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry, getSettings } from '../../../utils/historyUtils';

const imageOptions = [
    { key: 'png', text: 'PNG', value: 'png' },
    { key: 'jpg', text: 'JPG', value: 'jpg' },
    { key: 'webp', text: 'WEBP', value: 'webp' },
    { key: 'gif', text: 'GIF', value: 'gif' },
    { key: 'bmp', text: 'BMP', value: 'bmp' },
];

const ImageConverter = () => {
    const [imagesList, setImagesList] = useState([]);
    const [globalFormat, setGlobalFormat] = useState('png');
    const [converting, setConverting] = useState(false);
    
    // --- Advanced Settings ---
    const [showSettings, setShowSettings] = useState(false);
    const [resizeMode, setResizeMode] = useState('percent'); // 'percent' or 'pixel'
    const [scalePercent, setScalePercent] = useState(100);
    const [customWidth, setCustomWidth] = useState('');
    const [customHeight, setCustomHeight] = useState('');
    const [maintainAspect, setMaintainAspect] = useState(true);

    // Clean up object URLs on unmount
    useEffect(() => {
        return () => {
            imagesList.forEach(item => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDropImage = useCallback((acceptedFiles) => {
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
                        targetFormat: globalFormat,
                        status: 'pending', // 'pending', 'converting', 'success', 'error'
                        resultBlob: null,
                        originalWidth: img.width,
                        originalHeight: img.height,
                    },
                ]);
            };
            img.src = previewUrl;
        });
    }, [globalFormat]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/*': [] }
    });

    const handleFormatChangeAll = (e, { value }) => {
        setGlobalFormat(value);
        setImagesList(prev => prev.map(item => ({ ...item, targetFormat: value })));
    };

    const handleFormatChangeSingle = (id, value) => {
        setImagesList(prev => prev.map(item => 
            item.id === id ? { ...item, targetFormat: value, status: 'pending', resultBlob: null } : item
        ));
    };

    const removeItem = (id, previewUrl) => {
        URL.revokeObjectURL(previewUrl);
        setImagesList(prev => prev.filter(item => item.id !== id));
    };

    const clearAll = () => {
        imagesList.forEach(item => URL.revokeObjectURL(item.previewUrl));
        setImagesList([]);
    };

    const convertSingleItem = async (item) => {
        // Calculate dimensions
        let optWidth = item.originalWidth;
        let optHeight = item.originalHeight;

        if (resizeMode === 'percent') {
            const scale = Number(scalePercent) / 100;
            optWidth = Math.round(item.originalWidth * scale);
            optHeight = Math.round(item.originalHeight * scale);
        } else if (resizeMode === 'pixel') {
            const reqWidth = Number(customWidth);
            const reqHeight = Number(customHeight);

            if (reqWidth && reqHeight) {
                optWidth = reqWidth;
                optHeight = reqHeight;
            } else if (reqWidth && maintainAspect) {
                optWidth = reqWidth;
                optHeight = Math.round(item.originalHeight * (reqWidth / item.originalWidth));
            } else if (reqHeight && maintainAspect) {
                optHeight = reqHeight;
                optWidth = Math.round(item.originalWidth * (reqHeight / item.originalHeight));
            }
        }

        const options = {
            width: optWidth,
            height: optHeight,
            quality: 0.95
        };

        const convertedBlob = await convertImage(item.file, item.targetFormat, options);
        return convertedBlob;
    };

    const handleConvertAll = async () => {
        if (imagesList.length === 0) return;
        setConverting(true);

        const settings = getSettings();
        let successCount = 0;
        
        const updatedList = [...imagesList];
        
        for (let i = 0; i < updatedList.length; i++) {
            const item = updatedList[i];
            if (item.status === 'success' && item.resultBlob) continue; // Skip already converted

            // Set to converting
            setImagesList(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'converting' } : img));

            try {
                const blob = await convertSingleItem(item);
                
                // Update item on successful conversion
                setImagesList(prev => prev.map((img, idx) => 
                    idx === i ? { ...img, status: 'success', resultBlob: blob } : img
                ));
                
                successCount++;
                addHistoryEntry(`${item.file.name.substring(0, 20)} -> ${item.targetFormat}`, 'Image Conversion', 'Success');

                // Auto download if enabled and single file conversion
                if (settings.autoDownload && updatedList.length === 1) {
                    saveAs(blob, `${item.file.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat}`);
                }
            } catch (err) {
                console.error(err);
                setImagesList(prev => prev.map((img, idx) => 
                    idx === i ? { ...img, status: 'error' } : img
                ));
                addHistoryEntry(item.file.name, 'Image Conversion', 'Failed');
            }
        }

        setConverting(false);

        // If batch completed and auto-download is on, trigger ZIP if multiple files
        if (settings.autoDownload && updatedList.length > 1 && successCount > 0) {
            handleDownloadAllZip();
        }
    };

    const handleDownloadAllZip = async () => {
        const successes = imagesList.filter(item => item.status === 'success' && item.resultBlob);
        if (successes.length === 0) return;

        try {
            const zipFiles = successes.map(item => ({
                name: `${item.file.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat}`,
                blob: item.resultBlob
            }));
            const zipBlob = await createZipArchive(zipFiles);
            saveAs(zipBlob, `converted_images_${Date.now()}.zip`);
        } catch (err) {
            console.error('ZIP generation failed:', err);
            alert('Failed to package ZIP archive.');
        }
    };

    const handleShareItem = async (item) => {
        if (!item.resultBlob) return;
        const outName = `${item.file.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat}`;
        const mime = `image/${item.targetFormat}`;
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)' }}>
                <Icon name='image' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Image Converter</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Convert and resize multiple images between PNG, JPG, WEBP, GIF, and BMP formats.
            </p>
            
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='images outline' size='large' style={{ marginBottom: '10px' }} />
                <p>Drag & Drop Images here, or click to browse</p>
            </div>

            {/* Advanced Settings Toggle */}
            <div style={{ width: '100%', marginBottom: '15px' }}>
                <Button 
                    icon
                    labelPosition='left'
                    size='mini' 
                    color='black'
                    fluid
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Icon name={showSettings ? 'chevron up' : 'sliders'} />
                    {showSettings ? 'Hide Resizer Settings' : 'Show Resizer Settings'}
                </Button>

                {showSettings && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            borderRadius: '10px', 
                            padding: '15px', 
                            marginTop: '10px',
                            textAlign: 'left',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <h4 style={{ color: 'white', margin: '0 0 12px 0' }}>Resizing Mode</h4>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <Button 
                                size='mini' 
                                active={resizeMode === 'percent'} 
                                onClick={() => setResizeMode('percent')}
                                color={resizeMode === 'percent' ? 'teal' : 'grey'}
                                style={{ flex: 1 }}
                            >
                                By Percentage
                            </Button>
                            <Button 
                                size='mini' 
                                active={resizeMode === 'pixel'} 
                                onClick={() => setResizeMode('pixel')}
                                color={resizeMode === 'pixel' ? 'teal' : 'grey'}
                                style={{ flex: 1 }}
                            >
                                Custom Dimensions
                            </Button>
                        </div>

                        {resizeMode === 'percent' ? (
                            <div style={{ marginBottom: '5px' }}>
                                <label style={{ color: 'white', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Scale Ratio</span>
                                    <strong>{scalePercent}%</strong>
                                </label>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="200" 
                                    value={scalePercent} 
                                    onChange={(e) => setScalePercent(e.target.value)} 
                                    style={{ width: '100%', accentColor: '#00dbde' }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <Input 
                                        fluid 
                                        type="number"
                                        label="Width"
                                        labelPosition="left"
                                        placeholder="px"
                                        value={customWidth}
                                        onChange={(e) => setCustomWidth(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <Input 
                                        fluid 
                                        type="number"
                                        label="Height"
                                        labelPosition="left"
                                        placeholder="px"
                                        value={customHeight}
                                        onChange={(e) => setCustomHeight(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <Checkbox 
                                    label={<label style={{ color: 'white' }}>Maintain original aspect ratio</label>}
                                    checked={maintainAspect}
                                    onChange={(_, data) => setMaintainAspect(data.checked)}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* List of files added */}
            {imagesList.length > 0 && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>Images ({imagesList.length})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ color: 'white', fontSize: '0.8rem', margin: 0 }}>All to:</label>
                            <Dropdown 
                                inline 
                                options={imageOptions} 
                                value={globalFormat} 
                                onChange={handleFormatChangeAll} 
                            />
                        </div>
                    </div>

                    <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {imagesList.map((item) => (
                            <div 
                                key={item.id} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    padding: '8px 12px', 
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '60%' }}>
                                    <img 
                                        src={item.previewUrl} 
                                        alt="thumbnail" 
                                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                    />
                                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.file.name}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                            {item.originalWidth}x{item.originalHeight}px
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.status === 'success' ? (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <Button 
                                                icon='download' 
                                                size='mini' 
                                                color='green' 
                                                onClick={() => saveAs(item.resultBlob, `${item.file.name.replace(/\.[^/.]+$/, '')}.${item.targetFormat}`)}
                                                aria-label="Download individual image"
                                            />
                                            <Button 
                                                icon='share alternate' 
                                                size='mini' 
                                                color='blue' 
                                                onClick={() => handleShareItem(item)}
                                                aria-label="Share individual image"
                                            />
                                        </div>
                                    ) : item.status === 'converting' ? (
                                        <Icon name='spinner' loading style={{ color: '#00dbde' }} />
                                    ) : item.status === 'error' ? (
                                        <Icon name='exclamation circle' color='red' />
                                    ) : (
                                        <Dropdown 
                                            options={imageOptions} 
                                            value={item.targetFormat} 
                                            onChange={(_, { value }) => handleFormatChangeSingle(item.id, value)}
                                            style={{ minWidth: '70px', padding: '6px 8px', fontSize: '0.8rem' }}
                                        />
                                    )}
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
                            disabled={converting}
                            style={{ flex: 1 }}
                        >
                            Clear
                        </Button>
                        <Button 
                            primary
                            onClick={handleConvertAll} 
                            loading={converting} 
                            style={{ flex: 2, background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)', color: 'white' }}
                        >
                            Convert All
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
                        <Icon name='file archive' /> Download All as ZIP ({successesCount} Files)
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

export default ImageConverter;
