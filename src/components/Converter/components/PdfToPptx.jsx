import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertPDFToPptx } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfToPptx = () => {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setFile(acceptedFiles[0]);
            setResultBlob(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const handleConvert = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const blob = await convertPDFToPptx(file);
            setResultBlob(blob);
            addHistoryEntry(`${file.name.replace(/\.[^/.]+$/, '')}_presentation_outline.txt`, 'PDF to PowerPoint Outline', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error converting PDF to PPTX outlines.');
            addHistoryEntry(file.name, 'PDF to PPTX Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `presentation_${Date.now()}.txt`;
        const shared = await shareFile(resultBlob, fileName, 'text/plain');
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
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ff851b 0%, #dd4b39 100%)' }}>
                <Icon name='file powerpoint outline' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF to PowerPoint</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Turn your PDF files into easy to view PPT slide outline presentations.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {file ? <p style={{ color: 'white', fontWeight: '600' }}>{file.name}</p> : <p>Drag & drop PDF here, or click to browse</p>}
            </div>

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleConvert} 
                    loading={processing} 
                    disabled={!file}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #ff851b 0%, #dd4b39 100%)', color: 'white' }}
                >
                    Convert to PPTX Outline
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${file.name.replace(/\.[^/.]+$/, '')}_presentation.txt`)}>Download TXT</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfToPptx;
