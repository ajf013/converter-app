import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertPDFToExcel } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfToExcel = () => {
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
            const blob = await convertPDFToExcel(file);
            setResultBlob(blob);
            addHistoryEntry(`${file.name.replace(/\.[^/.]+$/, '')}.xlsx`, 'PDF to Excel', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error converting PDF to Excel.');
            addHistoryEntry(file.name, 'PDF to Excel Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `spreadsheet_${Date.now()}.xlsx`;
        const shared = await shareFile(resultBlob, fileName, 'application/octet-stream');
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                <Icon name='file excel outline' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF to Excel</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Pull data straight from PDFs into Excel spreadsheets in a few short seconds.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {file ? <p style={{ color: 'white', fontWeight: '600' }}>{file.name}</p> : <p>Drag & drop PDF here, or click to browse</p>}
            </div>
            {file && (
                <FilePreview 
                    file={file} 
                    onRemove={() => {
                        setFile(null);
                        setResultBlob(null);
                    }} 
                />
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleConvert} 
                    loading={processing} 
                    disabled={!file}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white' }}
                >
                    Convert to Excel
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${file.name.replace(/\.[^/.]+$/, '')}.xlsx`)}>Download XLSX</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfToExcel;
