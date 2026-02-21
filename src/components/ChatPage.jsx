import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Square, Moon, Sun, Copy, Edit2, Check, Trash2, Menu, Paperclip, X, ChevronDown, Image, Sparkles, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Strip per-token backgrounds from oneDark so the dark base shows through cleanly
const cleanDark = Object.fromEntries(
  Object.entries(oneDark).map(([token, style]) => [
    token,
    { ...style, background: undefined, backgroundColor: undefined },
  ])
);
import * as pdfjsLib from "pdfjs-dist";
import { askTutor, AVAILABLE_MODELS } from "../utils/aiTutor";
import "./ChatPage.css";

// Set pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// File type helpers
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const TEXT_TYPES  = ["text/plain", "text/markdown", "text/csv", "text/javascript", "text/typescript",
                     "application/json", "application/xml", "text/html", "text/css"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_TEXT_BYTES  = 500 * 1024;       // 500 KB for text files
const MAX_PDF_BYTES   = 20 * 1024 * 1024; // 20 MB for PDFs
const MAX_IMAGES      = 5;                // max images per message

const SUGGESTED_QUESTIONS = [
  "Summarize the key topics in these resources",
  "What are the most important concepts I should know?",
  "Give me a short quiz on this material",
  "What questions should I ask to understand this better?",
];

const PLAYGROUND_SUGGESTIONS = [
  "Explain quantum computing in simple terms",
  "Write a Python function to reverse a linked list",
  "What are the pros and cons of microservices?",
  "Help me debug this: why does 0.1 + 0.2 !== 0.3 in JS?",
];

// Custom code block renderer for ReactMarkdown
function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && (match || code.includes("\n"))) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-block-lang">{language || "code"}</span>
          <button className="code-copy-btn" onClick={handleCopyCode} title="Copy code">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={cleanDark}
          language={language || "text"}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0 0 8px 8px",
            fontSize: "0.85rem",
            lineHeight: "1.6",
            padding: "1rem 1.25rem",
            background: "#0d1117",
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={`inline-code ${className || ""}`} {...props}>
      {children}
    </code>
  );
}

