const fs = require("fs");
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("GEMINI_API_KEY is not set"); process.exit(1); }
  const prompt = `現在の日付は ${new Date().toISOString().split("T")[0]} です。K-POPグループ「ILLIT（アイリット）」の今後1〜2ヶ月間の公式スケジュール（カムバック、リリース、音楽番組出演、ライブ・イベント、メンバー誕生日、テレビ出演など）をGoogle検索で調査し、以下のJSON配列形式のみを出力してください。マークダウンのコードブロックは不要です。\n[{"date":"YYYY-MM-DD","time":"HH:MM（不明な場合は終日）","title":"イベント名","category":"release | media | event | birthday | other","detail":"補足情報や放送局・会場など"}]`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  fs.writeFileSync("illit_calendar.json", JSON.stringify(parsed, null, 2));
  console.log(`SUCCESS: ${parsed.length}件更新`);
}
main().catch(e => { console.error(e); process.exit(1); });
