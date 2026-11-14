const fs = require("fs");
const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const sa = JSON.parse(raw);
  const token = await getAccessToken(sa);

  const prompt = `現在の日付は ${new Date().toISOString().split("T")[0]} です。K-POPグループ「ILLIT（アイリット）」の日本および韓国の今後1〜2ヶ月間の公式スケジュールをGoogle検索で網羅的に調査し、以下のJSON配列形式のみを出力してください。マークダウンのコードブロックは不要です。

【必ず重点的に調査・抽出する項目】
1. シリアルナンバー特典の応募受付開始日・最終受付締切日（オフラインイベント、サイン会、ヨントン、お見送り会など）
2. チケット関連の重要日程（FC先行/ローチケ/一般の申込締切日、当落発表日、入金最終期限、アプグレ受付・入金締切）
3. CD・アルバムの発売日（カムバック、日本リリース）およびラッキードロー（ラキドロ）開催・締切日
4. ライブ・コンサート・フェス・ファンミーティング日程
5. 音楽番組・テレビ出演・メンバー誕生日

【出力形式】
[{"date":"YYYY-MM-DD","time":"HH:MM（締切時刻があれば23:59など記載、不明なら終日）","title":"イベント名（例：【締切】〇〇シリアル応募最終日 / 【入金期限】〇〇FC先行など）","category":"deadline | ticket | release | event | media | birthday","detail":"対象形態・プレイガイド（ローチケ等）・時間・会場などの補足情報"}]
※同一イベントでも「応募締切日」「当落発表日」「入金最終日」は必ず別々の項目として日付ごとに分けて出力してください。`;

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Vertex AI error: " + JSON.stringify(data));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  fs.writeFileSync("illit_calendar.json", JSON.stringify(parsed, null, 2));
  console.log(`SUCCESS: ${parsed.length}件更新`);
}

main().catch(e => { console.error(e); process.exit(1); });
