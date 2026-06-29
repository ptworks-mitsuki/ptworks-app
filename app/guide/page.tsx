export default function GuidePage() {
  return (
    <main className="bg-[#F8F9FA] min-h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">使い方ガイド</span>
          <h1 className="text-2xl font-black text-gray-900 mt-2">PT Worksの使い方について</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-black text-gray-900 mb-4">
            PT Worksは、考える材料を整理する道具です
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-4">
            <p>
              PT Worksは、最終的な臨床判断の代わりをするものではありません。
              文献・教科書をもとに情報を整理し、PT自身がより良い判断をするための準備をサポートするツールです。
            </p>
            <p>
              AIが出した内容をそのまま使うのではなく、「なぜこの提案なのか」を確認しながら活用してください。
            </p>
            <p>
              PT Worksは、現場で働くPTを支えるための道具であり、PTの専門性に取って代わるものではありません。
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-800 mb-2">ご利用にあたって</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            PT Worksが提供する情報は、文献・教科書をもとに整理したものです。
            最終的な臨床判断は、原典の確認とPT自身の専門的判断のもとで行ってください。
            個々の患者さんの状態は異なります。情報を参照する際は必ず一次文献を確認してください。
          </p>
        </div>
      </div>
    </main>
  );
}
