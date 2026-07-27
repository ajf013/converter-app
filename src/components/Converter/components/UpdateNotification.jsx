import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, List } from 'semantic-ui-react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_VERSION = '1.5.0';

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
                                We've added 5 new powerful tools and completely fixed dropdown menu visibility across all devices!
                            </p>
                            <h4 style={{ color: 'white', marginBottom: '12px' }}>What's New in v1.5.0:</h4>
                            
                            <List relaxed style={{ color: 'white' }}>
                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="compress" color="orange" size="large" />
                                    <div>
                                        <strong>Standalone Image Compressor</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Dedicated compression tool with quality presets, real-time size reduction tracking, and batch ZIP downloads.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="window restore" color="green" size="large" />
                                    <div>
                                        <strong>Favicon & App Icon Generator</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Generate multi-resolution favicons (`16x16` to `512x512`), `site.webmanifest`, and copyable HTML link code tags.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="shield" color="purple" size="large" />
                                    <div>
                                        <strong>File Checksum & String Hash Generator</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Calculate SHA-256, SHA-512, SHA-1, and MD5 hashes in real-time with an integrated Checksum Verification Matcher.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="eye slash" color="teal" size="large" />
                                    <div>
                                        <strong>EXIF Metadata & Privacy Cleaner</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Strip hidden camera info, timestamps, and GPS location tags from photos before sharing online.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="database" color="red" size="large" />
                                    <div>
                                        <strong>JSON / CSV / SQL Data Suite</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Convert and format between CSV spreadsheet data, pretty/minified JSON arrays, and SQL INSERT statements.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="object group" color="blue" size="large" />
                                    <div>
                                        <strong>Dropdown UI & Visibility Fix</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Elevated card stacking context and solid opaque menus so dropdown options display crisp and unobscured.
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
