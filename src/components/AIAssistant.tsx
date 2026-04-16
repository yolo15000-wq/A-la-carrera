import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquare, Loader2, User, Mic } from 'lucide-react';
import { aiService, type AIChatMessage } from '../services/aiService';
import { useAuth } from '../context/AuthContext';

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: AIChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await aiService.chat([...messages, userMessage], {
        username: user?.username,
        role: user?.role
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Botón Flotante */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 size-16 bg-gray-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <Bot size={30} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 size-4 bg-brand-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] bg-white dark:bg-gray-900 md:rounded-[40px] shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom duration-300 border border-gray-100 dark:border-gray-800">
          {/* Header */}
          <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-brand-500 rounded-2xl flex items-center justify-center">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase italic leading-none">Asistente IA</h3>
                <p className="text-[9px] text-brand-300 font-bold uppercase tracking-widest mt-1">DeepSeek Engineering</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-950/50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
                <MessageSquare size={40} />
                <p className="text-xs font-black uppercase italic">¿En qué puedo ayudarte hoy, {user.username}?<br/><span className="text-[8px] font-bold">Puedes pedirme registrar clientes, consultar stock o deudas.</span></p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-brand-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-black uppercase italic">
                    {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    {m.role === 'user' ? user.username : 'DeepSeek'}
                  </div>
                  {m.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm flex gap-2 items-center">
                  <Loader2 size={16} className="animate-spin text-brand-500" />
                  <span className="text-[10px] font-black uppercase italic text-gray-400">Analizando datos...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-3xl border border-gray-200 dark:border-gray-700 focus-within:border-brand-500 transition-all">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe aquí tu consulta..."
                className="flex-1 bg-transparent px-4 py-2 outline-none text-sm font-bold uppercase italic"
              />
              <button className="p-3 text-gray-400 hover:text-brand-500 transition-colors">
                <Mic size={20} />
              </button>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gray-900 text-white p-3 rounded-2xl hover:bg-brand-500 disabled:opacity-50 transition-all active:scale-90"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
