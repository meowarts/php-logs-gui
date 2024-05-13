// main.js

'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { setMainWindow, getMainWindow } = require('./windowManager');
const path = require('path');
const url = require('url');
const { watchLogFile } = require('./watchlog');

const isDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const indexPath = isDevelopment ?
    url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true
    }) :
    url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'dist', 'index.html'),
      slashes: true
    });

  mainWindow.loadURL(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.setTitle('PHP Error Logs GUI');
    mainWindow.show();
    const logPath = path.join(app.getPath('home'), 'sites', 'ai', 'logs', 'php', 'error.log');
    watchLogFile(mainWindow, logPath);
    if (isDevelopment) {
      mainWindow.webContents.openDevTools();
    }
  });

  setMainWindow(mainWindow);

  mainWindow.on('closed', () => {
    setMainWindow(null);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  const mainWindow = getMainWindow();
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Log Files', extensions: ['log'] }]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      event.reply('selected-file', result.filePaths[0]);
    }
  }).catch(err => {
    console.error('Failed to open file dialog:', err);
  });
});