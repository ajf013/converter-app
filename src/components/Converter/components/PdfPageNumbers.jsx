import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { addPageNumbersToPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfPageNumbers = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [format, setFormat] = useState('page-of'); // 'single', 'page-of', 'simple'
    const [position, setPosition] = useState('bottom-center'); // 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'
    const [fontSize, setFontSize] = useState(10);
    const [fontColor, setFontColor] = useState('#888888');
    const [pageRange, setPageRange] = useState('all');
    
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const formatOptions = [
        { key: 'page-of', text: '"Page X of Y" (Recommended)', value: 'page-of' },
        { key: 'simple', text: '"Page X"', value: 'simple' },
        { key: 'single', text: 'Just the number ("X")', value: 'single' }
    ];

    const positionOptions = [
        { key: 'top-left', text: 'Top Left', value: 'top-left' },
        { key: 'top-center', text: 'Top Center', value: 'top-center' },
        { key: 'top-right', text: 'Top Right', value: 'top-right' },
        { key: 'bottom-left', text: 'Bottom Left', value: 'bottom-left' },
        { key: 'bottom-center', text: 'Bottom Center', value: 'bottom-center' },
        { key: 'bottom-right', text: 'Bottom Right', value: 'bottom-right' }
    ];

    const handleAddNumbers = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        try {
            const settings = { format, position, fontSize, fontColor, pageRange };
            const blob = await addPageNumbersToPDF(pdfFile, settings);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_numbered.pdf`, 'PDF Page Numbers', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error adding page numbers. Please make sure the PDF is not password protected.');
            addHistoryEntry(pdfFile.name, 'PDF Page Numbers Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `numbered_${Date.now()}.pdf`;
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)' }}>
                <Icon name='numbered list' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Add Page Numbers</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Add formatted page numbers easily to your PDF headers or footers.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Format Style:</label>
                            <Dropdown
                                fluid
                                selection
                                options={formatOptions}
                                value={format}
                                onChange={(e, { value }) => { setFormat(value); setResultBlob(null); }}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Position:</label>
                            <Dropdown
                                fluid
                                selection
                                options={positionOptions}
                                value={position}
                                onChange={(e, { value }) => { setPosition(value); setResultBlob(null); }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Font Size ({fontSize}pt):</label>
                            <input 
                                type="range" 
                                min="8" 
                                max="24" 
                                value={fontSize} 
                                onChange={(e) => { setFontSize(Number(e.target.value)); setResultBlob(null); }}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Text Color:</label>
                            <input 
                                type="color" 
                                value={fontColor} 
                                onChange={(e) => { setFontColor(e.target.value); setResultBlob(null); }}
                                style={{ width: '100%', height: '40px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '2px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Page Range:</label>
                        <Input 
                            fluid
                            value={pageRange} 
                            placeholder="e.g. 'all', '1, 3', '2-5'" 
                            onChange={(e) => { setPageRange(e.target.value); setResultBlob(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleAddNumbers} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #18b5ff 0%, #3a7bd5 100%)', color: 'white' }}
                >
                    Add Page Numbers
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_numbered.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfPageNumbers;
