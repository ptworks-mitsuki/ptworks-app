import { MedicalSearch } from "@/components/MedicalSearch";

export default function Stage1Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6" role="main">
      <div className="text-center mb-6 print:hidden">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-green-700">臨床サポートパック</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">疾患・症状・部位から検索</h2>
        <p className="text-gray-500 text-sm">
          疾患名・症状・身体部位を入力すると、7項目の臨床情報をAIが生成します
        </p>
      </div>
      <MedicalSearch />
    </main>
  );
}
