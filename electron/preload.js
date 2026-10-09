// Puente mínimo entre el juego y la ventana de escritorio.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskbarz', {
  setMode: (mode) => ipcRenderer.send('taskbarz:mode', mode),
  setClickThrough: (on) => ipcRenderer.send('taskbarz:through', on),
  grab: (rect, size) => ipcRenderer.invoke('taskbarz:grab', rect, size),
  quit: () => ipcRenderer.send('taskbarz:quit'),
});