function ChatPage({
  category,
  messages,
  onUpdateMessages,
  resourceContents,
  isPreparingChat,
  isDarkMode,
  onToggleTheme,
  onToggleSidebar,
  isPlayground = false,
}) {
  const [input, setInput]                     = useState("");
  const [isLoading, setIsLoading]             = useState(false);
  const [isStreaming, setIsStreaming]          = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [editingIndex, setEditingIndex]       = useState(null);
  const [editingText, setEditingText]         = useState("");
  const [copiedIndex, setCopiedIndex]         = useState(null);
  const [attachments, setAttachments]         = useState([]);     // [{name, type:"image"|"text", data, mimeType, preview?}]
  const [selectedModel, setSelectedModel]     = useState("auto");
  const [modelDropOpen, setModelDropOpen]     = useState(false);
  const [attachError, setAttachError]         = useState("");
  const [rateLimitMsg, setRateLimitMsg]       = useState("");
  const [thinkingMode, setThinkingMode]       = useState("auto"); // 'auto' | 'on' | 'off'
  const [thinkingContent, setThinkingContent] = useState("");     // live reasoning tokens

  const messagesEndRef    = useRef(null);
  const chatMessagesRef   = useRef(null);   // the scrollable container
  const textareaRef       = useRef(null);
  const fileInputRef      = useRef(null);
  const abortRef          = useRef(null);
  const streamAccumRef    = useRef("");
  const streamFrameRef    = useRef(null);
  const modelDropRef      = useRef(null);
  const rateLimitTimerRef = useRef(null);   // auto-clear the rate-limit banner
  const clientHitsRef     = useRef([]);     // timestamps for client-side soft rate limit
  const userStoppedRef    = useRef(false);  // distinguish user-stop from timeout
  const thinkingAccumRef  = useRef("");     // accumulates reasoning_content tokens
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Smart scroll: only auto-scroll if user is already near the bottom
  const scrollToBottom = useCallback((force = false) => {
    const el = chatMessagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (force || distFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Detect if user has scrolled up manually
  const handleMessagesScroll = useCallback(() => {
    const el = chatMessagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsUserScrolledUp(distFromBottom > 120);
  }, []);

  // Scroll to bottom when new messages arrive (force only on new message, not streaming chunks)
  useEffect(() => {
    scrollToBottom(true); // new confirmed message — always scroll
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // During streaming, scroll only if user hasn't scrolled away
  useEffect(() => {
    scrollToBottom(false);
  }, [streamingContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Reset on category change
  useEffect(() => {
    setEditingIndex(null);
    setEditingText("");
    setInput("");
    setAttachments([]);
    setAttachError("");
  }, [category.id]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target)) {
        setModelDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -- Streaming helper --------------------------------------------
  const createChunkHandler = useCallback(() => {
    streamAccumRef.current = "";
    // Batch DOM updates to ~60fps via rAF for smooth rendering
    return (token) => {
      streamAccumRef.current += token;
      if (!streamFrameRef.current) {
        streamFrameRef.current = requestAnimationFrame(() => {
          setStreamingContent(streamAccumRef.current);
          // Once actual content starts, hide the thinking bubble
          setThinkingContent("");
          streamFrameRef.current = null;
        });
      }
    };
  }, []);

  // -- Thinking chunk handler (reasoning_content tokens) -----------
  const createThinkingChunkHandler = useCallback(() => {
    thinkingAccumRef.current = "";
    return (token) => {
      thinkingAccumRef.current += token;
      // Throttle: update UI every ~100ms max
      setThinkingContent(thinkingAccumRef.current);
    };
  }, []);

  // -- File attachment ---------------------------------------------

  // Extract text from a PDF file using pdfjs-dist
  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n`;
    }
    return { text: fullText, pages: pdf.numPages };
  };

  const handleFileSelect = async (e) => {
    setAttachError("");
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    for (const file of files) {
      if (IMAGE_TYPES.includes(file.type)) {
        const currentImages = attachments.filter(a => a.type === "image").length;
        if (currentImages >= MAX_IMAGES) {
          setAttachError(`Max ${MAX_IMAGES} images per message`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setAttachError(`${file.name}: image too large (max 5 MB)`);
          continue;
        }
        const data = await readAsDataURL(file);
        setAttachments(prev => [...prev, { name: file.name, type: "image", data, mimeType: file.type, preview: data }]);

      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        if (file.size > MAX_PDF_BYTES) {
          setAttachError(`${file.name}: PDF too large (max 20 MB)`);
          continue;
        }
        try {
          setAttachError(`Reading ${file.name}…`);
          const { text, pages } = await extractPdfText(file);
          setAttachError("");
          if (!text.trim()) {
            setAttachError(`${file.name}: could not extract text (scanned image PDF is not supported)`);
            continue;
          }
          setAttachments(prev => [...prev, {
            name: file.name,
            type: "text",
            data: text,
            mimeType: "application/pdf",
            pages
          }]);
        } catch (err) {
          setAttachError(`${file.name}: failed to read PDF — ${err.message}`);
        }

      } else if (TEXT_TYPES.includes(file.type) || file.name.match(/\.(txt|md|csv|json|js|ts|jsx|tsx|py|html|css|xml)$/i)) {
        if (file.size > MAX_TEXT_BYTES) {
          setAttachError(`${file.name}: file too large (max 500 KB)`);
          continue;
        }
        const data = await readAsText(file);
        setAttachments(prev => [...prev, { name: file.name, type: "text", data, mimeType: file.type }]);
      } else {
        setAttachError(`${file.name}: unsupported file type`);
      }
    }
  };

  const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const readAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  // -- Rate limit helpers -----------------------------------------
  const showRateLimit = useCallback((sec) => {
    clearTimeout(rateLimitTimerRef.current);
    const s = Math.max(1, Math.round(sec));
    setRateLimitMsg(`Too many messages — please wait ${s}s before sending again.`);
    rateLimitTimerRef.current = setTimeout(() => setRateLimitMsg(""), s * 1000);
  }, []);

  // -- Stop generation ---------------------------------------------
  const handleStop = () => {
    userStoppedRef.current = true;
    abortRef.current?.abort();
  };

  // -- Core send logic ---------------------------------------------
  const sendMessage = async (questionText, conversationSoFar, currentAttachments = []) => {
    abortRef.current = new AbortController();
    userStoppedRef.current = false;
    const onChunk = createChunkHandler();
    const onThinkingChunk = createThinkingChunkHandler();

    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent("");
    setThinkingContent("");

    try {
      const response = await askTutor(questionText, resourceContents, {
        onChunk,
        selectedModel,
        attachments: currentAttachments,
        signal: abortRef.current.signal,
        conversationHistory: conversationSoFar,
        playground: isPlayground,
        thinkingMode,
        onThinkingChunk,
      });

      // Flush any pending rAF batch
      cancelAnimationFrame(streamFrameRef.current);
      streamFrameRef.current = null;

      return {
        role: "assistant",
        content: response.answer,
        metadata: {
          basedOnResources: response.basedOnResources,
          modelUsed: response.modelUsed,
          intent: response.intent,
        },
      };
    } catch (err) {
      if (err.name === "AbortError") {
        if (!userStoppedRef.current) {
          // Timeout — not a user action
          return {
            role: "assistant",
            content: streamAccumRef.current ||
              "*(The model took too long to respond. Try a shorter question, disable thinking mode, or switch to a faster model like Step Flash.)*",
            metadata: { timedOut: true },
          };
        }
        // User pressed Stop — keep whatever was streamed
        return {
          role: "assistant",
          content: streamAccumRef.current || "*(Generation stopped)*",
          metadata: { stopped: true },
        };
      }
      throw err;
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent("");
      setThinkingContent("");
      streamAccumRef.current = "";
      thinkingAccumRef.current = "";
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const userText = input.trim();
    if (!userText || isLoading) return;

    // --- Client-side soft rate limit: 6 messages per 60s ---
    // Gives instant feedback before the API call even goes out.
    const now = Date.now();
    clientHitsRef.current = clientHitsRef.current.filter(t => now - t < 60_000);
    if (clientHitsRef.current.length >= 6) {
      const waitSec = Math.ceil((clientHitsRef.current[0] + 60_000 - now) / 1000);
      showRateLimit(waitSec);
      return; // input preserved — user can resend after cooldown
    }
    clientHitsRef.current.push(now);

    const snapshot = [...attachments];
    setInput("");
    setAttachments([]);
    setAttachError("");

    const userMsg = {
      role: "user",
      content: userText,
      attachments: snapshot.length ? snapshot : undefined,
    };
    const newMessages = [...messages, userMsg];
    onUpdateMessages(newMessages);

    try {
      const assistantMsg = await sendMessage(userText, messages, snapshot);
      onUpdateMessages([...newMessages, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      if (err.rateLimited) {
        // Restore input so user can resend after the cooldown
        setInput(userText);
        onUpdateMessages(messages); // revert — remove the undelivered user message
        showRateLimit(err.retryAfter || 60);
      } else {
        onUpdateMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handleSuggestedQuestion = (q) => { setInput(q); textareaRef.current?.focus(); };

  // -- Edit & re-ask -----------------------------------------------
  const handleSaveEdit = async (index) => {
    if (!editingText.trim()) return;
    const updated = [...messages];
    updated[index] = { ...updated[index], content: editingText.trim() };
    const kept = updated.slice(0, index + 1);
    onUpdateMessages(kept);
    setEditingIndex(null);
    setEditingText("");

    try {
      const assistantMsg = await sendMessage(editingText.trim(), kept.slice(0, -1));
      onUpdateMessages([...kept, assistantMsg]);
    } catch (err) {
      console.error("Edit re-ask error:", err);
      if (err.rateLimited) {
        onUpdateMessages(kept.slice(0, -1)); // revert the edit too
        showRateLimit(err.retryAfter || 60);
      } else {
        onUpdateMessages([...kept, { role: "assistant", content: "Sorry, an error occurred." }]);
      }
    }
  };

  // -- Copy --------------------------------------------------------
  const handleCopy = async (content, idx) => {
    try { await navigator.clipboard.writeText(content); setCopiedIndex(idx); setTimeout(() => setCopiedIndex(null), 2000); }
    catch {}
  };

  // -- Clear -------------------------------------------------------
  const handleClear = () => {
    if (!messages.length) return;
    if (window.confirm("Clear this chat history? This cannot be undone.")) onUpdateMessages([]);
  };

  // -- Current model label -----------------------------------------
  const currentModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel) ?? AVAILABLE_MODELS[0];

  const handleThinkingPillClick = (e, modelId) => {
    e.stopPropagation(); // don't close the dropdown or select model via outer button
    // If clicking on a different model's pill → select it first, then turn thinking ON
    if (modelId !== selectedModel) {
      setSelectedModel(modelId);
      setThinkingMode('on');
      return;
    }
    // Same model → cycle Auto → On → Off → Auto
    setThinkingMode(prev => prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto');
  };

  const thinkingLabel = thinkingMode === 'on' ? 'On'
    : thinkingMode === 'off' ? 'Off'
    : 'Auto';

  // ----------------------------------------------------------------
  return (
    <div className="chat-page">
      {/* --- Header ----------------------------------------------- */}
      <div className="chat-page-header">
        <div className="chat-header-left">
          <button className="btn btn-icon menu-toggle-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
            <Menu size={18} />
          </button>
          <img
            src={isDarkMode ? "/LinkDok-logo.svg" : "/LinkDok-logo-day.svg"}
            alt="LinkDok"
            className="chat-logo"
          />
        </div>

        <div className="chat-header-center">
          {/* Model selector dropdown */}
          <div className="model-selector-wrap" ref={modelDropRef}>
            <button
              className="model-selector-btn"
              onClick={() => setModelDropOpen(o => !o)}
              title="Select AI model"
            >
              <span
                className="model-selector-badge"
                style={{ background: `${currentModelInfo.color}22`, color: currentModelInfo.color, borderColor: `${currentModelInfo.color}44` }}
              >
                {currentModelInfo.abbr}
              </span>
              <span className="model-selector-label">{currentModelInfo.label}</span>
              <ChevronDown size={13} className={`model-chevron ${modelDropOpen ? "open" : ""}`} />
            </button>

            {modelDropOpen && (
              <div className="model-dropdown">
                <div className="model-dropdown-header">Choose AI Model</div>
                {AVAILABLE_MODELS.map(m => {
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      className={`model-option ${isSelected ? "active" : ""}`}
                      onClick={() => { setSelectedModel(m.id); setModelDropOpen(false); }}
                    >
                      <span
                        className="model-opt-badge"
                        style={{ background: `${m.color}22`, color: m.color, borderColor: `${m.color}44` }}
                      >
                        {m.abbr}
                      </span>
                      <span className="model-opt-info">
                        <span className="model-opt-label">{m.label}</span>
                        <span className="model-opt-desc">{m.description}</span>
                      </span>

                      {/* Thinking pill — only on thinking-capable models */}
                      {m.supportsThinking && (
                        <span
                          role="button"
                          className={`model-think-pill${
                            isSelected
                              ? thinkingMode === 'on'  ? ' think-pill-on'
                              : thinkingMode === 'off' ? ' think-pill-off'
                              : ' think-pill-auto'
                              : ' think-pill-idle'
                          }`}
                          title={
                            isSelected
                              ? thinkingMode === 'on'  ? 'Thinking ON — click to set Auto'
                              : thinkingMode === 'off' ? 'Thinking OFF — click to set Auto'
                              : 'Thinking Auto — click to turn ON'
                              : 'Supports thinking — click to select & enable'
                          }
                          onClick={e => handleThinkingPillClick(e, m.id)}
                        >
                          <Sparkles size={10} />
                          {isSelected ? thinkingLabel : ''}
                        </span>
                      )}

                      {isSelected && <Check size={14} className="model-opt-check" />}
                    </button>
                  );
                })}
                <div className="model-dropdown-footer">
                  <Sparkles size={9} /> = thinking mode toggle
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button className="clear-chat-btn btn btn-icon" onClick={handleClear} title="Clear chat">
              <Trash2 size={18} />
            </button>
          )}
          <button className="theme-toggle-btn btn btn-icon" onClick={onToggleTheme} title={isDarkMode ? "Light mode" : "Dark mode"}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-icon" onClick={() => window.open('/help.html', '_blank')} title="Help & Documentation">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {/* --- Messages ---------------------------------------------- */}
      <div
        className="chat-messages"
        ref={chatMessagesRef}
        onScroll={handleMessagesScroll}
      >
        {isPreparingChat && (
          <div className="chat-preparing-banner">
            <span className="chat-preparing-spinner" aria-hidden="true" />
            <span className="chat-preparing-text">Preparing your chat — reading link content…</span>
          </div>
        )}

        {messages.length === 0 && (
          <div className="chat-welcome">
            {isPlayground ? (
              <>
                <div className="chat-welcome-icon playground-icon">✦</div>
                <h3>Ask me anything</h3>
                <p>A free AI playground — pick a model and start a conversation.</p>
                <div className="suggested-questions">
                  {PLAYGROUND_SUGGESTIONS.map(q => (
                    <button key={q} className="suggested-chip" onClick={() => handleSuggestedQuestion(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="chat-welcome-icon">?</div>
                <h3>Ask about {category.name}</h3>
                <p>I can answer questions about the resources in this category, or anything else you need.</p>
                <div className="suggested-questions">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} className="suggested-chip" onClick={() => handleSuggestedQuestion(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === "assistant" ? (
                <div className="assistant-message-wrapper">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.metadata?.modelUsed && (
                    <div className="message-meta">
                      <span className="meta-model">{msg.metadata.modelUsed.replace('openrouter:', '').split('/').pop()}</span>
                      {msg.metadata.intent && <span className="meta-intent">{msg.metadata.intent}</span>}
                    </div>
                  )}
                  <button className="message-action-btn copy-btn" onClick={() => handleCopy(msg.content, idx)} title="Copy">
                    {copiedIndex === idx ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              ) : editingIndex === idx ? (
                <div className="edit-message-container">
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    className="edit-message-input"
                    autoFocus
                  />
                  <div className="edit-message-actions">
                    <button className="edit-action-btn save-btn" onClick={() => handleSaveEdit(idx)}><Check size={16} /></button>
                    <button className="edit-action-btn cancel-btn" onClick={() => { setEditingIndex(null); setEditingText(""); }}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="user-message-wrapper">
                  {/* Image attachments in user message */}
                  {msg.attachments?.filter(a => a.type === "image").map((a, ai) => (
                    <img key={ai} src={a.preview || a.data} alt={a.name} className="message-attachment-img" />
                  ))}
                  {/* Text file badges */}
                  {msg.attachments?.filter(a => a.type === "text").map((a, ai) => (
                    <div key={ai} className="message-attachment-badge">?? {a.name}</div>
                  ))}
                  <p>{msg.content}</p>
                  <button className="message-action-btn edit-btn" onClick={() => { setEditingIndex(idx); setEditingText(msg.content); }} title="Edit">
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* -- Live streaming message -- */}
        {isStreaming && (
          <div className="message assistant streaming-message">
            <div className="message-content">
              <div className="assistant-message-wrapper">

                {/* Thinking bubble — shown while model is in reasoning phase */}
                {thinkingContent && !streamingContent && (
                  <div className="thinking-bubble">
                    <div className="thinking-bubble-header">
                      <div className="thinking-orbs mini"><span/><span/><span/></div>
                      <span>Thinking…</span>
                    </div>
                    <div className="thinking-bubble-body">
                      {thinkingContent.slice(-800)}
                    </div>
                  </div>
                )}

                <div className="markdown-content">
                {streamingContent
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>{streamingContent}</ReactMarkdown>
                    : !thinkingContent && (
                      <div className="ai-thinking-indicator">
                        <div className="thinking-orbs">
                          <span/><span/><span/>
                        </div>
                        <div className="thinking-text">
                          <span className="thinking-label">
                            {thinkingMode === 'on' || (thinkingMode === 'auto' && currentModelInfo.supportsThinking)
                              ? 'Thinking…'
                              : 'Generating…'}
                          </span>
                          <span className="thinking-model">{currentModelInfo.label}</span>
                        </div>
                      </div>
                    )
                  }
                </div>
                {streamingContent && <span className="streaming-cursor">▋</span>}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom FAB — shown when streaming and user has scrolled up */}
      {isStreaming && isUserScrolledUp && (
        <button
          className="scroll-to-bottom-btn"
          onClick={() => scrollToBottom(true)}
          title="Jump to latest response"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* --- Input area -------------------------------------------- */}
      <div className="chat-input-container">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="attachment-preview-area">
            {attachments.map((a, i) => (
              <div key={i} className="attachment-chip">
                {a.type === "image"
                  ? <img src={a.preview} alt={a.name} className="attachment-thumb" />
                  : <Image size={16} className="attachment-file-icon" />
                }
                <span className="attachment-name">{a.name}</span>
                <button className="attachment-remove" onClick={() => removeAttachment(i)} title="Remove">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachError && <div className="attach-error">{attachError}</div>}

        {rateLimitMsg && (
          <div className="rate-limit-banner">
            <span>⏳ {rateLimitMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="chat-input-form">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.py,.html,.css,.xml"
            multiple
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <button
            type="button"
            className="attach-btn"
            title="Attach file or image"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            rows={1}
            className="chat-input"
            disabled={isLoading}
          />

          {isStreaming ? (
            <button type="button" className="stop-btn" onClick={handleStop} title="Stop generation">
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim() || isLoading} className="send-btn" title="Send">
              <Send size={18} />
            </button>
          )}
        </form>
        <p className="ai-disclaimer">AI can make mistakes. Please double-check important responses.</p>
      </div>
    </div>
  );
}

export default ChatPage;
