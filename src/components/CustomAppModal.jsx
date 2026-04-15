import { useState } from "react";
import { Loader2, Wand2, X } from "lucide-react";

function CustomAppModal({ editingApp, onClose, onSave }) {
  const [name, setName] = useState(editingApp?.name || "");
  const [masterPrompt, setMasterPrompt] = useState(editingApp?.originalPrompt || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !masterPrompt.trim()) {
      alert("Please enter an app name and master prompt");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingApp?.id,
        name,
        originalPrompt: masterPrompt,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal custom-app-modal">
        <div className="modal-header">
          <h2 className="modal-title">{editingApp ? "Edit App" : "Create New App"}</h2>
          <button className="modal-close" onClick={onClose} disabled={isSaving} title="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">App Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cricket Coach, Physics Mentor, Startup Advisor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Master Prompt *</label>
              <textarea
                className="form-input custom-app-prompt-input"
                placeholder="Describe what this agent should be expert at, how it should behave, and what kind of help it should give."
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                rows={8}
                required
              />
            </div>

            <div className="custom-app-enhance-note">
              <Wand2 size={16} />
              <span>The prompt will be enhanced into a safer, more structured system prompt before saving.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  Enhancing...
                </>
              ) : editingApp ? "Save App" : "Create App"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomAppModal;
