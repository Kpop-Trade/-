const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
setGlobalOptions({ region: "asia-northeast1", maxInstances: 10 });

const db = admin.firestore();
const FV = admin.firestore.FieldValue;

// ★ 要変更：実際のサイトURL（https・末尾 / まで）
const SITE = "https://あなたのドメイン/";
const ADMIN_UIDS = ["Ay6VCS8HTgM3RqjDYZ0wKdHrSKz1", "GvVhAmT56GZjsWrl1YRaStB81im1"];
const expireAt = () => admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 86400000); // TTL用(60日)

// ===== プッシュ送信（data のみ → 表示は firebase-messaging-sw.js に一本化） =====
async function push(uid, title, body, link) {
  const snap = await db.collection("users").doc(uid).collection("tokens").get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) return;
  const url = link && link.k === "trade" ? SITE + "?trade=" + link.id : SITE;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      title: String(title),
      body: String(body).slice(0, 200),
      url,
      tag: link && link.id ? String(link.id) : "general"
    },
    webpush: { headers: { Urgency: "high" } }
  });
  // 無効になったトークンを掃除
  await Promise.all(res.responses.map((r, i) =>
    (!r.success && /not-registered|invalid-registration|invalid-argument/.test((r.error && r.error.code) || ""))
      ? snap.docs[i].ref.delete() : null));
}

// アプリ内通知（サブコレクション）＋プッシュ
async function notify(uid, { id, text, type = "info", link = null, title = "ILLIT Trade" }) {
  if (!uid) return;
  const col = db.collection("users").doc(uid).collection("notifications");
  await (id ? col.doc(id) : col.doc()).set({
    text, type, link, read: false, createdAt: FV.serverTimestamp(), expireAt: expireAt()
  });
  await push(uid, title, text, link).catch((e) => console.warn("push error", e));
}

// ===== 新しい申し込み／参加 → 出品者へ =====
exports.onTradeCreated = onDocumentCreated("trades/{tradeId}", async (event) => {
  const t = event.data.data();
  await notify(t.ownerId, {
    text: `${t.applicantName} さんから${t.kind === "group" ? "参加" : "申し込み"}がありました：${t.postGive}`,
    type: "success",
    link: { k: "trade", id: event.params.tradeId },
    title: "新しい申し込み"
  });
});

// ===== メッセージ → 相手へ（取引ごとに1件へ集約） =====
exports.onMessageCreated = onDocumentCreated("trades/{tradeId}/messages/{msgId}", async (event) => {
  const m = event.data.data(), tid = event.params.tradeId;
  const ts = await db.collection("trades").doc(tid).get();
  if (!ts.exists) return;
  const to = (ts.data().participants || []).find((u) => u !== m.senderId);
  if (!to) return;
  const body = m.image && !m.text ? "📷 写真が届きました" : String(m.text || "").slice(0, 60);
  await notify(to, {
    id: "msg_" + tid,
    text: `${m.senderName}：${body}`,
    link: { k: "trade", id: tid },
    title: "新着メッセージ"
  });
});

// ===== 取引の状態変化 =====
exports.onTradeUpdated = onDocumentUpdated("trades/{tradeId}", async (event) => {
  const b = event.data.before.data(), a = event.data.after.data(), tid = event.params.tradeId;
  const link = { k: "trade", id: tid }, both = [a.ownerId, a.applicantId];
  const name = (u) => (u === a.ownerId ? a.ownerName : a.applicantName);
  const other = (u) => (u === a.ownerId ? a.applicantId : a.ownerId);
  const jobs = [];

  if (a.cancelRequest && !b.cancelRequest) {
    jobs.push(notify(other(a.cancelRequest.by), {
      text: `${name(a.cancelRequest.by)} さんからキャンセル申請が届きました`, type: "admin", link, title: "キャンセル申請"
    }));
  }

  if (a.status !== b.status) {
    if (a.status === "shipping") {
      both.forEach((u) => jobs.push(notify(u, { text: `合意が成立しました。決済・発送へ進んでください：${a.postGive}`, type: "success", link })));
    } else if (a.status === "completed") {
      both.forEach((u) => jobs.push(notify(u, { text: `取引が完了しました。相手の評価をお願いします：${a.postGive}`, type: "success", link })));
    } else if (a.status === "cancelled") {
      if (a.adminCancelled) {
        both.forEach((u) => jobs.push(notify(u, { text: `運営により取引がキャンセルされました：${a.postGive}`, type: "admin", link })));
      } else {
        const by = a.cancelledBy || (a.cancelRequest && a.cancelRequest.by);
        if (by) jobs.push(notify(other(by), { text: `${name(by)} さんが取引をキャンセルしました：${a.postGive}`, link }));
      }
    }
  }

  for (const u of both) {
    if (a.shipped && a.shipped[u] && !(b.shipped && b.shipped[u])) {
      jobs.push(notify(other(u), { text: `${name(u)} さんが決済／発送を完了しました。内容を確認してください`, link }));
    }
  }
  await Promise.all(jobs);
});

// ===== キャンセル回数の警告（クライアントが cancelHistory を更新したとき） =====
exports.onCancelPenalty = onDocumentUpdated("users/{uid}", async (event) => {
  const nb = (event.data.before.data().cancelHistory || []).length;
  const na = (event.data.after.data().cancelHistory || []).length;
  if (na <= nb) return;
  const uid = event.params.uid;
  if (na > 8) {
    await notify(uid, { text: `合意後キャンセルが1ヶ月で${na}回に達しました。一時停止の対象となり、運営に通知されました。`, type: "admin" });
  } else if (na >= 3) {
    await notify(uid, { text: `合意後キャンセルが${na}回になりました。8回を超えると一時停止されます。`, type: "admin" });
  }
});

// ===== 運営用（管理者のみ） =====
function assertAdmin(req) {
  if (!req.auth || !ADMIN_UIDS.includes(req.auth.uid)) throw new HttpsError("permission-denied", "admin only");
}

exports.adminSendWarning = onCall(async (req) => {
  assertAdmin(req);
  const { uid, message } = req.data || {};
  if (!uid || !message || String(message).length > 300) throw new HttpsError("invalid-argument", "bad request");
  await notify(uid, { text: "【運営より警告】" + message, type: "admin", title: "運営からの警告" });
  return { ok: true };
});

exports.adminBroadcast = onCall({ timeoutSeconds: 300, memory: "512MiB" }, async (req) => {
  assertAdmin(req);
  const message = String((req.data || {}).message || "").trim();
  if (!message || message.length > 300) throw new HttpsError("invalid-argument", "bad message");

  // アプリ内通知（全ユーザー）
  const users = await db.collection("users").select().get();
  const bw = db.bulkWriter();
  users.docs.forEach((u) =>
    bw.set(u.ref.collection("notifications").doc(), {
      text: message, type: "admin", link: null, read: false, createdAt: FV.serverTimestamp(), expireAt: expireAt()
    }));
  await bw.close();

  // プッシュ（全トークン）
  const tokens = [...new Set((await db.collectionGroup("tokens").get()).docs.map((d) => d.id))];
  for (let i = 0; i < tokens.length; i += 500) {
    await admin.messaging().sendEachForMulticast({
      tokens: tokens.slice(i, i + 500),
      data: { title: "運営からのお知らせ", body: message, url: SITE, tag: "admin" },
      webpush: { headers: { Urgency: "high" } }
    }).catch(() => {});
  }
  return { count: users.size };
});
