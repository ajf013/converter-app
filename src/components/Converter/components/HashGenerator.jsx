import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Input, Form } from 'semantic-ui-react';
import { motion } from 'framer-motion';
import { addHistoryEntry } from '../../../utils/historyUtils';

// Pure JS MD5 implementation for client-side MD5 hashing without external heavy dependencies
function md5Cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364409);
    d = hh(d, a, b, c, k[12], 11, -375361820);
    c = hh(c, d, a, b, k[15], 16, 955359068);
    b = hh(b, c, d, a, k[2], 23, -403980369);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894980757);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[1], 21, 1309151649);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
}

function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
}
function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

function md51(bytes) {
    const n = bytes.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= bytes.length; i += 64) {
        md5cycle(state, md5blk(bytes.subarray(i - 64, i)));
    }
    const tail = bytes.subarray(i - 64);
    let tmp = new Uint8Array(64);
    tmp.set(tail);
    tmp[tail.length] = 0x80;
    if (tail.length >= 56) {
        md5cycle(state, md5blk(tmp));
        tmp.fill(0);
    }
    let bits = n * 8;
    tmp[56] = bits & 0xff;
    tmp[57] = (bits >>> 8) & 0xff;
    tmp[58] = (bits >>> 16) & 0xff;
    tmp[59] = (bits >>> 24) & 0xff;
    md5cycle(state, md5blk(tmp));
    return state;
}

function md5blk(s) {
    let md5blks = [];
    for (let i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s[i] + (s[i + 1] << 8) + (s[i + 2] << 16) + (s[i + 3] << 24);
    }
    return md5blks;
}

function rhex(n) {
    const hex_chr = '0123456789abcdef';
    let s = '';
    for (let j = 0; j < 4; j++) {
        s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0f) + hex_chr.charAt((n >> (j * 8)) & 0x0f);
    }
    return s;
}

function add32(x, y) {
    return (x + y) & 0xffffffff;
}

function calculateMD5(buffer) {
    const bytes = new Uint8Array(buffer);
    const state = md51(bytes);
    return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
}

