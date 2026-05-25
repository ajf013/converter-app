import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { motion } from 'framer-motion';
import { addHistoryEntry } from '../../../utils/historyUtils';

const rgbToHex = (r, g, b) => {
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b).toUpperCase();
};

const PaletteExtractor = () => {
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [palette, setPalette] = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [copiedColor, setCopiedColor] = useState(null);

    const extractColors = (file) => {
        setExtracting(true);
        setPalette([]);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 64;
                canvas.height = 64;
                ctx.drawImage(img, 0, 0, 64, 64);
                
                const imgData = ctx.getImageData(0, 0, 64, 64).data;
                const buckets = {};
                const bucketSize = 32; // Group colors into 32x32x32 spaces
                
                for (let i = 0; i < imgData.length; i += 4) {
                    const r = imgData[i];
                    const g = imgData[i+1];
                    const b = imgData[i+2];
                    const a = imgData[i+3];
                    
                    if (a < 128) continue; // Skip transparency
                    
                    const rBucket = Math.floor(r / bucketSize);
                    const gBucket = Math.floor(g / bucketSize);
                    const bBucket = Math.floor(b / bucketSize);
                    const key = `${rBucket},${gBucket},${bBucket}`;
                    
                    if (!buckets[key]) {
                        buckets[key] = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
                    }
                    buckets[key].rSum += r;
                    buckets[key].gSum += g;
                    buckets[key].bSum += b;
                    buckets[key].count++;
                }
                
                const sortedBuckets = Object.values(buckets)
                    .sort((a, b) => b.count - a.count);
                
                const extractedColors = [];
                for (let i = 0; i < Math.min(6, sortedBuckets.length); i++) {
                    const b = sortedBuckets[i];
                    const r = Math.round(b.rSum / b.count);
                    const g = Math.round(b.gSum / b.count);
                    const blue = Math.round(b.bSum / b.count);
                    
                    const hex = rgbToHex(r, g, blue);
                    extractedColors.push({ hex, rgb: `rgb(${r}, ${g}, ${blue})` });
                }
                
                setPalette(extractedColors);
                setExtracting(false);
                addHistoryEntry(file.name, 'Color Palette Extraction', 'Success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setImageFile(file);
            extractColors(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    const handleCopy = (colorHex) => {
        navigator.clipboard.writeText(colorHex);
        setCopiedColor(colorHex);
        setTimeout(() => setCopiedColor(null), 1500);
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                <Icon name='paint brush' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Palette Extractor</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Upload an image to extract its dominant color palette instantly.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='image outline' size='large' style={{ marginBottom: '10px' }} />
                {imageFile ? <p style={{ color: 'white', fontWeight: 'bold' }}>{imageFile.name}</p> : <p>Drag & drop image here, or click to browse</p>}
            </div>

            {previewUrl && (
                <div style={{ margin: '0 0 20px 0', width: '100%', maxHeight: '120px', overflow: 'hidden', borderRadius: '10px', display: 'flex', justifyContent: 'center' }}>
                    <img src={previewUrl} alt="Palette source" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
            )}

            {extracting && (
                <div style={{ color: 'white', margin: '15px 0' }}>
                    <Icon name='spinner' loading /> Extracting colors...
                </div>
            )}

            {palette.length > 0 && (
                <div style={{ width: '100%' }}>
                    <h4 style={{ color: 'white', textAlign: 'left', marginBottom: '12px' }}>Extracted Palette:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                        {palette.map((color, idx) => (
                            <motion.div 
                                key={idx}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCopy(color.hex)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <div style={{ 
                                    width: '100%', 
                                    aspectRatio: '1', 
                                    backgroundColor: color.hex, 
                                    borderRadius: '8px', 
                                    marginBottom: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }} />
                                <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {copiedColor === color.hex ? 'Copied!' : color.hex}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PaletteExtractor;
