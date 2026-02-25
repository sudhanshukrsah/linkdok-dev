/**
 * Vercel Serverless Function — YouTube Transcript Extraction
 *
 * Strategy (in order):
 *  A. Caption tracks from ytInitialPlayerResponse (watch page HTML)
 *     — manual captions + auto-generated / ASR tracks
 *  B. YouTube InnerTube API (ANDROID client)
 *     — fetches richer player data, often unlocks captions missed by the page
 *     — also returns direct (no-cipher) audio stream URLs
 *  C. Supadata.ai free transcript API (no API key, no signup required)
 *     — completely free public API for caption-less videos
 *     — https://supadata.ai
 */
import { rateLimit, getIP, setCorsHeaders, isOriginAllowed } from './_rateLimit.js';

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`;

export default async function handler(req, res) {
  const origin = req.headers['origin'];
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (origin && !isOriginAllowed(origin)) return res.status(403).json({ error: 'Forbidden' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);
  const rl = rateLimit(ip, { limit: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter, rateLimited: true });
  }

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(200).json({ success: false, error: 'Could not parse YouTube video ID from URL' });
  }

  try {
    // ── Method A: captions from watch page ──────────────────────────────────
    const pageResult = await extractFromWatchPage(videoId);
    if (pageResult.success) return res.status(200).json(pageResult);
    console.log('[YouTube] Method A failed:', pageResult.error);

    // ── Method B: InnerTube API (richer caption data + direct audio URLs) ────
    const innertubeResult = await extractFromInnerTube(videoId);
    if (innertubeResult.success) return res.status(200).json(innertubeResult);
    console.log('[YouTube] Method B failed:', innertubeResult.error);

    // ── Method C: Supadata.ai (free, no API key needed) ──────────────────────
    const title = pageResult.title || innertubeResult.title || '';
    const supadata = await transcribeWithSupadata(videoId, title);
    if (supadata.success) return res.status(200).json(supadata);

    return res.status(200).json({
      success: false,
      videoId,
      title,
      error: `All transcript methods failed. Last: ${supadata.error}`,
    });

  } catch (err) {
    console.error('[YouTube API] Unhandled error:', err.message);
    return res.status(200).json({ success: false, error: `Unexpected error: ${err.message}`, videoId });
  }
}

// ═══════════════════════════════════════════════════════════════
// Method A — Watch page  (ytInitialPlayerResponse)
// ═══════════════════════════════════════════════════════════════
async function extractFromWatchPage(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`YouTube page HTTP ${res.status}`);

    const html           = await res.text();
    const playerResponse = extractPlayerResponse(html);
    if (!playerResponse) return { success: false, error: 'ytInitialPlayerResponse not found', audioUrl: null, title: '' };

    const title        = playerResponse?.videoDetails?.title || '';
    const durationSecs = parseInt(playerResponse?.videoDetails?.lengthSeconds || '0', 10);
    const audioUrl     = getLowestBitrateAudioUrl(playerResponse);
    const tracks       = getCaptionTracks(playerResponse);

    if (!tracks.length) return { success: false, error: 'No caption tracks in watch page', audioUrl, title };

    const preferred  = pickBestTrack(tracks);
    const transcript = await fetchAndParseCaption(preferred.baseUrl);
    if (!transcript)  return { success: false, error: 'Caption XML was empty', audioUrl, title };

    return buildSuccess({ videoId, title, durationSecs, transcript, track: preferred, method: 'caption-page' });
  } catch (e) {
    return { success: false, error: e.message, audioUrl: null, title: '' };
  }
}

// ═══════════════════════════════════════════════════════════════
// Method B — InnerTube API (ANDROID_EMBEDDED_PLAYER client)
// Provides richer caption data + direct (no cipher) audio URLs
// ═══════════════════════════════════════════════════════════════
async function extractFromInnerTube(videoId) {
  try {
    const res = await fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '55',
        'X-YouTube-Client-Version': '17.31.35',
        'User-Agent': 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID_EMBEDDED_PLAYER',
            clientVersion: '17.31.35',
            androidSdkVersion: 30,
            osName: 'Android',
            osVersion: '11',
            platform: 'MOBILE',
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`InnerTube HTTP ${res.status}`);

    const playerResponse = await res.json();
    const title        = playerResponse?.videoDetails?.title || '';
    const durationSecs = parseInt(playerResponse?.videoDetails?.lengthSeconds || '0', 10);
    const audioUrl     = getLowestBitrateAudioUrl(playerResponse);
    const tracks       = getCaptionTracks(playerResponse);

    if (!tracks.length) return { success: false, error: 'No caption tracks from InnerTube', audioUrl, title };

    const preferred  = pickBestTrack(tracks);
    const transcript = await fetchAndParseCaption(preferred.baseUrl);
    if (!transcript)  return { success: false, error: 'InnerTube caption XML empty', audioUrl, title };

    return buildSuccess({ videoId, title, durationSecs, transcript, track: preferred, method: 'caption-innertube' });
  } catch (e) {
    return { success: false, error: e.message, audioUrl: null, title: '' };
  }
}

// ═══════════════════════════════════════════════════════════════
// Method C — Supadata.ai (free public transcript API, no key needed)
// Docs: https://supadata.ai
// ═══════════════════════════════════════════════════════════════
async function transcribeWithSupadata(videoId, title) {
  try {
    console.log('[YouTube] Method C: Supadata.ai free transcript...');
    const supaUrl = `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&text=true`;
    const supaRes = await fetch(supaUrl, { signal: AbortSignal.timeout(20000) });
    if (!supaRes.ok) throw new Error(`Supadata HTTP ${supaRes.status}`);
    const data = await supaRes.json();
    const rawText = typeof data.content === 'string'
      ? data.content
      : Array.isArray(data.content)
        ? data.content.map(c => c.text || '').join(' ')
        : '';
    if (!rawText.trim()) throw new Error('Supadata returned empty transcript');

    // Group into paragraphs every ~80 words
    const words = rawText.split(/\s+/);
    const paragraphs = [];
    for (let i = 0; i < words.length; i += 80) {
      paragraphs.push(words.slice(i, i + 80).join(' '));
    }
    const transcript = paragraphs.join('\n\n');

    console.log(`[YouTube] ✓ Supadata: ${rawText.length} chars`);

    return {
      success:          true,
      videoId,
      title,
      transcript,
      transcriptLength: transcript.length,
      durationSecs:     0,
      language:         data.lang || 'en',
      isAutoGenerated:  false,
      method:           'supadata',
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════

function buildSuccess({ videoId, title, durationSecs, transcript, track, method }) {
  return {
    success:          true,
    videoId,
    title,
    transcript,
    transcriptLength: transcript.length,
    durationSecs,
    language:         track.languageCode || 'en',
    isAutoGenerated:  track.kind === 'asr',
    method,
  };
}

function getCaptionTracks(playerResponse) {
  return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

/** Get lowest-bitrate audio-only stream with a direct URL (no signatureCipher needed) */
function getLowestBitrateAudioUrl(playerResponse) {
  const formats = playerResponse?.streamingData?.adaptiveFormats || [];
  const audio   = formats.filter(f => f.mimeType?.startsWith('audio/') && f.url);
  if (!audio.length) return null;
  audio.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
  return audio[0].url;
}

function pickBestTrack(tracks) {
  const isEn   = t => (t.languageCode || '').toLowerCase().startsWith('en');
  const isAuto = t => t.kind === 'asr';
  return (
    tracks.find(t => !isAuto(t) && isEn(t)) ||
    tracks.find(t => !isAuto(t))             ||
    tracks.find(t =>  isAuto(t) && isEn(t)) ||
    tracks[0]
  );
}

async function fetchAndParseCaption(captionUrl) {
  const res = await fetch(captionUrl, {
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Caption fetch HTTP ${res.status}`);
  return parseTranscriptXML(await res.text());
}

