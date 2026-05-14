import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 mb-4">
          <span style={{ color: "#E85D04" }}>PT Works</span>
          <span className="text-xs font-semibold text-orange-700">PT Worksとは</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
          PTの「もっとこうだったら」を<br />全部解決したくて作りました。
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          PT Works 創業者・代表 田島 啓介（理学療法士 / PT歴8年）
        </p>
      </div>

      {/* Founder photo + intro */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 flex gap-5">
        <div className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black"
          style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>
          PT
        </div>
        <div>
          <p className="font-bold text-gray-900 mb-1">田島 啓介</p>
          <p className="text-xs text-gray-400 mb-2">理学療法士（PT）資格保有 / PT歴8年 / PT Works 創業者</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            病院・クリニック・訪問リハビリを経験後、副業・独立を経てPT Worksを創業。
            「PTとして生きることをもっと豊かにしたい」というビジョンのもとサービスを開発中。
          </p>
        </div>
      </div>

      {/* Story sections */}
      <div className="space-y-8">

        <section>
          <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: "#E85D04" }}>1</span>
            悩みは、仲間たちが教えてくれた
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            PTとして8年間働く中で、同僚や後輩から同じ悩みを繰り返し聞いてきました。
          </p>
          <div className="mt-3 space-y-2">
            {[
              "「最新の疾患情報を調べるのに時間がかかりすぎる」",
              "「副業したいけど何から始めればいいかわからない」",
              "「独立開業したいけど集客のやり方が全然わからない」",
              "「PTの給料だけじゃ将来が不安。でも何をすればいいか…」",
            ].map(t => (
              <div key={t} className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                <p className="text-sm text-gray-700">{t}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            これは個人の問題ではなく、<strong className="text-gray-900">PT業界全体の構造的な課題</strong>だと気づきました。
            情報・副業・独立、この3つを一気に解決できるツールを作ろうと決めたのが、PT Works誕生のきっかけです。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: "#1B4332" }}>2</span>
            PT Worksが目指すビジョン
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            私たちのビジョンは、<strong className="text-gray-900">「すべてのPTが、自分らしいキャリアを歩める社会」</strong>を作ることです。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "臨床サポートパック", desc: "疾患・治療情報を素早くキャッチアップ。現場の臨床力を高める。" },
              { title: "副業・開業パック", desc: "副業収入を得て、やがては自分の治療院を開く。" },
              { title: "全部入りパック", desc: "集客・採用・経営まで。AIがあなたの整体院を支える。" },
            ].map(v => (
              <div key={v.title} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="font-bold text-gray-900 text-sm mb-1">{v.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: "#7c3aed" }}>3</span>
            最終ゴールは「整体院独立」のサポート
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            PT Worksの最終形は、<strong className="text-gray-900">PTが自分の整体院を開業・経営するための集客・採用ツール</strong>です。
          </p>
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-100 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-2 text-sm">PT Worksが実現したいこと</p>
            <ul className="space-y-1.5">
              {[
                "Googleマップ・SNSで自動集客できる",
                "求人・採用を効率化して良いスタッフを集められる",
                "患者さんとのコミュニケーションをAIがサポート",
                "経費管理・確定申告をAIが自動化する",
                "開業から1年以内に安定経営できる仕組みを提供する",
              ].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-bold shrink-0" style={{ color: "#E85D04" }}>●</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: "#E85D04" }}>4</span>
            創業者からのメッセージ
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-700 leading-relaxed">
              「PTとして働き始めた頃、患者さんの回復を助けることにやりがいを感じながらも、
              <strong className="text-gray-900">収入・情報・将来のキャリア</strong>に不安を抱えていました。
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              副業を始め、独立を経験する中で気づいたのは、
              <strong className="text-gray-900">正しい情報とツールさえあれば、PTでも十分に豊かなキャリアが作れる</strong>ということ。
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              PT Worksはそのツールを、全国のPT仲間に届けるために作りました。
              一緒に、PTの可能性を広げていきましょう。」
            </p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}>
                PT
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">田島 啓介</p>
                <p className="text-[10px] text-gray-400">PT Works 創業者 / 理学療法士</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link href="/register"
          className="inline-block px-8 py-3.5 rounded-xl font-bold text-white text-sm transition hover:opacity-90 shadow-sm"
          style={{ background: "#E85D04" }}>
          無料でPT Worksを始める →
        </Link>
        <p className="mt-2 text-xs text-gray-400">クレジットカード不要・30秒で登録完了</p>
      </div>
    </main>
  );
}
