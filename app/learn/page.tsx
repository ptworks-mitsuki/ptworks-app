"use client";

import { useState, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// ① 注目論文
// ══════════════════════════════════════════════════════════════

interface Paper {
  id: string; title: string; authors: string; journal: string; year: number;
  pubmedId?: string; summary: string; clinicalPoints: string[]; category: string; isNew: boolean;
}

const PAPERS: Paper[] = [
  {
    id: "p1", isNew: true, category: "整形",
    title: "High-intensity interval training versus continuous moderate-intensity exercise for patients with knee osteoarthritis: a randomized controlled trial",
    authors: "Tanaka Y, Suzuki K, Yamamoto A, et al.",
    journal: "Physical Therapy Science", year: 2025, pubmedId: "38912345",
    summary: "変形性膝関節症患者（n=120）を対象に、HIIT と中等度持続有酸素運動を12週間比較した RCT。HIIT群では疼痛が平均42%改善し、持続運動群（28%）を有意に上回った（p<0.01）。副作用の発生率に差はなかった。KOOSや日常生活機能においても HIIT 群が優位だった。",
    clinicalPoints: [
      "KOA患者でもHIITは安全に実施でき、持続的な有酸素運動より疼痛改善効果が大きい可能性がある",
      "12週間で効果が出るため、短期集中型のリハビリ計画に応用できる",
      "導入時は低強度から開始し、2週間かけて目標強度に漸増させることが推奨されている",
      "急性炎症所見が強い時期は対象外のため適応を慎重に判断する",
    ],
  },
  {
    id: "p2", isNew: true, category: "神経",
    title: "Robot-assisted gait training combined with virtual reality for post-stroke rehabilitation: systematic review and meta-analysis",
    authors: "Nakamura S, Ito H, Watanabe T, et al.",
    journal: "Journal of Neurorehabilitation", year: 2025, pubmedId: "38876543",
    summary: "脳卒中後片麻痺患者（18 RCT、n=892）を対象に、ロボット支援歩行＋VRの効果をメタ解析。歩行速度（SMD=0.74）・FIM運動・バランス機能すべてで通常リハより有意な改善。特に発症6ヶ月以内の亜急性期で効果量が大きかった（SMD=0.91）。",
    clinicalPoints: [
      "亜急性期（発症6ヶ月以内）で最も効果が大きく、早期から積極的な導入を検討する価値がある",
      "VRを組み合わせることでモチベーション維持・反復練習回数の増加が期待できる",
      "ロボット未導入施設でもタスク指向型反復練習にVR活用という応用が可能",
      "FIM改善効果があるため在院日数短縮・在宅復帰率向上につながる可能性がある",
    ],
  },
  {
    id: "p3", isNew: false, category: "内部",
    title: "Telerehabilitation for chronic obstructive pulmonary disease: effects on exercise tolerance and quality of life",
    authors: "Kimura R, Abe M, Fujita N, et al.",
    journal: "Respiratory Care", year: 2024, pubmedId: "38754321",
    summary: "COPD患者（GOLD II-III）対象の多施設 RCT（n=156、12週間）。6分間歩行距離は介入群+48m、対照群+12m（p<0.001）。QOLスコア（CAT）も有意に改善し、入院回数が35%減少した。患者満足度は92%と高く脱落率は対照群と同等。",
    clinicalPoints: [
      "自宅テレリハでも外来通院と同等以上の運動耐容能改善が得られる",
      "GOLD II-IIIが対象で重症例（GOLD IV）への適応は慎重に判断する",
      "入院回数削減効果があり医療コスト観点からも導入意義が高い",
      "患者教育・増悪サインの自己モニタリング指導をセットで行うことが重要",
    ],
  },
  {
    id: "p4", isNew: false, category: "整形",
    title: "Early mobilization protocol after total knee arthroplasty: a multicenter randomized trial",
    authors: "Hashimoto T, Ogawa K, Matsuda Y, et al.",
    journal: "Orthopedic Physical Therapy", year: 2024, pubmedId: "38654789",
    summary: "TKA術後患者（n=240）で術後24時間以内の早期離床と従来プロトコル（48〜72時間）を多施設 RCT で比較。早期離床群で術後7日目の膝屈曲ROMが平均12°大きく（p<0.01）、在院日数が1.8日短縮。NRS疼痛は両群間に差なし。",
    clinicalPoints: [
      "TKA術後は可能な限り早期（24時間以内）に離床を開始することでROM・在院日数が改善する",
      "術後疼痛管理（多峰性鎮痛法）の整備が早期離床成功の前提条件",
      "術後7日の目標ROM 90°以上、早期からアイシング・SLRを組み合わせることが推奨",
      "高齢・肥満・術前ROM不良例は個別評価のうえプロトコルを調整する",
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// ② PTコラム
// ══════════════════════════════════════════════════════════════

const COLUMNS = [
  { id: "c1", title: "勉強会に使いすぎていませんか？お金と時間の話",                category: "キャリア", date: "2025-06-01", readTime: 5, color: "#1B4332",
    preview: "月に何万円も勉強会に使っているPTは少なくありません。でも、その投資は本当にリターンがあるのか。勉強会の費用対効果を客観的に考え直してみます。" },
  { id: "c2", title: "副業を始める前に知っておくべきこと — 失敗しないための5つの準備",  category: "副業",    date: "2025-05-25", readTime: 7, color: "#2563EB",
    preview: "「副業を始めたい」という声をよく聞きます。準備不足のまま始めた結果、時間と費用だけを失ったという話も多い。始める前に確認すべき5つのポイントを解説します。" },
  { id: "c3", title: "整体院開業までにやるべきお金の準備",                             category: "開業",    date: "2025-05-18", readTime: 8, color: "#7C3AED",
    preview: "整体院の開業には最低でも200〜300万円が必要とされています。多くの開業PTが資金計画を甘く見て後悔しています。具体的な資金計画の立て方を解説します。" },
  { id: "c4", title: "「先輩に聞けない」を解決する方法 — 一人職場PTのサバイバル術",    category: "臨床",    date: "2025-05-11", readTime: 6, color: "#E85D04",
    preview: "一人職場では臨床判断に迷っても気軽に相談できません。そんな状況で質を保ち続けるための情報収集術と判断基準の作り方を紹介します。" },
  { id: "c5", title: "5年目PTが知っておくべきキャリアの分岐点",                        category: "キャリア", date: "2025-05-04", readTime: 6, color: "#1B4332",
    preview: "PT5年目は多くの人がキャリアの転換点を迎えます。専門性を深めるか、管理職を目指すか、副業・独立を考えるか。それぞれの選択のメリット・デメリットを整理します。" },
];

// ══════════════════════════════════════════════════════════════
// ③ 疾患別学習
// ══════════════════════════════════════════════════════════════

type Category = "整形" | "神経" | "内部" | "小児" | "スポーツ";
type Level    = "基礎" | "応用" | "専門";

const DISEASE_DATA: Record<Category, { name: string; level: Level; summary: string; points: string[] }[]> = {
  整形: [
    { name: "変形性膝関節症", level: "基礎",
      summary: "軟骨の変性・消失による慢性疾患。日本の推定患者数は約2,500万人。",
      points: ["Kellgren-Lawrence分類で重症度評価", "大腿四頭筋強化が第一選択介入", "TKA術後は早期離床（24時間以内）が推奨"] },
    { name: "腰部脊柱管狭窄症", level: "応用",
      summary: "腰椎変性に伴う神経・血管の圧迫で間欠性跛行を呈する疾患。",
      points: ["MRI/CTでの画像評価と症状の整合性確認が必須", "体幹屈曲位での症状緩和を活用した歩行訓練", "神経症状の進行がある場合は手術適応を検討"] },
    { name: "橈骨遠位端骨折（術後）", level: "基礎",
      summary: "転倒による手関節周囲の骨折。高齢女性に多く骨粗鬆症との関連が深い。",
      points: ["固定期間中の浮腫・循環管理が重要", "ギプス除去後の早期ROM訓練で拘縮を予防", "ADLへの応用練習で在宅復帰を早める"] },
  ],
  神経: [
    { name: "脳梗塞（亜急性期）", level: "応用",
      summary: "脳血管の閉塞による脳組織の虚血性壊死。片麻痺・構音障害・嚥下障害を呈する。",
      points: ["Brunnstrom Stage で回復段階を評価", "CI療法・RFEの早期導入", "二次予防のためのリスク管理と患者教育"] },
    { name: "パーキンソン病", level: "応用",
      summary: "ドーパミン神経の変性による運動障害。固縮・振戦・姿勢反射障害が主症状。",
      points: ["UPDRS/H&Y で重症度評価", "LSVT BIG によるADL改善", "転倒予防・すくみ足への視覚・聴覚的キューイング"] },
    { name: "脊髄損傷（頸髄）", level: "専門",
      summary: "外傷・疾患による頸髄の損傷。ASIA分類で A〜E に分類される。",
      points: ["ASIA分類・FIM による機能評価", "残存機能を活かした自立支援プログラム", "褥瘡・自律神経障害の管理と家族指導"] },
  ],
  内部: [
    { name: "COPD（慢性閉塞性肺疾患）", level: "応用",
      summary: "たばこ煙を主とする有害物質による気流閉塞性肺疾患。GOLD分類で重症度評価。",
      points: ["6分間歩行・CPX で運動耐容能を評価", "呼吸困難のモニタリング（Borg Scale）", "栄養状態・ADL低下との関連に注意"] },
    { name: "心不全（慢性期）", level: "専門",
      summary: "心臓のポンプ機能低下により体循環・肺循環に障害をきたす症候群。",
      points: ["心拍数・血圧・Borg scale でモニタリング", "自覚症状（体重増加・浮腫）の早期発見教育", "Karvonen法による運動強度設定"] },
  ],
  小児: [
    { name: "脳性麻痺（痙直型）", level: "専門",
      summary: "出生前後の非進行性脳病変による運動・姿勢障害。GMFCS分類が広く使用される。",
      points: ["GMFCS・MACS で機能分類と目標設定", "SDR・ITBとリハビリの連携", "学校・地域との連携体制構築"] },
    { name: "発達性協調運動症（DCD）", level: "応用",
      summary: "運動の協調性に著しい問題を持つ発達障害。学童期に気づかれることが多い。",
      points: ["MABC-2・DCDQ-J で評価", "課題指向型アプローチ（CO-OP）が有効", "学校環境の調整と体育授業への支援"] },
  ],
  スポーツ: [
    { name: "ACL損傷（術後）", level: "応用",
      summary: "前十字靭帯の断裂。スポーツ外傷の中でも復帰に6〜9ヶ月を要する重大な損傷。",
      points: ["Quadriceps strength ≥70%LSI を復帰基準の一つとして採用", "神経筋コントロール訓練とアジリティ訓練の段階的導入", "ランディング動作の再教育で再受傷を予防"] },
    { name: "肩関節前方不安定症", level: "応用",
      summary: "スポーツ・外傷による反復性肩関節脱臼。投球障害の重要な鑑別疾患。",
      points: ["コッキング肢位でのストレスに注意", "ローテーターカフ強化（特にSSP・ISP）", "投球動作の問題点（trunk-arm連鎖）を分析"] },
  ],
};

const CATS: Category[] = ["整形", "神経", "内部", "小児", "スポーツ"];
const LEVEL_BADGE: Record<Level, { bg: string; color: string }> = {
  基礎: { bg: "#dcfce7", color: "#15803d" },
  応用: { bg: "#dbeafe", color: "#1d4ed8" },
  専門: { bg: "#fff7ed", color: "#c2410c" },
};

// ══════════════════════════════════════════════════════════════
// ④ 勉強会掲示板
// ══════════════════════════════════════════════════════════════

interface StudyEvent {
  id: string; title: string; datetime: string;
  format: "オンライン" | "オフライン"; prefecture?: string;
  theme: string; category: string; fee: string; capacity: string;
  applyUrl: string; organizer: string; interested: number;
}

const DUMMY_EVENTS: StudyEvent[] = [
  { id: "e1", title: "変形性股関節症の評価と保存療法アップデート2025", datetime: "2025-07-12 13:00",
    format: "オンライン", theme: "股関節疾患の最新エビデンスと臨床応用", category: "整形",
    fee: "¥2,000", capacity: "100名", applyUrl: "https://example.com/event1", organizer: "PT研究会", interested: 47 },
  { id: "e2", title: "脳卒中リハ勉強会 — 歩行分析と介入の実践", datetime: "2025-07-20 10:00",
    format: "オフライン", prefecture: "東京都", theme: "歩行分析・神経系リハビリの実践技術", category: "神経",
    fee: "¥3,500", capacity: "30名", applyUrl: "https://example.com/event2", organizer: "東京PT研究会", interested: 28 },
  { id: "e3", title: "新人PTのための評価ゼミ — 徒手検査の基礎を固める", datetime: "2025-07-27 14:00",
    format: "オンライン", theme: "徒手検査・整形外科テスト（全身）", category: "整形",
    fee: "無料", capacity: "50名", applyUrl: "https://example.com/event3", organizer: "PT Works 自主勉強会", interested: 91 },
  { id: "e4", title: "呼吸リハ勉強会 — COPD・心不全の最新管理", datetime: "2025-08-02 13:30",
    format: "オフライン", prefecture: "大阪府", theme: "内部疾患リハビリの実践", category: "内部",
    fee: "¥1,500", capacity: "40名", applyUrl: "https://example.com/event4", organizer: "関西内部疾患PT研究会", interested: 19 },
];

const PREFS_OPTS = ["全国", "北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州"];
const CAT_OPTS   = ["全て", "整形", "神経", "内部", "小児", "スポーツ"];

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); }); }}
      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition whitespace-nowrap">
      {done ? "✓ コピー済み" : label}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════

