// Puente mínimo entre el juego y la ventana de escritorio.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskbarz', {
  setMode: (mode) => ipcRenderer.send('taskbarz:mode', mode),
  setClickThrough: (on) => ipcRenderer.send('taskbarz:through', on),
  getLayout: () => ipcRenderer.invoke('taskbarz:get-layout'),
  setLayout: (l) => ipcRenderer.send('taskbarz:set-layout', l),
  quit: () => ipcRenderer.send('taskbarz:quit'),
});
