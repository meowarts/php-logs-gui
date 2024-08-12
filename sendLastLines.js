const fs = require('fs');
const readline = require('readline');
const { sendNotification } = require('./sendNotification');

/**
 * Parses a date string in the format '[DD-MMM-YYYY HH:MM:SS UTC]'
 * @param {string} dateString - The date string to parse.
 * @returns {Date} - The parsed date.
 */
function parseDate( dateString ) {
  const dateParts = dateString.slice( 1, -1 ).split( ' ' );
  const [day, monthName, year] = dateParts[0].split( '-' );
  const [hour, minute, second] = dateParts[1].split( ':' );

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthIndex = monthNames.indexOf( monthName );

  return new Date( Date.UTC( year, monthIndex, day, hour, minute, second ) );
}

/**
 * Determines the log type based on the message.
 * @param {string} message - The log message.
 * @returns {string} - The log type ('error', 'warning', 'notice').
 */
function getLogType( message ) {
  if ( message.startsWith( 'PHP Fatal error: ' ) ) {
    return 'error';
  }
  if ( message.startsWith( 'PHP Warning: ' ) ) {
    return 'warning';
  }
  return 'notice';
}
/**
 * Sends the last lines of the log file to the main window.
 * @param {object} mainWindow - The main window object.
 * @param {string} logPath - The path to the log file.
 * @param {boolean} sendAll - Whether to send all lines or not.
 * @param {number} lastProcessedPosition - The last processed position in the log file.
 * @returns {Promise<number>} - A promise that resolves with the new last processed position.
 */
function sendLastLines(mainWindow, logPath, sendAll = false, lastProcessedPosition = 0) {
  return new Promise((resolve, reject) => {
    const streamOptions = sendAll ? {} : { start: lastProcessedPosition };
    const stream = fs.createReadStream(logPath, streamOptions);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const logEntries = [];
    let currentEntry = { date: null, type: 'notice', message: '', stacktrace: [] };
    let capturingStacktrace = false;

    rl.on( 'line', ( line ) => {
      if ( line.includes( 'Xdebug: [Step Debug] Could not connect to debugging client.' ) ) {
        return;
      }

      const dateMatch = line.match( /^\[(\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2} UTC)\]/ );
      if ( dateMatch ) {
        const date = parseDate( dateMatch[0] );
        const message = line.slice( dateMatch[0].length ).trim();
        const type = getLogType( message );

        if ( capturingStacktrace ) {
          if ( line.includes( 'PHP ' ) && line.match( /PHP\s+\d+\./ ) ) {
            // Stack trace line
            currentEntry.stacktrace.push( line );
          } else {
            // New log entry, end of stack trace
            capturingStacktrace = false;
            logEntries.push( currentEntry );
            currentEntry = { date, type, message, stacktrace: [] };
          }
        } else if ( line.includes( 'PHP Stack trace:' ) ) {
          capturingStacktrace = true;
          currentEntry.stacktrace.push( line );
        } else {
          if ( currentEntry.message || currentEntry.stacktrace.length > 0 ) {
            logEntries.push( currentEntry );
          }
          currentEntry = { date, type, message, stacktrace: [] };
        }
      } else if ( capturingStacktrace ) {
        currentEntry.stacktrace.push( line );
      } else if ( line.includes( 'Stack trace:' ) ) {
        capturingStacktrace = true;
        currentEntry.stacktrace.push( line );
      } else {
        currentEntry.message += '\n' + line;
      }
    });

    rl.on( 'close', () => {
      if ( currentEntry.message || currentEntry.stacktrace.length > 0 ) {
        logEntries.push( currentEntry );
      }
      if ( mainWindow && !mainWindow.isDestroyed() ) {
        if ( logEntries.length > 0 ) {
          mainWindow.webContents.send( 'log-update', logEntries );
          const latestLog = logEntries[logEntries.length - 1];
          const { type, message } = latestLog;
          if (sendAll && (type === 'error' || type === 'warning')) {
            sendNotification(type, message.split('\n')[0]);
          }
        }
      }
      const newLastProcessedPosition = fs.statSync( logPath ).size;
      resolve(newLastProcessedPosition);
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = { sendLastLines };
