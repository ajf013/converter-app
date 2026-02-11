import React, { useState, useCallback, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { useDropzone } from 'react-dropzone';
import { Icon, Dropdown, Button, Header as SemanticHeader, Progress, Message } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertImage, convertSpreadsheet, convertDocument, convertAudio, cutAudio, joinAudio, loadFFmpeg } from '../../utils/conversionUtils';
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

const ocrOptions = [
    { key: 'auto', text: 'Auto Detect (Eng/Tam)', value: 'eng+tam' },
    { key: 'eng', text: 'English', value: 'eng' },
    { key: 'tam', text: 'Tamil', value: 'tam' },
];

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

    // --- OCR State ---
    const [ocrFile, setOcrFile] = useState(null);
    const [ocrLang, setOcrLang] = useState('eng+tam');
    const [ocrText, setOcrText] = useState('');
    const [convertingOcr, setConvertingOcr] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);

    // --- Audio Cutter State ---
    const [cutFile, setCutFile] = useState(null);
    const [startTime, setStartTime] = useState("0:00");
    const [endTime, setEndTime] = useState("0:10");
    const [cuttingAudio, setCuttingAudio] = useState(false);
    const [cutResult, setCutResult] = useState(null);

    // --- Audio Joiner State ---
    const [joinFiles, setJoinFiles] = useState([null, null]);
    const [joiningAudio, setJoiningAudio] = useState(false);
    const [joinResult, setJoinResult] = useState(null);

    // --- Audio Cutter Player State ---
    const [audioPlayerUrl, setAudioPlayerUrl] = useState(null);
    const audioRef = React.useRef(null);

    // --- Video Extractor State ---
    const [videoFile, setVideoFile] = useState(null);
    const [extractFormat, setExtractFormat] = useState('mp3');
    const [extracting, setExtracting] = useState(false);
    const [extractedAudio, setExtractedAudio] = useState(null);

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

    const handleConvertYouTube = () => {
        if (!youtubeUrl) return;

        // Basic validation: must contain a youtube domain or be a valid URL
        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
            alert("Please enter a valid YouTube URL");
            return;
        }

        // Open cobalt.tools in a new tab with the URL pre-filled in the hash
        // This project is ad-free and open-source, providing a much better UX.
        window.open(`https://cobalt.tools/#${youtubeUrl}`, '_blank');
    };

    // --- OCR Handlers ---
    const onDropOcr = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setOcrFile(acceptedFiles[0]);
            setOcrText('');
            setOcrProgress(0);
        }
    }, []);

    const { getRootProps: getOcrRoot, getInputProps: getOcrInput, isDragActive: isDragOcr } = useDropzone({
        onDrop: onDropOcr,
        accept: { 'image/*': [] }
    });

    const handleConvertOCR = async () => {
        if (!ocrFile) return;
        setConvertingOcr(true);
        setOcrText('');
        setOcrProgress(0);
        try {
            const worker = await createWorker(ocrLang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.floor(m.progress * 100));
                    }
                }
            });
            const { data: { text } } = await worker.recognize(ocrFile);
            setOcrText(text);
            await worker.terminate();
        } catch (err) {
            console.error(err);
            alert('OCR Failed: ' + err.message);
        } finally {
            setConvertingOcr(false);
        }
    };

    const handleCopyText = () => {
        if (ocrText) {
            navigator.clipboard.writeText(ocrText);
            alert('Text copied to clipboard!');
        }
    };

    const handleDownloadText = () => {
        if (ocrText) {
            const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, 'extracted_text.txt');
        }
    };

    // --- Audio Cutter Handlers ---
    const onDropCut = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            const file = acceptedFiles[0];
            setCutFile(file);
            setCutResult(null);

            // Auto-detect duration
            const tempUrl = URL.createObjectURL(file);
            const audio = new Audio(tempUrl);
            audio.onloadedmetadata = () => {
                setStartTime("0:00");
                setEndTime(formatTime(audio.duration));
                URL.revokeObjectURL(tempUrl); // Cleanup temp url immediately
            };
        }
    }, []);

    // Manage Audio Player URL based on cutFile
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
            // Default to mp3 for cut output or original extension
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

    // --- Audio Joiner Handlers ---
    // Using standard inputs for explicit buttons
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
            // Default to mp3 for join output
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

    // --- Video Extractor Handlers ---
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
            // Reusing convertAudio as it uses ffmpeg which handles video inputs
            const blob = await convertAudio(videoFile, extractFormat, null);
            setExtractedAudio(blob);
        } catch (err) {
            console.error(err);
            alert('Extraction Failed: ' + err.message);
        } finally {
            setExtracting(false);
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
                    <Icon name='music' circular />
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
                        disabled={!youtubeUrl}
                    >
                        Convert to MP3
                    </Button>
                </div>
            </motion.div>

            {/* OCR Section */}
            <motion.div
                className="converter-card"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='file text' circular />
                    <SemanticHeader.Content>Image to Text (OCR)</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getOcrRoot()} className={`dropzone ${isDragOcr ? 'active' : ''}`}>
                    <input {...getOcrInput()} />
                    {ocrFile ? <p>{ocrFile.name}</p> : <p>Drag & Drop Image for OCR</p>}
                </div>

                <div className="controls">
                    <Dropdown
                        selection
                        options={ocrOptions}
                        value={ocrLang}
                        onChange={(_, { value }) => setOcrLang(value)}
                        placeholder='Select Language'
                    />
                    <Button primary onClick={handleConvertOCR} loading={convertingOcr} disabled={!ocrFile}>
                        Extract Text
                    </Button>
                </div>
                {convertingOcr && <Progress percent={ocrProgress} indicating size='tiny' />}

                {ocrText && (
                    <div className="result-area ocr-result">
                        <Message>
                            <Message.Header>Extracted Text:</Message.Header>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                                {ocrText}
                            </div>
                        </Message>
                        <div className="ocr-actions" style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <Button icon labelPosition='left' onClick={handleCopyText}>
                                <Icon name='copy' />
                                Copy
                            </Button>
                            <Button icon labelPosition='left' color='green' onClick={handleDownloadText}>
                                <Icon name='download' />
                                Download .txt
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Audio Cutter Section */}
            <motion.div
                className="converter-card"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='cut' circular />
                    <SemanticHeader.Content>Audio Cutter</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getCutRoot()} className={`dropzone ${isDragCut ? 'active' : ''}`}>
                    <input {...getCutInput()} />
                    {cutFile ? <p>{cutFile.name}</p> : <p>Drag & Drop Audio to Cut</p>}
                </div>

                {audioPlayerUrl && (
                    <div style={{ margin: '15px 0', textAlign: 'center', width: '100%' }}>
                        <audio
                            key={audioPlayerUrl}
                            ref={audioRef}
                            controls
                            src={audioPlayerUrl}
                            style={{ width: '100%', outline: 'none' }}
                        />
                    </div>
                )}

                <div className="controls" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Time (min:sec)</label>
                        <div className="ui input action">
                            <input
                                type="text"
                                placeholder="0:00"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{ width: '100px' }}
                            />
                            <Button icon onClick={() => {
                                if (audioRef.current) setStartTime(formatTime(audioRef.current.currentTime));
                            }} title="Use Current Time">
                                <Icon name="clock" />
                            </Button>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Time (min:sec)</label>
                        <div className="ui input action">
                            <input
                                type="text"
                                placeholder="0:00"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                style={{ width: '100px' }}
                            />
                            <Button icon onClick={() => {
                                if (audioRef.current) setEndTime(formatTime(audioRef.current.currentTime));
                            }} title="Use Current Time">
                                <Icon name="clock" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="controls">
                    <Button primary onClick={handleCutAudio} loading={cuttingAudio} disabled={!cutFile || !ffmpegLoaded}>
                        Cut Audio
                    </Button>
                </div>

                {cutResult && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(cutResult.blob, `cut_audio.${cutResult.ext}`)}>Download Cut Audio</Button>
                    </div>
                )}
            </motion.div>

            {/* Audio Joiner Section */}
            <motion.div
                className="converter-card"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='linkify' circular />
                    <SemanticHeader.Content>Audio Joiner</SemanticHeader.Content>
                </SemanticHeader>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                    <div className="file-input-wrapper">
                        <Button as="label" htmlFor="file1" icon labelPosition="left">
                            <Icon name="music" />
                            Select File 1
                        </Button>
                        <input type="file" id="file1" accept="audio/*" style={{ display: 'none' }} onChange={(e) => handleJoinFileChange(e, 0)} />
                        <span style={{ marginLeft: '10px' }}>{joinFiles[0] ? joinFiles[0].name : "No file selected"}</span>
                    </div>

                    <div className="file-input-wrapper">
                        <Button as="label" htmlFor="file2" icon labelPosition="left">
                            <Icon name="music" />
                            Select File 2
                        </Button>
                        <input type="file" id="file2" accept="audio/*" style={{ display: 'none' }} onChange={(e) => handleJoinFileChange(e, 1)} />
                        <span style={{ marginLeft: '10px' }}>{joinFiles[1] ? joinFiles[1].name : "No file selected"}</span>
                    </div>
                </div>

                <div className="controls">
                    <Button primary onClick={handleJoinAudio} loading={joiningAudio} disabled={!joinFiles[0] || !joinFiles[1] || !ffmpegLoaded}>
                        Join Files
                    </Button>
                </div>

                {joinResult && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(joinResult.blob, `joined_audio.${joinResult.ext}`)}>Download Joined Audio</Button>
                    </div>
                )}
            </motion.div>

            {/* Video Extractor Section */}
            <motion.div
                className="converter-card"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
            >
                <SemanticHeader as='h2' icon textAlign='center'>
                    <Icon name='file video' circular />
                    <SemanticHeader.Content>Video to Audio Extractor</SemanticHeader.Content>
                </SemanticHeader>

                <div {...getVideoRoot()} className={`dropzone ${isDragVideo ? 'active' : ''}`}>
                    <input {...getVideoInput()} />
                    {videoFile ? <p>{videoFile.name}</p> : <p>Drag & Drop Video to Extract Audio</p>}
                </div>

                <div className="controls">
                    <Dropdown
                        selection
                        options={audioOptions}
                        value={extractFormat}
                        onChange={(_, { value }) => setExtractFormat(value)}
                        placeholder='Select Format'
                    />
                    <Button primary onClick={handleExtractAudio} loading={extracting} disabled={!videoFile || !ffmpegLoaded}>
                        Extract Audio
                    </Button>
                </div>
                {extractedAudio && (
                    <div className="result-area">
                        <Icon name="check circle" color="green" size="large" />
                        <Button color="green" onClick={() => saveAs(extractedAudio, `extracted_audio.${extractFormat}`)}>Download Audio</Button>
                    </div>
                )}
            </motion.div>


        </div>
    );
};

export default Converter;
