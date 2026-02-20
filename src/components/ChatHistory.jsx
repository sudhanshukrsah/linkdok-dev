import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  PanelLeftClose, 
  PanelLeftOpen,
  Home,
  Sparkles,
  Plus,
  Trash2,
  Bot
} from 'lucide-react';
import './ChatHistory.css';

const FREE_CHAT_MODELS = ['Kimi K2.5', 'Mistral Large', 'Devstral', 'GLM-5'];

function ChatHistory({ 
  categories,
  activeCategory, 
  onSelectCategory,
  onGoHome,
  isOpen,
  onToggleSidebar,
  isCollapsed,
  onToggleCollapse,
  // Free chat props
  freeChatSessions,
  activeFreeSession,
  onOpenFreeChat,
  onNewFreeChat,
  onDeleteFreeSession,
  isFreeChat,
}) {
  const [modelIdx, setModelIdx] = useState(0);
  const [modelVisible, setModelVisible] = useState(true);

  // Cycle through model names with fade animation
  useEffect(() => {
    const cycle = setInterval(() => {
      setModelVisible(false);
      setTimeout(() => {
        setModelIdx(i => (i + 1) % FREE_CHAT_MODELS.length);
        setModelVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onToggleSidebar}
        />
      )}
      <aside className={`chat-history ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {isCollapsed ? (
          // Collapsed sidebar — icons only
          <div className="collapsed-sidebar">
            <button className="collapsed-btn" onClick={onToggleCollapse} title="Expand sidebar">
              <PanelLeftOpen size={20} />
            </button>
            <button className="collapsed-btn" onClick={onGoHome} title="Home">
              <Home size={20} />
            </button>
            <button 
              className={`collapsed-btn ${isFreeChat ? 'active' : ''}`}
              onClick={onNewFreeChat}
              title="Try AI Models"
            >
              <Sparkles size={20} />
            </button>
            <div className="collapsed-chats">
              {categories.slice(0, 5).map(category => (
                <button
                  key={category.id}
                  className={`collapsed-btn ${category.id === activeCategory?.id ? 'active' : ''}`}
                  onClick={() => onSelectCategory(category)}
                  title={category.name}
                >
                  <MessageSquare size={20} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Expanded sidebar
          <>
            <div className="chat-history-header">
              <button className="home-btn" onClick={onGoHome} title="Go to home">
                <Home size={20} />
                <span>Home</span>
              </button>
              <button 
                className="sidebar-toggle-btn"
                onClick={isOpen ? onToggleSidebar : onToggleCollapse}
                title="Close sidebar"
              >
                <PanelLeftClose size={20} />
              </button>
            </div>

            {/* ── Try AI Models button ── */}
            <div className="free-chat-entry">
              <button
                className={`free-chat-btn ${isFreeChat ? 'active' : ''}`}
                onClick={onNewFreeChat}
                title="Chat freely with AI models"
              >
                <Bot size={16} className="free-chat-icon" />
                <span className="free-chat-label">
                  Try{' '}
                  <span
                    className="free-chat-model-name"
                    style={{ opacity: modelVisible ? 1 : 0 }}
                  >
                    {FREE_CHAT_MODELS[modelIdx]}
                  </span>
                </span>
                <Plus size={14} className="free-chat-plus" />
              </button>
            </div>

            <div className="chat-list">
              {/* Free chat sessions */}
              {freeChatSessions && freeChatSessions.length > 0 && (
                <div className="chat-group">
                  <div className="chat-group-label">AI Chats</div>
                  {freeChatSessions.map(session => (
                    <div
                      key={session.id}
                      className={`chat-item ${activeFreeSession?.id === session.id ? 'active' : ''}`}
                    >
                      <button
                        className="chat-item-button"
                        onClick={() => onOpenFreeChat(session)}
                      >
                        <Sparkles size={14} />
                        <span className="chat-title">{session.title}</span>
                      </button>
                      <button
                        className="chat-delete-btn"
                        onClick={(e) => { e.stopPropagation(); onDeleteFreeSession(session.id); }}
                        title="Delete chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Category chats */}
              {categories.length === 0 ? (
                <div className="empty-chat-history">
                  <MessageSquare size={32} />
                  <p>No categories yet</p>
                  <p className="empty-subtitle">Create a category to start chatting</p>
                </div>
              ) : (
                <div className="chat-group">
                  <div className="chat-group-label">Categories</div>
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className={`chat-item ${category.id === activeCategory?.id ? 'active' : ''}`}
                    >
                      <button
                        className="chat-item-button"
                        onClick={() => onSelectCategory(category)}
                      >
                        <MessageSquare size={16} />
                        <span className="chat-title">{category.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export default ChatHistory;
