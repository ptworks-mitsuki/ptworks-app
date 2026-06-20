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
    label:   "治療の進め方に迷っている",
    getText: d =>
      d
        ? `${d}の患者で、今後の治療の進め方に迷っています。どのような方針で進めるのが良いでしょうか？`
        : "今担当している患者の今後の治療の進め方に迷っています。どのような方針で進めるのが良いでしょうか？",
  },
  {
    label:   "患者への説明の仕方",
    getText: d =>
      d
        ? `${d}について、患者さんやご家族への説明をどのようにすれば伝わりやすいでしょうか？`
        : "担当患者さんやご家族への説明をどのようにすれば伝わりやすいでしょうか？",
  },
  {
    label:   "リスク管理について確認したい",
    getText: d =>
      d
        ? `${d}の患者のリスク管理について確認したいことがあります。特に注意すべき点を教えてください。`
        : "担当患者のリスク管理について確認したいことがあります。特に注意すべき点を教えてください。",
  },
  {
    label:   "評価結果の解釈について",
    getText: d =>
      d
        ? `${d}の患者の評価結果の解釈について相談です。どのように読み解けばよいでしょうか？`
        : "担当患者の評価結果の解釈について相談です。どのように読み解けばよいでしょうか？",
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
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [patientApplied, setPatientApplied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // チャットメッセージが増えたら最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 患者情報が変わったときに「引用済み」フラグをリセット
  useEffect(() => {
    setPatientApplied(false);
  }, [sharedDisease, sharedPatientInfo]);

  const hasPatientData = Boolean(sharedDisease || (sharedPatientInfo?.age));
  const chips = buildChips(sharedDisease, sharedPatientInfo);
  const patientSummary = buildPatientSummary(sharedDisease, sharedPatientInfo);

  // ── 患者情報を引用してチャット入力欄に挿入 ─────────────────────────────

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

  // ── テンプレート挿入 ─────────────────────────────────────────────────────

  const applyTemplate = (tpl: Template) => {
    setInput(tpl.getText(sharedDisease));
    inputRef.current?.focus();
  };

  // ── 送信 ──────────────────────────────────────────────────────────────────

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
          <p className="text-sm font-black text-gray-900">臨床経験10年目の先輩PTが相談に乗ります</p>
          <p className="text-xs text-gray-400 mt-0.5">
            回復期・外来・訪問リハビリの経験をもとに、文献根拠を添えてアドバイスします
          </p>
        </div>
      </div>

      {/* ── 患者情報カード（治療を考えるで入力がある場合のみ表示） ── */}
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

      {/* ── テンプレートボタン ── */}
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
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`px-5 py-4 ${msg.role === "user" ? "bg-gray-50" : "bg-white"}`}
              >
                <p className="text-[10px] font-bold mb-1.5"
                  style={{ color: msg.role === "user" ? "#6B7280" : "#1B4332" }}>
                  {msg.role === "user" ? "あなた" : "先輩PT"}
                </p>
                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* ローディング */}
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
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3 shrink-0">✕</button>
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
  );
}
