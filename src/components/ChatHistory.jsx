import { useState } from 'react';
import { 
  MessageSquare, 
  PanelLeftClose, 
  PanelLeft,
  Home
} from 'lucide-react';
import './ChatHistory.css';

function ChatHistory({ 
  categories,
  activeCategory, 
  onSelectCategory,
  onGoHome,
  isOpen,
  onToggleSidebar
}) {
  if (!isOpen) {
    return (
      <div className="chat-history-collapsed">
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Open sidebar"
        >
          <PanelLeft size={20} />
        </button>
        
        <button 
          className="icon-nav-btn"
          onClick={onGoHome}
          title="Home"
        >
          <Home size={20} />
        </button>
        
        <div className="icon-nav-chats">
          {categories.slice(0, 5).map(category => (
            <button
              key={category.id}
              className={`icon-nav-btn ${category.id === activeCategory?.id ? 'active' : ''}`}
              onClick={() => onSelectCategory(category)}
              title={category.name}
            >
              <MessageSquare size={20} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="chat-history">
      <div className="chat-history-header">
        <button 
          className="home-btn"
          onClick={onGoHome}
          title="Go to home"
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Close sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
      </div>

      <div className="chat-list">
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
    </aside>
  );
}

export default ChatHistory;
