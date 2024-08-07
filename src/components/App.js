import './style.css';

import React, { useCallback, useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

import CloseImage from '../assets/close.svg';
import DebouncedSearch from './DebouncedSearch';

const toFriendlyDate = (date) => {
  if (!date) return '';
  return date.toLocaleString();
};

const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const groupEntriesByDate = (entries) => {
  const options = { month: 'long', day: 'numeric' };
  return entries.reduce((groups, entry) => {
    const date = isToday(entry.date)
      ? 'Today'
      : new Date(entry.date).toLocaleDateString('en-US', options);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});
}

function App() {
  const [originalLogData, setOriginalLogData] = useState([]);
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    ipcRenderer.on('log-update', (event, data) => {
      setOriginalLogData((prevData) => [...prevData, ...data]);
    });

    ipcRenderer.on('log-reset', () => {
      setOriginalLogData([]);
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

  useEffect(() => {
    setLogData(originalLogData);
  }, [originalLogData]);

  const filteredData = useCallback((value) => {
    setSelectedEntry(null);

    if (value === '') {
      setLogData(originalLogData);
      return;
    }
    const filtered = originalLogData.filter((entry) => {
      return entry.message.toLowerCase().includes(value.toLowerCase())
        || entry.stacktrace.join('').toLowerCase().includes(value.toLowerCase());
    });
    setLogData(filtered);
  }, [originalLogData]);

  const groupedEntries = groupEntriesByDate(logData.slice().reverse().slice(0, 60));
  const showStackTrace = selectedEntry && !!selectedEntry.stacktrace?.length;

  return (
    <div className="window">
      {/* <div className="aside"> */}
        {/* Add sidebar content here */}
      {/* </div> */}
      <div className="main">
        <div className="actionBar">
          <div>
            <label className="label">Nyao Error Logs</label>
            <button onClick={() => setLogData([])} className="button">Clear Logs</button>
          </div>
          <DebouncedSearch className="searchTextField" placeholder="Search" onSearch={filteredData} />
        </div>
        <div className="content scrollable" sytle={`height: calc(100vh - 45.5px ${showStackTrace ? '- 30vh' : ''})`}>
          <div className="logsContainer">
            {Object.keys(groupedEntries).map((date) => (
              <div key={date}>
                <h1>{date}</h1>
                {groupedEntries[date].map((entry, index) => (
                  <div key={entry.date + entry.type + entry.message + index}
                    className={`logEntry ${isToday(entry.date) ? entry.type : ''}`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div>{toFriendlyDate(entry.date)} - {entry.message}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {showStackTrace && (
          <div className="stackTraceSection">
            <div className='stackTraceBar'>
              <div>Stack Trace:</div>
              <img src={CloseImage} className='closeButton clickable' onClick={() => setSelectedEntry(null)} width={15} height={15} color="white" />
            </div>
            <div className='stackTraceContent scrollable'>
              {selectedEntry.stacktrace.map((line, idx) => (
                <div key={idx} className="stackTrace">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
