import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, List } from 'semantic-ui-react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_VERSION = '1.2.0';

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
                                We've packed this release with powerful new offline utility tools and layout updates!
                            </p>
                            <h4 style={{ color: 'white', marginBottom: '12px' }}>What's New:</h4>
                            
                            <List relaxed style={{ color: 'white' }}>
                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="file pdf" color="red" size="large" />
                                    <div>
                                        <strong>PDF Utilities Tab</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Merge multiple PDFs, split PDF pages, and secure/unlock documents using client-side password protection.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="images" color="blue" size="large" />
                                    <div>
                                        <strong>Batch Image Converter & Controls</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Convert multiple images at once, customize resizing (by percentage scale or pixel aspect ratio lock), compress quality, and download all as a single ZIP.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="eye dropper" color="teal" size="large" />
                                    <div>
                                        <strong>Color & Design Utilities</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Extract dominant color palettes from images, and convert color codes instantly in real-time (HEX, RGB, HSL, CMYK).
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="qrcode" color="purple" size="large" />
                                    <div>
                                        <strong>QR Code Suite</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Generate styled QR codes for links, Wi-Fi networks, and contact vCards. Scan QR codes via user-granted webcam or file uploads.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="key" color="orange" size="large" />
                                    <div>
                                        <strong>Base64 File Converter</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Convert files to copyable Base64 strings and decode strings back to downloadable file binary formats.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="history" color="green" size="large" />
                                    <div>
                                        <strong>Conversion History Log & Settings</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Access your local transaction logs in browser storage, customize alert completion sound chimes, and toggle auto-download preferences.
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
