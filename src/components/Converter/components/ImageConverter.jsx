import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';

const imageOptions = [
    { key: 'png', text: 'PNG', value: 'png' },
    { key: 'jpg', text: 'JPG', value: 'jpg' },
    { key: 'webp', text: 'WEBP', value: 'webp' },
    { key: 'gif', text: 'GIF', value: 'gif' },
    { key: 'bmp', text: 'BMP', value: 'bmp' },
];

const ImageConverter = () => {
    const [imageFile, setImageFile] = useState(null);
    const [imageFormat, setImageFormat] = useState('png');
    const [convertingImg, setConvertingImg] = useState(false);
    const [convertedImg, setConvertedImg] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(imageFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    const onDropImage = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setImageFile(acceptedFiles[0]);
            setConvertedImg(null);
        }
    }, []);

    const { getRootProps: getImgRoot, getInputProps: getImgInput, isDragActive: isDragImg } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/*': [] }
    });

    const handleConvertImage = async () => {
        if (!imageFile) return;
        setConvertingImg(true);
        try {
            const blob = await convertImage(imageFile, imageFormat);
            setConvertedImg(blob);
        } catch (err) {
            console.error(err);
            alert('Error converting image');
        } finally {
            setConvertingImg(false);
        }
    };

    const handleShare = async () => {
        if (!convertedImg) return;
        const shared = await shareFile(convertedImg, `image.${imageFormat}`, `image/${imageFormat}`);
        if (!shared) {
            saveAs(convertedImg, `image.${imageFormat}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper">
                <Icon name='image' size='huge' />
            </div>
            <SemanticHeader as='h2'>Image Converter</SemanticHeader>
            
            <div {...getImgRoot()} className={`dropzone ${isDragImg ? 'active' : ''}`}>
                <input {...getImgInput()} />
                {imageFile ? <p>{imageFile.name}</p> : <p>Drag & Drop Image</p>}
            </div>

            {previewUrl && (
                <div style={{ margin: '0 0 20px 0', width: '100%', maxHeight: '150px', overflow: 'hidden', borderRadius: '10px', display: 'flex', justifyContent: 'center' }}>
                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                </div>
            )}

            <div className="controls">
                <Dropdown selection options={imageOptions} value={imageFormat} onChange={(_, { value }) => setImageFormat(value)} />
                <Button primary onClick={handleConvertImage} loading={convertingImg} disabled={!imageFile}>Convert</Button>
            </div>

            {convertedImg && (
                <div className="result-area">
                    <Icon name="check circle" color="green" />
                    <Button color="green" size="small" onClick={() => saveAs(convertedImg, `image.${imageFormat}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default ImageConverter;
