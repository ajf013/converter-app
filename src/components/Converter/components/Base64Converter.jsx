import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Button, Header as SemanticHeader, Form, TextArea } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { addHistoryEntry } from '../../../utils/historyUtils';

const Base64Converter = () => {
    const [activeSubTab, setActiveSubTab] = useState('encode'); // 'encode' or 'decode'
    
    // --- Encode State ---
    const [encodeFile, setEncodeFile] = useState(null);
    const [encodedString, setEncodedString] = useState('');
    const [encoding, setEncoding] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- Decode State ---
    const [decodeInput, setDecodeInput] = useState('');
    const [decoding, setDecoding] = useState(false);

    const onDropEncode = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setEncodeFile(acceptedFiles[0]);
            setEncodedString('');
        }
    };

    const { getRootProps: getEncodeRoot, getInputProps: getEncodeInput, isDragActive: isDragEncode } = useDropzone({
        onDrop: onDropEncode,
        multiple: false
    });

    const handleEncode = () => {
        if (!encodeFile) return;
        setEncoding(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            setEncodedString(e.target.result);
            setEncoding(false);
            addHistoryEntry(encodeFile.name, 'Base64 Encode', 'Success');
        };
        reader.onerror = () => {
            alert('Failed to read file.');
            setEncoding(false);
            addHistoryEntry(encodeFile.name, 'Base64 Encode', 'Failed');
        };
        reader.readAsDataURL(encodeFile);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(encodedString);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleDecode = () => {
        if (!decodeInput.trim()) return;
        setDecoding(true);
        try {
            let base64Data = decodeInput.trim();
            let mimeType = 'application/octet-stream';
            let extension = 'bin';

            // Check if string contains Data URL scheme prefix
            const match = /^data:([^;]+);base64,(.*)$/.exec(base64Data);
            if (match) {
                mimeType = match[1];
                base64Data = match[2];
                // Resolve common extensions
                const extMatch = /\/([^;+]+)/.exec(mimeType);
                if (extMatch) {
                    extension = extMatch[1];
                    if (extension === 'jpeg') extension = 'jpg';
                    if (extension === 'svg+xml') extension = 'svg';
                    if (extension === 'plain') extension = 'txt';
                }
            }

            // Convert Base64 back to Blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const fileName = `decoded_file_${Date.now()}.${extension}`;
            saveAs(blob, fileName);
            addHistoryEntry(fileName, 'Base64 Decode', 'Success');
        } catch (err) {
            console.error(err);
            alert('Failed to decode Base64 string. Ensure you entered a valid base64 encoded sequence.');
            addHistoryEntry('Base64 Decode Operation', 'Base64 Decode', 'Failed');
        } finally {
            setDecoding(false);
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
                <Icon name='key' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Base64 Converter</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Encode files into Base64 URI strings or decode them back to binaries.
            </p>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button 
                    active={activeSubTab === 'encode'} 
                    color={activeSubTab === 'encode' ? 'green' : 'grey'}
                    onClick={() => setActiveSubTab('encode')}
                    style={{ flex: 1 }}
                >
                    <Icon name='chevron right' /> Encode (File to Text)
                </Button>
                <Button 
                    active={activeSubTab === 'decode'} 
                    color={activeSubTab === 'decode' ? 'green' : 'grey'}
                    onClick={() => setActiveSubTab('decode')}
                    style={{ flex: 1 }}
                >
                    <Icon name='chevron left' /> Decode (Text to File)
                </Button>
            </div>

            {/* ENCODE VIEW */}
            {activeSubTab === 'encode' && (
                <div style={{ width: '100%' }}>
                    <div {...getEncodeRoot()} className={`dropzone ${isDragEncode ? 'active' : ''}`}>
                        <input {...getEncodeInput()} />
                        <Icon name='file text outline' size='large' style={{ marginBottom: '10px' }} />
                        {encodeFile ? <p style={{ color: 'white', fontWeight: 'bold' }}>{encodeFile.name}</p> : <p>Drag & drop any file here, or browse</p>}
                    </div>
                    {encodeFile && (
                        <FilePreview 
                            file={encodeFile} 
                            onRemove={() => {
                                setEncodeFile(null);
                                setEncodedString('');
                            }} 
                        />
                    )}

                    <div className="controls">
                        <Button 
                            primary 
                            onClick={handleEncode} 
                            loading={encoding} 
                            disabled={!encodeFile}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}
                        >
                            Encode File
                        </Button>
                    </div>

                    {encodedString && (
                        <div style={{ marginTop: '20px', width: '100%' }}>
                            <Form>
                                <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '8px', textAlign: 'left', fontWeight: 'bold' }}>Base64 Data URI:</label>
                                <TextArea 
                                    readOnly 
                                    value={encodedString} 
                                    rows={4} 
                                    style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '0.85rem' }} 
                                />
                            </Form>
                            <Button 
                                color='teal' 
                                onClick={handleCopy} 
                                style={{ width: '100%', marginTop: '10px' }}
                            >
                                <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* DECODE VIEW */}
            {activeSubTab === 'decode' && (
                <div style={{ width: '100%' }}>
                    <Form style={{ textAlign: 'left', marginBottom: '20px' }}>
                        <Form.Field>
                            <label style={{ color: 'white' }}>Paste Base64 String or Data URI:</label>
                            <TextArea 
                                placeholder="Paste Base64 string here (e.g. data:image/png;base64,...)" 
                                value={decodeInput}
                                onChange={(e) => setDecodeInput(e.target.value)}
                                rows={5}
                                style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                        </Form.Field>
                    </Form>

                    <div className="controls">
                        <Button 
                            primary 
                            onClick={handleDecode} 
                            loading={decoding} 
                            disabled={!decodeInput.trim()}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}
                        >
                            Decode & Download File
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Base64Converter;
