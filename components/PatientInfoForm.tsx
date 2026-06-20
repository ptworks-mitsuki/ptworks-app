"use client";

import { useState } from "react";
import type { PatientInfo, RomJointEntry } from "@/app/api/treatment-evidence/route";

export { type PatientInfo };

export interface HighlightConfig {
  fim: boolean;
  bi:  boolean;
  mmt: boolean;
  rom: boolean;
  nrs: boolean;
}

// ── Initial state ─────────────────────────────────────────────────────────

export const INITIAL_PATIENT_INFO: PatientInfo = {
  age: "", gender: "", diagnosisNote: "",
  complaint: "", goal: "",
  nrs: "0",
  mmtLevel: "", mmtValue: "",
  romLevel: "", romJoints: [],
  fimTotal: "", fimMotor: "", fimCog: "",
  biTotal: "",
  environment: "", surgery: "", postOpDays: "", visitFreq: "", phase: "",
  living: "",
  comorbidities: "", medications: "",
  freeText: "",
};

// ── ADL helpers ───────────────────────────────────────────────────────────

function getFimLabel(n: number): { label: string; color: string } {
  if (n <= 18)  return { label: "全介助",   color: "#dc2626" };
  if (n <= 60)  return { label: "重度介助", color: "#ea580c" };
  if (n <= 90)  return { label: "中等度介助", color: "#ca8a04" };
  if (n <= 107) return { label: "軽度介助", color: "#16a34a" };
  return               { label: "ほぼ自立", color: "#2563eb" };
}

function getBiLabel(n: number): { label: string; color: string } {
  if (n <= 20) return { label: "全介助",   color: "#dc2626" };
  if (n <= 60) return { label: "重度介助", color: "#ea580c" };
  if (n <= 90) return { label: "中等度介助", color: "#ca8a04" };
  if (n <= 99) return { label: "軽度介助", color: "#16a34a" };
  return             { label: "自立",     color: "#2563eb" };
}

function nrsColor(v: number) {
  if (v <= 3) return "#16a34a";
  if (v <= 6) return "#ca8a04";
  return "#dc2626";
}

// ── ROM constants ─────────────────────────────────────────────────────────

const ROM_JOINTS = ["肩関節", "肘関節", "手関節", "股関節", "膝関節", "足関節", "頸椎", "胸椎", "腰椎", "その他"];
const JOINT_DIRS: Record<string, string[]> = {
  "肩関節": ["屈曲", "伸展", "外転", "内転", "外旋", "内旋"],
  "肘関節": ["屈曲", "伸展", "回内", "回外"],
  "手関節": ["掌屈", "背屈", "橈屈", "尺屈"],
  "股関節": ["屈曲", "伸展", "外転", "内転", "外旋", "内旋"],
  "膝関節": ["屈曲", "伸展"],
  "足関節": ["背屈", "底屈", "内返し", "外返し"],
  "頸椎":   ["屈曲", "伸展", "側屈（右）", "側屈（左）", "回旋（右）", "回旋（左）"],
  "胸椎":   ["屈曲", "伸展", "側屈", "回旋"],
  "腰椎":   ["屈曲", "伸展", "側屈（右）", "側屈（左）", "回旋"],
  "その他": ["屈曲", "伸展", "外転", "内転", "外旋", "内旋", "側屈", "回旋"],
};

// ── Sub-UI helpers ────────────────────────────────────────────────────────

function SectionHeader({ label, optional = true }: { label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 pt-5 pb-2 border-t border-gray-100 first:border-none first:pt-0">
      <span className="text-xs font-black text-gray-700 tracking-wide uppercase">{label}</span>
      {optional && <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">全てスキップ可</span>}
    </div>
  );
}

function ChipGroup({ options, value, onChange, multi = false }: {
  options: string[];
  value:   string | string[];
  onChange: (v: string) => void;
  multi?:   boolean;
}) {
  const selected = multi ? (value as string[]) : (value ? [value as string] : []);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isOn = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              isOn
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-xs font-semibold text-gray-600">{children}</span>
      {hint && <span className="text-[10px] text-gray-400 ml-1.5">{hint}</span>}
    </div>
  );
}

// ── ROM joint editor ──────────────────────────────────────────────────────

