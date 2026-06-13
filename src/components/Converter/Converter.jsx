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
import PdfMerger from './components/PdfMerger';
import PdfSplitter from './components/PdfSplitter';
import PdfSecurity from './components/PdfSecurity';
import PdfRotate from './components/PdfRotate';
import PdfWatermark from './components/PdfWatermark';
import ImagesToPdf from './components/ImagesToPdf';
import PdfPageNumbers from './components/PdfPageNumbers';
import PdfOrganizer from './components/PdfOrganizer';
import PdfToJpg from './components/PdfToJpg';
import PdfSign from './components/PdfSign';
import HtmlToPdf from './components/HtmlToPdf';
import PdfCompress from './components/PdfCompress';
import WordToPdf from './components/WordToPdf';
import PptxToPdf from './components/PptxToPdf';
import ExcelToPdf from './components/ExcelToPdf';
import PdfToWord from './components/PdfToWord';
import PdfToExcel from './components/PdfToExcel';
import PdfToPptx from './components/PdfToPptx';
import PdfToPdfA from './components/PdfToPdfA';
import QrSuite from './components/QrSuite';
import PaletteExtractor from './components/PaletteExtractor';
import ColorConverter from './components/ColorConverter';
import Base64Converter from './components/Base64Converter';
import HistoryLog from './components/HistoryLog';
import UpdateNotification from './components/UpdateNotification';
import './Converter.css';

const categories = [
    { id: 'all', label: 'All Tools', icon: 'grid layout' },
    { id: 'image', label: 'Image Tools', icon: 'image' },
    { id: 'audio', label: 'Audio & Video', icon: 'music' },
    { id: 'pdf', label: 'PDF Utilities', icon: 'file pdf' },
    { id: 'convert-pdf', label: 'Convert PDF', icon: 'exchange' },
    { id: 'document', label: 'Documents & OCR', icon: 'file text' },
    { id: 'youtube', label: 'YouTube Downloader', icon: 'youtube' },
    { id: 'utils', label: 'Design & Utilities', icon: 'settings' },
];

const Converter = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [historyOpen, setHistoryOpen] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
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

                {/* PDF Tools */}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfMerger />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfSplitter />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfSecurity />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfRotate />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfWatermark />}
                {(activeCategory === 'all' || activeCategory === 'image' || activeCategory === 'pdf' || activeCategory === 'convert-pdf') && <ImagesToPdf />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfPageNumbers />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfOrganizer />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfCompress />}
                {(activeCategory === 'all' || activeCategory === 'image' || activeCategory === 'pdf' || activeCategory === 'convert-pdf') && <PdfToJpg />}
                {(activeCategory === 'all' || activeCategory === 'pdf') && <PdfSign />}
                {(activeCategory === 'all' || activeCategory === 'document' || activeCategory === 'pdf' || activeCategory === 'convert-pdf') && <HtmlToPdf />}

                {/* Convert PDF Tab Office Tools */}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <WordToPdf />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <PptxToPdf />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <ExcelToPdf />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <PdfToWord />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <PdfToExcel />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <PdfToPptx />}
                {(activeCategory === 'all' || activeCategory === 'convert-pdf') && <PdfToPdfA />}

                {/* Design & Tech Utilities */}
                {(activeCategory === 'all' || activeCategory === 'utils') && <PaletteExtractor />}
                {(activeCategory === 'all' || activeCategory === 'utils') && <ColorConverter />}
                {(activeCategory === 'all' || activeCategory === 'utils') && <QrSuite />}
                {(activeCategory === 'all' || activeCategory === 'utils') && <Base64Converter />}
            </div>

            {/* Floating Settings/History Toggle Button */}
            <button
                className="history-toggle-btn"
                onClick={() => setHistoryOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '25px',
                    right: '25px',
                    background: 'linear-gradient(135deg, #00dbde 0%, #fc00ff 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '56px',
                    height: '56px',
                    boxShadow: '0 8px 32px rgba(0, 219, 222, 0.4)',
                    cursor: 'pointer',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
                aria-label="Open settings and history logs"
            >
                <Icon name="setting" size="large" style={{ margin: 0 }} />
            </button>

            {/* Slide-out Settings & History Drawer */}
            <HistoryLog isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />

            {/* Launch update notification */}
            <UpdateNotification />
        </div>
    );
};

export default Converter;
