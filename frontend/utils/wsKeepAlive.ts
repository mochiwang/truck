let pingTimer: NodeJS.Timeout | null = null;

export function startPing(ws: WebSocket, interval = 3000) {
  stopPing();
  pingTimer = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.send('{"type":"ping"}');
  }, interval);
}

export function stopPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}
