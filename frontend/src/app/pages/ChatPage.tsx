import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, MessageCircle, Search, Send, Store } from "lucide-react";
import {
  createConversation,
  createMessage,
  getConversations,
  getMessages,
  getRestaurants,
  getUsers,
} from "../api/client";
import type { Conversation, Message, Restaurant, User } from "../types";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function ChatPage() {
  const { currentUser, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restaurantParam = searchParams.get("restaurantId");

  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationData, setConversationData] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    setLoadingConversations(true);
    setError(null);

    Promise.all([
      getConversations(currentUser.id),
      getUsers(),
      getRestaurants(),
    ])
      .then(async ([conversationResult, userResult, restaurantResult]) => {
        if (!mounted) return;

        let nextConversations = conversationResult;
        let nextSelected = selectedConv ?? conversationResult[0]?.id ?? null;

        if (restaurantParam) {
          const targetRestaurant = restaurantResult.find((restaurant) => restaurant.id === restaurantParam);

          if (targetRestaurant && targetRestaurant.ownerId !== currentUser.id) {
            const existingConversation = conversationResult.find(
              (conversation) =>
                conversation.restaurantId === restaurantParam &&
                conversation.participants.includes(currentUser.id) &&
                conversation.participants.includes(targetRestaurant.ownerId)
            );

            if (existingConversation) {
              nextSelected = existingConversation.id;
            } else {
              const createdConversation = await createConversation({
                userId: currentUser.id,
                restaurantId: restaurantParam,
              });
              nextConversations = [createdConversation, ...conversationResult];
              nextSelected = createdConversation.id;
            }
          }
        }

        if (!mounted) return;
        setConversationData(nextConversations);
        setUsers(userResult);
        setRestaurants(restaurantResult);
        setSelectedConv(nextSelected);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Cannot load conversations");
      })
      .finally(() => {
        if (mounted) setLoadingConversations(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser, restaurantParam]);

  const conversations = currentUser ? conversationData.map((conv) => {
    const otherUserId = conv.participants.find((participant) => participant !== currentUser.id);
    const otherUser =
      users.find((user) => user.id === otherUserId) ||
      users.find((user) => user.id !== currentUser.id) ||
      currentUser;
    const restaurant = conv.restaurantId
      ? restaurants.find((item) => item.id === conv.restaurantId) || null
      : null;

    return { ...conv, otherUser, restaurant };
  }) : [];

  const filteredConversations = conversations.filter((conversation) => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return true;

    return (
      conversation.otherUser.name.toLowerCase().includes(query) ||
      conversation.restaurant?.nameVn.toLowerCase().includes(query) ||
      conversation.restaurant?.nameJp.toLowerCase().includes(query) ||
      conversation.lastMessage?.toLowerCase().includes(query)
    );
  });

  const activeConversation = conversations.find((conv) => conv.id === selectedConv);
  const convMessages = activeConversation
    ? messages.filter((message) => {
        const matchesUsers =
          activeConversation.participants.includes(message.senderId) &&
          activeConversation.participants.includes(message.receiverId);
        const matchesRestaurant =
          !activeConversation.restaurantId ||
          message.restaurantId === activeConversation.restaurantId;

        return matchesUsers && matchesRestaurant;
      })
    : [];

  useEffect(() => {
    if (!currentUser || !selectedConv) {
      setMessages([]);
      return;
    }

    let mounted = true;
    setLoadingMessages(true);
    setMessages([]);

    getMessages(currentUser.id, selectedConv)
      .then((messageResult) => {
        if (mounted) setMessages(messageResult);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Cannot load messages");
      })
      .finally(() => {
        if (mounted) setLoadingMessages(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser, selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !currentUser || sending) return;

    setSending(true);
    setError(null);

    try {
      const savedMessage = await createMessage({
        conversationId: activeConversation.id,
        senderId: currentUser.id,
        receiverId: activeConversation.otherUser.id,
        restaurantId: activeConversation.restaurantId,
        content: newMessage,
      });

      setMessages((prev) => [...prev, savedMessage]);
      setConversationData((prev) =>
        prev
          .map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  lastMessage: savedMessage.content,
                  lastTimestamp: savedMessage.timestamp,
                }
              : conversation
          )
          .sort((a, b) => new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime())
      );
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const getSenderLabel = (message: Message) => {
    const isRestaurantSender = activeConversation?.restaurant?.ownerId === message.senderId;
    return isRestaurantSender ? t.chat.restaurantLabel : t.chat.customerLabel;
  };

  if (!isLoggedIn || !currentUser) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex">
      <div
        className={`${
          selectedConv ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-80 border-r border-gray-100 bg-white`}
      >
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-gray-900 mb-3">{t.chat.title}</h2>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder={t.chat.searchPlaceholder}
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-sm text-gray-400">{t.chat.loading}</div>
          ) : error && conversationData.length === 0 ? (
            <div className="p-4 text-sm text-red-500">{error}</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-gray-700">{t.chat.emptyTitle}</p>
              <p className="text-xs text-gray-400 mt-1">{t.chat.emptyDesc}</p>
            </div>
          ) : filteredConversations.map((conv) => {
            const isSelected = selectedConv === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={`w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                    {conv.otherUser.avatar ? (
                      <img src={conv.otherUser.avatar} alt={conv.otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-sm">{conv.otherUser.name?.[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className="text-sm text-gray-900 truncate">{conv.otherUser.name}</p>
                    <p className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(conv.lastTimestamp)}</p>
                  </div>
                  {conv.restaurant && (
                    <p className="text-[10px] text-blue-500 mb-0.5 flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {conv.restaurant.nameJp}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-100">
          <Link
            to="/search"
            className="flex items-center gap-2 justify-center py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t.chat.findRestaurant}
          </Link>
        </div>
      </div>

      {selectedConv ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
              {activeConversation?.otherUser.avatar ? (
                <img
                  src={activeConversation.otherUser.avatar}
                  alt={activeConversation.otherUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-600">
                  {activeConversation?.otherUser.name?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activeConversation?.otherUser.name}</p>
              {activeConversation?.restaurant && (
                <Link
                  to={`/restaurant/${activeConversation.restaurantId}`}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Store className="w-3 h-3" />
                  {activeConversation.restaurant.nameJp}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-xs text-gray-400">{t.chat.online}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeConversation?.restaurant && (
              <div className="flex justify-center mb-4">
                <Link
                  to={`/restaurant/${activeConversation.restaurantId}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm max-w-sm w-full hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={activeConversation.restaurant.coverImage}
                      alt={activeConversation.restaurant.nameVn}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 truncate">{activeConversation.restaurant.nameJp}</p>
                    <p className="text-[10px] text-gray-400 truncate">{activeConversation.restaurant.address}</p>
                  </div>
                  <span className="text-[10px] text-blue-500 flex-shrink-0">{t.chat.detailLink}</span>
                </Link>
              </div>
            )}

            {loadingMessages ? (
              <div className="text-center text-sm text-gray-400 py-8">{t.chat.loading}</div>
            ) : convMessages.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">{t.chat.noMessages}</div>
            ) : convMessages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} gap-2`}>
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-auto">
                      {activeConversation?.otherUser.avatar ? (
                        <img src={activeConversation.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                          {activeConversation?.otherUser.name?.[0]}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwnMessage ? "text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                      }`}
                      style={isOwnMessage ? { background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" } : {}}
                    >
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {getSenderLabel(msg)} · {formatTime(msg.timestamp)}
                      {isOwnMessage && (
                        <span> · {msg.read ? t.chat.read : t.chat.sent}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-100 p-3">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t.chat.messagePlaceholder}
                className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none border border-gray-200 focus:border-blue-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:opacity-90 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-50">
          <div className="text-5xl mb-4">...</div>
          <h3 className="text-gray-700 mb-2">{t.chat.selectConv}</h3>
          <p className="text-sm text-gray-400 text-center max-w-xs">{t.chat.selectDesc}</p>
          <Link
            to="/search"
            className="mt-6 px-4 py-2.5 text-sm text-white rounded-xl transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
          >
            {t.chat.findRestaurantBtn}
          </Link>
        </div>
      )}
    </div>
  );
}
