import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { organizePDFPages } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfOrganizer = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [pageOrder, setPageOrder] = useState('');
    const [pagesToDelete, setPagesToDelete] = useState('');
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
            setPageOrder('');
            setPagesToDelete('');
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const handleOrganize = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        try {
            const blob = await organizePDFPages(pdfFile, pageOrder, pagesToDelete);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_organized.pdf`, 'PDF Organize', 'Success');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error organizing PDF pages. Please verify your range inputs and make sure the file is not protected.');
            addHistoryEntry(pdfFile.name, 'PDF Organize Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `organized_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                <Icon name='block layout' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Organize PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Reorder or delete pages in your PDF document.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                            New Page Order (Optional):
                        </label>
                        <Input 
                            fluid
                            value={pageOrder} 
                            placeholder="e.g. '1, 3, 2' to swap page 2 & 3" 
                            onChange={(e) => {
                                setPageOrder(e.target.value);
                                setResultBlob(null);
                            }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                            Enter comma-separated page numbers in your preferred order. Leave blank to keep original order.
                        </span>
                    </div>

                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                            Pages to Delete (Optional):
                        </label>
                        <Input 
                            fluid
                            value={pagesToDelete} 
                            placeholder="e.g. '2', '1, 3', '4-6'" 
                            onChange={(e) => {
                                setPagesToDelete(e.target.value);
                                setResultBlob(null);
                            }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                            Specify pages/ranges to delete (e.g. page 2, or range 4-6). Deletion applies after reordering.
                        </span>
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleOrganize} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}
                >
                    Organize PDF Pages
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_organized.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfOrganizer;
