"use client";

import { useState, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

interface RomJointEntry {
  joint: string;
  otherJointName: string;
  directions: { direction: string; degree: string }[];
}

interface FilterState {
  ageGroups: string[];
  gender: string;
  painTimings: string[];
  painTimingFreeText: string;
  strengthLevel: string;
  strengthMMT: string;
  romLevel: string;
  romJoints: RomJointEntry[];
  otherConditions: string[];
  otherConditionFreeText: string;
  specialNotes: string;
  environment: string;
  surgery: string;
  surgeryOther: string;
  postOpDays: string;
  visitFrequency: string;
  phase: string;
}

interface FilterResult {
  recommendations: string;
  references: string[];
}

const MAX_RETRIES = 3;
const SLOW_WARNING_MS = 15_000;

const INITIAL_STATE: FilterState = {
  ageGroups: [], gender: "",
  painTimings: [], painTimingFreeText: "",
  strengthLevel: "", strengthMMT: "",
  romLevel: "", romJoints: [],
  otherConditions: [], otherConditionFreeText: "",
  specialNotes: "",
  environment: "", surgery: "", surgeryOther: "", postOpDays: "",
  visitFrequency: "", phase: "",
};

// ── Disease-adaptive logic ─────────────────────────────────────────────────

// Neurological conditions → hide pain fields
const NEURO_KEYWORDS = [
  "脳梗塞", "脳出血", "脳卒中", "パーキンソン", "脊髄損傷", "頸髄損傷",
  "ALS", "筋萎縮性側索硬化", "ギラン", "多発性硬化", "脳性麻痺", "髄膜炎",
  "クモ膜下出血", "硬膜下血腫", "神経筋疾患",
];

function showPainFields(disease: string): boolean {
  return !NEURO_KEYWORDS.some(k => disease.includes(k));
}

// ── ROM joint definitions ──────────────────────────────────────────────────

const ROM_JOINTS = [
  "肩関節", "肘関節", "手関節",
  "股関節", "膝関節", "足関節",
  "頸椎", "胸椎", "腰椎", "その他",
];

const JOINT_DIRS: Record<string, string[]> = {
  "肩関節":  ["屈曲", "伸展", "外転", "内転", "外旋", "内旋", "水平屈曲", "水平伸展"],
  "肘関節":  ["屈曲", "伸展", "回内", "回外"],
  "手関節":  ["掌屈", "背屈", "橈屈", "尺屈"],
  "股関節":  ["屈曲", "伸展", "外転", "内転", "外旋", "内旋"],
  "膝関節":  ["屈曲", "伸展"],
  "足関節":  ["背屈", "底屈", "内返し", "外返し"],
  "頸椎":    ["屈曲", "伸展", "側屈（右）", "側屈（左）", "回旋（右）", "回旋（左）"],
  "胸椎":    ["屈曲", "伸展", "側屈", "回旋"],
  "腰椎":    ["屈曲", "伸展", "側屈（右）", "側屈（左）", "回旋"],
  "その他":  ["屈曲", "伸展", "外転", "内転", "外旋", "内旋", "側屈", "回旋"],
};

// ── Options ────────────────────────────────────────────────────────────────

const AGE_GROUPS    = ["10代", "20代", "30代", "40代", "50代", "60代", "70代", "80代以上"];
const PAIN_TIMINGS  = ["安静時", "歩行時", "階段昇降時", "立ち上がり時", "夜間", "動作開始時", "長時間同姿勢後"];
const STRENGTH_OPTS = ["なし", "軽度（MMT4）", "中等度（MMT3）", "重度（MMT2以下）"];
const ROM_OPTS      = ["なし", "軽度", "中等度", "高度"];
const OTHER_OPTS    = ["浮腫あり", "炎症所見あり", "バランス障害あり", "疼痛が強い"];
const SURGERY_OPTS  = ["人工膝関節置換術（TKA）", "人工股関節置換術（THA）", "脊椎手術", "骨折術後", "その他"];
const POST_OP_DAYS  = ["術後1〜3日", "4〜7日", "2週間以内", "1ヶ月以内", "1ヶ月以上"];
const VISIT_FREQ    = ["週1回", "週2回", "週3回以上"];
const PHASES        = ["急性期", "亜急性期", "慢性期"];

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <p className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b border-gray-100">{title}</p>;
}

