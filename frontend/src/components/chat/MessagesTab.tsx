"use client";

import { useState, useRef, useEffect, useMemo, KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowLeft, Send } from "lucide-react";
import { useChatSocket, ChatMessage } from "@/hooks/useChatSocket";
import TypingIndicator from "./TypingIndicator";
import { useSavedAttorneysStore } from "@/store/useSavedAttorneysStore";
import { useChatStore } from "@/store/useChatStore";

export default function MessagesTab({ userId }: { userId: string }) {
  const { savedLawyers } = useSavedAttorneysStore();
  const { activeContactId, setActiveContactId } = useChatStore();

  const contactsList = useMemo(() => {
    const list = [...savedLawyers];
    if (activeContactId && !list.some(l => l.id === activeContactId)) {
      list.unshift({
        id: activeContactId,
        name: "Robert H. Pearson",
        firm: "Pearson & Hardman LLP",
        specialty: "Corporate Litigation",
        rating: 4.9,
        reviewCount: 342,
        location: "New York, NY",
        imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60",
        description: "Verified legal counsel",
        experienceYears: 20,
        consultationAvailability: "Available"
      });
    }
    return list;
  }, [savedLawyers, activeContactId]);

  const selectedContact = contactsList.find(l => l.id === activeContactId) || contactsList[0] || null;
  const [inputText, setInputText] = useState("");
  
  const { messages, isTyping, sendMessage, sendTypingStatus, fetchChatHistory } = useChatSocket(
    userId,
    selectedContact?.id || null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom (using block: 'nearest' to avoid whole page scroll bug)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch chat history when contact is selected
  useEffect(() => {
    if (selectedContact) {
      fetchChatHistory(selectedContact.id);
    }
  }, [selectedContact, fetchChatHistory]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedContact) return;
    sendMessage(inputText.trim(), selectedContact.id);
    setInputText("");
    sendTypingStatus(selectedContact.id, false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (selectedContact) {
      sendTypingStatus(selectedContact.id, true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(selectedContact.id, false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-white relative overflow-hidden">
      
      {/* LEFT PANE: Contact List */}
      <div 
        className={`w-full md:w-1/3 border-r border-color-border-light flex flex-col bg-neutral-50 transition-all duration-300
          ${selectedContact ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="p-4 border-b border-color-border-light relative bg-white shrink-0">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            className="w-full pl-10 pr-4 py-2 border border-color-border-light text-sm focus:outline-none focus:border-black transition-colors" 
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {contactsList.length === 0 ? (
            <div className="p-6 text-center text-sm text-color-text-muted">
              No contacts yet. Save attorneys from the directory or book a consultation to start messaging.
            </div>
          ) : (
            contactsList.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              // Mock recent message state for UI purposes
              const unread = Math.random() > 0.7;
              
              return (
                <button 
                  type="button"
                  key={contact.id} 
                  onClick={() => setActiveContactId(contact.id)}
                  className={`w-full text-left p-4 border-b border-color-border-light cursor-pointer hover:bg-neutral-100 transition-colors flex items-center gap-3
                    ${isSelected ? 'bg-white border-l-4 border-l-black' : 'border-l-4 border-l-transparent'}
                  `}
                >
                  <div className="w-12 h-12 bg-neutral-200 rounded-full overflow-hidden shrink-0 relative">
                    {contact.imageUrl ? (
                      <Image src={contact.imageUrl} alt={contact.name} fill className="object-cover grayscale" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-bold text-black uppercase">{contact.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold text-sm truncate pr-2 ${isSelected ? 'text-black' : 'text-color-foreground'}`}>{contact.name}</h4>
                      <span className="text-[10px] text-color-text-muted shrink-0">10:42 AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate flex-1 pr-2 ${unread && !isSelected ? 'font-bold text-black' : 'text-color-text-muted'}`}>
                        Click to view messages...
                      </p>
                      {unread && !isSelected && (
                        <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      
      {/* RIGHT PANE: Chat Area */}
      <div 
        className={`flex-1 flex flex-col bg-[#e5e5e5] h-full
          ${!selectedContact ? 'hidden md:flex items-center justify-center bg-neutral-50' : 'flex'}
        `}
      >
        {!selectedContact ? (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-black">Your Messages</h3>
            <p className="text-sm text-color-text-muted max-w-sm">
              Select a conversation from the sidebar to start messaging securely.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-color-border-light flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveContactId(null)}
                  className="md:hidden p-2 -ml-2 text-color-text-muted hover:text-black hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-neutral-200 rounded-full border border-color-border-light overflow-hidden shrink-0 relative">
                  {selectedContact.imageUrl ? (
                    <Image src={selectedContact.imageUrl} alt={selectedContact.name} fill className="object-cover grayscale" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-black text-xs uppercase">{selectedContact.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-color-foreground">{selectedContact.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Online</p>
                </div>
              </div>
              <Link 
                href={`/lawyers/${selectedContact.id}`} 
                className="hidden sm:block text-xs border border-color-border-light px-3 py-1.5 font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                View Profile
              </Link>
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
