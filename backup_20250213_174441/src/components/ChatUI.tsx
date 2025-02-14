import React, { useState, useRef, useEffect } from 'react';
import { Logger } from '../services/logger';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
}

interface ChatUIProps {
  onClose?: () => void;
}

export const ChatUI: React.FC<ChatUIProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // TODO: Integrate with AI service
      const response = "I'm analyzing your request...";
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        type: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      Logger.info('ChatUI', 'AI response received');
    } catch (error) {
      Logger.error('ChatUI', 'Failed to get AI response', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request.',
        type: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3 className="font-semibold">Trading Assistant</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <p>{message.content}</p>
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input-field"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md
                     hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <i className="fas fa-spinner fa-spin" />
            ) : (
              <i className="fas fa-paper-plane" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatUI;