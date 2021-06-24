import { app, BrowserWindow, Menu, remote } from 'electron'
import * as path from 'path'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    width: 800,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  return mainWindow;
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
   const mainWindow = new BrowserWindow({
    width: 780,
    height: 462,
    minWidth: 380,
    minHeight: 360,
    backgroundColor: '#000',
    //@ts-ignore
    icon: path.join(__dirname, { darwin: 'icon.icns', linux: 'icon.png', win32: 'icon.ico' }[process.platform] || 'icon.ico'),
    resizable: true,
    frame: process.platform !== 'darwin',
    skipTaskbar: process.platform === 'darwin',
    autoHideMenuBar: process.platform === 'darwin',
    webPreferences: { zoomFactor: 1.0, nodeIntegration: true, backgroundThrottling: false }
  })

  mainWindow.loadURL(`file://${__dirname}/index.html`)
  // app.inspect()

  mainWindow.on('closed', () => {
    app.quit()
  })

  mainWindow.on('hide', function () {
    mainWindow.hide()
  })

  mainWindow.on('show', function () {
    mainWindow.show()
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    } else {
      mainWindow.show()
    }
  })
})
