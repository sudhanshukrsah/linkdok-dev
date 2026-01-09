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

### Backend (Serverless)
- **Vercel Functions**: Serverless API routes
- **Node.js Runtime**: Server-side JavaScript
- **Environment Variables**: Secure server-side key storage

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
- **OpenRouter API**: Unified LLM gateway (via serverless proxy)
- **React Markdown 10.1**: Render AI responses
- **Remark-GFM 4.0**: GitHub-flavored markdown

### Content Extraction
- **Diffbot Article API**: Premium extraction (via serverless proxy)
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
┌────────────┬─────────────────┬────────────┐
│ LocalStorage│ Serverless APIs │ Utilities  │
│             │ (/api/chat)     │            │
│             │ (/api/extract)  │            │
└────────────┴────────┬──────────┴────────────┘
                      ↓
            External APIs (Secure)
            ├── OpenRouter
            └── Diffbot
```

### Serverless Architecture (Secure)

```
Browser (Frontend)
    ↓ No API keys exposed!
    ↓ POST /api/chat or /api/extract
    ↓
Vercel Serverless Functions
    ├── api/chat.js (OpenRouter proxy)
    └── api/extract.js (Diffbot proxy)
    ↓ API keys stored server-side
    ↓ Authenticated requests
    ↓
External APIs
    ├── OpenRouter API
    └── Diffbot API
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
├── api/                           # 🆕 Serverless Functions (Vercel)
│   ├── chat.js                    # OpenRouter proxy (secure)
│   └── extract.js                 # Diffbot proxy (secure)
│
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
│   │   ├── aiService.js           # Calls /api/chat (no keys)
│   │   ├── aiTutor.js             # Calls /api/chat (no keys)
│   │   ├── contentExtractor.js    # Calls /api/extract (no keys)
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
├── .env                           # Server-side keys (NEVER COMMIT)
├── .env.example                   # Template for env vars
├── .gitignore
├── vercel.json                    # 🆕 Vercel configuration
├── package.json
├── vite.config.js
├── SECURITY_SETUP.md              # 🆕 Security implementation guide
├── DEPLOYMENT_CHECKLIST.md        # 🆕 Quick deployment steps
├── ARCHITECTURE.md                # 🆕 Architecture diagrams
└── README.md
```

---

## 🔧 Installation & Setup

### Prerequisites

- Node.js v18+ (v20+ recommended)
- npm v9+
- Vercel account (for deployment)

### Local Development Setup

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
   
   Edit `.env` (server-side variables):
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   DIFFBOT_TOKEN=your_token_here
   APP_URL=http://localhost:3000
   ```

4. **Test locally with Vercel CLI** (recommended)
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Run development server with serverless functions
   vercel dev
   ```
   
   Or use Vite directly (serverless functions won't work):
   ```bash
   npm run dev
   ```

### Production Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables:
     ```
     OPENROUTER_API_KEY=sk-or-v1-xxx...
     DIFFBOT_TOKEN=your_token
     APP_URL=https://your-domain.vercel.app
     ```
   - Deploy!

3. **Verify Security**
   - Open DevTools → Network tab
   - Add a link or chat
   - Requests should go to `/api/chat` and `/api/extract`
   - ✅ No API keys visible in browser!

📖 **Detailed Guide**: See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 🔐 Environment Variables

### 🔒 Serverless Setup (Production - Vercel)

**API keys are now stored server-side for security!**

On **Vercel Dashboard** → **Project Settings** → **Environment Variables**, add:

```env
# OpenRouter API (Server-side - SECURE)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Diffbot Token (Server-side - SECURE)
DIFFBOT_TOKEN=your_token_here

# App URL (Optional)
APP_URL=https://your-domain.vercel.app
```

**Get keys**: 
- OpenRouter: https://openrouter.ai/keys
- Diffbot: https://www.diffbot.com/

⚠️ **IMPORTANT**: No `VITE_` prefix! These are server-side variables.

### Local Development

Create `.env` file:

```env
# For local testing with serverless functions
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
DIFFBOT_TOKEN=your_token_here
APP_URL=http://localhost:3000
```

### Security Implementation

✅ **Secure (Current)**:
- API keys stored on server (Vercel Functions)
- Frontend calls `/api/chat` and `/api/extract`
- Keys never exposed to browser
- Impossible for users to steal keys

❌ **Old Insecure Method**:
- ~~`VITE_` prefix exposed keys to browser~~
- ~~Keys visible in DevTools~~
- ~~Anyone could steal and use your keys~~

### Architecture

```
Browser → /api/chat → OpenRouter (key on server ✅)
Browser → /api/extract → Diffbot (token on server ✅)
```

See [SECURITY_SETUP.md](SECURITY_SETUP.md) for detailed implementation.

---

## 🌐 API Usage

### Serverless API Routes (Secure)

#### POST /api/chat

**Purpose**: Proxy for OpenRouter API (AI chat/summarization)

**Security**: API key stored server-side, never exposed to browser

**Request**:
```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'tngtech/deepseek-r1t2-chimera:free',
    messages: [{ role: 'user', content: 'Your question' }],
    stream: false
  })
})
```

**Response**:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "AI response..."
    }
  }]
}
```

