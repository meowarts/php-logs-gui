const fs = require('fs');
const { sendLastLines } = require('./sendLastLines');

let currentWatcher = null;
let lastProcessedPosition = 0;
let debounceTimeout = null;

/**
 * Watches the log file for changes and processes new entries.
 * @param {object} mainWindow - The main window object.
 * @param {string} logPath - The path to the log file.
 * @param {boolean} reset - Whether to reset the log position.
 */
async function watchLogFile( mainWindow, logPath, reset = false ) {
  if ( !fs.existsSync( logPath ) ) {
    console.error( 'Log file does not exist:', logPath );
    return;
  }

  if ( reset ) {
    lastProcessedPosition = 0;
    mainWindow.webContents.send( 'log-reset' );
  }

  // Stop watching the previous file if there is an existing watcher
  if ( currentWatcher ) {
    currentWatcher.close();
  }

  // Send initially the last 60 lines or until one error log is found
  try {
    lastProcessedPosition = await sendLastLines(mainWindow, logPath, false, lastProcessedPosition);
  } catch (error) {
    console.error('Error processing log file:', error);
  }

  // Watch for new changes with debouncing
  currentWatcher = fs.watch( logPath, ( eventType ) => {
    if ( eventType === 'change' ) {
      if ( debounceTimeout ) {
        clearTimeout( debounceTimeout );
      }
      debounceTimeout = setTimeout(async () => {
        try {
          lastProcessedPosition = await sendLastLines(mainWindow, logPath, false, lastProcessedPosition);
        } catch (error) {
          console.error('Error processing log file:', error);
        }
      }, 100 );
    }
  });
}

module.exports = { watchLogFile };
