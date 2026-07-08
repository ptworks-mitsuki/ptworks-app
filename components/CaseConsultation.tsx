"use client";

import { useState, useRef, useEffect } from "react";
import type { PatientInfo } from "./PatientInfoForm";
import type { ChatMessage } from "@/app/api/case-chat/route";

// ── Props ──────────────────────────────────────────────────────────────────

interface CaseConsultationProps {
  sharedDisease?:     string;
  sharedPatientInfo?: PatientInfo;
}

// ── テンプレート定義 ───────────────────────────────────────────────────────

interface Template {
  label:   string;
  getText: (disease: string) => string;
}

const TEMPLATES: Template[] = [
  {
    label:   "禁忌を知りたい",
    getText: d =>
      d
        ? `${d}の患者に対して、リハビリを行う際の禁忌事項を教えてください。特に注意すべき動作や負荷について知りたいです。`
        : "担当患者のリハビリを行う際の禁忌事項を教えてください。特に注意すべき動作や負荷について知りたいです。",
  },
  {
    label:   "筋肉の解剖を確認したい",
    getText: d =>
      d
        ? `${d}に関連する筋肉の解剖について教えてください。起始・停止・作用と、リハビリでのアプローチポイントを確認したいです。`
        : "リハビリで関わることの多い筋肉の解剖について教えてください。起始・停止・作用と、臨床でのアプローチポイントを確認したいです。",
  },
  {
    label:   "評価結果の解釈に迷っている",
    getText: d =>
      d
        ? `${d}の患者の評価結果の解釈について相談です。どのような視点で読み解けばよいでしょうか？`
        : "担当患者の評価結果の解釈に迷っています。どのような視点で読み解けばよいでしょうか？",
  },
  {
    label:   "治療の進め方に迷っている",
    getText: d =>
      d
        ? `${d}の患者で、今後の治療の進め方に迷っています。どのような方針で進めるのが良いでしょうか？`
        : "今担当している患者の今後の治療の進め方に迷っています。どのような方針で進めるのが良いでしょうか？",
  },
  {
    label:   "学会発表の準備をしたい",
    getText: _ =>
      "学会発表の準備をしています。症例報告のポイントや発表で押さえるべき構成、考察の書き方について教えてください。",
  },
  {
    label:   "副業・キャリアについて相談したい",
    getText: _ =>
      "PT としての副業やキャリアアップについて相談したいです。臨床以外での活躍の場や、スキルを活かした働き方について聞かせてください。",
  },
];

// ── 患者情報 ──────────────────────────────────────────────────────────────

function buildPatientSummary(disease: string, info?: PatientInfo): string {
  if (!info) return disease ? `疾患：${disease}` : "";
  const parts: string[] = [];
  if (disease) parts.push(`疾患：${disease}`);
  if (info.age) parts.push(`年齢：${info.age}歳`);
  if (info.gender) parts.push(`性別：${info.gender}`);
  if (info.nrs && info.nrs !== "0") parts.push(`NRS：${info.nrs}/10`);
  if (info.mmtLevel && info.mmtLevel !== "なし") parts.push(`MMT：${info.mmtLevel}`);
  if (info.romLevel && info.romLevel !== "なし") parts.push(`ROM制限：${info.romLevel}`);
  if (info.fimTotal) parts.push(`FIM：${info.fimTotal}点`);
  if (info.biTotal) parts.push(`BI：${info.biTotal}点`);
  if (info.complaint) parts.push(`主訴：${info.complaint}`);
  if (info.goal) parts.push(`目標：${info.goal}`);
  if (info.environment) parts.push(`受療環境：${info.environment}`);
  return parts.join("、");
}

interface PatientChip { label: string; value: string; }

function buildChips(disease: string, info?: PatientInfo): PatientChip[] {
  const chips: PatientChip[] = [];
  if (disease) chips.push({ label: "疾患", value: disease });
  if (!info) return chips;
  if (info.age) chips.push({ label: "年齢", value: `${info.age}歳` });
  if (info.gender) chips.push({ label: "性別", value: info.gender });
  if (info.nrs && info.nrs !== "0") chips.push({ label: "NRS", value: `${info.nrs}/10` });
  if (info.mmtLevel && info.mmtLevel !== "なし") chips.push({ label: "MMT", value: info.mmtLevel });
  if (info.romLevel && info.romLevel !== "なし") chips.push({ label: "ROM制限", value: info.romLevel });
  return chips;
}

