import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Send, MessageCircle, ChevronLeft, Store, Search } from "lucide-react";
import { mockMessages, mockConversations, mockUsers, mockRestaurants, Message } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function ChatPage() {
  const { currentUser, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn || !currentUser) {
    return null;
  }

  const conversations = mockConversations.map((conv) => {
    const otherUserId = conv.participants.find((p) => p !== currentUser.id);
    const otherUser = mockUsers.find((u) => u.id === otherUserId) || mockUsers[1];
    const restaurant = conv.restaurantId
      ? mockRestaurants.find((r) => r.id === conv.restaurantId)
      : null;
    return { ...conv, otherUser, restaurant };
  });

  const demoConversations = conversations.length > 0 ? conversations : [
    {
      id: "conv1",
      participants: ["u1", "u2"],
      lastMessage: "承知しました！お待ちしております。ご来店の際は12番のお席にご案内します。",
      lastTimestamp: "2026-03-26T09:12:00",
      restaurantId: "r1",
      restaurantName: "Phở Bắc Cổ Truyền",
      otherUser: currentUser.role === "owner" ? mockUsers[0] : mockUsers[1],
      restaurant: mockRestaurants[0],
    },
    {
      id: "conv2",
      participants: ["u1", "u4"],
      lastMessage: "21時まで営業しております。ランチタイムは少し早めに...",
      lastTimestamp: "2026-03-26T11:35:00",
      restaurantId: "r2",
      restaurantName: "Bún Chả Hà Nội Chị Liên",
      otherUser: mockUsers[3],
      restaurant: mockRestaurants[1],
    },
  ];

  const activeConversation = demoConversations.find((c) => c.id === selectedConv);
  const convMessages = selectedConv
    ? messages.filter(
        (m) =>
          (m.senderId === currentUser.id ||
            m.receiverId === currentUser.id ||
            m.senderId === "u1" ||
            m.receiverId === "u1" ||
            m.senderId === "u2" ||
            m.receiverId === "u2") &&
          (selectedConv === "conv1"
            ? (m.senderId === "u1" && m.receiverId === "u2") ||
              (m.senderId === "u2" && m.receiverId === "u1")
            : (m.senderId === "u3" && m.receiverId === "u4") ||
              (m.senderId === "u4" && m.receiverId === "u3"))
      )
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    const otherUser = activeConversation?.otherUser;
    const newMsg: Message = {
      id: `msg${Date.now()}`,
      senderId: "u1",
      receiverId: otherUser?.id || "u2",
      restaurantId: activeConversation?.restaurantId,
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages([...messages, newMsg]);
    setNewMessage("");

    setTimeout(() => {
      const autoReply: Message = {
        id: `msg${Date.now() + 1}`,
        senderId: otherUser?.id || "u2",
        receiverId: "u1",
        restaurantId: activeConversation?.restaurantId,
        content: "はい、ありがとうございます！何かご質問がございましたらお気軽にお申し付けください。",
        timestamp: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1500);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Sidebar */}
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
              placeholder={t.chat.searchPlaceholder}
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {demoConversations.map((conv) => {
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
                    {conv.otherUser?.avatar ? (
                      <img src={conv.otherUser.avatar} alt={conv.otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-sm">{conv.otherUser?.name?.[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className="text-sm text-gray-900 truncate">{conv.otherUser?.name}</p>
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

      {/* Chat window */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
              {activeConversation?.otherUser?.avatar ? (
                <img src={activeConversation.otherUser.avatar} alt={activeConversation.otherUser.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-600">
                  {activeConversation?.otherUser?.name?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activeConversation?.otherUser?.name}</p>
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
                    <img src={activeConversation.restaurant.coverImage} alt={activeConversation.restaurant.nameVn} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 truncate">{activeConversation.restaurant.nameJp}</p>
                    <p className="text-[10px] text-gray-400 truncate">{activeConversation.restaurant.address}</p>
                  </div>
                  <span className="text-[10px] text-blue-500 flex-shrink-0">{t.chat.detailLink}</span>
                </Link>
              </div>
            )}

            {convMessages.map((msg) => {
              const isOwnMessage = msg.senderId === "u1";
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} gap-2`}>
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-auto">
                      {activeConversation?.otherUser?.avatar ? (
                        <img src={activeConversation.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                          {activeConversation?.otherUser?.name?.[0]}
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
                    <p className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-100 p-3">
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
                disabled={!newMessage.trim()}
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
          <div className="text-5xl mb-4">💬</div>
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