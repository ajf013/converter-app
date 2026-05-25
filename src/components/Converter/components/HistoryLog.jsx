import React, { useState, useEffect } from 'react';
import { Icon, Button, Header as SemanticHeader, List, Checkbox } from 'semantic-ui-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory, clearHistory, getSettings, saveSettings } from '../../../utils/historyUtils';

const HistoryLog = ({ isOpen, onClose }) => {
    const [historyList, setHistoryList] = useState(() => getHistory());
    const [activeTab, setActiveTab] = useState('history'); // 'history' or 'settings'
    const [settings, setSettingsState] = useState(() => getSettings());

    const loadHistory = () => {
        setHistoryList(getHistory());
    };

    const loadSettings = () => {
        setSettingsState(getSettings());
    };

    useEffect(() => {
        // Listen for history/settings update events
        window.addEventListener('history_updated', loadHistory);
        window.addEventListener('settings_updated', loadSettings);

        return () => {
            window.removeEventListener('history_updated', loadHistory);
            window.removeEventListener('settings_updated', loadSettings);
        };
    }, []);

    const handleClear = () => {
        if (confirm('Are you sure you want to clear all history logs?')) {
            clearHistory();
        }
    };

    const handleToggleSound = (_, data) => {
        const newSettings = { ...settings, soundEnabled: data.checked };
        setSettingsState(newSettings);
        saveSettings(newSettings);
    };

    const handleToggleDownload = (_, data) => {
        const newSettings = { ...settings, autoDownload: data.checked };
        setSettingsState(newSettings);
        saveSettings(newSettings);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Drawer Backdrop Overlay */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#000',
                            zIndex: 1000,
                            cursor: 'pointer'
                        }}
                    />

                    {/* Sliding Drawer Container */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '380px',
                            maxWidth: '100%',
                            background: 'rgba(27, 27, 27, 0.85)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                            zIndex: 1001,
                            padding: '30px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            color: 'white'
                        }}
                    >
                        {/* Drawer Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <SemanticHeader as='h2' style={{ color: 'white', margin: 0 }}>
                                <Icon name='settings' style={{ fontSize: '1.5rem', marginRight: '8px' }} />
                                Settings & Log
                            </SemanticHeader>
                            <Button 
                                icon='close' 
                                circular 
                                size='small' 
                                color='black' 
                                onClick={onClose} 
                                aria-label="Close settings"
                            />
                        </div>

                        {/* Tabs Navigation */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <Button 
                                size='small' 
                                active={activeTab === 'history'} 
                                color={activeTab === 'history' ? 'teal' : 'grey'}
                                onClick={() => setActiveTab('history')}
                                style={{ flex: 1 }}
                            >
                                History
                            </Button>
                            <Button 
                                size='small' 
                                active={activeTab === 'settings'} 
                                color={activeTab === 'settings' ? 'teal' : 'grey'}
                                onClick={() => setActiveTab('settings')}
                                style={{ flex: 1 }}
                            >
                                Settings
                            </Button>
                        </div>

                        {/* Tab Contents */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeTab === 'history' ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
                                        {historyList.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '40px' }}>
                                                <Icon name='history' size='huge' style={{ marginBottom: '15px' }} />
                                                <p>No conversion history yet.</p>
                                            </div>
                                        ) : (
                                            <List divided style={{ width: '100%' }}>
                                                {historyList.map((entry) => (
                                                    <List.Item key={entry.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                            <Icon 
                                                                name={entry.status === 'Success' ? 'check circle' : 'times circle'} 
                                                                color={entry.status === 'Success' ? 'green' : 'red'} 
                                                                style={{ marginTop: '2px' }}
                                                            />
                                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                                <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem', wordBreak: 'break-all' }}>{entry.fileName}</div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                                                    <span>{entry.type}</span>
                                                                    <span>{entry.timestamp}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </List.Item>
                                                ))}
                                            </List>
                                        )}
                                    </div>
                                    {historyList.length > 0 && (
                                        <Button 
                                            color='red' 
                                            fluid 
                                            onClick={handleClear}
                                        >
                                            Clear All History
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', padding: '10px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ color: 'white', margin: '0 0 4px 0' }}>Sound Alerts</h4>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Play a chime when conversions finish.</p>
                                        </div>
                                        <Checkbox 
                                            toggle 
                                            checked={settings.soundEnabled} 
                                            onChange={handleToggleSound} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ color: 'white', margin: '0 0 4px 0' }}>Auto-Download</h4>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Automatically download files after conversion.</p>
                                        </div>
                                        <Checkbox 
                                            toggle 
                                            checked={settings.autoDownload} 
                                            onChange={handleToggleDownload} 
                                        />
                                    </div>

                                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                        <h4 style={{ color: 'white', marginBottom: '8px' }}>About Local App Storage</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                            All converted files, history logs, and preferences are processed and stored entirely in your local browser sandbox. No file data is sent to outer networks.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HistoryLog;
