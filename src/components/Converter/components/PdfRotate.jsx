import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { rotatePDFPages } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfRotate = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [rotationAngle, setRotationAngle] = useState(90);
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

    const rotationOptions = [
        { key: 90, text: '90° Clockwise', value: 90 },
        { key: 180, text: '180° Flip', value: 180 },
        { key: 270, text: '270° Counter-Clockwise', value: 270 }
    ];

    const handleRotate = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        try {
            const blob = await rotatePDFPages(pdfFile, rotationAngle, pageRange);
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_rotated.pdf`, 'PDF Rotate', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error rotating PDF pages. Please check if the file is corrupted or protected.');
            addHistoryEntry(pdfFile.name, 'PDF Rotate Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `rotated_${Date.now()}.pdf`;
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <Icon name='redo' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Rotate PDF Pages</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Rotate specific pages or all pages in your PDF document.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', textAlign: 'left' }}>
                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Rotation Angle:
                        </label>
                        <Dropdown
                            placeholder='Select rotation angle'
                            fluid
                            selection
                            options={rotationOptions}
                            value={rotationAngle}
                            onChange={(e, { value }) => {
                                setRotationAngle(value);
                                setResultBlob(null);
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            Page Range:
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
                            Use 'all' to rotate all pages, or commas & hyphens for specific pages (e.g. 1-3, 5).
                        </span>
                    </div>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleRotate} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}
                >
                    Rotate Pages
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_rotated.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfRotate;
