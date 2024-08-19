import './style.css';

import React, { useCallback, useEffect, useState, useRef } from 'react';
const { ipcRenderer } = window.require('electron');

import CloseImage from '../assets/close.svg';
import DebouncedSearch from './DebouncedSearch';
import { isToday, toFriendlyDate } from '../utils/date';

const STACKTRACE_SECTION_HEIGHT = 181;
const HEADER_HEIGHT = 65.5;
const MARGIN_HEIGHT = 16;

function App() {
  const scrollRef = useRef(null);
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
      setSelectedEntry(null);
    });

    ipcRenderer.on('selected-file', (event, filePath) => {
      ipcRenderer.send('watch-another-file', filePath);
    });

    return () => {
      ipcRenderer.removeAllListeners('log-update');
      ipcRenderer.removeAllListeners('selected-file');
      ipcRenderer.removeAllListeners('log-reset');
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

  const clearLogs = useCallback(() => {
    setOriginalLogData([]);
    setLogData([]);
    setSelectedEntry(null);
  }, []);

  const showStackTrace = selectedEntry && !!selectedEntry.stacktrace?.length;

  return (
    <div className="window">
      {/* <div className="aside"> Add sidebar content here </div> */}
      <div className="main">
        <div className="actionBar">
          <div>
            <label className="label">Nyao Error Logs</label>
            <button onClick={clearLogs} className="button">Clear Logs</button>
          </div>
          <DebouncedSearch className="searchTextField" placeholder="Search" onSearch={filteredData} />
        </div>
        <div ref={scrollRef} className="content scrollable" sytle={`height: calc(100vh - 45.5px ${showStackTrace ? '- 30vh' : ''})`}>
          <div className="logsContainer">
            {logData.map((entry, index) => (
              <div key={entry.date + entry.type + entry.message + index}
                className={`logEntry ${isToday(entry.date) ? entry.type : ''}`}
                onClick={(event) => {
                  setSelectedEntry(entry);
                  const { bottom } = event.currentTarget.getBoundingClientRect();
                  const scrollBottomInContainer = scrollRef.current.clientHeight + HEADER_HEIGHT - bottom;
                  if (entry.stacktrace?.length && scrollBottomInContainer <= STACKTRACE_SECTION_HEIGHT) {
                    const stacktraceHeight = showStackTrace ? 0 : STACKTRACE_SECTION_HEIGHT;
                    const additionalHeight = scrollBottomInContainer < 0
                      ? stacktraceHeight + Math.abs(scrollBottomInContainer) + MARGIN_HEIGHT
                      : stacktraceHeight - scrollBottomInContainer + MARGIN_HEIGHT;
                    if (additionalHeight > 0) {
                      setTimeout(() => scrollRef.current.scrollTop += additionalHeight, 100);
                    }
                  }
                }}
              >
                <div>{toFriendlyDate(entry.date)} - {entry.message}</div>
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
              {selectedEntry.stacktrace.map((line, index) => (
                <div className='stackTrace' key={`${line.file ?? index}-${line.detail}`}>
                  <div className='file'>{line.file}</div>
                  <div className='detail'>{line.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
