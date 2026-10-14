"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Image from "next/image";
import { Search, ArrowLeft, Send } from "lucide-react";
import { useChatSocket } from "@/hooks/useChatSocket";
import TypingIndicator from "./TypingIndicator";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface ClientConversation {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: boolean;
  imageUrl?: string | null;
}

export default function LawyerMessagesTab({ lawyerId }: { lawyerId: string }) {
  const [clients, setClients] = useState<ClientConversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientConversation | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const { messages, isTyping, sendMessage, sendTypingStatus, fetchChatHistory } = useChatSocket(
    lawyerId,
    selectedClient?.id || null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyer/${lawyerId}/conversations`);
        if (!response.ok) throw new Error("Failed to fetch conversations");
        const data = await response.json();
        setClients(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, [lawyerId]);

  useEffect(() => {
    if (selectedClient) {
      fetchChatHistory(selectedClient.id);
    }
  }, [selectedClient, fetchChatHistory]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedClient) return;
    sendMessage(inputText.trim(), selectedClient.id);
    setInputText("");
    sendTypingStatus(selectedClient.id, false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (selectedClient) {
      sendTypingStatus(selectedClient.id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(selectedClient.id, false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-white relative overflow-hidden">
      
      {/* LEFT PANE: Client List */}
      <div 
        className={`w-full md:w-1/3 border-r border-color-border-light flex flex-col bg-neutral-50 transition-all duration-300
          ${selectedClient ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="p-4 border-b border-color-border-light relative bg-white shrink-0">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="w-full pl-10 pr-4 py-2 border border-color-border-light text-sm focus:outline-none focus:border-black transition-colors" 
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-color-text-muted">Loading conversations...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-sm text-color-text-muted">No messages yet.</div>
          ) : clients.map((client) => {
            const isSelected = selectedClient?.id === client.id;
            return (
              <button 
                type="button"
                key={client.id} 
                onClick={() => setSelectedClient(client)}
                className={`w-full text-left p-4 border-b border-color-border-light cursor-pointer hover:bg-neutral-100 transition-colors flex items-center gap-3
                  ${isSelected ? 'bg-white border-l-4 border-l-black' : 'border-l-4 border-l-transparent'}
                `}
              >
                <div className="w-12 h-12 bg-neutral-200 rounded-full overflow-hidden shrink-0 relative">
                  {client.imageUrl ? (
                    <Image src={client.imageUrl} alt={client.name} fill className="object-cover grayscale" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-black uppercase">{client.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold text-sm truncate pr-2 ${isSelected ? 'text-black' : 'text-color-foreground'}`}>{client.name}</h4>
                    <span className="text-[10px] text-color-text-muted shrink-0">{client.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate flex-1 pr-2 ${client.unread && !isSelected ? 'font-bold text-black' : 'text-color-text-muted'}`}>
                      {client.lastMsg}
                    </p>
                    {client.unread && !isSelected && (
                      <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* RIGHT PANE: Chat Area */}
      <div 
        className={`flex-1 flex flex-col bg-[#e5e5e5] h-full
          ${!selectedClient ? 'hidden md:flex items-center justify-center bg-neutral-50' : 'flex'}
        `}
      >
        {!selectedClient ? (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-black">Client Inquiries</h3>
            <p className="text-sm text-color-text-muted max-w-sm">
              Select a client from the sidebar to respond to their inquiry.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-color-border-light flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="md:hidden p-2 -ml-2 text-color-text-muted hover:text-black hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-neutral-200 rounded-full border border-color-border-light overflow-hidden shrink-0 relative">
                  {selectedClient.imageUrl ? (
                    <Image src={selectedClient.imageUrl} alt={selectedClient.name} fill className="object-cover grayscale" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-black text-xs uppercase">{selectedClient.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-color-foreground">{selectedClient.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Online</p>
                </div>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3 relative z-0">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.isSelf ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div 
                    className={`p-3 sm:p-4 shadow-sm ${
                      msg.isSelf 
                        ? 'bg-black text-white rounded-tl-xl rounded-bl-xl rounded-br-xl' 
                        : 'bg-white border border-color-border-light text-black rounded-tr-xl rounded-bl-xl rounded-br-xl'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-color-text-muted mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {isTyping && (
                <div className="self-start mb-2">
                  <TypingIndicator />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-color-border-light bg-white shrink-0 flex items-end gap-2">
              <div className="flex-1 border border-color-border-light bg-neutral-50 rounded-lg overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..." 
                  className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none" 
                />
              </div>
              <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="p-3 bg-black text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-black transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
