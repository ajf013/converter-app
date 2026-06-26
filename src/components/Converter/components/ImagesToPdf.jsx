import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, List, Dropdown } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImagesToPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const ImageThumbnail = ({ file }) => {
    const [src, setSrc] = React.useState('');
    React.useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return src ? (
        <img 
            src={src} 
            style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} 
            alt="thumb" 
        />
    ) : (
        <Icon name='image' color='teal' />
    );
};

const ImagesToPdf = () => {
    const [imageFiles, setImageFiles] = useState([]);
    const [pageSize, setPageSize] = useState('fit'); // 'fit', 'a4', 'letter'
    const [orientation, setOrientation] = useState('portrait'); // 'portrait', 'landscape', 'auto'
    const [margin, setMargin] = useState('none'); // 'none', 'small', 'large'
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setImageFiles(prev => [...prev, ...acceptedFiles]);
            setResultBlob(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
    });

    const moveItem = (index, direction) => {
        const newFiles = [...imageFiles];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= imageFiles.length) return;
        const temp = newFiles[index];
        newFiles[index] = newFiles[targetIndex];
        newFiles[targetIndex] = temp;
        setImageFiles(newFiles);
        setResultBlob(null);
    };

    const removeItem = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setResultBlob(null);
    };

    const handleConvert = async () => {
        if (imageFiles.length === 0) return;
        setProcessing(true);
        try {
            const settings = { pageSize, orientation, margin };
            const blob = await convertImagesToPDF(imageFiles, settings);
            setResultBlob(blob);
            addHistoryEntry(`images_${Date.now()}.pdf`, 'Images to PDF', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error converting images to PDF. Please try again.');
            addHistoryEntry('Images to PDF Operation', 'Images to PDF', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `images_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(resultBlob, fileName);
        }
    };

    const sizeOptions = [
        { key: 'fit', text: 'Fit Page to Image Size', value: 'fit' },
        { key: 'a4', text: 'A4 Page Size', value: 'a4' },
        { key: 'letter', text: 'US Letter Page Size', value: 'letter' }
    ];

    const orientationOptions = [
        { key: 'portrait', text: 'Portrait', value: 'portrait' },
        { key: 'landscape', text: 'Landscape', value: 'landscape' },
        { key: 'auto', text: 'Auto (Match Image Orientation)', value: 'auto' }
    ];

    const marginOptions = [
        { key: 'none', text: 'No Margin', value: 'none' },
        { key: 'small', text: 'Small Margin', value: 'small' },
        { key: 'large', text: 'Large Margin', value: 'large' }
    ];

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                <Icon name='images outline' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Images to PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Convert and merge multiple JPG, PNG, and WebP images into a single PDF file.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='image outline' size='large' style={{ marginBottom: '10px' }} />
                <p>Drag & drop image files here, or click to browse</p>
            </div>

            {imageFiles.length > 0 && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', fontWeight: 'bold' }}>
                        Image Order & Layout ({imageFiles.length} Selected):
                    </label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px' }}>
                        <List divided verticalAlign='middle' style={{ width: '100%', margin: 0 }}>
                            {imageFiles.map((file, idx) => (
                                <List.Item key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '60%', overflow: 'hidden' }}>
                                        <ImageThumbnail file={file} />
                                        <span style={{ color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.85rem' }}>{file.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <Button 
                                            icon='arrow up' 
                                            size='mini' 
                                            color='black' 
                                            disabled={idx === 0} 
                                            onClick={() => moveItem(idx, -1)} 
                                            aria-label="Move image up"
                                        />
                                        <Button 
                                            icon='arrow down' 
                                            size='mini' 
                                            color='black' 
                                            disabled={idx === imageFiles.length - 1} 
                                            onClick={() => moveItem(idx, 1)} 
                                            aria-label="Move image down"
                                        />
                                        <Button 
                                            icon='trash' 
                                            size='mini' 
                                            color='red' 
                                            onClick={() => removeItem(idx)} 
                                            aria-label="Remove image"
                                        />
                                    </div>
                                </List.Item>
                            ))}
                        </List>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Page Size:</label>
                            <Dropdown
                                fluid
                                selection
                                options={sizeOptions}
                                value={pageSize}
                                onChange={(e, { value }) => { setPageSize(value); setResultBlob(null); }}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Orientation:</label>
                            <Dropdown
                                fluid
                                selection
                                options={orientationOptions}
                                value={orientation}
                                disabled={pageSize === 'fit'}
                                onChange={(e, { value }) => { setOrientation(value); setResultBlob(null); }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Margin:</label>
                        <Dropdown
                            fluid
                            selection
                            options={marginOptions}
                            value={margin}
                            onChange={(e, { value }) => { setMargin(value); setResultBlob(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleConvert} 
                    loading={processing} 
                    disabled={imageFiles.length === 0}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}
                >
                    Convert to PDF
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `converted_images_${Date.now()}.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default ImagesToPdf;
