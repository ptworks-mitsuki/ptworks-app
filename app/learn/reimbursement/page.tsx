"use client";

import { useState } from "react";

// ══════════════════════════════════════════════════════════════════════════
// 定数・データ
// ══════════════════════════════════════════════════════════════════════════

interface RehabCategory {
  key: string;
  name: string;
  days: number;
  diseases: string[];
  color: string;
}

const REHAB_CATEGORIES: RehabCategory[] = [
  {
    key: "musculo",
    name: "運動器リハビリテーション料",
    days: 150,
    color: "#1B4332",
    diseases: [
      "骨折", "変形性関節症", "変形性膝関節症", "変形性股関節症",
      "靭帯損傷", "腰椎椎間板ヘルニア", "脊柱管狭窄症",
      "人工関節置換術後", "TKA", "THA", "腱損傷", "切断",
    ],
  },
  {
    key: "cerebro",
    name: "脳血管疾患等リハビリテーション料",
    days: 180,
    color: "#2563EB",
    diseases: [
      "脳梗塞", "脳出血", "くも膜下出血", "脳腫瘍",
      "脊髄損傷", "パーキンソン病", "片麻痺", "失語症",
    ],
  },
  {
    key: "disuse",
    name: "廃用症候群リハビリテーション料",
    days: 120,
    color: "#7C3AED",
    diseases: ["廃用症候群", "廃用"],
  },
  {
    key: "respiratory",
    name: "呼吸器リハビリテーション料",
    days: 90,
    color: "#0891B2",
    diseases: [
      "慢性閉塞性肺疾患", "COPD", "肺炎", "肺癌術後",
      "肺がん術後", "気管支喘息", "気管支拡張症",
    ],
  },
  {
    key: "cardiac",
    name: "心大血管疾患リハビリテーション料",
    days: 150,
    color: "#DC2626",
    diseases: [
      "心筋梗塞", "心不全", "大動脈解離術後", "狭心症",
      "冠動脈バイパス術後", "弁膜症術後",
    ],
  },
];

const QUICK_DISEASES: { category: string; diseases: string[] }[] = [
  { category: "運動器", diseases: ["骨折", "変形性関節症", "靭帯損傷", "腰椎椎間板ヘルニア", "脊柱管狭窄症", "人工関節置換術後"] },
  { category: "脳血管", diseases: ["脳梗塞", "脳出血", "くも膜下出血", "脳腫瘍", "脊髄損傷"] },
  { category: "廃用",   diseases: ["廃用症候群"] },
  { category: "呼吸器", diseases: ["慢性閉塞性肺疾患", "肺炎", "肺癌術後"] },
  { category: "心大血管", diseases: ["心筋梗塞", "心不全", "大動脈解離術後"] },
];

const START_DATE_TYPES = [
  { value: "onset",        label: "発症日" },
  { value: "surgery",      label: "手術日" },
  { value: "exacerbation", label: "急性増悪日" },
] as const;

const REVISION_INFO = {
  latest: "2024年（令和6年）改定",
  points: [
    "リハビリテーション料の評価見直し：施設基準・届出要件の変更",
    "運動器リハビリテーション料：疾患別リハビリの対象疾患範囲が整理された",
    "脳血管疾患等リハビリ：標準的算定日数の延長申請に係る要件が明確化",
    "廃用症候群リハビリ：算定日数カウント方法の一部見直し",
    "リハビリテーション計画書：様式の更新および記載要件の整理",
  ],
};

