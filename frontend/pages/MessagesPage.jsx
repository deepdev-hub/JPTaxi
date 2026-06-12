import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCurrentCustomerId, getCurrentDriverId } from '../api/accounts.js';
import {
  createConversation,
  listConversationMessages,
  listConversations,
  markConversationRead,
  sendConversationMessage,
} from '../api/messages.js';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { useChatSocket } from '../hooks/useChatSocket.js';
import '../styles/app-pages.css';
import { getAuthRole } from '../utils/session.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const QUICK_REPLY_KEYS = [
  'messages.quick.where',
  'messages.quick.arrived',
  'messages.quick.late',
  'messages.quick.ok',
];

function getCurrentRole() {
  return getAuthRole();
}

function firstChar(name) {
  return (name || '?').trim().slice(0, 1) || '?';
}

function formatClock(iso, locale) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function getCurrentUserId(isDriver) {
  return isDriver ? getCurrentDriverId() : getCurrentCustomerId();
}

function normalizeMessageOwner(message, isDriver) {
  if (!message) return message;
  const senderType = message.senderType || message.senderRole;
  const senderId = Number(message.senderId);
  const currentRole = isDriver ? 'driver' : 'customer';
  const currentUserId = getCurrentUserId(isDriver);

  if (senderType && Number.isFinite(senderId)) {
    return {
      ...message,
      isMine: senderType === currentRole && senderId === currentUserId,
    };
  }

  return message;
}

function appendMessageOnce(items, message) {
  if (!message) return items;
  if (message.messageId != null && items.some((item) => item.messageId === message.messageId)) {
    return items;
  }
  return [...items, message];
}

