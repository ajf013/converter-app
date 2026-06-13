import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, List } from 'semantic-ui-react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_VERSION = '1.3.0';

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
                                We've added a brand new PDF conversion suite and advanced offline tools!
                            </p>
                            <h4 style={{ color: 'white', marginBottom: '12px' }}>What's New:</h4>
                            
                            <List relaxed style={{ color: 'white' }}>
                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="exchange" color="blue" size="large" />
                                    <div>
                                        <strong>Convert PDF Tab</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Dedicated layout tab housing Microsoft Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) converters.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="file pdf outline" color="red" size="large" />
                                    <div>
                                        <strong>PDF to Office / Image Conversions</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Extract layout paragraphs, sheets, and outline formats back into Word, Excel, PowerPoint, or JPG pages (.zip archive).
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="pencil" color="teal" size="large" />
                                    <div>
                                        <strong>Sign PDF</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Draw your digital signature directly on canvas and stamp it on any page range with custom scaling.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="compress" color="green" size="large" />
                                    <div>
                                        <strong>Compress PDF</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Optimize and downscale images in your PDF stream to shrink file size client-side.
                                        </p>
                                    </div>
                                </List.Item>

                                <List.Item style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <Icon name="archive" color="purple" size="large" />
                                    <div>
                                        <strong>PDF to PDF/A</strong>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>
                                            Archive your document with standard ISO-conforming PDF/A metadata headers.
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
