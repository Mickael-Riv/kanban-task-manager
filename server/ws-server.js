#!/usr/bin/env node
/* Simple WebSocket relay server with rooms per projectId.
   - Env: PORT (default 8080)
   - Protocol messages (JSON):
     { type: 'join', projectId, clientId }
     { type: 'project:update', projectId, clientId, payload }
*/
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const wss = new WebSocketServer({ port: PORT });

/** @type {Map<string, Set<WebSocket>>} */
const rooms = new Map();

function ensureRoom(id) {
  if (!rooms.has(id)) rooms.set(id, new Set());
  return rooms.get(id);
}

wss.on('connection', (ws) => {
  ws._rooms = new Set();
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.type === 'join' && msg.projectId) {
        const room = ensureRoom(msg.projectId);
        room.add(ws);
        ws._rooms.add(msg.projectId);
        return;
      }
      if (msg?.type === 'project:update' && msg.projectId && typeof msg.payload === 'string') {
        const room = rooms.get(msg.projectId);
        if (!room) return;
        // broadcast to others in room
        for (const client of room) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'project:update',
              projectId: msg.projectId,
              clientId: msg.clientId,
              payload: msg.payload,
            }));
          }
        }
      }
    } catch (e) {
      // ignore bad messages
    }
  });

  ws.on('close', () => {
    // remove from rooms
    for (const id of ws._rooms || []) {
      const room = rooms.get(id);
      if (room) {
        room.delete(ws);
        if (room.size === 0) rooms.delete(id);
      }
    }
  });
});

wss.on('listening', () => {
  console.log(`WS relay listening on ws://localhost:${PORT}`);
});
