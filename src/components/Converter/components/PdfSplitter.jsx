import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { splitPDF, createZipArchive } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfSplitter = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [pageRange, setPageRange] = useState('all');
    const [splitting, setSplitting] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);
    const [isZip, setIsZip] = useState(false);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
            setIsZip(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const handleSplit = async () => {
        if (!pdfFile) return;
        setSplitting(true);
        try {
            const result = await splitPDF(pdfFile, pageRange);
            if (Array.isArray(result)) {
                // If it is an array of split pages, package them into a ZIP archive
                const zipBlob = await createZipArchive(result);
                setResultBlob(zipBlob);
                setIsZip(true);
                addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_split_pages.zip`, 'PDF Split (ZIP)', 'Success');
            } else {
                setResultBlob(result);
                setIsZip(false);
                addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_extracted.pdf`, 'PDF Extract', 'Success');
            }
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error splitting PDF. Ensure you entered a valid page range.');
            addHistoryEntry(pdfFile.name, 'PDF Split Operation', 'Failed');
        } finally {
            setSplitting(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const extension = isZip ? 'zip' : 'pdf';
        const mimeType = isZip ? 'application/zip' : 'application/pdf';
        const fileName = `split_${Date.now()}.${extension}`;
        const shared = await shareFile(resultBlob, fileName, mimeType);
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)' }}>
                <Icon name='columns' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF Splitter</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Extract specific page ranges, or split all pages into separate files.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            <div style={{ width: '100%', marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Page Selection / Range:
                </label>
                <Input 
                    fluid
                    value={pageRange} 
                    placeholder="e.g. 'all', '1, 3', '2-5'" 
                    onChange={(e) => {
                        setPageRange(e.target.value);
                        setResultBlob(null);
                    }}
                />
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Use 'all' to split every page, or comma-separated numbers/ranges (e.g. 1-3, 5).
                </span>
            </div>

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleSplit} 
                    loading={splitting} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)' }}
                >
                    Split PDF
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `split_${Date.now()}.${isZip ? 'zip' : 'pdf'}`)}>
                        Download {isZip ? 'ZIP' : 'PDF'}
                    </Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfSplitter;
