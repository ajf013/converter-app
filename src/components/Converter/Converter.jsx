import React, { useState } from 'react';
import { Icon } from 'semantic-ui-react';
import ImageConverter from './components/ImageConverter';
import DocConverter from './components/DocConverter';
import AudioConverter from './components/AudioConverter';
import YoutubeConverter from './components/YoutubeConverter';
import OcrConverter from './components/OcrConverter';
import AudioCutter from './components/AudioCutter';
import AudioJoiner from './components/AudioJoiner';
import VideoExtractor from './components/VideoExtractor';
import './Converter.css';

const categories = [
    { id: 'all', label: 'All Tools', icon: 'grid layout' },
    { id: 'image', label: 'Image Tools', icon: 'image' },
    { id: 'audio', label: 'Audio & Video', icon: 'music' },
    { id: 'document', label: 'Documents & OCR', icon: 'file text' },
    { id: 'youtube', label: 'YouTube Downloader', icon: 'youtube' },
];

const Converter = () => {
    const [activeCategory, setActiveCategory] = useState('all');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Category Navigation Tabs */}
            <div className="category-tabs">
                {categories.map(cat => (
                    <button 
                        key={cat.id} 
                        className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                        aria-label={`Show ${cat.label}`}
                    >
                        <Icon name={cat.icon} />
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Grid of Active Converter Tools */}
            <div className="converter-container">
                {(activeCategory === 'all' || activeCategory === 'image') && <ImageConverter />}
                {(activeCategory === 'all' || activeCategory === 'document') && <DocConverter />}
                {(activeCategory === 'all' || activeCategory === 'audio') && <AudioConverter />}
                {(activeCategory === 'all' || activeCategory === 'youtube') && <YoutubeConverter />}
                {(activeCategory === 'all' || activeCategory === 'image' || activeCategory === 'document') && <OcrConverter />}
                {(activeCategory === 'all' || activeCategory === 'audio') && <AudioCutter />}
                {(activeCategory === 'all' || activeCategory === 'audio') && <AudioJoiner />}
                {(activeCategory === 'all' || activeCategory === 'audio') && <VideoExtractor />}
            </div>
        </div>
    );
};

export default Converter;
