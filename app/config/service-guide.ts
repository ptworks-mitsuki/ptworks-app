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
      { id: "treatment",      label: "治療方針が決まらない",         service: "治療を考える",         url: "/stage1",              tab: "treatment" },
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
