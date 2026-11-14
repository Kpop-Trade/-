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

  const prompt = `現在の日付は ${new Date().toISOString().split("T")[0]} です。K-POPグループ「ILLIT（アイリット）」の今後1〜2ヶ月間の公式スケジュール（カムバック、リリース、音楽番組出演、ライブ・イベント、メンバー誕生日、テレビ出演など）をGoogle検索で調査し、以下のJSON配列形式のみを出力してください。マークダウンのコードブロックは不要です。\n[{"date":"YYYY-MM-DD","time":"HH:MM（不明な場合は終日）","title":"イベント名","category":"release | media | event | birthday | other","detail":"補足情報や放送局・会場など"}]`;

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
