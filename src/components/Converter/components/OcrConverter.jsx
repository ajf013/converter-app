import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Dropdown, Button, Header as SemanticHeader, Progress } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { shareFile } from '../../../utils/shareUtils';

const ocrOptions = [
    { key: 'auto', text: 'Auto Detect (Eng/Tam)', value: 'eng+tam' },
    { key: 'eng', text: 'English', value: 'eng' },
    { key: 'tam', text: 'Tamil', value: 'tam' },
];

const OcrConverter = () => {
    const [ocrFile, setOcrFile] = useState(null);
    const [ocrLang, setOcrLang] = useState('eng+tam');
    const [ocrText, setOcrText] = useState('');
    const [convertingOcr, setConvertingOcr] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);

    const onDropOcr = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setOcrFile(acceptedFiles[0]);
            setOcrText('');
            setOcrProgress(0);
        }
    }, []);

    const { getRootProps: getOcrRoot, getInputProps: getOcrInput, isDragActive: isDragOcr } = useDropzone({
        onDrop: onDropOcr,
        accept: { 'image/*': [] }
    });

    const handleConvertOCR = async () => {
        if (!ocrFile) return;
        setConvertingOcr(true);
        setOcrText('');
        setOcrProgress(0);
        try {
            const worker = await createWorker(ocrLang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.floor(m.progress * 100));
                    }
                }
            });
            const { data: { text } } = await worker.recognize(ocrFile);
            setOcrText(text);
            await worker.terminate();
        } catch (err) {
            console.error(err);
            alert('OCR Failed: ' + err.message);
        } finally {
            setConvertingOcr(false);
        }
    };

    const handleCopyText = () => {
        if (ocrText) {
            navigator.clipboard.writeText(ocrText);
            alert('Text copied to clipboard!');
        }
    };

    const handleDownloadText = () => {
        if (ocrText) {
            const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, 'extracted_text.txt');
        }
    };

    const handleShareText = async () => {
        if (ocrText) {
            const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
            const shared = await shareFile(blob, 'extracted_text.txt', 'text/plain');
            if (!shared) {
                handleDownloadText();
            }
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            <div className="icon-wrapper">
                <Icon name='file text' size='huge' />
            </div>
            <SemanticHeader as='h2'>Image to Text (OCR)</SemanticHeader>
            <div {...getOcrRoot()} className={`dropzone ${isDragOcr ? 'active' : ''}`}>
                <input {...getOcrInput()} />
                {ocrFile ? <p>{ocrFile.name}</p> : <p>Drag & Drop Image for OCR</p>}
            </div>
            {ocrFile && (
                <FilePreview 
                    file={ocrFile} 
                    onRemove={() => {
                        setOcrFile(null);
                        setOcrResult(null);
                    }} 
                />
            )}
            <div className="controls">
                <Dropdown selection options={ocrOptions} value={ocrLang} onChange={(_, { value }) => setOcrLang(value)} />
                <Button primary onClick={handleConvertOCR} loading={convertingOcr} disabled={!ocrFile}>Extract</Button>
            </div>
            {convertingOcr && <Progress percent={ocrProgress} indicating size='tiny' style={{ width: '100%', marginTop: '15px' }} />}
            {ocrText && (
                <div className="result-area ocr-result">
                    <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.9rem', marginBottom: '10px', width: '100%', wordBreak: 'break-word', color: 'var(--text-primary)' }}>{ocrText}</div>
                    <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                        <Button size='mini' onClick={handleCopyText}>Copy</Button>
                        <Button size='mini' color='green' onClick={handleDownloadText}>Download</Button>
                        <Button size='mini' color='blue' onClick={handleShareText}><Icon name="share alternate" /> Share</Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default OcrConverter;
