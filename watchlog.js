const fs = require('fs');
const readline = require('readline');
const { ipcMain } = require('electron');
const { getMainWindow } = require('./windowManager');

let currentWatcher = null;
let lastProcessedPosition = 0;

function parseDate(dateString) {
  const dateParts = dateString.slice(1, -1).split(' ');
  const [day, monthName, year] = dateParts[0].split('-');
  const [hour, minute, second] = dateParts[1].split(':');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthIndex = monthNames.indexOf(monthName);

  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second));
}

function getLogType(message) {
  if (message.startsWith('PHP Fatal error: ')) {
    return 'error';
  } else if (message.startsWith('PHP Warning: ')) {
    return 'warning';
  } else {
    return 'notice';
  }
}

function sendLastLines(mainWindow, logPath, sendAll = true) {
  const stream = fs.createReadStream(logPath, { start: lastProcessedPosition });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let logEntries = [];
  let currentEntry = { date: null, type: 'notice', message: '', stacktrace: [] };
  let capturingStacktrace = false;

  rl.on('line', (line) => {
    if (line.includes('Xdebug: [Step Debug] Could not connect to debugging client.')) {
      return;
    }

    const dateMatch = line.match(/^\[(\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2} UTC)\]/);
    if (dateMatch) {
      const date = parseDate(dateMatch[0]);
      const message = line.slice(dateMatch[0].length).trim();
      const type = getLogType(message);

      if (line.includes('PHP Stack trace:')) {
        capturingStacktrace = true;
      } else if (capturingStacktrace) {
        if (line.match(/PHP\s+\d+\./)) {
          currentEntry.stacktrace.push(line);
        } else {
          capturingStacktrace = false;
          logEntries.push(currentEntry);
          currentEntry = { date, type, message, stacktrace: [] };
        }
      } else {
        if (currentEntry.message || currentEntry.stacktrace.length > 0) {
          logEntries.push(currentEntry);
        }
        currentEntry = { date, type, message, stacktrace: [] };
      }
    } else {
      currentEntry.message += '\n' + line;
    }
  });

  rl.on('close', () => {
    if (currentEntry.message || currentEntry.stacktrace.length > 0) {
      logEntries.push(currentEntry);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (logEntries.length > 0) {
        mainWindow.webContents.send('log-update', logEntries);
      }
    }
    lastProcessedPosition = stream.bytesRead + lastProcessedPosition;
  });
}

function watchLogFile(mainWindow, logPath, reset = false) {
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist:', logPath);
    return;
  }

  if (reset) {
    lastProcessedPosition = 0;
    mainWindow.webContents.send('log-reset');
  }

  // Stop watching the previous file if there is an existing watcher
  if (currentWatcher) {
    currentWatcher.close();
  }

  // Send initially the last 60 lines or until one error log is found
  sendLastLines(mainWindow, logPath, false);

  // Watch for new changes
  currentWatcher = fs.watch(logPath, (eventType, filename) => {
    if (eventType === 'change') {
      sendLastLines(mainWindow, logPath, true);
    }
  });
}

ipcMain.on('watch-another-file', (event, logPath) => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    watchLogFile(mainWindow, logPath, true);
  } else {
    console.log("MainWindow is not available or has been destroyed.");
  }
});

module.exports = { watchLogFile };