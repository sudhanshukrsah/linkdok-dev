import { Edit2, Trash2, GripVertical, Calendar } from 'lucide-react';

function LinkCard({ link, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) {
  const handleCardClick = (e) => {
    // Don't open link if clicking on action buttons or drag handle
    if (e.target.closest('.link-card-actions') || e.target.closest('.drag-handle')) {
      return;
    }
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div 
      className={`link-card ${isDragging ? 'dragging' : ''}`}
      onClick={handleCardClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="drag-handle" title="Drag to reorder">
        <GripVertical size={16} />
      </div>
      
      <div className="link-card-actions">
        <button
          className="btn btn-secondary btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit link"
        >
          <Edit2 size={16} />
        </button>
        <button
          className="btn btn-danger btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this link?')) {
              onDelete();
            }
          }}
          title="Delete link"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      {link.image && (
        <img 
          src={link.image} 
          alt={link.title}
          className="link-card-image"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      
      <div className="link-card-content">
        <h3 className="link-card-title">{link.title}</h3>
        {link.summary && (
          <p className="link-card-summary">{link.summary}</p>
        )}
        <div className="link-card-meta">
          {link.pubDate && (
            <div className="link-card-date">
              <Calendar size={14} />
              <span>{formatDate(link.pubDate)}</span>
            </div>
          )}
          {link.source && (
            <span className="link-card-source">{link.source}</span>
          )}
        </div>
        <p className="link-card-url">{link.url}</p>
      </div>
    </div>
  );
}

export default LinkCard;
