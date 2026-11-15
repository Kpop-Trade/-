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
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
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

function getJstDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().split("T")[0];
}

async function sendNotifications(projectId, token, events) {
  const today = getJstDateStr(0);
  const tomorrow = getJstDateStr(1);

  const targets = events.filter(e => e.date === today || e.date === tomorrow);
  if (targets.length === 0) {
    console.log("通知対象の今日・明日の予定はありません。");
    return;
  }

  const fsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const histRes = await fetch(`${fsBase}/system/illit_notified`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let sentKeys = [];
  if (histRes.ok) {
    const histData = await histRes.json();
    sentKeys = (histData.fields?.keys?.arrayValue?.values || []).map(v => v.stringValue);
  }

  const newTargets = targets.filter(e => {
    const label = e.date === today ? "today" : "tomorrow";
    return !sentKeys.includes(`${label}:${e.date}:${e.title}`);
  });
  if (newTargets.length === 0) {
    console.log("対象予定はすべて通知済みです。");
    return;
  }

  const qRes = await fetch(`${fsBase}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "tokens", allDescendants: true }]
      }
    })
  });
  const qRows = await qRes.json();
  const tokenDocs = (Array.isArray(qRows) ? qRows : [])
    .filter(r => r.document && r.document.fields?.token?.stringValue)
    .map(r => ({
      name: r.document.name,
      token: r.document.fields.token.stringValue
    }));

  if (tokenDocs.length === 0) {
    console.log("登録済みFCMトークンが0件のため通知スキップ。");
    return;
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const newlySentKeys = [...sentKeys];

  for (const ev of newTargets) {
    const isToday = ev.date === today;
    const prefix = isToday ? "【本日】" : "【明日】";
    const timeStr = ev.time && ev.time !== "終日" ? ` (${ev.time})` : "";
    const title = `${prefix}${ev.title}${timeStr}`;
    const body = ev.detail || "ILLIT予定カレンダーで詳細を確認";

    let okCount = 0;
    for (const td of tokenDocs) {
      const sendRes = await fetch(fcmUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: td.token,
            notification: { title, body },
            webpush: {
              fcmOptions: { link: "https://kpop-trade.github.io/" }
            }
          }
        })
      });
      if (sendRes.ok) {
        okCount++;
      } else {
        const errText = await sendRes.text();
        if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT")) {
          await fetch(`https://firestore.googleapis.com/v1/${td.name}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
    }
    const label = isToday ? "today" : "tomorrow";
    newlySentKeys.push(`${label}:${ev.date}:${ev.title}`);
    console.log(`通知送信完了: ${title} -> ${okCount}/${tokenDocs.length}端末`);
  }

  const trimmed = newlySentKeys.slice(-100);
  await fetch(`${fsBase}/system/illit_notified`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        keys: {
          arrayValue: {
            values: trimmed.map(k => ({ stringValue: k }))
          }
        }
      }
    })
  });
}

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const sa = JSON.parse(raw);
  const token = await getAccessToken(sa);

  const prompt = `現在の日付は ${getJstDateStr(0)} です。K-POPグループ「ILLIT（アイリット）」の日本および韓国の今後1〜2ヶ月間の公式スケジュールをGoogle検索で網羅的に調査し、以下のJSON配列形式のみを出力してください。マークダウンのコードブロックは不要です。

【必ず重点的に調査・抽出する項目】
1. シリアルナンバー特典の応募受付開始日・最終受付締切日（オフラインイベント、サイン会、ヨントン、お見送り会など）
2. チケット関連の重要日程（FC先行/ローチケ/一般の申込締切日、当落発表日、入金最終期限、アプグレ受付・入金締切）
3. CD・アルバムの発売日（カムバック、日本リリース）およびラッキードロー（ラキドロ）開催・締切日
4. ライブ・コンサート・フェス・ファンミーティング日程
5. 音楽番組・テレビ出演・メンバー誕生日

【出力形式】
[{"date":"YYYY-MM-DD","time":"HH:MM（締切時刻があれば23:59など記載、不明なら終日）","title":"イベント名（例：【締切】〇〇シリアル応募最終日 / 【入金期限】〇〇FC先行など）","category":"deadline | ticket | release | event | media | birthday","detail":"対象形態・プレイガイド（ローチケ等）・時間・会場などの補足情報"}]
※同一イベントでも「応募締切日」「当落発表日」「入金最終日」は必ず別々の項目として日付ごとに分けて出力してください。`;

  const url = `https://us-east1-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/us-east1/publishers/google/models/gemini-2.5-flash:generateContent`;
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

  await sendNotifications(sa.project_id, token, parsed);
}

main().catch(e => { console.error(e); process.exit(1); });
