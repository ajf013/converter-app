import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from './FilePreview';
import { Icon, Dropdown, Button, Header as SemanticHeader, Progress, Message } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertAudio, loadFFmpeg } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';

const audioOptions = [
    { key: 'mp3', text: 'MP3', value: 'mp3' },
    { key: 'wav', text: 'WAV', value: 'wav' },
    { key: 'ogg', text: 'OGG', value: 'ogg' },
    { key: 'aac', text: 'AAC', value: 'aac' },
];

const AudioConverter = () => {
    const [audioFile, setAudioFile] = useState(null);
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [convertingAudio, setConvertingAudio] = useState(false);
    const [convertedAudio, setConvertedAudio] = useState(null);
    const [audioProgress, setAudioProgress] = useState(0);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [ffmpegError, setFfmpegError] = useState(null);

    useEffect(() => {
        loadFFmpeg()
            .then(() => setFfmpegLoaded(true))
            .catch((e) => {
                console.error("FFmpeg load error:", e);
                setFfmpegError("Audio converter unavailable (SharedArrayBuffer support missing? Check headers)");
            });
    }, []);

    const onDropAudio = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setAudioFile(acceptedFiles[0]);
            setConvertedAudio(null);
            setAudioProgress(0);
        }
    }, []);

    const { getRootProps: getAudioRoot, getInputProps: getAudioInput, isDragActive: isDragAudio } = useDropzone({
        onDrop: onDropAudio,
        accept: { 'audio/*': [] }
    });

    const handleConvertAudio = async () => {
        if (!audioFile) return;
        setConvertingAudio(true);
        setAudioProgress(0);
        try {
            const blob = await convertAudio(audioFile, audioFormat, (progress) => {
                setAudioProgress(Math.round(progress));
            });
            setConvertedAudio(blob);
        } catch (err) {
            console.error(err);
            alert('Audio Conversion Failed: ' + err.message);
        } finally {
            setConvertingAudio(false);
        }
    };

    const handleShare = async () => {
        if (!convertedAudio) return;
        const shared = await shareFile(convertedAudio, `audio.${audioFormat}`, `audio/${audioFormat}`);
        if (!shared) {
            saveAs(convertedAudio, `audio.${audioFormat}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <div className="icon-wrapper">
                <Icon name='music' size='huge' />
            </div>
            <SemanticHeader as='h2'>Music Converter</SemanticHeader>
            <div {...getAudioRoot()} className={`dropzone ${isDragAudio ? 'active' : ''}`}>
                <input {...getAudioInput()} />
                {audioFile ? <p>{audioFile.name}</p> : <p>Drag & Drop Audio</p>}
            </div>
            {audioFile && (
                <FilePreview 
                    file={audioFile} 
                    onRemove={() => {
                        setAudioFile(null);
                        setConvertedAudio(null); setAudioProgress(0);
                    }} 
                />
            )}
            <div className="controls">
                <Dropdown selection options={audioOptions} value={audioFormat} onChange={(_, { value }) => setAudioFormat(value)} />
                <Button primary onClick={handleConvertAudio} loading={convertingAudio} disabled={!audioFile || !ffmpegLoaded}>Convert</Button>
            </div>
            {convertingAudio && <Progress percent={audioProgress} indicating size='tiny' style={{ width: '100%', marginTop: '15px' }} />}
            {ffmpegError && <Message negative size='tiny'>{ffmpegError}</Message>}
            {convertedAudio && (
                <div className="result-area">
                    <Icon name="check circle" color="green" />
                    <Button color="green" size="small" onClick={() => saveAs(convertedAudio, `audio.${audioFormat}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default AudioConverter;
