import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Progress } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { renderPDFPagesToImages, createZipArchive } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfToJpg = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setPdfFile(acceptedFiles[0]);
            setResultBlob(null);
            setProgress(0);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const handleConvertToJpg = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        setProgress(0);
        try {
            const images = await renderPDFPagesToImages(pdfFile, (p) => setProgress(p));
            const zipBlob = await createZipArchive(images);
            setResultBlob(zipBlob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_images.zip`, 'PDF to JPG (ZIP)', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error rendering PDF to JPG. Make sure the file is not protected.');
            addHistoryEntry(pdfFile.name, 'PDF to JPG Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `images_${Date.now()}.zip`;
        const shared = await shareFile(resultBlob, fileName, 'application/zip');
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
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
                <Icon name='file image' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF to JPG</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Render pages of your PDF document into high-quality JPEG images packaged in a ZIP file.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            {processing && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <Progress percent={progress} indicating progress style={{ margin: 0, background: 'rgba(255,255,255,0.1)' }} color="teal" size="small" />
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>Rendering pages: {progress}%</span>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleConvertToJpg} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', color: 'white' }}
                >
                    Convert to JPG
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_images.zip`)}>Download ZIP</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfToJpg;
