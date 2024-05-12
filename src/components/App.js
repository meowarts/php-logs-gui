import React, { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

const bodyStyle = {
  display: 'flex',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
  fontSize: 12,
  color: 'white',
  background: '#171717',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
};

const actionBarStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 15px',
  backgroundColor: '#212121',
};

const labelStyle = {
  fontSize: 15,
  marginRight: 10,
};

const buttonStyle = {
  padding: '5px 10px',
  backgroundColor: '#333',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  marginRight: '10px',
};

const contentStyle = {
  display: 'flex',
  flex: 'auto',
  overflow: 'hidden',
};

const logsContainerStyle = {
  overflowY: 'auto',
  flex: 'auto',
  padding: '10px',
  width: '80%', // Adjusted for sidebar
};

const logEntryStyle = {
  padding: '8px',
  borderRadius: '4px',
  marginBottom: '10px',
  cursor: 'pointer',
};

const dateStyle = {
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  padding: '2px 5px',
  borderRadius: '3px',
  fontSize: 11,
  float: 'right',
};

const messageStyle = {
};

const errorStyle = {
  backgroundColor: '#ae3e3e',
  color: '#ff7373'
};

const warningStyle = {
  backgroundColor: '#b0832c',
  color: '#ffce73'
};

const noticeStyle = {
  backgroundColor: '#33a542',
  color: '#8ae28a'
};

const lastTwentyMinutesStyle = {
  color: 'white',
};

const sidebarStyle = {
  width: '30%', // Sidebar taking 30% of the view
  height: '100vh',
  overflowY: 'scroll',
  backgroundColor: '#333',
  padding: '10px',
};

const stackTraceStyle = {
  color: '#888', // Lighter color to differentiate stack trace
};

const toFriendlyDate = (date) => {
  if (!date) {
    return '';
  }
  return date.toLocaleString();
};

const isLessThanTwentyMinutes = (date) => {
  if (!date) {
    return false;
  }
  return Date.now() - date.getTime() < 20 * 60 * 1000;
};

function App() {
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    
    ipcRenderer.on('log-update', (event, data) => {
      setLogData((prevData) => [...prevData, ...data]);
    });

    ipcRenderer.on('log-reset', (event, newFilePath) => {
      setLogData([]);
    });

    ipcRenderer.on('selected-file', (event, filePath) => {
      ipcRenderer.send('watch-another-file', filePath);
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
      <div style={actionBarStyle}>
        <label style={labelStyle}>PHP Error Logs</label>
        <button onClick={switchFile} style={buttonStyle}>Switch Log File</button>
        <button onClick={() => setLogData([])} style={buttonStyle}>Clear Logs</button>
      </div>
      <div style={contentStyle}>
        <div style={logsContainerStyle}>
          {logData.slice().reverse().slice(0, 60).map((entry, index) => (
            <div key={index}
              style={{
                ...logEntryStyle,
                ...(entry.type === 'error' ? errorStyle :
                  entry.type === 'warning' ? warningStyle :
                  entry.type === 'notice' ? noticeStyle : {}),
                ...(isLessThanTwentyMinutes(entry.date) ? lastTwentyMinutesStyle : {}),
              }}
              onClick={() => setSelectedEntry(entry)}>
              <div style={dateStyle}>{toFriendlyDate(entry.date)}</div>
              <div style={messageStyle}>{entry.message}</div>
            </div>
          ))}
        </div>
        {selectedEntry && selectedEntry.stacktrace?.length && (
          <div style={sidebarStyle}>
            <div style={{ fontWeight: 'bold' }}>Stack Trace:</div><br />
            {selectedEntry.stacktrace.map((line, idx) => (
              <div key={idx} style={stackTraceStyle}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
