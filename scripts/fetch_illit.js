const fs = require("fs");

function getJstDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().split("T")[0];
}

async function sendNotifications(projectId, token, events) {
  const today = getJstDateStr(0);
  const tomorrow = getJstDateStr(1);

  const targets = events.filter(e => {
    const isTodayOrTomorrow = e.date === today || e.date === tomorrow;
    const isDeadline = e.category === "deadline" || e.category === "ticket";
    const title = (e.title || "").toLowerCase();
    const isImportant = title.includes("入金") || title.includes("シリアル") || title.includes("締切") || title.includes("グッズ") || title.includes("販売");
    return isTodayOrTomorrow || (isDeadline && isImportant);
  });

  if (targets.length === 0) {
    console.log("通知対象の予定はありません。");
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
    const label = e.date === today ? "today" : e.date === tomorrow ? "tomorrow" : "deadline";
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
    const isTomorrow = ev.date === tomorrow;
    const prefix = isToday ? "【本日】" : isTomorrow ? "【明日】" : "【締切】";
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
    const label = isToday ? "today" : isTomorrow ? "tomorrow" : "deadline";
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
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const sa = JSON.parse(raw);

  const currentMonth = getJstDateStr(0).slice(0, 7);
  const queries = [
    `ILLIT 公式 スケジュール ${currentMonth}`,
    `ILLIT ライブ コンサート 2026`,
    `ILLIT シリアル 特典 応募 締切`,
    `ILLIT チケット 入金 期限`,
    `ILLIT グッズ 販売日`,
    `ILLIT ファンミーティング 2026`,
    `ILLIT 音楽番組 出演 2026`
  ];

  let allResults = [];
  for (const query of queries) {
    const searchRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query,
        search_depth: "basic",
        include_answer: false,
        max_results: 3
      })
    });
    const searchData = await searchRes.json();
    if (searchData.results) {
      allResults.push(...searchData.results.map(r => ({
        title: r.title,
        content: (r.content || "").slice(0, 200)
      })));
    }
  }
  const searchContext = JSON.stringify(allResults);

  const groqKey = process.env.GROQ_API_KEY;
  const prompt = `以下の検索結果から、K-POPグループ「ILLIT（アイリット）」の公式スケジュールのみを抽出してください。現在の日付は ${getJstDateStr(0)} です。

【検索結果】
${searchContext}

【厳守事項】
- 公式情報のみを使用
- ${getJstDateStr(0)} 以降の予定のみを抽出
- シリアル応募締切、入金期限、グッズ販売日、ファンミーティング、音楽番組出演も必ず含める
- 過去の予定は含めない
- 不明な場合は空配列 [] を返す
- タイトルと詳細は必ず日本語で出力すること

【出力形式】
[{"date":"YYYY-MM-DD","time":"HH:MM（不明なら終日）","title":"イベント名（日本語）","category":"deadline | ticket | release | event | media | birthday","detail":"補足情報（日本語）","link":"公式ページのURL（あれば、なければ空文字）"}]`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Groq API error: " + JSON.stringify(data));
  const text = data?.choices?.[0]?.message?.content || "[]";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  fs.writeFileSync("illit_calendar.json", JSON.stringify(parsed, null, 2));
  console.log(`SUCCESS: ${parsed.length}件更新`);

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
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Token error: " + JSON.stringify(tokenData));
    return tokenData.access_token;
  }
  const fbToken = await getAccessToken(sa);
  await sendNotifications(sa.project_id, fbToken, parsed);
}

main().catch(e => { console.error(e); process.exit(1); });
