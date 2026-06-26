import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { cutAudio, loadFFmpeg } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseFloat(timeStr);
};

const AudioCutter = () => {
    const [cutFile, setCutFile] = useState(null);
    const [startTime, setStartTime] = useState("0:00");
    const [endTime, setEndTime] = useState("0:10");
    const [cuttingAudio, setCuttingAudio] = useState(false);
    const [cutResult, setCutResult] = useState(null);
    const [audioPlayerUrl, setAudioPlayerUrl] = useState(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        loadFFmpeg().then(() => setFfmpegLoaded(true));
    }, []);

    const onDropCut = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setCutFile(file);
            setCutResult(null);

            const tempUrl = URL.createObjectURL(file);
            const audio = new Audio(tempUrl);
            audio.onloadedmetadata = () => {
                setStartTime("0:00");
                setEndTime(formatTime(audio.duration));
                URL.revokeObjectURL(tempUrl);
            };
        }
    }, []);

    useEffect(() => {
        if (cutFile) {
            const url = URL.createObjectURL(cutFile);
            setAudioPlayerUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setAudioPlayerUrl(null);
        }
    }, [cutFile]);

    const { getRootProps: getCutRoot, getInputProps: getCutInput, isDragActive: isDragCut } = useDropzone({
        onDrop: onDropCut,
        accept: { 'audio/*': [] }
    });

    const handleCutAudio = async () => {
        if (!cutFile) return;
        setCuttingAudio(true);
        try {
            const ext = cutFile.name.split('.').pop() || 'mp3';
            const sTime = parseTime(startTime);
            const eTime = parseTime(endTime);
            const blob = await cutAudio(cutFile, sTime, eTime, ext);
            setCutResult({ blob, ext });
        } catch (err) {
            console.error(err);
            alert('Audio Cut Failed: ' + err.message);
        } finally {
            setCuttingAudio(false);
        }
    };

    const handleShare = async () => {
        if (!cutResult) return;
        const shared = await shareFile(cutResult.blob, `cut.${cutResult.ext}`, `audio/${cutResult.ext}`);
        if (!shared) {
            saveAs(cutResult.blob, `cut.${cutResult.ext}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
        >
            <div className="icon-wrapper">
                <Icon name='cut' size='huge' />
            </div>
            <SemanticHeader as='h2'>Audio Cutter</SemanticHeader>
            <div {...getCutRoot()} className={`dropzone ${isDragCut ? 'active' : ''}`}>
                <input {...getCutInput()} />
                {cutFile ? <p>{cutFile.name}</p> : <p>Drag & Drop Audio to Cut</p>}
            </div>
            {cutFile && (
                <FilePreview 
                    file={cutFile} 
                    onRemove={() => {
                        setCutFile(null);
                        setCutResult(null);
                    }} 
                />
            )}
            {audioPlayerUrl && <audio controls src={audioPlayerUrl} ref={audioRef} style={{ width: '100%', marginBottom: '10px' }} />}
            <div className="controls">
                <div className="ui input action small">
                    <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    <Button icon onClick={() => audioRef.current && setStartTime(formatTime(audioRef.current.currentTime))}><Icon name='clock' /></Button>
                </div>
                <div className="ui input action small">
                    <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    <Button icon onClick={() => audioRef.current && setEndTime(formatTime(audioRef.current.currentTime))}><Icon name='clock' /></Button>
                </div>
                <Button primary onClick={handleCutAudio} loading={cuttingAudio} disabled={!cutFile || !ffmpegLoaded}>Cut</Button>
            </div>
            {cutResult && (
                <div className="result-area">
                    <span>Ready!</span>
                    <Button color='green' size='small' onClick={() => saveAs(cutResult.blob, `cut.${cutResult.ext}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default AudioCutter;
