import { useEffect, useState } from 'react';

export default function TabConfigPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const teams = (window as any).microsoftTeams;
    if (teams) {
      teams.app.initialize().then(() => {
        teams.pages.config.registerOnSaveHandler((saveEvent: any) => {
          teams.pages.config.setConfig({
            entityId: 'hr-portal-tab',
            contentUrl: window.location.origin + '/portal',
            suggestedDisplayName: 'HR Portal',
          });
          saveEvent.notifySuccess();
        });
        teams.pages.config.setValidityState(true);
        setReady(true);
      });
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#1e1e2e', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>HR Portal Tab</h2>
        <p style={{ opacity: 0.7 }}>{ready ? 'Click Save to add the HR Portal to this channel.' : 'Initializing...'}</p>
      </div>
    </div>
  );
}
