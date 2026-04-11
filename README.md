# Types of Converter

A premium, all-in-one file conversion Progressive Web App (PWA) built with React and Vite. Convert images, documents, and audio files entirely client-side with a beautiful glassmorphism UI.

## 🌐 Live Demo

🔗 **Live Site:** 
[https://typesofconverter.netlify.app/](https://typesofconverter.netlify.app/)

![Hero Dark Mode](public/screenshots/hero-dark.png)

## ✨ Features

### 1. 🖼️ Image Converter
Convert between common image formats instantly.
- **Supported Inputs**: PNG, JPG, BMP, WEBP, GIF
- **Supported Outputs**: PNG, JPG, WEBP, BMP, GIF
- **Features**: Drag & Drop support, Client-side processing (Privacy focused).

### 2. 📄 Document Converter
Handle document and spreadsheet conversions with ease.
- **Spreadsheets**: Convert Excel (`XLSX`, `XLS`) to `CSV`, `JSON`, `HTML`, or `TXT`.
- **Documents**: Convert Word (`DOCX`) and Text (`TXT`) to `PDF`.
- **Smart Detection**: Automatically detects input type and shows relevant conversion options.

### 3. 🎵 Music Converter
**New Feature!** Powerful audio conversion running directly in your browser using WebAssembly.
- **Supported Formats**: MP3, WAV, OGG, AAC.
- **Technology**: Powered by `ffmpeg.wasm`.
- **Performance**: Multi-threaded encoding (requires COEP headers).

### 4. 📝 Image to Text (OCR)
**New Feature!** Extract text from images instantly using Tesseract.js.
- **Language Support**: English, Tamil, and Auto-Detection.
- **Features**: Copy to clipboard, Download as `.txt`.
- **Privacy**: All processing happens locally; no images are uploaded to any server.

### 5. ✂️ Audio Tools
A suite of tools to manipulate audio files directly in the browser.
- **Audio Cutter**: Trim audio files with precision.
    - *Visual Waveform*: See the audio you're cutting.
    - *Real-time Player*: Preview the selection before cutting.
    - *Smart Input*: Type start/end times or use "Current Time" buttons.
- **Audio Joiner**: Merge multiple audio tracks into a single MP3.
- **Video to Audio**: Extract MP3 audio from any video file. 

### 6. 📺 YouTube to MP3 Converter
**Enhanced Feature!** Convert and download audio directly from YouTube via the ReClip downloader.
- **Seamless Integration**: Directly redirects to [downloader.fcruz.org](https://downloader.fcruz.org/) with your link.
- **Fast & Reliable**: Leverages the high-performance ReClip conversion engine.
- **Format**: High-quality MP3 output.

![YouTube Converter UI](public/screenshots/youtube-feature.png)

### 7. 🎨 Premium Design
- **Synchronization**: Local UI is 100% synchronized with the official [typesofconverter.netlify.app](https://typesofconverter.netlify.app/) deployment.
- **Glassmorphism**: Beautiful frosted glass cards with `16px` blur and high-radius corners.
- **Animations**: Smooth entrance animations (Framer Motion) and hover effects.
- **Themes**: Fully functional **Dark/Light mode** toggle with vibrant animated gradients.

![Light Mode Dashboard](public/screenshots/dashboard-light.png)

### 8. 📱 PWA Support
- Installable as a native-like app on Desktop and Mobile.
- Offline capability enabled via `vite-plugin-pwa`.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ajf013/converter-app.git
    cd converter-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` (or the port shown in terminal).

### ⚠️ Note on Audio Conversion
To enable the **Music Converter**, the server must serve files with specific security headers (`Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy`). This is already configured in `vite.config.js` for development.

## 🛠️ Built With
- **React 18** - UI Library
- **Vite** - Build Tool
- **Semantic UI React** - Component Framework
- **Framer Motion** - Animations
- **FFmpeg.wasm** - Audio Processing
- **SheetJS (xlsx)** - Spreadsheet Processing
- **jsPDF & Mammoth** - Document Processing

## 👨‍💻 Author
**Francis Cruz**
- [GitHub](https://github.com/ajf013)
- [LinkedIn](https://www.linkedin.com/in/ajf013-francis-cruz/)

## You can reach out 😊😊
Feel free to contact me about the problems. I will try to help as much as I can 😉

[![Linkedin Badge](https://img.shields.io/badge/linkedin-%230077B5.svg?&style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ajf013-francis-cruz/)
[![Mail Badge](https://img.shields.io/badge/email-c14438?style=for-the-badge&logo=Gmail&logoColor=white)](mailto:cruzmma2021@gmail.com)
[![Github Badge](https://img.shields.io/badge/github-333?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ajf013)