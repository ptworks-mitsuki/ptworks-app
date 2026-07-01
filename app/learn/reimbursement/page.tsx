"use client";

import { useState } from "react";

// ── 算定区分データ ────────────────────────────────────────────────────────

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

// よく使う疾患ボタン定義
const QUICK_DISEASES: { category: string; diseases: string[] }[] = [
  { category: "運動器", diseases: ["骨折", "変形性関節症", "靭帯損傷", "腰椎椎間板ヘルニア", "脊柱管狭窄症", "人工関節置換術後"] },
  { category: "脳血管", diseases: ["脳梗塞", "脳出血", "くも膜下出血", "脳腫瘍", "脊髄損傷"] },
  { category: "廃用", diseases: ["廃用症候群"] },
  { category: "呼吸器", diseases: ["慢性閉塞性肺疾患", "肺炎", "肺癌術後"] },
  { category: "心大血管", diseases: ["心筋梗塞", "心不全", "大動脈解離術後"] },
];

// 起算日種類
const START_DATE_TYPES = [
  { value: "onset",       label: "発症日" },
  { value: "surgery",     label: "手術日" },
  { value: "exacerbation", label: "急性増悪日" },
] as const;

// 診療報酬改訂情報
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

// Q&A データ
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

// ── 算定区分判定関数 ──────────────────────────────────────────────────────

