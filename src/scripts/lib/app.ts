import { Menu, remote } from "electron"

export function inspect() {
    remote.getCurrentWindow().webContents.openDevTools()
}

export function toggleFullscreen() {
    remote.getCurrentWindow().setFullScreen(!remote.getCurrentWindow().isFullScreen())
}

export function toggleMenubar() {
    remote.getCurrentWindow().setMenuBarVisibility(!remote.getCurrentWindow().isMenuBarVisible())
}

export function toggleVisible() {
    let isShown = remote.getCurrentWindow().isVisible
    if (process.platform !== 'darwin') {
        if (!remote.getCurrentWindow().isMinimized()) { remote.getCurrentWindow().minimize() } else { remote.getCurrentWindow().restore() }
    } else {
        if (isShown && !remote.getCurrentWindow().isFullScreen()) { remote.getCurrentWindow().hide() } else { remote.getCurrentWindow().show() }
    }
}

export function injectMenu(menu: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[]) {
    try {
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
    } catch (err) {
        console.warn('Cannot inject menu.')
    }
}
