import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Plus, Send, Sun, Moon } from 'lucide-react';
import AddLinkModal from './AddLinkModal';
import AddCategoryModal from './AddCategoryModal';
import './IntroLanding.css';

function IntroLanding({ onComplete, categories, onAddCategory, onAddLink, isDarkMode, onToggleTheme }) {
  const [isExiting, setIsExiting] = useState(false);
  const [particles, setParticles] = useState([]);

  // Generate star particles once on mount
  useEffect(() => {
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      delay: Math.random() * 4,
    }));
    setParticles(generated);
  }, []);

  // ── JS-driven chat animation ──────────────────────────────────────────────
  const chatViewRef = useRef(null);
  const msgIdRef = useRef(0);        // monotonic counter — never produces duplicate keys
  const [chatMsgs, setChatMsgs] = useState([]);

  useEffect(() => {
    // Script: each step fires `after` ms after the previous one
    const SCRIPT = [
      { type: 'user', text: 'Summarise this for me',                              after: 400  },
      { type: 'dots',                                                              after: 800  },
      { type: 'ai',   lines: ['Sure! This article covers', 'key findings & topics.'], after: 1500 },
      { type: 'user', text: 'What are the key points?',                           after: 2000 },
      { type: 'dots',                                                              after: 800  },
      { type: 'ai',   lines: ['Main points: context,', 'analysis & conclusion.'], after: 1500 },
      { type: 'user', text: 'Any important dates?',                               after: 2000 },
      { type: 'dots',                                                              after: 800  },
      { type: 'ai',   lines: ['Yes — report mentions', 'Q3 2024 & Jan 2025.'],   after: 1500 },
      { type: '_gap',                                                              after: 3000 },
    ];
    const MAX = 7; // keep last N messages so the view stays compact
    let alive = true;
    const timers = [];

    const run = () => {
      let t = 0;
      SCRIPT.forEach(step => {
        t += step.after;
        const id = setTimeout(() => {
          if (!alive) return;
          if (step.type === 'user') {
            const uid = ++msgIdRef.current;
            setChatMsgs(p => [...p.slice(-(MAX - 1)), { id: uid, type: 'user', text: step.text }]);
          } else if (step.type === 'dots') {
            const uid = ++msgIdRef.current;
            setChatMsgs(p => [...p.slice(-(MAX - 1)), { id: uid, type: 'dots' }]);
          } else if (step.type === 'ai') {
            // replace trailing dots with the real reply
            const uid = ++msgIdRef.current;
            setChatMsgs(p => {
              const hasDots = p.length > 0 && p[p.length - 1].type === 'dots';
              const base = hasDots ? p.slice(0, -1) : p;
              return [...base.slice(-(MAX - 1)), { id: uid, type: 'ai', lines: step.lines }];
            });
          }
        }, t);
        timers.push(id);
      });
      const rid = setTimeout(() => { if (alive) run(); }, t);
      timers.push(rid);
    };

    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatViewRef.current) {
      chatViewRef.current.scrollTop = chatViewRef.current.scrollHeight;
    }
  }, [chatMsgs]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Navbar dropdown + modal state ────────────────────────────────────────
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleGetStarted = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  // After user creates category → go straight to main app
  const handleCategorySave = (name) => {
    onAddCategory(name);
    handleGetStarted();
  };

  // After user adds link → go straight to main app
  const handleLinkSave = (categoryId, link) => {
    onAddLink(categoryId, link);
    handleGetStarted();
  };

  return (
    <div className={`intro-landing-overlay ${isExiting ? 'il-exiting' : ''}`}>

      {/* Stars */}
      <div className="il-stars" aria-hidden="true">
        {particles.map(p => (
          <span
            key={p.id}
            className="il-star"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Page wrapper */}
      <div className="il-page">

        {/* Navbar */}
        <header className="il-navbar">
          <div className="il-logo">
            <img src="/LinkDok-logo.svg" alt="LinkDok" className="il-logo-img" />
          </div>

          <div className="il-nav-actions" ref={dropdownRef}>
            <button
              className="il-icon-btn"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              style={{ cursor: 'default', pointerEvents: 'none' }}
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="il-icon-btn"
              title="Help & Documentation"
              aria-label="Help"
              onClick={() => window.open('/help.html', '_blank')}
            >
              <HelpCircle size={17} />
            </button>
            <button
              className={`il-icon-btn il-icon-btn--plus${isDropdownOpen ? ' il-icon-btn--active' : ''}`}
              title="Add"
              aria-label="Add"
              onClick={() => setIsDropdownOpen(o => !o)}
            >
              <Plus size={17} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="il-nav-dropdown">
                <button
                  className="il-nav-dropdown-item"
                  onClick={() => { setIsDropdownOpen(false); setIsAddCategoryModalOpen(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  New category
                </button>
                <button
                  className="il-nav-dropdown-item"
                  onClick={() => { setIsDropdownOpen(false); setIsAddLinkModalOpen(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Add Link
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Cards grid */}
        <main className="il-main">

          {/* Two-column layout: left = desc+models+chat | right = easy card */}
          <div className="il-grid">

            {/* LEFT COLUMN */}
            <div className="il-col-left">

              {/* Top row: desc + models side by side */}
              <div className="il-row il-row--top">
                {/* Card: description */}
                <div className="il-card il-card--desc">
                  <p className="il-desc-text">
                    An AI-powered tool<br />
                    to save links and chat
                    with them intelligently.
                  </p>
                  <button className="il-add-link-btn" onClick={() => setIsAddLinkModalOpen(true)}>
                    Add Your Link
                  </button>
                </div>

                {/* Card: models */}
                <div className="il-card il-card--models">
                  <p className="il-models-text">
                    Most Advance<br />
                    Models in Your Chat
                  </p>
                  <div className="il-ticker-wrap">
                    <div className="il-ticker">
                      {/* Duplicated for seamless loop */}
                      {[
                        { name: 'Kimi K2.5',      color: '#3b82f6' },
                        { name: 'Step Flash',      color: '#10b981' },
                        { name: 'Devstral',        color: '#f97316' },
                        { name: 'DeepSeek V3.2',   color: '#8b5cf6' },
                        { name: 'Mistral Large',   color: '#f59e0b' },
                        { name: 'Qwen 3.5',        color: '#ec4899' },
                        { name: 'GLM5',            color: '#06b6d4' },
                        { name: 'Kimi K2.5',       color: '#3b82f6' },
                        { name: 'Step Flash',      color: '#10b981' },
                        { name: 'Devstral',        color: '#f97316' },
                        { name: 'DeepSeek V3.2',   color: '#8b5cf6' },
                        { name: 'Mistral Large',   color: '#f59e0b' },
                        { name: 'Qwen 3.5',        color: '#ec4899' },
                        { name: 'GLM5',            color: '#06b6d4' },
                      ].map((m, i) => (
                        <div key={i} className="il-ticker-row">
                          <span className="il-ticker-dot" style={{ background: m.color }} />
                          <span className="il-ticker-name">{m.name}</span>
                          <span className="il-ticker-pill" style={{ color: m.color, borderColor: m.color }}>AI</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat card – view only, animated typing placeholder */}
              <div className="il-row il-row--bottom">
                <div className="il-card il-card--chat">
                  <p className="il-chat-title">Ask Anything From Your Links</p>
                  <div className="il-chat-input-wrap">
                    <button className="il-chat-plus" disabled aria-label="Add link" style={{ opacity: 0.4, cursor: 'default' }}>
                      <Plus size={16} />
                    </button>
                    <div className="il-chat-anim-bar">
                      <span className="il-chat-ph il-chat-ph1">Summarise all articles for me</span>
                      <span className="il-chat-ph il-chat-ph2">Teach me this theory</span>
                      <span className="il-chat-ph il-chat-ph3">Solve my homework</span>
                      <span className="il-chat-ph il-chat-ph4">What’s the main idea here?</span>
                      <span className="il-chat-ph il-chat-ph5">Compare these two links</span>
                      <span className="il-chat-ph-cursor" />
                    </div>
                    <button className="il-chat-send" disabled aria-label="Send" style={{ opacity: 0.4, cursor: 'default' }}>
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN – Frame 6: nav close-up + cursor tap + chat scroll */}
            <div className="il-col-right">
              <div className="il-card il-card--easy">

                {/* ── TOP: Nav close-up ── */}
                <div className="ilm-top-section">

                  {/* Zoom wrapper: starts close-up on + button, then zooms out */}
                  <div className="ilm-nav-zoom">
                  <div className="ilm-nav">
                    <div className="ilm-logo">
                      <div className="ilm-logo-icon">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <span className="ilm-logo-text">LinkDok</span>
                    </div>
                    <div className="ilm-nav-icons">
                      <div className="ilm-nav-btn">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                        </svg>
                      </div>
                      <div className="ilm-nav-btn">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </div>
                      {/* + button – gets tapped by cursor */}
                      <div className="ilm-nav-btn ilm-nav-btn--blue ilm-plus-btn">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  </div>{/* /ilm-nav-zoom */}

                  {/* Dropdown – appears after cursor taps + */}
                  <div className="ilm-dropdown">
                    <div className="ilm-menu-row">
                      <div className="ilm-menu-icon ilm-menu-icon--cat">
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <span className="ilm-menu-label">New category</span>
                    </div>
                    <div className="ilm-menu-row ilm-menu-row--hover">
                      <div className="ilm-menu-icon ilm-menu-icon--link">
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <span className="ilm-menu-label">Add Link</span>
                    </div>
                  </div>

                  {/* Animated cursor – taps + then moves to Add Link */}
                  <div className="ilm-cursor" aria-hidden="true">
                    <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
                      <path d="M1 1l4 12 2.5-4.5 4.5-2.5L1 1z" fill="white" stroke="rgba(0,0,0,0.55)" strokeWidth="0.9" strokeLinejoin="round"/>
                    </svg>
                  </div>

                </div>{/* /ilm-top-section */}

                {/* ── SEPARATOR ── */}
                <div className="ilm-sep" />

                {/* ── BOTTOM: Chat scroll + input ── */}
                <div className="ilm-chat-wrap">

                  {/* JS-driven real-time chat — messages appear one by one */}
                  <div className="ilm-chat-view" ref={chatViewRef}>
                    <div className="ilm-chat-track">
                      <div className="ilm-spacer" />

                      {chatMsgs.map(msg => {
                        if (msg.type === 'user') return (
                          <div key={msg.id} className="ilm-msg ilm-msg--user">
                            <div className="ilm-bub ilm-bub--u">
                              <span className="ilm-txt">{msg.text}</span>
                            </div>
                          </div>
                        );
                        if (msg.type === 'dots') return (
                          <div key={msg.id} className="ilm-msg ilm-msg--ai">
                            <div className="ilm-ava"/>
                            <div className="ilm-dots"><span/><span/><span/></div>
                          </div>
                        );
                        if (msg.type === 'ai') return (
                          <div key={msg.id} className="ilm-msg ilm-msg--ai">
                            <div className="ilm-ava"/>
                            <div className="ilm-bub ilm-bub--a">
                              {msg.lines.map((l, i) => (
                                <span key={i} className={`ilm-txt${i > 0 ? ' ilm-txt--dim' : ''}`}>{l}</span>
                              ))}
                            </div>
                          </div>
                        );
                        return null;
                      })}

                    </div>
                  </div>

                  {/* Chat input – 3-query typing cycle */}
                  <div className="ilm-ci-row">
                    <div className="ilm-ci-plus">+</div>
                    <div className="ilm-ci-bar">
                      <span className="ilm-ci-txt ilm-ci-txt1">Summarise this for me</span>
                      <span className="ilm-ci-txt ilm-ci-txt2">What are the key points?</span>
                      <span className="ilm-ci-txt ilm-ci-txt3">Any important dates?</span>
                      <span className="ilm-ci-cursor"/>
                    </div>
                    <div className="ilm-ci-send">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>

          {/* Bottom teaser row */}
          <div className="il-row il-row--teaser">
            <div className="il-card il-card--teaser">
              <div className="il-teaser-glow" />

              <div className="il-teaser-body">

                {/* Tagline */}
                <p className="il-teaser-tag">Your links &mdash; supercharged with AI</p>

                {/* Feature chips */}
                <div className="il-teaser-chips">
                  <div className="il-chip">
                    <span className="il-chip-icon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </span>
                    <span>Save any link</span>
                  </div>
                  <div className="il-chip">
                    <span className="il-chip-icon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </span>
                    <span>Chat with AI</span>
                  </div>
                  <div className="il-chip">
                    <span className="il-chip-icon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </span>
                    <span>Stay organised</span>
                  </div>
                  <div className="il-chip">
                    <span className="il-chip-icon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                    <span>Smart search</span>
                  </div>
                </div>

                {/* Bottom row: badge + CTA */}
                <div className="il-teaser-foot">
                  <span className="il-teaser-free">Free &middot; No signup needed</span>
                  <button className="il-teaser-cta" onClick={handleGetStarted}>
                    Begin now
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>

              </div>
            </div>
          </div>

        </main>

        <footer className="il-copyright">
          &copy; {new Date().getFullYear()} LinkDok. All rights reserved.
        </footer>

        {/* Modals inside the overlay \u2014 they inherit overlay's stacking context
            so z-index:1000 here beats all overlay content, and overlay(10000)
            already beats the main app behind it */}
        {isAddCategoryModalOpen && (
          <AddCategoryModal
            onClose={() => setIsAddCategoryModalOpen(false)}
            onSave={handleCategorySave}
          />
        )}
        {isAddLinkModalOpen && (
          <AddLinkModal
            categories={categories}
            editingLink={null}
            onClose={() => setIsAddLinkModalOpen(false)}
            onSave={handleLinkSave}
          />
        )}

      </div>
    </div>
  );
}

export default IntroLanding;