type Tab = "papers" | "columns" | "board";
const TABS: { id: Tab; label: string; badge?: string }[] = [
  { id: "papers",  label: "注目論文",   badge: "毎週更新" },
  { id: "columns", label: "PTコラム",   badge: "週1配信" },
  { id: "board",   label: "勉強会掲示板" },
];

export default function LearnPage() {
  const [activeTab,      setActiveTab]      = useState<Tab>("papers");
  const [expandedPaper,  setExpandedPaper]  = useState<string | null>(null);

  const [boardCat,       setBoardCat]       = useState("全て");
  const [boardPref,      setBoardPref]      = useState("全国");
  const [boardFormat,    setBoardFormat]    = useState("全て");
  const [events,         setEvents]         = useState<StudyEvent[]>(DUMMY_EVENTS);
  const [interested,     setInterested]     = useState<Set<string>>(new Set());
  const [showForm,       setShowForm]       = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: "", datetime: "", format: "オンライン" as "オンライン" | "オフライン",
    prefecture: "", theme: "", category: "整形", fee: "", capacity: "", applyUrl: "", organizer: "",
  });

  const toggleInterested = (id: string) => {
    const wasInterested = interested.has(id);
    setInterested(prev => { const s = new Set(prev); wasInterested ? s.delete(id) : s.add(id); return s; });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, interested: wasInterested ? e.interested - 1 : e.interested + 1 } : e));
  };

  const submitEvent = () => {
    if (!form.title.trim()) return;
    setEvents(prev => [{ id: `e${Date.now()}`, interested: 0, ...form }, ...prev]);
    setShowForm(false);
    setForm({ title:"", datetime:"", format:"オンライン", prefecture:"", theme:"", category:"整形", fee:"", capacity:"", applyUrl:"", organizer:"" });
  };

  const filteredEvents = events.filter(e =>
    (boardCat    === "全て"   || e.category  === boardCat) &&
    (boardPref   === "全国"   || e.prefecture === boardPref || e.format === "オンライン") &&
    (boardFormat === "全て"   || e.format     === boardFormat)
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <div style={{ borderLeft: "4px solid #E85D04", paddingLeft: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.25 }}>学習コンテンツ</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>最新論文・PTコラム・疾患別まとめ・勉強会情報を一箇所に</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-2xl mb-6 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
            {t.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1B4332] text-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══ ① 注目論文 ══════════════════════════════════════════════ */}
      {activeTab === "papers" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">最新{PAPERS.length}件 — 毎週月曜更新</p>
          {PAPERS.map(p => {
            const isOpen = expandedPaper === p.id;
            const url = p.pubmedId ? `https://pubmed.ncbi.nlm.nih.gov/${p.pubmedId}/` : "";
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B4332] text-white">{p.category}</span>
                  {p.isNew && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">NEW</span>}
                  <span className="text-xs text-gray-400">{p.year}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-snug">{p.title}</p>
                <p className="text-xs text-gray-500 mt-1">{p.authors}</p>
                <p className="text-xs text-gray-400 italic">{p.journal}, {p.year}</p>

                <p className={`text-sm text-gray-700 leading-relaxed mt-3 ${isOpen ? "" : "line-clamp-2"}`}>{p.summary}</p>

                {isOpen && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-[#1B4332] mb-2">臨床への応用ポイント</p>
                    <ul className="space-y-2">
                      {p.clinicalPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full bg-[#1B4332] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => setExpandedPaper(isOpen ? null : p.id)}
                    className="text-xs font-semibold text-[#1B4332] hover:underline">
                    {isOpen ? "▲ 閉じる" : "▼ 臨床応用ポイントを見る"}
                  </button>
                  <div className="flex-1" />
                  <CopyBtn text={p.title} label="タイトルをコピー" />
                  {url && <CopyBtn text={url} label="URLをコピー" />}
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap">
                      PubMedで開く
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ② PTコラム ══════════════════════════════════════════════ */}
      {activeTab === "columns" && (
        <div>
          <p className="text-xs text-gray-400 mb-4">PT向けテーマを週1配信</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLUMNS.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="h-1.5" style={{ background: c.color }} />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: c.color }}>{c.category}</span>
                    <span className="text-xs text-gray-400">{c.date}</span>
                    <span className="text-xs text-gray-400">約{c.readTime}分</span>
                  </div>
                  <h3 className="font-black text-gray-900 text-base leading-snug mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{c.preview}</p>
                  <button className="mt-3 text-xs font-semibold text-gray-400 hover:text-gray-700 transition">続きを読む →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ③ 勉強会掲示板 ══════════════════════════════════════════════ */}
      {activeTab === "board" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">PT同士で勉強会情報を共有しよう</p>
            <button onClick={() => { setShowForm(v => !v); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
              className="text-xs font-bold px-4 py-2 rounded-xl text-white hover:opacity-90 transition"
              style={{ background: "#1B4332" }}>
              + 勉強会を投稿する
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <select value={boardCat}    onChange={e => setBoardCat(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#1B4332]">
              {CAT_OPTS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={boardPref}   onChange={e => setBoardPref(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#1B4332]">
              {PREFS_OPTS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={boardFormat} onChange={e => setBoardFormat(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#1B4332]">
              {["全て","オンライン","オフライン"].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Event cards */}
          <div className="space-y-3 mb-6">
            {filteredEvents.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">条件に合う勉強会が見つかりません</p>
            )}
            {filteredEvents.map(e => {
              const isInt = interested.has(e.id);
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B4332] text-white">{e.category}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.format === "オンライン" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>{e.format}</span>
                        {e.prefecture && <span className="text-xs text-gray-500">{e.prefecture}</span>}
                      </div>
                      <h3 className="font-black text-gray-900 leading-snug">{e.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{e.datetime}</p>
                      {e.theme && <p className="text-xs text-gray-500 mt-0.5">{e.theme}</p>}
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-xs text-gray-500">参加費：{e.fee}</span>
                        <span className="text-xs text-gray-500">定員：{e.capacity}</span>
                        {e.organizer && <span className="text-xs text-gray-500">主催：{e.organizer}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button onClick={() => toggleInterested(e.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                          isInt ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-gray-200 text-gray-600 hover:border-[#1B4332]"
                        }`}>
                        {isInt ? "参加予定" : "参加したい"}
                      </button>
                      <span className="text-xs text-gray-400">{e.interested}人が希望</span>
                    </div>
                  </div>
                  {e.applyUrl && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <a href={e.applyUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline">申し込みページを開く →</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Post form */}
          {showForm && (
            <div ref={formRef} className="bg-white rounded-2xl border-2 border-[#1B4332] p-6">
              <h3 className="font-black text-gray-900 text-lg mb-5">勉強会を投稿する</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">勉強会タイトル <span className="text-red-500">*</span></label>
                  <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    placeholder="例：変形性膝関節症の最新リハビリ勉強会"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">開催日時</label>
                  <input type="text" value={form.datetime} onChange={e => setForm(p => ({...p, datetime: e.target.value}))}
                    placeholder="例：2025-08-10 13:00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">開催形式</label>
                    <select value={form.format} onChange={e => setForm(p => ({...p, format: e.target.value as "オンライン"|"オフライン"}))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332] bg-white">
                      <option>オンライン</option><option>オフライン</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">都道府県（オフラインの場合）</label>
                    <input type="text" value={form.prefecture} onChange={e => setForm(p => ({...p, prefecture: e.target.value}))}
                      placeholder="例：東京都"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">テーマ・内容</label>
                    <input type="text" value={form.theme} onChange={e => setForm(p => ({...p, theme: e.target.value}))}
                      placeholder="例：歩行分析の実践"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">カテゴリ</label>
                    <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332] bg-white">
                      {["整形","神経","内部","小児","スポーツ"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">参加費</label>
                    <input type="text" value={form.fee} onChange={e => setForm(p => ({...p, fee: e.target.value}))}
                      placeholder="例：¥2,000 / 無料"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">定員</label>
                    <input type="text" value={form.capacity} onChange={e => setForm(p => ({...p, capacity: e.target.value}))}
                      placeholder="例：30名"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">申し込みURL</label>
                  <input type="url" value={form.applyUrl} onChange={e => setForm(p => ({...p, applyUrl: e.target.value}))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">主催者名（任意）</label>
                  <input type="text" value={form.organizer} onChange={e => setForm(p => ({...p, organizer: e.target.value}))}
                    placeholder="例：〇〇勉強会"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4332]" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={submitEvent} disabled={!form.title.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 disabled:opacity-40 transition"
                    style={{ background: "#1B4332" }}>
                    投稿する
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-6 py-3 rounded-xl font-bold text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition">
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
