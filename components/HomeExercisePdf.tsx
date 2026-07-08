"use client";

import {
  Document, Page, Text, View, StyleSheet, pdf,
} from "@react-pdf/renderer";
import type { ExerciseItem } from "@/app/api/homeexercise/route";

const ORANGE = "#E85D04";
const GREEN  = "#1B4332";
const GRAY   = "#6B7280";
const LIGHT  = "#F9FAFB";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
  page: {
    fontFamily:  "Helvetica",
    fontSize:    10,
    padding:     32,
    color:       "#111",
    backgroundColor: "#FFFFFF",
  },
  // Header
  headerRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    marginBottom:   16,
    paddingBottom:  12,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerTitle: {
    fontSize:   18,
    fontFamily: "Helvetica-Bold",
    color:      GREEN,
  },
  headerSub: {
    fontSize: 8,
    color:    GRAY,
    marginTop: 2,
  },
  logoText: {
    fontSize:   11,
    fontFamily: "Helvetica-Bold",
    color:      ORANGE,
  },
  logoSub: {
    fontSize: 7,
    color:    GRAY,
    marginTop: 1,
    textAlign: "right",
  },
  // Meta info
  metaBox: {
    backgroundColor: LIGHT,
    borderRadius:    6,
    padding:         10,
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     BORDER,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom:  3,
  },
  metaLabel: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      GRAY,
    width:      56,
  },
  metaValue: {
    fontSize: 9,
    color:    "#111",
    flex:     1,
  },
  // Exercise card
  exCard: {
    marginBottom:    12,
    borderRadius:    6,
    borderWidth:     1,
    borderColor:     BORDER,
    overflow:        "hidden",
  },
  exCardHeader: {
    backgroundColor: GREEN,
    padding:         "6 10",
    flexDirection:   "row",
    alignItems:      "center",
    gap:             6,
  },
  exNum: {
    fontSize:   10,
    fontFamily: "Helvetica-Bold",
    color:      "#fff",
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  exName: {
    fontSize:   11,
    fontFamily: "Helvetica-Bold",
    color:      "#fff",
    flex:       1,
  },
  exBody: {
    padding: "8 10",
  },
  exPurpose: {
    fontSize:        9,
    color:           "#374151",
    marginBottom:    6,
    backgroundColor: "#EFF6FF",
    padding:         "4 6",
    borderRadius:    4,
  },
  stepsTitle: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      "#111",
    marginBottom: 3,
  },
  stepRow: {
    flexDirection: "row",
    gap:           4,
    marginBottom:  2,
  },
  stepNum: {
    fontSize: 9,
    color:    ORANGE,
    fontFamily: "Helvetica-Bold",
    width:    12,
  },
  stepText: {
    fontSize: 9,
    color:    "#374151",
    flex:     1,
    lineHeight: 1.4,
  },
  repRow: {
    flexDirection:  "row",
    gap:            16,
    marginTop:      6,
    marginBottom:   4,
  },
  repBox: {
    backgroundColor: LIGHT,
    borderRadius:    4,
    padding:         "3 8",
    flex:            1,
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     BORDER,
  },
  repLabel: {
    fontSize: 7,
    color:    GRAY,
  },
  repValue: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      "#111",
  },
  pointBox: {
    backgroundColor: "#FFFBEB",
    borderRadius:    4,
    padding:         "4 6",
    marginTop:       4,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  pointLabel: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      "#92400E",
    marginBottom: 1,
  },
  pointText: {
    fontSize: 8,
    color:    "#92400E",
  },
  stopBox: {
    backgroundColor: "#FEF2F2",
    borderRadius:    4,
    padding:         "4 6",
    marginTop:       4,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  stopLabel: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      "#991B1B",
    marginBottom: 1,
  },
  stopText: {
    fontSize: 8,
    color:    "#991B1B",
  },
  evidenceText: {
    fontSize:   7,
    color:      GRAY,
    marginTop:  4,
    fontStyle:  "italic",
  },
  // Caution box
  cautionBox: {
    backgroundColor: "#FFF7ED",
    borderRadius:    6,
    padding:         "8 10",
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     "#FED7AA",
  },
  cautionTitle: {
    fontSize:   10,
    fontFamily: "Helvetica-Bold",
    color:      ORANGE,
    marginBottom: 4,
  },
  cautionItem: {
    fontSize:    8,
    color:       "#92400E",
    marginBottom: 2,
  },
  // References
  refBox: {
    backgroundColor: LIGHT,
    borderRadius:    6,
    padding:         "8 10",
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     BORDER,
  },
  refTitle: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      "#111",
    marginBottom: 4,
  },
  refItem: {
    fontSize:    8,
    color:       GRAY,
    marginBottom: 2,
  },
  // Message box
  msgBox: {
    borderRadius:  6,
    padding:       "8 10",
    marginBottom:  12,
    borderWidth:   1,
    borderColor:   GREEN,
  },
  msgTitle: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      GREEN,
    marginBottom: 4,
  },
  msgText: {
    fontSize: 9,
    color:    "#374151",
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    marginTop:      "auto",
    paddingTop:     8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-end",
  },
  footerText: {
    fontSize: 7,
    color:    GRAY,
  },
  footerBrand: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      ORANGE,
  },
});

