/**
 * AI Tutor Service
 * Priority 1: NVIDIA NIM � smart model routing per question type
 * Priority 2: OpenRouter � free fallback
 */

const NVIDIA_ENDPOINT = '/api/nvidia';
const OPENROUTER_ENDPOINT = '/api/chat';

// -----------------------------------------------------------------
// Model Registry  (id ? NVIDIA API config)
// -----------------------------------------------------------------
const NVIDIA_REGISTRY = {
  'kimi-k2.5': {
    model: 'moonshotai/kimi-k2.5',
    maxTokens: 16384, topP: 1.00, temperature: 1.0,
    thinkingKwargs: { thinking: true },
    timeout: 180000  // 3 min — thinking needs time
  },
  'glm5': {
    model: 'z-ai/glm5',
    maxTokens: 16384, topP: 1.00, temperature: 1.0,
    thinkingKwargs: { enable_thinking: true, clear_thinking: false },
    timeout: 160000  // 2.5 min
  },
  'step-flash': {
    model: 'stepfun-ai/step-3.5-flash',
    maxTokens: 16384, topP: 0.90, temperature: 0.3,
    timeout: 25000
  },
  'deepseek-v3.2': {
    model: 'deepseek-ai/deepseek-v3.2',
    maxTokens: 8192, topP: 0.95, temperature: 1.0,
    thinkingKwargs: { thinking: true },
    timeout: 180000  // 3 min — thinking needs time
  },
  'devstral': {
    model: 'mistralai/devstral-2-123b-instruct-2512',
    maxTokens: 8192, topP: 0.95, temperature: 0.15,
    timeout: 60000
  },
  'mistral-large': {
    model: 'mistralai/mistral-large-3-675b-instruct-2512',
    maxTokens: 4096, topP: 1.00, temperature: 0.7,
    timeout: 50000
  },
  'qwen3.5': {
    model: 'qwen/qwen3.5-397b-a17b',
    maxTokens: 16384, topP: 0.95, topK: 20, temperature: 0.6,
    thinkingKwargs: { enable_thinking: true },
    timeout: 160000  // 2.5 min
  }
};

// Fallback order per question intent
const INTENT_ROUTING = {
  coding:    ['devstral',       'deepseek-v3.2', 'qwen3.5'],
  reasoning: ['kimi-k2.5',     'deepseek-v3.2', 'qwen3.5'],
  creative:  ['mistral-large',  'qwen3.5',       'glm5'],
  factual:   ['step-flash',     'qwen3.5',       'mistral-large'],
  analysis:  ['deepseek-v3.2',  'kimi-k2.5',     'qwen3.5'],
  general:   ['qwen3.5',        'mistral-large',  'step-flash'],
};

// Public model list for the UI model selector
export const AVAILABLE_MODELS = [
  { id: 'auto',          label: 'Auto',           description: 'Smart routing — best model per question', abbr: '✦',  color: '#3b82f6', supportsThinking: true  },
  { id: 'kimi-k2.5',    label: 'Kimi K2.5',      description: 'Deep reasoning & math',                   abbr: 'K2', color: '#8b5cf6', supportsThinking: true  },
  { id: 'step-flash',   label: 'Step Flash',      description: 'Fastest answers',                         abbr: '⚡', color: '#f59e0b', supportsThinking: false },
  { id: 'devstral',     label: 'Devstral',        description: 'Code & technical tasks',                  abbr: '{}', color: '#10b981', supportsThinking: false },
  { id: 'deepseek-v3.2',label: 'DeepSeek V3',     description: 'Deep research & analysis',                abbr: 'DS', color: '#06b6d4', supportsThinking: true  },
  { id: 'mistral-large',label: 'Mistral Large',   description: 'Creative writing & long-form',            abbr: 'ML', color: '#ec4899', supportsThinking: false },
  { id: 'qwen3.5',      label: 'Qwen 3.5',        description: 'Powerful all-rounder',                    abbr: 'Q3', color: '#f97316', supportsThinking: true  },
  { id: 'glm5',         label: 'GLM5',            description: 'General purpose',                         abbr: 'G5', color: '#64748b', supportsThinking: true  },
];