function detectCategory(disease: string): RehabCategory | null {
  const d = disease.toLowerCase();
  // 廃用を最初に（他のカテゴリより先にマッチさせる）
  const disuse = REHAB_CATEGORIES.find(c => c.key === "disuse");
  if (disuse?.diseases.some(kw => d.includes(kw.toLowerCase()))) return disuse;

  for (const cat of REHAB_CATEGORIES) {
    if (cat.key === "disuse") continue;
    if (cat.diseases.some(kw => d.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

// ── today YYYY-MM-DD ──────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatJapaneseDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ── アコーディオン Q&A ─────────────────────────────────────────────────────

function QaItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left hover:bg-gray-50 transition px-1"
      >
        <span className="text-sm font-semibold text-gray-800 leading-relaxed">Q. {q}</span>
        <span className="text-gray-400 text-sm shrink-0 mt-0.5 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "" }}>▾</span>
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
// Page
// ══════════════════════════════════════════════════════════════════════════

export default function ReimbursementPage() {
  const [disease,       setDisease]       = useState("");
  const [startDateType, setStartDateType] = useState<"onset" | "surgery" | "exacerbation">("onset");
  const [startDate,     setStartDate]     = useState("");
  const [today,         setToday]         = useState(todayStr());
  const [result,        setResult]        = useState<null | {
    category: RehabCategory | null;
    elapsed: number;
    remaining: number;
    deadlineDate: string;
    warning: "over" | "near" | null;
  }>(null);

  const handleCalculate = () => {
    if (!disease.trim() || !startDate || !today) return;

    const start = new Date(startDate + "T00:00:00");
    const now   = new Date(today   + "T00:00:00");

    if (isNaN(start.getTime()) || isNaN(now.getTime())) return;

    const elapsed   = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const category  = detectCategory(disease);
    const stdDays   = category?.days ?? 150;
    const remaining = stdDays - elapsed;

    const deadlineDate = new Date(start.getTime() + stdDays * 24 * 60 * 60 * 1000);
    const deadlineDateStr = deadlineDate.toISOString().slice(0, 10);

    const warning: "over" | "near" | null =
      remaining <= 0 ? "over" :
      remaining <= 60 ? "near" :
      null;

    setResult({ category, elapsed, remaining, deadlineDate: deadlineDateStr, warning });
  };

  const handleReset = () => {
    setResult(null);
    setDisease("");
    setStartDate("");
    setToday(todayStr());
  };

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
        <p className="text-sm text-gray-500 mt-1">算定日数計算・疾患別区分・改訂情報を一覧で確認できます</p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          算定日数計算ツール
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: "#E85D04" }} />
          <h2 className="text-lg font-black text-gray-900">算定日数計算ツール</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">

          {/* ① 疾患名 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              疾患名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={disease}
              onChange={e => setDisease(e.target.value)}
              placeholder="例：脳梗塞、骨折、廃用症候群"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-gray-900 placeholder-gray-400 text-sm transition"
            />

            {/* よく使う疾患ボタン */}
            <div className="mt-3 space-y-2">
              {QUICK_DISEASES.map(group => (
                <div key={group.category} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">{group.category}</span>
                  {group.diseases.map(d => (
                    <button
                      key={d}
                      onClick={() => setDisease(d)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                        disease === d
                          ? "bg-[#E85D04] border-[#E85D04] text-white"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#E85D04] hover:text-[#E85D04]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ② 起算日の種類 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">起算日の種類</label>
            <div className="flex gap-4">
              {START_DATE_TYPES.map(t => (
                <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="startDateType"
                    value={t.value}
                    checked={startDateType === t.value}
                    onChange={() => setStartDateType(t.value)}
                    className="accent-[#E85D04]"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ③④ 日付入力 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                起算日（{START_DATE_TYPES.find(t => t.value === startDateType)?.label}）<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">今日の日付</label>
              <input
                type="date"
                value={today}
                onChange={e => setToday(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 focus:outline-none text-sm transition"
              />
            </div>
          </div>

          {/* 計算ボタン */}
          <button
            onClick={handleCalculate}
            disabled={!disease.trim() || !startDate || !today}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}
          >
            算定日数を計算する
          </button>
        </div>

        {/* ── 計算結果 ── */}
        {result && (
          <div className="mt-4 space-y-3">

            {/* 警告バナー */}
            {result.warning === "over" && (
              <div className="rounded-xl border-2 border-red-400 bg-red-50 px-5 py-4">
                <p className="text-sm font-bold text-red-700 leading-relaxed">
                  標準算定日数を超えています。<br />
                  延長申請または特別な指示書が必要です。
                </p>
              </div>
            )}
            {result.warning === "near" && (
              <div className="rounded-xl border-2 border-orange-400 bg-orange-50 px-5 py-4">
                <p className="text-sm font-bold leading-relaxed" style={{ color: "#E85D04" }}>
                  算定期限まで60日以内です。<br />
                  延長が必要な場合は医師への確認を行ってください。
                </p>
              </div>
            )}

            {/* 結果カード */}
            <div
              className="rounded-2xl border-2 bg-white overflow-hidden shadow-sm"
              style={{ borderColor: result.category?.color ?? "#6B7280" }}
            >
              {/* カードヘッダー */}
              <div className="px-5 py-3 text-white text-sm font-bold"
                style={{ background: result.category?.color ?? "#6B7280" }}>
                {result.category?.name ?? "算定区分：不明（疾患名を確認してください）"}
              </div>

              {/* カード本文 */}
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">標準算定日数</p>
                  <p className="text-2xl font-black text-gray-900">
                    {result.category?.days ?? "—"}
                    <span className="text-sm font-semibold text-gray-500 ml-0.5">日</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">経過日数</p>
                  <p className="text-2xl font-black text-gray-900">
                    {result.elapsed}
                    <span className="text-sm font-semibold text-gray-500 ml-0.5">日</span>
                  </p>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">残り算定可能日数</p>
                  <p
                    className="text-2xl font-black"
                    style={{
                      color: result.remaining <= 0 ? "#DC2626" :
                             result.remaining <= 60 ? "#E85D04" : "#1B4332",
                    }}
                  >
                    {result.remaining}
                    <span className="text-sm font-semibold ml-0.5">日</span>
                  </p>
                </div>
              </div>

              <div className="mx-5 border-t border-gray-100 pt-3 pb-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">算定期限日</span>
                  <span className="font-bold text-gray-900">{formatJapaneseDate(result.deadlineDate)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">延長申請の必要性</span>
                  <span
                    className="font-bold"
                    style={{
                      color: result.warning === "over" ? "#DC2626" :
                             result.warning === "near" ? "#E85D04" : "#15803D",
                    }}
                  >
                    {result.warning === "over" ? "要・延長申請または指示書確認" :
                     result.warning === "near" ? "要確認（60日以内）" : "現時点では不要"}
                  </span>
                </div>
              </div>
            </div>

            {/* 注意書き */}
            <p className="text-xs text-gray-400 leading-relaxed">
              ※ 本ツールの計算結果は目安です。実際の算定可否・延長申請の要否は主治医・保険担当者にご確認ください。
            </p>

            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition"
            >
              条件をリセットする
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          診療報酬改訂情報
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: "#1B4332" }} />
          <h2 className="text-lg font-black text-gray-900">診療報酬改訂情報</h2>
        </div>

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
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: "#1B4332" }}
                >
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>

          <a
            href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition hover:opacity-80"
            style={{ borderColor: "#1B4332", color: "#1B4332" }}
          >
            厚生労働省 最新情報を確認する
            <span className="text-xs">→</span>
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          疾患別算定可否一覧表
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: "#E85D04" }} />
          <h2 className="text-lg font-black text-gray-900">疾患別算定可否一覧表</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap">疾患名</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap">算定区分</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap">標準算定日数</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { disease: "骨折",              cat: "運動器",    days: 150, note: "発症日または手術日を起算日とする" },
                  { disease: "変形性関節症",       cat: "運動器",    days: 150, note: "TKA・THA術後も同区分" },
                  { disease: "靭帯損傷",           cat: "運動器",    days: 150, note: "手術有無を問わず適用" },
                  { disease: "腰椎椎間板ヘルニア", cat: "運動器",    days: 150, note: "保存・手術療法どちらも対象" },
                  { disease: "脊柱管狭窄症",       cat: "運動器",    days: 150, note: "術後も同区分で算定" },
                  { disease: "人工関節置換術後",   cat: "運動器",    days: 150, note: "手術日が起算日" },
                  { disease: "脳梗塞",             cat: "脳血管",    days: 180, note: "発症日が起算日" },
                  { disease: "脳出血",             cat: "脳血管",    days: 180, note: "発症日が起算日" },
                  { disease: "くも膜下出血",       cat: "脳血管",    days: 180, note: "術後は手術日からカウント可" },
                  { disease: "脳腫瘍",             cat: "脳血管",    days: 180, note: "手術日または診断日を起算日とする" },
                  { disease: "脊髄損傷",           cat: "脳血管",    days: 180, note: "発症日または手術日を起算日とする" },
                  { disease: "廃用症候群",         cat: "廃用",      days: 120, note: "廃用診断の確定日を起算日とする" },
                  { disease: "慢性閉塞性肺疾患",   cat: "呼吸器",    days: 90,  note: "急性増悪時は増悪日から再起算可" },
                  { disease: "肺炎",               cat: "呼吸器",    days: 90,  note: "入院時から算定開始が多い" },
                  { disease: "肺癌術後",           cat: "呼吸器",    days: 90,  note: "手術日が起算日" },
                  { disease: "心筋梗塞",           cat: "心大血管",  days: 150, note: "発症日または手術日が起算日" },
                  { disease: "心不全",             cat: "心大血管",  days: 150, note: "急性増悪時は増悪日から再起算可" },
                  { disease: "大動脈解離術後",     cat: "心大血管",  days: 150, note: "手術日が起算日" },
                ].map((row, i) => {
                  const catColor = REHAB_CATEGORIES.find(c =>
                    (row.cat === "運動器" && c.key === "musculo") ||
                    (row.cat === "脳血管" && c.key === "cerebro") ||
                    (row.cat === "廃用"   && c.key === "disuse") ||
                    (row.cat === "呼吸器" && c.key === "respiratory") ||
                    (row.cat === "心大血管" && c.key === "cardiac")
                  )?.color ?? "#6B7280";

                  return (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.disease}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: catColor }}>
                          {row.cat}
                        </span>
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
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: "#1B4332" }} />
          <h2 className="text-lg font-black text-gray-900">よくある算定ルール Q&A</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 divide-y divide-gray-200">
          {QA_LIST.map((item, i) => (
            <QaItem key={i} q={item.q} a={item.a} />
          ))}
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
