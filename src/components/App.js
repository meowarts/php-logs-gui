import './style.css';

import React, { useCallback, useEffect, useState, useRef } from 'react';
const { ipcRenderer, clipboard } = window.require('electron');

import StacktraceIcon from '../assets/stacktrace.png';
import FileIcon from '../assets/file.png';
import CopyIcon from '../assets/copy.png';
import RemoveIcon from '../assets/remove.png';
import ClearIcon from '../assets/clear.png';
import EmptyIcon from '../assets/empty.png';
import RefreshIcon from '../assets/refresh.png';
import DebouncedSearch from './DebouncedSearch';
import { isToday, toFriendlyDate } from '../utils/date';

const menuIconSize = 16;

function App() {
  const scrollRef = useRef(null);
  const [originalLogData, setOriginalLogData] = useState({ path: null, entries: [] });
  const [logData, setLogData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ipcRenderer.on('log-update', (event, { logPath, logEntries }) => {
      setOriginalLogData((prevData) => ({ path: logPath, entries: [...prevData.entries, ...logEntries] }));
      setIsLoading(false);
    });

    ipcRenderer.on('log-reset', (event, { logPath }) => {
      setIsLoading(true);
      setOriginalLogData({ path: logPath, entries: [] });
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
        setShowModal(false);
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
    setLogData(originalLogData.entries);
  }, [originalLogData.entries]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logData]);

  const filteredData = useCallback((value) => {
    setSelectedEntry(null);

    if (value === '') {
      setLogData(originalLogData.entries);
      return;
    }
    const filtered = originalLogData.entries.filter((entry) => {
      return entry.message.toLowerCase().includes(value.toLowerCase())
        || entry.stacktrace.join('').toLowerCase().includes(value.toLowerCase());
    });
    setLogData(filtered);
  }, [originalLogData.entries]);

  const openFileInVSCode = useCallback(({ fileName, lineNumber }) => {
    if (!fileName || !lineNumber) {
      return;
    }
    ipcRenderer.send('open-file-in-vscode', { fileName, lineNumber });
  }, []);

  const showStatusMessage = useCallback((message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  const isSameEntry = useCallback((entry1, entry2) => {
    return !!entry1 && !!entry2 && entry1.id === entry2.id;
  }, []);

  const hasStacktraces = useCallback((entry) => entry.stacktrace?.length > 0, []);

  const generateClassName = useCallback((...args) => args.filter((v) => v !== '').join(' '), []);

  return (
    <div className="window">
      {/* <div className="aside"> Add sidebar content here </div> */}
      <div className="main">
        <div className="actionBar">
          <div className='actions'>

            <label className="label">Nyao Error Logs</label>

            <button className="iconButton" onClick={() => ipcRenderer.send('open-file-dialog')}>
              <img src={FileIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <button className="iconButton"
              onClick={() => {
                ipcRenderer.send('watch-another-file', originalLogData.path);
                showStatusMessage('Refreshed!');
              }}
            >
              <img src={RefreshIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <button className="iconButton" disabled={selectedEntry === null}
              onClick={() => {
                clipboard.writeText(selectedEntry.message);
                showStatusMessage('Copied to clipboard!');
              }}
            >
              <img src={CopyIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <button className="iconButton" disabled={selectedEntry === null}
              onClick={() => {
                setOriginalLogData((prevData) => ({
                  ...prevData,
                  entries: prevData.entries.filter((e) => e.id !== selectedEntry.id)
                }));
              }}
            >
              <img src={RemoveIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <button className="iconButton"
              onClick={() => {
                setOriginalLogData({ ...originalLogData, entries: [] });
                setLogData([]);
                setSelectedEntry(null);
              }}
            >
              <img src={ClearIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <button className="iconButton"
              onClick={() => {
                if (confirm('Are you sure to clear all logs? It will delete the all log entries from the actual file. This action cannot be undone.')) {
                  setOriginalLogData({ ...originalLogData, entries: [] });
                  ipcRenderer.send('empty-file', originalLogData.path);
                }
              }}
            >
              <img src={EmptyIcon} width={menuIconSize} height={menuIconSize} />
            </button>

            <div className={generateClassName('statusMessage', statusMessage !== null ? 'show' : 'hide')}>
              {statusMessage}
            </div>

          </div>
        </div>
        <div ref={scrollRef} className={generateClassName('content', 'scrollable', showModal ? 'lock' : '')}>
          <div className={generateClassName('logsContainer', isLoading ? 'loading' : '')}>

            {logData.length === 0 && (
              isLoading
                ? <span className="loader"></span>
                : <div className="emptyLogs"><div>No logs found.</div></div>
            )}

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
              {selectedEntry?.stacktrace.map(({ detail, fileName, lineNumber, index}) => (
                <div className='stackTrace' key={`${selectedEntry.id}-stacktrace-${index}`}>
                  <div className='fileContainer' onClick={() => openFileInVSCode({ fileName,  lineNumber })}>
                    <span>{index}</span>
                    <div>
                      <span className='file openable'>{fileName}</span>
                      <span>({lineNumber})</span>
                    </div>
                  </div>
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