// -----------------------------------------------------------------
// Question classifier
// -----------------------------------------------------------------
export function classifyIntent(question) {
  const q = question.toLowerCase();

  if (/\b(code|function|bug|syntax|debug|algorithm|implement|class|method|api|error|exception|variable|loop|array|object|typescript|javascript|python|react|css|html|component|hook|async|await|promise|runtime|compile|git|docker|sql|database|query)\b/.test(q))
    return 'coding';

  if (/\b(analyze|evaluate|assess|review|critique|compare|contrast|deep dive|comprehensive|elaborate|pros and cons|trade.?off|implication|impact|advantages|disadvantages|versus|vs\.?)\b/.test(q))
    return 'analysis';

  if (/\b(prove|calculate|derive|math|equation|solve|probability|statistics|logic|theorem|formula|compute|integral|derivative|percent|ratio)\b/.test(q))
    return 'reasoning';

  if (/\b(write|create|story|poem|essay|design|brainstorm|generate|draft|compose|creative|imagine|fiction|narrative|blog|caption|tagline)\b/.test(q))
    return 'creative';

  if (/^(what is|who is|when did|where is|define|list|how many|which|what are|name the|tell me what)\b/.test(q))
    return 'factual';

  return 'general';
}

function shouldUseThinking(question, intent, modelKey, thinkingMode = 'auto') {
  const cfg = NVIDIA_REGISTRY[modelKey];
  if (!cfg?.thinkingKwargs) return false; // model doesn't support thinking at all

  if (thinkingMode === 'on')  return true;   // user forced thinking ON
  if (thinkingMode === 'off') return false;  // user forced thinking OFF

  // 'auto' — let AI decide based on question complexity
  const thinkingIntents = ['reasoning', 'analysis'];
  const explicitThinking = /\b(step by step|think carefully|explain why|reason through|analyze deeply|prove|derive|compare in detail|elaborate)\b/i;
  return thinkingIntents.includes(intent) || explicitThinking.test(question);
}

// -----------------------------------------------------------------
// SSE stream reader
// -----------------------------------------------------------------
async function readSSEStream(body, onChunk, onThinkingChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') return fullContent;
        try {
          const data = JSON.parse(payload);
          const delta = data.choices?.[0]?.delta ?? {};

          // Emit reasoning/thinking tokens separately so the UI can show progress
          // while the model is in its internal reasoning phase
          const thinkToken = delta.reasoning_content ?? '';
          if (thinkToken && onThinkingChunk) onThinkingChunk(thinkToken);

          // Only accumulate & emit actual answer content
          const token = delta.content ?? '';
          if (token) {
            fullContent += token;
            onChunk?.(token);
          }
        } catch { /* skip malformed chunk */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return fullContent;
}

// -----------------------------------------------------------------
// NVIDIA caller
// -----------------------------------------------------------------
async function callNvidiaModel(messages, modelKey, useThinking, signal, onChunk, thinkingTimeout, onThinkingChunk) {
  const cfg = NVIDIA_REGISTRY[modelKey];
  if (!cfg) throw new Error(`Unknown model: ${modelKey}`);

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const chatTemplateKwargs = useThinking ? cfg.thinkingKwargs : undefined;
  // Use a longer timeout when thinking is active to avoid premature cancellation
  const effectiveTimeout = useThinking
    ? Math.max(cfg.timeout ?? 30000, thinkingTimeout ?? 180000)
    : (cfg.timeout ?? 30000);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort('timeout'), effectiveTimeout);
  const signals = signal ? [signal, timeoutController.signal] : [timeoutController.signal];
  const combinedSignal = AbortSignal.any(signals);

  let response;

  if (isLocalDev) {
    const payload = {
      model: cfg.model,
      messages,
      temperature: cfg.temperature ?? 0.3,
      max_tokens: cfg.maxTokens,
      top_p: cfg.topP ?? 1.0,
      stream: true
    };
    if (cfg.topK !== undefined) payload.top_k = cfg.topK;
    if (chatTemplateKwargs) payload.chat_template_kwargs = chatTemplateKwargs;

    response = await fetch('/nvidia-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: combinedSignal
    });
  } else {
    response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: cfg.temperature ?? 0.3,
        maxTokens: cfg.maxTokens,
        topP: cfg.topP,
        topK: cfg.topK,
        chatTemplateKwargs,
        stream: true
      }),
      signal: combinedSignal
    });
  }

  if (!response.ok) {
    // Propagate rate-limit as a typed error so the UI can show a friendly message
    // and we don't pointlessly retry other models with the same blocked IP.
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const rlErr = new Error('RATE_LIMITED');
      rlErr.rateLimited = true;
      rlErr.retryAfter  = data.retryAfter || 60;
      throw rlErr;
    }
    const txt = await response.text().catch(() => response.statusText);
    throw new Error(`NVIDIA ${response.status}: ${txt}`);
  }

  let content;
  try {
    content = await readSSEStream(response.body, onChunk, onThinkingChunk);
  } finally {
    clearTimeout(timeoutId);
  }
  if (!content) throw new Error('Empty response');
  return content;
}

