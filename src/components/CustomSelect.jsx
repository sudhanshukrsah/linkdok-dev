import { useState, useEffect, useRef } from 'react';
import './CustomSelect.css';

/**
 * CustomSelect – fully styled dropdown, works in both dark and light mode.
 *
 * Props:
 *   options   : [{ value, label, icon? }]
 *   value     : currently selected value
 *   onChange  : (value) => void
 *   placeholder: string (optional)
 *   className : extra class on the trigger (optional)
 */
function CustomSelect({ options, value, onChange, placeholder = 'Select…', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`csel-root ${className}`} ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        className={`csel-trigger${open ? ' csel-trigger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="csel-value">
          {selected ? (
            <>
              {selected.icon && <span className="csel-opt-icon">{selected.icon}</span>}
              {selected.label}
            </>
          ) : (
            <span className="csel-placeholder">{placeholder}</span>
          )}
        </span>
        <svg
          className={`csel-chevron${open ? ' csel-chevron--up' : ''}`}
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul className="csel-list" role="listbox">
          {options.map(opt => {
            const isActive = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isActive}
                className={`csel-option${isActive ? ' csel-option--active' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.icon && <span className="csel-opt-icon">{opt.icon}</span>}
                <span className="csel-opt-label">{opt.label}</span>
                {isActive && (
                  <svg className="csel-check" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;
