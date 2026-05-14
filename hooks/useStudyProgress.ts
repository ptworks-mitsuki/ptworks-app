"use client";

import { useState, useEffect, useCallback } from "react";

export interface Badge {
  id:    string;
  label: string;
  icon:  string;
  desc:  string;
  earned: boolean;
}

interface StudyData {
  streak:      number;   // 連続学習日数
  lastStudied: string;   // ISO date string (YYYY-MM-DD)
  totalDays:   number;   // 累計学習日数
  totalSearches: number; // 累計検索数
  monthlySearches: { [ym: string]: number }; // "2025-05" → count
}

const KEY = "pt-study-progress";

const TODAY = () => new Date().toISOString().slice(0, 10);

function loadData(): StudyData {
  if (typeof window === "undefined") return defaultData();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultData(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultData();
}

function defaultData(): StudyData {
  return {
    streak: 0,
    lastStudied: "",
    totalDays: 0,
    totalSearches: 0,
    monthlySearches: {},
  };
}

function save(data: StudyData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// Check/update streak on mount
function computeStreak(data: StudyData): StudyData {
  const today = TODAY();
  if (data.lastStudied === today) return data;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  const newStreak = data.lastStudied === yStr ? data.streak : 0;
  return { ...data }; // streak only updates when you study
}

export function useStudyProgress() {
  const [data, setData] = useState<StudyData>(defaultData);

  useEffect(() => {
    setData(loadData());
  }, []);

  const recordStudy = useCallback(() => {
    setData(prev => {
      const today = TODAY();
      if (prev.lastStudied === today) return prev;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);

      const newStreak = prev.lastStudied === yStr ? prev.streak + 1 : 1;
      const ym = today.slice(0, 7);
      const monthly = { ...prev.monthlySearches };
      monthly[ym] = (monthly[ym] ?? 0) + 1;

      const next: StudyData = {
        ...prev,
        streak:     newStreak,
        lastStudied: today,
        totalDays:  prev.totalDays + 1,
        totalSearches: prev.totalSearches + 1,
        monthlySearches: monthly,
      };
      save(next);
      return next;
    });
  }, []);

  const BADGES: Badge[] = [
    { id: "first",   icon: "🎉", label: "初めての一歩",   desc: "初回ログイン",           earned: data.totalDays >= 1 },
    { id: "day3",    icon: "🔥", label: "3日連続学習",    desc: "3日連続で学習",           earned: data.streak >= 3 },
    { id: "day7",    icon: "⚡", label: "1週間連続",      desc: "7日連続で学習",           earned: data.streak >= 7 },
    { id: "day30",   icon: "🏆", label: "1ヶ月連続",      desc: "30日連続で学習",          earned: data.streak >= 30 },
    { id: "search10",icon: "🔍", label: "10回検索達成",   desc: "累計10回以上検索",        earned: data.totalSearches >= 10 },
    { id: "search50",icon: "💎", label: "50回検索達成",   desc: "累計50回以上検索",        earned: data.totalSearches >= 50 },
    { id: "total10", icon: "📅", label: "10日間学習",     desc: "累計10日以上学習",        earned: data.totalDays >= 10 },
    { id: "total30", icon: "🌟", label: "学習マスター",   desc: "累計30日以上学習",        earned: data.totalDays >= 30 },
  ];

  const ym = TODAY().slice(0, 7);

  return {
    streak:           data.streak,
    lastStudied:      data.lastStudied,
    totalDays:        data.totalDays,
    totalSearches:    data.totalSearches,
    monthlySearches:  data.monthlySearches[ym] ?? 0,
    badges:           BADGES,
    earnedBadges:     BADGES.filter(b => b.earned),
    recordStudy,
  };
}
