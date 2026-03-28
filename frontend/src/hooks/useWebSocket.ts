import { useState, useEffect } from 'react';
import { websocketService } from '@services/websocketService';

interface WebSocketHook {
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (event: string, data: any) => void;
}

export const useWebSocket = (): WebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Listen for connection status changes
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);

    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
    };
  }, []);

  const connect = (token: string) => {
    websocketService.connect(token);
  };

  const disconnect = () => {
    websocketService.disconnect();
    setIsConnected(false);
  };

  const sendMessage = (event: string, data: any) => {
    websocketService.emit(event, data);
  };

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
  };
};