const { contextBridge, ipcRenderer, webUtils  } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }
  })

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    ping: () => ipcRenderer.invoke('ping'),
})

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('open-file-dialog'),
  compressFile: (filePath) => ipcRenderer.invoke('compress-file', filePath),
  getFilePath: (file) => webUtils.getPathForFile(file),
  onTrayButtonPressed: (callback) => {
    ipcRenderer.on('tray-button-pressed', callback);
  }
});

