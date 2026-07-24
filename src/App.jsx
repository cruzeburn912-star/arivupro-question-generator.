import React, { useState, useRef, useEffect } from "react";
import { Send, FileStack, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

const SYSTEM_PROMPT = `You are an expert ICAI question setter for Indian Chartered Accountancy (CA), Company Secretary (CS), Cost and Management Accountant (CMA), and ACCA examinations.

Your task is to generate NEW, ORIGINAL practice questions using only general conceptual understanding of the topic supplied by the user.

Strict rules:
- Never copy, closely paraphrase, or lightly modify any existing ICAI/institute question, illustration, or dataset.
- Always invent new realistic business scenarios: change company names, industries, numbers, currencies, and assumptions from anything that may exist in source material.
- Test the same underlying learning outcomes and difficulty as requested, matching ICAI examination tone and rigor.
- For every question, clearly present: Question Number, Concept Tested, Difficulty, Marks, Estimated Time, and the Question Statement.
- Do NOT include solutions, answers, workings, or hints of any kind.
- Format the response in clean, readable markdown with a horizontal rule ("---") between questions.
- If the user asks a follow-up (e.g. "make Q3 harder", "add 2 more MCQs"), respond only with the newly requested material, keeping the same formatting conventions.`;

const DIFFICULTIES = [
  "Easy (foundational)",
  "Moderate (standard exam)",
  "High (advanced/case-study)",
  "Mixed (all levels)",
];

const QUESTION_TYPES = [
  "Numerical problems",
  "Theoretical/descriptive",
  "MCQs",
  "Mixed (numerical + theory)",
];

const CHAPTER_PRESETS = [
  { key: "custom", label: "Custom (type your own)" },
  {
    key: "as25",
    label: "AS 25 - Interim Financial Reporting",
    course: "CA Intermediate",
    subject: "Advanced Accounting",
    chapter: "AS 25 - Interim Financial Reporting",
    concepts: [
      "Content & minimum components of an interim financial report",
      "Form and content of interim financial statements",
      "Selected explanatory notes",
      "Periods for which interim statements are presented",
      "Materiality in interim reporting",
      "Accounting policies & year-to-date measurement",
      "Weighted average annual effective tax rate method",
      "Revenue received seasonally or occasionally",
      "Costs incurred unevenly during the financial year",
      "Restatement of previously reported interim periods",
      "Applicability to interim financial results vs interim financial report",
    ],
  },
  {
    key: "framework",
    label: "Framework for Preparation & Presentation of Financial Statements",
    course: "CA Intermediate",
    subject: "Advanced Accounting",
    chapter: "Framework for Preparation and Presentation of Financial Statements",
    concepts: [
      "Objectives and users of financial statements",
      "Fundamental accounting assumptions (Going Concern, Accrual, Consistency)",
      "Qualitative characteristics of financial statements",
      "Elements of financial statements (Asset, Liability, Equity, Income, Expense)",
      "Recognition criteria for assets and liabilities",
      "Measurement bases (Historical Cost, Current Cost, Realisable Value, Present Value)",
      "Capital and capital maintenance concepts",
      "Going concern vs not-a-going-concern financial statement preparation",
    ],
  },
  {
    key: "applicability",
    label: "Applicability of Accounting Standards",
    course: "CA Intermediate",
    subject: "Advanced Accounting",
    chapter: "Applicability of Accounting Standards",
    concepts: [
      "Status and mandatory nature of Accounting Standards",
      "Enterprises to which Accounting Standards apply",
      "Materiality of financial items under Accounting Standards",
      "Accounting Standards vs Income Tax Act / ICDS",
      "MSME classification criteria for non-company entities",
      "SMC classification criteria for companies",
      "Exemptions/relaxations available to MSMEs and SMCs",
      "Transitional rules on gaining/losing MSME or SMC status",
    ],
  },
];

function renderRich(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.trim() === "---") {
      return <hr key={i} className="q-divider" />;
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={j}>{part}</React.Fragment>;
    });
    return (
      <p key={i} className="q-line">
        {parts.length ? parts : "\u00A0"}
      </p>
    );
  });
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(true);
  const [paperNo, setPaperNo] = useState(0);

  const [presetKey, setPresetKey] = useState("as25");
  const [course, setCourse] = useState("CA Intermediate");
  const [subject, setSubject] = useState("Advanced Accounting");
  const [chapter, setChapter] = useState("AS 25 - Interim Financial Reporting");
  const [concept, setConcept] = useState("");
  const [customConcept, setCustomConcept] = useState("");
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]);
  const [qType, setQType] = useState(QUESTION_TYPES[3]);
  const [marks, setMarks] = useState(4);
  const [count, setCount] = useState(5);
  const [freeText, setFreeText] = useState("");

  const scrollRef = useRef(null);
  const activePreset = CHAPTER_PRESETS.find((p) => p.key === presetKey);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function handlePresetChange(key) {
    setPresetKey(key);
    const preset = CHAPTER_PRESETS.find((p) => p.key === key);
    if (preset && key !== "custom") {
      setCourse(preset.course);
      setSubject(preset.subject);
      setChapter(preset.chapter);
      setConcept(preset.concepts[0]);
      setCustomConcept("");
    } else {
      setCourse("");
      setSubject("");
      setChapter("");
      setConcept("");
      setCustomConcept("");
    }
  }

  // Calls OUR OWN /api/generate endpoint (Vercel serverless function),
  // not the Anthropic API directly. The function holds the real API key.
  async function callBackend(history) {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.error?.message || data?.error || "Request failed");
    }
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return text || "No response was returned.";
  }

  async function sendMessage(text, { isPaper = false } = {}) {
    setError(null);
    const newHistory = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setLoading(true);
    if (isPaper) setPaperNo((n) => n + 1);
    try {
      const reply = await callBackend(
        newHistory.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e.message || "Could not reach the question bank. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGeneratePaper() {
    const finalConcept =
      presetKey === "custom"
        ? customConcept || "General coverage of the chapter"
        : concept === "__other__"
        ? customConcept || "General coverage of the chapter"
        : concept || "General coverage of the chapter";

    const requestText = `Course: ${course}
Subject: ${subject}
Chapter: ${chapter}
Concept: ${finalConcept}
Difficulty: ${difficulty}
Question Type: ${qType}
Marks: ${marks}
Number of Questions: ${count}

Generate the practice questions as instructed.`;
    sendMessage(requestText, { isPaper: true });
  }

  function handleSendFreeText() {
    if (!freeText.trim() || loading) return;
    const text = freeText;
    setFreeText("");
    sendMessage(text);
  }

  return (
    <div className="shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        :root {
          --ink: #17213a;
          --paper: #edf1f6;
          --paper-dim: #e2e8f0;
          --rule: #c7d4e3;
          --margin-red: #b23a2e;
          --gold: #9c7a2e;
          --navy: #17213a;
          --muted: #5b6b82;
        }

        * { box-sizing: border-box; }

        .shell {
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink);
          background: var(--paper);
          border-radius: 14px;
          overflow: hidden;
          max-width: 880px;
          margin: 0 auto;
          box-shadow: 0 1px 0 rgba(23,33,58,0.08);
          display: flex;
          flex-direction: column;
          height: 90vh;
          min-height: 640px;
        }

        .header {
          background: var(--navy);
          color: #eef1f6;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px double var(--gold);
        }

        .header-title {
          font-family: 'Special Elite', monospace;
          font-size: 18px;
          letter-spacing: 0.5px;
        }

        .header-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #a9b6cc;
          margin-top: 3px;
        }

        .paper-serial {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          text-align: right;
          color: #cdd8ea;
          border: 1px solid #3a4763;
          padding: 6px 10px;
          border-radius: 4px;
          line-height: 1.5;
        }

        .paper-serial b {
          color: #fff;
          font-size: 13px;
        }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          position: relative;
          padding: 20px 20px 20px 64px;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 27px,
            var(--rule) 28px
          );
          background-attachment: local;
        }

        .margin-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 44px;
          width: 2px;
          background: var(--margin-red);
          opacity: 0.55;
        }

        .empty-state {
          font-style: italic;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          max-width: 460px;
        }

        .msg {
          margin-bottom: 22px;
          position: relative;
        }

        .msg-user {
          text-align: right;
        }

        .msg-user .bubble {
          display: inline-block;
          background: #dbe4f0;
          color: #1f2f4d;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          line-height: 1.6;
          padding: 10px 14px;
          border-radius: 8px 8px 2px 8px;
          white-space: pre-wrap;
          text-align: left;
          max-width: 90%;
        }

        .msg-user .label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          margin-bottom: 4px;
        }

        .msg-assistant {
          position: relative;
          background: #ffffffcc;
          border: 1px solid var(--rule);
          border-radius: 4px;
          padding: 16px 18px;
        }

        .stamp {
          position: absolute;
          top: -14px;
          right: -10px;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          border: 3px double var(--margin-red);
          color: var(--margin-red);
          font-family: 'Special Elite', monospace;
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          transform: rotate(-9deg);
          opacity: 0.8;
          background: rgba(255,255,255,0.6);
          line-height: 1.3;
          pointer-events: none;
        }

        .q-line {
          margin: 0 0 6px 0;
          font-size: 14px;
          line-height: 1.65;
        }

        .q-divider {
          border: none;
          border-top: 1px dashed var(--rule);
          margin: 14px 0;
        }

        .loading-msg {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--margin-red);
          animation: pulse 1s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }

        .error-msg {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--margin-red);
          font-size: 12.5px;
          font-family: 'IBM Plex Mono', monospace;
          margin-top: 4px;
        }

        .composer {
          border-top: 1px solid var(--rule);
          background: var(--paper-dim);
        }

        .form-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          user-select: none;
        }

        .form-panel {
          padding: 4px 20px 16px 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .field label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
        }

        .field input, .field select {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          padding: 7px 9px;
          border: 1px solid var(--rule);
          border-radius: 5px;
          background: #fff;
          color: var(--ink);
        }

        .field input:focus, .field select:focus, .free-input:focus {
          outline: 2px solid var(--gold);
          outline-offset: 1px;
        }

        .field-row-full {
          grid-column: 1 / -1;
        }

        .marks-count-row {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .issue-btn {
          grid-column: 1 / -1;
          background: var(--navy);
          color: #fff;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 11px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s ease;
        }

        .issue-btn:hover:not(:disabled) {
          background: #22314f;
        }

        .issue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .free-row {
          display: flex;
          gap: 8px;
          padding: 12px 20px 16px 20px;
        }

        .free-input {
          flex: 1;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          padding: 10px 12px;
          border: 1px solid var(--rule);
          border-radius: 6px;
          background: #fff;
          color: var(--ink);
        }

        .send-btn {
          background: var(--margin-red);
          color: #fff;
          border: none;
          border-radius: 6px;
          width: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 560px) {
          .form-panel { grid-template-columns: 1fr; }
          .marks-count-row { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="header">
        <div>
          <div className="header-title">ArivuPro Examination Cell</div>
          <div className="header-sub">Original Question Paper Register — live via Claude</div>
        </div>
        <div className="paper-serial">
          PAPER NO.
          <br />
          <b>{String(paperNo).padStart(3, "0")}</b>
        </div>
      </div>

      <div className="chat-area" ref={scrollRef}>
        <div className="margin-line" />
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            This register is blank. Pick a chapter below (or choose "Custom"
            to type your own), select a concept, difficulty and format, then
            click "Issue Question Paper" to generate a fresh, original set.
            You can also type a follow-up request directly, such as "make
            question 3 harder" or "add two MCQs on the same concept."
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}>
            {m.role === "user" ? (
              <>
                <div className="label">Requisition</div>
                <div className="bubble">{m.content}</div>
              </>
            ) : (
              <>
                <div className="stamp">Original<br />Not ICAI<br />Copied</div>
                {renderRich(m.content)}
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="loading-msg">
            Setting the paper
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}

        {error && (
          <div className="error-msg">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </div>

      <div className="composer">
        <div className="form-toggle" onClick={() => setFormOpen((v) => !v)}>
          <span>Compose New Question Paper</span>
          {formOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>

        {formOpen && (
          <div className="form-panel">
            <div className="field field-row-full">
              <label>Chapter Preset</label>
              <select value={presetKey} onChange={(e) => handlePresetChange(e.target.value)}>
                {CHAPTER_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Course</label>
              <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. CA Intermediate" />
            </div>
            <div className="field">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Advanced Accounting" />
            </div>
            <div className="field field-row-full">
              <label>Chapter</label>
              <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. AS 25 - Interim Financial Reporting" />
            </div>

            <div className="field field-row-full">
              <label>Concept</label>
              {presetKey !== "custom" && activePreset ? (
                <select value={concept} onChange={(e) => setConcept(e.target.value)}>
                  {activePreset.concepts.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__other__">Other (type below)</option>
                </select>
              ) : null}
              {(presetKey === "custom" || concept === "__other__") && (
                <input
                  style={{ marginTop: presetKey !== "custom" ? "6px" : 0 }}
                  value={customConcept}
                  onChange={(e) => setCustomConcept(e.target.value)}
                  placeholder="Type the concept to test"
                />
              )}
            </div>

            <div className="marks-count-row">
              <div className="field">
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Question Type</label>
                <select value={qType} onChange={(e) => setQType(e.target.value)}>
                  {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Marks</label>
                <input type="number" min="1" max="20" value={marks} onChange={(e) => setMarks(e.target.value)} />
              </div>
              <div className="field">
                <label>Count</label>
                <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
            </div>

            <button className="issue-btn" onClick={handleGeneratePaper} disabled={loading}>
              <FileStack size={14} />
              Issue Question Paper
            </button>
          </div>
        )}

        <div className="free-row">
          <input
            className="free-input"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendFreeText()}
            placeholder="Ask a follow-up... e.g. 'make Q3 harder' or 'add 2 MCQs'"
            disabled={loading}
          />
          <button className="send-btn" onClick={handleSendFreeText} disabled={loading}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
