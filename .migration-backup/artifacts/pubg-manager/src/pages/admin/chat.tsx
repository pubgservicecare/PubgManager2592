import { AdminLayout } from "@/components/AdminLayout";
import { useListChatSessions, useGetChatMessages, useSendChatMessage, useMarkSessionRead } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Gamepad2, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/helpers";
import { useQueryClient } from "@tanstack/react-query";

export function AdminChat() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], refetch: refetchSessions } = useListChatSessions({
    query: { refetchInterval: 10000 } as any
  });

  const { data: messages = [], refetch: refetchMessages } = useGetChatMessages(activeSession || "", {
    query: { enabled: !!activeSession, refetchInterval: 3000 } as any
  });

  const sendMut = useSendChatMessage({
    mutation: {
      onSuccess: () => {
        setMessage("");
        refetchMessages();
        refetchSessions();
      }
    }
  });

  const markReadMut = useMarkSessionRead({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({queryKey: ["/api/dashboard"]}); refetchSessions(); } }
  });

  useEffect(() => {
    if (activeSession) {
      markReadMut.mutate({ sessionId: activeSession });
    }
  }, [activeSession, messages.length]); // Mark read when opening or receiving new msgs while open

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const activeSessionData = sessions.find(s => s.sessionId === activeSession);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-secondary/20">
          <div className="p-4 border-b border-border bg-card">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> LIVE INBOX
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
            {sessions.length === 0 && <p className="text-muted-foreground p-4 text-center text-sm">No active chats.</p>}
            {sessions.map(s => (
              <button 
                key={s.sessionId}
                onClick={() => setActiveSession(s.sessionId)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${activeSession === s.sessionId ? 'bg-primary/10 border-primary/30' : 'bg-transparent border-transparent hover:bg-secondary/50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-white truncate pr-2">{s.guestName || "Guest"}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground truncate pr-2">{s.lastMessage || "Started chat"}</span>
                  {s.unreadCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{s.unreadCount}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background/30">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{activeSessionData?.guestName || "Guest"}</h3>
                    <p className="text-xs text-green-500 font-medium">Online</p>
                  </div>
                </div>
                {activeSessionData?.accountTitle && (
                  <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg text-primary text-sm font-bold">
                    <Gamepad2 className="w-4 h-4" /> {activeSessionData.accountTitle}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                  const isAdmin = msg.sender === "admin";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-white rounded-tl-sm border border-border'}`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatDateTime(msg.createdAt)}
                        </span>
                        {isAdmin && <CheckCheck className="w-3 h-3 text-primary" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="p-4 bg-card border-t border-border">
                <form onSubmit={e => {
                  e.preventDefault();
                  if(message.trim()) sendMut.mutate({ sessionId: activeSession, data: { message, sender: "admin" } });
                }} className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-5 py-3 text-white outline-none transition-colors"
                  />
                  <button disabled={sendMut.isPending || !message.trim()} type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 w-14 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/20">
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold text-lg text-white">No Conversation Selected</p>
              <p>Select a chat from the sidebar to reply.</p>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
