import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, Moon, Sun, ChevronDown, FolderPlus, LinkIcon, HelpCircle, Menu } from 'lucide-react';
import CategorySection from './components/CategorySection';
import AddLinkModal from './components/AddLinkModal';
import CustomSelect from './components/CustomSelect';
import AddCategoryModal from './components/AddCategoryModal';
import ChatHistory from './components/ChatHistory';
import ChatPage from './components/ChatPage';
import IntroLanding from './components/IntroLanding';

import { extractContentFromURL } from './utils/contentExtractor';
import { prepareSearchData, createSearchEngine, performSearch, debounce } from './utils/searchEngine';
import './App.css';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [showIntroVideo, setShowIntroVideo] = useState(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('linkdok_visited');
    return !hasVisited;
  });

  const [categories, setCategories] = useState(() => {
    // Initialize from localStorage
    const savedCategories = localStorage.getItem('linkCollectorCategories');
    if (savedCategories) {
      try {
        return JSON.parse(savedCategories);
      } catch (e) {
        console.error('Failed to load categories');
      }
    }
    // Default category if nothing saved
    return [{
      id: Date.now(),
      name: 'My Links',
      links: []
    }];
  });
  
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [lastUsedCategoryId, setLastUsedCategoryId] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('linkCollectorTheme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  const [activeChatCategory, setActiveChatCategory] = useState(() => {
    // Restore last active chat category from session
    try {
      const savedId = sessionStorage.getItem('activeChatCategoryId');
      if (savedId) {
        const cats = JSON.parse(localStorage.getItem('linkCollectorCategories') || '[]');
        return cats.find(c => c.id === Number(savedId)) || null;
      }
    } catch (e) {}
    return null;
  });
  const [categoryChats, setCategoryChats] = useState(() => {
    // Load all category chats from localStorage
    const savedCategories = localStorage.getItem('linkCollectorCategories');
    if (!savedCategories) return {};
    
    const chats = {};
    try {
      const cats = JSON.parse(savedCategories);
      cats.forEach(cat => {
        const savedChat = localStorage.getItem(`categoryChat_${cat.id}`);
        if (savedChat) {
          chats[cat.id] = JSON.parse(savedChat);
        } else {
          chats[cat.id] = [];
        }
      });
    } catch (e) {
      console.error('Failed to load category chats');
    }
    return chats;
  });
  const [resourceContents, setResourceContents] = useState(() => {
    const savedContents = localStorage.getItem('resourceContents');
    if (savedContents) {
      try {
        return JSON.parse(savedContents);
      } catch (e) {
        console.error('Failed to load resource contents');
      }
    }
    return {};
  });
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addDropdownRef = useRef(null);
  const searchEngineRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchFallback, setSearchFallback] = useState(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Desktop: always open, Mobile: closed by default
    return window.innerWidth > 1024;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Desktop: start expanded, can be collapsed by user
    return false;
  });
  const [currentView, setCurrentView] = useState(() => {
    const savedView = sessionStorage.getItem('currentView');
    const savedCatId = sessionStorage.getItem('activeChatCategoryId');
    if (savedView === 'chat' && savedCatId) return 'chat';
    if (savedView === 'freechat') return 'freechat';
    return 'main';
  });

  // Free chat sessions state
  const [freeChatSessions, setFreeChatSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('freeChatSessions') || '[]');
    } catch { return []; }
  });
  const [activeFreeSession, setActiveFreeSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('activeFreeSessionId');
      if (!saved) return null;
      const sessions = JSON.parse(localStorage.getItem('freeChatSessions') || '[]');
      return sessions.find(s => s.id === Number(saved)) || null;
    } catch { return null; }
  });

  // Handle window resize for sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsSidebarOpen(true); // Always open on desktop
      } else if (currentView === 'main') {
        setIsSidebarOpen(false); // Closed on mobile when on main view
        setIsSidebarCollapsed(false); // No collapsed state on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentView]);

  // Load from localStorage on mount (now only for initial setup)
  useEffect(() => {
    // mounted
  }, []);

  // Debounced search query handler
  const debouncedSetSearch = useCallback(
    debounce((query) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  // Update debounced query when search query changes
  useEffect(() => {
    debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);

  // Initialize/update search engine when categories change
  useEffect(() => {
    const searchableData = prepareSearchData(categories);
    searchEngineRef.current = createSearchEngine(searchableData);
  }, [categories]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedSearchQuery.trim() || !searchEngineRef.current) {
      setSearchResults([]);
      setSearchFallback(null);
      return;
    }

    const results = performSearch(searchEngineRef.current, debouncedSearchQuery);
    setSearchResults(results);
    
    // AI fallback disabled - only search local categories and links
    setSearchFallback(null);
  }, [debouncedSearchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
        setIsAddDropdownOpen(false);
      }
    };
    
    if (isAddDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddDropdownOpen]);

  // Update theme class on body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
    localStorage.setItem('linkCollectorTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Save to localStorage whenever categories change
  useEffect(() => {
    if (categories.length >= 0) {
      localStorage.setItem('linkCollectorCategories', JSON.stringify(categories));
    }
  }, [categories]);

  // Keep activeChatCategory in sync with live categories state
  // (covers the case where user refreshes on chat view — category was restored
  //  from a localStorage snapshot but may now reflect stale data)
  useEffect(() => {
    if (activeChatCategory) {
      const live = categories.find(c => c.id === activeChatCategory.id);
      if (!live) {
        // Category was deleted — go home
        setActiveChatCategory(null);
        setCurrentView('main');
        sessionStorage.removeItem('currentView');
        sessionStorage.removeItem('activeChatCategoryId');
      } else if (live !== activeChatCategory) {
        setActiveChatCategory(live);
      }
    }
  }, [categories]);

  // Save resource contents to localStorage
  useEffect(() => {
    localStorage.setItem('resourceContents', JSON.stringify(resourceContents));
  }, [resourceContents]);

  // Extract content from newly added links
  const extractLinkContent = async (categoryId, linkId, url) => {
    const key = `${categoryId}_${linkId}`;
    
    // Skip if already extracted
    if (resourceContents[key]) {
      return;
    }

    const result = await extractContentFromURL(url);
    setResourceContents(prev => ({
      ...prev,
      [key]: result
    }));
  };

  const addCategory = (name) => {
    const newCategory = {
      id: Date.now(),
      name,
      links: []
    };
    setCategories([...categories, newCategory]);
    setLastUsedCategoryId(newCategory.id);
  };

  const deleteCategory = (categoryId) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };

  const addLink = (categoryId, link) => {
    const newLink = { ...link, id: Date.now(), createdAt: Date.now() };
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          links: [...cat.links, newLink]
        };
      }
      return cat;
    }));
    
    // Extract content from the new link
    extractLinkContent(categoryId, newLink.id, newLink.url);
  };

  const updateLink = (categoryId, linkId, updatedLink) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          links: cat.links.map(link => 
            link.id === linkId ? { ...link, ...updatedLink } : link
          )
        };
      }
      return cat;
    }));
  };

  const deleteLink = (categoryId, linkId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          links: cat.links.filter(link => link.id !== linkId)
        };
      }
      return cat;
    }));
  };

  const toggleLinkFavorite = (categoryId, linkId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          links: cat.links.map(link =>
            link.id === linkId ? { ...link, isFavorite: !link.isFavorite } : link
          )
        };
      }
      return cat;
    }));
  };

  const toggleLinkPin = (categoryId, linkId) => {
    setCategories(categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          links: cat.links.map(link =>
            link.id === linkId ? { ...link, isPinned: !link.isPinned } : link
          )
        };
      }
      return cat;
    }));
  };

  const toggleCategoryPin = (categoryId) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, isPinned: !cat.isPinned } : cat
    ));
  };

  const handleEditLink = (categoryId, link) => {
    setEditingLink({ ...link, categoryId });
    setIsAddLinkModalOpen(true);
  };

  const handleSaveLink = (categoryId, link) => {
    if (editingLink) {
      updateLink(categoryId, editingLink.id, link);
      setEditingLink(null);
    } else {
      addLink(categoryId, link);
    }
    setLastUsedCategoryId(categoryId);
    setIsAddLinkModalOpen(false);
  };

  const handleOpenChat = (category) => {
    setActiveChatCategory(category);
    setCurrentView('chat');
    sessionStorage.setItem('currentView', 'chat');
    sessionStorage.setItem('activeChatCategoryId', String(category.id));
  };

  const handleCloseChat = () => {
    setActiveChatCategory(null);
    setCurrentView('main');
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('activeChatCategoryId');
  };

  const handleSelectCategory = (category) => {
    setActiveChatCategory(category);
    sessionStorage.setItem('currentView', 'chat');
    sessionStorage.setItem('activeChatCategoryId', String(category.id));
    
    // Ensure this category has a chat array
    if (!categoryChats[category.id]) {
      setCategoryChats(prev => ({
        ...prev,
        [category.id]: []
      }));
    }
    
    setCurrentView('chat');
  };

  const handleUpdateCategoryChat = (categoryId, messages) => {
    // Update state
    setCategoryChats(prev => ({
      ...prev,
      [categoryId]: messages
    }));
    
    // Save to localStorage
    localStorage.setItem(`categoryChat_${categoryId}`, JSON.stringify(messages));
  };

  const handleGoHome = () => {
    setCurrentView('main');
    setActiveChatCategory(null);
    setActiveFreeSession(null);
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('activeChatCategoryId');
    sessionStorage.removeItem('activeFreeSessionId');
  };

  // Free chat handlers
  const handleNewFreeChat = () => {
    const newSession = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    const updated = [newSession, ...freeChatSessions];
    setFreeChatSessions(updated);
    localStorage.setItem('freeChatSessions', JSON.stringify(updated));
    setActiveFreeSession(newSession);
    setActiveChatCategory(null);
    setCurrentView('freechat');
    sessionStorage.setItem('currentView', 'freechat');
    sessionStorage.setItem('activeFreeSessionId', String(newSession.id));
    sessionStorage.removeItem('activeChatCategoryId');
  };

  const handleOpenFreeChat = (session) => {
    setActiveFreeSession(session);
    setActiveChatCategory(null);
    setCurrentView('freechat');
    sessionStorage.setItem('currentView', 'freechat');
    sessionStorage.setItem('activeFreeSessionId', String(session.id));
    sessionStorage.removeItem('activeChatCategoryId');
  };

  const handleUpdateFreeChatMessages = (sessionId, messages) => {
    setFreeChatSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== sessionId) return s;
        // Auto-title from first user message
        const firstUser = messages.find(m => m.role === 'user');
        const title = firstUser
          ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '')
          : s.title;
        return { ...s, messages, title };
      });
      localStorage.setItem('freeChatSessions', JSON.stringify(updated));
      // Sync activeFreeSession title
      const live = updated.find(s => s.id === sessionId);
      if (live) setActiveFreeSession(live);
      return updated;
    });
  };

  const handleDeleteFreeSession = (sessionId) => {
    setFreeChatSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('freeChatSessions', JSON.stringify(updated));
      return updated;
    });
    if (activeFreeSession?.id === sessionId) {
      // If deleting the active session, open most recent remaining or go home
      const remaining = freeChatSessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        handleOpenFreeChat(remaining[0]);
      } else {
        handleGoHome();
      }
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleToggleCollapse = () => {
    // Only works on desktop
    if (window.innerWidth > 1024) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const getCategoryResourceContents = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];

    return category.links.map(link => {
      const key = `${categoryId}_${link.id}`;
      return resourceContents[key] || { url: link.url, success: false };
    });
  };

  const moveLink = (linkId, fromCategoryId, toCategoryId, toIndex) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      
      // Find the link
      const fromCategory = newCategories.find(cat => cat.id === fromCategoryId);
      const linkIndex = fromCategory.links.findIndex(link => link.id === linkId);
      const [movedLink] = fromCategory.links.splice(linkIndex, 1);
      
      // Add to new category
      const toCategory = newCategories.find(cat => cat.id === toCategoryId);
      toCategory.links.splice(toIndex, 0, movedLink);
      
      return newCategories;
    });
  };

  const reorderLinks = (categoryId, startIndex, endIndex) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      const category = newCategories.find(cat => cat.id === categoryId);
      const [removed] = category.links.splice(startIndex, 1);
      category.links.splice(endIndex, 0, removed);
      return newCategories;
    });
  };

  // Filter and search categories and links
  const filteredCategories = useMemo(() => {
    // If we have search results from Fuse.js, use those
    if (debouncedSearchQuery.trim() && searchResults.length > 0) {
      // Group search results by category
      const resultsByCategory = new Map();
      
      searchResults.forEach(result => {
        const categoryId = result.categoryId;
        
        // Apply category filter
        if (filterCategory !== 'all' && categoryId !== Number(filterCategory)) {
          return;
        }
        
        if (!resultsByCategory.has(categoryId)) {
          const category = categories.find(c => c.id === categoryId);
          if (category) {
            resultsByCategory.set(categoryId, {
              ...category,
              links: []
            });
          }
        }
        
        const categoryData = resultsByCategory.get(categoryId);
        if (categoryData) {
          categoryData.links.push(result);
        }
      });
      
      return Array.from(resultsByCategory.values())
        .sort((a, b) => {
          // Sort: pinned categories first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
    }
    
    // No search query - use original filtering logic
    return categories
      .map(category => {
        // Filter by specific category if not 'all'
        if (filterCategory !== 'all' && category.id !== Number(filterCategory)) {
          return null;
        }

        return category;
      })
      .filter(cat => cat !== null)
      .sort((a, b) => {
        // Sort: pinned categories first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [categories, debouncedSearchQuery, searchResults, filterCategory]);

  const handleIntroComplete = () => {
    // Mark that user has visited
    localStorage.setItem('linkdok_visited', 'true');
    setShowIntroVideo(false);
  };

  return (
    <>
      {showIntroVideo && (
        <IntroLanding
          onComplete={handleIntroComplete}
          categories={categories}
          onAddCategory={addCategory}
          onAddLink={addLink}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(d => !d)}
        />
      )}
      
      <div className="app" style={showIntroVideo ? { display: 'none' } : undefined}>
      {/* Chat History Sidebar - Always render on desktop, conditionally on mobile */}
      <ChatHistory
        categories={categories}
        activeCategory={activeChatCategory}
        onSelectCategory={handleSelectCategory}
        onGoHome={handleGoHome}
        isOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        freeChatSessions={freeChatSessions}
        activeFreeSession={activeFreeSession}
        onOpenFreeChat={handleOpenFreeChat}
        onNewFreeChat={handleNewFreeChat}
        onDeleteFreeSession={handleDeleteFreeSession}
        isFreeChat={currentView === 'freechat'}
      />

      {/* Main Content Area */}
      <div className={`main-app-container ${currentView === 'chat' || currentView === 'freechat' ? 'chat-view' : ''}`}>
        {currentView === 'freechat' && activeFreeSession ? (
          <ChatPage
            key={`freechat-${activeFreeSession.id}`}
            category={{ id: activeFreeSession.id, name: activeFreeSession.title, links: [] }}
            messages={activeFreeSession.messages || []}
            onUpdateMessages={(msgs) => handleUpdateFreeChatMessages(activeFreeSession.id, msgs)}
            resourceContents={[]}
            isPreparingChat={false}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            onToggleSidebar={handleToggleSidebar}
            isPlayground={true}
          />
        ) : currentView === 'chat' && activeChatCategory ? (
          <ChatPage
            key={`chat-${activeChatCategory.id}`}
            category={activeChatCategory}
            messages={categoryChats[activeChatCategory.id] || []}
            onUpdateMessages={(messages) => handleUpdateCategoryChat(activeChatCategory.id, messages)}
            resourceContents={getCategoryResourceContents(activeChatCategory.id)}
            isPreparingChat={
              (() => {
                const live = categories.find(c => c.id === activeChatCategory.id);
                if (!live || live.links.length === 0) return false;
                return live.links.some(link => resourceContents[`${live.id}_${link.id}`] === undefined);
              })()
            }
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            onToggleSidebar={handleToggleSidebar}
          />
        ) : (
          <>
            <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="btn btn-icon menu-toggle-btn"
              onClick={handleToggleSidebar}
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <img src={isDarkMode ? "/LinkDok-logo.svg" : "/LinkDok-logo-day.svg"} alt="LinkDoc" className="app-logo" />
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              className="btn btn-icon"
              onClick={() => window.open('/help.html', '_blank')}
              title="Help & Documentation"
            >
              <HelpCircle size={18} />
            </button>
            <div className="add-dropdown" ref={addDropdownRef}>
              <button 
                className="btn btn-icon btn-add"
                onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                title="Add New"
              >
                <Plus size={18} />
              </button>
              {isAddDropdownOpen && (
                <div className="add-dropdown-menu">
                  <button 
                    className="add-dropdown-item"
                    onClick={() => {
                      setIsAddCategoryModalOpen(true);
                      setIsAddDropdownOpen(false);
                    }}
                  >
                    <FolderPlus size={18} />
                    <span>New Category</span>
                  </button>
                  <button 
                    className="add-dropdown-item"
                    onClick={() => {
                      setEditingLink(null);
                      setIsAddLinkModalOpen(true);
                      setIsAddDropdownOpen(false);
                    }}
                  >
                    <LinkIcon size={18} />
                    <span>Add Link</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="search-filter-bar">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-container">
          <CustomSelect
            value={filterCategory}
            onChange={(val) => setFilterCategory(val)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat.id, label: cat.name }))
            ]}
          />
        </div>
      </div>

      <main className="main-content">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>No categories yet. Create one to get started!</p>
          </div>
        ) : searchFallback ? (
          <div className="search-fallback-container">
            <div className="search-fallback-card">
              <h3 className="fallback-title">About "{searchFallback.query}"</h3>
              <p className="fallback-explanation">{searchFallback.explanation}</p>
              
              {searchFallback.suggestions && searchFallback.suggestions.length > 0 && (
                <div className="fallback-suggestions">
                  <h4>Try these searches:</h4>
                  <div className="suggestion-chips">
                    {searchFallback.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-chip"
                        onClick={() => setSearchQuery(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="fallback-actions">
                <a
                  href={searchFallback.googleSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <Search size={16} />
                  Search on Google
                </a>
              </div>
            </div>
            
            {isLoadingFallback && (
              <div className="fallback-loading">
                <div className="spinner" />
                <p>Analyzing your search...</p>
              </div>
            )}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <p>No links found matching your search.</p>
          </div>
        ) : (
          <>
            {debouncedSearchQuery && searchResults.length > 0 && (
              <div className="search-info">
                <p>Found {searchResults.length} relevant article{searchResults.length !== 1 ? 's' : ''} for "{debouncedSearchQuery}"</p>
              </div>
            )}
            {filteredCategories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                onDeleteCategory={deleteCategory}
                onDeleteLink={deleteLink}
                onEditLink={handleEditLink}
                onToggleCategoryPin={toggleCategoryPin}
                onReorderLinks={reorderLinks}
                onOpenChat={handleOpenChat}
              />
            ))}
          </>
        )}
      </main>

      {isAddLinkModalOpen && (
        <AddLinkModal
          categories={categories}
          editingLink={editingLink}
          defaultCategoryId={lastUsedCategoryId}
          onClose={() => {
            setIsAddLinkModalOpen(false);
            setEditingLink(null);
          }}
          onSave={handleSaveLink}
        />
      )}

      {isAddCategoryModalOpen && (
        <AddCategoryModal
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSave={addCategory}
        />
      )}
          </>
        )}
      </div>
      <Analytics />
      </div>
    </>
  );
}

export default App;

