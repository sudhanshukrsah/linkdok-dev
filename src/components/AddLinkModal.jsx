import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchLinkMetadata } from '../utils/metadata';

function AddLinkModal({ categories, editingLink, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    image: '',
    categoryId: categories[0]?.id || ''
  });
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [urlDebounceTimer, setUrlDebounceTimer] = useState(null);

  useEffect(() => {
    if (editingLink) {
      setFormData({
        title: editingLink.title,
        url: editingLink.url,
        image: editingLink.image || '',
        categoryId: editingLink.categoryId
      });
    }
  }, [editingLink]);

  const handleUrlChange = (url) => {
    setFormData({ ...formData, url });

    // Clear previous timer
    if (urlDebounceTimer) {
      clearTimeout(urlDebounceTimer);
    }

    // Don't fetch if editing or URL is empty
    if (editingLink || !url.trim() || !url.startsWith('http')) {
      return;
    }

    // Debounce metadata fetching
    const timer = setTimeout(async () => {
      setIsFetchingMetadata(true);
      const metadata = await fetchLinkMetadata(url);
      
      if (metadata) {
        setFormData(prev => ({
          ...prev,
          title: prev.title || metadata.title,
          image: prev.image || metadata.image
        }));
      }
      
      setIsFetchingMetadata(false);
    }, 1000);

    setUrlDebounceTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (urlDebounceTimer) {
        clearTimeout(urlDebounceTimer);
      }
    };
  }, [urlDebounceTimer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('Please fill in title and URL');
      return;
    }

    onSave(formData.categoryId, {
      title: formData.title.trim(),
      url: formData.url.trim(),
      image: formData.image.trim()
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingLink ? 'Edit Link' : 'Add New Link'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter link title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                URL * 
                {isFetchingMetadata && (
                  <span style={{ marginLeft: '8px', color: 'var(--accent)' }}>
                    <Loader2 size={14} style={{ display: 'inline', animation: 'spin 1s linear infinite' }} />
                    {' '}Fetching info...
                  </span>
                )}
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image URL (optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/image.jpg"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingLink ? 'Save Changes' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddLinkModal;
