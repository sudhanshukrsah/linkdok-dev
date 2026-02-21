import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";

// ─── Design tokens ───────────────────────────────────────────────────────────
const navy   = "#0f172a";
const blue1  = "#1e3a8a";
const blue2  = "#1d4ed8";
const blue3  = "#3b82f6";
const body   = "#1e293b";
const muted  = "#64748b";
const light  = "#94a3b8";
const border = "#e2e8f0";
const codeBg = "#0f172a";
const codeT  = "#e2e8f0";
const tblHdr = "#f0f7ff";
const tblBrd = "#cbd5e1";
const qBg    = "#f0f9ff";
const qBrd   = "#3b82f6";
const qText  = "#1e3a8a";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: body,
  },

  // ── Top bar (fixed — appears on every page) ───────────────────
  topBar: {
    height: 4,
    backgroundColor: blue2,
    width: "100%",
  },

  // ── First-page brand section ──────────────────────────────────
  brandSection: {
    paddingHorizontal: 56,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoImg: {
    width: 110,
    height: 28,
    objectFit: "contain",
  },
  brandDate: {
    fontSize: 9,
    color: light,
  },

  // ── Document title area ───────────────────────────────────────
  titleSection: {
    paddingHorizontal: 56,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: border,
    marginBottom: 30,
  },
  docCategory: {
    fontSize: 9,
    color: blue3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: navy,
    lineHeight: 1.3,
  },

  // ── Content area ─────────────────────────────────────────────
  content: {
    paddingHorizontal: 56,
  },

  // ── Markdown elements ─────────────────────────────────────────
  h1: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    color: navy,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: blue2,
    lineHeight: 1.3,
  },
  h2: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: blue1,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: blue2,
    marginTop: 12,
    marginBottom: 6,
    lineHeight: 1.3,
  },
  para: {
    fontSize: 11,
    color: body,
    lineHeight: 1.8,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 5,
    paddingLeft: 4,
  },
  bulletMark: {
    width: 18,
    fontSize: 13,
    color: blue3,
    marginTop: -1,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: body,
    lineHeight: 1.75,
  },
  numRow: {
    flexDirection: "row",
    marginBottom: 5,
    paddingLeft: 4,
  },
  numMark: {
    width: 22,
    fontSize: 11,
    color: blue3,
    fontFamily: "Helvetica-Bold",
  },
  numText: {
    flex: 1,
    fontSize: 11,
    color: body,
    lineHeight: 1.75,
  },

  // Blockquote / callout
  bqWrap: {
    backgroundColor: qBg,
    borderLeftWidth: 3.5,
    borderLeftColor: qBrd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
    borderRadius: 2,
  },
  bqText: {
    fontSize: 11,
    color: qText,
    lineHeight: 1.75,
    fontFamily: "Helvetica-Oblique",
  },

  hr: {
    borderBottomWidth: 1,
    borderBottomColor: border,
    marginVertical: 14,
  },

  // Code blocks
  codeWrap: {
    marginVertical: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  codeBar: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeDots: {
    flexDirection: "row",
    gap: 5,
  },
  codeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  codeLang: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#60a5fa",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  codeBody: {
    backgroundColor: codeBg,
    padding: 16,
  },
  codeText: {
    fontSize: 8.5,
    color: codeT,
    fontFamily: "Courier",
    lineHeight: 1.7,
  },

  // Tables
  tableWrap: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: tblBrd,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: tblBrd,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: tblBrd,
    backgroundColor: "#f8fafc",
  },
  tableHdrCell: {
    flex: 1,
    padding: 8,
    backgroundColor: tblHdr,
  },
  tableCell: {
    flex: 1,
    padding: 8,
  },
  tableHdrText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: navy,
  },
  tableCellText: {
    fontSize: 9.5,
    color: body,
    lineHeight: 1.5,
  },

  // ── Footer (fixed) ────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 56,
  },
  footerBrand: {
    fontSize: 8,
    color: light,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
  footerPage: {
    fontSize: 8,
    color: light,
  },
});

