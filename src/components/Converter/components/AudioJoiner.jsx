import React, { useState, useEffect } from 'react';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { joinAudio, loadFFmpeg } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';

const AudioJoiner = () => {
    const [joinFiles, setJoinFiles] = useState([null, null]);
    const [joiningAudio, setJoiningAudio] = useState(false);
    const [joinResult, setJoinResult] = useState(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    useEffect(() => {
        loadFFmpeg().then(() => setFfmpegLoaded(true));
    }, []);

    const handleJoinFileChange = (e, index) => {
        if (e.target.files && e.target.files[0]) {
            const newFiles = [...joinFiles];
            newFiles[index] = e.target.files[0];
            setJoinFiles(newFiles);
            setJoinResult(null);
        }
    };

    const handleJoinAudio = async () => {
        const filesToJoin = joinFiles.filter(f => f !== null);
        if (filesToJoin.length < 2) {
            alert("Please select both File 1 and File 2.");
            return;
        }
        setJoiningAudio(true);
        try {
            const ext = 'mp3';
            const blob = await joinAudio(filesToJoin, ext);
            setJoinResult({ blob, ext });
        } catch (err) {
            console.error(err);
            alert('Audio Join Failed: ' + err.message);
        } finally {
            setJoiningAudio(false);
        }
    };

    const handleShare = async () => {
        if (!joinResult) return;
        const shared = await shareFile(joinResult.blob, `joined.${joinResult.ext}`, `audio/${joinResult.ext}`);
        if (!shared) {
            saveAs(joinResult.blob, `joined.${joinResult.ext}`);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
        >
            <div className="icon-wrapper">
                <Icon name='linkify' size='huge' />
            </div>
            <SemanticHeader as='h2'>Audio Joiner</SemanticHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <Button as='label' primary size='small' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                    <Icon name='plus' /> {joinFiles[0] ? joinFiles[0].name.slice(0, 15) : 'File 1'}
                    <input type='file' hidden onChange={(e) => handleJoinFileChange(e, 0)} />
                </Button>
                <Button as='label' primary size='small' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                    <Icon name='plus' /> {joinFiles[1] ? joinFiles[1].name.slice(0, 15) : 'File 2'}
                    <input type='file' hidden onChange={(e) => handleJoinFileChange(e, 1)} />
                </Button>
            </div>
            <Button primary fluid onClick={handleJoinAudio} loading={joiningAudio} disabled={!joinFiles[0] || !joinFiles[1] || !ffmpegLoaded}>Join Files</Button>
            {joinResult && (
                <div className="result-area">
                    <span>Ready!</span>
                    <Button color='green' size='small' onClick={() => saveAs(joinResult.blob, `joined.${joinResult.ext}`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default AudioJoiner;