async function callNvidia(messages, question, intent, selectedModel, signal, onChunk, thinkingMode = 'auto', onThinkingChunk) {
  const isCustom = selectedModel && selectedModel !== 'auto';
  const priorityList = isCustom
    ? [selectedModel, ...(INTENT_ROUTING[intent] ?? INTENT_ROUTING.general).filter(m => m !== selectedModel)]
    : (INTENT_ROUTING[intent] ?? INTENT_ROUTING.general);

  let lastError;
  for (const modelKey of priorityList) {
    const useThinking = shouldUseThinking(question, intent, modelKey, thinkingMode);
    try {
      console.log(`[AI Tutor] NVIDIA ${modelKey}${useThinking ? ' [thinking]' : ''} [mode:${thinkingMode}]`);
      const content = await callNvidiaModel(messages, modelKey, useThinking, signal, onChunk, undefined, onThinkingChunk);
      console.log(`[AI Tutor] ✓ ${modelKey}`);
      return { content, modelUsed: modelKey, intent, usedThinking: useThinking };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err.rateLimited) throw err; // same IP → all models blocked — stop retrying
      lastError = err;
      console.warn(`[AI Tutor] ✗ ${modelKey}: ${err.message}`);
    }
  }

  const err = new Error(`All NVIDIA models failed. Last: ${lastError?.message}`);
  err.name = 'NVIDIAFailedError';
  throw err;
}

// -----------------------------------------------------------------
// OpenRouter fallback  (streaming)
// -----------------------------------------------------------------
const OPENROUTER_MODELS = [
  'tngtech/deepseek-r1t2-chimera:free',
  'nex-agi/deepseek-v3.1-nex-n1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'google/gemma-3-27b-it:free'
];

async function callOpenRouter(messages, signal, onChunk) {
  const fallbackSignal = signal ?? AbortSignal.timeout(30000);
  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`[AI Tutor] OpenRouter ${model}`);
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.3, maxTokens: 2000, stream: true }),
        signal: fallbackSignal
      });
      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          const rlErr = new Error('RATE_LIMITED');
          rlErr.rateLimited = true;
          rlErr.retryAfter  = data.retryAfter || 60;
          throw rlErr;
        }
        const e = await response.json().catch(() => ({}));
        throw new Error(e?.error?.message || response.statusText);
      }
      const content = await readSSEStream(response.body, onChunk);
      if (!content) throw new Error('Empty response');
      console.log(`[AI Tutor] ? OpenRouter ${model}`);
      return { content, modelUsed: `openrouter:${model}`, intent: 'general' };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[AI Tutor] ? OpenRouter ${model}: ${err.message}`);
    }
  }
  throw new Error('All OpenRouter fallback models failed');
}

// -----------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------
async function callAI(messages, question, intent, selectedModel, signal, onChunk, thinkingMode = 'auto', onThinkingChunk) {
  try {
    return await callNvidia(messages, question, intent, selectedModel, signal, onChunk, thinkingMode, onThinkingChunk);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err.rateLimited) throw err; // propagate — same IP blocked on OpenRouter too
    console.warn('[AI Tutor] NVIDIA exhausted, falling back to OpenRouter...');
    return await callOpenRouter(messages, signal, onChunk);
  }
}

// -----------------------------------------------------------------
// Build user message content (supports image + text file attachments)
// -----------------------------------------------------------------
function buildUserContent(text, attachments = []) {
  if (!attachments.length) return text;

  const content = [{ type: 'text', text }];
  for (const file of attachments) {
    if (file.type === 'image') {
      content.push({ type: 'image_url', image_url: { url: file.data } });
    } else if (file.type === 'text') {
      content[0].text += `\n\n[Attached: ${file.name}]\n\`\`\`\n${file.data}\n\`\`\``;
    }
  }
  return content.length === 1 ? content[0].text : content;
}

