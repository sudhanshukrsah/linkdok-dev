import { useState } from 'react';
import { X } from 'lucide-react';

function AddCategoryModal({ onClose, onSave }) {
  const [categoryName, setCategoryName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    onSave(categoryName.trim());
    onClose();
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
          <h2 className="modal-title">New Category</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-full">
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCategoryModal;