export default function MessagesPage() {
  const { locale, t } = useI18n();
  const { audience } = useParams();
  const [searchParams] = useSearchParams();
  const isDriver = getCurrentRole() === 'driver' || audience === 'customer';
  const homePath = isDriver ? '/driver-home' : '/home';
  const accountPath = isDriver ? '/driver-info/basic' : '/user-info';
  const messagePath = isDriver ? '/messages/customer' : '/messages/driver';
  const peerIdParam = Number(searchParams.get('peerId'));
  const requestIdParam = Number(searchParams.get('requestId'));
  const peerRole = isDriver ? 'customer' : 'driver';

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const viewportRef = useRef(null);
  const requestedPeerRef = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await listConversations();
      const items = data?.items || [];
      setConversations(items);
      if (!selectedConversationId && items.length > 0) {
        setSelectedConversationId(items[0].conversationId);
      }
      return items;
    } catch (err) {
      setError(t('messages.loadConversationsFailed'));
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [selectedConversationId, t]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const data = await listConversationMessages(conversationId, { limit: 50 });
      setMessages((data?.items || []).map((message) => normalizeMessageOwner(message, isDriver)));
      await markConversationRead(conversationId);
      setConversations((prev) => prev.map((item) => (
        item.conversationId === conversationId ? { ...item, unreadCount: 0 } : item
      )));
    } catch (err) {
      setError(t('messages.loadFailed'));
    } finally {
      setLoadingMessages(false);
    }
  }, [isDriver, t]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!Number.isFinite(peerIdParam) || peerIdParam <= 0) return;
    if (requestedPeerRef.current) return;
    requestedPeerRef.current = true;

    async function ensureConversation() {
      try {
        const detail = await createConversation({
          peerRole,
          peerId: peerIdParam,
          ...(Number.isFinite(requestIdParam) && requestIdParam > 0 ? { requestId: requestIdParam } : {}),
        });
        if (detail?.conversationId) {
          setSelectedConversationId(detail.conversationId);
        }
        await refreshConversations();
      } catch (err) {
        setError(t('messages.createFailed'));
      }
    }

    ensureConversation();
  }, [peerIdParam, peerRole, refreshConversations, requestIdParam, t]);

  useEffect(() => {
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messages]);

  const handleNewMessage = useCallback((payload) => {
    const incomingConversationId = payload?.conversationId;
    const incomingMessage = normalizeMessageOwner(payload?.message, isDriver);
    if (!incomingConversationId || !incomingMessage) return;

    setConversations((prev) => prev.map((item) => {
      if (item.conversationId !== incomingConversationId) return item;
      return {
        ...item,
        lastMessage: incomingMessage,
        updatedAt: incomingMessage.sentAt,
        unreadCount: incomingConversationId === selectedConversationId
          ? 0
          : (item.unreadCount || 0) + 1,
      };
    }));

    if (incomingConversationId === selectedConversationId) {
      setMessages((prev) => appendMessageOnce(prev, incomingMessage));
      markConversationRead(selectedConversationId).catch(() => {});
    }
  }, [isDriver, selectedConversationId]);

  useChatSocket({
    conversationId: selectedConversationId,
    onNewMessage: handleNewMessage,
  });

  async function handleSendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversationId || sending) return;

    setSending(true);
    try {
      const result = await sendConversationMessage(selectedConversationId, body);
      const message = normalizeMessageOwner(result?.data, isDriver);
      if (message) {
        setMessages((prev) => appendMessageOnce(prev, message));
        setConversations((prev) => prev.map((item) => (
          item.conversationId === selectedConversationId
            ? { ...item, lastMessage: message, updatedAt: message.sentAt }
            : item
        )));
      }
      setDraft('');
    } catch (err) {
      setError(t('messages.sendFailed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell>
      <main className="messages-window">
        <Topbar brandTo={homePath} actions={<><Link to={homePath}>{t('common.home')}</Link><Link to={messagePath} className="active-header-link">{t('common.messages')}</Link><Link to={accountPath}>{t('common.account')}</Link></>} />
        {error ? <p className="messages-error">{error}</p> : null}

        <section className="zip-chat-container">
          <aside className="zip-chat-sidebar">
            <h1>{t('messages.title')}</h1>
            <div className="zip-chat-list">
              {!loadingConversations && conversations.length === 0 ? (
                <p className="messages-empty">{t('messages.noConversations')}</p>
              ) : null}
              {conversations.map((item) => (
                <button
                  className={`zip-chat-item ${item.conversationId === selectedConversationId ? 'active' : ''}`}
                  type="button"
                  key={item.conversationId}
                  onClick={() => setSelectedConversationId(item.conversationId)}
                >
                  <span className="zip-avatar">{firstChar(item.peer?.name)}</span>
                  <span className="zip-chat-info">
                    <span>
                      <strong>{item.peer?.name || t('messages.user')}</strong>
                      <small>{formatClock(item.lastMessage?.sentAt || item.updatedAt, locale)}</small>
                    </span>
                    <em>
                      {item.lastMessage?.body || t('messages.noMessages')}
                      {item.unreadCount > 0 ? ` (${item.unreadCount})` : ''}
                    </em>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="zip-main-chat">
            {!selectedConversation ? (
              <div className="zip-main-chat-empty">{t('messages.selectConversation')}</div>
            ) : (
              <>
                <header className="zip-chat-header">
                  <div>
                    <span className="zip-avatar small">{firstChar(selectedConversation.peer?.name)}</span>
                    <span><strong>{selectedConversation.peer?.name || t('messages.user')}</strong><small>{t('messages.online')}</small></span>
                  </div>
                </header>

                <div className="zip-messages-viewport" ref={viewportRef}>
                  {!loadingMessages && messages.length === 0 ? (
                    <p className="messages-empty">{t('messages.noMessages')}</p>
                  ) : null}
                  {messages.map((message) => {
                    const isMine = Boolean(message.isMine);
                    const senderLabel = isMine
                      ? (isDriver ? t('common.driver') : t('common.customer'))
                      : (isDriver ? t('common.customer') : t('common.driver'));
                    return (
                      <div
                        className={`message-row ${isMine ? 'sent' : 'received'}`}
                        key={message.messageId}
                      >
                        <p className="msg">
                          <strong>{senderLabel}</strong>
                          {message.body}
                          <span>{formatClock(message.sentAt, locale)}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                <footer className="zip-input-area">
                  <div className="quick-replies">
                    {QUICK_REPLY_KEYS.map((key) => (
                      <button type="button" key={key} onClick={() => setDraft(t(key))}>{t(key)}</button>
                    ))}
                  </div>
                  <form className="zip-input-box" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      placeholder={t('messages.placeholder')}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit" disabled={sending || !draft.trim()}>➤</button>
                  </form>
                </footer>
              </>
            )}
          </section>
        </section>
      </main>
    </PageShell>
  );
}
