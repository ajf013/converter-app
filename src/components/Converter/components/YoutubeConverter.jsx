import React, { useState } from 'react';
import { Icon, Button, Header as SemanticHeader } from 'semantic-ui-react';
import { motion } from 'framer-motion';

const YoutubeConverter = () => {
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const handleConvertYouTube = () => {
        if (!youtubeUrl) return;

        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
            alert("Please enter a valid YouTube URL");
            return;
        }

        window.open(`https://downloader.fcruz.org/#${youtubeUrl}`, '_blank');
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
        >
            <div className="icon-wrapper">
                <Icon name='youtube' color='red' size='huge' />
            </div>
            <SemanticHeader as='h2'>YouTube to MP3</SemanticHeader>
            <div className="ui input fluid" style={{ marginBottom: '20px' }}>
                <input type="text" placeholder="Enter YouTube URL..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
            </div>
            <Button primary fluid onClick={handleConvertYouTube} disabled={!youtubeUrl}>Convert to MP3</Button>
        </motion.div>
    );
};

export default YoutubeConverter;
