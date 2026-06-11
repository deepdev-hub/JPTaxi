import { apiRequest, API_BASE } from './client.js';

const SOCKET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getChatSocketUrl() {
  return `${SOCKET_ORIGIN}/chat`;
}

export function listConversations() {
  return apiRequest('/messages/conversations');
}

export function createConversation(payload) {
  return apiRequest('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getConversation(conversationId) {
  return apiRequest(`/messages/conversations/${conversationId}`);
}

export function listConversationMessages(
  conversationId,
  { limit = 50, beforeMessageId } = {},
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeMessageId != null) {
    params.set('beforeMessageId', String(beforeMessageId));
  }
  return apiRequest(`/messages/conversations/${conversationId}/messages?${params.toString()}`);
}

export function sendConversationMessage(conversationId, body) {
  return apiRequest(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function markConversationRead(conversationId) {
  return apiRequest(`/messages/conversations/${conversationId}/read`, {
    method: 'POST',
  });
}
