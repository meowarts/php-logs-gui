const fs = require('fs');
const readline = require('readline');
const { ipcMain } = require('electron');
const { getMainWindow } = require('./windowManager');

function sendLastLines(mainWindow, logPath) {
  const stream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let logEntries = [];
  let currentEntry = { error: '', stacktrace: [] };
  let capturingStacktrace = false;

  rl.on('line', (line) => {
    // Check if the line should be ignored (Xdebug)
    if (line.includes('Xdebug: [Step Debug] Could not connect to debugging client.')) {
      return;
    }

    // Check if the line starts a new error entry
    if (line.includes('PHP Fatal error:')) {
      if (currentEntry.error || currentEntry.stacktrace.length > 0) {
        logEntries.push(currentEntry);
      }
      currentEntry = { error: line, stacktrace: [] };
      capturingStacktrace = false;
    } else if (line.includes('PHP Stack trace:')) {
      capturingStacktrace = true;
    } else if (capturingStacktrace) {
      currentEntry.stacktrace.push(line);
    }

    // Only keep the most recent 60 entries
    if (logEntries.length >= 60) {
      logEntries.shift();
    }
  });

  rl.on('close', () => {
    if (currentEntry.error || currentEntry.stacktrace.length > 0) {
      logEntries.push(currentEntry); // Make sure to push the last entry if needed
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-update', logEntries);
    }
  });
}

function watchLogFile(mainWindow, logPath) {
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist:', logPath);
    return;
  }

  sendLastLines(mainWindow, logPath);

  fs.watch(logPath, (eventType, filename) => {
    if (eventType === 'change') {
      sendLastLines(mainWindow, logPath);
    }
  });
}

ipcMain.on('watch-log-file', (event, logPath) => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    watchLogFile(mainWindow, logPath);
  } else {
    console.log("MainWindow is not available or has been destroyed.");
  }
});

module.exports = { watchLogFile };