const QA_LIST = [
  {
    q: "標準算定日数を超えた場合は算定できないのですか？",
    a: "標準算定日数を超えた場合でも、医師が「治療継続により状態の改善が期待できる」と判断した場合は、月に1回の適切な記録（リハ計画書の更新）を条件に引き続き算定できます。ただし、1日あたりの算定点数が逓減されます（疾患ごとに逓減率が異なります）。",
  },
  {
    q: "急性増悪した場合、起算日はどうなりますか？",
    a: "急性増悪が認められる場合、急性増悪した日を新たな起算日として算定日数をリセットできます。医師による急性増悪の診断と、診療録への記載が必要です。「前回の算定から3ヶ月以上経過している」などの要件があるため、詳細は保険請求担当者へ確認してください。",
  },
  {
    q: "複数の疾患がある場合、それぞれ別々に算定日数を起算できますか？",
    a: "原則として、患者に対するリハビリテーションは主たる疾患で1つの区分を算定します。ただし、明確に別の原因による状態の悪化（新たな骨折や脳卒中の再発など）があった場合は、改めて算定区分・起算日を設定できる場合があります。判断に迷う場合は主治医・保険担当者と確認することが重要です。",
  },
  {
    q: "リハビリ算定はいつから開始できますか（入院・外来）？",
    a: "急性期病院では医師の指示があれば入院当日からリハビリを開始して算定できます。外来では医師の指示（リハビリ処方）があれば外来受診日から算定可能です。ただし、疾患別リハビリテーション料の算定には施設基準（スタッフの専従要件等）の届出が必要です。",
  },
  {
    q: "1日あたりのリハビリ算定単位数に上限はありますか？",
    a: "原則として1日6単位（1単位20分）が上限です。ただし、特定の疾患（脳血管疾患等、廃用症候群など）では医師が必要と認める場合に9単位まで算定できる場合があります。施設の届出内容と患者の状態に応じて医師・コメディカルと確認してください。",
  },
  {
    q: "リハビリテーション計画書の更新頻度はどのくらいですか？",
    a: "疾患別リハビリテーション料の算定においては、定期的な（おおむね1ヶ月ごとの）リハビリテーション計画書の作成・更新が求められます。標準算定日数を超えている場合は月に1回以上の医師によるリハビリ内容の確認・計画書更新が必要です。",
  },
  {
    q: "運動器リハビリと脳血管リハビリを同じ患者に同日に算定できますか？",
    a: "同一患者に複数の疾患別リハビリテーションを同日に算定することは原則できません（同日の重複算定の禁止）。ただし、複数の独立した疾患がある場合でも、主たる疾患による疾患別リハビリ料として1つを選択して算定します。具体的な取り扱いは施設の保険担当者に確認することを推奨します。",
  },
  {
    q: "算定日数のカウントはどのようにしますか？",
    a: "算定日数は「起算日（発症日・手術日・急性増悪日）から暦日」でカウントします。リハビリを実施した日数ではなく、起算日からの経過日数で計算します。例えば、起算日から150日目がすでに経過していれば、その日以降の算定は標準算定日数を超えた扱いになります。",
  },
];

// 減算チェック項目
const DEDUCTION_ITEMS = [
  { id: "d1", label: "標準算定日数を超えている" },
  { id: "d2", label: "リハビリ実施計画書が期限内に作成されていない" },
  { id: "d3", label: "1日の単位数が上限を超えている（運動器・脳血管・廃用・呼吸器：上限9単位）" },
  { id: "d4", label: "専従の療法士要件を満たしていない" },
  { id: "d5", label: "医師の指示書がない" },
  { id: "d6", label: "患者への説明と同意が得られていない" },
];

