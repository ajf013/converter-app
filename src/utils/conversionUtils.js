import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// --- Image Conversion ---
export const convertImage = (file, targetFormat) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Determine mime type
                let mimeType = 'image/png';
                if (targetFormat === 'jpg' || targetFormat === 'jpeg') mimeType = 'image/jpeg';
                if (targetFormat === 'webp') mimeType = 'image/webp';
                if (targetFormat === 'bmp') mimeType = 'image/bmp';
                if (targetFormat === 'gif') mimeType = 'image/gif';

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Conversion failed'));
                    }
                }, mimeType);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// --- Spreadsheet Conversion ---
export const convertSpreadsheet = (file, targetFormat) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                let outputData;
                let mimeType = 'text/plain';

                if (targetFormat === 'csv') {
                    outputData = XLSX.utils.sheet_to_csv(worksheet);
                    mimeType = 'text/csv;charset=utf-8';
                } else if (targetFormat === 'json') {
                    outputData = JSON.stringify(XLSX.utils.sheet_to_json(worksheet), null, 2);
                    mimeType = 'application/json;charset=utf-8';
                } else if (targetFormat === 'html') {
                    outputData = XLSX.utils.sheet_to_html(worksheet);
                    mimeType = 'text/html;charset=utf-8';
                } else {
                    reject(new Error('Unsupported spreadsheet target'));
                    return;
                }

                resolve(new Blob([outputData], { type: mimeType }));
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

// --- Document Conversion ---
export const convertDocument = async (file, targetFormat) => {
    const fileName = file.name.toLowerCase();

    // TXT -> PDF
    if (fileName.endsWith('.txt') && targetFormat === 'pdf') {
        const text = await file.text();
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(text, 180);
        let y = 10;
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(splitText[i], 10, y);
            y += 7;
        }
        return doc.output('blob');
    }

    // DOCX -> PDF (Text only)
    if (fileName.endsWith('.docx') && targetFormat === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(text, 180);
        let y = 10;
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(splitText[i], 10, y);
            y += 7;
        }
        return doc.output('blob');
    }

    // DOCX -> TXT
    if (fileName.endsWith('.docx') && targetFormat === 'txt') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return new Blob([result.value], { type: 'text/plain' });
    }

    throw new Error(`Conversion from ${file.name} to ${targetFormat} not fully supported client-side yet.`);
};

// --- Audio Conversion using FFmpeg.wasm ---
let ffmpeg = null;

export const loadFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    // Using default CDN
    await ffmpeg.load();
    return ffmpeg;
};