// ── Markdown renderer ─────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{text.slice(last, m.index)}</span>);
    parts.push(<strong key={i++} className="font-bold text-gray-900">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>);
  return parts;
}

function MarkdownBody({ text }: { text: string }) {
  const lines  = text.split("\n");
  const nodes: React.ReactNode[] = [];
  const listItems: string[] = [];
  let k = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={k++} className="space-y-1.5 my-2 pl-0">
        {listItems.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>,
    );
    listItems.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={k++} className="text-sm font-black text-gray-900 mt-3 first:mt-0">
          {renderInline(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h4 key={k++} className="text-sm font-bold text-gray-800 mt-2">
          {renderInline(line.slice(4))}
        </h4>,
      );
    } else if (line === "---" || line === "━━━━━━━━━━━━━━━━") {
      flushList();
      nodes.push(<hr key={k++} className="my-2 border-gray-200" />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={k++} className="text-sm text-gray-700 leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushList();

  return <div className="space-y-0.5">{nodes}</div>;
}

// ── Section parser ────────────────────────────────────────────────────────

interface ContentSection { title: string; body: string; }

function parseSections(text: string): ContentSection[] {
  const lines    = text.split("\n");
  const sections: ContentSection[] = [];
  let title      = "";
  let bodyLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("## ")) {
      if (title || bodyLines.some(l => l.trim())) {
        sections.push({ title, body: bodyLines.join("\n").trim() });
      }
      title     = line.trim().slice(3);
      bodyLines = [];
    } else {
      bodyLines.push(line);
    }
  }
  if (title || bodyLines.some(l => l.trim())) {
    sections.push({ title, body: bodyLines.join("\n").trim() });
  }

  return sections.length > 0 ? sections : [{ title: "", body: text }];
}

// ── Evidence ──────────────────────────────────────────────────────────────

const EVIDENCE_LEVELS = [
  { level: "Lv.A", color: "#1B4332", desc: "RCT・系統的レビューによる強いエビデンス" },
  { level: "Lv.B", color: "#1D4ED8", desc: "コホート研究などによる中程度のエビデンス" },
  { level: "Lv.C", color: "#D97706", desc: "専門家意見・症例報告・臨床経験に基づくもの" },
  { level: "Lv.D", color: "#6B7280", desc: "エビデンスが不十分または相反するもの" },
] as const;

function getLevelColor(level: string): string {
  if (level.includes("A")) return "#1B4332";
  if (level.includes("B")) return "#1D4ED8";
  if (level.includes("C")) return "#D97706";
  return "#6B7280";
}

function parseEvidenceFields(block: string) {
  const levelMatch    = block.match(/エビデンスレベル[：:]\s*(Lv\.[ABCD])/);
  const groundsMatch  = block.match(/根拠[：:]\s*([\s\S]+?)(?=\n参考文献|$)/);
  const citationMatch = block.match(/参考文献[：:]\s*([\s\S]+?)(?=\n文献検索|$)/);
  const keywordMatch  = block.match(/文献検索[：:]\s*(.+)/);
  return {
    level:    levelMatch?.[1]    ?? "",
    grounds:  groundsMatch?.[1]  ?.trim() ?? "",
    citation: citationMatch?.[1] ?.trim() ?? "",
    keyword:  keywordMatch?.[1]  ?.trim() ?? "",
  };
}

function splitEvidence(content: string): { mainText: string; evidenceBlock: string } {
  const divider = "━━━━━━━━━━━━━━━━";
  const idx = content.indexOf(divider);
  if (idx === -1) return { mainText: content, evidenceBlock: "" };
  return {
    mainText:      content.slice(0, idx).trimEnd(),
    evidenceBlock: content.slice(idx + divider.length).trim(),
  };
}

function EvidenceLevelHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs z-10 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900">エビデンスレベルとは</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-2.5">
          {EVIDENCE_LEVELS.map(({ level, color, desc }) => (
            <div key={level} className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{level}</span>
              <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
          エビデンスレベルが高いほど信頼性の高い研究に基づきますが、臨床判断は個別の患者状態を優先してください。
        </p>
      </div>
    </div>
  );
}

function EvidenceCard({ block, onHelpOpen }: { block: string; onHelpOpen: () => void }) {
  const { level, grounds, citation, keyword } = parseEvidenceFields(block);
  const levelColor = level ? getLevelColor(level) : "#6B7280";
  const hasContent = grounds || citation;

  return (
    <div className="rounded-xl border-l-4 px-4 py-3" style={{ background: "#F0FFF4", borderColor: "#1B4332" }}>
      <div className="flex items-center gap-2 mb-2">
        {level && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: levelColor }}>
            {level}
          </span>
        )}
        <span className="text-xs font-bold" style={{ color: "#1B4332" }}>エビデンス・文献ソース</span>
        <button
          onClick={onHelpOpen}
          className="ml-auto w-4 h-4 rounded-full border border-gray-400 text-[9px] font-bold text-gray-400 hover:border-[#1B4332] hover:text-[#1B4332] flex items-center justify-center transition"
          aria-label="エビデンスレベルの説明"
        >?</button>
      </div>

      {hasContent ? (
        <div className="space-y-1.5">
          {grounds && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-0.5">根拠</p>
              <p className="text-xs text-gray-700 leading-relaxed">{grounds}</p>
            </div>
          )}
          {citation && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-0.5">参考文献・ガイドライン</p>
              <p className="text-xs text-gray-700 leading-relaxed">{citation}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-600 leading-relaxed">
          この内容はまだ十分なエビデンスがありません。専門家の経験則・臨床知見が中心となります。
        </p>
      )}

      {keyword && (
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(keyword)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-bold underline transition"
          style={{ color: "#1B4332" }}
        >
          この文献を詳しく調べる →
        </a>
      )}
    </div>
  );
}

