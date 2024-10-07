'use strict';

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const { setMainWindow, getMainWindow } = require('./windowManager');
const path = require('path');
const url = require('url');
const { watchLogFile } = require('./watchlog');
const { exec } = require('child_process');
const fs = require('fs');
const logger = require('./logger');
const servicePath = require('./servicePath');

const isDevelopment = process.env.NODE_ENV === 'development';
const isTesting = process.env.TESTING === 'true';
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
    width: 900,
    height: 600,
    show: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 23.5 }
  });

  const indexPath = isDevelopment || isTesting ?
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

  mainWindow.once('ready-to-show', async () => {
    mainWindow.setTitle('Nyao PHP Errors');
    mainWindow.show();
    const logPath = isTesting
      ? path.join(__dirname, 'tests', 'logs', 'error.log')
      : path.join(app.getPath('home'), 'sites', 'ai', 'logs', 'php', 'error.log');
    await watchLogFile(mainWindow, logPath);
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
        label: 'Nyao Error Logs',
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
  app.quit();
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

ipcMain.on( 'watch-another-file', async ( event, logPath ) => {
  const mainWindow = getMainWindow();
  if ( mainWindow && !mainWindow.isDestroyed() ) {
    await watchLogFile( mainWindow, logPath, true );
  } else {
    console.log( 'MainWindow is not available or has been destroyed.' );
  }
});

ipcMain.on( 'open-file-in-vscode', ( event, { fileName, lineNumber } ) => {
  exec( `${servicePath.vscode}code -g ${fileName}:${lineNumber}`, ( error, stdout, stderr ) => {
    if (error) {
      logger.error(`error: ${error}`);
    }
    if (stderr) {
      logger.error(`stderr: ${stderr}`);
    }
  });
});

ipcMain.on( 'open-file-dialog', openFileDialog );

ipcMain.on( 'empty-file', ( event, filePath ) => {
  fs.writeFileSync( filePath, '' );
});

module.exports = { createWindow };