// ══════════════════════════════════════════════════════════════════════════
// ユーティリティ関数
// ══════════════════════════════════════════════════════════════════════════

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to   + "T00:00:00");
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatJapanese(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function detectCategory(disease: string): RehabCategory | null {
  const d = disease.toLowerCase();
  const disuse = REHAB_CATEGORIES.find(c => c.key === "disuse");
  if (disuse?.diseases.some(kw => d.includes(kw.toLowerCase()))) return disuse;
  for (const cat of REHAB_CATEGORIES) {
    if (cat.key === "disuse") continue;
    if (cat.diseases.some(kw => d.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// 共通スタイルヘルパー
// ══════════════════════════════════════════════════════════════════════════

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition bg-white";

const labelCls = "block text-xs font-bold text-gray-700 mb-1";

function SectionHeader({ color, title }: { color: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full" style={{ background: color }} />
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Q&A アコーディオン
// ══════════════════════════════════════════════════════════════════════════

function QaItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left hover:bg-gray-50 transition px-1"
      >
        <span className="text-sm font-semibold text-gray-800 leading-relaxed">Q. {q}</span>
        <span className="text-gray-400 text-sm shrink-0 mt-0.5"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "" }}>▾</span>
      </button>
      {open && (
        <div className="pb-4 px-1">
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            A. {a}
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 結果行コンポーネント
// ══════════════════════════════════════════════════════════════════════════

function ResultRow({
  label, ok, detail,
}: { label: string; ok: boolean; detail: string }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${
      ok
        ? "bg-green-50 border-green-200"
        : "bg-red-50 border-red-200"
    }`}>
      <span
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${
          ok ? "bg-green-600" : "bg-red-500"
        }`}
      >
        {ok ? "○" : "×"}
      </span>
      <div>
        <p className={`text-sm font-bold ${ok ? "text-green-800" : "text-red-700"}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${ok ? "text-green-700" : "text-red-600"}`}>{detail}</p>
      </div>
    </div>
  );
}

// ── 残り日数の色・警告レベル ──────────────────────────────────────────────

function remainingColor(days: number) {
  if (days < 0)  return "#DC2626";
  if (days <= 7) return "#DC2626";
  if (days <= 14) return "#E85D04";
  return "#1B4332";
}

function PlanDeadlineRow({
  label, deadlineDate, today,
}: { label: string; deadlineDate: string; today: string }) {
  const rem = diffDays(today, deadlineDate);
  const color = remainingColor(rem);
  const overdue = rem < 0;
  const nearRed  = rem >= 0 && rem <= 7;
  const nearOrg  = rem >= 0 && rem > 7 && rem <= 14;

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${
      overdue  ? "bg-red-50 border-red-300" :
      nearRed  ? "bg-red-50 border-red-200" :
      nearOrg  ? "bg-orange-50 border-orange-200" :
                 "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-sm font-bold" style={{ color }}>
          {formatJapanese(deadlineDate)}
        </p>
      </div>
      {overdue ? (
        <p className="text-xs font-bold text-red-700">
          期限を過ぎています。至急作成・更新してください。
        </p>
      ) : (
        <p className="text-xs font-semibold" style={{ color }}>
          残り {rem} 日
          {nearRed && "　至急対応が必要です。"}
          {nearOrg && "　もうすぐ期限です。"}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ツール①：算定日数計算
// ══════════════════════════════════════════════════════════════════════════

function CalcTool() {
  const [disease,       setDisease]       = useState("");
  const [startDateType, setStartDateType] = useState<"onset" | "surgery" | "exacerbation">("onset");
  const [startDate,     setStartDate]     = useState("");
  const [today,         setToday]         = useState(todayStr());
  const [result,        setResult]        = useState<null | {
    category: RehabCategory | null;
    elapsed: number; remaining: number;
    deadlineDate: string; warning: "over" | "near" | null;
  }>(null);

  const calc = () => {
    if (!disease.trim() || !startDate || !today) return;
    const start = new Date(startDate + "T00:00:00");
    const now   = new Date(today     + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(now.getTime())) return;
    const elapsed  = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const category = detectCategory(disease);
    const stdDays  = category?.days ?? 150;
    const remaining = stdDays - elapsed;
    const dl = new Date(start.getTime() + stdDays * 86400000);
    const warning: "over" | "near" | null =
      remaining <= 0 ? "over" : remaining <= 60 ? "near" : null;
    setResult({ category, elapsed, remaining, deadlineDate: dl.toISOString().slice(0, 10), warning });
  };

  const reset = () => {
    setResult(null); setDisease(""); setStartDate(""); setToday(todayStr());
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">

        {/* 疾患名 */}
        <div>
          <label className={labelCls}>疾患名 <span className="text-red-500">*</span></label>
          <input type="text" value={disease} onChange={e => setDisease(e.target.value)}
            placeholder="例：脳梗塞、骨折、廃用症候群" className={inputCls} />
          <div className="mt-3 space-y-2">
            {QUICK_DISEASES.map(g => (
              <div key={g.category} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">{g.category}</span>
                {g.diseases.map(d => (
                  <button key={d} onClick={() => setDisease(d)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                      disease === d
                        ? "bg-[#E85D04] border-[#E85D04] text-white"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#E85D04] hover:text-[#E85D04]"
                    }`}>{d}</button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 起算日の種類 */}
        <div>
          <label className={labelCls}>起算日の種類</label>
          <div className="flex flex-wrap gap-4">
            {START_DATE_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="sdt" value={t.value}
                  checked={startDateType === t.value}
                  onChange={() => setStartDateType(t.value)}
                  className="accent-[#E85D04]" />
                <span className="text-sm text-gray-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 日付 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              起算日（{START_DATE_TYPES.find(t => t.value === startDateType)?.label}）
              <span className="text-red-500">*</span>
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>今日の日付</label>
            <input type="date" value={today} onChange={e => setToday(e.target.value)} className={inputCls} />
          </div>
        </div>

        <button onClick={calc} disabled={!disease.trim() || !startDate || !today}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
          算定日数を計算する
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {result.warning === "over" && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 px-5 py-4">
              <p className="text-sm font-bold text-red-700 leading-relaxed">
                標準算定日数を超えています。<br />延長申請または特別な指示書が必要です。
              </p>
            </div>
          )}
          {result.warning === "near" && (
            <div className="rounded-xl border-2 border-orange-400 bg-orange-50 px-5 py-4">
              <p className="text-sm font-bold leading-relaxed" style={{ color: "#E85D04" }}>
                算定期限まで60日以内です。<br />延長が必要な場合は医師への確認を行ってください。
              </p>
            </div>
          )}

          <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-sm"
            style={{ borderColor: result.category?.color ?? "#6B7280" }}>
            <div className="px-5 py-3 text-white text-sm font-bold"
              style={{ background: result.category?.color ?? "#6B7280" }}>
              {result.category?.name ?? "算定区分：不明（疾患名をご確認ください）"}
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "標準算定日数", value: result.category?.days ?? "—", unit: "日", color: "text-gray-900" },
                { label: "経過日数",     value: result.elapsed,               unit: "日", color: "text-gray-900" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
                  <p className={`text-2xl font-black ${color}`}>
                    {value}<span className="text-sm font-semibold text-gray-500 ml-0.5">{unit}</span>
                  </p>
                </div>
              ))}
              <div className="text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-gray-400 mb-1">残り算定可能日数</p>
                <p className="text-2xl font-black" style={{
                  color: result.remaining <= 0 ? "#DC2626" : result.remaining <= 60 ? "#E85D04" : "#1B4332",
                }}>
                  {result.remaining}<span className="text-sm font-semibold ml-0.5">日</span>
                </p>
              </div>
            </div>
            <div className="mx-5 border-t border-gray-100 pt-3 pb-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">算定期限日</span>
                <span className="font-bold text-gray-900">{formatJapanese(result.deadlineDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">延長申請の必要性</span>
                <span className="font-bold" style={{
                  color: result.warning === "over" ? "#DC2626" : result.warning === "near" ? "#E85D04" : "#15803D",
                }}>
                  {result.warning === "over" ? "要・延長申請または指示書確認" :
                   result.warning === "near" ? "要確認（60日以内）" : "現時点では不要"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 本ツールの計算結果は目安です。実際の算定可否・延長申請の要否は主治医・保険担当者にご確認ください。
          </p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline transition">
            条件をリセットする
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ツール②：初期・早期加算計算
// ══════════════════════════════════════════════════════════════════════════

function AdditionTool() {
  const [onsetDate,  setOnsetDate]  = useState("");
  const [admitDate,  setAdmitDate]  = useState("");
  const [rehaDate,   setRehaDate]   = useState("");
  const [catKey,     setCatKey]     = useState("musculo");
  const [result,     setResult]     = useState<null | {
    earlyDays: number; earlyOk: boolean;
    initDays:  number; initOk:  boolean;
  }>(null);

  const calc = () => {
    if (!onsetDate || !rehaDate) return;
    const earlyDays = diffDays(onsetDate, rehaDate);
    const earlyOk   = earlyDays <= 30;
    const initDays  = admitDate ? diffDays(admitDate, rehaDate) : -1;
    const initOk    = admitDate ? initDays <= 14 : false;
    setResult({ earlyDays, earlyOk, initDays, initOk });
  };

  const catLabel = REHAB_CATEGORIES.find(c => c.key === catKey)?.name ?? "";
  const catColor = REHAB_CATEGORIES.find(c => c.key === catKey)?.color ?? "#6B7280";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">

        {/* 算定区分 */}
        <div>
          <label className={labelCls}>算定区分 <span className="text-red-500">*</span></label>
          <select value={catKey} onChange={e => { setCatKey(e.target.value); setResult(null); }}
            className={inputCls}>
            {REHAB_CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 日付 */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>発症日または手術日 <span className="text-red-500">*</span></label>
            <input type="date" value={onsetDate} onChange={e => { setOnsetDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">早期加算の起算日として使用します</p>
          </div>
          <div>
            <label className={labelCls}>入院日（初期加算の判定に使用）</label>
            <input type="date" value={admitDate} onChange={e => { setAdmitDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">入力がない場合は初期加算の判定を省略します</p>
          </div>
          <div>
            <label className={labelCls}>リハビリ開始日 <span className="text-red-500">*</span></label>
            <input type="date" value={rehaDate} onChange={e => { setRehaDate(e.target.value); setResult(null); }}
              className={inputCls} />
          </div>
        </div>

        <button onClick={calc} disabled={!onsetDate || !rehaDate}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
          加算を確認する
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* 区分ラベル */}
          <div className="px-4 py-2 rounded-xl text-white text-xs font-bold"
            style={{ background: catColor }}>
            {catLabel}
          </div>

          {/* 早期加算 */}
          <ResultRow
            label={result.earlyOk ? "早期加算：取得可能" : "早期加算：取得不可"}
            ok={result.earlyOk}
            detail={
              result.earlyOk
                ? `発症・手術から ${result.earlyDays} 日目（基準：30日以内）`
                : `発症・手術から ${result.earlyDays} 日目（30日超過）`
            }
          />

          {/* 初期加算 */}
          {admitDate ? (
            <ResultRow
              label={result.initOk ? "初期加算：取得可能" : "初期加算：取得不可"}
              ok={result.initOk}
              detail={
                result.initOk
                  ? `入院 ${result.initDays} 日目にリハ開始（基準：14日以内）`
                  : `入院 ${result.initDays} 日目にリハ開始（14日超過）`
              }
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">初期加算：入院日を入力すると判定できます</p>
            </div>
          )}

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 加算の取得可否は施設基準・届出内容によっても異なります。医事課・保険担当者にご確認ください。
          </p>
          <button onClick={() => { setResult(null); setOnsetDate(""); setAdmitDate(""); setRehaDate(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition">
            リセットする
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ツール③：減算チェックリスト
// ══════════════════════════════════════════════════════════════════════════

function DeductionCheck() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const hasRisk = checked.size > 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          該当する項目にチェックを入れてください。
          1つでも該当する場合は減算の可能性があります。
        </p>

        <div className="space-y-3">
          {DEDUCTION_ITEMS.map(item => (
            <label
              key={item.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                checked.has(item.id)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id)}
                className="mt-0.5 accent-red-500 shrink-0 w-4 h-4"
              />
              <span className={`text-sm leading-relaxed ${
                checked.has(item.id) ? "font-semibold text-red-800" : "text-gray-700"
              }`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 警告・クリア */}
      {hasRisk ? (
        <div className="rounded-xl border-2 border-red-400 bg-red-50 px-5 py-4">
          <p className="text-sm font-bold text-red-700 leading-relaxed">
            減算の可能性があります。<br />
            担当医・医事課に確認してください。
          </p>
          <p className="text-xs text-red-600 mt-1">
            {checked.size}件の項目に該当しています
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-700">
            現時点で該当項目はありません。引き続き各要件の確認を行ってください。
          </p>
        </div>
      )}

      {checked.size > 0 && (
        <button onClick={() => setChecked(new Set())}
          className="text-xs text-gray-400 hover:text-gray-600 underline transition">
          チェックをリセットする
        </button>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 本チェックリストは参考情報です。実際の算定可否は施設基準・審査基準等により異なります。
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ツール④：計画書期限計算
// ══════════════════════════════════════════════════════════════════════════

function PlanTool() {
  const [rehaStart,     setRehaStart]     = useState("");
  const [planLastDate,  setPlanLastDate]  = useState("");
  const [splanLastDate, setSplanLastDate] = useState("");
  const [today,         setToday]         = useState(todayStr());
  const [result,        setResult]        = useState<null | {
    planFirst:  string;
    planNext:   string | null;
    splanFirst: string;
    splanNext:  string | null;
  }>(null);

  const calc = () => {
    if (!rehaStart || !today) return;
    const planFirst  = addMonths(rehaStart, 1);
    const planNext   = planLastDate  ? addMonths(planLastDate,  3) : null;
    const splanFirst = addMonths(rehaStart, 1);
    const splanNext  = splanLastDate ? addMonths(splanLastDate, 6) : null;
    setResult({ planFirst, planNext, splanFirst, splanNext });
  };

  const reset = () => {
    setResult(null);
    setRehaStart(""); setPlanLastDate(""); setSplanLastDate(""); setToday(todayStr());
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">

        <div>
          <label className={labelCls}>リハビリ開始日 <span className="text-red-500">*</span></label>
          <input type="date" value={rehaStart} onChange={e => { setRehaStart(e.target.value); setResult(null); }}
            className={inputCls} />
          <p className="text-[10px] text-gray-400 mt-1">初回作成期限の計算に使用します（開始から1ヶ月以内）</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>実施計画書 前回作成日</label>
            <input type="date" value={planLastDate} onChange={e => { setPlanLastDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">入力で次回更新期限（3ヶ月後）を計算</p>
          </div>
          <div>
            <label className={labelCls}>総合実施計画書 前回作成日</label>
            <input type="date" value={splanLastDate} onChange={e => { setSplanLastDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">入力で次回更新期限（6ヶ月後）を計算</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>今日の日付</label>
          <input type="date" value={today} onChange={e => { setToday(e.target.value); setResult(null); }}
            className={inputCls} />
        </div>

        <button onClick={calc} disabled={!rehaStart || !today}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
          計画書の期限を計算する
        </button>
      </div>

      {result && (
        <div className="space-y-4">

          {/* 実施計画書 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full text-white"
                style={{ background: "#1B4332" }}>実施計画書</span>
              <span className="text-xs text-gray-500">更新頻度：3ヶ月ごと</span>
            </div>
            <div className="space-y-2">
              <PlanDeadlineRow
                label="初回作成期限（リハ開始から1ヶ月以内）"
                deadlineDate={result.planFirst}
                today={today}
              />
              {result.planNext ? (
                <PlanDeadlineRow
                  label="次回更新期限（前回作成から3ヶ月以内）"
                  deadlineDate={result.planNext}
                  today={today}
                />
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">前回作成日を入力すると次回更新期限を表示します</p>
                </div>
              )}
            </div>
          </div>

          {/* 総合実施計画書 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full text-white"
                style={{ background: "#E85D04" }}>総合実施計画書</span>
              <span className="text-xs text-gray-500">更新頻度：6ヶ月ごと</span>
            </div>
            <div className="space-y-2">
              <PlanDeadlineRow
                label="初回作成期限（リハ開始から1ヶ月以内）"
                deadlineDate={result.splanFirst}
                today={today}
              />
              {result.splanNext ? (
                <PlanDeadlineRow
                  label="次回更新期限（前回作成から6ヶ月以内）"
                  deadlineDate={result.splanNext}
                  today={today}
                />
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">前回作成日を入力すると次回更新期限を表示します</p>
                </div>
              )}
            </div>
          </div>

          {/* 警告凡例 */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span><span className="font-bold text-red-600">赤：</span>残り7日以内または期限超過</span>
            <span><span className="font-bold" style={{ color: "#E85D04" }}>橙：</span>残り14日以内</span>
            <span><span className="font-bold text-[#1B4332]">緑：</span>余裕あり</span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 計算結果は目安です。実際の期限・要件は施設・審査機関の基準にご確認ください。
          </p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline transition">
            リセットする
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════

type ToolTab = "calc" | "addition" | "deduction" | "plan";

const TOOL_TABS: { id: ToolTab; label: string; sub: string }[] = [
  { id: "calc",      label: "算定日数計算",    sub: "標準算定・残り日数" },
  { id: "addition",  label: "初期・早期加算",  sub: "加算取得の確認" },
  { id: "deduction", label: "減算チェック",    sub: "リスク項目の確認" },
  { id: "plan",      label: "計画書期限",      sub: "実施・総合計画書" },
];

export default function ReimbursementPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>("calc");

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">

      {/* ── ヘッダー ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <a href="/learn" className="text-xs text-gray-400 hover:text-gray-600 transition">学習コンテンツ</a>
          <span className="text-gray-300 text-xs">›</span>
          <span className="text-xs text-gray-600 font-semibold">診療報酬・算定ガイド</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">診療報酬・算定ガイド</h1>
        <p className="text-sm text-gray-500 mt-1">算定日数計算・加算確認・減算チェック・計画書期限を一箇所で管理できます</p>
      </div>

      {/* ── ツールタブ ── */}
      <div className="mb-6">
        <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-2xl scrollbar-none">
          {TOOL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className={`font-black text-sm ${activeTab === t.id ? "" : "font-semibold"}`}>{t.label}</span>
              <span className="opacity-70 hidden sm:block mt-0.5">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ツールコンテンツ ── */}
      <section className="mb-10">
        {activeTab === "calc"      && (
          <>
            <SectionHeader color="#E85D04" title="算定日数計算ツール" />
            <CalcTool />
          </>
        )}
        {activeTab === "addition"  && (
          <>
            <SectionHeader color="#E85D04" title="初期・早期加算 計算ツール" />
            <AdditionTool />
          </>
        )}
        {activeTab === "deduction" && (
          <>
            <SectionHeader color="#DC2626" title="減算になるパターンのチェックリスト" />
            <DeductionCheck />
          </>
        )}
        {activeTab === "plan"      && (
          <>
            <SectionHeader color="#1B4332" title="実施計画書・総合実施計画書 期限計算ツール" />
            <PlanTool />
          </>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          診療報酬改訂情報
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <SectionHeader color="#1B4332" title="診療報酬改訂情報" />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "#1B4332" }}>
              最新改定
            </span>
            <span className="text-sm font-semibold text-gray-800">{REVISION_INFO.latest}</span>
          </div>
          <ul className="space-y-2 mb-5">
            {REVISION_INFO.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: "#1B4332" }}>{i + 1}</span>
                {point}
              </li>
            ))}
          </ul>
          <a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411.html"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition hover:opacity-80"
            style={{ borderColor: "#1B4332", color: "#1B4332" }}>
            厚生労働省 最新情報を確認する <span className="text-xs">→</span>
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          疾患別算定可否一覧表
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <SectionHeader color="#E85D04" title="疾患別算定可否一覧表" />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["疾患名","算定区分","標準算定日数","備考"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {([
                  { disease: "骨折",              cat: "運動器",   catKey: "musculo",     days: 150, note: "発症日または手術日を起算日とする" },
                  { disease: "変形性関節症",       cat: "運動器",   catKey: "musculo",     days: 150, note: "TKA・THA術後も同区分" },
                  { disease: "靭帯損傷",           cat: "運動器",   catKey: "musculo",     days: 150, note: "手術有無を問わず適用" },
                  { disease: "腰椎椎間板ヘルニア", cat: "運動器",   catKey: "musculo",     days: 150, note: "保存・手術療法どちらも対象" },
                  { disease: "脊柱管狭窄症",       cat: "運動器",   catKey: "musculo",     days: 150, note: "術後も同区分で算定" },
                  { disease: "人工関節置換術後",   cat: "運動器",   catKey: "musculo",     days: 150, note: "手術日が起算日" },
                  { disease: "脳梗塞",             cat: "脳血管",   catKey: "cerebro",     days: 180, note: "発症日が起算日" },
                  { disease: "脳出血",             cat: "脳血管",   catKey: "cerebro",     days: 180, note: "発症日が起算日" },
                  { disease: "くも膜下出血",       cat: "脳血管",   catKey: "cerebro",     days: 180, note: "術後は手術日からカウント可" },
                  { disease: "脳腫瘍",             cat: "脳血管",   catKey: "cerebro",     days: 180, note: "手術日または診断日を起算日とする" },
                  { disease: "脊髄損傷",           cat: "脳血管",   catKey: "cerebro",     days: 180, note: "発症日または手術日を起算日とする" },
                  { disease: "廃用症候群",         cat: "廃用",     catKey: "disuse",      days: 120, note: "廃用診断の確定日を起算日とする" },
                  { disease: "慢性閉塞性肺疾患",   cat: "呼吸器",   catKey: "respiratory", days: 90,  note: "急性増悪時は増悪日から再起算可" },
                  { disease: "肺炎",               cat: "呼吸器",   catKey: "respiratory", days: 90,  note: "入院時から算定開始が多い" },
                  { disease: "肺癌術後",           cat: "呼吸器",   catKey: "respiratory", days: 90,  note: "手術日が起算日" },
                  { disease: "心筋梗塞",           cat: "心大血管", catKey: "cardiac",     days: 150, note: "発症日または手術日が起算日" },
                  { disease: "心不全",             cat: "心大血管", catKey: "cardiac",     days: 150, note: "急性増悪時は増悪日から再起算可" },
                  { disease: "大動脈解離術後",     cat: "心大血管", catKey: "cardiac",     days: 150, note: "手術日が起算日" },
                ] as const).map((row, i) => {
                  const color = REHAB_CATEGORIES.find(c => c.key === row.catKey)?.color ?? "#6B7280";
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.disease}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: color }}>{row.cat}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{row.days}日</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          よくある算定ルール Q&A
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <SectionHeader color="#1B4332" title="よくある算定ルール Q&A" />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 divide-y divide-gray-200">
          {QA_LIST.map((item, i) => <QaItem key={i} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* 免責 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-8">
        <p className="text-xs font-bold text-amber-800 mb-1">ご利用にあたって</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          本ページの算定日数・ルールは、診療報酬の一般的な基準をもとに整理したものです。
          実際の算定可否・延長申請の要否については、必ず主治医・施設の保険請求担当者・
          社会保険診療報酬支払基金などにご確認ください。
          診療報酬は定期的に改定されるため、最新の告示・通知を参照することを推奨します。
        </p>
      </div>

    </main>
  );
}
