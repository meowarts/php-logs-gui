'use strict'

// Import parts of electron to use
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// Keep a reference for dev mode
let dev = false

// Broken:
// if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
//   dev = true
// }

if (process.env.NODE_ENV !== undefined && process.env.NODE_ENV === 'development') {
  dev = true
}

function watchLogFile() {
  const logPath = path.join(app.getPath('home'), 'sites', 'ai', 'logs', 'php', 'error.log');

  // If the log file doesn't exist, log an error and return
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist:', logPath);
    return;
  }

  // Function to send last 60 lines from the log file
  const sendLastLines = () => {
    const stream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let lastLines = [];

    rl.on('line', (line) => {
      if (lastLines.length >= 60) {
        lastLines.shift();
      }
      lastLines.push(line);
    });

    rl.on('close', () => {
      mainWindow.webContents.send('log-update', lastLines.join('\n'));
    });
  };

  // Send last 60 lines immediately
  sendLastLines();

  // Watch for changes in the log file
  fs.watch(logPath, (eventType, filename) => {
    if (eventType === 'change') {
      fs.readFile(logPath, 'utf-8', (err, data) => {
        if (err) {
          console.error('Failed to read file:', err);
          return;
        }
        mainWindow.webContents.send('log-update', data);
      });
      sendLastLines(); // Optionally call sendLastLines() if you only want to send updates.
    }
  });
}


function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: dev ? 1400 : 1100,
    height: dev ? 800 : 400,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  watchLogFile();

  // and load the index.html of the app.
  let indexPath;

  if (dev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true
    })
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'dist', 'index.html'),
      slashes: true
    })
  }

  mainWindow.loadURL(indexPath)

  // Don't show until we are ready and loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    // Open the DevTools automatically if developing
    if (dev) {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer')
      installExtension(REACT_DEVELOPER_TOOLS)
        .catch(err => console.log('Error loading React DevTools: ', err))
      mainWindow.webContents.openDevTools()
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
