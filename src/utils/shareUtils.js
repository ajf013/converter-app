/**
 * Share a converted file natively using Web Share API (supported on mobile browsers and Capacitor webviews).
 * Falls back to standard download if sharing is unsupported.
 * 
 * @param {Blob} blob - The file blob to share
 * @param {string} fileName - The name of the file
 * @param {string} mimeType - The mime type of the file
 * @returns {Promise<boolean>} - Resolves to true if shared, false if fell back to download
 */
export const shareFile = async (blob, fileName, mimeType) => {
    try {
        const file = new File([blob], fileName, { type: mimeType });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Converted File: ${fileName}`,
                text: 'Here is your converted file from Types of Converter.'
            });
            return true;
        }
    } catch (err) {
        // User cancelled share or share failed
        console.warn('Share API failed or was cancelled:', err);
    }
    return false;
};
