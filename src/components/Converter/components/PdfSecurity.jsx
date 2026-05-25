import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { encryptPDFFile, decryptPDFFile } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const PdfSecurity = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [mode, setMode] = useState('encrypt'); // 'encrypt' or 'decrypt'
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

    const handleProcess = async () => {
        if (!pdfFile || !password) return;
        setProcessing(true);
        setResultBlob(null);
        try {
            let blob;
            if (mode === 'encrypt') {
                blob = await encryptPDFFile(pdfFile, password);
                setResultBlob(blob);
                addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_protected.pdf`, 'PDF Encrypt', 'Success');
            } else {
                blob = await decryptPDFFile(pdfFile, password);
                setResultBlob(blob);
                addHistoryEntry(`${pdfFile.name.replace(/\.pdf$/i, '')}_unlocked.pdf`, 'PDF Decrypt', 'Success');
            }
        } catch (err) {
            console.error(err);
            if (mode === 'decrypt') {
                alert('Failed to decrypt. The password might be incorrect, or the file is not encrypted.');
            } else {
                alert('Failed to encrypt PDF.');
            }
            addHistoryEntry(pdfFile.name, mode === 'encrypt' ? 'PDF Encrypt' : 'PDF Decrypt', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const nameSuffix = mode === 'encrypt' ? 'secured' : 'unlocked';
        const fileName = `${pdfFile.name.replace(/\.pdf$/i, '')}_${nameSuffix}.pdf`;
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
                <Icon name='shield alternate' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>PDF Security</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Add password protection or unlock encrypted PDF files.
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button 
                    active={mode === 'encrypt'}
                    color={mode === 'encrypt' ? 'green' : 'grey'}
                    onClick={() => { setMode('encrypt'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='lock' /> Lock (Encrypt)
                </Button>
                <Button 
                    active={mode === 'decrypt'}
                    color={mode === 'decrypt' ? 'green' : 'grey'}
                    onClick={() => { setMode('decrypt'); setResultBlob(null); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='unlock' /> Unlock (Decrypt)
                </Button>
            </div>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='file pdf outline' size='large' style={{ marginBottom: '10px' }} />
                {pdfFile ? <p style={{ color: 'white', fontWeight: '600' }}>{pdfFile.name}</p> : <p>Drag & drop a PDF file here, or click to browse</p>}
            </div>

            <div style={{ width: '100%', marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Password:
                </label>
                <Input 
                    fluid
                    type={showPassword ? 'text' : 'password'}
                    value={password} 
                    placeholder="Enter password..." 
                    onChange={(e) => setPassword(e.target.value)}
                    icon={
                        <Icon 
                            name={showPassword ? 'eye slash' : 'eye'} 
                            link 
                            onClick={() => setShowPassword(!showPassword)} 
                        />
                    }
                />
            </div>

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleProcess} 
                    loading={processing} 
                    disabled={!pdfFile || !password}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}
                >
                    {mode === 'encrypt' ? 'Encrypt & Download' : 'Decrypt & Download'}
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `${pdfFile.name.replace(/\.pdf$/i, '')}_${mode === 'encrypt' ? 'secured' : 'unlocked'}.pdf`)}>
                        Download PDF
                    </Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default PdfSecurity;
