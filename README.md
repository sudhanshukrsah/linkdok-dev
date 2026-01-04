# LinkDok - AI-Powered Link Management & Learning Platform

<div align="center">
  <img src="public/LinkDok-logo.svg" alt="LinkDok Logo" width="300"/>
  
  **Intelligent bookmark manager with category-based AI tutoring**
  
  [![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)](https://vitejs.dev/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [API Usage](#-api-usage)
- [Data Flow](#-data-flow)
- [Running the Project](#-running-the-project)
- [Common Errors & Fixes](#-common-errors--fixes)
- [Security Practices](#-security-practices)
- [Future Roadmap](#-future-roadmap)

---

## 🎯 Project Overview

### Problem It Solves

**LinkDok** addresses three major pain points in digital knowledge management:

1. **Scattered bookmarks** across browsers with no contextual organization
2. **Lack of intelligent search** - finding saved resources requires manual browsing
3. **No learning assistance** - saved links remain passive, no way to ask questions about content

### Why It Exists

Traditional bookmark managers are static storage systems. LinkDok transforms bookmarks into an **active learning environment** by:

- **Auto-extracting content** from saved links using multiple extraction strategies
- **Organizing by categories** with intelligent search powered by Fuse.js
- **AI-powered tutoring** per category using OpenRouter API (GPT-4o-mini)
- **Context-aware answers** based on actual content from your saved resources

### Use Cases

- **Developers**: Save technical docs, tutorials, Stack Overflow answers → Ask questions to an AI tutor trained on YOUR saved resources
- **Researchers**: Organize papers by topic → Chat with AI about specific research areas
- **Students**: Categorize course materials → Get explanations based on your saved content

---

## ✨ Features

### 1. **Multi-Category Organization**
- Create unlimited categories with custom names
- Pin important categories to top
- Each category maintains independent chat history

### 2. **Intelligent Link Management**
- **Auto-metadata extraction**: Title, image, description from URLs
- **Content extraction**: 4-layer fallback system (Diffbot → Jina AI → Proxy → Direct)
- **Pin important links** within categories
- **Full CRUD operations**: Add, edit, delete links
- **Timestamp tracking**: Creation date for all links

### 3. **Advanced Search System**
- **Fuzzy search** powered by Fuse.js (typo-tolerant)
- Searches across: titles, URLs, descriptions
- **Filter by category**: Dropdown to scope results
- **AI fallback**: If no results, AI suggests alternatives

### 4. **Category-Based AI Tutor**
- **Isolated chat per category**: Each has its own chat history
- **Context-aware**: AI answers based on extracted content from category's links
- **Source attribution**: Shows if answer is from your resources or general knowledge
- **Markdown support**: Formatted code, lists, tables in responses
- **Message editing**: Edit questions to regenerate answers
- **Copy answers**: One-click copy to clipboard
- **Chat persistence**: History saved in localStorage
- **Clear chat**: Delete conversation with confirmation

### 5. **Smart UI/UX**
- **Dark/Light mode**: Persistent theme preference
- **Collapsible sidebar**: Category navigation with icon-only mode
- **Responsive design**: Desktop & tablet optimized
- **Loading states**: Skeleton loaders, typing indicators
- **Empty states**: Helpful prompts when no content

---

## 🛠 Tech Stack

### Frontend
- **React 19.2.0**: Latest concurrent features
- **Vite 7.2.4**: Ultra-fast dev server & build
- **Lucide React 0.560**: Lightweight icon library
- **Framer Motion 12.23**: Smooth animations

### UI & Styling
- **Custom CSS**: Full control, no framework
- **Tailwind Merge + CLSX**: Conditional class utilities
- **CSS Variables**: Theme system (dark/light)

### State Management
- **React Hooks**: useState, useEffect, useMemo, useCallback, useRef
- **LocalStorage**: Persistent data layer
- **No external state lib**: Pure React patterns

### Search & AI
- **Fuse.js 7.1.0**: Fuzzy search engine
- **OpenRouter API**: Unified LLM gateway (GPT-4o-mini)
- **React Markdown 10.1**: Render AI responses
- **Remark-GFM 4.0**: GitHub-flavored markdown

### Content Extraction
- **Diffbot Article API**: Premium extraction (optional)
- **Jina AI Reader**: Free, reliable extractor
- **AllOrigins Proxy**: CORS bypass
- **Native Fetch**: Direct scraping fallback

---

## 🏗 Architecture

### High-Level Flow

```
User Actions
    ↓
React Components (App.jsx → CategorySection → ChatPage)
    ↓
State Manager (App.jsx)
    ├── Categories & Links
    ├── Chat History (per category)
    └── Resource Contents
    ↓
┌────────────┬────────────┬────────────┐
│ LocalStorage│ External APIs│ Utilities │
└────────────┴────────────┴────────────┘
```

### State Architecture

```javascript
App.jsx (Single Source of Truth)
├─ categories: [{ id, name, links: [], isPinned }]
├─ categoryChats: { [categoryId]: [messages] }  // Isolated per category
├─ resourceContents: { "catId_linkId": { extractedText, metadata } }
├─ searchResults: []  // Fuse.js output
└─ isDarkMode: boolean
```

**Key Design Decision**: `categoryChats` managed at App level to prevent race conditions during category switches.

---

## 📂 Folder Structure

```
link-collector/
├── public/
│   ├── LinkDok-logo.svg           # Dark mode logo
│   ├── LinkDok-logo-day.svg       # Light mode logo
│   └── favicon.svg
│
├── src/
│   ├── components/
│   │   ├── AddCategoryModal.jsx   # Create new category
│   │   ├── AddLinkModal.jsx       # Add/edit links
│   │   ├── CategorySection.jsx    # Category card with links grid
│   │   ├── ChatHistory.jsx        # Sidebar: Category navigation
│   │   ├── ChatPage.jsx           # Full-screen chat interface
│   │   └── LinkCard.jsx           # Individual link card
│   │
│   ├── utils/
│   │   ├── aiService.js           # OpenRouter API - descriptions
│   │   ├── aiTutor.js             # OpenRouter API - tutoring
│   │   ├── contentExtractor.js    # 4-layer content extraction
│   │   ├── metadata.js            # Fetch og:title, og:image
│   │   ├── searchEngine.js        # Fuse.js + debounce
│   │   ├── searchFallback.js      # AI search suggestions
│   │   └── topicExtractor.js      # NLP topic extraction (unused)
│   │
│   ├── App.jsx                    # Root component, state manager
│   ├── App.css                    # Global styles
│   ├── main.jsx                   # Vite entry point
│   └── index.css                  # CSS variables, theme colors
│
├── .env                           # API keys (NEVER COMMIT)
├── .env.example                   # Template for env vars
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔧 Installation & Setup

### Prerequisites

- Node.js v18+ (v20+ recommended)
- npm v9+

### Installation Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/link-collector.git
   cd link-collector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   VITE_DIFFBOT_TOKEN=your_token  # Optional
   ```

4. **Start dev server**
   ```bash
   npm run dev
   ```

---

## 🔐 Environment Variables

### Required

```env
# OpenRouter API (REQUIRED for AI features)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

**Get key**: https://openrouter.ai/keys

### Optional

```env
# Change AI model (default: openai/gpt-4o-mini)
VITE_OPENROUTER_MODEL=anthropic/claude-3-haiku

# Diffbot token for premium content extraction
VITE_DIFFBOT_TOKEN=your_token_here
```

### Security Rules

✅ **DO**:
- Use `.env.example` as template
- Never commit `.env`
- Use `import.meta.env.VITE_*` in code

❌ **DON'T**:
- Hardcode API keys
- Use non-VITE_ prefixed vars

---

## 🌐 API Usage

### 1. OpenRouter API

**Purpose**: AI tutoring and search fallback

**Endpoints**: `https://openrouter.ai/api/v1/chat/completions`

**Files**:
- `aiTutor.js` - Category Q&A
- `aiService.js` - Generate descriptions
- `searchFallback.js` - Search suggestions

**Config**:
```javascript
{
  model: "openai/gpt-4o-mini",
  temperature: 0.3,
  max_tokens: 1500
}
```

**Cost**: ~$0.15 per 1M tokens (very affordable)

### 2. Diffbot Article API (Optional)

**Purpose**: Premium content extraction

**Endpoint**: `https://api.diffbot.com/v3/article`

**Get Token**: https://www.diffbot.com/

### 3. Jina AI Reader (Free)

**Purpose**: Free web content extraction

**Endpoint**: `https://r.jina.ai/{url}`

**No API key required**

---

## 💾 Data Flow

### LocalStorage Schema

```javascript
// Categories & Links
localStorage.setItem('linkCollectorCategories', JSON.stringify([
  {
    id: 1736281234567,
    name: "React Resources",
    links: [
      {
        id: 1736281234568,
        title: "React Docs",
        url: "https://react.dev",
        image: "https://react.dev/og.png",
        isPinned: true
      }
    ]
  }
]));

// Per-Category Chat
localStorage.setItem('categoryChat_1736281234567', JSON.stringify([
  { role: 'user', content: 'What is JSX?' },
  { role: 'assistant', content: 'JSX is...' }
]));

// Extracted Content
localStorage.setItem('resourceContents', JSON.stringify({
  "catId_linkId": {
    extractedText: "Full text...",
    success: true,
    method: "jina"
  }
}));
```

---

## 🚀 Running the Project

### Development

```bash
npm run dev        # Start dev server at localhost:5173
```

### Production

```bash
npm run build      # Build to dist/
npm run preview    # Preview production build
```

### Linting

```bash
npm run lint       # ESLint check
```

---

## 🐛 Common Errors & Fixes

### 1. "API key not configured"

```bash
# Fix: Add key to .env
echo "VITE_OPENROUTER_API_KEY=sk-or-v1-xxx" >> .env
npm run dev
```

### 2. Content Extraction Fails

- Check if Diffbot token added (optional)
- URL might be behind paywall
- Try different URL

### 3. Port Already in Use

Vite auto-assigns next port. Or manually:

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## 🔒 Security Practices

### Implemented

1. **Environment Variables**: All API keys in `.env` (gitignored)
2. **Vite Prefix**: Only `VITE_*` vars exposed to client
3. **XSS Protection**: React escapes input, Markdown sanitized
4. **CORS Proxies**: Uses AllOrigins to prevent IP leaks

### Production Recommendations

1. **API Proxy**: Use serverless functions to hide keys
2. **Rate Limiting**: Throttle requests (max 10/min)
3. **CSP Headers**: Restrict allowed origins

---

## 🚧 Future Roadmap

### v2.0 Plans

- [ ] **Backend**: Express.js API + PostgreSQL
- [ ] **Auth**: Firebase/Clerk user accounts
- [ ] **Browser Extension**: Save from any webpage
- [ ] **Vector Search**: Semantic search with embeddings
- [ ] **Export/Import**: JSON/CSV backup
- [ ] **PWA**: Install as app
- [ ] **Multi-language**: i18n support
- [ ] **Testing**: Vitest + Playwright

---

## 📜 License

MIT License - Free to use, modify, distribute

---

## 📧 Contact

**Issues**: [GitHub Issues](https://github.com/yourusername/link-collector/issues)

---

<div align="center">
  <strong>Built with ❤️ using React + Vite + AI</strong>
  
  ⭐ Star if helpful!
</div>
