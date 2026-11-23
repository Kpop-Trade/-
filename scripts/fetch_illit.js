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
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Token error: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function searchTavily(apiKey, query) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false
      })
    });
    if (!res.ok) {
      console.warn(`Tavily query failed (${res.status}): ${query}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    console.warn(`Tavily network error (${query}):`, e.message);
    return [];
  }
}

async function extractWithGroq(groqKey, searchSnippets, todayStr) {
  const prompt = `あなたはK-POPグループ「ILLIT（アイリット）」の公式情報・スケジュール抽出AIです。
今日の日付は ${todayStr} です。
以下の検索結果から、ILLITに関する【スケジュール】と【新着ニュース全般】を漏れなく抽出し、JSON配列のみを出力してください。Markdownのコードブロック(\`\`\`)や解説文は一切出力しないでください。

【抽出対象（スケジュール＋それ以外の最新情報すべて）】
1. 音楽番組・テレビ・ラジオ出演、授賞式、フェス、ライブ・コンサート、ファンミ
2. アルバム・シングル・MVのカムバック・リリース情報（category: "release"）
3. 公式サイトのお知らせ・キャンペーン・タイアップ・コラボ・アンバサダー就任・雑誌掲載・ポップアップストア・グッズ予約販売（category: "news"）
4. シリアル応募締切、当落発表、入金期限、サイン会・お見送り会・ヨントン（category: "event"）

【出力JSONスキーマ（配列）】
[
  {
    "date": "YYYY-MM-DD（不明な場合は記事公開日または ${todayStr}）",
    "time": "HH:MM または空文字",
    "category": "schedule | release | news | event",
    "title": "簡潔で分かりやすい日本語タイトル（35文字以内）",
    "detail": "補足詳細（場所・媒体・対象商品など、50文字以内）",
    "link": "元記事の公式URL（検索結果にあるURLをそのまま設定）"
  }
]

【検索結果】
${searchSnippets}`;

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 3000
        })
      });
      if (!res.ok) {
        console.warn(`Groq model ${model} status ${res.status}`);
        continue;
      }
      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || "";
      content = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const start = content.indexOf("[");
      const end = content.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) {
        const parsed = JSON.parse(content.slice(start, end + 1));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(`Groq parse/call error (${model}):`, e.message);
    }
  }
  return [];
}

async function sendNotifications(projectId, token, items) {
  try {
    const fsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
    const today = jstNow.toISOString().slice(0, 10);
    const tomorrow = new Date(jstNow.getTime() + 86400000).toISOString().slice(0, 10);

    const targets = items.filter(e => e.date === today || e.date === tomorrow);
    if (targets.length === 0) return;

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
    if (newTargets.length === 0) return;

    const qRes = await fetch(`${fsBase}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: "tokens", allDescendants: true }] }
      })
    });
    const qRows = await qRes.json();
    const tokenDocs = (Array.isArray(qRows) ? qRows : [])
      .filter(r => r.document && r.document.fields?.token?.stringValue)
      .map(r => r.document.fields.token.stringValue);

    if (tokenDocs.length > 0) {
      const first = newTargets[0];
      const prefix = first.date === today ? "【本日】" : "【明日】";
      for (const fcmToken of tokenDocs.slice(0, 200)) {
        await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: {
                title: `${prefix}ILLIT 最新情報・予定`,
                body: `${first.title}${newTargets.length > 1 ? ` ほか${newTargets.length - 1}件` : ""}`
              }
            }
          })
        }).catch(() => {});
      }
    }

    const nextKeys = [...sentKeys];
    for (const e of newTargets) {
      const label = e.date === today ? "today" : "tomorrow";
      nextKeys.push(`${label}:${e.date}:${e.title}`);
    }
    const trimmed = nextKeys.slice(-300);
    await fetch(`${fsBase}/system/illit_notified`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: { keys: { arrayValue: { values: trimmed.map(k => ({ stringValue: k })) } } }
      })
    });
  } catch (e) {
    console.warn("FCM通知処理スキップ（本体更新は継続）:", e.message);
  }
}

async function main() {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!tavilyKey || !groqKey) {
    console.warn("APIキー未設定のため安全終了します");
    return;
  }

  const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const todayStr = jstNow.toISOString().slice(0, 10);
  const year = jstNow.getUTCFullYear();

  const queries = [
    `ILLIT スケジュール 出演 ${year}`,
    `ILLIT カムバ リリース 新曲 アルバム ${year}`,
    `ILLIT グッズ POPUP コラボ お知らせ ${year}`,
    `ILLIT シリアル 応募 締切 サイン会 イベント ${year}`,
    `ILLIT ライブ コンサート チケット 当落 ${year}`,
    `site:illit-official.jp/news`,
    `site:universal-music.co.jp/illit/news`
  ];

  const allResults = [];
  for (const q of queries) {
    const items = await searchTavily(tavilyKey, q);
    allResults.push(...items);
  }

  const uniqueUrls = new Set();
  const dedupedResults = [];
  for (const r of allResults) {
    if (!r.url || uniqueUrls.has(r.url)) continue;
    uniqueUrls.add(r.url);
    dedupedResults.push(r);
  }

  const snippets = dedupedResults.slice(0, 28).map((r, i) =>
    `[${i + 1}] タイトル: ${r.title}\nURL: ${r.url}\n内容: ${String(r.content || "").slice(0, 260)}`
  ).join("\n\n");

  const parsed = snippets ? await extractWithGroq(groqKey, snippets, todayStr) : [];

  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync("illit_calendar.json", "utf8"));
    if (!Array.isArray(existing)) existing = [];
  } catch (e) {
    console.warn("既存JSON読み込みスキップ:", e.message);
  }

  const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").trim();
  const merged = [...existing];
  let addedCount = 0;

  for (const item of parsed) {
    if (!item || !item.title) continue;
    const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || "")) ? item.date : todayStr;
    const cleanItem = {
      date: cleanDate,
      time: String(item.time || "").trim(),
      category: ["schedule", "release", "news", "event"].includes(item.category) ? item.category : "news",
      title: String(item.title).trim(),
      detail: String(item.detail || "").trim(),
      link: String(item.link || "").trim()
    };
    const isDup = merged.some(
      (ex) => ex.date === cleanItem.date && normalize(ex.title) === normalize(cleanItem.title)
    );
    if (!isDup) {
      merged.push(cleanItem);
      addedCount++;
    }
  }

  merged.sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date));
    if (d !== 0) return d;
    return String(a.time || "99:99").localeCompare(String(b.time || "99:99"));
  });

  fs.writeFileSync("illit_calendar.json", JSON.stringify(merged, null, 2));
  console.log(`SUCCESS: 新規${addedCount}件追加（合計${merged.length}件）`);

  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawSa && rawSa.trim().startsWith("{")) {
    try {
      const sa = JSON.parse(rawSa);
      const fbToken = await getAccessToken(sa);
      await sendNotifications(sa.project_id, fbToken, parsed);
    } catch (e) {
      console.warn("Firebase通知スキップ:", e.message);
    }
  }
}

main().catch(e => {
  console.error("致命的エラー回避:", e);
  process.exit(0);
});
