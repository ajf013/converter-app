import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Dropdown, Form } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { addHistoryEntry } from '../../../utils/historyUtils';

const qrTypeOptions = [
    { key: 'text', text: 'Text or URL', value: 'text' },
    { key: 'wifi', text: 'Wi-Fi Network', value: 'wifi' },
    { key: 'vcard', text: 'vCard Contact', value: 'vcard' }
];

const QrSuite = () => {
    const [activeSubTab, setActiveSubTab] = useState('generate'); // 'generate' or 'scan'
    
    // --- Generator State ---
    const [qrType, setQrType] = useState('text');
    const [textContent, setTextContent] = useState('');
    const [wifiSsid, setWifiSsid] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [wifiSecurity, setWifiSecurity] = useState('WPA');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [margin, setMargin] = useState(4);
    const [qrDataUrl, setQrDataUrl] = useState('');

    // --- Scanner State ---
    const [scanMethod, setScanMethod] = useState('file'); // 'file' or 'webcam'
    const [scanResult, setScanResult] = useState('');
    const [scanFile, setScanFile] = useState(null);
    
    // Webcam reference
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [webcamActive, setWebcamActive] = useState(false);
    const animationFrameRef = useRef(null);

    // Generate QR Code dynamically
    useEffect(() => {
        const generateQr = async () => {
            let payload = '';
            if (qrType === 'text') {
                payload = textContent;
            } else if (qrType === 'wifi') {
                // WIFI:S:SSID;T:WPA;P:PASSWORD;;
                payload = `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};;`;
            } else if (qrType === 'vcard') {
                payload = `BEGIN:VCARD\nVERSION:3.0\nN:${contactName}\nFN:${contactName}\nTEL:${contactPhone}\nEMAIL:${contactEmail}\nEND:VCARD`;
            }

            if (!payload.trim()) {
                Promise.resolve().then(() => setQrDataUrl(''));
                return;
            }

            try {
                const dataUrl = await QRCode.toDataURL(payload, {
                    color: {
                        dark: fgColor,
                        light: bgColor
                    },
                    margin: Number(margin),
                    width: 300
                });
                setQrDataUrl(dataUrl);
            } catch (err) {
                console.error('QR code generation failed:', err);
            }
        };

        generateQr();
    }, [qrType, textContent, wifiSsid, wifiPassword, wifiSecurity, contactName, contactPhone, contactEmail, fgColor, bgColor, margin]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        saveAs(qrDataUrl, `qrcode_${Date.now()}.png`);
        addHistoryEntry(`QR_Code_${qrType}.png`, 'QR Code Generation', 'Success');
    };

    // --- Scanner File Upload ---
    const onDropScanFile = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setScanFile(file);
            setScanResult('');
            const reader = new FileReader();
            reader.onload = (e) => {
                // Scan the image
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imgData = ctx.getImageData(0, 0, img.width, img.height);
                    const code = jsQR(imgData.data, imgData.width, imgData.height);
                    if (code) {
                        setScanResult(code.data);
                        addHistoryEntry(file.name, 'QR Code Scan (File)', 'Success');
                    } else {
                        setScanResult('Could not find a valid QR Code in this image.');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const { getRootProps: getScanRootProps, getInputProps: getScanInputProps, isDragActive: isDragScan } = useDropzone({
        onDrop: onDropScanFile,
        accept: { 'image/*': [] },
        multiple: false
    });

    // --- Webcam Scanning ---
    const startWebcam = async () => {
        setScanResult('');
        setWebcamActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', true); // critical for iOS
                videoRef.current.play();
                requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error('Camera access error:', err);
            alert('Unable to access camera. Please check permissions or upload an image.');
            setWebcamActive(false);
        }
    };

    const stopWebcam = () => {
        setWebcamActive(false);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            
            if (code) {
                setScanResult(code.data);
                addHistoryEntry('Camera Frame', 'QR Code Scan (Webcam)', 'Success');
                stopWebcam();
                return; // stop scanning on success
            }
        }
        if (webcamActive) {
            animationFrameRef.current = requestAnimationFrame(tick);
        }
    };

    useEffect(() => {
        return () => {
            stopWebcam();
        };
    }, [webcamActive]);

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)' }}>
                <Icon name='qrcode' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>QR Code Suite</SemanticHeader>
            
            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button 
                    active={activeSubTab === 'generate'} 
                    color={activeSubTab === 'generate' ? 'purple' : 'grey'}
                    onClick={() => { setActiveSubTab('generate'); stopWebcam(); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='pencil' /> Generate
                </Button>
                <Button 
                    active={activeSubTab === 'scan'} 
                    color={activeSubTab === 'scan' ? 'purple' : 'grey'}
                    onClick={() => { setActiveSubTab('scan'); }}
                    style={{ flex: 1 }}
                >
                    <Icon name='camera' /> Scan
                </Button>
            </div>

            {/* GENERATE VIEW */}
            {activeSubTab === 'generate' && (
                <div style={{ width: '100%' }}>
                    <Form style={{ textAlign: 'left' }}>
                        <Form.Field>
                            <label style={{ color: 'white' }}>Content Type</label>
                            <Dropdown 
                                selection 
                                options={qrTypeOptions} 
                                value={qrType} 
                                onChange={(_, { value }) => setQrType(value)} 
                            />
                        </Form.Field>

                        {qrType === 'text' && (
                            <Form.Field>
                                <label style={{ color: 'white' }}>Text / URL</label>
                                <Input 
                                    fluid 
                                    placeholder='Type text or paste link...' 
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                />
                            </Form.Field>
                        )}

                        {qrType === 'wifi' && (
                            <>
                                <Form.Field>
                                    <label style={{ color: 'white' }}>SSID (Network Name)</label>
                                    <Input 
                                        fluid 
                                        placeholder='My Wifi Network' 
                                        value={wifiSsid}
                                        onChange={(e) => setWifiSsid(e.target.value)}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <label style={{ color: 'white' }}>Password</label>
                                    <Input 
                                        fluid 
                                        type='password'
                                        placeholder='Network password' 
                                        value={wifiPassword}
                                        onChange={(e) => setWifiPassword(e.target.value)}
                                    />
                                </Form.Field>
                                <Form.Field style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ color: 'white', marginBottom: '8px' }}>Security</label>
                                    <Button.Group size='mini'>
                                        <Button active={wifiSecurity === 'WPA'} onClick={(e) => { e.preventDefault(); setWifiSecurity('WPA'); }}>WPA/WPA2</Button>
                                        <Button active={wifiSecurity === 'WEP'} onClick={(e) => { e.preventDefault(); setWifiSecurity('WEP'); }}>WEP</Button>
                                        <Button active={wifiSecurity === 'nopass'} onClick={(e) => { e.preventDefault(); setWifiSecurity('nopass'); }}>Unsecured</Button>
                                    </Button.Group>
                                </Form.Field>
                            </>
                        )}

                        {qrType === 'vcard' && (
                            <>
                                <Form.Field>
                                    <label style={{ color: 'white' }}>Full Name</label>
                                    <Input 
                                        fluid 
                                        placeholder='John Doe' 
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <label style={{ color: 'white' }}>Phone Number</label>
                                    <Input 
                                        fluid 
                                        placeholder='+1 (555) 019-2834' 
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                    />
                                </Form.Field>
                                <Form.Field>
                                    <label style={{ color: 'white' }}>Email Address</label>
                                    <Input 
                                        fluid 
                                        type='email'
                                        placeholder='john@example.com' 
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                    />
                                </Form.Field>
                            </>
                        )}

                        {/* Styling controls */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Foreground Color</label>
                                <input 
                                    type="color" 
                                    value={fgColor} 
                                    onChange={(e) => setFgColor(e.target.value)} 
                                    style={{ width: '100%', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Background Color</label>
                                <input 
                                    type="color" 
                                    value={bgColor} 
                                    onChange={(e) => setBgColor(e.target.value)} 
                                    style={{ width: '100%', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Margin Size</label>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="10" 
                                    value={margin} 
                                    onChange={(e) => setMargin(Math.max(0, Number(e.target.value)))} 
                                    fluid
                                />
                            </div>
                        </div>
                    </Form>

                    {qrDataUrl && (
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '15px', background: 'white', borderRadius: '15px', display: 'inline-flex', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                                <img src={qrDataUrl} alt="Generated QR Code" style={{ width: '160px', height: '160px' }} />
                            </div>
                            <Button 
                                color='purple' 
                                onClick={handleDownload}
                                style={{ width: '100%', background: 'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)', color: 'white' }}
                            >
                                <Icon name='download' /> Download QR Code
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* SCAN VIEW */}
            {activeSubTab === 'scan' && (
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <Button 
                            active={scanMethod === 'file'} 
                            color={scanMethod === 'file' ? 'violet' : 'grey'} 
                            size='mini'
                            onClick={() => { setScanMethod('file'); stopWebcam(); }}
                            style={{ flex: 1 }}
                        >
                            Upload File
                        </Button>
                        <Button 
                            active={scanMethod === 'webcam'} 
                            color={scanMethod === 'webcam' ? 'violet' : 'grey'} 
                            size='mini'
                            onClick={() => { setScanMethod('webcam'); startWebcam(); }}
                            style={{ flex: 1 }}
                        >
                            Use Camera
                        </Button>
                    </div>

                    {scanMethod === 'file' ? (
                        <div {...getScanRootProps()} className={`dropzone ${isDragScan ? 'active' : ''}`}>
                            <input {...getScanInputProps()} />
                            <Icon name='upload' size='large' style={{ marginBottom: '10px' }} />
                            {scanFile ? <p style={{ color: 'white', fontWeight: 'bold' }}>{scanFile.name}</p> : <p>Drop QR code image here, or browse</p>}
                        </div>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
                            <video 
                                ref={videoRef} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: '2px dashed #00dbde', borderRadius: '8px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#00dbde', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
                                    Align QR Code here
                                </span>
                            </div>
                        </div>
                    )}

                    {scanResult && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '15px', textAlign: 'left', marginTop: '15px' }}>
                            <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Decoded Result:</label>
                            <div style={{ wordBreak: 'break-all', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', minHeight: '40px', fontFamily: 'monospace' }}>
                                {scanResult}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <Button 
                                    size='mini' 
                                    color='teal' 
                                    onClick={() => navigator.clipboard.writeText(scanResult)}
                                    style={{ flex: 1 }}
                                >
                                    <Icon name='copy' /> Copy
                                </Button>
                                {scanResult.startsWith('http') && (
                                    <Button 
                                        size='mini' 
                                        color='blue' 
                                        onClick={() => window.open(scanResult, '_blank')}
                                        style={{ flex: 1 }}
                                    >
                                        <Icon name='external alternate' /> Open Link
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default QrSuite;
