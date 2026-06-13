import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { listConversations } from '../api/messages.js';
import { useChatSocket } from '../hooks/useChatSocket.js';
import { getAuthToken } from '../utils/session.js';
import { useLocation } from 'react-router-dom';

const ChatContext = createContext({
  totalUnread: 0,
  refreshUnread: async () => {},
  decreaseUnread: (amount = 1) => {},
});

export function ChatProvider({ children }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const location = useLocation();

  const refreshUnread = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setTotalUnread(0);
      return;
    }
    try {
      const data = await listConversations();
      const items = data?.items || [];
      const count = items.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
      setTotalUnread(count);
    } catch (err) {
      // Ignore error if not logged in or network fails
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, location.pathname]); 

  const handleNewMessage = useCallback((payload) => {
    setTotalUnread((prev) => prev + 1);
  }, []);

  useChatSocket({
    conversationId: null,
    onNewMessage: handleNewMessage,
  });

  const decreaseUnread = useCallback((amount = 1) => {
    setTotalUnread((prev) => Math.max(0, prev - amount));
  }, []);

  return (
    <ChatContext.Provider value={{ totalUnread, refreshUnread, decreaseUnread }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatNotification() {
  return useContext(ChatContext);
}
