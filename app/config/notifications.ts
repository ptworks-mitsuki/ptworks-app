export type NotificationType = "feature" | "update" | "fix" | "important";

export interface Notification {
  id:    string;
  title: string;
  body:  string;
  type:  NotificationType;
  date:  string;
  isNew: boolean;
}

// 新しい通知を追加する時はこのファイルの先頭に追加するだけで自動的にアプリに反映される
export const notifications: Notification[] = [
  {
    id:    "notif_001",
    title: "自主トレ指導書作成機能を追加しました",
    body:  "AI治療考察と連携した指導書作成・単独作成・今日の治療を即時まとめる機能が使えるようになりました。",
    type:  "feature",
    date:  "2026-07-08",
    isNew: true,
  },
  {
    id:    "notif_002",
    title: "PT専用GPTを実装しました",
    body:  "疾患を調べると何でも相談するを統合したPT専用GPTが使えるようになりました。文献検索との2タブ構成でご利用いただけます。",
    type:  "feature",
    date:  "2026-07-07",
    isNew: true,
  },
  {
    id:    "notif_003",
    title: "診療報酬・算定ガイドを追加しました",
    body:  "2026年改訂に対応した算定日数計算ツール・加算計算・減算チェック・計画書期限計算が使えるようになりました。",
    type:  "feature",
    date:  "2026-07-05",
    isNew: true,
  },
  {
    id:    "notif_004",
    title: "自分だけのノート・辞書機能を追加しました",
    body:  "PT専用GPT・AI治療考察・文献検索で得た情報をマイページに保存できるようになりました。",
    type:  "feature",
    date:  "2026-07-04",
    isNew: true,
  },
  {
    id:    "notif_005",
    title: "ホームをリデザインしました",
    body:  "よりシンプルで使いやすいホームに変更しました。検索窓から直接PT専用GPTが使えるようになりました。",
    type:  "update",
    date:  "2026-07-03",
    isNew: false,
  },
];