interface Props {
  patientName: string;
  ptName:      string;
  date:        string;
  disease:     string;
  items:       ExerciseItem[];
  cautions:    string[];
  references:  string[];
  message:     string;
}

function ExercisePdfDoc({
  patientName, ptName, date, disease, items, cautions, references, message,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ヘッダー */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>自主トレーニング指導書</Text>
            <Text style={styles.headerSub}>PT Worksが生成した文献ベースの指導書です</Text>
          </View>
          <View>
            <Text style={styles.logoText}>PT Works</Text>
            <Text style={styles.logoSub}>現役PTが作った臨床支援ツール</Text>
          </View>
        </View>

        {/* 患者情報 */}
        <View style={styles.metaBox}>
          {patientName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>お名前</Text>
              <Text style={styles.metaValue}>{patientName}</Text>
            </View>
          )}
          {ptName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>担当PT</Text>
              <Text style={styles.metaValue}>{ptName}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>作成日</Text>
            <Text style={styles.metaValue}>{date}</Text>
          </View>
          <View style={{ ...styles.metaRow, marginBottom: 0 }}>
            <Text style={styles.metaLabel}>疾患</Text>
            <Text style={styles.metaValue}>{disease}</Text>
          </View>
        </View>

        {/* 運動メニュー */}
        {items.map((item, i) => (
          <View key={item.id} style={styles.exCard}>
            <View style={styles.exCardHeader}>
              <Text style={styles.exNum}>{i + 1}</Text>
              <Text style={styles.exName}>{item.name}</Text>
            </View>
            <View style={styles.exBody}>
              {item.purpose && (
                <Text style={styles.exPurpose}>目的：{item.purpose}</Text>
              )}
              {item.steps.length > 0 && (
                <>
                  <Text style={styles.stepsTitle}>やり方：</Text>
                  {item.steps.map((s, si) => (
                    <View key={si} style={styles.stepRow}>
                      <Text style={styles.stepNum}>{si + 1}.</Text>
                      <Text style={styles.stepText}>{s}</Text>
                    </View>
                  ))}
                </>
              )}
              <View style={styles.repRow}>
                {item.reps && (
                  <View style={styles.repBox}>
                    <Text style={styles.repLabel}>回数</Text>
                    <Text style={styles.repValue}>{item.reps}</Text>
                  </View>
                )}
                {item.frequency && (
                  <View style={styles.repBox}>
                    <Text style={styles.repLabel}>頻度</Text>
                    <Text style={styles.repValue}>{item.frequency}</Text>
                  </View>
                )}
              </View>
              {item.points && (
                <View style={styles.pointBox}>
                  <Text style={styles.pointLabel}>ポイント</Text>
                  <Text style={styles.pointText}>{item.points}</Text>
                </View>
              )}
              {item.stopCriteria && (
                <View style={styles.stopBox}>
                  <Text style={styles.stopLabel}>やめるべき時</Text>
                  <Text style={styles.stopText}>{item.stopCriteria}</Text>
                </View>
              )}
              {item.evidence && (
                <Text style={styles.evidenceText}>根拠：{item.evidence}</Text>
              )}
            </View>
          </View>
        ))}

        {/* 注意事項 */}
        {cautions.length > 0 && (
          <View style={styles.cautionBox}>
            <Text style={styles.cautionTitle}>注意事項</Text>
            {cautions.map((c, i) => (
              <Text key={i} style={styles.cautionItem}>・{c}</Text>
            ))}
          </View>
        )}

        {/* PTメッセージ */}
        {message && (
          <View style={styles.msgBox}>
            <Text style={styles.msgTitle}>担当PTからのメッセージ</Text>
            <Text style={styles.msgText}>{message}</Text>
          </View>
        )}

        {/* 参考文献 */}
        {references.length > 0 && (
          <View style={styles.refBox}>
            <Text style={styles.refTitle}>参照した文献・参考書</Text>
            {references.map((r, i) => (
              <Text key={i} style={styles.refItem}>・{r}</Text>
            ))}
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ※本指導書は文献・ガイドラインに基づきAIが生成しました。実施前に担当PTへご確認ください。
          </Text>
          <Text style={styles.footerBrand}>PT Works</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function downloadExercisePdf(props: Props): Promise<void> {
  const blob = await pdf(<ExercisePdfDoc {...props} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `自主トレ指導書_${props.patientName || "患者様"}_${props.date}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
