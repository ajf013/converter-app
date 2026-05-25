import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Message, Button, Icon } from 'semantic-ui-react';
import './ReloadPrompt.css';

function ReloadPrompt() {
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
                        {offlineReady ? 'App Ready for Offline' : 'New Update Available (v1.1.0)!'}
                    </Message.Header>
                    {offlineReady ? (
                        'App is ready to work offline.'
                    ) : (
                        <div style={{ marginTop: '5px' }}>
                            <p style={{ margin: '0 0 8px 0' }}>We've updated the app! Click below to apply these new features:</p>
                            <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                <li>🗂️ <strong>Categorized Tabs:</strong> Clean tab bar to switch tool categories.</li>
                                <li>🖼️ <strong>Image Previews:</strong> View thumbnails of selected images.</li>
                                <li>📱 <strong>Native Share:</strong> Tap share to natively send files on mobile.</li>
                                <li>🎨 <strong>Theme & UI Fixes:</strong> Better light/dark mode variables styling.</li>
                            </ul>
                        </div>
                    )}
                    <div className="reload-prompt-buttons">
                        {needUpdate && (
                            <Button primary size="small" onClick={() => updateServiceWorker(true)}>
                                Update Now
                            </Button>
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
