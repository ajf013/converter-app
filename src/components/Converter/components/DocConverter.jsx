import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertSpreadsheet, convertDocument } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';

const docOptions = [
    { key: 'pdf', text: 'PDF', value: 'pdf' },
    { key: 'txt', text: 'TXT', value: 'txt' },
    { key: 'csv', text: 'CSV', value: 'csv' },
    { key: 'json', text: 'JSON', value: 'json' },
];

const DocConverter = () => {
    const [docFile, setDocFile] = useState(null);
    const [docFormat, setDocFormat] = useState('pdf');
    const [convertingDoc, setConvertingDoc] = useState(false);
    const [convertedDoc, setConvertedDoc] = useState(null);
    const [availableDocFormats, setAvailableDocFormats] = useState(docOptions);

    const onDropDoc = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setDocFile(file);
            setConvertedDoc(null);

            const name = file.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                setAvailableDocFormats([
                    { key: 'csv', text: 'CSV', value: 'csv' },
                    { key: 'json', text: 'JSON', value: 'json' },
                    { key: 'html', text: 'HTML', value: 'html' },
                    { key: 'txt', text: 'TXT', value: 'txt' }
                ]);
                setDocFormat('csv');
            } else if (name.endsWith('.docx') || name.endsWith('.txt')) {
                setAvailableDocFormats([
                    { key: 'pdf', text: 'PDF', value: 'pdf' },
                    { key: 'txt', text: 'TXT', value: 'txt' }
                ]);
                setDocFormat('pdf');
            } else {
                setAvailableDocFormats([
                    { key: 'pdf', text: 'PDF', value: 'pdf' }
                ]);
            }
        }
    }, []);

    const { getRootProps: getDocRoot, getInputProps: getDocInput, isDragActive: isDragDoc } = useDropzone({
        onDrop: onDropDoc,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        }
    });

    const handleConvertDoc = async () => {
        if (!docFile) return;
        setConvertingDoc(true);
        try {
            let blob;
            const name = docFile.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                blob = await convertSpreadsheet(docFile, docFormat);
            } else {
                blob = await convertDocument(docFile, docFormat);
            }
            setConvertedDoc(blob);
        } catch (err) {
            console.error(err);
            alert('Conversion failed: ' + err.message);
        } finally {
            setConvertingDoc(false);
        }
    };

    const handleShare = async () => {
        if (!convertedDoc) return;
        let mimeType = 'application/pdf';
        if (docFormat === 'txt') mimeType = 'text/plain';
        if (docFormat === 'csv') mimeType = 'text/csv';
        if (docFormat === 'json') mimeType = 'application/json';
        if (docFormat === 'html') mimeType = 'text/html';

        const shared = await shareFile(convertedDoc, `doc.${docFormat}`, mimeType);
        if (!shared) {
            saveAs(convertedDoc, `doc.${docFormat}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
        >
            <div className="icon-wrapper">
                <Icon name='file alternate' size='huge' />
            </div>
            <SemanticHeader as='h2'>Document Converter</SemanticHeader>
            <div {...getDocRoot()} className={`dropzone ${isDragDoc ? 'active' : ''}`}>
                <input {...getDocInput()} />
                {docFile ? <p>{docFile.name}</p> : <p>Drag & Drop Doc/XLS/PDF</p>}
            </div>
            <div className="controls">
                <Dropdown selection options={availableDocFormats} value={docFormat} onChange={(_, { value }) => setDocFormat(value)} />
                <Button primary onClick={handleConvertDoc} loading={convertingDoc} disabled={!docFile}>Convert</Button>
            </div>
            {convertedDoc && (
                <div className="result-area">
                    <Icon name="check circle" color="green" />
                    <Button color="green" size="small" onClick={() => saveAs(convertedDoc, `doc.${docFormat}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default DocConverter;
