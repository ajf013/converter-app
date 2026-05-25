# Types of Converter 🛠️

A premium, all-in-one file conversion Progressive Web App (PWA) built with React, Vite, and Capacitor. Convert images, documents, and audio files entirely client-side with a beautiful glassmorphism UI, tabbed layouts, file previews, and native sharing.

## 🌐 Live Demo
🔗 **Live Site:** [https://typesofconverter.netlify.app/](https://typesofconverter.netlify.app/)

---

## 🛠️ Tech Stack & Versions

| Technology | Badge / Icon | Version | Description |
| :--- | :--- | :--- | :--- |
| **React** | ![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB) | `v18.2.0` | Frontend UI Component rendering |
| **Vite** | ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat-square&logo=vite&logoColor=white) | `v7.2.4` | High-speed frontend build engine |
| **Capacitor** | ![Capacitor](https://img.shields.io/badge/capacitor-%23119EFF.svg?style=flat-square&logo=capacitor&logoColor=white) | `v8.3.1` | Native Android & iOS wrapper layer |
| **FFmpeg.wasm** | ![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=flat-square&logo=webassembly&logoColor=white) | `v0.12.15` | Client-side audio processing |
| **Tesseract.js** | ![OCR](https://img.shields.io/badge/OCR-Tesseract.js-green?style=flat-square) | `v7.0.0` | Client-side Image-to-Text OCR |
| **SheetJS** | ![Excel](https://img.shields.io/badge/xlsx-%23107C41.svg?style=flat-square&logo=microsoftexcel&logoColor=white) | `v0.18.5` | Spreadsheet parser and generator |
| **jsPDF** | ![PDF](https://img.shields.io/badge/jsPDF-%23F40F02.svg?style=flat-square&logo=adobeacrobatreader&logoColor=white) | `v3.0.4` | Document-to-PDF generator |
| **Framer Motion** | ![Framer Motion](https://img.shields.io/badge/Framer--Motion-black?style=flat-square&logo=framer&logoColor=white) | `v12.23.26` | Animated components and transitions |
| **Semantic UI** | ![Semantic UI](https://img.shields.io/badge/Semantic--UI-Semantic--UI--React-blue?style=flat-square) | `v2.1.5` | Form layout and utility UI controls |

---

## 🚀 What's New in Version 1.1.0 ✨

* 🗂️ **Categorized Navigation Tabs:** Redesigned layout to filter and group tools into specific tabs (*All Tools*, *Image Tools*, *Audio & Video*, *Documents & OCR*, *YouTube Downloader*).
* 🖼️ **Image Previews:** Users can now see a thumbnail preview of their selected images inside the dropzone prior to starting conversions.
* 📱 **Native Share Integration:** Uses the Web Share API to activate iOS and Android share sheets natively, letting users share files immediately to WhatsApp, Slack, etc.
* 🎨 **Global Design System Fixes:** Added root variables inside `index.css` to fix dark/light mode rendering variables.
* ⚙️ **Code Modularization:** Converted the massive monolithic layout into decoupled sub-components inside the `components/Converter/components` folder for clean engineering.

---

## 🏗️ Architecture & Component Flow

### System Architecture
The app runs completely client-side in the browser or mobile WebView sandbox. No user files are sent to backend servers, providing total data privacy.

```mermaid
graph TD
    User([User Interface])
    subgraph UI ["App Shell (React v18)"]
        Header[Header & Theme Toggle]
        Tabs[Category Tabs Selector]
        Dashboard{Dashboard Router}
        Reload[Reload Prompt / Update Notifier]
    end

    subgraph Converters ["Converter Sub-Components"]
        ImgC[Image Converter]
        DocC[Document Converter]
        AudC[Audio Converter]
        YtC[Youtube Converter]
        OcrC[OCR Text Extractor]
        CutC[Audio Cutter]
        JoinC[Audio Joiner]
        VidC[Video Extractor]
    end

    subgraph Engines ["Local Execution Engines"]
        Canvas[HTML5 Canvas API]
        Ffmpeg[FFmpeg.wasm WebAssembly]
        Tesseract[Tesseract.js OCR Engine]
        SheetJS[SheetJS Parser]
        JsPDF[jsPDF Generator]
    end

    subgraph Actions ["Output Actions"]
        Download[Standard Download]
        Share[Native Mobile Share Sheet]
    end

    User --> Header
    User --> Tabs
    Tabs --> Dashboard
    Dashboard --> ImgC & DocC & AudC & OcrC & CutC & JoinC & VidC & YtC

    ImgC --> Canvas
    AudC --> Ffmpeg
    CutC --> Ffmpeg
    JoinC --> Ffmpeg
    VidC --> Ffmpeg
    OcrC --> Tesseract
    DocC --> SheetJS & JsPDF

    Canvas & Ffmpeg & Tesseract & SheetJS & JsPDF --> Actions
    Actions --> Download
    Actions --> Share
```

### Conversion Lifecycle Flowchart

```mermaid
flowchart TD
    Start([User Drops File]) --> Validate{Is File Valid?}
    Validate -- No --> Error[Show Error Message]
    Validate -- Yes --> FilePreview[Render Visual File Preview]
    
    FilePreview --> SelectFormat[Select Output Format]
    SelectFormat --> ClickConvert[Click Convert]
    
    ClickConvert --> Processing[Process File Client-Side]
    Processing --> ConversionSuccess{Conversion Success?}
    
    ConversionSuccess -- No --> ConversionError[Show Conversion Error Alert]
    ConversionSuccess -- Yes --> ShowResult[Display Download & Share Buttons]
    
    ShowResult --> ClickAction{User Choice}
    ClickAction -- Download --> BrowserDownload[Browser initiates standard download]
    ClickAction -- Share --> CheckShareAPI{Device Supports Sharing?}
    
    CheckShareAPI -- Yes --> NativeShare[Open native Android/iOS share sheet]
    CheckShareAPI -- No --> BrowserDownload
```

---

## 📂 Directory Tree Structure

```text
converter-app/
├── android/                   # Android Capacitor Project
├── public/                    # PWA Icons and Static Assets
├── src/
│   ├── assets/                # Local Assets
│   ├── components/            # React UI Components
│   │   ├── Converter/         # Main Converter Dashboard
│   │   │   ├── components/    # Modular Converter Toolcards
│   │   │   │   ├── AudioConverter.jsx
│   │   │   │   ├── AudioCutter.jsx
│   │   │   │   ├── AudioJoiner.jsx
│   │   │   │   ├── DocConverter.jsx
│   │   │   │   ├── ImageConverter.jsx
│   │   │   │   ├── OcrConverter.jsx
│   │   │   │   ├── VideoExtractor.jsx
│   │   │   │   └── YoutubeConverter.jsx
│   │   │   ├── Converter.css  # Tab and Card Styling
│   │   │   └── Converter.jsx  # Main Dashboard Controller
│   │   ├── Footer/            # Footer Social component
│   │   ├── Header/            # Sticky Header & Theme toggle
│   │   └── ReloadPrompt/      # PWA Live Update Notifier
│   ├── contexts/              # Light/Dark Theme Contexts
│   ├── utils/
│   │   ├── conversionUtils.js # SheetJS, jsPDF, FFmpeg modules
│   │   └── shareUtils.js      # Web Share API wrapper
│   ├── App.css                # Global backgrounds and scrollbars
│   ├── App.jsx                # Main Application Shell
│   ├── index.css              # Design system styling tokens
│   └── main.jsx               # Entry-point initialization
├── capacitor.config.json      # Native Mobile Wrapper Settings
├── eslint.config.js           # Lint Rules Config
├── package.json               # Manifest (v1.1.0) & Scripts
├── README.md                  # Project Documentation
└── vite.config.js             # DevServer headers and PWA plugin
```

---

## 🔄 Mobile Updates & Auto-Update Mechanism

### 1. PWA Browser Updates
When static assets change on production, the service worker detects the updated hash. `ReloadPrompt` notifies users with a custom alert listing the **v1.1.0 updates**, inviting them to tap **Update Now** to load the new code instantly.

### 2. Capacitor (Android/iOS) Native Updates
To ensure native mobile users receive updates seamlessly without manually updating through the Play Store/App Store, we recommend integrating:
* **Capgo OTA (Over-the-Air) updates:** Configured inside `capacitor.config.json` to fetch the latest production JavaScript bundle from Netlify/Vercel on app startup and refresh the webview immediately in the background.
* **Ionic Appflow Live Updates:** Serves the new JS/HTML payload automatically to native wrappers on boot.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation & Run

1.  Clone the repository:
    ```bash
    git clone https://github.com/ajf013/converter-app.git
    cd converter-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173`.

---

## 👨‍💻 Author
**Francis Cruz**
- [GitHub](https://github.com/ajf013)
- [LinkedIn](https://www.linkedin.com/in/ajf013-francis-cruz/)
- [Gmail](mailto:jeni13franc@gmail.com)