const HashGenerator = () => {
    const [mode, setMode] = useState('text'); // 'text' or 'file'
    const [inputText, setInputText] = useState('');
    const [inputFile, setInputFile] = useState(null);
    const [expectedHash, setExpectedHash] = useState('');
    const [computing, setComputing] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    const [hashes, setHashes] = useState({
        sha256: '',
        sha512: '',
        sha1: '',
        md5: ''
    });

    const onDropFile = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            setInputFile(acceptedFiles[0]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropFile,
        multiple: false
    });

    const computeHashes = async (arrayBuffer, sourceName) => {
        setComputing(true);
        try {
            const sha256Buffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const sha512Buffer = await crypto.subtle.digest('SHA-512', arrayBuffer);
            const sha1Buffer = await crypto.subtle.digest('SHA-1', arrayBuffer);

            const bufferToHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

            const sha256Hex = bufferToHex(sha256Buffer);
            const sha512Hex = bufferToHex(sha512Buffer);
            const sha1Hex = bufferToHex(sha1Buffer);
            const md5Hex = calculateMD5(arrayBuffer);

            setHashes({
                sha256: sha256Hex,
                sha512: sha512Hex,
                sha1: sha1Hex,
                md5: md5Hex
            });

            addHistoryEntry(sourceName, 'Hash Checksum Calculation', 'Success');
        } catch (err) {
            console.error(err);
            alert('Failed to compute hashes.');
        } finally {
            setComputing(false);
        }
    };

    useEffect(() => {
        if (mode === 'text') {
            if (!inputText.trim()) {
                setHashes({ sha256: '', sha512: '', sha1: '', md5: '' });
                return;
            }
            const encoder = new TextEncoder();
            const data = encoder.encode(inputText);
            computeHashes(data.buffer, 'Text input');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputText, mode]);

    useEffect(() => {
        if (mode === 'file' && inputFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                computeHashes(e.target.result, inputFile.name);
            };
            reader.readAsArrayBuffer(inputFile);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputFile, mode]);

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const cleanInputFile = () => {
        setInputFile(null);
        setHashes({ sha256: '', sha512: '', sha1: '', md5: '' });
    };

    const isMatched = expectedHash.trim() && Object.values(hashes).some(h => h && h.toLowerCase() === expectedHash.trim().toLowerCase());

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)' }}>
                <Icon name='shield' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>File & Text Hash Checksum</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Generate instant cryptographic checksums (SHA-256, SHA-512, SHA-1, MD5) for text or any file.
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button
                    fluid
                    active={mode === 'text'}
                    onClick={() => setMode('text')}
                    color={mode === 'text' ? 'purple' : 'grey'}
                >
                    Text String
                </Button>
                <Button
                    fluid
                    active={mode === 'file'}
                    onClick={() => setMode('file')}
                    color={mode === 'file' ? 'purple' : 'grey'}
                >
                    File Hash
                </Button>
            </div>

            {mode === 'text' ? (
                <Form style={{ width: '100%', marginBottom: '20px' }}>
                    <Form.TextArea
                        rows={3}
                        placeholder="Type or paste text string here to compute hash..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderRadius: '12px'
                        }}
                    />
                </Form>
            ) : (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                        <input {...getInputProps()} />
                        <Icon name='file outline' size='large' style={{ marginBottom: '10px' }} />
                        {inputFile ? (
                            <p style={{ color: 'white', fontWeight: 'bold' }}>{inputFile.name} ({(inputFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                        ) : (
                            <p>Drag & drop any file here to compute hash, or click to browse</p>
                        )}
                    </div>
                    {inputFile && (
                        <Button color='red' size='mini' onClick={cleanInputFile} style={{ marginTop: '5px' }}>
                            Clear Selected File
                        </Button>
                    )}
                </div>
            )}

            {/* Hash Results Output */}
            {(hashes.sha256 || computing) && (
                <div style={{ width: '100%', textAlign: 'left', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>Calculated Hashes</span>
                        {computing && <Icon name='spinner' loading style={{ color: '#8e2de2' }} />}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                            { key: 'sha256', label: 'SHA-256', val: hashes.sha256 },
                            { key: 'sha512', label: 'SHA-512', val: hashes.sha512 },
                            { key: 'sha1', label: 'SHA-1', val: hashes.sha1 },
                            { key: 'md5', label: 'MD5', val: hashes.md5 },
                        ].map((item) => (
                            <div key={item.key} style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.label}</span>
                                    <Button
                                        size='mini'
                                        color={copiedKey === item.key ? 'teal' : 'grey'}
                                        onClick={() => copyToClipboard(item.val, item.key)}
                                        disabled={!item.val}
                                        aria-label={`Copy ${item.label}`}
                                    >
                                        <Icon name={copiedKey === item.key ? 'check' : 'copy'} />
                                        {copiedKey === item.key ? 'Copied' : 'Copy'}
                                    </Button>
                                </div>
                                <div style={{
                                    color: '#f8fafc',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    wordBreak: 'break-all',
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '6px 8px',
                                    borderRadius: '4px'
                                }}>
                                    {item.val || 'Calculating...'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Checksum Matcher Section */}
            <div style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '14px',
                textAlign: 'left',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <label style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    Compare with Expected Checksum:
                </label>
                <Input
                    fluid
                    placeholder="Paste expected hash to verify match..."
                    value={expectedHash}
                    onChange={(e) => setExpectedHash(e.target.value)}
                    style={{ marginBottom: '8px' }}
                />

                {expectedHash.trim() && (
                    <div style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isMatched ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isMatched ? '#4ade80' : '#f87171',
                        border: `1px solid ${isMatched ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        <Icon name={isMatched ? 'check circle' : 'exclamation circle'} />
                        {isMatched ? 'Checksum Verified! Matches computed hash.' : 'Checksum Mismatch! Hash does not match calculated values.'}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default HashGenerator;