export const convertAudio = async (file, targetFormat, onProgress) => {
    if (!ffmpeg) await loadFFmpeg();

    const { name } = file;
    await ffmpeg.writeFile(name, await fetchFile(file));

    const outputName = `output.${targetFormat}`;

    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(progress * 100);
        });
    }

    await ffmpeg.exec(['-i', name, outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(name);
    await ffmpeg.deleteFile(outputName);

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};

export const cutAudio = async (file, start, end, targetFormat) => {
    if (!ffmpeg) await loadFFmpeg();
    const { name } = file;
    await ffmpeg.writeFile(name, await fetchFile(file));
    const outputName = `output_${Date.now()}.${targetFormat}`;

    // -ss: start time, -to: end time
    // Re-encoding is generally safer for cutting to avoid keyframe issues
    await ffmpeg.exec(['-i', name, '-ss', start.toString(), '-to', end.toString(), outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(name);
    await ffmpeg.deleteFile(outputName);

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};

export const joinAudio = async (files, targetFormat) => {
    if (!ffmpeg) await loadFFmpeg();

    const inputNames = [];
    let concatList = '';

    // Write all files
    for (const file of files) {
        const safeName = `input_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        await ffmpeg.writeFile(safeName, await fetchFile(file));
        inputNames.push(safeName);
        concatList += `file '${safeName}'\n`;
    }

    const listFileName = 'concat_list.txt';
    await ffmpeg.writeFile(listFileName, concatList);
    const outputName = `joined_${Date.now()}.${targetFormat}`;

    // -f concat -safe 0 -i list.txt
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', listFileName, outputName]);

    const data = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(listFileName);
    await ffmpeg.deleteFile(outputName);
    for (const name of inputNames) {
        await ffmpeg.deleteFile(name);
    }

    return new Blob([data.buffer], { type: `audio/${targetFormat}` });
};

// --- YouTube Conversion ---
export const convertYouTubeToMp3 = async (url, apiKey) => {
    try {
        if (!apiKey) {
            throw new Error('RapidAPI Key is required.');
        }

        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`https://youtube-mp3-downloader2.p.rapidapi.com/ytmp3/ytmp3/custom/?url=${encodedUrl}&quality=320`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-mp3-downloader2.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        // Adjust based on actual API response structure for this specific API
        if (data.status === 'finished' || data.dlink) {
            // Fetch the file as blob
            const downloadUrl = data.dlink || data.link;
            const fileRes = await fetch(downloadUrl);
            const blob = await fileRes.blob();
            return blob;
        } else {
            throw new Error('Download link not found in response');
        }
    } catch (err) {
        console.error("YouTube-MP3 Error:", err);
        throw err;
    }
};

// --- YouTube Video Details ---
export const getYouTubeVideoDetails = async (url, apiKey) => {
    try {
        if (!apiKey) throw new Error('RapidAPI Key is required.');

        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        }

        if (!videoId) throw new Error('Invalid YouTube URL');

        // Using "YouTube Video and Shorts Downloader" (yt-api.p.rapidapi.com)
        // Endpoint: /dl?id={videoId}

        const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'yt-api.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            // Handle specific status codes
            if (response.status === 403) throw new Error('API Key Invalid or Not Subscribed (Check yt-api on RapidAPI)');
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Check if formats exist (combine formats and adaptiveFormats if available)
        let rawFormats = [...(data.formats || []), ...(data.adaptiveFormats || [])];

        if (!rawFormats.length && data.link) {
            // Some APIs just return a direct link in 'link' or 'url'
            rawFormats = [{ qualityLabel: 'Default', url: data.link, container: 'mp4', hasAudio: true }];
        }

        // Filter and Process Formats
        const uniqueQualities = new Map();

        rawFormats.forEach(fmt => {
            // Adapt keys
            const quality = fmt.qualityLabel || fmt.quality || (fmt.height ? `${fmt.height}p` : 'Unknown');
            const type = fmt.mimeType || '';

            // Skip pure audio streams for the video list
            // Note: adaptive video streams often have no audio, we want to Keep them but label them
            if (type.includes('audio/') || (fmt.audioQuality === 'AUDIO_QUALITY_LOW' && !fmt.qualityLabel)) return;

            // Detect audio presence
            const hasAudio = fmt.audioQuality || fmt.audioBitrate || fmt.hasAudio;

            // Priority: MP4 > WebM
            const ext = fmt.container || fmt.ext || (type.includes('mp4') ? 'mp4' : 'webm');

            // Group by quality label
            // Logic: Prefer hasAudio=true. If both same audio status, prefer MP4.
            const existing = uniqueQualities.get(quality);
            const isBetter = !existing || (!!hasAudio && !existing.hasAudio) || (!!hasAudio === !!existing?.hasAudio && ext === 'mp4' && existing?.ext !== 'mp4');

            if (isBetter) {
                uniqueQualities.set(quality, {
                    quality: quality + (hasAudio ? '' : ' (No Audio)'),
                    originalQuality: quality,
                    url: fmt.url,
                    ext: ext,
                    height: fmt.height || 0,
                    hasAudio: !!hasAudio
                });
            }
        });

        // Convert and Sort Descending
        let processedFormats = Array.from(uniqueQualities.values());

        const getHeight = (q) => {
            if (q.height) return q.height;
            const match = q.originalQuality.match(/(\d+)p?/);
            return match ? parseInt(match[1]) : 0;
        };

        processedFormats.sort((a, b) => getHeight(b) - getHeight(a));

        // Find Best Audio format for merging (high bitrate, m4a/mp4 preferred)
        let bestAudio = null;
        rawFormats.forEach(fmt => {
            // Look for audio-only streams
            if (fmt.mimeType && fmt.mimeType.includes('audio/')) {
                if (!bestAudio || (fmt.audioBitrate > bestAudio.audioBitrate)) {
                    bestAudio = fmt;
                }
            }
        });
        const bestAudioUrl = bestAudio ? bestAudio.url : null;

        return {
            title: data.title || 'Unknown Video',
            thumbnail: data.thumbnail || data.thumb || '',
            formats: processedFormats,
            bestAudioUrl: bestAudioUrl
        };
    } catch (err) {
        console.error("YouTube Video Info Error:", err);
        throw err;
    }
};

// --- Smart Download Link Fetcher (Server-Side Merge) ---
export const getBridgeDownloadLink = async (url, qualityLabel, apiKey) => {
    try {
        if (!apiKey) throw new Error('RapidAPI Key is required.');

        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        }
        if (!videoId) throw new Error('Invalid YouTube URL');

        // qualityLabel ex: "1080p", "720p", "4k"
        // yt-api expects "1080p", "720p" etc in renderableFormats
        // Extract strictly the resolution part like "1080" and add "p"
        const match = qualityLabel.match(/(\d+)/);
        const qualityParam = match ? `${match[1]}p` : '720p';

        // Using "YouTube Video and Shorts Downloader" (yt-api.p.rapidapi.com)
        // Request specifically the renderable format
        const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}&renderableFormats=${qualityParam}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'yt-api.p.rapidapi.com'
            }
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        console.log("Bridge Response:", data);

        // The API returns a formats list. We need to find the one we requested.
        // It should be in 'formats' and have the qualityLabel we asked for, AND hasAudio: true (or not be adaptive).

        const formats = data.formats || [];
        const target = formats.find(f => {
            // Check for resolution match
            const h = f.height || 0;
            const q = f.qualityLabel || '';
            const desiredH = parseInt(match[1]);

            // Loose matching: strict height match OR quality string match
            const heightMatch = h === desiredH;
            const labelMatch = q.includes(qualityParam);

            // IMPORTANT: Must have audio.
            const hasAudio = f.hasAudio || f.audioBitrate || f.audioQuality;

            return (heightMatch || labelMatch) && hasAudio;
        });

        if (target && target.url) {
            return target.url;
        }

        // If exact match not found, try finding any mp4 with audio > 720p?
        // Or if data.link exists (sometimes global fallback)
        if (data.link) return data.link;

        throw new Error(`Could not retrieve a merged ${qualityLabel} link from API. Try a different quality.`);

    } catch (e) {
        console.error("Bridge Link Error:", e);
        throw e;
    }
};

export const mergeYouTubeVideoAudio = async (videoUrl, audioUrl, targetFormat = 'mp4') => {
    if (!ffmpeg) await loadFFmpeg();

    // We need to proxy these URLs usually, or fetch them if CORS allows
    // Assuming CORS allows or using a proxy would be needed, but let's try direct fetch
    // If CORS fails, we are stuck. But many YT formats work.

    try {
        const videoData = await fetchFile(videoUrl);
        const audioData = await fetchFile(audioUrl);

        await ffmpeg.writeFile('input_video.mp4', videoData);
        await ffmpeg.writeFile('input_audio.m4a', audioData);

        // Muxing with copy is fast
        await ffmpeg.exec(['-i', 'input_video.mp4', '-i', 'input_audio.m4a', '-c', 'copy', 'output.mp4']);

        const data = await ffmpeg.readFile('output.mp4');

        // Cleanup
        await ffmpeg.deleteFile('input_video.mp4');
        await ffmpeg.deleteFile('input_audio.m4a');
        await ffmpeg.deleteFile('output.mp4');

        return new Blob([data.buffer], { type: 'video/mp4' });
    } catch (e) {
        console.error("Merge error:", e);
        throw new Error("Failed to merge audio/video. " + e.message);
    }
};
