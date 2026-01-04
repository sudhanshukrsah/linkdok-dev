import { useState, useEffect } from 'react';
import { Trash2, MessageCircle, Pin } from 'lucide-react';
import LinkCard from './LinkCard';

function CategorySection({ category, onDeleteCategory, onDeleteLink, onEditLink, onToggleCategoryPin, onReorderLinks, onOpenChat }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [chatHintIndex, setChatHintIndex] = useState(0);
  
  const chatHints = [
    "Talk with your links",
    "Ask about summaries",
    "Clear your questions",
    "Learn from resources",
    "Get instant answers"
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setChatHintIndex((prev) => (prev + 1) % chatHints.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [chatHints.length]);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Visual feedback could be added here
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    onReorderLinks(category.id, draggedIndex, index);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  return (
    <section className={`category-section ${category.isPinned ? 'pinned-category' : ''}`}>
      <div className="category-header">
        <h2 className="category-title">
          {category.isPinned && <Pin size={18} className="category-pin-icon" />}
          {category.name}
        </h2>
        <div className="category-actions">
          <div className="chat-action-container">
            {category.links.length > 0 && (
              <span className="chat-hint">{chatHints[chatHintIndex]}</span>
            )}
            <button
              className="btn btn-secondary btn-icon chat-btn"
              onClick={() => onOpenChat(category)}
              title="Chat with AI Tutor"
              disabled={category.links.length === 0}
            >
              <MessageCircle size={18} />
            </button>
          </div>
          <button
            className={`btn btn-icon ${category.isPinned ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onToggleCategoryPin(category.id)}
            title={category.isPinned ? 'Unpin category' : 'Pin category'}
          >
            <Pin size={18} fill={category.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            className="btn btn-danger btn-icon"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${category.name}" and all its links?`)) {
                onDeleteCategory(category.id);
              }
            }}
            title="Delete category"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      {category.links.length === 0 ? (
        <div className="empty-state">
          <p>No links in this category yet.</p>
        </div>
      ) : (
        <div className="links-grid">
          {category.links.map((link, index) => (
            <LinkCard
              key={link.id}
              link={link}
              index={index}
              onEdit={() => onEditLink(category.id, link)}
              onDelete={() => onDeleteLink(category.id, link.id)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              isDragging={draggedIndex === index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CategorySection;
