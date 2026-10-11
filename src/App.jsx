import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, Moon, Sun, ChevronDown, FolderPlus, LinkIcon, HelpCircle, Menu } from 'lucide-react';
import CategorySection from './components/CategorySection';
import AddLinkModal from './components/AddLinkModal';
import CustomSelect from './components/CustomSelect';
import AddCategoryModal from './components/AddCategoryModal';
import ChatHistory from './components/ChatHistory';
import ChatPage from './components/ChatPage';
import LandingPage from './components/LandingPage';
import CustomAppModal from './components/CustomAppModal';

import { extractContentFromURL } from './utils/contentExtractor';
import { prepareSearchData, createSearchEngine, performSearch, debounce } from './utils/searchEngine';
import {
  createCustomApp,
  createInitialMemoryStore,
  enhancePromptWithAI,
  extractMemorySignals,
  mergeMemory,
  safeParseJSON,
  sanitizePlainText,
} from './utils/customApps';
import './App.css';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [isLandingPage, setIsLandingPage] = useState(() => sessionStorage.getItem('linkdok_landing_seen') !== 'true');

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
    const savedAppId = sessionStorage.getItem('activeCustomAppId');
    if (savedView === 'chat' && savedCatId) return 'chat';
    if (savedView === 'freechat') return 'freechat';
    if (savedView === 'customapp' && savedAppId) return 'customapp';
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

  // Custom AI apps state
  const [customApps, setCustomApps] = useState(() => {
    return safeParseJSON(localStorage.getItem('customApps'), []);
  });
  const [activeCustomApp, setActiveCustomApp] = useState(() => {
    try {
      const saved = sessionStorage.getItem('activeCustomAppId');
      if (!saved) return null;
      const apps = JSON.parse(localStorage.getItem('customApps') || '[]');
      return apps.find(app => app.id === Number(saved)) || null;
    } catch { return null; }
  });
  const [customAppChats, setCustomAppChats] = useState(() => {
    const chats = {};
    try {
      const apps = JSON.parse(localStorage.getItem('customApps') || '[]');
      apps.forEach(app => {
        chats[app.id] = JSON.parse(localStorage.getItem(`customAppChat_${app.id}`) || '[]');
      });
    } catch {
      return {};
    }
    return chats;
  });
  const [customAppMemory, setCustomAppMemory] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('customAppMemory'), null);
    return saved || createInitialMemoryStore();
  });
  const [isCustomAppModalOpen, setIsCustomAppModalOpen] = useState(false);
  const [editingCustomApp, setEditingCustomApp] = useState(null);

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

  useEffect(() => {
    localStorage.setItem('customApps', JSON.stringify(customApps));
  }, [customApps, activeCustomApp]);

  useEffect(() => {
    localStorage.setItem('customAppMemory', JSON.stringify(customAppMemory));
  }, [customAppMemory]);

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

  useEffect(() => {
    if (activeCustomApp) {
      const live = customApps.find(app => app.id === activeCustomApp.id);
      if (!live) {
        setActiveCustomApp(null);
        setCurrentView('main');
        sessionStorage.removeItem('currentView');
        sessionStorage.removeItem('activeCustomAppId');
      } else if (live !== activeCustomApp) {
        setActiveCustomApp(live);
      }
    }
  }, [customApps, activeCustomApp]);

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
    setActiveCustomApp(null);
    setCurrentView('chat');
    sessionStorage.setItem('currentView', 'chat');
    sessionStorage.setItem('activeChatCategoryId', String(category.id));
    sessionStorage.removeItem('activeCustomAppId');
  };

  const handleCloseChat = () => {
    setActiveChatCategory(null);
    setCurrentView('main');
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('activeChatCategoryId');
  };

  const handleSelectCategory = (category) => {
    setActiveChatCategory(category);
    setActiveCustomApp(null);
    sessionStorage.setItem('currentView', 'chat');
    sessionStorage.setItem('activeChatCategoryId', String(category.id));
    sessionStorage.removeItem('activeCustomAppId');
    
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
    setActiveCustomApp(null);
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('activeChatCategoryId');
    sessionStorage.removeItem('activeFreeSessionId');
    sessionStorage.removeItem('activeCustomAppId');
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
    setActiveCustomApp(null);
    setCurrentView('freechat');
    sessionStorage.setItem('currentView', 'freechat');
    sessionStorage.setItem('activeFreeSessionId', String(newSession.id));
    sessionStorage.removeItem('activeChatCategoryId');
    sessionStorage.removeItem('activeCustomAppId');
  };

  const handleOpenFreeChat = (session) => {
    setActiveFreeSession(session);
    setActiveChatCategory(null);
    setActiveCustomApp(null);
    setCurrentView('freechat');
    sessionStorage.setItem('currentView', 'freechat');
    sessionStorage.setItem('activeFreeSessionId', String(session.id));
    sessionStorage.removeItem('activeChatCategoryId');
    sessionStorage.removeItem('activeCustomAppId');
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

  const handleOpenCustomApp = (app) => {
    setActiveCustomApp(app);
    setActiveChatCategory(null);
    setActiveFreeSession(null);
    setCurrentView('customapp');
    sessionStorage.setItem('currentView', 'customapp');
    sessionStorage.setItem('activeCustomAppId', String(app.id));
    sessionStorage.removeItem('activeChatCategoryId');
    sessionStorage.removeItem('activeFreeSessionId');

    if (!customAppChats[app.id]) {
      setCustomAppChats(prev => ({ ...prev, [app.id]: [] }));
    }
  };

  const handleCreateCustomAppClick = () => {
    setEditingCustomApp(null);
    setIsCustomAppModalOpen(true);
  };

  const handleEditCustomApp = (app) => {
    setEditingCustomApp(app);
    setIsCustomAppModalOpen(true);
  };

  const handleSaveCustomApp = async ({ id, name, originalPrompt }) => {
    const enhancedPrompt = await enhancePromptWithAI(name, originalPrompt);

    if (id) {
      const existingApp = customApps.find(app => app.id === id);
      if (!existingApp) return;
      const updatedApp = {
        ...existingApp,
        name,
        originalPrompt: sanitizePlainText(originalPrompt),
        enhancedPrompt,
        updatedAt: Date.now(),
      };

      setCustomApps(prev => prev.map(app => app.id === id ? updatedApp : app));
      if (activeCustomApp?.id === id) setActiveCustomApp(updatedApp);
    } else {
      const newApp = createCustomApp({ name, originalPrompt, enhancedPrompt });
      setCustomApps(prev => [newApp, ...prev]);
      setCustomAppChats(prev => ({ ...prev, [newApp.id]: [] }));
      handleOpenCustomApp(newApp);
    }

    setIsCustomAppModalOpen(false);
    setEditingCustomApp(null);
  };

  const handleDeleteCustomApp = (appId) => {
    const app = customApps.find(item => item.id === appId);
    if (!app) return;
    if (!window.confirm(`Delete "${app.name}" and its chat history? This cannot be undone.`)) return;

    setCustomApps(prev => prev.filter(item => item.id !== appId));
    setCustomAppChats(prev => {
      const next = { ...prev };
      delete next[appId];
      localStorage.removeItem(`customAppChat_${appId}`);
      return next;
    });
    setCustomAppMemory(prev => {
      const next = {
        ...prev,
        apps: { ...(prev.apps || {}) },
      };
      delete next.apps[appId];
      return next;
    });

    if (activeCustomApp?.id === appId) {
      handleGoHome();
    }
  };

  const handleUpdateCustomAppMessages = (appId, messages) => {
    setCustomAppChats(prev => ({
      ...prev,
      [appId]: messages
    }));
    localStorage.setItem(`customAppChat_${appId}`, JSON.stringify(messages));
  };

  const handleCustomAppMemoryUpdate = (appId, userText) => {
    const signals = extractMemorySignals(userText);
    if (!signals) return;

    setCustomAppMemory(prev => {
      const current = prev || createInitialMemoryStore();
      return {
        global: mergeMemory(current.global, signals),
        apps: {
          ...(current.apps || {}),
          [appId]: mergeMemory(current.apps?.[appId], signals),
        },
      };
    });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth > 1024) {
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(true);
      return;
    }

    setIsSidebarOpen(prev => !prev);
  };

  const handleToggleCollapse = () => {
    // Only works on desktop
    if (window.innerWidth > 1024) {
      setIsSidebarCollapsed(prev => !prev);
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

  return (
    <>
      {isLandingPage && (
        <LandingPage isDarkMode={isDarkMode} onGetStarted={() => {
          sessionStorage.setItem('linkdok_landing_seen', 'true');
          setIsLandingPage(false);
        }} />
      )}
      <div className="app" style={isLandingPage ? { display: 'none' } : undefined}>
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
        customApps={customApps}
        activeCustomApp={activeCustomApp}
        onOpenCustomApp={handleOpenCustomApp}
        onCreateCustomApp={handleCreateCustomAppClick}
        onEditCustomApp={handleEditCustomApp}
        onDeleteCustomApp={handleDeleteCustomApp}
      />

      {/* Main Content Area */}
      <div className={`main-app-container ${currentView === 'chat' || currentView === 'freechat' || currentView === 'customapp' ? 'chat-view' : ''} ${(!isSidebarOpen || isSidebarCollapsed) ? 'sidebar-closed' : ''}`}>
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
        ) : currentView === 'customapp' && activeCustomApp ? (
          <ChatPage
            key={`customapp-${activeCustomApp.id}`}
            category={{ id: activeCustomApp.id, name: activeCustomApp.name, links: [] }}
            messages={customAppChats[activeCustomApp.id] || []}
            onUpdateMessages={(msgs) => handleUpdateCustomAppMessages(activeCustomApp.id, msgs)}
            resourceContents={[]}
            isPreparingChat={false}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            onToggleSidebar={handleToggleSidebar}
            customApp={activeCustomApp}
            globalMemory={customAppMemory.global}
            appMemory={customAppMemory.apps?.[activeCustomApp.id]}
            onMemoryUpdate={(userText) => handleCustomAppMemoryUpdate(activeCustomApp.id, userText)}
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
      {isCustomAppModalOpen && (
        <CustomAppModal
          editingApp={editingCustomApp}
          onClose={() => {
            setIsCustomAppModalOpen(false);
            setEditingCustomApp(null);
          }}
          onSave={handleSaveCustomApp}
        />
      )}
      <Analytics />
      </div>
    </>
  );
}

export default App;