function NoEvidenceCard({ onHelpOpen }: { onHelpOpen: () => void }) {
  return (
    <div className="rounded-xl border-l-4 px-4 py-3" style={{ background: "#F0FFF4", borderColor: "#1B4332" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#6B7280" }}>Lv.D</span>
        <span className="text-xs font-bold" style={{ color: "#1B4332" }}>エビデンス・文献ソース</span>
        <button onClick={onHelpOpen} className="ml-auto w-4 h-4 rounded-full border border-gray-400 text-[9px] font-bold text-gray-400 hover:border-[#1B4332] hover:text-[#1B4332] flex items-center justify-center transition" aria-label="エビデンスレベルの説明">?</button>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">
        この内容はまだ十分なエビデンスがありません。専門家の経験則・臨床知見が中心となります。
      </p>
    </div>
  );
}

// ── AssistantMessage ──────────────────────────────────────────────────────

const INITIAL_SECTION_COUNT = 3;

function AssistantMessage({ content, onHelpOpen }: { content: string; onHelpOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { mainText, evidenceBlock } = splitEvidence(content);
  const sections = parseSections(mainText);
  const hasMore  = sections.length > INITIAL_SECTION_COUNT;
  const visible  = expanded ? sections : sections.slice(0, INITIAL_SECTION_COUNT);

  return (
    <div className="space-y-2">
      {visible.map((sec, i) => (
        <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
          {sec.title && (
            <h3 className="text-sm font-black text-gray-900 mb-2">{sec.title}</h3>
          )}
          <MarkdownBody text={sec.body} />
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full text-xs text-gray-500 py-2.5 border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:text-gray-700 transition"
        >
          {expanded
            ? "閉じる ▲"
            : `続きを読む ▼（残り${sections.length - INITIAL_SECTION_COUNT}セクション）`}
        </button>
      )}

      {evidenceBlock
        ? <EvidenceCard block={evidenceBlock} onHelpOpen={onHelpOpen} />
        : <NoEvidenceCard onHelpOpen={onHelpOpen} />}
    </div>
  );
}

// ── エラー → 日本語 ────────────────────────────────────────────────────────

function toJapanese(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("429") || m.includes("529") || m.includes("overload"))
    return "現在アクセスが集中しています。しばらくしてからもう一度お試しください。";
  if (m.includes("timeout") || m.includes("timed out"))
    return "通信に時間がかかっています。もう一度お試しください。";
  if (m.includes("fetch failed") || m.includes("network") || m.includes("econnreset") || m.includes("enotfound"))
    return "通信エラーが発生しました。インターネット接続を確認してもう一度お試しください。";
  if (/[ぁ-ん]/.test(m)) return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

// ── Main ────────────────────────────────────────────────────────────────────

export function CaseConsultation({ sharedDisease = "", sharedPatientInfo }: CaseConsultationProps) {
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [input,            setInput]            = useState("");
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [patientApplied,   setPatientApplied]   = useState(false);
  const [showEvidenceHelp, setShowEvidenceHelp] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { setPatientApplied(false); }, [sharedDisease, sharedPatientInfo]);

  const hasPatientData = Boolean(sharedDisease || sharedPatientInfo?.age);
  const chips          = buildChips(sharedDisease, sharedPatientInfo);
  const patientSummary = buildPatientSummary(sharedDisease, sharedPatientInfo);

  const applyPatientInfo = () => {
    const label     = sharedDisease ? `${sharedDisease}の患者について相談です。` : "担当患者について相談です。";
    const ageGender = [sharedPatientInfo?.age && `${sharedPatientInfo.age}歳`, sharedPatientInfo?.gender].filter(Boolean).join("・");
    const prefix    = ageGender ? `${label}（${ageGender}）` : label;
    setInput(prev => prev ? `${prefix}\n${prev}` : prefix);
    setPatientApplied(true);
    inputRef.current?.focus();
  };

  const applyTemplate = (tpl: Template) => {
    setInput(tpl.getText(sharedDisease));
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/case-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, disease: sharedDisease || undefined, patientSummary: patientApplied ? patientSummary : undefined }),
      });
      const data = await res.json() as { reply: string } | { error: string };
      if ("error" in data) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(toJapanese(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="w-full space-y-4">

        {/* バナー */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-black text-sm"
            style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>PT</div>
          <div>
            <p className="text-sm font-black text-gray-900">豊富な臨床経験を持つ先輩PTが相談に乗ります</p>
            <p className="text-xs text-gray-400 mt-0.5">回復期・外来・訪問リハビリの経験をもとに、文献根拠を添えてアドバイスします</p>
          </div>
        </div>

        {/* 患者情報カード */}
        {hasPatientData && chips.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#1B4332" }}>
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">現在の患者情報</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map((chip, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <span className="text-[10px] text-white/60">{chip.label}</span>
                    <span className="text-xs font-bold text-white">{chip.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={applyPatientInfo}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition"
                style={{ background: patientApplied ? "rgba(255,255,255,0.12)" : "#E85D04", color: "white" }}>
                {patientApplied ? "引用済み" : "この情報を相談に使う"}
              </button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-[10px] text-white/40">「AI治療考察」タブで入力した情報を自動取得しています</p>
            </div>
          </div>
        )}

        {/* テンプレートボタン */}
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(tpl => (
            <button key={tpl.label} type="button" onClick={() => applyTemplate(tpl)}
              className="text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-[#E85D04] rounded-xl px-3 py-2.5 text-left leading-snug transition">
              {tpl.label}
            </button>
          ))}
        </div>

        {/* チャットエリア */}
        {messages.length > 0 && (
          <div className="space-y-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {messages.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} className="px-5 py-4 bg-gray-50">
                      <p className="text-[10px] font-bold text-gray-500 mb-2">あなた</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  );
                }
                return (
                  <div key={i} className="px-5 py-4 bg-white">
                    <p className="text-[10px] font-bold text-[#1B4332] mb-2">先輩PT</p>
                    <AssistantMessage content={msg.content} onHelpOpen={() => setShowEvidenceHelp(true)} />
                  </div>
                );
              })}

              {loading && (
                <div className="px-5 py-4 bg-white">
                  <p className="text-[10px] font-bold text-[#1B4332] mb-1.5">先輩PT</p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#1B4332] rounded-full animate-spin" />
                    考えています…
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3 shrink-0">&times;</button>
          </div>
        )}

        {/* 入力欄 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="先輩に質問する内容を入力してください。（Shift+Enterで改行）"
            rows={3}
            className="w-full px-4 pt-4 pb-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-[10px] text-gray-400">Enterで送信 / Shift+Enterで改行</p>
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
              style={{ background: "#1B4332" }}>送信</button>
          </div>
        </div>

        {/* リセット */}
        {messages.length > 0 && (
          <div className="text-center">
            <button onClick={() => { setMessages([]); setPatientApplied(false); setError(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition">
              会話をリセットする
            </button>
          </div>
        )}
      </div>

      {showEvidenceHelp && <EvidenceLevelHelp onClose={() => setShowEvidenceHelp(false)} />}
    </>
  );
}