**Used by**:
- `aiTutor.js` - Category Q&A
- `aiService.js` - Generate descriptions
- `searchFallback.js` - Search suggestions

#### POST /api/extract

**Purpose**: Proxy for Diffbot Article API (content extraction)

**Security**: Diffbot token stored server-side, never exposed to browser

**Request**:
```javascript
fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/article' })
})
```

**Response**:
```json
{
  "url": "https://example.com/article",
  "extractedText": "Full article content...",
  "extractedAt": 1704844800000,
  "success": true,
  "method": "diffbot"
}
```

**Used by**:
- `contentExtractor.js` - Premium content extraction (Method 1)

### External APIs (No Key Required)

#### Jina AI Reader (Free)

**Purpose**: Free web content extraction (fallback)

**Endpoint**: `https://r.jina.ai/{url}`

**No API key required** - Direct fetch from browser

### Cost & Performance

- **OpenRouter**: ~$0.15 per 1M tokens (free tier models available)
- **Diffbot**: Free trial, then pay-as-you-go
- **Jina AI**: 100% free
- **Serverless Functions**: Free on Vercel (Hobby plan)

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

### ✅ Implemented (Production-Ready)

1. **Serverless Backend**: API keys stored on Vercel Functions (server-side)
   - OpenRouter key → `api/chat.js`
   - Diffbot token → `api/extract.js`
   - Keys never sent to browser
   - Impossible for users to extract keys

2. **Environment Variables**: Server-side only (no `VITE_` prefix)
   - `.env` file gitignored
   - Production keys set on Vercel dashboard
   - Local development uses `.env`

3. **XSS Protection**: React escapes input, Markdown sanitized

4. **CORS Configuration**: `vercel.json` handles CORS for API routes

5. **Function Timeout**: 30 seconds limit prevents abuse

### Security Architecture

```
┌──────────────────────────────────────────────────────┐
│  BEFORE (Insecure ❌)                                │
│                                                       │
│  Browser → OpenRouter (API key exposed in browser)   │
│  Anyone can steal key from DevTools Network tab      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  AFTER (Secure ✅)                                   │
│                                                       │
│  Browser → /api/chat → OpenRouter (key on server)    │
│  Key never leaves server, impossible to steal        │
└──────────────────────────────────────────────────────┘
```

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Key Visibility** | ❌ In browser JS | ✅ Server-only |
| **DevTools** | ❌ Key visible | ✅ Key hidden |
| **Source Code** | ❌ Key in bundle | ✅ No keys in bundle |
| **Cost Protection** | ❌ Anyone can drain | ✅ Controlled access |
| **Key Rotation** | ❌ Redeploy frontend | ✅ Update env var only |

### Additional Recommendations

1. **Rate Limiting**: Add per-IP throttling in serverless functions
2. **Authentication**: Add user auth (Firebase/Clerk) for multi-user
3. **CSP Headers**: Configure in `vercel.json` for extra security
4. **API Monitoring**: Use Vercel Analytics to track API usage

📖 **Full Security Guide**: See [SECURITY_SETUP.md](SECURITY_SETUP.md)

---

## 🚧 Future Roadmap

### ✅ v1.5 - Security Update (Completed)

- [x] **Serverless Backend**: Vercel Functions for API proxying
- [x] **Secure Key Storage**: Server-side environment variables
- [x] **API Routes**: `/api/chat` and `/api/extract` endpoints
- [x] **CORS Configuration**: Proper headers for API routes
- [x] **Production Ready**: Safe to deploy publicly

### v2.0 Plans

- [ ] **Database**: PostgreSQL for persistent storage
- [ ] **Auth**: Firebase/Clerk user accounts
- [ ] **Browser Extension**: Save from any webpage
- [ ] **Vector Search**: Semantic search with embeddings
- [ ] **Export/Import**: JSON/CSV backup
- [ ] **PWA**: Install as app
- [ ] **Multi-language**: i18n support
- [ ] **Testing**: Vitest + Playwright
- [ ] **Rate Limiting**: Per-user API throttling
- [ ] **Analytics**: Usage tracking and insights

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
