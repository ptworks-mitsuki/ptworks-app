export interface Subcategory {
  id:      string;
  label:   string;
  service: string;
  url:     string;
  tab?:    string;
}

export interface Category {
  id:             string;
  label:          string;
  subcategories:  Subcategory[];
}

export const categories: Category[] = [
  {
    id: "patient",
    label: "担当患者のこと",
    subcategories: [
      { id: "treatment",      label: "治療方針が決まらない",         service: "AI治療考察",         url: "/stage1",              tab: "treatment" },
      { id: "evaluation",     label: "評価の解釈がわからない",       service: "何でも相談する",        url: "/stage1",              tab: "consult"   },
      { id: "contraindication",label: "禁忌・リスクを確認したい",   service: "疾患を調べる",          url: "/stage1",              tab: "search"    },
      { id: "explanation",    label: "患者への説明方法を知りたい",   service: "何でも相談する",        url: "/stage1",              tab: "consult"   },
      { id: "homeex",         label: "自主トレ指導書を作りたい",     service: "自主トレ指導書作成",    url: "/stage1/homeexercise"                   },
    ],
  },
  {
    id: "knowledge",
    label: "疾患・解剖・知識のこと",
    subcategories: [
      { id: "disease",   label: "疾患の基本情報を調べたい",       service: "疾患を調べる",   url: "/stage1",           tab: "search"   },
      { id: "anatomy",   label: "解剖・筋肉・起始停止を知りたい", service: "何でも相談する", url: "/stage1",           tab: "consult"  },
      { id: "evidence",  label: "論文・根拠を調べたい",           service: "文献検索",       url: "/stage1/literature"                },
      { id: "textbook",  label: "参考書を探したい",               service: "参考書検索",     url: "/stage1/literature", tab: "textbook" },
      { id: "learning",  label: "最新の知識を学びたい",           service: "学習コンテンツ", url: "/stage1/learning"                  },
    ],
  },
  {
    id: "presentation",
    label: "学会発表・資料作成のこと",
    subcategories: [
      { id: "slide",     label: "発表スライドを作りたい", service: "スライド自動生成", url: "/stage1/slides"    },
      { id: "script",    label: "発表原稿を作りたい",     service: "スライド自動生成", url: "/stage1/slides"    },
      { id: "reference", label: "参考文献を探したい",     service: "文献検索",         url: "/stage1/literature" },
    ],
  },
  {
    id: "billing",
    label: "診療報酬・算定のこと",
    subcategories: [
      { id: "days",      label: "算定日数を確認したい",      service: "診療報酬・算定ガイド", url: "/stage1/learning/diagnosis" },
      { id: "addition",  label: "加算が取れるか確認したい",  service: "診療報酬・算定ガイド", url: "/stage1/learning/diagnosis" },
      { id: "reduction", label: "減算になるか確認したい",    service: "診療報酬・算定ガイド", url: "/stage1/learning/diagnosis" },
    ],
  },
  {
    id: "career",
    label: "副業・キャリアのこと",
    subcategories: [
      { id: "sidejob",      label: "副業の始め方を知りたい",    service: "副業支援パック",   url: "/stage2" },
      { id: "independence", label: "独立・開業について知りたい", service: "開業・院運営パック", url: "/stage3" },
    ],
  },
];

// 新しいサービスを追加する時は
// ここにcategoryまたはsubcategoryを追加するだけ

// ─── サービスルーティング ─────────────────────────────────────────────────

export interface ServiceRoute {
  service: string;
  url:     string;
  desc:    string;
}

const ROUTING_RULES: Array<{ pattern: RegExp; route: (q: string) => ServiceRoute }> = [
  { pattern: /禁忌|注意事項|リスク|危険|合併症/,             route: q => ({ service: "疾患を調べる",          url: "/stage1",                    desc: `${q}の禁忌・注意事項を教科書ベースで確認できます` }) },
  { pattern: /基本情報|定義|概要|術式|手術内容|病態|症状/,   route: q => ({ service: "疾患を調べる",          url: "/stage1",                    desc: `${q}の詳細情報を教科書・ガイドライン基準で整理します` }) },
  { pattern: /リハビリ方針|治療方針|アプローチ|プログラム/,  route: q => ({ service: "AI治療考察",           url: "/stage1",                    desc: `${q}の個別リハビリ方針をAIが提案します` }) },
  { pattern: /評価方法|スケール|判定基準|評価指標/,          route: q => ({ service: "疾患を調べる",          url: "/stage1",                    desc: `${q}の評価方法・スケールを確認できます` }) },
  { pattern: /予後|回復|ゴール|ADL|転帰|目標/,              route: q => ({ service: "疾患を調べる",          url: "/stage1",                    desc: `${q}の予後予測・ゴール設定の指標を整理します` }) },
  { pattern: /論文|文献|根拠|エビデンス|研究|参考書|教科書/, route: q => ({ service: "文献検索",              url: "/stage1/literature",         desc: `${q}に関連する文献・参考書を検索できます` }) },
  { pattern: /スライド|発表|学会|プレゼン|原稿/,             route: q => ({ service: "スライド自動生成",      url: "/stage1/slides",             desc: `${q}の発表スライドを自動生成できます` }) },
  { pattern: /自主トレ|指導書|ホームエクサ/,                 route: q => ({ service: "自主トレ指導書作成",    url: "/stage1/homeexercise",       desc: `${q}向けの自主トレ指導書を作成できます` }) },
  { pattern: /算定|加算|点数|診療報酬|請求|減算/,            route: q => ({ service: "診療報酬・算定ガイド", url: "/stage1/learning/diagnosis", desc: `${q}に関する算定ルールを確認できます` }) },
  { pattern: /副業|収入|稼ぐ|コンテンツ販売/,               route: q => ({ service: "副業支援パック",        url: "/stage2",                    desc: `PT向け副業の始め方をサポートします` }) },
  { pattern: /開業|独立|院運営|経営/,                        route: q => ({ service: "開業・院運営パック",    url: "/stage3",                    desc: `開業・院運営に必要な情報を提供します` }) },
  { pattern: /学習|勉強|知識|スキル/,                        route: q => ({ service: "学習コンテンツ",        url: "/stage1/learning",           desc: `${q}に関する学習コンテンツを確認できます` }) },
];

export function routeIntent(query: string, intent: string): ServiceRoute {
  const text = `${intent} ${query}`.toLowerCase();
  for (const rule of ROUTING_RULES) {
    if (rule.pattern.test(text)) return rule.route(query);
  }
  return { service: "何でも相談する", url: "/stage1", desc: `${query}について何でも相談できます` };
}
