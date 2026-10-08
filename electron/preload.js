// Puente mínimo entre el juego y la ventana de escritorio.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskbarz', {
  setMode: (mode) => ipcRenderer.send('taskbarz:mode', mode),
  quit: () => ipcRenderer.send('taskbarz:quit'),
});
