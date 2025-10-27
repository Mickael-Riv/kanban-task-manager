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
  onPresencePing?: (clientId: string, ts: number) => void;
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
  private es: EventSource | null = null;
  private transport: 'ws' | 'sse' | null = null;

  connect(wsUrl: string, projectId: string, callbacks: RealtimeCallbacks) {
    this.disconnect();
    this.wsUrl = wsUrl;
    this.projectId = projectId;
    this.callbacks = callbacks;
    const isWS = /^wss?:\/\//i.test(wsUrl);
    if (isWS) {
      this.transport = 'ws';
      try {
        this.socket = new WebSocket(wsUrl);
      } catch (e) {
        callbacks.onStatus?.('error');
        return;
      }

      this.socket.addEventListener('open', () => {
        callbacks.onStatus?.('connected');
        this.send({ type: 'join', projectId, clientId: getClientId() });
        try { localStorage.setItem('kanban_ws_url', wsUrl); } catch {}
      });

      this.socket.addEventListener('close', () => {
        callbacks.onStatus?.('disconnected');
      });

      this.socket.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'project:update' && msg.projectId === this.projectId) {
            if (msg.clientId && msg.clientId === getClientId()) return;
            if (typeof msg.payload === 'string') {
              this.callbacks?.onProjectReceived(msg.payload);
            }
          } else if ((msg?.type === 'presence:ping' || msg?.type === 'presence:bye') && msg.projectId === this.projectId) {
            const fromId = typeof msg.clientId === 'string' ? msg.clientId : '';
            const ts = typeof msg.ts === 'number' ? msg.ts : Date.now();
            if (fromId) this.callbacks?.onPresencePing?.(fromId, ts);
          }
        } catch (e) {
          // ignore invalid frames
        }
      });
      return;
    }

    const isHTTP = /^https?:\/\//i.test(wsUrl);
    if (isHTTP) {
      this.transport = 'sse';
      const base = wsUrl.replace(/\/$/, '');
      const sseUrl = `${base}/realtime?projectId=${encodeURIComponent(projectId)}&clientId=${encodeURIComponent(getClientId())}`;
      try {
        this.es = new EventSource(sseUrl);
      } catch (e) {
        callbacks.onStatus?.('error');
        return;
      }
      this.es.onopen = () => {
        callbacks.onStatus?.('connected');
        try { localStorage.setItem('kanban_ws_url', wsUrl); } catch {}
      };
      this.es.onerror = () => {
        callbacks.onStatus?.('disconnected');
      };
      this.es.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'project:update' && msg.projectId === this.projectId) {
            if (msg.clientId && msg.clientId === getClientId()) return;
            if (typeof msg.payload === 'string') {
              this.callbacks?.onProjectReceived(msg.payload);
            }
          } else if ((msg?.type === 'presence:ping' || msg?.type === 'presence:bye') && msg.projectId === this.projectId) {
            const fromId = typeof msg.clientId === 'string' ? msg.clientId : '';
            const ts = typeof msg.ts === 'number' ? msg.ts : Date.now();
            if (fromId) this.callbacks?.onPresencePing?.(fromId, ts);
          }
        } catch (e) {
          // ignore invalid frames
        }
      };
      return;
    }

    callbacks.onStatus?.('error');
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
    if (this.es) {
      try { this.es.close(); } catch {}
      this.es = null;
    }
    this.transport = null;
  }

  sendUpdatedProject(projectJson: string) {
    if (!this.projectId) return;
    if (this.transport === 'ws') {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      this.send({
        type: 'project:update',
        projectId: this.projectId,
        clientId: getClientId(),
        payload: projectJson,
      });
      return;
    }
    if (this.transport === 'sse' && this.wsUrl) {
      const base = this.wsUrl.replace(/\/$/, '');
      fetch(`${base}/realtime`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'project:update',
          projectId: this.projectId,
          clientId: getClientId(),
          payload: projectJson,
        }),
      }).catch(() => {});
    }
  }

  sendPresencePing() {
    if (!this.projectId) return;
    const frame = {
      type: 'presence:ping',
      projectId: this.projectId,
      clientId: getClientId(),
      ts: Date.now(),
    } as const;
    if (this.transport === 'ws') {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      this.send(frame);
      return;
    }
    if (this.transport === 'sse' && this.wsUrl) {
      const base = this.wsUrl.replace(/\/$/, '');
      fetch(`${base}/realtime`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(frame),
      }).catch(() => {});
    }
  }

  sendPresenceBye() {
    if (!this.projectId) return;
    const frame = {
      type: 'presence:bye',
      projectId: this.projectId,
      clientId: getClientId(),
      ts: Date.now(),
    } as const;
    if (this.transport === 'ws') {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      this.send(frame);
      return;
    }
    if (this.transport === 'sse' && this.wsUrl) {
      const base = this.wsUrl.replace(/\/$/, '');
      fetch(`${base}/realtime`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(frame),
      }).catch(() => {});
    }
  }

  private send(obj: any) {
    try {
      this.socket?.send(JSON.stringify(obj));
    } catch {}
  }
}
