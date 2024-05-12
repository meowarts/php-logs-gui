import React, { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

function App() {
  const [logData, setLogData] = useState('');

  useEffect(() => {
    ipcRenderer.on('log-update', (event, data) => {
      setLogData(data);
    });

    return () => {
      ipcRenderer.removeAllListeners('log-update');
    };
  }, []);

  return (
    <div>
      <h1>PHP Error Logs</h1>
      <textarea readOnly value={logData} style={{ width: '100%', height: '300px' }} />
    </div>
  );
}

export default App;
