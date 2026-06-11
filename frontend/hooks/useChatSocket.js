import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getChatSocketUrl } from '../api/messages.js';

function readActiveToken() {
  const activeRole = sessionStorage.getItem('jpTaxiActiveRole') || localStorage.getItem('jpTaxiRole');
  const roleToken = activeRole === 'driver'
    ? localStorage.getItem('jpTaxiDriverToken')
    : localStorage.getItem('jpTaxiCustomerToken');
  return roleToken || localStorage.getItem('jpTaxiToken');
}

export function useChatSocket({ conversationId, onNewMessage }) {
  const socketRef = useRef(null);
  const handlerRef = useRef(onNewMessage);
  handlerRef.current = onNewMessage;

  useEffect(() => {
    const token = readActiveToken();
    if (!token) return undefined;

    const socket = io(getChatSocketUrl(), {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('newMessage', (payload) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(payload);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || conversationId == null) return undefined;

    const join = () => {
      socket.emit('joinConversation', { conversationId });
    };

    if (socket.connected) {
      join();
    } else {
      socket.on('connect', join);
    }

    return () => {
      socket.off('connect', join);
    };
  }, [conversationId]);
}