// -----------------------------------------------------------------
// Public API
// -----------------------------------------------------------------
export async function askTutor(question, resourceContents, {
  onChunk = null,
  selectedModel = 'auto',
  attachments = [],
  signal = null,
  conversationHistory = [],
  playground = false,
  thinkingMode = 'auto',   // 'auto' | 'on' | 'off'
  onThinkingChunk = null   // called with reasoning_content tokens while model thinks
} = {}) {
  if (!question?.trim()) {
    return { answer: 'Please ask a valid question.', basedOnResources: false };
  }

  // ── Playground (free chat) mode ──────────────────────────────────
  if (playground) {
    const intent = classifyIntent(question);
    console.log(`[AI Playground] Intent: ${intent} | Model: ${selectedModel}`);

    const systemPrompt = `You are a helpful, knowledgeable, and friendly AI assistant — like ChatGPT. 
Answer any question the user asks clearly and accurately. 
For technical questions use code blocks with syntax highlighting. 
Use ## headings, - bullet points, and **bold** for key terms where helpful. 
Be direct and avoid unnecessary preamble. Never refuse reasonable questions.`;

    const userContent = attachments.length > 0
      ? buildUserContent(question, attachments)
      : question;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent }
    ];

    try {
      const result = await callAI(messages, question, intent, selectedModel, signal, onChunk, thinkingMode, onThinkingChunk);
      return {
        answer: result.content,
        basedOnResources: false,
        modelUsed: result.modelUsed,
        intent: result.intent,
        usedThinking: result.usedThinking
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err.rateLimited) throw err;
      console.error('[AI Playground] Fatal error:', err);
      return { answer: 'Something went wrong. Please try again.', basedOnResources: false };
    }
  }
  // ── End playground mode ──────────────────────────────────────────

  const hasResources = Array.isArray(resourceContents) && resourceContents.length > 0;
  const hasAttachments = attachments.length > 0;

  if (!hasResources && !hasAttachments) {
    return {
      answer: 'This category has no resources yet. Please add links so I can learn from them.',
      basedOnResources: false
    };
  }

  const intent = classifyIntent(question);
  console.log(`[AI Tutor] Intent: ${intent} | Model: ${selectedModel}`);

  const combinedContent = hasResources
    ? resourceContents
        .filter(r => r.success && r.extractedText)
        .map((r, i) => `=== RESOURCE ${i + 1}: ${r.url} ===\n${r.extractedText.slice(0, 15000)}`)
        .join('\n\n')
        .slice(0, 60000)
    : '';

  const hasContent = combinedContent.trim().length > 0;

  const systemPrompt = hasContent
    ? `You are a knowledgeable AI tutor with access to the student's study materials. Answer concisely and accurately. When relevant, cite which resource you used. Use ## headings, - bullet points, **bold** for key terms. Be direct — no unnecessary preamble.`
    : `You are a knowledgeable AI tutor. Answer clearly and concisely using your knowledge. Use ## headings, - bullet points, **bold** for key terms.`;

  const userPrompt = hasContent
    ? `STUDY MATERIALS:\n${combinedContent}\n\nQUESTION: ${question}\n\nAnswer using the materials when relevant, your knowledge otherwise.`
    : question;

  const userContent = buildUserContent(userPrompt, attachments);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent }
  ];

  try {
    const result = await callAI(messages, question, intent, selectedModel, signal, onChunk, thinkingMode, onThinkingChunk);
    return {
      answer: result.content,
      basedOnResources: hasContent,
      modelUsed: result.modelUsed,
      intent: result.intent,
      usedThinking: result.usedThinking
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.error('[AI Tutor] Fatal error:', err);
    throw new Error(`Failed to get answer: ${err.message}`);
  }
}

export function summarizeCategoryContent(resourceContents) {
  if (!resourceContents?.length) return 'No resources added yet.';
  const successful = resourceContents.filter(c => c.success && c.extractedText);
  if (!successful.length) return 'Resources are being processed...';
  return `${successful.length} resource${successful.length > 1 ? 's' : ''} ready � ask me anything!`;
}
