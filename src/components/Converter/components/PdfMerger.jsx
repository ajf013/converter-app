import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, List } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { mergePDFs } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfMerger = () => {
    const [pdfFiles, setPdfFiles] = useState([]);
    const [merging, setMerging] = useState(false);
    const [mergedBlob, setMergedBlob] = useState(null);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFiles(prev => [...prev, ...acceptedFiles]);
            setMergedBlob(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] }
    });

    const moveItem = (index, direction) => {
        const newFiles = [...pdfFiles];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= pdfFiles.length) return;
        const temp = newFiles[index];
        newFiles[index] = newFiles[targetIndex];
        newFiles[targetIndex] = temp;
        setPdfFiles(newFiles);
        setMergedBlob(null);
    };

    const removeItem = (index) => {
        setPdfFiles(prev => prev.filter((_, i) => i !== index));
        setMergedBlob(null);
    };

    const handleMerge = async () => {
        if (pdfFiles.length < 2) return;
        setMerging(true);
        try {
            const blob = await mergePDFs(pdfFiles);
            setMergedBlob(blob);
            addHistoryEntry(`Merged_${pdfFiles.length}_PDFs.pdf`, 'PDF Merge', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error merging PDFs. Please check if any file is corrupted or protected.');
            addHistoryEntry('PDF Merge Operation', 'PDF Merge', 'Failed');
        } finally {
            setMerging(false);
        }
    };

    const handleShare = async () => {
        if (!mergedBlob) return;
        const fileName = `merged_${Date.now()}.pdf`;
        const shared = await shareFile(mergedBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(mergedBlob, fileName);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' }}>
                <Icon name='object group' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF Merger</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Combine multiple PDF files into a single document.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                <p>Drag & drop PDF files here, or click to browse</p>
            </div>

            {pdfFiles.length > 0 && (
                <div style={{ width: '100%', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px' }}>
                    <List divided verticalAlign='middle' style={{ width: '100%' }}>
                        {pdfFiles.map((file, idx) => (
                            <List.Item key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '60%', overflow: 'hidden' }}>
                                    <Icon name='file pdf' color='red' />
                                    <span style={{ color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.9rem' }}>{file.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <Button 
                                        icon='arrow up' 
                                        size='mini' 
                                        color='black' 
                                        disabled={idx === 0} 
                                        onClick={() => moveItem(idx, -1)} 
                                        aria-label="Move item up"
                                    />
                                    <Button 
                                        icon='arrow down' 
                                        size='mini' 
                                        color='black' 
                                        disabled={idx === pdfFiles.length - 1} 
                                        onClick={() => moveItem(idx, 1)} 
                                        aria-label="Move item down"
                                    />
                                    <Button 
                                        icon='trash' 
                                        size='mini' 
                                        color='red' 
                                        onClick={() => removeItem(idx)} 
                                        aria-label="Remove item"
                                    />
                                </div>
                            </List.Item>
                        ))}
                    </List>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    color='teal'
                    onClick={handleMerge} 
                    loading={merging} 
                    disabled={pdfFiles.length < 2}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)', color: 'white' }}
                >
                    Merge {pdfFiles.length} PDFs
                </Button>
            </div>

            {mergedBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(mergedBlob, `merged_${Date.now()}.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfMerger;