function extractPlayerResponse(html) {
  try {
    const marker   = 'ytInitialPlayerResponse';
    const idx      = html.indexOf(marker);
    if (idx === -1) return null;
    const braceIdx = html.indexOf('{', idx);
    if (braceIdx === -1) return null;
    const json     = extractBalancedJSON(html, braceIdx);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
}

function extractBalancedJSON(str, start) {
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escape)          { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"')      { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{')      depth++;
    else if (ch === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
  }
  return null;
}

function parseTranscriptXML(xml) {
  const entries = [];
  const re      = /<text[^>]*start="[\d.]+"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g,  '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_,h) => String.fromCharCode(parseInt(h,16)))
      .replace(/&#(\d+);/g, (_,d) => String.fromCharCode(parseInt(d,10)))
      .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) entries.push(text);
  }
  const paragraphs = [];
  for (let i = 0; i < entries.length; i += 10)
    paragraphs.push(entries.slice(i, i + 10).join(' '));
  return paragraphs.join('\n\n') || null;
}

function extractVideoId(url) {
  try {
    const u    = new URL(url);
    const host = u.hostname.replace('www.', '').replace('m.', '');
    if (host === 'youtu.be')    return u.pathname.slice(1).split('?')[0];
    if (host === 'youtube.com') {
      if (u.pathname.startsWith('/watch'))   return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1]?.split('?')[0];
      if (u.pathname.startsWith('/embed/'))  return u.pathname.split('/embed/')[1]?.split('?')[0];
      if (u.pathname.startsWith('/live/'))   return u.pathname.split('/live/')[1]?.split('?')[0];
    }
  } catch {}
  return null;
}
