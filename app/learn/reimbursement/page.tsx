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
  latest: "令和8年度（2026年）診療報酬改訂",
  施行日: "2026年6月1日",
  points: [
    "早期リハ加算の算定期間が「発症から30日以内」から「入院から14日以内」に短縮",
    "入院1〜3日目の早期リハ加算点数が25点から60点に引き上げ（入院4〜14日目は25点を維持）",
    "休日リハビリテーション加算（25点/単位）が新設（発症・手術・急性増悪から30日以内の土日祝）",
    "離床を伴わないリハビリへの10%減算が新設（所定点数の90%算定・1日2単位まで）",
    "リハビリ総合実施計画料が「初回」と「2回目以降」に区分化",
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
interface DeductionItem {
  id: string;
  label: string;
  note?: string;
}

const DEDUCTION_ITEMS: DeductionItem[] = [
  { id: "d1", label: "標準算定日数を超えている" },
  { id: "d2", label: "リハビリ実施計画書が期限内に作成されていない" },
  { id: "d3", label: "1日の単位数が上限を超えている（運動器・脳血管・廃用・呼吸器：上限9単位）" },
  { id: "d4", label: "専従の療法士要件を満たしていない" },
  { id: "d5", label: "医師の指示書がない" },
  { id: "d6", label: "患者への説明と同意が得られていない" },
  {
    id: "d7",
    label: "離床を伴わずにリハビリを実施した（2026年6月〜新設）",
    note: "所定点数の90%で算定・1日2単位まで（離床なしリハビリ減算）",
  },
];

// ── 算定日数計算ツール用の結果型 ──────────────────────────────────────────

interface ResultItem {
  cat:           RehabCategory;
  startDate:     string;
  elapsed:       number;
  remaining:     number;
  deadlineDate:  string;
}

// ── 区分別入力設定 ─────────────────────────────────────────────────────────

interface ExampleLine {
  text:   string;
  color?: "red" | "green";
}

interface CatInputConfig {
  inputLabel: string;
  warnLines:  string[];
  examples:   ExampleLine[];
  extra?:     ExampleLine[];
}

const CAT_INPUT_CONFIG: Record<string, CatInputConfig> = {
  musculo: {
    inputLabel: "発症日・手術日・急性増悪日（いずれか該当する日を入力）",
    warnLines: [
      "診断日ではなく発症日・手術日・急性増悪日を入力してください。",
      "入力日がずれると算定日数が正しく計算されません。",
    ],
    examples: [
      { text: "骨折手術 → 手術日を入力" },
      { text: "捻挫・靭帯損傷 → 受傷日を入力" },
      { text: "変形性関節症の急性増悪 → 増悪日を入力" },
    ],
  },
  cerebro: {
    inputLabel: "発症日・手術日・急性増悪日（いずれか該当する日を入力）",
    warnLines: [
      "診断日ではなく発症日を入力してください。",
      "入力日がずれると算定日数が正しく計算されません。",
    ],
    examples: [
      { text: "脳梗塞 → 発症日を入力" },
      { text: "脳出血 → 出血確認日を入力" },
      { text: "脳腫瘍術後 → 手術日を入力" },
      { text: "脊髄損傷 → 受傷日を入力" },
    ],
  },
  disuse: {
    inputLabel: "廃用症候群の診断日",
    warnLines: [
      "発症日・入院日ではなく、医師が廃用症候群と診断した日を入力してください。",
      "入力日がずれると算定日数が正しく計算されません。",
    ],
    examples: [
      { text: "× 7/1 肺炎発症日 → 入力しない", color: "red" },
      { text: "× 7/3 入院日　　 → 入力しない", color: "red" },
      { text: "○ 7/8 廃用症候群診断日 → この日を入力する", color: "green" },
    ],
  },
  respiratory: {
    inputLabel: "呼吸器疾患の発症日・手術日・急性増悪日（いずれか該当する日を入力）",
    warnLines: [
      "廃用症候群と同一患者の場合、起算日が異なります。",
      "呼吸器リハは原疾患の発症日が起算日です。廃用リハの起算日（診断日）と混同しないようにご注意ください。",
      "入力日がずれると算定日数が正しく計算されません。",
    ],
    examples: [
      { text: "肺炎 → 肺炎の発症日を入力" },
      { text: "COPD急性増悪 → 増悪日を入力" },
      { text: "肺がん術後 → 手術日を入力" },
    ],
    extra: [
      { text: "廃用と同時算定の場合の例" },
      { text: "7/1 肺炎発症 → 呼吸器リハの起算日", color: "green" },
      { text: "7/8 廃用診断 → 廃用リハの起算日", color: "green" },
      { text: "→ 同じ患者でも起算日が異なります" },
    ],
  },
  cardiac: {
    inputLabel: "発症日・手術日・急性増悪日（いずれか該当する日を入力）",
    warnLines: [
      "診断日ではなく発症日・手術日・急性増悪日を入力してください。",
      "入力日がずれると算定日数が正しく計算されません。",
    ],
    examples: [
      { text: "心筋梗塞 → 発症日を入力" },
      { text: "心臓手術後 → 手術日を入力" },
      { text: "心不全急性増悪 → 増悪日を入力" },
    ],
  },
};

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

// ── 加算サブコンポーネント ─────────────────────────────────────────────────

function EarlyRehabResult({ admitDate, today }: { admitDate: string; today: string }) {
  const days   = diffDays(admitDate, today);
  const dayNum = days + 1;
  const eligible = dayNum >= 1 && dayNum <= 14;
  const points    = dayNum <= 3 ? 60 : eligible ? 25 : 0;
  const remaining = eligible ? 14 - dayNum : 0;
  const rangeLabel = dayNum <= 3 ? "（入院1〜3日目）" : "（入院4〜14日目）";

  return (
    <div className={`rounded-xl p-4 border ${eligible ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <p className={`text-sm font-bold ${eligible ? "text-green-800" : "text-red-700"}`}>
        早期リハビリテーション加算：{eligible ? "取得可能" : "取得不可"}
      </p>
      <p className={`text-xs mt-1 ${eligible ? "text-green-700" : "text-red-600"}`}>
        今日は入院{dayNum}日目
        {eligible
          ? `（14日以内）　残り${remaining}日取得可能`
          : "（14日超過・加算対象外）"}
      </p>
      {eligible && (
        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-white"
          style={{ background: "#E85D04" }}>
          {points}点 / 単位
          <span className="font-normal opacity-90">{rangeLabel}</span>
        </div>
      )}
    </div>
  );
}

function HolidayRehabResult({ onsetDate, today }: { onsetDate: string; today: string }) {
  const days         = diffDays(onsetDate, today);
  const dayNum       = days + 1;
  const withinPeriod = dayNum >= 1 && dayNum <= 30;
  const remaining    = Math.max(0, 30 - dayNum);
  const todayIsHoliday = isWeekendOrHoliday(today);

  return (
    <div className={`rounded-xl p-4 border ${withinPeriod ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
      <p className={`text-sm font-bold ${withinPeriod ? "text-green-800" : "text-gray-600"}`}>
        発症から{dayNum}日目
        {withinPeriod ? `（30日以内）　残り${remaining}日取得可能` : "（30日超過・取得期間終了）"}
      </p>
      {withinPeriod && (
        <div className="mt-2 space-y-1">
          <p className={`text-xs font-semibold ${todayIsHoliday ? "text-green-700" : "text-gray-500"}`}>
            今日（{dayOfWeekLabel(today)}）は
            {todayIsHoliday ? "土日祝日です。加算取得の対象日です。" : "平日です。休日リハ加算の対象外です。"}
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black text-white"
            style={{ background: "#1B4332" }}>
            25点 / 単位（土日祝日のみ）
          </div>
        </div>
      )}
    </div>
  );
}

// ── CalcTool 本体 ─────────────────────────────────────────────────────────

function CalcTool() {
  const [step,          setStep]          = useState<1 | 2 | 3>(1);
  const [selectedCats,  setSelectedCats]  = useState<string[]>([]);
  const [startDates,    setStartDates]    = useState<Record<string, string>>({});
  const [today,         setToday]         = useState(todayStr());
  const [results,       setResults]       = useState<ResultItem[]>([]);
  const [showAddition,  setShowAddition]  = useState(false);
  const [admitDate,     setAdmitDate]     = useState("");
  const [addOnsetDate,  setAddOnsetDate]  = useState("");

  const toggleCat = (key: string) =>
    setSelectedCats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const canCalc = selectedCats.every(k => !!startDates[k]) && !!today;

  const calc = () => {
    if (!canCalc) return;
    const items: ResultItem[] = selectedCats.map(key => {
      const cat     = REHAB_CATEGORIES.find(c => c.key === key)!;
      const sd      = startDates[key];
      const elapsed = Math.max(0, diffDays(sd, today));
      const remaining = cat.days - elapsed;
      const dl = new Date(new Date(sd + "T00:00:00").getTime() + cat.days * 86400000);
      return { cat, startDate: sd, elapsed, remaining, deadlineDate: dl.toISOString().slice(0, 10) };
    });
    setResults(items);
    setStep(3);
  };

  const reset = () => {
    setStep(1); setSelectedCats([]); setStartDates({}); setToday(todayStr());
    setResults([]); setShowAddition(false); setAdmitDate(""); setAddOnsetDate("");
  };

  const barColor = (remaining: number) => {
    if (remaining >= 60) return "#16a34a";
    if (remaining >= 30) return "#E85D04";
    return "#DC2626";
  };

  const warnStyle: React.CSSProperties = {
    background: "#FFF3E0",
    border: "1px solid #FFCC80",
    borderLeftWidth: "4px",
    borderLeftColor: "#E85D04",
  };

  return (
    <div className="space-y-5">

      {/* ── ステップ1：区分選択 ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">ステップ 1</p>
            <h3 className="text-base font-black text-gray-900">算定するリハビリの種類を選択</h3>
            <p className="text-xs text-gray-400 mt-0.5">複数選択できます</p>
          </div>

          <div className="space-y-2">
            {REHAB_CATEGORIES.map(cat => {
              const sel = selectedCats.includes(cat.key);
              return (
                <button key={cat.key} onClick={() => toggleCat(cat.key)}
                  className="w-full text-left rounded-xl border px-4 py-3.5 transition-all"
                  style={{
                    background:   sel ? "#FFF7ED" : "white",
                    borderColor:  sel ? "#E85D04" : "#e5e7eb",
                    boxShadow:    sel ? "0 0 0 1px #E85D04" : undefined,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{ borderColor: sel ? "#E85D04" : "#d1d5db", background: sel ? "#E85D04" : "white" }}>
                      {sel && (
                        <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                          <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">標準算定日数：{cat.days}日</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button onClick={() => selectedCats.length > 0 && setStep(2)}
            disabled={selectedCats.length === 0}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
            次へ（起算日を入力する）
            {selectedCats.length > 0 && `　（${selectedCats.length}件選択中）`}
          </button>
        </div>
      )}

      {/* ── ステップ2：日付入力 ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">ステップ 2</p>
              <h3 className="text-base font-black text-gray-900">起算日を入力してください</h3>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 transition">
              ← 戻る
            </button>
          </div>

          {/* 基準日 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
            <label className={labelCls}>今日の日付（基準日）<span className="text-red-500 ml-0.5">*</span></label>
            <input type="date" value={today} onChange={e => setToday(e.target.value)} className={inputCls} />
          </div>

          {/* 区分別入力 */}
          {selectedCats.map(key => {
            const cat    = REHAB_CATEGORIES.find(c => c.key === key)!;
            const config = CAT_INPUT_CONFIG[key];
            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                {/* ヘッダー */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-bold"
                  style={{ background: cat.color }}>
                  {cat.name}
                  <span className="text-white/70 text-xs font-normal">
                    （標準算定日数：{cat.days}日）
                  </span>
                </div>

                {/* 注意ボックス */}
                <div className="rounded-xl px-4 py-3 space-y-1" style={warnStyle}>
                  <p className="text-xs font-bold" style={{ color: "#E85D04" }}>注意</p>
                  {config.warnLines.map((line, i) => (
                    <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>
                  ))}
                </div>

                {/* 日付入力 */}
                <div>
                  <label className={labelCls}>
                    {config.inputLabel}<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input type="date"
                    value={startDates[key] ?? ""}
                    onChange={e => setStartDates(prev => ({ ...prev, [key]: e.target.value }))}
                    className={inputCls} />
                </div>

                {/* 入力例 */}
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-gray-500 mb-1">入力例</p>
                  {config.examples.map((ex, i) => (
                    <p key={i} className="text-xs leading-relaxed"
                      style={{
                        color:      ex.color === "red" ? "#DC2626" : ex.color === "green" ? "#16a34a" : "#374151",
                        fontWeight: ex.color ? 600 : 400,
                      }}>
                      {ex.text}
                    </p>
                  ))}
                  {config.extra && (
                    <div className="mt-2 pl-2 border-l-2 border-gray-200 space-y-0.5">
                      {config.extra.map((ex, i) => (
                        <p key={i} className="text-xs leading-relaxed"
                          style={{
                            color:      ex.color === "red" ? "#DC2626" : ex.color === "green" ? "#16a34a" : "#374151",
                            fontWeight: ex.color ? 600 : 400,
                          }}>
                          {ex.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={calc} disabled={!canCalc}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
            算定日数を計算する
          </button>
        </div>
      )}

      {/* ── ステップ3：結果 ─────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">計算結果</p>
              <h3 className="text-base font-black text-gray-900">算定日数の一覧</h3>
            </div>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 transition">
              最初からやり直す
            </button>
          </div>

          {results.map(item => {
            const pct       = Math.max(0, Math.min(100, (item.elapsed / item.cat.days) * 100));
            const color     = barColor(item.remaining);
            const isOver    = item.remaining < 0;
            const isRed     = !isOver && item.remaining < 30;
            const isOrange  = item.remaining >= 30 && item.remaining < 60;

            return (
              <div key={item.cat.key}
                className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm"
                style={{ borderColor: item.cat.color }}>
                {/* カードヘッダー */}
                <div className="px-5 py-3 text-white text-sm font-bold"
                  style={{ background: item.cat.color }}>
                  {item.cat.name}
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* アラート */}
                  {isOver && (
                    <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3">
                      <p className="text-sm font-bold text-red-700">
                        標準算定日数を超えています。延長申請または特別な指示書が必要です。
                      </p>
                    </div>
                  )}
                  {isRed && (
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3">
                      <p className="text-sm font-bold text-red-700">
                        算定期限まで30日以内です。至急対応が必要です。
                      </p>
                    </div>
                  )}
                  {isOrange && (
                    <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3">
                      <p className="text-sm font-bold" style={{ color: "#E85D04" }}>
                        算定期限まで60日以内です。延長が必要な場合は医師への確認を行ってください。
                      </p>
                    </div>
                  )}

                  {/* 起算日 */}
                  <div>
                    <p className="text-xs text-gray-400">起算日</p>
                    <p className="font-bold text-gray-900 text-sm">{formatJapanese(item.startDate)}</p>
                  </div>

                  {/* 3列数値 */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "標準算定日数", val: item.cat.days, unit: "日",   col: "#111827" },
                      { label: "経過日数",     val: item.elapsed,  unit: "日目", col: "#111827" },
                      { label: "残り日数",     val: Math.abs(item.remaining),
                        unit: isOver ? "日超過" : "日", col: color },
                    ].map(({ label, val, unit, col }) => (
                      <div key={label}
                        className="text-center p-3 rounded-xl"
                        style={{ background: label === "残り日数" && isOver ? "#FEF2F2" : "#F9FAFB" }}>
                        <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
                        <p className="text-xl font-black" style={{ color: col }}>
                          {val}<span className="text-[10px] font-semibold text-gray-500 ml-0.5">{unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* プログレスバー */}
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>起算日</span><span>算定期限</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{formatJapanese(item.startDate)}</span>
                      <span>{formatJapanese(item.deadlineDate)}</span>
                    </div>
                  </div>

                  {/* 算定期限 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">算定期限</span>
                    <span className="font-bold text-gray-900 text-sm">{formatJapanese(item.deadlineDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 加算計算（任意） */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setShowAddition(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
              <div>
                <p className="text-sm font-black text-gray-900 text-left">加算の計算（任意）</p>
                <p className="text-xs text-gray-400 mt-0.5 text-left">早期リハ加算・休日リハ加算の確認</p>
              </div>
              <span className="text-gray-400 text-sm"
                style={{ display: "inline-block", transform: showAddition ? "rotate(180deg)" : "" }}>
                ▾
              </span>
            </button>

            {showAddition && (
              <div className="px-5 pb-5 space-y-6 border-t border-gray-100">

                {/* 早期リハビリテーション加算 */}
                <div className="pt-5 space-y-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">早期リハビリテーション加算</p>
                    <p className="text-xs text-gray-400 mt-0.5">入院1〜3日目：60点/単位　入院4〜14日目：25点/単位</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 space-y-1" style={warnStyle}>
                    <p className="text-xs font-bold" style={{ color: "#E85D04" }}>注意</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      算定日数の起算日とは別管理です。早期リハ加算は発症日ではなく入院日から14日以内が対象です。発症日を入力すると正しく計算されません。
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>入院日 <span className="text-red-500">*</span></label>
                    <input type="date" value={admitDate} onChange={e => setAdmitDate(e.target.value)}
                      className={inputCls} />
                  </div>
                  {admitDate && today && (
                    <EarlyRehabResult admitDate={admitDate} today={today} />
                  )}
                </div>

                {/* 休日リハビリテーション加算 */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">休日リハビリテーション加算</p>
                    <p className="text-xs text-gray-400 mt-0.5">25点/単位　発症日から30日以内の土日祝日が対象</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 space-y-1" style={warnStyle}>
                    <p className="text-xs font-bold" style={{ color: "#E85D04" }}>注意</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      早期リハ加算（入院日基準）と起算日が異なります。休日リハ加算は発症日から30日以内が対象です。早期リハ加算の起算日（入院日）と混同しないようにご注意ください。
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>発症日・手術日・急性増悪日</label>
                    <input type="date"
                      value={addOnsetDate || (results.length === 1 ? results[0].startDate : "")}
                      onChange={e => setAddOnsetDate(e.target.value)}
                      className={inputCls} />
                    {results.length === 1 && !addOnsetDate && (
                      <button onClick={() => setAddOnsetDate(results[0].startDate)}
                        className="mt-1 text-xs underline hover:no-underline" style={{ color: "#E85D04" }}>
                        算定日数の起算日（{formatJapanese(results[0].startDate)}）を使用する
                      </button>
                    )}
                  </div>
                  {(addOnsetDate || (results.length === 1 && results[0].startDate)) && today && (
                    <HolidayRehabResult
                      onsetDate={addOnsetDate || results[0].startDate}
                      today={today} />
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 本ツールの計算結果は目安です。実際の算定可否・延長申請の要否は主治医・保険担当者にご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ツール②：初期・早期加算 / 休日リハ加算計算（2026年改訂対応）
// ══════════════════════════════════════════════════════════════════════════

// 日本の祝日判定（2026年の主要祝日を含む固定日）
function isHoliday(dateStr: string): boolean {
  // 年単位で判定する固定祝日（振替は近似）
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  // 固定祝日
  const fixed: [number, number][] = [
    [1,1],[1,2],[1,3],  // 元日・正月
    [2,11],[2,23],       // 建国記念日・天皇誕生日
    [3,20],[4,29],       // 春分（近似）・昭和の日
    [5,3],[5,4],[5,5],   // 憲法記念日・みどりの日・こどもの日
    [7,21],              // 海の日（第3月曜 近似）
    [8,11],              // 山の日
    [9,15],[9,23],       // 敬老の日（第3月曜 近似）・秋分（近似）
    [10,13],             // スポーツの日（第2月曜 近似）
    [11,3],[11,23],      // 文化の日・勤労感謝の日
  ];
  return fixed.some(([fm, fd]) => m === fm && day === fd);
}

function isWeekendOrHoliday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); // 0=日 6=土
  return dow === 0 || dow === 6 || isHoliday(dateStr);
}

function dayOfWeekLabel(dateStr: string): string {
  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  const d = new Date(dateStr + "T00:00:00");
  return labels[d.getDay()];
}

function AdditionTool() {
  const [onsetDate,   setOnsetDate]   = useState("");   // 発症日・手術日・急性増悪日（休日加算の起算日）
  const [admitDate,   setAdmitDate]   = useState("");   // 入院日（早期リハ加算の起算日）
  const [rehaDate,    setRehaDate]    = useState("");   // リハビリ実施日
  const [catKey,      setCatKey]      = useState("musculo");
  const [result,      setResult]      = useState<null | {
    // 早期リハ加算（2026年〜）
    earlyAdmitDays:   number;   // 入院からの日数
    earlyOk:          boolean;  // 14日以内
    earlyPoints:      number;   // 60点 or 25点
    // 初期加算（入院14日以内）
    initDays:         number;
    initOk:           boolean;
    // 休日リハ加算（2026年新設）
    onsetDays:        number;   // 発症からの日数
    holidayRehab:     boolean;  // 土日祝
    holidayOk:        boolean;  // 30日以内 かつ 土日祝
  }>(null);

  const calc = () => {
    if (!admitDate || !rehaDate) return;

    // 早期リハ加算：入院日からの日数で判定（2026年新基準）
    const earlyAdmitDays = diffDays(admitDate, rehaDate);
    const earlyOk        = earlyAdmitDays <= 14;
    const earlyPoints    = earlyAdmitDays <= 3 ? 60 : 25;

    // 初期加算：入院から14日以内（早期リハ加算と同じ起算日）
    const initDays = earlyAdmitDays;
    const initOk   = earlyOk;

    // 休日リハ加算：発症日からの日数 & 土日祝判定
    const onsetDays  = onsetDate ? diffDays(onsetDate, rehaDate) : -1;
    const holidayRehab = isWeekendOrHoliday(rehaDate);
    const holidayOk  = onsetDate ? (onsetDays <= 30 && holidayRehab) : false;

    setResult({ earlyAdmitDays, earlyOk, earlyPoints, initDays, initOk, onsetDays, holidayRehab, holidayOk });
  };

  const catLabel = REHAB_CATEGORIES.find(c => c.key === catKey)?.name ?? "";
  const catColor = REHAB_CATEGORIES.find(c => c.key === catKey)?.color ?? "#6B7280";
  const dow      = rehaDate ? `（${dayOfWeekLabel(rehaDate)}）` : "";

  return (
    <div className="space-y-5">

      {/* 2026年改訂バッジ */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs font-bold text-blue-800 mb-0.5">2026年6月1日施行 改訂対応版</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          早期リハ加算の起算日が「発症日」から「入院日」に変更されました。
          入院1〜3日目は60点、4〜14日目は25点です。
        </p>
      </div>

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

        {/* 日付入力 */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>
              入院日 <span className="text-red-500">*</span>
              <span className="ml-1 text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                早期リハ加算の起算日（2026年〜）
              </span>
            </label>
            <input type="date" value={admitDate}
              onChange={e => { setAdmitDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
              転院患者の場合は、前医の医療機関に入院した日を起算日としてください。
            </p>
          </div>
          <div>
            <label className={labelCls}>
              発症日・手術日・急性増悪日
              <span className="ml-1 text-[10px] font-normal text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                休日リハ加算の起算日
              </span>
            </label>
            <input type="date" value={onsetDate}
              onChange={e => { setOnsetDate(e.target.value); setResult(null); }}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">
              入力すると休日リハビリテーション加算の判定を行います（早期リハ加算とは起算日が異なります）
            </p>
          </div>
          <div>
            <label className={labelCls}>リハビリ実施日 <span className="text-red-500">*</span></label>
            <input type="date" value={rehaDate}
              onChange={e => { setRehaDate(e.target.value); setResult(null); }}
              className={inputCls} />
            {rehaDate && (
              <p className="text-[10px] mt-1" style={{
                color: isWeekendOrHoliday(rehaDate) ? "#1B4332" : "#6B7280",
              }}>
                {rehaDate}{dow}
                {isWeekendOrHoliday(rehaDate) ? "　— 土日祝日です" : "　— 平日です"}
              </p>
            )}
          </div>
        </div>

        <button onClick={calc} disabled={!admitDate || !rehaDate}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #E85D04, #c44b00)" }}>
          加算を確認する
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* 算定区分バッジ */}
          <div className="px-4 py-2 rounded-xl text-white text-xs font-bold"
            style={{ background: catColor }}>
            {catLabel}
          </div>

          {/* 早期リハ加算（2026年新基準） */}
          <div className={`rounded-xl border p-4 space-y-2 ${
            result.earlyOk ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-start gap-3">
              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${
                result.earlyOk ? "bg-green-600" : "bg-red-500"
              }`}>
                {result.earlyOk ? "○" : "×"}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${result.earlyOk ? "text-green-800" : "text-red-700"}`}>
                  早期リハビリテーション加算：{result.earlyOk ? "取得可能" : "取得不可"}
                </p>
                <p className={`text-xs mt-0.5 ${result.earlyOk ? "text-green-700" : "text-red-600"}`}>
                  入院 {result.earlyAdmitDays} 日目にリハ実施
                  {result.earlyOk
                    ? `（基準：入院14日以内）`
                    : `（14日超過）`}
                </p>
                {result.earlyOk && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white"
                    style={{ background: "#E85D04" }}>
                    加算点数：{result.earlyPoints}点 / 単位
                    <span className="font-normal opacity-90">
                      {result.earlyAdmitDays <= 3 ? "（入院1〜3日目）" : "（入院4〜14日目）"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 初期加算（早期リハと同じ起算日・14日以内） */}
          <ResultRow
            label={result.initOk ? "初期加算：取得可能" : "初期加算：取得不可"}
            ok={result.initOk}
            detail={
              result.initOk
                ? `入院 ${result.initDays} 日目にリハ開始（基準：入院14日以内）`
                : `入院 ${result.initDays} 日目にリハ開始（14日超過）`
            }
          />

          {/* 休日リハ加算（2026年新設） */}
          {onsetDate ? (
            <div className={`rounded-xl border p-4 space-y-2 ${
              result.holidayOk ? "bg-green-50 border-green-200" :
              result.holidayRehab && result.onsetDays > 30 ? "bg-gray-50 border-gray-200" :
              "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${
                  result.holidayOk ? "bg-green-600" : "bg-gray-400"
                }`}>
                  {result.holidayOk ? "○" : "×"}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-bold ${result.holidayOk ? "text-green-800" : "text-gray-600"}`}>
                      休日リハビリテーション加算（新設）：{result.holidayOk ? "取得可能" : "取得不可"}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-blue-500">
                      2026年6月〜
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${result.holidayOk ? "text-green-700" : "text-gray-500"}`}>
                    {result.holidayRehab ? "土日祝日に実施" : "平日のため対象外"}
                    {" / "}
                    発症・手術から {result.onsetDays} 日目
                    {result.onsetDays <= 30 ? "（30日以内）" : "（30日超過）"}
                  </p>
                  {result.holidayOk && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white"
                      style={{ background: "#1B4332" }}>
                      加算点数：25点 / 単位（早期加算・初期加算との併算定可）
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">
                休日リハ加算（2026年新設）：発症日・手術日・急性増悪日を入力すると判定します
              </p>
            </div>
          )}

          {/* 起算日の違いに関する注意書き */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-amber-800">起算日についての注意</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              早期リハ加算の起算日は「入院日」、休日リハ加算の起算日は「発症日・手術日・急性増悪日」です。
              転院患者の場合、早期リハ加算の起算日は前医の入院日としてください。
            </p>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 加算の取得可否は施設基準・届出内容によっても異なります。医事課・保険担当者にご確認ください。
          </p>
          <button
            onClick={() => { setResult(null); setOnsetDate(""); setAdmitDate(""); setRehaDate(""); }}
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
              <span className="flex-1">
                <span className={`text-sm leading-relaxed block ${
                  checked.has(item.id) ? "font-semibold text-red-800" : "text-gray-700"
                }`}>
                  {item.label}
                </span>
                {item.note && (
                  <span className="text-[11px] leading-relaxed mt-0.5 block text-amber-700 bg-amber-50 rounded px-2 py-1">
                    {item.note}
                  </span>
                )}
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
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <a href="/learn" className="text-xs text-gray-400 hover:text-gray-600 transition">学習コンテンツ</a>
          <span className="text-gray-300 text-xs">›</span>
          <span className="text-xs text-gray-600 font-semibold">診療報酬・算定ガイド</span>
        </div>
        <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.25 }}>診療報酬・算定ガイド</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>算定日数計算・加算確認・減算チェック・計画書期限を一箇所で管理できます</p>
        </div>
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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "#1B4332" }}>
              最新改定
            </span>
            <span className="text-sm font-semibold text-gray-800">{REVISION_INFO.latest}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">施行日：{REVISION_INFO.施行日}</p>
          <ul className="space-y-2 mb-5">
            {REVISION_INFO.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: "#1B4332" }}>{i + 1}</span>
                {point}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://www.mhlw.go.jp/stf/newpage_71068.html"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition hover:opacity-80"
              style={{ borderColor: "#1B4332", color: "#1B4332" }}>
              厚生労働省 改訂情報を確認する <span className="text-xs">→</span>
            </a>
            <a href="https://www.japanpt.or.jp/pt/function/insurance/medical_2026/"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition hover:opacity-80"
              style={{ borderColor: "#E85D04", color: "#E85D04" }}>
              日本理学療法士協会 2026年改訂情報 <span className="text-xs">→</span>
            </a>
          </div>
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
