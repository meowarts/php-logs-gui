const fs = require('fs');
const readline = require('readline');

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
 * Parses a stack trace line.
 * @param {string} stacktrace
 * @returns {object} - The parsed stack trace line, with 'file' and 'detail' properties.
 */
function parseStacktrace( stacktrace ) {
  const match = stacktrace.match(/^(#\d+)\s+(.*?)\((\d+)\):\s+(.*)$/);
  return match
    ? {
        file: `${match[1]} ${match[2]}(${match[3]})`,
        detail: match[4],
      }
    : {
        file: null,
        detail: stacktrace.trim(),
      };
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
            currentEntry.stacktrace.push( parseStacktrace(line) );
          } else {
            // New log entry, end of stack trace
            capturingStacktrace = false;
            logEntries.push( currentEntry );
            currentEntry = { date, type, message, stacktrace: [] };
          }
        } else if ( line.includes( 'PHP Stack trace:' ) ) {
          capturingStacktrace = true;
        } else {
          if ( currentEntry.message || currentEntry.stacktrace.length > 0 ) {
            logEntries.push( currentEntry );
          }
          currentEntry = { date, type, message, stacktrace: [] };
        }
      } else if ( capturingStacktrace ) {
        currentEntry.stacktrace.push( parseStacktrace(line) );
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