// ─── Markdown parser (supports tables) ───────────────────────────────────────
function parseMarkdown(raw) {
  if (!raw) return [];
  const blocks  = [];
  const segs    = raw.split(/(```[\s\S]*?```)/g);

  for (const seg of segs) {
    // Fenced code block
    if (seg.startsWith("```")) {
      const lines = seg.slice(3).split("\n");
      const lang  = (lines[0] || "").trim();
      const code  = lines.slice(1).join("\n").replace(/```\s*$/, "").trimEnd();
      blocks.push({ type: "code", lang, code });
      continue;
    }

    // Split into lines, detect table runs
    const lines = seg.split("\n");
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const t   = raw.trim();
      if (!t) { i++; continue; }

      // GFM table detection: look ahead for separator row
      if (t.startsWith("|") && i + 1 < lines.length && /^\|[-:| ]+\|/.test(lines[i + 1]?.trim())) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const [headerLine, , ...dataLines] = tableLines;
        const parseRow = (l) => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        const headers  = parseRow(headerLine);
        const rows     = dataLines.map(parseRow);
        blocks.push({ type: "table", headers, rows });
        continue;
      }

      if (/^---+$/.test(t))          { blocks.push({ type: "hr" }); i++; continue; }
      if (t.startsWith("#### "))     { blocks.push({ type: "h3", text: t.slice(5) }); i++; continue; }
      if (t.startsWith("### "))      { blocks.push({ type: "h3", text: t.slice(4) }); i++; continue; }
      if (t.startsWith("## "))       { blocks.push({ type: "h2", text: t.slice(3) }); i++; continue; }
      if (t.startsWith("# "))        { blocks.push({ type: "h1", text: t.slice(2) }); i++; continue; }
      if (/^>\s/.test(t))            { blocks.push({ type: "bq",  text: t.replace(/^>\s*/, "") }); i++; continue; }
      if (/^[-*•]\s/.test(t))        { blocks.push({ type: "li",  text: t.replace(/^[-*•]\s/, "") }); i++; continue; }
      if (/^\d+\.\s/.test(t))        { blocks.push({ type: "ol",  text: t.replace(/^\d+\.\s/, ""), num: t.match(/^(\d+)\./)[1] }); i++; continue; }

      blocks.push({ type: "p", text: t });
      i++;
    }
  }
  return blocks;
}

// Strip inline markdown for react-pdf plain text
function plain(t = "") {
  return t
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1");
}

// Detect document title (first h1 block)
function extractTitle(blocks) {
  const h1 = blocks.find(b => b.type === "h1");
  return h1 ? plain(h1.text) : null;
}

// Render markdown blocks
function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "h1": return <Text key={i} style={s.h1}>{plain(b.text)}</Text>;
      case "h2": return <Text key={i} style={s.h2}>{plain(b.text)}</Text>;
      case "h3": return <Text key={i} style={s.h3}>{plain(b.text)}</Text>;
      case "p":  return <Text key={i} style={s.para}>{plain(b.text)}</Text>;
      case "bq":
        return (
          <View key={i} style={s.bqWrap}>
            <Text style={s.bqText}>{plain(b.text)}</Text>
          </View>
        );
      case "li":
        return (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletMark}>›</Text>
            <Text style={s.bulletText}>{plain(b.text)}</Text>
          </View>
        );
      case "ol":
        return (
          <View key={i} style={s.numRow}>
            <Text style={s.numMark}>{b.num}.</Text>
            <Text style={s.numText}>{plain(b.text)}</Text>
          </View>
        );
      case "code":
        return (
          <View key={i} style={s.codeWrap}>
            <View style={s.codeBar}>
              <View style={s.codeDots}>
                <View style={[s.codeDot, { backgroundColor: "#ef4444" }]} />
                <View style={[s.codeDot, { backgroundColor: "#f59e0b" }]} />
                <View style={[s.codeDot, { backgroundColor: "#22c55e" }]} />
              </View>
              {b.lang ? <Text style={s.codeLang}>{b.lang}</Text> : null}
            </View>
            <View style={s.codeBody}>
              <Text style={s.codeText}>{b.code}</Text>
            </View>
          </View>
        );
      case "table":
        return (
          <View key={i} style={s.tableWrap}>
            {/* Header row */}
            <View style={s.tableRow}>
              {b.headers.map((h, ci) => (
                <View key={ci} style={s.tableHdrCell}>
                  <Text style={s.tableHdrText}>{plain(h)}</Text>
                </View>
              ))}
            </View>
            {/* Data rows */}
            {b.rows.map((row, ri) => {
              const isLast = ri === b.rows.length - 1;
              const rowStyle = isLast ? s.tableRowLast : (ri % 2 === 1 ? s.tableRowAlt : s.tableRow);
              return (
                <View key={ri} style={rowStyle}>
                  {row.map((cell, ci) => (
                    <View key={ci} style={s.tableCell}>
                      <Text style={s.tableCellText}>{plain(cell)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        );
      case "hr":
        return <View key={i} style={s.hr} />;
      default:
        return null;
    }
  });
}

// ─── PDF Document ─────────────────────────────────────────────────────────────
function ChatPDFDoc({ content, categoryName, isPlayground }) {
  const blocks  = parseMarkdown(content);
  const title   = extractTitle(blocks) || (isPlayground ? "AI Playground" : categoryName) || "Document";
  const catLabel = isPlayground ? "Playground" : (categoryName || "Chat");
  const date    = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Logo URL — use light mode logo
  const logoSrc = typeof window !== "undefined"
    ? `${window.location.origin}/LinkDok-logo-day.svg`
    : "/LinkDok-logo-day.svg";

  return (
    <Document title={title} author="LinkDok AI" subject="AI Document Export">
      <Page size="A4" style={s.page} wrap>
        {/* Thin blue accent bar — fixed top of every page */}
        <View style={s.topBar} fixed />

        {/* Brand header — first page */}
        <View style={s.brandSection}>
          <View style={s.brandLeft}>
            <Image src={logoSrc} style={s.logoImg} />
          </View>
          <Text style={s.brandDate}>{date}</Text>
        </View>

        {/* Document title section */}
        <View style={s.titleSection}>
          <Text style={s.docCategory}>{catLabel} · AI Document</Text>
          <Text style={s.docTitle}>{title}</Text>
        </View>

        {/* Content */}
        <View style={s.content}>
          <Blocks blocks={blocks} />
        </View>

        {/* Fixed footer on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>linkdok.in</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ─── AI content reformatter ─────────────────────────────────────────────────
// Accepts the full chat history + user's exact PDF request.
// AI reads the user's intent and picks what to include, then formats it.
export async function reformatContentForPDF(allMessages, userRequest) {
  // Build numbered context: only assistant messages, indexed
  const aiResponses = allMessages.filter(m => m.role === "assistant");

  // Build conversation context pairs for better understanding
  const conversationContext = [];
  let respIndex = 1;
  for (let i = 0; i < allMessages.length; i++) {
    const m = allMessages[i];
    if (m.role === "user") {
      const next = allMessages[i + 1];
      if (next?.role === "assistant") {
        conversationContext.push(
          `--- Exchange ${respIndex} ---\nUser asked: ${m.content.slice(0, 200)}\nAI Response #${respIndex}:\n${next.content}`
        );
        respIndex++;
      }
    }
  }

  const system = `You are an expert document formatter and technical writer.
You will be given a chat conversation and the user's specific PDF export request.
Your job:
1. READ the user's PDF request carefully to understand WHAT they want in the PDF
2. SELECT only the relevant AI responses based on their request
3. MERGE and FORMAT the selected content into a single beautiful, publication-quality document

FORMATTING RULES:
- Start with exactly ONE # Title that clearly captures the document topic
- Use ## for main sections, ### for subsections
- Convert any comparative/structured data into proper GFM tables (| col | col |)
- Keep code examples in fenced blocks with language labels (\`\`\`python etc)
- Use numbered lists (1. 2. 3.) for steps/procedures
- Use bullet lists (- item) for features/options
- Add ONE > blockquote with the most important insight
- Write in clear, professional prose — expand terse notes into full sentences
- End with ## Summary or ## Key Takeaways
- Output ONLY the formatted Markdown — NO preamble, NO "Here is the document" commentary`;

  const user = `USER'S PDF REQUEST: "${userRequest}"

FULL CONVERSATION CONTEXT:
${conversationContext.join("\n\n")}

Based on the user's request above, select the relevant content and format it as a professional document.`;

  try {
    const res = await fetch("/api/nvidia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user   },
        ],
        model:       "stepfun-ai/step-3.5-flash",
        temperature: 0.25,
        maxTokens:   8192,
        stream:      false,
      }),
    });
    const data = await res.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
  } catch (e) {
    console.error("PDF reformat failed:", e);
  }
  // Fallback — use last AI response as-is
  const last = aiResponses[aiResponses.length - 1];
  return last ? last.content : "";
}

