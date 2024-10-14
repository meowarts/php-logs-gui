const fs = require('fs');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

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
 * Parses a stack trace line which is starting the index number.
 * @param {string} stackTraceLine
 * @returns {object} - The parsed stack trace line, with 'index', 'detail', 'fileName' and 'lineNumber' properties.
 */
function parseStackTraceLineWithStartIndex ( stackTraceLine ) {
  const match = stackTraceLine.match(/^(#\d+)\s+(.*?)\((\d+)\):\s+(.*)$/);
  return match
    ? {
        index: match[1],
        detail: match[4],
        fileName: match[2],
        lineNumber: match[3],
      }
    : {
        index: null,
        detail: stackTraceLine.trim(),
        fileName: null,
        lineNumber: null,
      };
}

/**
 * Parses a stack trace line which is starting the 'PHP /d'.
 * @param {string} stackTraceLine
 * @returns {object} - The parsed stack trace line, with 'index', 'detail', 'fileName' and 'lineNumber' properties.
 */
function parseStackTraceLineWithStartPHP( stackTraceLine ) {
  const match = stackTraceLine.match(/PHP\s+(\d+)\.\s+(.+?)\s+([\/\w\s\.-]+\.php)\D+(\d+)/);
  return match
    ? {
        index: `#${match[1]}`,
        detail: match[2],
        fileName: match[3],
        lineNumber: match[4],
      }
    : {
        index: null,
        detail: stackTraceLine.trim(),
        fileName: null,
        lineNumber: null,
      };
}

/**
 * Initializes a log entry object.
 * @param {object} options - The options to initialize the log entry with.
 * @param {Date|null} options.date - The date of the log entry. defaults to null.
 * @param {string} options.type - The log type ('error', 'warning', 'notice'). defaults to 'notice'.
 * @param {string} options.message - The log message. defaults to ''.
 * @returns {object} - The initialized log entry object.
 */
function initializeEntry({ date, type, message }) {
  return { id: uuidv4(), date, type, message, stacktrace: [] };
}

/**
 * Parses the log file and extracts log entries.
 * @param {string} logPath - The path to the log file.
 * @param {object} streamOptions - The streamOptions to pass to fs.createReadStream.
 * @returns {Promise<object>} - A promise that resolves with the log entries and the last processed position.
 */
function parseLogFile({ logPath, streamOptions = {} }) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(logPath, streamOptions);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const logEntries = [];
    let currentEntry = initializeEntry({ date: null, type: 'notice', message: ''});
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
            // Pass the line without the date to the stack trace parser
            currentEntry.stacktrace.push( parseStackTraceLineWithStartPHP(message) );
          } else {
            // New log entry, end of stack trace
            capturingStacktrace = false;
            logEntries.push( currentEntry );
            currentEntry = initializeEntry({ date, type, message });
          }
        } else if ( line.includes( 'PHP Stack trace:' ) ) {
          // start of stack trace
          capturingStacktrace = true;
        } else {
          // New log entry. Push the current entry to the log entries array if content exists.
          if ( currentEntry.message || currentEntry.stacktrace.length > 0 ) {
            capturingStacktrace = false;
            logEntries.push( currentEntry );
          }
          currentEntry = initializeEntry({ date, type, message });
        }
      } else if ( capturingStacktrace ) {
        currentEntry.stacktrace.push( parseStackTraceLineWithStartIndex(line) );
      } else if ( line.includes( 'Stack trace:' ) ) {
        capturingStacktrace = true;
      } else {
        currentEntry.message += '\n' + line;
      }
    });

    rl.on( 'close', () => {
      if ( currentEntry.message || currentEntry.stacktrace.length > 0 ) {
        logEntries.push( currentEntry );
      }
      const lastProcessedPosition = fs.statSync( logPath ).size;
      resolve({
        logEntries,
        lastProcessedPosition,
      });
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = { parseLogFile };
