const fs = require("fs");

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
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is not set");

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const sa = JSON.parse(raw);

  const prompt = `現在の日付は ${getJstDateStr(0)} です。K-POPグループ「ILLIT（アイリット）」の公式スケジュールのみを調査してください。

【厳守事項】
- 公式サイト、公式SNS、公式発表の情報のみを使用
- 非公式情報、推測、未確認情報は一切含めない
- 情報が不明な場合は空配列 [] を返す
- マークダウンのコードブロックは不要

【抽出項目】
1. 公式発表されたシリアル特典の応募締切日
2. 公式発表されたチケット関連日程
3. 公式発表
