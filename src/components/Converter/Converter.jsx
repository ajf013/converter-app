import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader, Progress, Message } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage, convertSpreadsheet, convertDocument, convertAudio, convertYouTubeToMp3, loadFFmpeg } from '../../utils/conversionUtils';
import './Converter.css';

const imageOptions = [
    { key: 'png', text: 'PNG', value: 'png' },
    { key: 'jpg', text: 'JPG', value: 'jpg' },
    { key: 'webp', text: 'WEBP', value: 'webp' },
    { key: 'gif', text: 'GIF', value: 'gif' },
    { key: 'bmp', text: 'BMP', value: 'bmp' },
];

const audioOptions = [
    { key: 'mp3', text: 'MP3', value: 'mp3' },
    { key: 'wav', text: 'WAV', value: 'wav' },
    { key: 'ogg', text: 'OGG', value: 'ogg' },
    { key: 'aac', text: 'AAC', value: 'aac' },
];

const docOptions = [
    { key: 'pdf', text: 'PDF', value: 'pdf' },
    { key: 'txt', text: 'TXT', value: 'txt' },
    { key: 'csv', text: 'CSV', value: 'csv' },
    { key: 'json', text: 'JSON', value: 'json' },
];

const Converter = () => {
    // --- Image State ---
    const [imageFile, setImageFile] = useState(null);
    const [imageFormat, setImageFormat] = useState('png');
    const [convertingImg, setConvertingImg] = useState(false);
    const [convertedImg, setConvertedImg] = useState(null);

    // --- Doc State ---
    const [docFile, setDocFile] = useState(null);
    const [docFormat, setDocFormat] = useState('pdf');
    const [convertingDoc, setConvertingDoc] = useState(false);
    const [convertedDoc, setConvertedDoc] = useState(null);
    const [availableDocFormats, setAvailableDocFormats] = useState(docOptions);

    // --- Audio State ---
    const [audioFile, setAudioFile] = useState(null);
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [convertingAudio, setConvertingAudio] = useState(false);
    const [convertedAudio, setConvertedAudio] = useState(null);
    const [audioProgress, setAudioProgress] = useState(0);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [ffmpegError, setFfmpegError] = useState(null);
    // const [audioMode, setAudioMode] = useState('file'); // Removed in favor of separate card

    // --- YouTube State ---
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [apiKey, setApiKey] = useState(import.meta.env.VITE_RAPIDAPI_KEY || localStorage.getItem('rapidApiKey') || '');
    const [convertingYoutube, setConvertingYoutube] = useState(false);
    const [convertedYoutube, setConvertedYoutube] = useState(null);

    // Save API Key to localStorage when it changes
    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('rapidApiKey', apiKey);
        }
    }, [apiKey]);

    // Load FFmpeg on mount
    useEffect(() => {
        loadFFmpeg().then(() => setFfmpegLoaded(true)).catch((e) => {
            console.error("FFmpeg load error:", e);
            setFfmpegError("Audio converter unavailable (SharedArrayBuffer support missing? Check headers)");
        });
    }, []);

    // --- Image Handlers ---
    const onDropImage = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setImageFile(acceptedFiles[0]);
            setConvertedImg(null);
        }
    }, []);

    const { getRootProps: getImgRoot, getInputProps: getImgInput, isDragActive: isDragImg } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/*': [] }
    });

    const handleConvertImage = async () => {
        if (!imageFile) return;
        setConvertingImg(true);
        try {
            const blob = await convertImage(imageFile, imageFormat);
            setConvertedImg(blob);
        } catch (err) {
            console.error(err);
            alert('Error converting image');
        } finally {
            setConvertingImg(false);
        }
    };

    // --- Doc Handlers ---
    const onDropDoc = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setDocFile(file);
            setConvertedDoc(null);

            const name = file.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                setAvailableDocFormats([
                    { key: 'csv', text: 'CSV', value: 'csv' },
                    { key: 'json', text: 'JSON', value: 'json' },
                    { key: 'html', text: 'HTML', value: 'html' },
                    { key: 'txt', text: 'TXT', value: 'txt' }
                ]);
                setDocFormat('csv');
            } else if (name.endsWith('.docx') || name.endsWith('.txt')) {
                setAvailableDocFormats([
                    { key: 'pdf', text: 'PDF', value: 'pdf' },
                    { key: 'txt', text: 'TXT', value: 'txt' }
                ]);
                setDocFormat('pdf');
            } else {
                setAvailableDocFormats([
                    { key: 'pdf', text: 'PDF', value: 'pdf' }
                ]);
            }
        }
    }, []);

    const { getRootProps: getDocRoot, getInputProps: getDocInput, isDragActive: isDragDoc } = useDropzone({
        onDrop: onDropDoc,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        }
    });

    const handleConvertDoc = async () => {
        if (!docFile) return;
        setConvertingDoc(true);
        try {
            let blob;
            const name = docFile.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                blob = await convertSpreadsheet(docFile, docFormat);
            } else {
                blob = await convertDocument(docFile, docFormat);
            }
            setConvertedDoc(blob);
        } catch (err) {
            console.error(err);
            alert('Conversion failed: ' + err.message);
        } finally {
            setConvertingDoc(false);
        }
    };

    // --- Audio Handlers ---
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
                setAudioProgress(progress);
            });
            setConvertedAudio(blob);
        } catch (err) {
            console.error(err);
            alert('Audio Conversion Failed: ' + err.message);
        } finally {
            setConvertingAudio(false);
        }
    };

    const handleConvertYouTube = async () => {
        if (!youtubeUrl || !apiKey) return;
        setConvertingYoutube(true);
        setConvertedYoutube(null);
        try {
            const blob = await convertYouTubeToMp3(youtubeUrl, apiKey);
            setConvertedYoutube(blob);
        } catch (err) {
            console.error(err);
            alert('YouTube Conversion Failed: ' + err.message);
        } finally {
            setConvertingYoutube(false);
        }
    };

    return (
        <div className="converter-container">
            {/* Image Section */}
            <motion.div
                className="converter-card"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='image' circular />
                    <SemanticHeader.Content>Image Converter</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getImgRoot()} className={`dropzone ${isDragImg ? 'active' : ''}`}>
                    <input {...getImgInput()} />
                    {imageFile ? <p>{imageFile.name}</p> : <p>Drag & Drop Image</p>}
                </div>

                <div className="controls">
                    <Dropdown
                        selection
                        options={imageOptions}
                        value={imageFormat}
                        onChange={(_, { value }) => setImageFormat(value)}
                        placeholder='Select Format'
                    />
                    <Button primary onClick={handleConvertImage} loading={convertingImg} disabled={!imageFile}>
                        Convert
                    </Button>
                </div>
                {convertedImg && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(convertedImg, `image.${imageFormat}`)}>Download {imageFormat.toUpperCase()}</Button>
                    </div>
                )}
            </motion.div>

            {/* Document Section */}
            <motion.div
                className="converter-card"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='file alternate' circular />
                    <SemanticHeader.Content>Document Converter</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getDocRoot()} className={`dropzone ${isDragDoc ? 'active' : ''}`}>
                    <input {...getDocInput()} />
                    {docFile ? <p>{docFile.name}</p> : <p>Drag & Drop Doc/XLS</p>}
                </div>

                <div className="controls">
                    <Dropdown
                        selection
                        options={availableDocFormats}
                        value={docFormat}
                        onChange={(_, { value }) => setDocFormat(value)}
                        placeholder='Select Format'
                    />
                    <Button primary onClick={handleConvertDoc} loading={convertingDoc} disabled={!docFile}>
                        Convert
                    </Button>
                </div>
                {convertedDoc && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(convertedDoc, `doc.${docFormat}`)}>Download {docFormat.toUpperCase()}</Button>
                    </div>
                )}
            </motion.div>

            {/* Audio Section */}
            <motion.div
                className="converter-card"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <SemanticHeader.Content>Music Converter</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getAudioRoot()} className={`dropzone ${isDragAudio ? 'active' : ''}`}>
                    <input {...getAudioInput()} />
                    {audioFile ? <p>{audioFile.name}</p> : <p>Drag & Drop Audio</p>}
                </div>

                {ffmpegError ? (
                    <Message negative size='small'>
                        <Message.Header>Not Supported</Message.Header>
                        <p>{ffmpegError}</p>
                    </Message>
                ) : (
                    <>
                        <div className="controls">
                            <Dropdown
                                selection
                                options={audioOptions}
                                value={audioFormat}
                                onChange={(_, { value }) => setAudioFormat(value)}
                                placeholder='Select Format'
                            />
                            <Button primary onClick={handleConvertAudio} loading={convertingAudio} disabled={!audioFile || !ffmpegLoaded}>
                                Convert
                            </Button>
                        </div>
                        {convertingAudio && <Progress percent={audioProgress} indicating size='tiny' />}
                    </>
                )}

                {convertedAudio && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(convertedAudio, `audio.${audioFormat}`)}>Download {audioFormat.toUpperCase()}</Button>
                    </div>
                )}
            </motion.div>

            {/* YouTube Section */}
            <motion.div
                className="converter-card"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='youtube' circular color='red' />
                    <SemanticHeader.Content>YouTube to MP3</SemanticHeader.Content>
                </SemanticHeader>

                <div className="youtube-section" style={{ textAlign: 'center' }}>
                    <div className="ui input fluid" style={{ marginBottom: '10px' }}>
                        <input
                            type="text"
                            placeholder="Enter YouTube URL..."
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                    </div>
                    <Button
                        primary
                        onClick={handleConvertYouTube}
                        loading={convertingYoutube}
                        disabled={!youtubeUrl}
                    >
                        Convert to MP3
                    </Button>
                </div>
                {convertedYoutube && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(convertedYoutube, 'audio.mp3')}>Download MP3</Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Converter;