function ChipGroup({
  options, selected, onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            selected.includes(opt)
              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FreeTextInput({
  value, onChange, placeholder, rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="mt-2 w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300"
    />
  );
}

// ── ROM Joint Editor ───────────────────────────────────────────────────────

function RomJointEditor({
  entry,
  onToggleDir,
  onUpdateDegree,
  onUpdateOtherName,
}: {
  entry: RomJointEntry;
  onToggleDir: (dir: string) => void;
  onUpdateDegree: (dir: string, degree: string) => void;
  onUpdateOtherName: (name: string) => void;
}) {
  const dirs = JOINT_DIRS[entry.joint] ?? JOINT_DIRS["その他"];

  return (
    <div className="mt-2 pl-3 border-l-2 border-blue-100 space-y-2">
      {entry.joint === "その他" && (
        <input
          type="text"
          value={entry.otherJointName}
          onChange={e => onUpdateOtherName(e.target.value)}
          placeholder="関節名を入力（例：足趾）"
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />
      )}
      <p className="text-[11px] text-gray-400">制限方向（複数選択可・角度は任意）</p>
      <div className="flex flex-wrap gap-1.5">
        {dirs.map(dir => {
          const isSelected = entry.directions.some(d => d.direction === dir);
          return (
            <button
              key={dir}
              type="button"
              onClick={() => onToggleDir(dir)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                isSelected
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {dir}
            </button>
          );
        })}
      </div>
      {entry.directions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {entry.directions.map(({ direction, degree }) => (
            <div key={direction} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 min-w-[5rem]">{direction}</span>
              <input
                type="number" min="0" max="360"
                value={degree}
                onChange={e => onUpdateDegree(direction, e.target.value)}
                placeholder="角度"
                className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
              <span className="text-xs text-gray-400">°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function TreatmentFilter({ disease }: { disease: string }) {
  const [open,        setOpen]        = useState(true);
  const [filters,     setFilters]     = useState<FilterState>(INITIAL_STATE);
  const [result,      setResult]      = useState<FilterResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [retrying,    setRetrying]    = useState(false);
  const [retryCount,  setRetryCount]  = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const slowTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPain = showPainFields(disease);

  // ── Helpers ──

  const toggleMulti = (field: keyof FilterState, value: string) => {
    setFilters(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const setSingle = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const setEnvironment = (env: string) => {
    setFilters(prev => ({
      ...prev,
      environment: prev.environment === env ? "" : env,
      surgery: "", surgeryOther: "", postOpDays: "",
      visitFrequency: "", phase: "",
    }));
  };

  // ROM joint helpers
  const toggleRomJoint = (joint: string) => {
    setFilters(prev => {
      const exists = prev.romJoints.some(j => j.joint === joint);
      return {
        ...prev,
        romJoints: exists
          ? prev.romJoints.filter(j => j.joint !== joint)
          : [...prev.romJoints, { joint, otherJointName: "", directions: [] }],
      };
    });
  };

  const toggleJointDir = (joint: string, dir: string) => {
    setFilters(prev => ({
      ...prev,
      romJoints: prev.romJoints.map(j => {
        if (j.joint !== joint) return j;
        const exists = j.directions.some(d => d.direction === dir);
        return {
          ...j,
          directions: exists
            ? j.directions.filter(d => d.direction !== dir)
            : [...j.directions, { direction: dir, degree: "" }],
        };
      }),
    }));
  };

  const updateJointDegree = (joint: string, dir: string, degree: string) => {
    setFilters(prev => ({
      ...prev,
      romJoints: prev.romJoints.map(j =>
        j.joint !== joint ? j : {
          ...j,
          directions: j.directions.map(d =>
            d.direction === dir ? { ...d, degree } : d
          ),
        }
      ),
    }));
  };

  const updateOtherJointName = (name: string) => {
    setFilters(prev => ({
      ...prev,
      romJoints: prev.romJoints.map(j =>
        j.joint === "その他" ? { ...j, otherJointName: name } : j
      ),
    }));
  };

  /** Translate any English/unknown error to Japanese before showing the user */
  const toJapanese = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("did not match the expected pattern") || m.includes("invalid_request")) {
      return "現在メンテナンス中です。しばらくお待ちください。";
    }
    if (m.includes("401") || m.includes("authentication") || m.includes("api key") || m.includes("x-api-key")) {
      return "現在メンテナンス中です。しばらくお待ちください。";
    }
    if (m.includes("402") || m.includes("billing") || m.includes("credit") || m.includes("balance")) {
      return "現在アクセスが集中しています。しばらくお待ちください。";
    }
    if (m.includes("429") || m.includes("rate_limit") || m.includes("529") || m.includes("overload")) {
      return "現在アクセスが集中しています。しばらくお待ちください。";
    }
    if (m.includes("fetch") || m.includes("network") || m.includes("econnrefused") || m.includes("timeout")) {
      return "ネットワークエラーが発生しました。接続を確認してください。";
    }
    // If the message looks Japanese already, return as-is
    if (/[ぁ-ん]/.test(msg) || /[ァ-ン]/.test(msg) || /[一-鿿]/.test(msg)) {
      return msg;
    }
    // Fallback for any remaining English errors
    return "現在メンテナンス中です。しばらくお待ちください。";
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRetrying(false);
    setRetryCount(0);

    // Start slow-warning timer
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setSlowWarning(false);
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), SLOW_WARNING_MS);

    const tryOnce = async (): Promise<FilterResult | null> => {
      const res = await fetch("/api/treatment-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease, filters }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("non-json response");
      }
      const data = await res.json() as FilterResult | { error: string };
      if ("error" in data) throw new Error(data.error);
      return data;
    };

    const isRetryable = (err: unknown) => {
      const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
      return (
        m.includes("429") || m.includes("529") || m.includes("overload") ||
        m.includes("timeout") || m.includes("fetch") || m.includes("network") ||
        m.includes("econnreset") || m.includes("アクセスが集中") || m.includes("通信")
      );
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        setRetrying(true);
        setRetryCount(attempt);
        await new Promise<void>(r => setTimeout(r, 1_500 * attempt));
        setRetrying(false);
      }
      try {
        const data = await tryOnce();
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        setSlowWarning(false);
        setResult(data);
        setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryable(err)) continue;
        break;
      }
    }

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setSlowWarning(false);
    setError(toJapanese(lastErr instanceof Error ? lastErr.message : String(lastErr)));
    setLoading(false);
  };

  // ── Render ──

  return (
    <div className="rounded-xl overflow-hidden border border-blue-200 print:hidden">

      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition px-5 py-4 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-white font-bold text-base">
            患者状態で治療を絞り込む
          </p>
          <p className="text-blue-200 text-xs mt-0.5">
            年代・痛み・ROM・術後経過などを選択 → 文献・論文をもとに最適なアプローチを整理
          </p>
        </div>
        <span className="text-white/70 text-sm ml-4 shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* ── Form ── */}
      {open && (
        <div className="bg-white p-5 space-y-5">

          {/* 疾患適応メッセージ */}
          {!showPain && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <span className="text-blue-400 text-sm shrink-0 mt-0.5">i</span>
              <p className="text-xs text-blue-700">
                <span className="font-semibold">{disease}</span> は神経疾患のため、痛みの項目は非表示にしています。
              </p>
            </div>
          )}

          {/* 年代 */}
          <div>
            <SectionLabel title="年代" />
            <ChipGroup
              options={AGE_GROUPS}
              selected={filters.ageGroups}
              onToggle={v => toggleMulti("ageGroups", v)}
            />
          </div>

          {/* 性別 */}
          <div>
            <SectionLabel title="性別" />
            <ChipGroup
              options={["男性", "女性"]}
              selected={filters.gender ? [filters.gender] : []}
              onToggle={v => setSingle("gender", v)}
            />
          </div>

          {/* 痛みのタイミング（疾患に応じて表示/非表示） */}
          {showPain && (
            <div>
              <SectionLabel title="痛みが出るタイミング" />
              <ChipGroup
                options={PAIN_TIMINGS}
                selected={filters.painTimings}
                onToggle={v => toggleMulti("painTimings", v)}
              />
              <FreeTextInput
                value={filters.painTimingFreeText}
                onChange={v => setFilters(p => ({ ...p, painTimingFreeText: v }))}
                placeholder="自由記入（例：階段を降りる時だけ痛い、荷重時に鋭い痛みが走る　など）"
              />
            </div>
          )}

          {/* 現在の状態 */}
          <div className="space-y-4">
            <SectionLabel title="現在の状態" />

            {/* 筋力 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">筋力低下</p>
              <ChipGroup
                options={STRENGTH_OPTS}
                selected={filters.strengthLevel ? [filters.strengthLevel] : []}
                onToggle={v => setSingle("strengthLevel", v)}
              />
              {filters.strengthLevel && filters.strengthLevel !== "なし" && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">MMT数値（任意）：</span>
                  <input
                    type="number" min="0" max="5" step="0.5"
                    value={filters.strengthMMT}
                    onChange={e => setFilters(p => ({ ...p, strengthMMT: e.target.value }))}
                    placeholder="例：3"
                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            {/* ROM — joint selection first */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">関節可動域制限</p>
              <ChipGroup
                options={ROM_OPTS}
                selected={filters.romLevel ? [filters.romLevel] : []}
                onToggle={v => {
                  setSingle("romLevel", v);
                  if (v === "なし" || filters.romLevel === v) {
                    setFilters(p => ({ ...p, romJoints: [] }));
                  }
                }}
              />

              {filters.romLevel && filters.romLevel !== "なし" && (
                <div className="mt-3 pl-3 border-l-2 border-blue-100">
                  {/* Step 1: Select joints */}
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">
                    対象関節を選択（複数可）
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ROM_JOINTS.map(joint => {
                      const isSelected = filters.romJoints.some(j => j.joint === joint);
                      return (
                        <button
                          key={joint}
                          type="button"
                          onClick={() => toggleRomJoint(joint)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                          }`}
                        >
                          {joint}
                        </button>
                      );
                    })}
                  </div>

                  {/* Step 2: Per-joint direction + angle */}
                  {filters.romJoints.length > 0 && (
                    <div className="space-y-4">
                      {filters.romJoints.map(entry => (
                        <div key={entry.joint}>
                          <p className="text-xs font-bold text-gray-700 mb-1">
                            <span className="inline-block bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 mr-1">
                              {entry.joint}
                            </span>
                            の制限
                          </p>
                          <RomJointEditor
                            entry={entry}
                            onToggleDir={dir => toggleJointDir(entry.joint, dir)}
                            onUpdateDegree={(dir, deg) => updateJointDegree(entry.joint, dir, deg)}
                            onUpdateOtherName={updateOtherJointName}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* その他の状態 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">その他の状態</p>
              <ChipGroup
                options={OTHER_OPTS}
                selected={filters.otherConditions}
                onToggle={v => toggleMulti("otherConditions", v)}
              />
              <FreeTextInput
                value={filters.otherConditionFreeText}
                onChange={v => setFilters(p => ({ ...p, otherConditionFreeText: v }))}
                placeholder="自由記入（例：術後3週間で体重計測困難、認知機能低下あり　など）"
              />
            </div>
          </div>

          {/* その他の症状・特記事項（新規） */}
          <div>
            <SectionLabel title="その他の症状・特記事項" />
            <FreeTextInput
              value={filters.specialNotes}
              onChange={v => setFilters(p => ({ ...p, specialNotes: v }))}
              placeholder="疾患固有の症状や特記事項を自由に記入（例：右麻痺、独歩可能、疼痛NRS 6/10、ペースメーカー装着あり　など）"
              rows={3}
            />
          </div>

          {/* 受療環境 */}
          <div>
            <SectionLabel title="受療環境" />
            <ChipGroup
              options={["入院", "外来"]}
              selected={filters.environment ? [filters.environment] : []}
              onToggle={setEnvironment}
            />

            {filters.environment === "入院" && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-blue-100 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">術式</p>
                  <ChipGroup
                    options={SURGERY_OPTS}
                    selected={filters.surgery ? [filters.surgery] : []}
                    onToggle={v => setSingle("surgery", v)}
                  />
                  {filters.surgery === "その他" && (
                    <input
                      type="text"
                      value={filters.surgeryOther}
                      onChange={e => setFilters(p => ({ ...p, surgeryOther: e.target.value }))}
                      placeholder="術式を入力（任意）"
                      className="mt-2 w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">術後経過日数</p>
                  <ChipGroup
                    options={POST_OP_DAYS}
                    selected={filters.postOpDays ? [filters.postOpDays] : []}
                    onToggle={v => setSingle("postOpDays", v)}
                  />
                </div>
              </div>
            )}

            {filters.environment === "外来" && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-green-100 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">通院頻度</p>
                  <ChipGroup
                    options={VISIT_FREQ}
                    selected={filters.visitFrequency ? [filters.visitFrequency] : []}
                    onToggle={v => setSingle("visitFrequency", v)}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">症状の経過</p>
                  <ChipGroup
                    options={PHASES}
                    selected={filters.phase ? [filters.phase] : []}
                    onToggle={v => setSingle("phase", v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
          >
            {retrying ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                再接続しています… ({retryCount}/{MAX_RETRIES}回目)
              </>
            ) : loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                文献・論文をもとに整理中…
              </>
            ) : (
              "この条件で治療アプローチを検索"
            )}
          </button>

          {/* Slow warning */}
          {slowWarning && loading && !retrying && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin shrink-0" />
              <p className="text-xs text-blue-700">生成中です。しばらくお待ちください…</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-semibold text-blue-900 text-sm mb-3">
                患者条件に合ったアプローチ
              </p>
              <div className="text-sm text-gray-800 space-y-1.5">
                {result.recommendations.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="leading-relaxed">{line}</p>
                ))}
              </div>
              {result.references.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-2">参考文献</p>
                  <ul className="space-y-1.5">
                    {result.references.map((ref, i) => (
                      <li key={i} className="text-xs text-gray-600 px-2.5 py-1.5 bg-white rounded-lg border border-blue-100">
                        {i + 1}. {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setResult(null); setFilters(INITIAL_STATE); }}
                className="mt-3 text-xs text-blue-400 hover:text-blue-600 transition"
              >
                結果をクリア・条件をリセット
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
