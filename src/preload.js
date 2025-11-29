const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose safe IPC methods to renderer process
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => {
            const validChannels = [
                'minimize-window',
                'quit-app',
                'open-setup-window',
                'save-settings'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        on: (channel, func) => {
            const validChannels = [
                'settings-received',
                'oauth-code'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
        once: (channel, func) => {
            const validChannels = [
                'settings-received',
                'oauth-code'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.once(channel, (event, ...args) => func(...args));
            }
        },
        removeAllListeners: (channel) => {
            const validChannels = [
                'settings-received',
                'oauth-code'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.removeAllListeners(channel);
            }
        }
    },
    shell: {
        openExternal: (url) => {
            // Validate URL before opening
            if (url.startsWith('http://') || url.startsWith('https://')) {
                shell.openExternal(url);
            }
        }
    }
});
