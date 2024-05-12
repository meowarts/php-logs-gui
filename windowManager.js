let mainWindow = null;

const setMainWindow = (win) => {
  mainWindow = win;
};

const getMainWindow = () => {
  return mainWindow;
};

module.exports = { setMainWindow, getMainWindow };