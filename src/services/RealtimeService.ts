/*
  Lightweight realtime sync over WebSocket.
  - Connects to ws:// URL
  - Joins a room by projectId
  - Broadcasts full project snapshot on local mutations
  - Applies incoming snapshots via onProjectReceived callback
*/

export type RealtimeCallbacks = {
  onProjectReceived: (projectJson: string) => void;
  onStatus?: (status: 'connected' | 'disconnected' | 'error') => void;
};

const CLIENT_ID_KEY = 'kanban_client_id';

const getClientId = (): string => {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
};

export class RealtimeService {
  private socket: WebSocket | null = null;
  private projectId: string | null = null;
  //@ts-ignore
  private wsUrl: string | null = null;
  private callbacks: RealtimeCallbacks | null = null;

  connect(wsUrl: string, projectId: string, callbacks: RealtimeCallbacks) {
    this.disconnect();
    this.wsUrl = wsUrl;
    this.projectId = projectId;
    this.callbacks = callbacks;

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (e) {
      callbacks.onStatus?.('error');
      return;
    }

    this.socket.addEventListener('open', () => {
      callbacks.onStatus?.('connected');
      this.send({ type: 'join', projectId, clientId: getClientId() });
      // persist ws url for later sharing
      try { localStorage.setItem('kanban_ws_url', wsUrl); } catch {}
    });

    this.socket.addEventListener('close', () => {
      callbacks.onStatus?.('disconnected');
    });

    this.socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'project:update' && msg.projectId === this.projectId) {
          if (msg.clientId && msg.clientId === getClientId()) return; // ignore own
          if (typeof msg.payload === 'string') {
            this.callbacks?.onProjectReceived(msg.payload);
          }
        }
      } catch (e) {
        // ignore invalid frames
      }
    });
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
  }

  sendUpdatedProject(projectJson: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.projectId) return;
    this.send({
      type: 'project:update',
      projectId: this.projectId,
      clientId: getClientId(),
      payload: projectJson,
    });
  }

  private send(obj: any) {
    try {
      this.socket?.send(JSON.stringify(obj));
    } catch {}
  }
}
