const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let mainWindow;
let setupWindow;
let tray = null;

// Single instance lock for Windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Register custom protocol
    app.setAsDefaultProtocolClient('spotiflow');

    function setAutoLaunch(enable) {
        app.setLoginItemSettings({
            openAtLogin: enable,
            openAsHidden: false,
            path: app.getPath('exe'),
            args: []
        });
    }

    function isAutoLaunchEnabled() {
        return app.getLoginItemSettings().openAtLogin;
    }

    function createWindow() {
        try {
            const { screen } = require('electron');
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;

            mainWindow = new BrowserWindow({
                width: 300,
                height: 150,
                x: width - 320,
                y: 20,
                frame: false,
                transparent: true,
                alwaysOnTop: false,
                skipTaskbar: true,
                resizable: false,
                icon: path.join(__dirname, 'imgs', 'spotiflow.png'),
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    enableRemoteModule: true
                }
            });

            require('@electron/remote/main').enable(mainWindow.webContents);

            mainWindow.loadFile(path.join(__dirname, 'index.html'));
            mainWindow.setAlwaysOnTop(false, 'floating');

            mainWindow.on('close', (event) => {
                if (!app.isQuiting) {
                    event.preventDefault();
                    mainWindow.hide();
                }
                return false;
            });
        } catch (error) {
            console.error('Error creating main window:', error);
        }
    }

    function createSetupWindow() {
        if (setupWindow) {
            setupWindow.focus();
            return;
        }

        try {
            setupWindow = new BrowserWindow({
                width: 400,
                height: 550,
                title: 'Spotiflow Setup',
                resizable: false,
                autoHideMenuBar: true,
                icon: path.join(__dirname, 'imgs', 'spotiflow.png'),
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    enableRemoteModule: true
                }
            });

            require('@electron/remote/main').enable(setupWindow.webContents);

            setupWindow.loadFile(path.join(__dirname, 'config.html'));

            setupWindow.on('closed', () => {
                setupWindow = null;
            });
        } catch (error) {
            console.error('Error creating setup window:', error);
        }
    }

    function createTray() {
        tray = new Tray(path.join(__dirname, 'imgs', 'spotiflow.png'));
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show Spotiflow', click: () => mainWindow.show() },
            {
                label: 'Auto Launch at Startup',
                type: 'checkbox',
                checked: isAutoLaunchEnabled(),
                click: (menuItem) => {
                    setAutoLaunch(menuItem.checked);
                }
            },
            { type: 'separator' },
            {
                label: 'Quit', click: () => {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('Spotiflow');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            mainWindow.show();
        });
    }

    app.whenReady().then(() => {
        createWindow();
        createTray();

        if (localStorage.getItem('first-run') === null) {
            setAutoLaunch(true);
            localStorage.setItem('first-run', 'false');
        }
    });

    app.on('window-all-closed', () => {
        // Keep app running in tray
    });

    app.on('second-instance', (event, argv) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        const url = argv.find(arg => arg.startsWith('spotiflow://'));
        if (url) {
            const code = new URL(url).searchParams.get('code');
            if (code && mainWindow) {
                mainWindow.webContents.send('oauth-code', code);
            }
        }
    });

    ipcMain.on('toggle-auto-launch', (event, enable) => {
        setAutoLaunch(enable);
        event.reply('auto-launch-status', isAutoLaunchEnabled());
    });

    ipcMain.on('get-auto-launch-status', (event) => {
        event.reply('auto-launch-status', isAutoLaunchEnabled());
    });

    ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('quit-app', () => {
        app.isQuiting = true;
        app.quit();
    });

    ipcMain.on('open-setup-window', () => {
        createSetupWindow();
    });

    ipcMain.on('save-settings', (event, data) => {
        if (mainWindow) {
            mainWindow.webContents.send('settings-received', data);
        }
        if (setupWindow) {
            setupWindow.close();
        }
    });
}
