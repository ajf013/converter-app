import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertPDFToWord } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfToWord = () => {
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
            const blob = await convertPDFToWord(file);
            setResultBlob(blob);
            addHistoryEntry(`${file.name.replace(/\.[^/.]+$/, '')}.doc`, 'PDF to Word', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error converting PDF to Word.');
            addHistoryEntry(file.name, 'PDF to Word Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `document_${Date.now()}.doc`;
        const shared = await shareFile(resultBlob, fileName, 'application/msword');
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #4299e1 0%, #2b6cb0 100%)' }}>
                <Icon name='file word outline' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF to Word</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Easily convert your PDF files into easy to edit DOC documents.
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
                    style={{ width: '100%', background: 'linear-gradient(135deg, #4299e1 0%, #2b6cb0 100%)', color: 'white' }}
                >
                    Convert to Word
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${file.name.replace(/\.[^/.]+$/, '')}.doc`)}>Download DOC</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfToWord;
