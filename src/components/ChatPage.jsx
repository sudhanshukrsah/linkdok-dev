import { useState, useEffect, useRef } from 'react';
import { Send, StopCircle, Moon, Sun, Copy, Edit2, Check, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askTutor } from '../utils/aiTutor';
import './ChatPage.css';

function ChatPage({ 
  category,
  messages,
  onUpdateMessages,
  resourceContents,
  isDarkMode,
  onToggleTheme
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Reset edit state when category changes
  useEffect(() => {
    setEditingMessageIndex(null);
    setEditingText('');
    setInput('');
  }, [category.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    onUpdateMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI tutor with category resources
      const response = await askTutor(userMessage, resourceContents);

      // Add assistant response
      const assistantMessage = { 
        role: 'assistant', 
        content: response.answer,
        metadata: {
          basedOnResources: response.basedOnResources,
          usedGeneralKnowledge: response.usedGeneralKnowledge,
          resourceCount: response.resourceCount
        }
      };
      onUpdateMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      onUpdateMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyMessage = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleEditMessage = (index) => {
    setEditingMessageIndex(index);
    setEditingText(messages[index].content);
  };

  const handleSaveEdit = async (index) => {
    if (!editingText.trim()) return;

    // Update the user message
    const updatedMessages = [...messages];
    updatedMessages[index].content = editingText.trim();
    
    // Remove all messages after the edited one
    const messagesToKeep = updatedMessages.slice(0, index + 1);
    onUpdateMessages(messagesToKeep);
    setEditingMessageIndex(null);
    setEditingText('');
    setIsLoading(true);

    try {
      // Regenerate assistant response
      const response = await askTutor(editingText.trim(), resourceContents);
      const assistantMessage = { 
        role: 'assistant', 
        content: response.answer,
        metadata: {
          basedOnResources: response.basedOnResources,
          usedGeneralKnowledge: response.usedGeneralKnowledge,
          resourceCount: response.resourceCount
        }
      };
      onUpdateMessages([...messagesToKeep, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      onUpdateMessages([...messagesToKeep, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingText('');
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
      onUpdateMessages([]);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <img src={isDarkMode ? "/LinkDok-logo.svg" : "/LinkDok-logo-day.svg"} alt="LinkDoc" className="chat-logo" />
        
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button 
              className="clear-chat-btn"
              onClick={handleClearChat}
              title="Clear chat history"
            >
              <Trash2 size={18} />
            </button>
          )}
          
          <button 
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <h3>Ask about {category.name}</h3>
            <p>I can help you with questions about the resources in this category.</p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.role === 'assistant' ? (
                <div className="assistant-message-wrapper">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <button
                    className="message-action-btn copy-btn"
                    onClick={() => handleCopyMessage(message.content, index)}
                    title="Copy answer"
                  >
                    {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              ) : editingMessageIndex === index ? (
                <div className="edit-message-container">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="edit-message-input"
                    autoFocus
                  />
                  <div className="edit-message-actions">
                    <button
                      className="edit-action-btn save-btn"
                      onClick={() => handleSaveEdit(index)}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className="edit-action-btn cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <div className="user-message-wrapper">
                  <p>{message.content}</p>
                  <button
                    className="message-action-btn edit-btn"
                    onClick={() => handleEditMessage(index)}
                    title="Edit question"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            className="chat-input"
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="send-btn"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPage;
