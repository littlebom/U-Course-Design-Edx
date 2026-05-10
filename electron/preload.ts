// Preload script — runs in isolated context with access to a small surface of APIs.
// For now we don't expose anything (the web app uses File System Access API directly).
// Add contextBridge.exposeInMainWorld(...) calls here when you need IPC.
export {};
