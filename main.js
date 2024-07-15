'use strict';

const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, nativeImage } = require('electron');
const { setMainWindow, getMainWindow } = require('./windowManager');
const path = require('path');
const url = require('url');
const { watchLogFile } = require('./watchlog');

const isDevelopment = process.env.NODE_ENV === 'development';
const iconPath = path.join(__dirname, 'src', 'assets', 'icon.png'); // Icon path for both tray and main window

let tray = null;

function createTray(mainWindow) {
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',

      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Nyao PHP Errors');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    show: false,
    icon: iconPath,
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
    mainWindow.setTitle('Nyao PHP Errors');
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

  mainWindow.on('resize', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.hide();
    }
  });

  createTray(mainWindow);
}

function showNotification(logType, message) {
  const notification = new Notification({
    title: `PHP ${logType.charAt(0).toUpperCase() + logType.slice(1)}`,
    body: message.slice(0, 250), // MacOS notifications are limited to 256 bytes
    icon: iconPath, // Custom icon for notification
    silent: false
  });

  notification.on('click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  notification.show();
}

function openFileDialog() {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Log Files', extensions: ['log'] }]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      app.addRecentDocument(result.filePaths[0]);

      const mainWindow = getMainWindow();
      mainWindow.webContents.send('selected-file', result.filePaths[0]);
    }
  }).catch(err => {
    console.error('Failed to open file dialog:', err);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Set application icon for macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);

    // Set application menu
    const menu = Menu.buildFromTemplate([
      {
        label: 'Nyao PHP Errors',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'Open...',
            accelerator: 'CmdOrCtrl+O',
            click: openFileDialog
          },
          {
            label: 'Open Recent',
            role: 'recentdocuments',
            submenu:[
              {
                label: 'Clear Recently Opened...',
                role: 'clearrecentdocuments',
              }
            ]
          }
        ]
      }
    ]);
    Menu.setApplicationMenu(menu);
  }
});

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

app.on('open-file', (_, path) => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('selected-file', path);
  }
});

// Change application name
app.setName('Nyao PHP Errors');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

module.exports = { createWindow, showNotification };
