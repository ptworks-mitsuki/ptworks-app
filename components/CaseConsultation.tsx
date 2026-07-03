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

// ── 患者情報サマリー生成 ───────────────────────────────────────────────────

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

// ── 患者情報カードに表示する項目 ──────────────────────────────────────────

interface PatientChip {
  label: string;
  value: string;
}

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

// ── エビデンスレベルヘルプ ─────────────────────────────────────────────────

const EVIDENCE_LEVELS = [
  { level: "Lv.A", color: "#1B4332", desc: "ランダム化比較試験（RCT）や系統的レビューによる強いエビデンス" },
  { level: "Lv.B", color: "#1D4ED8", desc: "コホート研究・症例対照研究などによる中程度のエビデンス" },
  { level: "Lv.C", color: "#D97706", desc: "専門家意見・症例報告・臨床経験に基づくもの" },
  { level: "Lv.D", color: "#6B7280", desc: "エビデンスが不十分または相反するもの" },
] as const;

function EvidenceLevelHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs z-10 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900">エビデンスレベルとは</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-2.5">
          {EVIDENCE_LEVELS.map(({ level, color, desc }) => (
            <div key={level} className="flex items-start gap-3">
              <span
                className="shrink-0 mt-0.5 text-[11px] font-black px-2 py-0.5 rounded-full text-white"
                style={{ background: color }}
              >
                {level}
              </span>
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

// ── エビデンスセクションのパースと表示 ────────────────────────────────────

interface ParsedEvidence {
  mainText: string;
  evidenceBlock: string;
}

function parseEvidence(content: string): ParsedEvidence {
  const divider = "━━━━━━━━━━━━━━━━";
  const idx = content.indexOf(divider);
  if (idx === -1) return { mainText: content, evidenceBlock: "" };
  return {
    mainText:      content.slice(0, idx).trimEnd(),
    evidenceBlock: content.slice(idx + divider.length).trim(),
  };
}

function getLevelColor(block: string): string {
  if (block.includes("Lv.A")) return "#1B4332";
  if (block.includes("Lv.B")) return "#1D4ED8";
  if (block.includes("Lv.C")) return "#D97706";
  if (block.includes("Lv.D")) return "#6B7280";
  return "#1B4332";
}

function getLevelBadgeText(block: string): string {
  const m = block.match(/Lv\.[ABCD]/);
  return m ? m[0] : "";
}

function getSearchKeywords(block: string): string {
  const m = block.match(/文献検索[：:]\s*(.+)/);
  return m ? m[1].trim() : "";
}

function EvidenceBlock({
  block,
  onHelpOpen,
}: {
  block: string;
  onHelpOpen: () => void;
}) {
  const levelColor = getLevelColor(block);
  const badge      = getLevelBadgeText(block);
  const keywords   = getSearchKeywords(block);

  // Remove the 文献検索 line for display (we show it as a button)
  const displayText = block.replace(/文献検索[：:]\s*.+/g, "").trim();

  return (
    <div
      className="mt-3 rounded-xl px-4 py-3 border-l-4 text-sm"
      style={{ background: "#F0FFF4", borderColor: "#1B4332" }}
    >
      <div className="flex items-center gap-2 mb-2">
        {badge && (
          <span
            className="text-[11px] font-black px-2 py-0.5 rounded-full text-white"
            style={{ background: levelColor }}
          >
            {badge}
          </span>
        )}
        <span className="text-xs font-bold text-gray-700">エビデンス</span>
        <button
          onClick={onHelpOpen}
          className="w-4 h-4 rounded-full border border-gray-400 text-[9px] font-bold text-gray-400 hover:border-[#1B4332] hover:text-[#1B4332] flex items-center justify-center transition ml-auto"
          aria-label="エビデンスレベルの説明"
        >
          ?
        </button>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {keywords && (
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(keywords)}`}
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

// ── エラー → 日本語 ────────────────────────────────────────────────────────

function toJapanese(err: unknown): string {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (m.includes("429") || m.includes("529") || m.includes("overload")) return "現在アクセスが集中しています。しばらくお待ちください。";
  if (m.includes("timeout")) return "通信に時間がかかっています。しばらくお待ちください。";
  if (m.includes("fetch")) return "通信環境をご確認ください。";
  if (/[ぁ-ん]/.test(m)) return err instanceof Error ? err.message : String(err);
  return "現在メンテナンス中です。しばらくお待ちください。";
}

// ── Main ────────────────────────────────────────────────────────────────────

export function CaseConsultation({ sharedDisease = "", sharedPatientInfo }: CaseConsultationProps) {
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [patientApplied,  setPatientApplied]  = useState(false);
  const [showEvidenceHelp, setShowEvidenceHelp] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setPatientApplied(false);
  }, [sharedDisease, sharedPatientInfo]);

  const hasPatientData = Boolean(sharedDisease || (sharedPatientInfo?.age));
  const chips = buildChips(sharedDisease, sharedPatientInfo);
  const patientSummary = buildPatientSummary(sharedDisease, sharedPatientInfo);

  const applyPatientInfo = () => {
    const label = sharedDisease
      ? `${sharedDisease}の患者について相談です。`
      : "担当患者について相談です。";

    const ageGender = [
      sharedPatientInfo?.age && `${sharedPatientInfo.age}歳`,
      sharedPatientInfo?.gender,
    ].filter(Boolean).join("・");

    const prefix = ageGender ? `${label}（${ageGender}）` : label;
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
      const res = await fetch("/api/case-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages:       newMessages,
          disease:        sharedDisease || undefined,
          patientSummary: patientApplied ? patientSummary : undefined,
        }),
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

        {/* ── 先輩PTバナー ── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-black text-sm"
            style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
          >
            PT
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">豊富な臨床経験を持つ先輩PTが相談に乗ります</p>
            <p className="text-xs text-gray-400 mt-0.5">
              回復期・外来・訪問リハビリの経験をもとに、文献根拠を添えてアドバイスします
            </p>
          </div>
        </div>

        {/* ── 患者情報カード ── */}
        {hasPatientData && chips.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "#1B4332" }}
          >
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                現在の患者情報
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map((chip, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    <span className="text-[10px] text-white/60">{chip.label}</span>
                    <span className="text-xs font-bold text-white">{chip.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={applyPatientInfo}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition"
                style={{
                  background: patientApplied ? "rgba(255,255,255,0.12)" : "#E85D04",
                  color: "white",
                }}
              >
                {patientApplied ? "引用済み" : "この情報を相談に使う"}
              </button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-[10px] text-white/40">
                「治療を考える」タブで入力した情報を自動取得しています
              </p>
            </div>
          </div>
        )}

        {/* ── テンプレートボタン（6個・2列） ── */}
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-[#E85D04] rounded-xl px-3 py-2.5 text-left leading-snug transition"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* ── チャットエリア ── */}
        {messages.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {messages.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} className="px-5 py-4 bg-gray-50">
                      <p className="text-[10px] font-bold text-gray-500 mb-1.5">あなた</p>
                      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                const { mainText, evidenceBlock } = parseEvidence(msg.content);
                return (
                  <div key={i} className="px-5 py-4 bg-white">
                    <p className="text-[10px] font-bold text-[#1B4332] mb-1.5">先輩PT</p>
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {mainText}
                    </div>
                    {evidenceBlock && (
                      <EvidenceBlock
                        block={evidenceBlock}
                        onHelpOpen={() => setShowEvidenceHelp(true)}
                      />
                    )}
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

        {/* ── 入力欄 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="先輩に質問する内容を入力してください。（Shift+Enterで改行）"
            rows={3}
            className="w-full px-4 pt-4 pb-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-[10px] text-gray-400">Enterで送信 / Shift+Enterで改行</p>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
              style={{ background: "#1B4332" }}
            >
              送信
            </button>
          </div>
        </div>

        {/* リセット */}
        {messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => { setMessages([]); setPatientApplied(false); setError(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              会話をリセットする
            </button>
          </div>
        )}
      </div>

      {showEvidenceHelp && <EvidenceLevelHelp onClose={() => setShowEvidenceHelp(false)} />}
    </>
  );
}
