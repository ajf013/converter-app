import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, List } from 'semantic-ui-react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_VERSION = '1.4.0';

const UpdateNotification = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        try {
            const lastSeenVersion = localStorage.getItem('app_seen_version');
            if (lastSeenVersion !== CURRENT_VERSION) {
                setIsOpen(true);
            }
        } catch (e) {
            console.error('Failed to read version from localStorage:', e);
        }
    }, []);

    const handleDismiss = () => {
        try {
            localStorage.setItem('app_seen_version', CURRENT_VERSION);
            setIsOpen(false);
        } catch (e) {
            console.error('Failed to save version to localStorage:', e);
        }
    };

    const handleHardRefresh = async () => {
        setRefreshing(true);
        try {
            // Unregister all PWA Service Workers
            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // Clear Cache Storage completely
            if (window.caches) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            // Save the version before reload so they don't see it again
            localStorage.setItem('app_seen_version', CURRENT_VERSION);
            
            // Perform hard reload
            window.location.reload();
        } catch (err) {
            console.error('Hard refresh failed:', err);
            window.location.reload();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Modal
                    open={isOpen}
                    onClose={handleDismiss}
                    closeOnDimmerClick={false}
                    size="small"
                    style={{
                        background: 'rgba(27, 27, 27, 0.85)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        color: 'white',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                        padding: '10px'
                    }}
                >
                    <Modal.Header style={{ background: 'transparent', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon name="rocket" color="teal" />
                        <span>Major App Update! (v{CURRENT_VERSION})</span>
                    </Modal.Header>
                    <Modal.Content style={{ background: 'transparent', color: 'white', padding: '20px' }}>
                        <Modal.Description>
                            <p style={{ fontSize: '1.1rem', marginBottom: '18px', color: '#00dbde', fontWeight: 'bold' }}>
                                We've added a brand new AI Watermark Remover and completely redesigned our UI & Themes!
                            </p>
                            <h4 style={{ color: 'white', marginBottom: '12px' }}>What's New:</h4>
                            
                            <List relaxed style={{ color: 'white' }}>
                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="shield alternate" color="teal" size="large" />
                                    <div>
                                        <strong>Universal Watermark Remover</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Strip text watermarks, backgrounds, and layout image stamps from PDF, Word (.docx), and Excel (.xlsx) files locally.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="magic" color="blue" size="large" />
                                    <div>
                                        <strong>AI-Powered Auto-Detection</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Leverage Azure OpenAI (GPT-4o) to automatically detect and align watermarks. Includes canvas scans for PDF and unzipped layouts for Word.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="theme" color="purple" size="large" />
                                    <div>
                                        <strong>Redesigned Glassmorphic UI</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Premium frosted cards, wandering background gradient blobs, dynamic hover scale lifters, and custom Semantic UI style overrides.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="adjust" color="orange" size="large" />
                                    <div>
                                        <strong>Cosmic Dark & Alabaster Light Modes</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Choose between a glowing dark theme or a soft paper-like light theme, both calibrated with perfect text readability and contrast.
                                        </p>
                                    </div>
                                </List.Item>
                            </List>
                        </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions style={{ background: 'transparent', borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <Button 
                            color="orange" 
                            basic
                            onClick={handleHardRefresh} 
                            loading={refreshing}
                        >
                            <Icon name="refresh" /> Force Hard Refresh
                        </Button>
                        <Button 
                            color="teal" 
                            onClick={handleDismiss}
                        >
                            Explore Now <Icon name="chevron right" />
                        </Button>
                    </Modal.Actions>
                </Modal>
            )}
        </AnimatePresence>
    );
};

export default UpdateNotification;
