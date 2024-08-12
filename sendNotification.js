const { Notification } = require('electron');

/**
 * Sends a system notification.
 * @param {string} logType - The type of log (error, warning, notice).
 * @param {string} message - The log message.
 */
function sendNotification(logType, message) {
  const notification = new Notification({
    title: `PHP ${logType.charAt(0).toUpperCase() + logType.slice(1)}`,
    body: message.slice(0, 250), // MacOS notifications are limited to 256 bytes
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

module.exports = { sendNotification };
