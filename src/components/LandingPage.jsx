import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, Brain, FileText, Folder, FolderPlus, HelpCircle, Layers3, Link2, MessageCircle, Plus, Search, Send, Sparkles, Sun } from 'lucide-react';
import Lenis from 'lenis';
import { AVAILABLE_MODELS } from '../utils/aiTutor';
import 'lenis/dist/lenis.css';
import './LandingPage.css';

const modelInfo = AVAILABLE_MODELS.filter((model) => model.id !== 'auto');
const chatTurns = [
  { question: 'Summarise this for me', answer: 'Sure — this article looks at how small habits shape attention, and offers a few ways to protect your focus.' },
  { question: 'What are the key points?', answer: 'Three ideas stand out: choose one priority, make distractions harder to reach, and leave room to reflect.' },
  { question: 'Any important dates?', answer: 'It mentions Q3 2024 and January 2025. Want me to find the surrounding context?' },
];

function AnimatedProductPreview() {
  const [messages, setMessages] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? chatTurns.flatMap((turn, index) => [
      { id: index * 2 + 1, type: 'user', text: turn.question },
      { id: index * 2 + 2, type: 'ai', text: turn.answer, typing: false },
    ])
    : []);
  const chatRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let alive = true;
    let messageId = 0;
    const timers = new Set();
    const schedule = (callback, delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (alive) callback();
      }, delay);
      timers.add(timer);
    };

    const runTurn = (turnIndex) => {
      if (turnIndex >= chatTurns.length) {
        schedule(() => {
          setMessages([]);
          schedule(() => runTurn(0), 650);
        }, 2400);
        return;
      }

      const turn = chatTurns[turnIndex];
      setMessages((current) => [...current, { id: ++messageId, type: 'user', text: turn.question }]);
      schedule(() => {
        setMessages((current) => [...current, { id: ++messageId, type: 'dots' }]);
        schedule(() => {
          setMessages((current) => [...current.slice(0, -1), { id: ++messageId, type: 'ai', text: '', typing: true }]);
          const words = turn.answer.split(' ');
          const typeWord = (wordIndex) => {
            if (wordIndex >= words.length) {
              setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, typing: false } : message));
              schedule(() => runTurn(turnIndex + 1), 1050);
              return;
            }
            const text = words.slice(0, wordIndex + 1).join(' ');
            setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, text } : message));
            const word = words[wordIndex];
            const pause = /[.!?]$/.test(word) ? 450 : /,$/.test(word) ? 300 : 155;
            schedule(() => typeWord(wordIndex + 1), pause);
          };
          typeWord(0);
        }, 900);
      }, 560);
    };

    schedule(() => runTurn(0), 500);
    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="ld-animated-card" role="img" aria-label="Animated LinkDok preview showing link organization and AI chat">
      <div className="ld-card-topbar">
        <div className="ld-card-brand"><span><Link2 size={13} /></span> LinkDok</div>
        <div className="ld-card-controls"><span><Sun size={13} /></span><span><HelpCircle size={13} /></span><span className="ld-card-plus"><Plus size={17} /></span></div>
      </div>
      <div className="ld-card-add-area">
        <div className="ld-card-menu">
          <div><FolderPlus size={13} /><span>New category</span></div>
          <div className="ld-card-add-link"><Link2 size={13} /><span>Add Link</span></div>
        </div>
      </div>
      <div className="ld-card-pointer" aria-hidden="true"><svg width="15" height="19" viewBox="0 0 13 16" fill="none"><path d="M1 1l4 12 2.5-4.5 4.5-2.5L1 1z" fill="white" stroke="rgba(0,0,0,.65)" strokeWidth=".8" strokeLinejoin="round" /></svg></div>
      <div className="ld-card-chat" ref={chatRef}>
        {messages.map((message) => (
          <div key={message.id} className={`ld-card-message ${message.type === 'user' ? 'is-user' : 'is-assistant'}`}>
            {message.type !== 'user' && <span className="ld-card-ai-dot" />}
            {message.type === 'dots' ? <div className="ld-card-typing"><i /><i /><i /></div> : (
              <div className={`ld-card-bubble ${message.type === 'user' ? 'is-user' : 'is-assistant'}`}>
                {message.text}{message.typing && <i className="ld-card-caret" />}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="ld-card-input"><span className="ld-card-input-plus">+</span><span className="ld-card-placeholder">What are the key points?</span><span className="ld-card-send"><Send size={12} /></span></div>
    </div>
  );
}

function LandingPage({ onGetStarted, isDarkMode }) {
  const pageRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
    return () => {
      lenis.destroy();
      window.scrollTo(0, 0);
    };
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('ld-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    root.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`ld-page ${isDarkMode ? 'ld-dark' : 'ld-light'}`} ref={pageRef}>
      <header className="ld-nav">
        <a className="ld-brand" href="#top" aria-label="LinkDok home">
          <img src={isDarkMode ? '/LinkDok-logo.svg' : '/LinkDok-logo-day.svg'} alt="LinkDok" />
        </a>
        <nav className="ld-nav-links" aria-label="Main navigation">
          <a href="#workspace">Your knowledge base</a>
          <a href="#models">AI models</a>
          <a href="#research">Research flow</a>
        </nav>
        <button className="ld-nav-cta" onClick={onGetStarted}>Open LinkDok <ArrowUpRight size={15} /></button>
      </header>

      <main id="top">
        <section className="ld-hero">
          <div className="ld-hero-copy ld-hero-copy-centered">
            <h1>Save it. <em>Ask it.</em></h1>
            <p className="ld-hero-description">A knowledge base for everything you want to explore.</p>
            <div className="ld-hero-actions">
              <button className="ld-button-primary" onClick={onGetStarted}>Get started <ArrowRight size={17} /></button>
            </div>
          </div>

          <div className="ld-scene" aria-label="Preview of research grounded in a LinkDok knowledge base">
            <AnimatedProductPreview />
          </div>
        </section>

        <section className="ld-marquee" aria-label="AI models available in LinkDok"><div className="ld-marquee-track">{[...modelInfo, ...modelInfo].map((model, index) => <span className="ld-marquee-model" key={`${model.id}-${index}`}>{model.icon && <img className="ld-model-logo" src={model.icon} alt="" />}{model.label}</span>)}</div></section>

        <section className="ld-workspace" id="workspace">
          <div className="ld-section-intro" data-reveal><span className="ld-section-tag">A KNOWLEDGE BASE THAT STARTS WITH YOU</span><h2>Don’t just save a link.<br />Give it <em>somewhere to go.</em></h2><p>Build a living library from the articles, videos, research and ideas you already collect. Then ask better questions of all of it.</p></div>
          <div className="ld-feature-grid">
            <article className="ld-feature-card" data-reveal><div className="ld-feature-top"><span>01 / COLLECT</span><span className="ld-feature-icon"><Link2 size={19} /></span></div><h3>Keep the things worth keeping.</h3><p>Save links into collections that make sense to you. Bring your reading, watching and research into one place.</p><div className="ld-feature-sample"><span className="ld-sample-link"><FileText size={12} /> article.pdf</span><span className="ld-sample-link"><Bookmark size={12} /> video notes</span><span className="ld-sample-count">+ more ideas</span></div></article>
            <article className="ld-feature-card" data-reveal><div className="ld-feature-top"><span>02 / CONNECT</span><span className="ld-feature-icon"><Brain size={19} /></span></div><h3>Chat with your own knowledge.</h3><p>Ask a question about a collection. LinkDok can draw on saved sources, surface useful passages, and help you connect the dots.</p><div className="ld-feature-sample ld-sample-query"><MessageCircle size={13} /><span>What do my sources say about…</span><ArrowRight size={13} /></div></article>
            <article className="ld-feature-card" data-reveal><div className="ld-feature-top"><span>03 / INVESTIGATE</span><span className="ld-feature-icon"><Layers3 size={19} /></span></div><h3>Research beyond one answer.</h3><p>Choose a model for each turn in the same research thread. Ask it to challenge an earlier answer, compare explanations, or look again at your sources.</p><div className="ld-feature-sample ld-model-stack"><span>K</span><span>D</span><span>M</span><small>Different models. One ongoing thread.</small></div></article>
          </div>
        </section>

        <section className="ld-model-section" id="models">
          <div className="ld-model-section-head" data-reveal>
            <span className="ld-section-tag">MORE THAN ONE WAY TO THINK</span>
            <h2>Pick a model.<br /><em>Push the answer further.</em></h2>
            <p>Keep your research in one thread while you compare perspectives, challenge an answer, or let Auto find a fitting model.</p>
          </div>
          <div className="ld-model-feature-grid">
            <article className="ld-model-feature-card ld-model-feature-card-wide" data-reveal>
              <div className="ld-model-visual ld-orbit-visual" aria-hidden="true">
                <span className="ld-orbit-ring ld-orbit-ring-one" /><span className="ld-orbit-ring ld-orbit-ring-two" />
                <span className="ld-orbit-core"><Brain size={24} /></span>
                {[modelInfo[0], modelInfo[3], modelInfo[6]].map((model, index) => <span className={`ld-orbit-logo ld-orbit-logo-${index + 1}`} key={model.id}><img src={model.icon} alt="" /></span>)}
                <span className="ld-visual-label">YOUR MODEL LINEUP</span>
              </div>
              <div className="ld-model-feature-copy"><span className="ld-model-card-index">01 / CHOOSE</span><h3>One thread. Many minds.</h3><p>Choose from {AVAILABLE_MODELS.length - 1} frontier and specialist models, then keep your source-grounded conversation moving.</p></div>
            </article>
            <article className="ld-model-feature-card" data-reveal>
              <div className="ld-model-visual ld-compare-visual" aria-hidden="true">
                {[modelInfo[3], modelInfo[0]].map((model, index) => <div className={`ld-answer-preview ld-answer-preview-${index + 1}`} key={model.id}><div className="ld-answer-preview-head"><img src={model.icon} alt="" /><span>{model.label}</span></div><i /><i /><i /></div>)}
                <span className="ld-compare-mark">VS</span>
              </div>
              <div className="ld-model-feature-copy"><span className="ld-model-card-index">02 / COMPARE</span><h3>See how answers differ.</h3><p>Bring another model into the same question and compare its reasoning against your saved sources.</p></div>
            </article>
            <article className="ld-model-feature-card" data-reveal>
              <div className="ld-model-visual ld-debate-visual" aria-hidden="true">
                <div className="ld-debate-side ld-debate-side-one"><img src={modelInfo[0].icon} alt="" /><span>Kimi</span><i>Make the strongest case.</i></div>
                <span className="ld-debate-vs">VS</span>
                <div className="ld-debate-side ld-debate-side-two"><img src={modelInfo[3].icon} alt="" /><span>DeepSeek</span><i>Challenge the evidence.</i></div>
                <span className="ld-debate-pulse" />
              </div>
              <div className="ld-model-feature-copy"><span className="ld-model-card-index">03 / DEBATE</span><h3>Let ideas challenge ideas.</h3><p>Ask models to defend different sides, surface disagreement, and test what your sources support.</p></div>
            </article>
            <article className="ld-model-feature-card ld-model-feature-card-wide" data-reveal>
              <div className="ld-model-visual ld-routing-visual" aria-hidden="true">
                <span className="ld-routing-question"><Search size={17} /></span>
                <span className="ld-routing-path ld-routing-path-one" /><span className="ld-routing-path ld-routing-path-two" /><span className="ld-routing-path ld-routing-path-three" />
                <div className="ld-routing-options">{[modelInfo[2], modelInfo[4], modelInfo[8]].map((model, index) => <span className={`ld-routing-option ld-routing-option-${index + 1}`} key={model.id}><img src={model.icon} alt="" /></span>)}</div>
                <span className="ld-routing-auto"><Sparkles size={13} /> Auto <i>BEST FIT</i></span>
              </div>
              <div className="ld-model-feature-copy"><span className="ld-model-card-index">04 / ROUTE</span><h3>Let the question find its model.</h3><p>Use Auto routing when you want LinkDok to pick a fitting model for the next step in your research.</p></div>
            </article>
          </div>
          <button className="ld-inline-link ld-model-explore" onClick={onGetStarted}>Explore the models <ArrowRight size={16} /></button>
        </section>

        <section className="ld-research" id="research">
          <div className="ld-research-head" data-reveal><span className="ld-section-tag">A BETTER RESEARCH LOOP</span><h2>Save. Ask. Compare.<br /><em>Follow the evidence.</em></h2><p>A practical rhythm for turning scattered reading into something you understand, remember, and can build on.</p></div>
          <div className="ld-research-flow">
            <article className="ld-flow-step" data-reveal><span className="ld-flow-number">01</span><div className="ld-flow-icon"><Bookmark size={18} /></div><h3>Gather your sources</h3><p>Collect useful links in topic-based libraries. Keep the original material close at hand.</p><span className="ld-flow-connector" /></article>
            <article className="ld-flow-step" data-reveal><span className="ld-flow-number">02</span><div className="ld-flow-icon"><Search size={18} /></div><h3>Ask a real question</h3><p>Chat with a collection to summarize, explain, find patterns, and surface disagreements.</p><span className="ld-flow-connector" /></article>
            <article className="ld-flow-step" data-reveal><span className="ld-flow-number">03</span><div className="ld-flow-icon"><Layers3 size={18} /></div><h3>Bring in another model</h3><p>Switch models in the same thread. Ask for a second reading, a counterpoint, or a stronger case.</p><span className="ld-flow-connector" /></article>
            <article className="ld-flow-step" data-reveal><span className="ld-flow-number">04</span><div className="ld-flow-icon"><Sparkles size={18} /></div><h3>Make the insight yours</h3><p>Compare the reasoning with your saved links, follow the citations, and keep the useful result.</p><span className="ld-flow-connector" /></article>
          </div>
        </section>

        <section className="ld-last-call" data-reveal><div className="ld-last-mark"><Sparkles size={21} /></div><span className="ld-section-tag">YOUR NEXT QUESTION HAS A HOME</span><h2>Make your saved links<br />work <em>together.</em></h2><p>Build a knowledge base that can answer back.</p><button className="ld-button-primary" onClick={onGetStarted}>Open your LinkDok <ArrowRight size={17} /></button><span className="ld-last-asterisk">✳</span></section>
      </main>

      <footer className="ld-footer"><a href="#top"><img src={isDarkMode ? '/LinkDok-logo.svg' : '/LinkDok-logo-day.svg'} alt="LinkDok" /></a><span>Your links. Your knowledge. Your next idea.</span><a href="/help.html" target="_blank" rel="noreferrer">Explore the guide <ArrowUpRight size={13} /></a><span className="ld-copyright">© {new Date().getFullYear()} LINKDOK</span></footer>
    </div>
  );
}

export default LandingPage;
