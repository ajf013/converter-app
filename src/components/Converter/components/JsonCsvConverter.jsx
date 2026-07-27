import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Button, Header as SemanticHeader, Dropdown, Form, Input } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { addHistoryEntry, getSettings } from '../../../utils/historyUtils';

const formatOptions = [
    { key: 'json_pretty', text: 'JSON (Pretty Formatted)', value: 'json_pretty' },
    { key: 'json_min', text: 'JSON (Minified)', value: 'json_min' },
    { key: 'csv', text: 'CSV Table', value: 'csv' },
    { key: 'sql', text: 'SQL INSERT Statements', value: 'sql' },
];

const JsonCsvConverter = () => {
    const [rawInput, setRawInput] = useState('');
    const [targetFormat, setTargetFormat] = useState('json_pretty');
    const [tableName, setTableName] = useState('users_table');
    const [convertedOutput, setConvertedOutput] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [copied, setCopied] = useState(false);

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                setRawInput(text);
                setErrorMsg(null);
                setConvertedOutput('');
            };
            reader.readAsText(file);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/json': ['.json'],
            'text/plain': ['.txt']
        },
        multiple: false
    });

    const parseInputToObjects = (text) => {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('Input is empty.');

        // Try JSON parse
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch (jsonErr) {
                // If JSON fails, fall back to CSV parser below
            }
        }

        // Try CSV parse with XLSX
        const workbook = XLSX.read(trimmed, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('Could not parse tabular data.');
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (!rows || rows.length === 0) throw new Error('No rows found in data.');
        return rows;
    };

    const handleConvert = () => {
        setErrorMsg(null);
        setConvertedOutput('');
        if (!rawInput.trim()) {
            setErrorMsg('Please enter data or drop a CSV/JSON file.');
            return;
        }

        try {
            const objectsArray = parseInputToObjects(rawInput);
            let result = '';

            if (targetFormat === 'json_pretty') {
                result = JSON.stringify(objectsArray, null, 2);
            } else if (targetFormat === 'json_min') {
                result = JSON.stringify(objectsArray);
            } else if (targetFormat === 'csv') {
                const ws = XLSX.utils.json_to_sheet(objectsArray);
                result = XLSX.utils.sheet_to_csv(ws);
            } else if (targetFormat === 'sql') {
                const cleanTable = (tableName || 'table_name').trim().replace(/[^a-zA-Z0-9_]/g, '');
                const sqlLines = objectsArray.map((row) => {
                    const keys = Object.keys(row).map(k => `\`${k.replace(/`/g, '')}\``).join(', ');
                    const vals = Object.values(row).map(v => {
                        if (v === null || v === undefined) return 'NULL';
                        if (typeof v === 'number') return v;
                        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                        return `'${String(v).replace(/'/g, "''")}'`;
                    }).join(', ');
                    return `INSERT INTO \`${cleanTable}\` (${keys}) VALUES (${vals});`;
                });
                result = sqlLines.join('\n');
            }

            setConvertedOutput(result);
            addHistoryEntry('Data Suite Conversion', 'JSON/CSV/SQL Data', 'Success');

            const settings = getSettings();
            if (settings.autoDownload) {
                downloadFile(result);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Parse Error: ' + err.message);
            addHistoryEntry('Data Suite Conversion', 'JSON/CSV/SQL Data', 'Failed');
        }
    };

    const downloadFile = (data = convertedOutput) => {
        if (!data) return;
        let ext = 'txt';
        let mime = 'text/plain';
        if (targetFormat.startsWith('json')) {
            ext = 'json';
            mime = 'application/json';
        } else if (targetFormat === 'csv') {
            ext = 'csv';
            mime = 'text/csv';
        } else if (targetFormat === 'sql') {
            ext = 'sql';
            mime = 'application/sql';
        }

        const blob = new Blob([data], { type: mime });
        saveAs(blob, `converted_data_${Date.now()}.${ext}`);
    };

    const copyToClipboard = () => {
        if (!convertedOutput) return;
        navigator.clipboard.writeText(convertedOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)' }}>
                <Icon name='database' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>JSON / CSV / SQL Data Suite</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Convert, beautify, and validate between JSON, CSV spreadsheet tables, and SQL INSERT scripts.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: '20px 15px', marginBottom: '15px' }}>
                <input {...getInputProps()} />
                <Icon name='file text outline' size='medium' style={{ marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Drag & drop CSV / JSON file here, or click to browse</p>
            </div>

            {/* Manual Code Input Area */}
            <Form style={{ width: '100%', marginBottom: '15px' }}>
                <Form.TextArea
                    rows={4}
                    placeholder="Or paste JSON or CSV text data directly here..."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem'
                    }}
                />
            </Form>

            {/* Target Options & Table Name */}
            <div style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '15px',
                textAlign: 'left',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <label style={{ color: 'white', fontSize: '0.85rem', margin: 0 }}>Target Format:</label>
                    <Dropdown
                        selection
                        options={formatOptions}
                        value={targetFormat}
                        onChange={(_, { value }) => setTargetFormat(value)}
                        style={{ minWidth: '190px' }}
                    />
                </div>

                {targetFormat === 'sql' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <label style={{ color: 'white', fontSize: '0.85rem', margin: 0 }}>SQL Table Name:</label>
                        <Input
                            placeholder="users_table"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            style={{ minWidth: '190px' }}
                        />
                    </div>
                )}
            </div>

            <div className="controls" style={{ width: '100%', marginBottom: '15px' }}>
                <Button
                    primary
                    fluid
                    onClick={handleConvert}
                    style={{ background: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', color: 'white' }}
                >
                    Convert & Format Data
                </Button>
            </div>

            {errorMsg && (
                <div style={{
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '0.85rem',
                    marginBottom: '15px'
                }}>
                    <Icon name='exclamation circle' /> {errorMsg}
                </div>
            )}

            {/* Converted Result Viewer */}
            {convertedOutput && (
                <div style={{ width: '100%', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold' }}>Output Result</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <Button size='mini' color={copied ? 'teal' : 'blue'} onClick={copyToClipboard}>
                                <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button size='mini' color='green' onClick={() => downloadFile()}>
                                <Icon name='download' /> Download
                            </Button>
                        </div>
                    </div>

                    <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        maxHeight: '220px',
                        overflow: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    }}>
                        {convertedOutput}
                    </pre>
                </div>
            )}
        </motion.div>
    );
};

export default JsonCsvConverter;
