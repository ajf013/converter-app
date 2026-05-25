import React, { useState } from 'react';
import { Icon, Button, Header as SemanticHeader, Input } from 'semantic-ui-react';
import { motion } from 'framer-motion';

// --- Conversion Helpers ---
const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r, g, b) => {
    const toHex = (c) => {
        const hex = Math.min(255, Math.max(0, c)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b).toUpperCase();
};

const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};

const rgbToCmyk = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
};

const cmykToRgb = (c, m, y, k) => {
    c /= 100;
    m /= 100;
    y /= 100;
    k /= 100;
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    return { r, g, b };
};

const ColorConverter = () => {
    const [hexVal, setHexVal] = useState('#00DBDE');
    const [rgbVal, setRgbVal] = useState('0, 219, 222');
    const [hslVal, setHslVal] = useState('180, 100, 44');
    const [cmykVal, setCmykVal] = useState('100, 1, 0, 13');
    
    const [copiedFormat, setCopiedFormat] = useState(null);

    const updateAll = (rgb) => {
        if (!rgb) return;
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

        setHexVal(hex);
        setRgbVal(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
        setHslVal(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
        setCmykVal(`${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`);
    };

    const handleHexChange = (e) => {
        const val = e.target.value;
        setHexVal(val);
        const rgb = hexToRgb(val);
        if (rgb) {
            updateAll(rgb);
        }
    };

    const handleRgbChange = (e) => {
        const val = e.target.value;
        setRgbVal(val);
        const parts = val.split(',').map(p => parseInt(p.trim(), 10));
        if (parts.length === 3 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
            const rgb = { r: parts[0], g: parts[1], b: parts[2] };
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

            setHexVal(hex);
            setHslVal(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
            setCmykVal(`${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`);
        }
    };

    const handleHslChange = (e) => {
        const val = e.target.value;
        setHslVal(val);
        const parts = val.replace(/%/g, '').split(',').map(p => parseInt(p.trim(), 10));
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const rgb = hslToRgb(parts[0], parts[1], parts[2]);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

            setHexVal(hex);
            setRgbVal(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
            setCmykVal(`${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`);
        }
    };

    const handleCmykChange = (e) => {
        const val = e.target.value;
        setCmykVal(val);
        const parts = val.replace(/%/g, '').split(',').map(p => parseInt(p.trim(), 10));
        if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 100)) {
            const rgb = cmykToRgb(parts[0], parts[1], parts[2], parts[3]);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

            setHexVal(hex);
            setRgbVal(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
            setHslVal(`${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
        }
    };

    const triggerPicker = (colorHex) => {
        const rgb = hexToRgb(colorHex);
        if (rgb) {
            updateAll(rgb);
        }
    };

    const copyToClipboard = (format, val) => {
        let cleanVal = val;
        if (format === 'rgb') cleanVal = `rgb(${val})`;
        if (format === 'hsl') cleanVal = `hsl(${val})`;
        if (format === 'cmyk') cleanVal = `cmyk(${val})`;
        
        navigator.clipboard.writeText(cleanVal);
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 1500);
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #FF5376 0%, #FF885B 100%)' }}>
                <Icon name='eye dropper' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>Color Converter</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Pick or paste a color to convert between hex, rgb, hsl, and cmyk.
            </p>

            {/* Interactive Preview Swatch + Native Picker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '20px', width: '100%', marginBottom: '25px', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '12px', background: hexVal, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', overflow: 'hidden' }}>
                    <input 
                        type="color" 
                        value={hexVal.length === 7 ? hexVal : '#00dbde'} 
                        onChange={(e) => triggerPicker(e.target.value)}
                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px', opacity: 0, cursor: 'pointer' }}
                    />
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <Icon name='paint brush' style={{ color: 'white', mixBlendMode: 'difference' }} />
                    </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                    <h4 style={{ color: 'white', margin: '0 0 4px 0' }}>Visual Preview</h4>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Click the swatch to open system color picker.</p>
                </div>
            </div>

            {/* Text Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                {/* HEX */}
                <div style={{ textAlign: 'left' }}>
                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>HEX</label>
                    <Input 
                        fluid
                        value={hexVal}
                        onChange={handleHexChange}
                        action={
                            <Button 
                                color='teal' 
                                icon={copiedFormat === 'hex' ? 'check' : 'copy'} 
                                onClick={() => copyToClipboard('hex', hexVal)} 
                            />
                        }
                    />
                </div>

                {/* RGB */}
                <div style={{ textAlign: 'left' }}>
                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>RGB (r, g, b)</label>
                    <Input 
                        fluid
                        value={rgbVal}
                        onChange={handleRgbChange}
                        action={
                            <Button 
                                color='teal' 
                                icon={copiedFormat === 'rgb' ? 'check' : 'copy'} 
                                onClick={() => copyToClipboard('rgb', rgbVal)} 
                            />
                        }
                    />
                </div>

                {/* HSL */}
                <div style={{ textAlign: 'left' }}>
                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>HSL (h, s%, l%)</label>
                    <Input 
                        fluid
                        value={hslVal}
                        onChange={handleHslChange}
                        action={
                            <Button 
                                color='teal' 
                                icon={copiedFormat === 'hsl' ? 'check' : 'copy'} 
                                onClick={() => copyToClipboard('hsl', hslVal)} 
                            />
                        }
                    />
                </div>

                {/* CMYK */}
                <div style={{ textAlign: 'left' }}>
                    <label style={{ color: 'white', fontSize: '0.8rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>CMYK (c%, m%, y%, k%)</label>
                    <Input 
                        fluid
                        value={cmykVal}
                        onChange={handleCmykChange}
                        action={
                            <Button 
                                color='teal' 
                                icon={copiedFormat === 'cmyk' ? 'check' : 'copy'} 
                                onClick={() => copyToClipboard('cmyk', cmykVal)} 
                            />
                        }
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ColorConverter;
