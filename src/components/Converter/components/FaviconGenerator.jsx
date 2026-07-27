import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { createZipArchive } from '../../../utils/conversionUtils';
import { addHistoryEntry, getSettings } from '../../../utils/historyUtils';

const SIZES = [
    { name: 'favicon-16x16.png', width: 16, height: 16, label: '16x16 Favicon' },
    { name: 'favicon-32x32.png', width: 32, height: 32, label: '32x32 Favicon' },
    { name: 'favicon-48x48.png', width: 48, height: 48, label: '48x48 Favicon' },
    { name: 'apple-touch-icon.png', width: 180, height: 180, label: '180x180 Apple Touch' },
    { name: 'android-chrome-192x192.png', width: 192, height: 192, label: '192x192 PWA Icon' },
    { name: 'android-chrome-512x512.png', width: 512, height: 512, label: '512x512 PWA Icon' },
];

const FaviconGenerator = () => {
    const [sourceFile, setSourceFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [bgColor, setBgColor] = useState('transparent');
    const [generatedFavicons, setGeneratedFavicons] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [copiedHtml, setCopiedHtml] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setSourceFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setGeneratedFavicons([]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    const generateFavicons = async () => {
        if (!sourceFile || !previewUrl) return;
        setGenerating(true);

        try {
            const img = new Image();
            img.src = previewUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const favicons = [];

            for (const size of SIZES) {
                const canvas = document.createElement('canvas');
                canvas.width = size.width;
                canvas.height = size.height;
                const ctx = canvas.getContext('2d');

                if (bgColor && bgColor !== 'transparent') {
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, size.width, size.height);
                }

                ctx.drawImage(img, 0, 0, size.width, size.height);

                const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
                const url = URL.createObjectURL(blob);

                favicons.push({
                    ...size,
                    blob,
                    url
                });
            }

            // Generate site.webmanifest
            const manifestContent = JSON.stringify({
                name: "My App",
                short_name: "App",
                icons: [
                    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
                    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
                ],
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone"
            }, null, 2);

            const manifestBlob = new Blob([manifestContent], { type: 'application/json' });

            favicons.push({
                name: 'site.webmanifest',
                label: 'Web Manifest',
                blob: manifestBlob,
                url: null,
                isManifest: true
            });

            setGeneratedFavicons(favicons);
            addHistoryEntry(sourceFile.name, 'Favicon Package Generation', 'Success');

            const settings = getSettings();
            if (settings.autoDownload) {
                downloadZip(favicons);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to generate favicons.');
            addHistoryEntry(sourceFile.name, 'Favicon Generation', 'Failed');
        } finally {
            setGenerating(false);
        }
    };

    const downloadZip = async (itemsList = generatedFavicons) => {
        if (!itemsList.length) return;
        try {
            const filesForZip = itemsList.map(item => ({
                name: item.name,
                blob: item.blob
            }));

            const zipBlob = await createZipArchive(filesForZip);
            saveAs(zipBlob, `favicons_${Date.now()}.zip`);
        } catch (err) {
            console.error(err);
            alert('Failed to create ZIP package.');
        }
    };

    const htmlCodeSnippet = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">`;

    const copyHtmlCode = () => {
        navigator.clipboard.writeText(htmlCodeSnippet);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
    };

    const removeFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSourceFile(null);
        setPreviewUrl(null);
        setGeneratedFavicons([]);
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                <Icon name='window restore' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Favicon & App Icon Generator</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Generate all browser favicons, Apple Touch icons, and Web App manifests from any image.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Icon name='image outline' size='large' style={{ marginBottom: '10px' }} />
                {sourceFile ? (
                    <p style={{ color: 'white', fontWeight: 'bold' }}>{sourceFile.name}</p>
                ) : (
                    <p>Drag & drop source logo/image here, or click to browse</p>
                )}
            </div>

            {sourceFile && (
                <div style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px',
                    textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={previewUrl} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: '#333' }} />
                            <span style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem' }}>Source Preview</span>
                        </div>
                        <Button icon='close' circular size='mini' color='red' onClick={removeFile} aria-label="Remove image" />
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                        <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Background Fill (for transparent logos):</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button size='mini' active={bgColor === 'transparent'} onClick={() => setBgColor('transparent')} color={bgColor === 'transparent' ? 'teal' : 'grey'}>Transparent</Button>
                            <Button size='mini' active={bgColor === '#ffffff'} onClick={() => setBgColor('#ffffff')} color={bgColor === '#ffffff' ? 'teal' : 'grey'}>White</Button>
                            <Button size='mini' active={bgColor === '#090d16'} onClick={() => setBgColor('#090d16')} color={bgColor === '#090d16' ? 'teal' : 'grey'}>Dark</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="controls" style={{ width: '100%', marginBottom: '20px' }}>
                <Button
                    primary
                    fluid
                    onClick={generateFavicons}
                    loading={generating}
                    disabled={!sourceFile}
                    style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}
                >
                    Generate Favicons & Manifest
                </Button>
            </div>

            {generatedFavicons.length > 0 && (
                <div style={{ width: '100%', textAlign: 'left' }}>
                    <h4 style={{ color: 'white', marginBottom: '10px' }}>Generated Icons ({generatedFavicons.length - 1} Sizes)</h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: '10px',
                        marginBottom: '20px'
                    }}>
                        {generatedFavicons.filter(item => !item.isManifest).map((item) => (
                            <div key={item.name} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '10px',
                                borderRadius: '8px',
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <img src={item.url} alt={item.label} style={{ width: `${Math.min(item.width, 48)}px`, height: `${Math.min(item.height, 48)}px`, margin: '0 auto 8px', display: 'block', objectFit: 'contain' }} />
                                <div style={{ color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>{item.width}x{item.height}</div>
                                <Button
                                    icon='download'
                                    size='mini'
                                    color='green'
                                    onClick={() => saveAs(item.blob, item.name)}
                                    style={{ marginTop: '6px', padding: '4px 8px' }}
                                    aria-label={`Download ${item.name}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <Button color='green' fluid onClick={() => downloadZip()}>
                            <Icon name='file archive' /> Download Complete Package (ZIP)
                        </Button>
                    </div>

                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ color: '#38ef7d', fontSize: '0.8rem', fontWeight: 'bold' }}>HTML Link Tags</span>
                            <Button size='mini' color={copiedHtml ? 'teal' : 'blue'} onClick={copyHtmlCode}>
                                <Icon name={copiedHtml ? 'check' : 'copy'} /> {copiedHtml ? 'Copied!' : 'Copy Code'}
                            </Button>
                        </div>
                        <pre style={{ color: '#f8fafc', fontSize: '0.75rem', margin: 0, overflowX: 'auto', background: 'transparent' }}>
                            {htmlCodeSnippet}
                        </pre>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default FaviconGenerator;
