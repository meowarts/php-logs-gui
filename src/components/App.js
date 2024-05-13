import './style.css';

import React, { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

import StackTraceImage from '../assets/stacktrace.svg';
import FileImage from '../assets/file.svg';

const toFriendlyDate = (date) => {
  if (!date) return '';
  return date.toLocaleString();
};

const opacityBasedOnDate = (date, fullOpacityDuration = 30, minOpacity = 0.35, totalDuration = 48) => {
  const diff = (new Date() - date) / 1000 / 60;
  if (diff < fullOpacityDuration) return 1;
  const totalDurationInMinutes = totalDuration * 60;
  if (diff > totalDurationInMinutes) return minOpacity;

  // Calculate the opacity by interpolating between 1 and the minimum opacity over the interval
  return 1 - (diff - fullOpacityDuration) / (totalDurationInMinutes - fullOpacityDuration) * (1 - minOpacity);
};


function App() {
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    
    ipcRenderer.on('log-update', (event, data) => {
      setLogData((prevData) => [...prevData, ...data]);
    });

    ipcRenderer.on('log-reset', () => {
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
    <div>
      <div className="actionBar">
        <label className="label">PHP Error Logs GUI</label>
        <button onClick={switchFile} className="button">Switch Log File</button>
        <button onClick={() => setLogData([])} className="button">Clear Logs</button>
      </div>
      <div className="content">
        <div className="logsContainer">
          {logData.slice().reverse().slice(0, 60).map((entry, index) => (
            <div key={index}
              className={`logEntry ${entry.type} ${selectedEntry === entry ? 'selected' : ''}`} 
                style={{ opacity: opacityBasedOnDate(entry.date) }}
                onClick={() => setSelectedEntry(entry)}>
              <div className="top-actions">
                <div className="date">{toFriendlyDate(entry.date)}</div>
              </div>
              <div className="content">
                <div className="message">{entry.message}</div>
              </div>
              <div className="bottom-actions">
                <img src={StackTraceImage} alt="Stack Trace"
                  className={`stackTraceIcon ${!!entry.stacktrace?.length ? 'active' : ''}`}
                />
                <img src={FileImage} alt="Open File in VS Code"
                  className={`fileIcon ${!!entry.file ? 'active' : ''}`}
                />
                <div style={{ flex: 'auto' }} />
                <div className="delete-button" onClick={() => {
                  setLogData((prevData) => prevData.filter((item) => item !== entry));
                  setSelectedEntry(null);
                }}>DELETE</div>
              </div>
            </div>
          ))}
        </div>
        {selectedEntry && !!selectedEntry.stacktrace?.length && (
          <div className="sidebar">
            <div style={{ fontWeight: 'bold' }}>Stack Trace:</div><br />
            {selectedEntry.stacktrace.map((line, idx) => (
              <div key={idx} className="stackTrace">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
