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
                        {offlineReady ? 'App Ready for Offline' : 'Update Available!'}
                    </Message.Header>
                    {offlineReady
                        ? 'App is ready to work offline.'
                        : 'A new version of the app is available. Please update for the latest features.'}
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
