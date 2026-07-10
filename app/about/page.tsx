import Link from "next/link";
import { FounderPhoto } from "@/components/FounderPhoto";

export const dynamic = "force-static";

function SectionDivider() {
  return <div className="h-px bg-gray-100" />;
}

export default function AboutPage() {
  return (
    <main className="min-h-screen">

      {/* ── ① HERO ─────────────────────────────────────────────── */}
      <section style={{ background: "#1B4332" }}>
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-xs font-bold text-white/40 uppercase tracking-[0.25em] mb-5">
            PT Works について
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.22] tracking-tight">
            理学療法士の「思考」は、<br />財産であり、<br className="sm:hidden" />新たな価値を生む。
          </h1>
        </div>
      </section>

      {/* ── ② MISSION ──────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-4">Mission</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8">
            理学療法士の思考を育むAI。
          </h2>
          <div className="space-y-5 text-gray-700 text-base sm:text-lg leading-[1.95]">
            <p>理学療法に、唯一の正解はありません。</p>
            <p>
              患者さん一人ひとりの身体や生活、価値観は異なり、
              <br />
              同じ疾患であっても最適な評価や治療は変わります。
            </p>
            <p>
              だからこそ、理学療法士には知識だけではなく、
              <br />
              「なぜそう考えるのか」を問い続ける
              <br />
              思考する力が求められます。
            </p>
            <p>
              しかし、医療は日々進歩し、
              <br />
              膨大な論文やガイドライン、新しい知見が
              <br />
              生まれ続けています。
              <br />
              そのすべてを追いながら、日々の臨床で
              <br />
              深く思考し続けることは決して簡単ではありません。
            </p>
            <p>PT Worksは、その課題をAIで解決したいと考えました。</p>
            <p>
              私たちが目指すのは、
              <br />
              AIが理学療法士の代わりに答えを出すことではありません。
            </p>
            <p>
              AIとの対話を通して、
              <br />
              理学療法士一人ひとりの思考を育み、
              <br />
              思考を加速・拡張させること。
            </p>
            <p>
              AIは答えを押し付ける存在ではなく、
              <br />
              新たな視点を示し、見落としを減らし、
              <br />
              臨床推論を支える思考パートナーです。
            </p>
            <p>理学療法士がより深く思考し、学び続けること。</p>
            <p>
              その積み重ねが、患者さんへ提供できる医療の質を高め、
              <br />
              業界全体の未来をより良いものにすると信じています。
            </p>
            <p className="font-bold text-gray-900">
              PT Worksは、理学療法士の思考を育むAIとして、
              <br />
              あなたとともに成長し続けます。
            </p>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ③ BACKGROUND ───────────────────────────────────────── */}
      <section style={{ background: "#FFF8F0" }}>
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20 relative overflow-hidden">
          {/* 大きな引用符デザイン */}
          <div
            className="absolute top-4 right-4 sm:right-10 font-black select-none pointer-events-none leading-none"
            style={{ fontSize: "200px", color: "#E85D04", opacity: 0.06, fontFamily: "serif" }}
            aria-hidden="true"
          >
            &#x300C;
          </div>

          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-4">Background</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8">
              思考を、加速・拡張する。
            </h2>
            <div className="space-y-5 text-gray-700 text-base sm:text-lg leading-[1.95]">
              <p>AIは非常に便利な技術です。</p>
              <p>
                しかし、その便利さは使い方を誤れば、
                <br />
                人の思考を止めてしまう可能性もあります。
              </p>
              <p>私たちは、そのようなAIをつくりたいわけではありません。</p>
              <p>
                PT Worksが目指すのは、
                <br />
                思考を代替するAIではなく、
                <br />
                思考を加速・拡張するAIです。
              </p>
              <p>
                わからないことを調べる。
                <br />
                症例について思考する。
                <br />
                論文を読み、エビデンスを理解する。
                <br />
                新たな視点に触れ、自分の考えを更新する。
              </p>
              <p>
                そのすべての過程でAIが寄り添い、
                <br />
                「もっとこういう考え方もある」
                <br />
                「この視点は見落としていないか」
                <br />
                と対話を重ねることで、
                <br />
                理学療法士自身の臨床推論能力を育みます。
              </p>
              <p>
                PT Worksが届けたいのは、
                <br />
                「早く答えを得る体験」ではありません。
              </p>
              <p>
                より深く思考し、
                <br />
                より良い判断ができる理学療法士へ
                <br />
                成長する体験です。
              </p>
              <p>AIは目的ではなく、あくまで道具です。</p>
              <p>
                その道具をどう使うかで、
                <br />
                理学療法士の未来も、
                <br />
                患者さんの未来も変わります。
              </p>
              <p className="font-bold text-gray-900">
                私たちは、AIの力で理学療法士の可能性を広げ、
                <br />
                思考を加速・拡張させ、
                <br />
                業界全体の発展に貢献していきます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ④ VALUE ─────────────────────────────────────────────── */}
      <section style={{ background: "#F9FAFB" }}>
        <div className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
          <div className="mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-4">Value</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              PT Worksが大切にしていること。
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              {
                num: "01",
                title: "思考を育む",
                body: "AIは答えを与えません。\n新しい視点を提示し、\n理学療法士自身が考えるきっかけをつくります。",
                accent: "#1B4332",
                top: "#1B4332",
              },
              {
                num: "02",
                title: "根拠を示す",
                body: "感覚ではなく、エビデンスに基づいた情報を提供します。\nただし、最終判断は常に理学療法士が行います。",
                accent: "#1d4ed8",
                top: "#2563EB",
              },
              {
                num: "03",
                title: "依存させない",
                body: "AIへの依存は、思考力の低下を招きます。\nPT Worksは、使えば使うほど\n理学療法士の思考力が育つよう設計されています。",
                accent: "#b45309",
                top: "#E85D04",
              },
            ] as const).map(c => (
              <div key={c.num}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-200">
                <div className="h-1.5" style={{ background: c.top }} />
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-3xl font-black mb-4 leading-none" style={{ color: c.top, opacity: 0.15 }}>{c.num}</p>
                  <p className="text-lg font-black text-gray-900 mb-3">{c.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 whitespace-pre-line">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ⑤ CLOSING COPY ──────────────────────────────────────── */}
      <section style={{ background: "#1B4332" }}>
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20 text-center">
          <p className="text-2xl sm:text-4xl font-black text-white leading-[1.4]">
            理学療法士の思考を育むAI。
            <br />
            それが、PT Worksです。
          </p>
        </div>
      </section>

      <SectionDivider />

      {/* ── ⑥ FOUNDER ──────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-3">Founder</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-10">
            つくった人について
          </h2>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
            <FounderPhoto />

            <div className="flex-1">
              <div className="mb-6">
                <p className="text-2xl sm:text-3xl font-black text-gray-900">藤 充輝</p>
                <p className="text-sm text-gray-400 mt-0.5">とう みつき</p>
                <p className="text-sm text-gray-600 mt-1.5">理学療法士 / PT Works 創業者 / カヌーポロ日本代表コーチ</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">略歴</p>
                  <ul className="space-y-2.5">
                    {[
                      "整形外科病院・整体院勤務を経てPT Works創業",
                      "カヌーポロ日本代表コーチとして世界大会・アジア大会に出場",
                      "現役理学療法士として臨床・開発を並行",
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: "#1B4332" }} />
                        <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">資格・実績</p>
                  <ul className="space-y-2.5">
                    {[
                      "理学療法士 国家資格",
                      "筋膜マニピュレーション Level 1 取得",
                      "カヌーポロ日本代表コーチ",
                      "世界大会・アジア大会 出場",
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: "#1B4332" }} />
                        <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <blockquote className="border-l-4 pl-5 py-1" style={{ borderColor: "#1B4332" }}>
                <p className="text-sm sm:text-base text-gray-700 leading-[1.9] italic">
                  「現場を知る人間が、現場のために作ったツール」であることが、<br />
                  PT Worksの最大の強みです。
                </p>
                <p className="text-xs text-gray-400 mt-2 not-italic">— 藤 充輝</p>
              </blockquote>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-8 text-center">
            写真エリアをクリックすると写真を変更できます（推奨 400×400px 以上 / JPG・PNG）
          </p>
        </div>
      </section>

      {/* ── ⑦ CTA ──────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-6 py-14 sm:py-20 text-center">
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            理学療法士の可能性を、創造する。
          </p>
          <p className="text-gray-400 text-sm mb-8">それがPT Worksです。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-white text-base hover:opacity-90 shadow-lg transition"
              style={{ background: "#E85D04" }}>
              無料で始める
            </Link>
            <Link href="/stage1"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-gray-700 text-base border-2 border-gray-200 hover:bg-gray-50 transition">
              登録なしで試す
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
