import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Progress } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { compressPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfCompress = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [level, setLevel] = useState('recommended'); // 'extreme', 'recommended', 'less'
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

    const handleCompress = async () => {
        if (!pdfFile) return;
        setProcessing(true);
        setProgress(0);

        let quality = 0.5;
        let scale = 1.0;

        if (level === 'extreme') {
            quality = 0.2;
            scale = 0.7;
        } else if (level === 'less') {
            quality = 0.85;
            scale = 1.3;
        }

        try {
            const blob = await compressPDF(pdfFile, quality, scale, (p) => setProgress(p));
            setResultBlob(blob);
            addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_compressed.pdf`, 'PDF Compress', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error compressing PDF. Make sure the file is not protected.');
            addHistoryEntry(pdfFile.name, 'PDF Compress Operation', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `compressed_${Date.now()}.pdf`;
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
            style={{ maxWidth: '520px' }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #abecd6 0%, #fbed96 100%)' }}>
                <Icon name='compress' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Compress PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Reduce PDF file size by compressing and downscaling embedded image pages.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            {pdfFile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <label style={{ color: 'white', fontSize: '0.85rem', textAlign: 'left', fontWeight: 'bold' }}>
                        Compression Level:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Button 
                            active={level === 'extreme'} 
                            color={level === 'extreme' ? 'orange' : 'grey'}
                            onClick={() => { setLevel('extreme'); setResultBlob(null); }}
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', margin: 0 }}
                        >
                            <span>Extreme Compression</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Smaller size, lower quality</span>
                        </Button>
                        <Button 
                            active={level === 'recommended'} 
                            color={level === 'recommended' ? 'teal' : 'grey'}
                            onClick={() => { setLevel('recommended'); setResultBlob(null); }}
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', margin: 0 }}
                        >
                            <span>Recommended Compression</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Good size, standard quality</span>
                        </Button>
                        <Button 
                            active={level === 'less'} 
                            color={level === 'less' ? 'blue' : 'grey'}
                            onClick={() => { setLevel('less'); setResultBlob(null); }}
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', margin: 0 }}
                        >
                            <span>Less Compression</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>High size, maximum quality</span>
                        </Button>
                    </div>
                </div>
            )}

            {processing && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <Progress percent={progress} indicating progress style={{ margin: 0, background: 'rgba(255,255,255,0.1)' }} color="teal" size="small" />
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>Compressing: {progress}%</span>
                </div>
            )}

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleCompress} 
                    loading={processing} 
                    disabled={!pdfFile}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #abecd6 0%, #fbed96 100%)', color: 'white' }}
                >
                    Compress PDF
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_compressed.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfCompress;