function RomEditor({ joints, onChange }: {
  joints:   RomJointEntry[];
  onChange: (j: RomJointEntry[]) => void;
}) {
  const toggle = (joint: string) => {
    if (joints.some(j => j.joint === joint)) {
      onChange(joints.filter(j => j.joint !== joint));
    } else {
      onChange([...joints, { joint, otherJointName: "", directions: [] }]);
    }
  };
  const toggleDir = (joint: string, dir: string) => {
    onChange(joints.map(j => {
      if (j.joint !== joint) return j;
      const exists = j.directions.some(d => d.direction === dir);
      return {
        ...j,
        directions: exists
          ? j.directions.filter(d => d.direction !== dir)
          : [...j.directions, { direction: dir, degree: "" }],
      };
    }));
  };
  const updateDegree = (joint: string, dir: string, deg: string) => {
    onChange(joints.map(j =>
      j.joint !== joint ? j : {
        ...j,
        directions: j.directions.map(d => d.direction === dir ? { ...d, degree: deg } : d),
      }
    ));
  };
  const updateOther = (name: string) => {
    onChange(joints.map(j => j.joint === "その他" ? { ...j, otherJointName: name } : j));
  };

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] text-gray-400">対象関節（複数選択可）</p>
      <div className="flex flex-wrap gap-1.5">
        {ROM_JOINTS.map(jt => {
          const isOn = joints.some(j => j.joint === jt);
          return (
            <button key={jt} type="button" onClick={() => toggle(jt)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                isOn ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
              }`}
            >{jt}</button>
          );
        })}
      </div>
      {joints.map(entry => {
        const dirs = JOINT_DIRS[entry.joint] ?? JOINT_DIRS["その他"];
        return (
          <div key={entry.joint} className="pl-3 border-l-2 border-blue-100 space-y-2 pt-1">
            <p className="text-xs font-bold text-blue-700">
              <span className="bg-blue-50 rounded px-1.5 py-0.5">{entry.joint}</span> の制限方向
            </p>
            {entry.joint === "その他" && (
              <input type="text" value={entry.otherJointName} onChange={e => updateOther(e.target.value)}
                placeholder="関節名を入力"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            )}
            <div className="flex flex-wrap gap-1.5">
              {dirs.map(dir => {
                const isOn = entry.directions.some(d => d.direction === dir);
                return (
                  <button key={dir} type="button" onClick={() => toggleDir(entry.joint, dir)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                      isOn ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"
                    }`}
                  >{dir}</button>
                );
              })}
            </div>
            {entry.directions.length > 0 && (
              <div className="space-y-1">
                {entry.directions.map(({ direction, degree }) => (
                  <div key={direction} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-[5rem]">{direction}</span>
                    <input type="number" min="0" max="360" value={degree}
                      onChange={e => updateDegree(entry.joint, direction, e.target.value)}
                      placeholder="角度（任意）"
                      className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-xs text-gray-400">°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main form component ───────────────────────────────────────────────────

interface PatientInfoFormProps {
  info:       PatientInfo;
  onChange:   (info: PatientInfo) => void;
  highlights?: HighlightConfig;
}

const HL_STYLE = "rounded-xl ring-2 ring-green-400 bg-green-50/60 p-2 -mx-2";
const NO_HL_STYLE = "";

export function PatientInfoForm({ info, onChange, highlights }: PatientInfoFormProps) {
  const hl = highlights ?? { fim: false, bi: false, mmt: false, rom: false, nrs: false };
  const set = <K extends keyof PatientInfo>(key: K, val: PatientInfo[K]) =>
    onChange({ ...info, [key]: val });

  const nrsVal = Number(info.nrs ?? 0);
  const fimNum  = Number(info.fimTotal);
  const biNum   = Number(info.biTotal);
  const fimMeta = info.fimTotal ? getFimLabel(fimNum) : null;
  const biMeta  = info.biTotal  ? getBiLabel(biNum)   : null;

  return (
    <div className="space-y-1">

      {/* ── 基本情報 ── */}
      <SectionHeader label="基本情報" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel hint="任意">年齢</FieldLabel>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" max="120" value={info.age}
              onChange={e => set("age", e.target.value)}
              placeholder="例：72"
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
            <span className="text-xs text-gray-400">歳</span>
          </div>
        </div>
        <div>
          <FieldLabel hint="任意">性別</FieldLabel>
          <ChipGroup
            options={["男性", "女性"]}
            value={info.gender}
            onChange={v => set("gender", info.gender === v ? "" : v)}
          />
        </div>
      </div>

      <div>
        <FieldLabel hint="任意">診断名・病期の詳細</FieldLabel>
        <input type="text" value={info.diagnosisNote}
          onChange={e => set("diagnosisNote", e.target.value)}
          placeholder="例：右変形性膝関節症 Kellgren-Lawrence分類Ⅲ、術後3週"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />
      </div>

      {/* ── 主訴・目標 ── */}
      <SectionHeader label="主訴・目標" />

      <div>
        <FieldLabel hint="任意">一番困っていること（主訴）</FieldLabel>
        <textarea value={info.complaint} onChange={e => set("complaint", e.target.value)}
          placeholder="例：階段の昇り降りが痛くてできない、夜間に膝が疼く"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300"
        />
      </div>

      <div>
        <FieldLabel hint="任意">目標・生活背景</FieldLabel>
        <textarea value={info.goal} onChange={e => set("goal", e.target.value)}
          placeholder="例：畑仕事に戻りたい、孫と一緒に歩きたい、職場復帰したい"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300"
        />
      </div>

      {/* ── 現在の状態 ── */}
      <SectionHeader label="現在の状態" />

      {/* NRS */}
      <div className={hl.nrs ? HL_STYLE : NO_HL_STYLE}>
        {hl.nrs && <p className="text-[10px] font-bold text-green-700 mb-1">この疾患に関連性が高い項目です</p>}
        <FieldLabel hint="任意">疼痛レベル（NRS）</FieldLabel>
        <div className="mt-2 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">0 痛みなし</span>
            <span className="text-xl font-black" style={{ color: nrsColor(nrsVal) }}>
              {info.nrs} <span className="text-sm text-gray-400 font-normal">/ 10</span>
            </span>
            <span className="text-xs text-gray-400">10 最大の痛み</span>
          </div>
          <input type="range" min="0" max="10" step="1" value={info.nrs}
            onChange={e => set("nrs", e.target.value)}
            className="w-full accent-blue-600"
            style={{ accentColor: nrsColor(nrsVal) }}
          />
          <div className="flex justify-between mt-1">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <span key={n} className="text-[10px] text-gray-300">{n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MMT */}
      <div className={hl.mmt ? HL_STYLE : NO_HL_STYLE}>
        {hl.mmt && <p className="text-[10px] font-bold text-green-700 mb-1">この疾患に関連性が高い項目です</p>}
        <FieldLabel hint="任意">筋力低下（MMT）</FieldLabel>
        <ChipGroup
          options={["なし", "軽度低下（MMT4）", "中等度低下（MMT3）", "重度低下（MMT2以下）"]}
          value={info.mmtLevel}
          onChange={v => set("mmtLevel", info.mmtLevel === v ? "" : v)}
        />
        {info.mmtLevel && info.mmtLevel !== "なし" && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">MMT数値（任意）：</span>
            <input type="number" min="0" max="5" step="0.5" value={info.mmtValue}
              onChange={e => set("mmtValue", e.target.value)}
              placeholder="例：3"
              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>
        )}
      </div>

      {/* ROM */}
      <div className={hl.rom ? HL_STYLE : NO_HL_STYLE}>
        {hl.rom && <p className="text-[10px] font-bold text-green-700 mb-1">この疾患に関連性が高い項目です</p>}
        <FieldLabel hint="任意">関節可動域制限（ROM）</FieldLabel>
        <ChipGroup
          options={["なし", "軽度", "中等度", "高度"]}
          value={info.romLevel}
          onChange={v => {
            const next = info.romLevel === v ? "" : v;
            onChange({ ...info, romLevel: next, romJoints: next === "なし" || next === "" ? [] : info.romJoints });
          }}
        />
        {info.romLevel && info.romLevel !== "なし" && (
          <RomEditor joints={info.romJoints} onChange={j => set("romJoints", j)} />
        )}
      </div>

      {/* ADL - FIM */}
      <div className={hl.fim ? HL_STYLE : NO_HL_STYLE}>
        {hl.fim && <p className="text-[10px] font-bold text-green-700 mb-1">この疾患に関連性が高い項目です</p>}
        <FieldLabel hint="任意">ADL評価 — FIM（機能的自立度評価表）</FieldLabel>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 mb-1">合計点（18〜126点）</p>
              <div className="flex items-center gap-2">
                <input type="number" min="18" max="126" value={info.fimTotal}
                  onChange={e => set("fimTotal", e.target.value)}
                  placeholder="例：85"
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                />
                <span className="text-xs text-gray-400">点</span>
                {fimMeta && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full border"
                    style={{ color: fimMeta.color, background: fimMeta.color + "15", borderColor: fimMeta.color + "40" }}>
                    {fimMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">運動項目（0〜91点）任意</p>
              <input type="number" min="0" max="91" value={info.fimMotor}
                onChange={e => set("fimMotor", e.target.value)}
                placeholder="例：55"
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">認知項目（0〜35点）任意</p>
              <input type="number" min="0" max="35" value={info.fimCog}
                onChange={e => set("fimCog", e.target.value)}
                placeholder="例：30"
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ADL - BI */}
      <div className={hl.bi ? HL_STYLE : NO_HL_STYLE}>
        {hl.bi && <p className="text-[10px] font-bold text-green-700 mb-1">この疾患に関連性が高い項目です</p>}
        <FieldLabel hint="任意">ADL評価 — バーサルインデックス（BI）</FieldLabel>
        <div className="flex items-center gap-2">
          <input type="number" min="0" max="100" value={info.biTotal}
            onChange={e => set("biTotal", e.target.value)}
            placeholder="例：60"
            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
          <span className="text-xs text-gray-400">点（0〜100点）</span>
          {biMeta && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border"
              style={{ color: biMeta.color, background: biMeta.color + "15", borderColor: biMeta.color + "40" }}>
              {biMeta.label}
            </span>
          )}
        </div>
      </div>

      {/* ── 環境・背景 ── */}
      <SectionHeader label="環境・背景" />

      <div>
        <FieldLabel hint="任意">受療環境</FieldLabel>
        <ChipGroup
          options={["入院", "外来"]}
          value={info.environment}
          onChange={v => onChange({ ...info, environment: info.environment === v ? "" : v, surgery: "", postOpDays: "", visitFreq: "", phase: "" })}
        />
        {info.environment === "入院" && (
          <div className="mt-3 ml-3 pl-3 border-l-2 border-blue-100 space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">術式（任意）</p>
              <input type="text" value={info.surgery}
                onChange={e => set("surgery", e.target.value)}
                placeholder="例：人工膝関節置換術（TKA）、骨折術後"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">術後経過日数（任意）</p>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={info.postOpDays}
                  onChange={e => set("postOpDays", e.target.value)}
                  placeholder="例：14"
                  className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                />
                <span className="text-xs text-gray-400">日</span>
              </div>
            </div>
          </div>
        )}
        {info.environment === "外来" && (
          <div className="mt-3 ml-3 pl-3 border-l-2 border-green-100 space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">通院頻度</p>
              <ChipGroup
                options={["週1回", "週2回", "週3回以上"]}
                value={info.visitFreq}
                onChange={v => set("visitFreq", info.visitFreq === v ? "" : v)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">症状の経過</p>
              <ChipGroup
                options={["急性期", "亜急性期", "慢性期"]}
                value={info.phase}
                onChange={v => set("phase", info.phase === v ? "" : v)}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <FieldLabel hint="任意">生活環境</FieldLabel>
        <ChipGroup
          options={["独居", "家族と同居", "施設入所"]}
          value={info.living}
          onChange={v => set("living", info.living === v ? "" : v)}
        />
      </div>

      {/* ── 禁忌・注意事項 ── */}
      <SectionHeader label="禁忌・注意事項" />

      <div>
        <FieldLabel hint="任意">合併症・既往歴</FieldLabel>
        <input type="text" value={info.comorbidities}
          onChange={e => set("comorbidities", e.target.value)}
          placeholder="例：糖尿病、高血圧、ペースメーカー装着、骨粗鬆症"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <FieldLabel hint="任意">内服薬</FieldLabel>
        <input type="text" value={info.medications}
          onChange={e => set("medications", e.target.value)}
          placeholder="例：ワーファリン、β遮断薬、ステロイド"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* ── 自由記載 ── */}
      <SectionHeader label="その他・自由記載" />

      <div>
        <FieldLabel hint="任意">選択肢にない評価結果や気になる点</FieldLabel>
        <textarea value={info.freeText} onChange={e => set("freeText", e.target.value)}
          rows={6}
          placeholder={`選択肢にない評価結果や気になる点を自由に記載してください。

例：
・Berg Balance Scale 32点
・10m歩行テスト 15秒
・起立性低血圧あり
・認知機能低下あり（MMSE 20点）
・家屋に段差が多い
・本人のやる気が低い
・疼痛が夜間に強くなる　など`}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300 leading-relaxed"
        />
      </div>
    </div>
  );
}
