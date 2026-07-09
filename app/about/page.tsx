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
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.18] tracking-tight mb-6">
            理学療法士の、<br />可能性を広げる。
          </h1>
          <p className="text-white/65 text-base sm:text-lg leading-[1.9] max-w-xl">
            臨床の質を上げ、収入の壁を越え、<br />
            キャリアを自分でデザインできる。<br />
            そんな環境を、すべてのPTに届けたい。
          </p>
        </div>
      </section>

      {/* ── ② MISSION ──────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-4">Mission</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8">
            AIで理学療法士をアップデートする。
          </h2>
          <div className="space-y-5 text-gray-700 text-base sm:text-lg leading-[1.95]">
            <p>
              AIの発展が思考力を奪うことへの恐怖から
              <br />
              私たちはあえて「理学療法士の考えを育てるAI」を選びました。
              <br />
              答えを出すだけのAIではなく
              <br />
              あなたの臨床思考を加速し
              <br />
              より深く考えられる理学療法士を育てることが
              <br />
              PT Worksの目指す姿です。
            </p>
            <p>
              AIは道具です。
              <br />
              しかし使い方次第で、
              <br />
              思考の質も、働き方も、
              <br />
              キャリアの可能性も変わります。
            </p>
            <p>
              PT Worksは、AIを理学療法士の
              <br />
              「思考パートナー」として設計しました。
              <br />
              調べる・考える・相談する・発信する。
              <br />
              そのすべてをAIが加速させます。
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
              思考を、加速させる
            </h2>
            <div className="space-y-5 text-gray-700 text-base sm:text-lg leading-[1.95]">
              <p>疾患を調べる。AI治療考察。論文を読む。算定ルールを確認する。</p>
              <p>
                理学療法士の仕事は、臨床の時間と同じくらい「考える時間」で成り立っています。
              </p>
              <p>
                PT Worksは、その「考える時間」をAIの力で圧縮し、より深く・より速く・より自由に思考できる環境を提供します。
              </p>
              <p>
                教科書を何冊も開く必要はありません。論文を読む時間がなくても、最新のエビデンスに触れられます。治療方針で迷ったとき、24時間いつでも相談できます。
              </p>
              <p className="font-bold text-gray-900">
                これは、思考の効率化ではありません。思考の拡張です。
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ④ PHILOSOPHY ──────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20 relative overflow-hidden">
          {/* 装飾：右下に薄いダークグリーン */}
          <div
            className="absolute bottom-0 right-0 w-64 h-64 rounded-full pointer-events-none select-none"
            style={{ background: "#1B4332", opacity: 0.04, transform: "translate(30%, 30%)" }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-4">Philosophy</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8">
              PT Worksに込めた想い
            </h2>

            <div className="space-y-5 text-gray-700 text-base sm:text-lg leading-[1.95]">
              <p>
                私はAIで理学療法士の仕事を
                <br />
                奪いたいわけではありません。
              </p>
              <p>
                目指しているのは、AIによって
                <br />
                理学療法士一人ひとりの思考を加速・拡張し、
                <br />
                臨床の質を高めることです。
              </p>
              <p>
                理学療法には唯一の正解がありません。
                <br />
                だからこそ、臨床では常に
                <br />
                「なぜこの評価をするのか」
                <br />
                「なぜこの治療を選ぶのか」を
                <br />
                考え続ける姿勢が重要だと考えています。
              </p>
              <p>
                一方で、AIは非常に便利である反面、
                <br />
                使い方を誤れば思考を止め、
                <br />
                依存を生む可能性もあります。
              </p>
              <p>
                そのためPT Worksは、
                <br />
                「AIが答えを与えるサービス」ではなく、
                <br />
                「AIとの対話を通して
                <br />
                理学療法士の考えを育てること」を目指します。
              </p>
              <p>
                AIは答えを押し付ける存在ではなく、
                <br />
                新たな視点を提示し、見落としを減らし、
                <br />
                臨床推論を支えるパートナーです。
                <br />
                最終的な判断は常に
                <br />
                理学療法士自身が行うという考えを
                <br />
                大切にしています。
              </p>
              <p>
                また、日々増え続ける論文やガイドラインを
                <br />
                一人ですべて追い続けることは容易ではありません。
                <br />
                PT Worksは最新の知見へアクセスしやすくし、
                <br />
                エビデンスと現場経験を結び付けることで、
                <br />
                患者さんにより良い医療を届けられる環境を
                <br />
                つくりたいと考えています。
              </p>
              <p>
                私が本当に実現したいのは、
                <br />
                「便利なAIサービス」を作ることではありません。
              </p>
              <p>
                理学療法士が生涯学び続け、
                <br />
                考え続ける文化を支え、
                <br />
                業界全体の臨床力を高めること。
              </p>
              <p>
                そして、その先にいる患者さんが、
                <br />
                より質の高いリハビリテーションを
                <br />
                受けられる未来をつくることです。
              </p>
              <p>
                PT Worksは、理学療法士の代わりに考えるAIではなく、
                <br />
                理学療法士と共に考え、共に成長するAIで
                <br />
                あり続けたいと考えています。
              </p>
            </div>

            {/* 締めの文章 */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-xl sm:text-2xl font-black leading-snug" style={{ color: "#1B4332" }}>
                理学療法士の考えを育てるAI。
                <br />
                それがPT Worksです。
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ⑤ PROBLEMS ─────────────────────────────────────────── */}
      <section style={{ background: "#F9FAFB" }}>
        <div className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-3">Background</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              なぜ、PT専用なのか
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              {
                num: "01", title: "汎用AIとの違い",
                body: "ChatGPTやGoogleでも、医療情報は調べられます。\nしかし、それらは「PTの臨床現場を知らない」ツールです。",
                solution: "PT専用の文脈で即座に答えます",
                accent: "#1d4ed8", top: "#2563EB",
              },
              {
                num: "02", title: "PTならではの問い",
                body: "「MMT4の患者に、いつ階段昇降訓練を開始するか」\n「廃用症候群の算定起算日はいつか」\n「人工股関節の禁忌肢位は」",
                solution: "現場の文脈で即座に答えられるのはPT専用ツールだけ",
                accent: "#15803d", top: "#16a34a",
              },
              {
                num: "03", title: "PT専用の設計思想",
                body: "PT Worksは、理学療法の教科書・ガイドライン・算定ルールを深く理解した上で設計されています。",
                solution: "PTが毎日使える道具として作られています",
                accent: "#b45309", top: "#E85D04",
              },
            ] as const).map(c => (
              <div key={c.num}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-200">
                <div className="h-1.5" style={{ background: c.top }} />
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-3xl font-black mb-3 leading-none" style={{ color: c.top, opacity: 0.15 }}>{c.num}</p>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.accent }}>課題</p>
                  <p className="text-lg font-black text-gray-900 mb-3">{c.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 whitespace-pre-line">{c.body}</p>
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold mb-1" style={{ color: c.accent }}>解決</p>
                    <p className="text-sm font-semibold text-gray-800">{c.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── ⑤ FOUNDER ──────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.22em] mb-3">Founder</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-10">
            つくった人について
          </h2>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
            {/* 左: 丸型写真プレースホルダー */}
            <FounderPhoto />

            {/* 右: プロフィール情報 */}
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

      {/* ── ⑥ PROMISE ──────────────────────────────────────────── */}
      <section style={{ background: "#1B4332" }}>
        <div className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-bold text-white/40 uppercase tracking-[0.22em] mb-4">Vision</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-10">
            働き方を、自分で決める
          </h2>
          <ul className="space-y-5">
            {[
              "PT Worksが目指すのは、臨床準備の効率化だけではありません。",
              "自分の知識を動画や資料にして販売する。セミナーを開く。整体院を開業する。",
              "スポーツ・企業・教育・AIの分野で新しい価値を生み出す。",
              "臨床で培った専門性を、自分らしい形で社会に届けられる環境をつくっていきます。",
            ].map(item => (
              <li key={item} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(74,222,128,0.15)", border: "1.5px solid rgba(74,222,128,0.5)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6 L5 9 L10 3" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-base text-white/80 leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>
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
