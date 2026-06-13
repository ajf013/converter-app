import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Message, Button, Icon } from 'semantic-ui-react';
import { version } from '../../../package.json';
import './ReloadPrompt.css';

function ReloadPrompt() {
    const [refreshing, setRefreshing] = useState(false);

    const handleHardRefresh = async () => {
        setRefreshing(true);
        try {
            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if (window.caches) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }
            window.location.reload();
        } catch (err) {
            console.error('Hard refresh failed:', err);
            window.location.reload();
        } finally {
            setRefreshing(false);
        }
    };
    const swResult = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    // Handle cases where the hook might return differently or fail
    if (!swResult || !swResult.offlineReady || !swResult.needUpdate) {
        return null;
    }

    const [offlineReady, setOfflineReady] = swResult.offlineReady;
    const [needUpdate, setNeedUpdate] = swResult.needUpdate;
    const { updateServiceWorker } = swResult;

    const close = () => {
        setOfflineReady(false);
        setNeedUpdate(false);
    };

    if (!offlineReady && !needUpdate) return null;

    return (
        <div className="reload-prompt-container">
            <Message icon info className="reload-prompt-message" floating>
                <Icon name={offlineReady ? 'check circle' : 'cloud download'} />
                <Message.Content>
                    <Message.Header>
                        {offlineReady ? 'App Ready for Offline' : `New Update Available (v${version})!`}
                    </Message.Header>
                    {offlineReady ? (
                        'App is ready to work offline.'
                    ) : (
                        <div style={{ marginTop: '5px' }}>
                            <p style={{ margin: '0 0 8px 0' }}>We've updated the app with advanced client-side PDF converters:</p>
                            <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                <li>🔄 <strong>Convert PDF Tab:</strong> Office file converters (Word, Excel, PPTX to and from PDF).</li>
                                <li>✍️ <strong>Sign PDF:</strong> Draw your signature and visually stamp it on PDF pages.</li>
                                <li>🗜️ <strong>Compress PDF:</strong> Downscale and optimize images in PDFs client-side.</li>
                                <li>🖼️ <strong>PDF to JPG:</strong> Extract and download PDF pages as JPGs inside a ZIP archive.</li>
                            </ul>
                        </div>
                    )}
                    <div className="reload-prompt-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {needUpdate && (
                            <>
                                <Button primary size="small" onClick={() => updateServiceWorker(true)}>
                                    Update Now
                                </Button>
                                <Button color="orange" size="small" onClick={handleHardRefresh} loading={refreshing}>
                                    <Icon name="refresh" /> Hard Refresh
                                </Button>
                            </>
                        )}
                        <Button size="small" onClick={close}>
                            Close
                        </Button>
                    </div>
                </Message.Content>
            </Message>
        </div>
    );
}

export default ReloadPrompt;
