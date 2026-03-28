import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string) {
    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    
    this.socket = io(WS_URL, {
      transports: ['websocket'],
      auth: {
        token: `Bearer ${token}`,
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
    
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnect();
    });

    // Security events
    this.socket.on('security_alert', (data) => {
      console.warn('Security alert received:', data);
      // Handle security alert
    });

    // Attendance updates
    this.socket.on('attendance_update', (data) => {
      console.log('Attendance update received:', data);
      // Handle attendance update
    });

    // Spoof detection events
    this.socket.on('spoof_detection', (data) => {
      console.warn('Spoof detection event received:', data);
      // Handle spoof detection
    });

    // System notifications
    this.socket.on('system_notification', (data) => {
      console.log('System notification received:', data);
      // Handle system notification
    });
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.socket) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket ? this.socket.connected : false;
  }
}

export const websocketService = new WebSocketService();