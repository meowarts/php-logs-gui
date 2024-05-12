import React, { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

const bodyStyle = {
  display: 'flex',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
  height: '100vh',
  backgroundColor: '#212121',
  color: 'white',
};

const actionBarStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: 15,
  borderBottom: '1px solid #444',
};

const labelStyle = {
  fontSize: 20,
  fontWeight: 'bold',
  marginRight: 10,
};

const logsContainerStyle = {
  overflowY: 'scroll',
  width: '70%', // Adjusted for sidebar
  height: 'calc(100vh - 50px)', // Adjust based on your actual header size
};

const logEntryStyle = {
  padding: '8px',
  borderBottom: '1px solid #444',
  cursor: 'pointer',
};

const sidebarStyle = {
  width: '30%', // Sidebar taking 30% of the view
  height: '100vh',
  overflowY: 'scroll',
  backgroundColor: '#333',
  padding: '10px',
};

const stackTraceStyle = {
  fontSize: 'smaller',
  color: '#888', // Lighter color to differentiate stack trace
};

function App() {
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    ipcRenderer.on('log-update', (event, data) => {
      setLogData(data);
    });

    ipcRenderer.on('selected-file', (event, filePath) => {
      ipcRenderer.send('watch-log-file', filePath);
    });

    return () => {
      ipcRenderer.removeAllListeners('log-update');
      ipcRenderer.removeAllListeners('selected-file');
    };
  }, []);

  const switchFile = () => {
    ipcRenderer.send('open-file-dialog');
  };

  return (
    <div style={bodyStyle}>
      <div style={logsContainerStyle}>
        <div style={actionBarStyle}>
          <label style={labelStyle}>PHP Error Logs</label>
          <button onClick={switchFile}>Switch Log File</button>
        </div>
        {logData.map((entry, index) => (
          <div key={index} style={logEntryStyle} className="error-block" onClick={() => setSelectedEntry(entry)}>
            {entry.error}
          </div>
        ))}
      </div>
      {selectedEntry && (
        <div style={sidebarStyle}>
          <div style={{ fontWeight: 'bold' }}>Stack Trace:</div>
          {selectedEntry.stacktrace.map((line, idx) => (
            <div key={idx} style={stackTraceStyle}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
