export const getHistory = () => {
    try {
        return JSON.parse(localStorage.getItem('conversion_history') || '[]');
    } catch (err) {
        console.error('Failed to get history:', err);
        return [];
    }
};

export const clearHistory = () => {
    try {
        localStorage.removeItem('conversion_history');
        window.dispatchEvent(new Event('history_updated'));
    } catch (err) {
        console.error('Failed to clear history:', err);
    }
};

export const getSettings = () => {
    try {
        return JSON.parse(localStorage.getItem('converter_settings') || '{"soundEnabled":true,"autoDownload":true}');
    } catch (err) {
        console.warn('Failed to parse settings, using defaults:', err);
        return { soundEnabled: true, autoDownload: true };
    }
};

export const saveSettings = (settings) => {
    try {
        localStorage.setItem('converter_settings', JSON.stringify(settings));
        window.dispatchEvent(new Event('settings_updated'));
    } catch (err) {
        console.error('Failed to save settings:', err);
    }
};

export const addHistoryEntry = (fileName, type, resultStatus = 'Success') => {
    try {
        const history = getHistory();
        const newEntry = {
            id: Date.now().toString(),
            fileName,
            type,
            timestamp: new Date().toLocaleString(),
            status: resultStatus
        };
        history.unshift(newEntry);
        localStorage.setItem('conversion_history', JSON.stringify(history.slice(0, 100)));
        window.dispatchEvent(new Event('history_updated'));

        const settings = getSettings();
        if (settings.soundEnabled && resultStatus === 'Success') {
            playCompletionSound();
        }
    } catch (err) {
        console.error('Failed to add history entry:', err);
    }
};

const playCompletionSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        // Clean high chime sound
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc1.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.15); // C6

        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.55);
        osc2.stop(audioCtx.currentTime + 0.55);
    } catch (e) {
        console.warn('Web Audio completion sound blocked or unsupported:', e);
    }
};
