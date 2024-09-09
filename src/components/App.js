import './style.css';

import React, { useCallback, useEffect, useState, useRef } from 'react';
const { ipcRenderer, clipboard } = window.require('electron');

import StacktraceIcon from '../assets/icon.png';
import FileIcon from '../assets/file.png';
import CopyIcon from '../assets/copy.png';
import RemoveIcon from '../assets/remove.png';
import ClearIcon from '../assets/clear.png';
import EmptyIcon from '../assets/empty.png';
import DebouncedSearch from './DebouncedSearch';
import { isToday, toFriendlyDate } from '../utils/date';

function App() {
  const scrollRef = useRef(null);
  const [logPath, setLogPath] = useState(null);
  const [originalLogData, setOriginalLogData] = useState([]);
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    ipcRenderer.on('log-update', (event, { logPath, logEntries }) => {
      setOriginalLogData((prevData) => [...prevData, ...logEntries]);
      setLogPath(logPath);
    });

    ipcRenderer.on('log-reset', () => {
      setOriginalLogData([]);
      setLogData([]);
      setSelectedEntry(null);
    });

    ipcRenderer.on('selected-file', (event, filePath) => {
      ipcRenderer.send('watch-another-file', filePath);
    });

    ipcRenderer.on('selected-log', (event, entry) => {
      setSelectedEntry(entry);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      ipcRenderer.removeAllListeners('log-update');
      ipcRenderer.removeAllListeners('selected-file');
      ipcRenderer.removeAllListeners('selected-log');
      ipcRenderer.removeAllListeners('log-reset');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setLogData(originalLogData);
  }, [originalLogData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logData]);

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

  const openFileInVSCode = useCallback(({ fileName, lineNumber }) => {
    if (!fileName || !lineNumber) {
      return;
    }
    ipcRenderer.send('open-file-in-vscode', { fileName, lineNumber });
  }, []);

  const clearLogs = useCallback(() => {
    setOriginalLogData([]);
    setLogData([]);
    setSelectedEntry(null);
  }, []);

  const showStatusMessage = useCallback((message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  const removeLogEntry = useCallback((entry) => {
    setOriginalLogData((prevData) => prevData.filter((e) => e.id !== entry.id));
  }, []);

  const isSameEntry = useCallback((entry1, entry2) => {
    return !!entry1 && !!entry2 && entry1.id === entry2.id;
  }, []);

  const hasStacktraces = useCallback((entry) => entry.stacktrace?.length > 0, []);

  const generateClassName = useCallback((...args) => args.filter((v) => v !== '').join(' '), []);

  const showStackTrace = selectedEntry && !!selectedEntry.stacktrace?.length;

  return (
    <div className="window">
      {/* <div className="aside"> Add sidebar content here </div> */}
      <div className="main">
        <div className="actionBar">
          <div className='actions'>
            <label className="label">Nyao Error Logs</label>
            <button onClick={() => ipcRenderer.send('open-file-dialog')} className="iconButton">
              <img src={FileIcon} width={30} height={30} />
            </button>
            <button onClick={() => {
              clipboard.writeText(selectedEntry.message);
              showStatusMessage('Copied to clipboard!');
            }} className="iconButton" disabled={selectedEntry === null}>
              <img src={CopyIcon} width={30} height={30} />
            </button>
            <button onClick={() => removeLogEntry(selectedEntry)} className="iconButton" disabled={selectedEntry === null}>
              <img src={RemoveIcon} width={30} height={30} />
            </button>
            <button onClick={clearLogs} className="iconButton">
              <img src={ClearIcon} width={30} height={30} />
            </button>
            <button className="iconButton"
              onClick={() => {
                if (confirm('Are you sure to clear all logs? It will delete the all log entries from the actual file. This action cannot be undone.')) {
                  setOriginalLogData([]);
                  ipcRenderer.send('empty-file', logPath);
                }
              }}
            >
              <img src={EmptyIcon} width={30} height={30} />
            </button>
            <div className={generateClassName('statusMessage', statusMessage !== null ? 'show' : 'hide')}>{statusMessage}</div>
          </div>
        </div>
        <div ref={scrollRef} className={generateClassName('content', 'scrollable', showModal ? 'lock' : '')}>
          <div className="logsContainer">

            {logData.length === 0 && <div className="emptyLogs">
              <div>No logs found.</div>
            </div>}

            {logData.map((entry) => (
              <div key={entry.id}
                className={generateClassName('logEntry', isToday(entry.date) ? entry.type : '', isSameEntry(selectedEntry, entry) ? 'selected' : '')}
                onClick={() => {
                  setShowModal(false);
                  setSelectedEntry(entry);
                }}
              >
                <div>{toFriendlyDate(entry.date)} - {entry.message}</div>

                {hasStacktraces(entry) &&
                  <div className="stackTraceButton" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(entry);
                    setShowModal(true);
                  }}>
                    <img src={StacktraceIcon} width={40} height={40}/>
                  </div>
                }
              </div>
            ))}
          </div>

          {/* Modal */}
          <div className={generateClassName('modal', showModal ? 'show' : 'hide')}>
            <div className='stackTraceContent'>
              {selectedEntry?.stacktrace.map(({ file, detail, fileName, lineNumber}, index) => (
                <div className='stackTrace' key={`${selectedEntry.id}-stacktrace-${index}`}>
                  <div className={generateClassName('file', file ? 'openable' : '')} onClick={() => openFileInVSCode({ fileName,  lineNumber })}>{file}</div>
                  <div className='detail'>{detail}</div>
                </div>
              ))}
            </div>
            <div className='closeButton clickable' onClick={() => setShowModal(false)}>Close</div>
          </div>

        </div>
        <div className='footer'>
          <DebouncedSearch className="searchTextField" placeholder="Search" onSearch={filteredData} />
        </div>
      </div>
    </div>
  );
}

export default App;