// ─── Public: generate & download PDF ─────────────────────────────────────────
export async function exportChatToPDF({ messages, categoryName, isPlayground, scope = "last", formattedContent }) {
  // Use pre-formatted content if provided, else get from messages
  let content = formattedContent;
  if (!content) {
    const allResponses = messages.filter(m => m.role === "assistant");
    if (!allResponses.length) return;
    const toExport = scope === "all" ? allResponses : [allResponses[allResponses.length - 1]];
    content = toExport.map(r => r.content).join("\n\n---\n\n");
  }

  const blob = await pdf(
    <ChatPDFDoc
      content={content}
      categoryName={categoryName}
      isPlayground={isPlayground}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  const safe = (categoryName || "Document").replace(/\s+/g, "-").slice(0, 40);
  a.download = `LinkDok-${safe}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Public: detect PDF intent ────────────────────────────────────────────────
export function detectPDFIntent(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();

  const isPDF =
    t.includes("pdf") ||
    t.includes("pdf banao") ||
    t.includes("pdf bana") ||
    t.includes("pdf do") ||
    t.includes("pdf chahiye") ||
    t.includes("pdf nikalo") ||
    t.includes("save as pdf") ||
    t.includes("export as pdf") ||
    t.includes("download pdf") ||
    (t.includes("export") && (t.includes("document") || t.includes("doc") || t.includes("file"))) ||
    t.includes("document bana") ||
    t.includes("document banao");

  if (!isPDF) return null;

  const isAll =
    t.includes("all") || t.includes("pura") || t.includes("poora") ||
    t.includes("sara") || t.includes("saara") || t.includes("sab") ||
    t.includes("sabhi") || t.includes("full") || t.includes("complete") ||
    t.includes("puri chat") || t.includes("saari") || t.includes("everything");

  return { scope: isAll ? "all" : "last" };
}
