import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader } from 'semantic-ui-react';
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

const VideoExtractor = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [extractFormat, setExtractFormat] = useState('mp3');
    const [extracting, setExtracting] = useState(false);
    const [extractedAudio, setExtractedAudio] = useState(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    useEffect(() => {
        loadFFmpeg().then(() => setFfmpegLoaded(true));
    }, []);

    const onDropVideo = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setVideoFile(acceptedFiles[0]);
            setExtractedAudio(null);
        }
    }, []);

    const { getRootProps: getVideoRoot, getInputProps: getVideoInput, isDragActive: isDragVideo } = useDropzone({
        onDrop: onDropVideo,
        accept: { 'video/*': [] }
    });

    const handleExtractAudio = async () => {
        if (!videoFile) return;
        setExtracting(true);
        try {
            const blob = await convertAudio(videoFile, extractFormat, null);
            setExtractedAudio(blob);
        } catch (err) {
            console.error(err);
            alert('Extraction Failed: ' + err.message);
        } finally {
            setExtracting(false);
        }
    };

    const handleShare = async () => {
        if (!extractedAudio) return;
        const shared = await shareFile(extractedAudio, `extracted.${extractFormat}`, `audio/${extractFormat}`);
        if (!shared) {
            saveAs(extractedAudio, `extracted.${extractFormat}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
        >
            <div className="icon-wrapper">
                <Icon name='file video' size='huge' />
            </div>
            <SemanticHeader as='h2'>Video to Audio</SemanticHeader>
            <div {...getVideoRoot()} className={`dropzone ${isDragVideo ? 'active' : ''}`}>
                <input {...getVideoInput()} />
                {videoFile ? <p>{videoFile.name}</p> : <p>Drag & Drop Video</p>}
            </div>
            <div className="controls">
                <Dropdown selection options={audioOptions} value={extractFormat} onChange={(_, { value }) => setExtractFormat(value)} />
                <Button primary onClick={handleExtractAudio} loading={extracting} disabled={!videoFile || !ffmpegLoaded}>Extract</Button>
            </div>
            {extractedAudio && (
                <div className="result-area">
                    <span>Ready!</span>
                    <Button color='green' size='small' onClick={() => saveAs(extractedAudio, `extracted.${extractFormat}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default VideoExtractor;
