import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, Search, Phone, User, 
  Image as ImageIcon, Video, FileText, MoreVertical, 
  ChevronLeft, RefreshCw, Check, CheckCheck 
} from 'lucide-react';
import { dataService } from '../dataService';
import { supabase } from '../supabaseClient';
import { Client } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import axios from 'axios';

interface ChatMessage {
  id: string;
  created_at: string;
  phone: string;
  message: string;
  direction: 'inbound' | 'outbound';
  media_url?: string;
  media_type?: string;
  status?: string;
}

interface ChatProps {
  clients: Client[];
  whatsappConfig: {
    whatsappApiToken: string;
    whatsappPhoneNumberId: string;
  };
}

const Chat: React.FC<ChatProps> = ({ clients, whatsappConfig }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversations();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('whatsapp_messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (activeChat && newMessage.phone === activeChat) {
            setMessages(prev => [...prev, newMessage]);
          }
          loadConversations(); // Update list order
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const list = await dataService.getChatList();
      setConversations(list);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadMessages = async (phone: string) => {
    try {
      const msgs = await dataService.getChatMessages(phone);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText('');

    try {
      // 1. Send via WhatsApp API
      await axios.post('/api/send-whatsapp', {
        phone: activeChat,
        message: textToSend
      });

      // 2. Save locally in DB
      const client = clients.find(c => c.phone.includes(activeChat.slice(-8)));
      await dataService.saveChatMessage({
        phone: activeChat,
        message: textToSend,
        direction: 'outbound',
        clientId: client?.id
      });

      // Local update (Real-time will also trigger but this is for instant feedback)
      // loadMessages(activeChat); // Optional if realtime is fast enough
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Erro ao enviar mensagem.');
      setInputText(textToSend); // Restore text on error
    } finally {
      setIsSending(false);
    }
  };

  const getClientName = (phone: string) => {
    const client = clients.find(c => c.phone.includes(phone.slice(-8)));
    return client ? client.name : phone;
  };

  const filteredConversations = conversations.filter(c => 
    c.phone.includes(searchQuery) || getClientName(c.phone).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Conversas</h2>
            <button onClick={loadConversations} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-blue-600">
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filteredConversations.length > 0 ? filteredConversations.map((conv) => (
            <div 
              key={conv.phone} 
              onClick={() => setActiveChat(conv.phone)}
              className={`p-4 rounded-3xl cursor-pointer transition-all flex items-center gap-4 border ${activeChat === conv.phone ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' : 'bg-white border-transparent hover:border-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${activeChat === conv.phone ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className={`text-sm font-black truncate uppercase tracking-tight ${activeChat === conv.phone ? 'text-white' : 'text-slate-800'}`}>
                    {getClientName(conv.phone)}
                  </p>
                  <span className={`text-[9px] font-bold shrink-0 ${activeChat === conv.phone ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs truncate font-medium ${activeChat === conv.phone ? 'text-white/80' : 'text-slate-500'}`}>
                  {conv.direction === 'outbound' && 'Você: '}{conv.message || 'Mídia'}
                </p>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 opacity-20">
              <MessageCircle size={48} className="mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Nenhuma conversa</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`flex-1 flex flex-col bg-white ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  {getClientName(activeChat).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{getClientName(activeChat)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Phone size={18} /></button>
                <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><MoreVertical size={18} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
              {messages.map((msg, idx) => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] md:max-w-[70%] space-y-1`}>
                    <div className={`p-4 rounded-[24px] shadow-sm ${msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                      {msg.media_url ? (
                        <div className="space-y-3">
                          {msg.media_type === 'image' && (
                            <img src={msg.media_url} alt="WhatsApp" className="rounded-xl w-full max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                          )}
                          {msg.media_type === 'video' && (
                            <video src={msg.media_url} controls className="rounded-xl w-full max-h-80 object-cover" />
                          )}
                          {msg.media_type === 'audio' && (
                            <audio src={msg.media_url} controls className="w-full" />
                          )}
                          {msg.message && <p className="text-sm font-medium leading-relaxed">{msg.message}</p>}
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'outbound' && (
                        <span className="text-blue-400"><CheckCheck size={12} /></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 shrink-0 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-[24px] border border-slate-100 focus-within:ring-2 focus-within:ring-blue-600/10 focus-within:border-blue-600/30 transition-all">
                <button type="button" className="p-3 text-slate-400 hover:text-blue-600 transition-colors"><ImageIcon size={20} /></button>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite sua mensagem..." 
                  className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                />
                <button 
                  type="submit" 
                  disabled={!inputText.trim() || isSending}
                  className={`p-4 rounded-2xl flex items-center justify-center transition-all ${!inputText.trim() || isSending ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-100 active:scale-95'}`}
                >
                  {isSending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6">
            <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center text-slate-200">
              <MessageCircle size={48} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-400 mb-2">Selecione uma conversa</h3>
              <p className="text-sm font-bold uppercase tracking-widest opacity-50">Escolha um cliente para iniciar o chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
