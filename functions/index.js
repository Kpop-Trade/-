const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { randomUUID, createHash } = require("crypto");
// Admin SDK の Storage は GCS 実バケット名（通常 *.appspot.com）を使う
admin.initializeApp({
  storageBucket: "illit-7ecd4.appspot.com"
});
setGlobalOptions({ region: "asia-northeast1", maxInstances: 10 });

const db = admin.firestore();
const FV = admin.firestore.FieldValue;
const STORAGE_BUCKET_CANDIDATES = [
  "illit-7ecd4.appspot.com",
  "illit-7ecd4.firebasestorage.app"
];

/** テスト用ダミー購入証明（1x1 PNG）。uploadAutoGoEvidence と同じ保存経路を通す */
const DUMMY_PURCHASE_PROOF_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

// ★ 要変更：実際のサイトURL（https・末尾 / まで）
const SITE = "https://kpop-trade.jp/";
const ADMIN_UIDS = ["Ay6VCS8HTgM3RqjDYZ0wKdHrSKz1", "GvVhAmT56GZjsWrl1YRaStB81im1"];
const NOTIF_KEEP_MS = 30 * 86400000;
const expireAt = () => admin.firestore.Timestamp.fromMillis(Date.now() + NOTIF_KEEP_MS);

function inboxCategory({ type, link, text, title }) {
  if (link && link.k === "autogo") return "autogo";
  if ((link && link.k === "trade") || type === "trade") return "trade";
  const blob = `${title || ""} ${text || ""}`;
  if (/Auto-GO/i.test(blob)) return "autogo";
  return "notice";
}

function notifMillis(value) {
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

async function mirrorInbox(uid, item) {
  if (!uid || !item || isAutoGoDummyUid(uid)) return;
  const ref = db.collection("users").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    let list = snap.exists && Array.isArray(snap.data().notifications) ? snap.data().notifications.slice() : [];
    list = list.filter((n) => {
      const t = notifMillis(n && n.createdAt);
      return !t || now - t < NOTIF_KEEP_MS;
    });
    const row = {
      id: item.id,
      text: String(item.text || ""),
      type: item.type || "info",
      title: item.title || "",
      category: item.category,
      link: item.link || null,
      purchaseUrl: item.link && item.link.purchaseUrl ? String(item.link.purchaseUrl) : null,
      target: item.link && item.link.k === "autogo"
        ? { type: "autogo", id: String(item.link.id || "") }
        : item.link && item.link.k === "trade"
          ? { type: "trade", id: String(item.link.id || "") }
          : null,
      read: false,
      createdAt: now
    };
    const idx = row.id ? list.findIndex((n) => n && n.id === row.id) : -1;
    if (idx >= 0) list[idx] = row;
    else list.unshift(row);
    if (list.length > 300) list.length = 300;
    tx.set(ref, { notifications: list }, { merge: true });
  });
}

// ===== プッシュ送信（data のみ → 表示は firebase-messaging-sw.js に一本化） =====
async function push(uid, title, body, link) {
  const snap = await db.collection("users").doc(uid).collection("tokens").get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) return;
  const url = link && link.url
    ? String(link.url)
    : link && link.k === "trade"
      ? SITE + "?trade=" + link.id
      : link && link.k === "autogo"
        ? SITE + "?pool=" + encodeURIComponent(link.id)
        : SITE;
  const pushBody = link && link.purchaseUrl
    ? `購入URL: ${String(link.purchaseUrl)}（10時間以内に購入登録してください）`
    : String(body).slice(0, 200);
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      title: String(title),
      body: pushBody.slice(0, 200),
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

// アプリ内通知（サブコレクション）＋必要なら通知欄へコピー＋プッシュ
async function notify(uid, { id, text, type = "info", link = null, title = "ILLIT Trade" }) {
  if (!uid || isAutoGoDummyUid(uid)) return;
  const category = inboxCategory({ type, link, text, title });
  const col = db.collection("users").doc(uid).collection("notifications");
  const ref = id ? col.doc(id) : col.doc();
  await ref.set({
    text, type, title, link, category, read: false, createdAt: FV.serverTimestamp(), expireAt: expireAt()
  });
  const shouldMirror = category === "autogo" || (category === "trade" && !(link && link.k));
  if (shouldMirror) {
    await mirrorInbox(uid, { id: id || ref.id, text, type, link, title, category }).catch((e) => console.warn("inbox mirror", e));
  }
  await push(uid, title, text, link).catch((e) => console.warn("push error", e));
}

const autoGoEntryRef = (poolId, uid) =>
  db.collection("auto_go_pools").doc(poolId).collection("entries").doc(uid);

/** 非公開配送先（users/{uid}/private/shipping）を優先し、移行期間は公開profileもフォールバック */
async function loadUserShippingAddress(uid) {
  const [userSnap, shipSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("users").doc(uid).collection("private").doc("shipping").get()
  ]);
  const user = userSnap.exists ? userSnap.data() : {};
  const profile = user.profile || {};
  const shipping = shipSnap.exists ? (shipSnap.data() || {}) : {};
  return {
    user,
    profile,
    name: String(shipping.name || profile.name || "").trim(),
    zip: String(shipping.zip || profile.zip || "").trim(),
    address1: String(shipping.address1 || profile.address1 || "").trim(),
    address2: String(shipping.address2 || profile.address2 || "").trim(),
    phone: String(shipping.phone || profile.phone || "").trim(),
    xId: String(profile.xId || profile.twitter || profile.xUsername || "").trim().replace(/^@/, "")
  };
}

async function clearTradeShippingCollection(tradeId) {
  if (!tradeId) return;
  try {
    const snap = await db.collection("trades").doc(tradeId).collection("shipping").get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.warn("clearTradeShippingCollection", tradeId, e);
  }
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return Number(value) || 0;
}

function jstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function jstDate(date = new Date()) {
  const parts = jstDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function appendPointHistory(history, points, type, description, at = Date.now()) {
  return [...(Array.isArray(history) ? history : []), { points, type, description, at }].slice(-100);
}

async function recordAutoGoPenalty(uid, poolId) {
  const userRef = db.collection("users").doc(uid);
  const penaltyId = `autogo_${poolId}`;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const user = snap.exists ? snap.data() : {};
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const history = (Array.isArray(user.cancelHistory) ? user.cancelHistory : [])
      .filter((item) => Number(item.at) >= monthAgo);
    if (history.some((item) => item.tradeId === penaltyId)) return;
    history.push({ tradeId: penaltyId, at: now });
    tx.set(userRef, { cancelHistory: history }, { merge: true });
  });
}

function isAutoGoTestPool(pool) {
  if (!pool) return false;
  if (pool.isTest === true || pool.testTag === "[TEST]") return true;
  return /^\[TEST\]/i.test(String(pool.title || ""));
}

function isAutoGoDummyUid(uid) {
  return typeof uid === "string" && uid.startsWith("dummy_");
}

async function writeAutoGoAuditLog(poolId, entry) {
  if (!poolId || !entry) return;
  const payload = {
    ...entry,
    poolId,
    createdAt: FV.serverTimestamp()
  };
  const poolLog = db.collection("auto_go_pools").doc(poolId).collection("auditLogs").doc();
  const globalLog = db.collection("auditLogs").doc();
  await Promise.all([
    poolLog.set(payload),
    globalLog.set(payload)
  ]);
}

function poolMemberList(pool) {
  if (Array.isArray(pool.members) && pool.members.length) return pool.members.slice();
  if (Array.isArray(pool.memberNames) && pool.memberNames.length) return pool.memberNames.slice();
  return [];
}

function shuffleArray(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * 先着枠の割り当て（希望順位どおりに空枠を探す）。
 * preferenceOrder があれば第1〜第N希望を順に試し、なければ wantedMember 固定。
 */
function allocateAutoGoMember(pool, wantedMember, preferenceOrder) {
  const members = poolMemberList(pool);
  if (!members.length) throw new HttpsError("failed-precondition", "pool has no members");
  const defaultCap = members.length === 5 ? 4 : members.length === 4 ? 5 : 0;
  const caps = { ...(pool.memberCaps || {}) };
  const counts = { ...(pool.memberCounts || {}) };
  members.forEach((member) => {
    caps[member] = Number(caps[member]) || defaultCap;
    counts[member] = Number(counts[member]) || 0;
  });
  const order = Array.isArray(preferenceOrder) && preferenceOrder.length
    ? preferenceOrder.filter((m) => members.includes(m))
    : (wantedMember ? [wantedMember] : []);
  if (!order.length) throw new HttpsError("invalid-argument", "unknown member");

  let assigned = null;
  let assignedRank = 0;
  for (let i = 0; i < order.length; i += 1) {
    const candidate = order[i];
    if (caps[candidate] && counts[candidate] < caps[candidate]) {
      assigned = candidate;
      assignedRank = i + 1;
      break;
    }
  }
  if (!assigned) throw new HttpsError("resource-exhausted", "member slots are full");

  counts[assigned] += 1;
  const allFilled = members.every((member) => counts[member] >= caps[member]);
  let targetParticipants = Number(pool.targetParticipants) || members.reduce((sum, member) => sum + caps[member], 0);
  if (allFilled) {
    members.forEach((member) => { caps[member] += 3; });
    targetParticipants = members.reduce((sum, member) => sum + caps[member], 0);
  }
  return { assigned, assignedRank, preferenceOrder: order, caps, counts, targetParticipants, members };
}

async function confirmAutoGoEntry(poolId, uid, poolData, entryRef) {
  const now = Date.now();
  const deadlineAt = admin.firestore.Timestamp.fromMillis(now + 10 * 60 * 60 * 1000);
  const confirmed = await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap] = await Promise.all([
      tx.get(db.collection("auto_go_pools").doc(poolId)),
      tx.get(entryRef)
    ]);
    if (!poolSnap.exists || !entrySnap.exists) return false;
    const pool = poolSnap.data();
    const entry = entrySnap.data();
    if (!["active", "activating"].includes(pool.status) || entry.status !== "reserved") return false;
    tx.update(entryRef, {
      status: "confirmed",
      purchaseIssuedAt: FV.serverTimestamp(),
      purchaseDeadlineAt: deadlineAt
    });
    return true;
  });
  if (!confirmed) return;
  // テストプール／ダミーUIDには本番ユーザー向けプッシュを飛ばさない（管理者監査のみ）
  if (isAutoGoTestPool(poolData) || isAutoGoDummyUid(uid)) {
    await writeAutoGoAuditLog(poolId, {
      action: "test_confirm_skipped_push",
      uid,
      title: poolData.title || "",
      actorUid: "system"
    }).catch(() => {});
    return;
  }
  await notify(uid, {
    id: `autogo_purchase_${poolId}`,
    text: `「${poolData.title || "Auto-GO"}」が成立しました。10時間以内にアルバムを購入し、購入日時とアルバムが確認できる画面を登録してください。購入URL: ${poolData.purchaseUrl || SITE}`,
    type: "success",
    link: { k: "autogo", id: poolId, purchaseUrl: poolData.purchaseUrl || SITE },
    title: "⚡ Auto-GO共同購入成立"
  });
}

async function activateAutoGoPool(poolId) {
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const now = Date.now();
  const deadlineAt = admin.firestore.Timestamp.fromMillis(now + 10 * 60 * 60 * 1000);
  const shouldActivate = await db.runTransaction(async (tx) => {
    const snap = await tx.get(poolRef);
    if (!snap.exists) return false;
    const pool = snap.data();
    if (pool.status === "active") return false;
    if (!["recruiting", "activating"].includes(pool.status)) return false;
    const minCount = Number(pool.minThreshold || pool.minParticipants || 20);
    if (Number(pool.totalCount || 0) < minCount) return false;
    if (pool.status === "recruiting") {
      tx.update(poolRef, {
        status: "activating",
        purchaseIssuedAt: FV.serverTimestamp(),
        purchaseDeadlineAt: deadlineAt
      });
    }
    return true;
  });
  if (!shouldActivate) return;

  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) return;
  const poolData = poolSnap.data();
  const entries = await poolRef.collection("entries").where("status", "==", "reserved").get();
  await Promise.all(entries.docs.map((entry) =>
    confirmAutoGoEntry(poolId, entry.id, poolData, entry.ref)));
  await poolRef.update({ status: "active", activatedAt: FV.serverTimestamp() });
}

exports.onAutoGoPoolUpdated = onDocumentUpdated("auto_go_pools/{poolId}", async (event) => {
  const pool = event.data.after.data();
  const recruitEndAt = timestampMillis(pool.recruitEndAt);
  if (recruitEndAt && recruitEndAt <= Date.now()) return;
  const minimum = Number(pool.minThreshold || pool.minParticipants || 20);
  if (Number(pool.totalCount || 0) >= minimum && ["recruiting", "activating"].includes(pool.status)) {
    await activateAutoGoPool(event.params.poolId);
  }
});

exports.onAutoGoEntryCreated = onDocumentCreated(
  "auto_go_pools/{poolId}/entries/{uid}",
  async (event) => {
    const poolRef = db.collection("auto_go_pools").doc(event.params.poolId);
    const poolSnap = await poolRef.get();
    if (!poolSnap.exists) return;
    const pool = poolSnap.data();
    const recruitEndAt = timestampMillis(pool.recruitEndAt);
    if (pool.recruitmentClosedAt || (recruitEndAt && recruitEndAt <= Date.now())) {
      const entryRef = event.data.ref;
      const cancelled = await db.runTransaction(async (tx) => {
        const [currentPool, currentEntry] = await Promise.all([tx.get(poolRef), tx.get(entryRef)]);
        if (!currentPool.exists || !currentEntry.exists || currentEntry.data().status !== "reserved") return false;
        const data = currentPool.data();
        const member = currentEntry.data().wantedMember;
        const counts = { ...(data.memberCounts || {}) };
        counts[member] = Math.max(0, (Number(counts[member]) || 0) - 1);
        tx.update(poolRef, {
          totalCount: Math.max(0, (Number(data.totalCount) || 0) - 1),
          memberCounts: counts
        });
        tx.update(entryRef, { status: "cancelled", cancellationReason: "recruitment_closed" });
        return true;
      });
      if (cancelled) await notify(event.params.uid, {
        id: `autogo_closed_${event.params.poolId}`,
        text: `「${pool.title || "Auto-GO"}」は募集期間が終了したため、新規申し込みを受け付けていません。`,
        type: "info",
        link: { k: "autogo", id: event.params.poolId },
        title: "Auto-GO募集終了"
      });
      return;
    }
    if (pool.status === "active" || pool.status === "activating") {
      await confirmAutoGoEntry(event.params.poolId, event.params.uid, pool, event.data.ref);
    }
  }
);

exports.onAutoGoArrivalOrRevealRegistered = onDocumentUpdated(
  "auto_go_pools/{poolId}/entries/{uid}",
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    const arrivalJustReported = before.status !== "arrived" && after.status === "arrived";
    const revealJustRegistered = !before.revealedAt && !!after.revealedAt;
    if (!arrivalJustReported && !revealJustRegistered) return;
    const result = await tryStartAutoGoRevealWindow(event.params.poolId, {});
    if (!result.started) return;
    const poolRef = db.collection("auto_go_pools").doc(event.params.poolId);
    const poolSnap = await poolRef.get();
    const pool = poolSnap.exists ? poolSnap.data() : {};
    const members = await poolRef.collection("entries").get();
    await Promise.all(members.docs.filter((entry) => entry.data().status !== "cancelled").map((entry) => notify(entry.id, {
      id: `autogo_reveal_${event.params.poolId}`,
      text: `「${pool.title || "Auto-GO"}」の開封結果登録期間が始まりました。期限は4日後です。自引きの場合も必ず登録してください。`,
      type: "info",
      link: { k: "autogo", id: event.params.poolId },
      title: "📦 Auto-GO開封結果の登録開始"
    })));
  }
);

function isAutoGoDummyEntry(entry, uid) {
  if (entry && entry.isDummy === true) return true;
  return isAutoGoDummyUid(uid);
}

/**
 * マッチング用の宛先。
 * ダミーは users/{uid} を作らないので、住所が無ければテスト用の宛先を使う。
 * 実ユーザーは住所が欠けていても捏造しない。
 */
async function resolveAutoGoMatchAddress(entry) {
  const loaded = await loadUserShippingAddress(entry.id);
  if (loaded.name && loaded.zip && loaded.address1) {
    return loaded;
  }
  if (isAutoGoDummyEntry(entry, entry.id)) {
    const dummyName = entry.userName || entry.displayName || "ダミー参加者";
    return {
      user: loaded.user,
      profile: loaded.profile,
      name: dummyName,
      zip: "000-0000",
      address1: "テスト用ダミー（実発送なし）",
      address2: "",
      phone: loaded.phone || "",
      xId: loaded.xId || ""
    };
  }
  return loaded;
}

function hungarianMinCostAssign(cost) {
  const n = cost.length;
  const u = [];
  const v = [];
  const p = [];
  const way = [];
  for (let i = 0; i <= n; i += 1) {
    u.push(0);
    v.push(0);
    p.push(0);
    way.push(0);
  }
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = [];
    const used = [];
    for (let j = 0; j <= n; j += 1) {
      minv.push(Infinity);
      used.push(false);
    }
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j += 1) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const assign = [];
  for (let i = 0; i < n; i += 1) assign.push(-1);
  for (let j = 1; j <= n; j += 1) {
    if (p[j] > 0) assign[p[j] - 1] = j - 1;
  }
  return assign;
}

/**
 * 発送できる人数が最大になる循環だけを返す。
 * 短い輪を先に確定すると、表示している第1希望確率より対象外が増える。
 */
function findAutoGoCycleCover(candidates) {
  const n = candidates.length;
  if (n < 2) return [];
  const skipCost = 1;
  const impossibleCost = 1000000;
  const cost = [];
  for (let i = 0; i < n; i += 1) {
    const row = [];
    for (let j = 0; j < n; j += 1) {
      if (i === j) {
        row.push(skipCost);
      } else if (candidates[j].wantedMember === candidates[i].pulledMember) {
        row.push(0);
      } else {
        row.push(impossibleCost);
      }
    }
    cost.push(row);
  }
  const assign = hungarianMinCostAssign(cost);
  const next = [];
  for (let i = 0; i < n; i += 1) {
    const dest = assign[i];
    if (dest !== i && dest >= 0 && cost[i][dest] === 0) {
      next.push(dest);
    } else {
      next.push(-1);
    }
  }
  const state = [];
  for (let i = 0; i < n; i += 1) state.push(0);
  const cycles = [];
  for (let i = 0; i < n; i += 1) {
    if (state[i] !== 0 || next[i] < 0) continue;
    let cursor = i;
    while (cursor >= 0 && state[cursor] === 0) {
      state[cursor] = 1;
      cursor = next[cursor];
    }
    if (cursor >= 0 && state[cursor] === 1) {
      const cycle = [];
      let y = cursor;
      const guard = new Set();
      while (!guard.has(y)) {
        guard.add(y);
        cycle.push(candidates[y]);
        state[y] = 2;
        y = next[y];
        if (cycle.length > n) break;
      }
      if (cycle.length >= 2) cycles.push(cycle);
    }
    for (let k = 0; k < n; k += 1) {
      if (state[k] === 1) state[k] = 2;
    }
  }
  return cycles;
}

function autoGoNoMatchData() {
  return {
    status: "matched",
    noMatchResult: true,
    matchRoomId: FV.delete(),
    cycleSize: FV.delete(),
    sendToUid: FV.delete(),
    sendToName: FV.delete(),
    shipToName: FV.delete(),
    shipToZip: FV.delete(),
    shipToAddress: FV.delete(),
    receiveFromUid: FV.delete(),
    receiveFromName: FV.delete(),
    receivingCard: FV.delete(),
    matchedAt: FV.serverTimestamp()
  };
}

async function closeAutoGoRevealWindow(poolId, poolRef, poolData, options) {
  const opts = options || {};
  const deadlinePassed = !!(poolData.revealDeadlineAt && timestampMillis(poolData.revealDeadlineAt) <= Date.now());
  const finalize = opts.finalize === false ? false : true;
  const reshuffleUnshipped = opts.reshuffleUnshipped === true;
  const entriesRef = poolRef.collection("entries");
  const waitingSnap = await entriesRef.where("status", "==", "waiting_match").get();
  const matchedSnap = await entriesRef.where("status", "==", "matched").get();
  const rawCandidates = [];
  waitingSnap.docs.forEach((doc) => {
    rawCandidates.push({ id: doc.id, ...doc.data() });
  });
  matchedSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const alreadyShipped = !!(data.shippedAt || data.shippedDone || data.receivedDone);
    if (reshuffleUnshipped) {
      if (!alreadyShipped) rawCandidates.push({ id: doc.id, ...data });
      return;
    }
    if (data.noMatchResult === true && !data.sendToUid) {
      rawCandidates.push({ id: doc.id, ...data });
    }
  });
  rawCandidates.sort((a, b) => timestampMillis(a.revealedAt) - timestampMillis(b.revealedAt));

  const addressById = new Map();
  const candidates = [];
  const blocked = [];
  for (let i = 0; i < rawCandidates.length; i += 1) {
    const entry = rawCandidates[i];
    const address = await resolveAutoGoMatchAddress(entry);
    if (address.name && address.zip && address.address1) {
      addressById.set(entry.id, address);
      candidates.push(entry);
    } else {
      blocked.push(entry);
    }
  }

  const used = new Set();
  const updates = [];
  const cycles = findAutoGoCycleCover(candidates);

  for (let c = 0; c < cycles.length; c += 1) {
    const cycle = cycles[c];
    let cycleReady = true;
    for (let i = 0; i < cycle.length; i += 1) {
      const address = addressById.get(cycle[i].id);
      if (!address || !address.name || !address.zip || !address.address1) {
        cycleReady = false;
        break;
      }
    }
    if (!cycleReady) continue;
    cycle.forEach((entry) => used.add(entry.id));
    const cycleId = `ag_${poolId}_${cycle[0].id}`;
    cycle.forEach((sender, index) => {
      const receiver = cycle[(index + 1) % cycle.length];
      const provider = cycle[(index + cycle.length - 1) % cycle.length];
      const receiverAddress = addressById.get(receiver.id);
      const shipToAddress = [receiverAddress.address1, receiverAddress.address2].filter(Boolean).join(" ");
      updates.push({
        ref: autoGoEntryRef(poolId, sender.id),
        data: {
          status: "matched",
          noMatchResult: FV.delete(),
          matchRoomId: cycleId,
          cycleSize: cycle.length,
          sendToUid: receiver.id,
          sendToName: receiver.userName || receiver.displayName || "参加者",
          shipToName: receiverAddress.name,
          shipToZip: receiverAddress.zip,
          shipToAddress,
          receiveFromUid: provider.id,
          receiveFromName: provider.userName || provider.displayName || "参加者",
          receivingCard: provider.pulledMember,
          matchedAt: FV.serverTimestamp()
        }
      });
    });
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!used.has(candidate.id)) {
      updates.push({
        ref: autoGoEntryRef(poolId, candidate.id),
        data: autoGoNoMatchData()
      });
    }
  }
  for (let i = 0; i < blocked.length; i += 1) {
    const entry = blocked[i];
    updates.push({
      ref: autoGoEntryRef(poolId, entry.id),
      data: autoGoNoMatchData()
    });
  }

  if (finalize) {
    for (const status of ["purchased", "arrived"]) {
      const unregistered = await entriesRef.where("status", "==", status).get();
      for (const entry of unregistered.docs) {
        updates.push({
          ref: entry.ref,
          data: { status: "cancelled", penalty: true, penaltyReason: "reveal_not_registered", cancelledAt: FV.serverTimestamp() }
        });
      }
    }
  }

  if (updates.length > 0) {
    const writer = db.bulkWriter();
    updates.forEach(({ ref, data }) => writer.update(ref, data));
    await writer.close();
  }
  if (finalize) {
    const poolUpdate = { matchingClosedAt: FV.serverTimestamp() };
    if (isAutoGoTestPool(poolData)) {
      poolUpdate.dummyMatchFixedAt = FV.serverTimestamp();
    }
    await poolRef.update(poolUpdate);
  }

  await Promise.all(updates
    .filter(({ data, ref }) => data.penalty && !isAutoGoDummyUid(ref.id))
    .map(({ ref }) => recordAutoGoPenalty(ref.id, poolId)));
  await Promise.all(updates.map(({ ref, data }) => {
    if (isAutoGoDummyUid(ref.id)) {
      return Promise.resolve();
    }
    if (data.status === "matched") {
      return notify(ref.id, {
        id: `autogo_match_${poolId}`,
        text: data.noMatchResult === true
          ? `「${poolData.title || "Auto-GO"}」の自動マッチングが完了しました。今回は交換対象外となりました。`
          : `「${poolData.title || "Auto-GO"}」の発送先が決まりました。アプリで宛先をご確認ください。`,
        type: "success",
        link: { k: "autogo", id: poolId },
        title: "⚡ Auto-GO自動マッチング完了"
      });
    }
    return notify(ref.id, {
      id: `autogo_penalty_${poolId}`,
      text: `「${poolData.title || "Auto-GO"}」の開封結果が期限内に登録されなかったため、参加枠がキャンセルされました。`,
      type: "admin",
      link: { k: "autogo", id: poolId },
      title: "⚠️ Auto-GO登録期限切れ"
    });
  }));

  let matched = 0;
  let unmatched = 0;
  updates.forEach(({ data }) => {
    if (data.status === "matched" && data.sendToUid) {
      matched += 1;
    } else if (data.status === "matched" && data.noMatchResult === true) {
      unmatched += 1;
    }
  });
  return { matched, unmatched, finalized: finalize, deadlinePassed };
}

exports.processAutoGoDeadlines = onSchedule({
  schedule: "every 5 minutes",
  timeoutSeconds: 540,
  memory: "512MiB",
  maxInstances: 1
}, async () => {
  const now = Date.now();
  const pools = await db.collection("auto_go_pools")
    .where("status", "in", ["recruiting", "activating", "active"])
    .get();
  for (const poolDoc of pools.docs) {
    const pool = poolDoc.data();
    const poolId = poolDoc.id;
    const minimum = Number(pool.minThreshold || pool.minParticipants || 20);
    if (pool.status === "recruiting" && Number(pool.totalCount || 0) >= minimum) {
      await activateAutoGoPool(poolId);
    } else if (pool.status === "recruiting" && pool.recruitEndAt && timestampMillis(pool.recruitEndAt) <= now) {
      await poolDoc.ref.update({ status: "cancelled", cancelledAt: FV.serverTimestamp() });
      const entries = await poolDoc.ref.collection("entries").get();
      const writer = db.bulkWriter();
      entries.docs.forEach((entry) => {
        writer.update(entry.ref, { status: "cancelled", cancellationReason: "minimum_not_reached" });
      });
      await writer.close();
      await Promise.all(entries.docs.map((entry) => notify(entry.id, {
        id: `autogo_cancelled_${poolId}`,
        text: `「${pool.title || "Auto-GO"}」は募集終了までに最低20人に達しなかったため中止となりました。`,
        type: "info",
        link: { k: "autogo", id: poolId },
        title: "Auto-GO募集終了"
      })));
    } else if (pool.status === "activating") {
      await activateAutoGoPool(poolId);
    }

    if (pool.status === "active") {
      if (pool.recruitEndAt && timestampMillis(pool.recruitEndAt) <= now && !pool.recruitmentClosedAt) {
        await poolDoc.ref.update({ recruitmentClosedAt: FV.serverTimestamp() });
      }
      const matchedEntries = await poolDoc.ref.collection("entries").where("status", "==", "matched").get();
      for (const entryDoc of matchedEntries.docs) {
        const entry = entryDoc.data();
        if (isAutoGoDummyUid(entryDoc.id) || entry.isDummy === true) continue;
        if (entry.noMatchResult || !entry.shipToAddress || entry.shippedAt ||
            !entry.matchedAt || timestampMillis(entry.matchedAt) > now - 72 * 60 * 60 * 1000) continue;
        const userRef = db.collection("users").doc(entryDoc.id);
        const penalized = await db.runTransaction(async (tx) => {
          const [currentEntry, userSnap] = await Promise.all([
            tx.get(entryDoc.ref),
            tx.get(userRef)
          ]);
          if (!currentEntry.exists) return false;
          const current = currentEntry.data();
          if (current.status !== "matched" || current.shippedAt || current.noMatchResult ||
              !current.shipToAddress || !current.matchedAt ||
              timestampMillis(current.matchedAt) > Date.now() - 72 * 60 * 60 * 1000) return false;
          tx.update(entryDoc.ref, {
            status: "unshipped_penalty",
            penalty: true,
            penaltyReason: "shipping_not_registered_within_72_hours",
            penalizedAt: FV.serverTimestamp()
          });
          tx.set(userRef, {
            autoGoBanned: true,
            autoGoBanReason: "unshipped_autogo_entry",
            autoGoBanAt: FV.serverTimestamp(),
            autoGoPenaltyHistory: FV.arrayUnion({
              poolId,
              reason: "shipping_not_registered_within_72_hours",
              matchedAt: current.matchedAt,
              penalizedAt: admin.firestore.Timestamp.now()
            })
          }, { merge: true });
          return true;
        });
        if (penalized) {
          const notice = `Auto-GO「${pool.title || poolId}」でマッチング後72時間以内に発送伝票が登録されなかった参加者（UID: ${entryDoc.id}）を自動除外し、永久参加停止にしました。`;
          await Promise.all(ADMIN_UIDS.map((adminUid) => notify(adminUid, {
            id: `autogo_unshipped_${poolId}_${entryDoc.id}`,
            text: notice,
            type: "admin",
            link: { k: "autogo", id: poolId },
            title: "⚠️ Auto-GO未発送・永久参加停止"
          })));
          await notify(entryDoc.id, {
            id: `autogo_unshipped_${poolId}`,
            text: "マッチング後72時間以内に発送伝票が登録されなかったため、Auto-GOへの参加を停止しました。",
            type: "admin",
            link: { k: "autogo", id: poolId },
            title: "⚠️ Auto-GO参加停止"
          });
        }
      }
      const entries = await poolDoc.ref.collection("entries").where("status", "==", "confirmed").get();
      for (const entry of entries.docs) {
        const entryData = entry.data() || {};
        if (isAutoGoDummyUid(entry.id) || entryData.isDummy === true) continue;
        if (!entryData.purchaseDeadlineAt || timestampMillis(entryData.purchaseDeadlineAt) > now) continue;
        const expired = await db.runTransaction(async (tx) => {
          const current = await tx.get(entry.ref);
          if (!current.exists || current.data().status !== "confirmed") return false;
          if (timestampMillis(current.data().purchaseDeadlineAt) > Date.now()) return false;
          tx.update(entry.ref, {
            status: "cancelled",
            penalty: true,
            penaltyReason: "purchase_not_registered",
            cancelledAt: FV.serverTimestamp()
          });
          return true;
        });
        if (expired) {
          await recordAutoGoPenalty(entry.id, poolId);
          await notify(entry.id, {
            id: `autogo_purchase_expired_${poolId}`,
            text: `「${pool.title || "Auto-GO"}」の購入登録が10時間以内に完了しなかったため、参加枠がキャンセルされました。ペナルティが記録されました。`,
            type: "admin",
            link: { k: "autogo", id: poolId },
            title: "⚠️ Auto-GO購入登録期限切れ"
          });
        }
      }
    }

    const revealDue = pool.revealDeadlineAt && timestampMillis(pool.revealDeadlineAt) <= now;
    const needsFirstMatch = revealDue && !pool.matchingClosedAt;
    const needsDummyRematch = revealDue && isAutoGoTestPool(pool) && !pool.dummyMatchFixedAt;
    if (needsFirstMatch || needsDummyRematch) {
      await closeAutoGoRevealWindow(poolId, poolDoc.ref, pool);
    }
  }
});

/**
 * 購入証明画像の保存（GCS → 失敗時 Firestore inline）。
 * 本番 uploadAutoGoEvidence(kind=purchase) と同一ロジック。
 */
async function saveAutoGoPurchaseProofImage(poolId, uid, buffer, imageType, logLabel) {
  const entryRef = autoGoEntryRef(poolId, uid);
  const extension = imageType === "jpeg" ? "jpg" : imageType;
  const path = `auto-go/${poolId}/${uid}/purchase-${Date.now()}.${extension}`;
  const token = randomUUID();

  async function saveToStorageBucket(bucketName) {
    const bucket = admin.storage().bucket(bucketName);
    await bucket.file(path).save(buffer, {
      resumable: false,
      validation: false,
      metadata: {
        contentType: `image/${imageType}`,
        cacheControl: "private, max-age=0",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    return bucket;
  }

  let bucket = null;
  let lastStorageError = null;
  for (const bucketName of STORAGE_BUCKET_CANDIDATES) {
    try {
      bucket = await saveToStorageBucket(bucketName);
      lastStorageError = null;
      break;
    } catch (storageError) {
      lastStorageError = storageError;
      console.error(
        (logLabel || "saveAutoGoPurchaseProofImage") + " storage save failed:",
        bucketName,
        storageError && storageError.message ? storageError.message : storageError
      );
    }
  }

  let url = "";
  if (bucket) {
    url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } else {
    const MAX_INLINE = 700 * 1024;
    if (buffer.length > MAX_INLINE) {
      throw new HttpsError(
        "resource-exhausted",
        "failed to save purchase image (storage unavailable, image too large for fallback). please retry with a smaller screenshot"
      );
    }
    url = `data:image/${imageType};base64,${buffer.toString("base64")}`;
    console.warn((logLabel || "saveAutoGoPurchaseProofImage") + " falling back to Firestore inline image", {
      kind: "purchase",
      bytes: buffer.length,
      storageError: lastStorageError && lastStorageError.message ? lastStorageError.message : String(lastStorageError || "")
    });
  }

  const patch = {
    purchaseProofUrl: url,
    purchaseProofSavedAt: FV.serverTimestamp()
  };
  if (url.startsWith("data:")) {
    patch.purchaseProofStorage = "firestore";
  } else {
    patch.purchaseProofStorage = "gcs";
    patch.purchaseProofPath = path;
  }
  await entryRef.update(patch);
  return {
    url: url.startsWith("data:") ? "inline" : url,
    storage: url.startsWith("data:") ? "firestore" : "gcs",
    path: url.startsWith("data:") ? null : path
  };
}

/** registerAutoGoPurchase と同じ決済完了ステータス更新（任意 UID） */
async function applyAutoGoPurchaseRegistration(poolId, uid, orderNote) {
  const entryRef = autoGoEntryRef(poolId, uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "confirmed" || !snap.data().purchaseProofUrl) {
      throw new HttpsError("failed-precondition", "upload the purchase screenshot first");
    }
    const purchaseDeadlineMs = timestampMillis(snap.data().purchaseDeadlineAt);
    if (purchaseDeadlineMs > 0 && purchaseDeadlineMs <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "purchase registration deadline has passed");
    }
    tx.update(entryRef, {
      status: "purchased",
      orderNote: String(orderNote || "").trim().slice(0, 120),
      purchasedAt: FV.serverTimestamp()
    });
  });
}

/** registerAutoGoReceipt と同じ受取完了更新（任意 UID） */
async function applyAutoGoReceiptRegistration(poolId, uid) {
  const entryRef = autoGoEntryRef(poolId, uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "matched") {
      throw new HttpsError("failed-precondition", "entry is not matched");
    }
    tx.update(entryRef, { receivedDone: true, receivedAt: FV.serverTimestamp() });
  });
}

/** registerAutoGoArrival と同じ到着報告（任意 UID） */
async function applyAutoGoArrivalRegistration(poolId, uid) {
  const entryRef = autoGoEntryRef(poolId, uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "purchased") {
      throw new HttpsError("failed-precondition", "purchase must be registered before arrival");
    }
    tx.update(entryRef, { status: "arrived", albumReceivedAt: FV.serverTimestamp() });
  });
}

/** registerAutoGoReveal と同じ開封（トレカ）報告（任意 UID） */
async function applyAutoGoRevealRegistration(poolId, uid, pulledMember) {
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, uid);
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap] = await Promise.all([tx.get(poolRef), tx.get(entryRef)]);
    if (!poolSnap.exists || !entrySnap.exists || entrySnap.data().status !== "arrived") {
      throw new HttpsError("failed-precondition", "entry is not ready for reveal registration");
    }
    const pool = poolSnap.data();
    if (!(pool.members || pool.memberNames || []).includes(pulledMember)) {
      throw new HttpsError("invalid-argument", "unknown member");
    }
    if (pool.revealDeadlineAt && timestampMillis(pool.revealDeadlineAt) <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "reveal registration period has ended");
    }
    tx.update(entryRef, {
      pulledMember,
      openedCard: pulledMember,
      status: pulledMember === entrySnap.data().wantedMember ? "self_pulled" : "waiting_match",
      revealedAt: FV.serverTimestamp()
    });
  });
}

/**
 * 到着/開封が5人以上になったら開封登録期間（本番は約4日）を開始。
 * shortTestMs を渡すと TEST 用の短縮締切（例: 3分）にできる。
 */
async function tryStartAutoGoRevealWindow(poolId, opts) {
  const options = opts || {};
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) return { started: false, reason: "not_found" };
  const pool = poolSnap.data() || {};
  const wantShort = Number(options.shortTestMs) > 0 && isAutoGoTestPool(pool);
  // 通常は一度きり。TEST＋短縮指定時のみ、トリガーで先に4日が入っても上書き可
  if (pool.revealDeadlineAt && !wantShort) {
    return {
      started: false,
      already: true,
      revealDeadlineAtMs: timestampMillis(pool.revealDeadlineAt),
      revealOpenedAtMs: timestampMillis(pool.revealOpenedAt)
    };
  }
  const arrivals = await poolRef.collection("entries").get();
  const arrivalCount = arrivals.docs.filter((entry) => {
    const data = entry.data() || {};
    return !!(data.albumReceivedAt || data.revealedAt);
  }).length;
  if (arrivalCount < 5) {
    return { started: false, reason: "need_five", arrivalCount, need: 5 - arrivalCount };
  }
  const durationMs = wantShort
    ? Number(options.shortTestMs)
    : 4 * 24 * 60 * 60 * 1000;
  const deadlineAt = admin.firestore.Timestamp.fromMillis(Date.now() + durationMs);
  const started = await db.runTransaction(async (tx) => {
    const current = await tx.get(poolRef);
    if (!current.exists) return false;
    const cur = current.data() || {};
    if (cur.revealDeadlineAt && !wantShort) return false;
    tx.update(poolRef, {
      revealOpenedAt: cur.revealOpenedAt || FV.serverTimestamp(),
      revealDeadlineAt: deadlineAt,
      recruitmentClosedAt: cur.recruitmentClosedAt || FV.serverTimestamp(),
      revealDeadlineTestShort: wantShort
    });
    return true;
  });
  if (!started) {
    const again = await poolRef.get();
    const row = again.exists ? again.data() : {};
    return {
      started: false,
      already: !!row.revealDeadlineAt,
      revealDeadlineAtMs: timestampMillis(row.revealDeadlineAt)
    };
  }
  return {
    started: true,
    arrivalCount,
    revealDeadlineAtMs: deadlineAt.toMillis(),
    durationMs,
    shortTest: wantShort,
    resetShort: wantShort && !!pool.revealDeadlineAt
  };
}

exports.uploadAutoGoEvidence = onCall({
  maxInstances: 10,
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const { poolId, kind, dataUrl } = request.data || {};
  if (!/^[\w-]{1,120}$/.test(String(poolId || "")) || !["purchase", "shipping"].includes(kind)) {
    throw new HttpsError("invalid-argument", "invalid pool or evidence type");
  }
  if (typeof dataUrl !== "string" || !dataUrl) throw new HttpsError("invalid-argument", "image required");
  // charset 等が付く data URL や改行混じり base64 も受け付ける
  const match = String(dataUrl).replace(/\s+/g, "").match(
    /^data:image\/(jpeg|jpg|png|webp)(?:;[^;]+)*;base64,([A-Za-z0-9+/=]+)$/i
  );
  if (!match) throw new HttpsError("invalid-argument", "unsupported image");
  const imageType = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) {
    throw new HttpsError("invalid-argument", "image must be 4 MB or smaller");
  }
  const uid = request.auth.uid;
  const entryRef = autoGoEntryRef(poolId, uid);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) throw new HttpsError("not-found", "Auto-GO entry not found");
  const entry = entrySnap.data();
  if (kind === "purchase" && entry.status !== "confirmed") {
    throw new HttpsError("failed-precondition", "purchase evidence is not expected");
  }
  if (kind === "shipping" && (entry.status !== "matched" || !entry.shipToAddress)) {
    throw new HttpsError("failed-precondition", "shipping evidence is not expected");
  }
  // 期限未設定のエントリは拒否しない（手動確認データ等）。期限がある場合のみチェック。
  const purchaseDeadlineMs = timestampMillis(entry.purchaseDeadlineAt);
  if (kind === "purchase" && purchaseDeadlineMs > 0 && purchaseDeadlineMs <= Date.now()) {
    throw new HttpsError("deadline-exceeded", "purchase registration deadline has passed");
  }

  if (kind === "purchase") {
    return await saveAutoGoPurchaseProofImage(poolId, uid, buffer, imageType, "uploadAutoGoEvidence");
  }

  const extension = imageType === "jpeg" ? "jpg" : imageType;
  const path = `auto-go/${poolId}/${uid}/${kind}-${Date.now()}.${extension}`;
  const token = randomUUID();

  async function saveToStorageBucket(bucketName) {
    const bucket = admin.storage().bucket(bucketName);
    await bucket.file(path).save(buffer, {
      resumable: false,
      validation: false,
      metadata: {
        contentType: `image/${imageType}`,
        cacheControl: "private, max-age=0",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    return bucket;
  }

  let bucket = null;
  let lastStorageError = null;
  for (const bucketName of STORAGE_BUCKET_CANDIDATES) {
    try {
      bucket = await saveToStorageBucket(bucketName);
      lastStorageError = null;
      break;
    } catch (storageError) {
      lastStorageError = storageError;
      console.error("uploadAutoGoEvidence storage save failed:", bucketName, storageError && storageError.message ? storageError.message : storageError);
    }
  }

  let url = "";
  if (bucket) {
    url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } else {
    const MAX_INLINE = 700 * 1024;
    if (buffer.length > MAX_INLINE) {
      throw new HttpsError(
        "resource-exhausted",
        "failed to save purchase image (storage unavailable, image too large for fallback). please retry with a smaller screenshot"
      );
    }
    url = `data:image/${imageType};base64,${buffer.toString("base64")}`;
    console.warn("uploadAutoGoEvidence falling back to Firestore inline image", {
      kind,
      bytes: buffer.length,
      storageError: lastStorageError && lastStorageError.message ? lastStorageError.message : String(lastStorageError || "")
    });
  }

  const hash = createHash("sha256").update(buffer).digest("hex");
  const hashRef = db.collection("auto_go_shipping_hashes").doc(hash);
  try {
    await db.runTransaction(async (tx) => {
      const [hashSnap, currentEntry] = await Promise.all([
        tx.get(hashRef),
        tx.get(entryRef)
      ]);
      if (hashSnap.exists) {
        throw new HttpsError("already-exists", "shipping image has already been used");
      }
      if (!currentEntry.exists || currentEntry.data().status !== "matched" ||
          !currentEntry.data().shipToAddress) {
        throw new HttpsError("failed-precondition", "shipping evidence is no longer expected");
      }
      tx.create(hashRef, {
        poolId,
        uid,
        kind: "shipping",
        sha256: hash,
        storagePath: url.startsWith("data:") ? "inline" : path,
        createdAt: FV.serverTimestamp()
      });
      const shipPatch = {
        shippingProofUrl: url,
        shippingProofHash: hash,
        shippingProofSavedAt: FV.serverTimestamp(),
        shippingProofStorage: url.startsWith("data:") ? "firestore" : "gcs"
      };
      tx.update(entryRef, shipPatch);
    });
  } catch (error) {
    if (bucket) {
      try {
        await bucket.file(path).delete({ ignoreNotFound: true });
      } catch (cleanupError) {
        console.error("Duplicate shipping evidence cleanup failed:", cleanupError);
      }
    }
    throw error;
  }
  return { url: url.startsWith("data:") ? "inline" : url, storage: url.startsWith("data:") ? "firestore" : "gcs" };
});

exports.registerAutoGoPurchase = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  const orderNote = String((request.data || {}).orderNote || "").trim();
  if (!/^[\w-]{1,120}$/.test(poolId) || orderNote.length > 120) {
    throw new HttpsError("invalid-argument", "invalid purchase registration");
  }
  await applyAutoGoPurchaseRegistration(poolId, request.auth.uid, orderNote);
  return { ok: true };
});

exports.reserveAutoGoEntry = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const { poolId, wantedMember, consent } = request.data || {};
  if (typeof poolId !== "string" || !/^[\w-]{1,120}$/.test(poolId) ||
      typeof wantedMember !== "string" || !wantedMember || consent !== true) {
    throw new HttpsError("invalid-argument", "pool, member and consent are required");
  }
  const uid = request.auth.uid;
  const isAdminUser = ADMIN_UIDS.includes(uid);
  const initialUserSnap = await db.collection("users").doc(uid).get();
  if (initialUserSnap.exists && initialUserSnap.data().autoGoBanned === true) {
    throw new HttpsError("permission-denied", "this account is banned from Auto-GO");
  }
  const initialUser = initialUserSnap.exists ? initialUserSnap.data() : {};
  const savedTokens = initialUser.fcmTokens;
  let hasFcmToken = Boolean(
    String(initialUser.fcmToken || "").trim() ||
    (typeof savedTokens === "string" && savedTokens.trim()) ||
    (Array.isArray(savedTokens) && savedTokens.some((token) => String(token || "").trim())) ||
    (savedTokens && typeof savedTokens === "object" && !Array.isArray(savedTokens) &&
      Object.values(savedTokens).some((token) => String(token || "").trim()))
  );
  if (!hasFcmToken) {
    const tokenSnap = await db.collection("users").doc(uid).collection("tokens").limit(1).get();
    hasFcmToken = !tokenSnap.empty;
  }
  if (!hasFcmToken) {
    throw new HttpsError("failed-precondition", "push notification registration is required");
  }
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, uid);
  const shippingRef = db.collection("users").doc(uid).collection("private").doc("shipping");
  let assignedMember = wantedMember;
  let assignedRank = 1;
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap, userSnap, privateShipSnap] = await Promise.all([
      tx.get(poolRef),
      tx.get(entryRef),
      tx.get(db.collection("users").doc(uid)),
      tx.get(shippingRef)
    ]);
    if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
    if (entrySnap.exists) throw new HttpsError("already-exists", "one entry per person is allowed");
    const user = userSnap.exists ? userSnap.data() : {};
    if (user.autoGoBanned === true) {
      throw new HttpsError("permission-denied", "this account is banned from Auto-GO");
    }
    const pool = poolSnap.data();
    if (isAutoGoTestPool(pool) && !isAdminUser) {
      throw new HttpsError("permission-denied", "test pool is admin-only");
    }
    if (pool.entryLocked === true) {
      throw new HttpsError("failed-precondition", "new entries are temporarily locked by admin");
    }
    if (!["recruiting", "activating", "active"].includes(pool.status) || pool.recruitmentClosedAt) {
      throw new HttpsError("failed-precondition", "recruitment is closed");
    }
    const recruitEndAt = timestampMillis(pool.recruitEndAt);
    if (recruitEndAt && recruitEndAt <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "recruitment period has ended");
    }
    const profile = user.profile || {};
    const privateShip = privateShipSnap.exists ? (privateShipSnap.data() || {}) : {};
    const shipName = String(privateShip.name || profile.name || "").trim();
    const shipZip = String(privateShip.zip || profile.zip || "").trim();
    const shipAddr1 = String(privateShip.address1 || profile.address1 || "").trim();
    const xId = String(profile.xId || profile.twitter || profile.xUsername || "").trim().replace(/^@/, "");
    if (!shipName || !shipZip || !shipAddr1 || !xId) {
      throw new HttpsError("failed-precondition", "shipping address and X account are required");
    }
    const minCompletedTrades = Number(pool.minCompletedTrades) || 0;
    if (minCompletedTrades > 0) {
      const tradesSnap = await tx.get(db.collection("trades")
        .where("participants", "array-contains", uid));
      const completedTrades = tradesSnap.docs.filter((trade) =>
        ["completed", "done"].includes(trade.data().status)).length;
      if (completedTrades < minCompletedTrades) {
        throw new HttpsError("failed-precondition", "minimum completed trade count not met");
      }
    }

    const alloc = allocateAutoGoMember(pool, wantedMember, [wantedMember]);
    assignedMember = alloc.assigned;
    assignedRank = alloc.assignedRank;
    tx.update(poolRef, {
      totalCount: (Number(pool.totalCount) || 0) + 1,
      memberCounts: alloc.counts,
      memberCaps: alloc.caps,
      targetParticipants: alloc.targetParticipants
    });
    tx.create(entryRef, {
      uid,
      wantedMember: assignedMember,
      preferenceOrder: [wantedMember],
      assignedRank,
      pulledMember: null,
      status: "reserved",
      consentAt: FV.serverTimestamp(),
      userName: profile.nickname || request.auth.token.name || "参加者",
      xId,
      createdAt: FV.serverTimestamp()
    });
  });
  const poolSnap = await poolRef.get();
  const pool = poolSnap.exists ? poolSnap.data() : {};
  if (isAutoGoTestPool(pool)) {
    await writeAutoGoAuditLog(poolId, {
      action: "reserve_test_pool",
      uid,
      wantedMember: assignedMember,
      assignedRank,
      actorUid: uid
    }).catch(() => {});
    return { ok: true, wantedMember: assignedMember, albumPrice: null, test: true };
  }
  const priceYen = Number(pool.albumPrice || pool.purchasePrice || 0);
  const priceText = priceYen > 0
    ? `金額の目安: ¥${priceYen.toLocaleString("ja-JP")}（後で自身で購入）`
    : "金額はショップの掲載価格です（後で自身で購入）";
  await notify(uid, {
    id: `autogo_reserved_${poolId}_${uid}`,
    text: `「${pool.title || "Auto-GO"}」に仮予約しました。希望メンバー: ${assignedMember}。${priceText}。最低人数に達すると企画成立し、購入URLが届きます。`,
    type: "success",
    link: { k: "autogo", id: poolId },
    title: "✅ Auto-GO予約完了"
  });
  return { ok: true, wantedMember: assignedMember, albumPrice: priceYen || null };
});

exports.cancelAutoGoEntry = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap] = await Promise.all([tx.get(poolRef), tx.get(entryRef)]);
    if (!poolSnap.exists || !entrySnap.exists || entrySnap.data().status !== "reserved") {
      throw new HttpsError("failed-precondition", "only unconfirmed entries can be cancelled");
    }
    if (poolSnap.data().status !== "recruiting") {
      throw new HttpsError("failed-precondition", "confirmed entries cannot be cancelled");
    }
    const pool = poolSnap.data();
    const member = entrySnap.data().wantedMember;
    const counts = { ...(pool.memberCounts || {}) };
    counts[member] = Math.max(0, (Number(counts[member]) || 0) - 1);
    tx.update(poolRef, {
      totalCount: Math.max(0, (Number(pool.totalCount) || 0) - 1),
      memberCounts: counts
    });
    tx.delete(entryRef);
  });
  return { ok: true };
});

exports.registerAutoGoReveal = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const { poolId, pulledMember } = request.data || {};
  if (typeof poolId !== "string" || typeof pulledMember !== "string") {
    throw new HttpsError("invalid-argument", "pool and member are required");
  }
  await applyAutoGoRevealRegistration(poolId, request.auth.uid, pulledMember);
  return { ok: true };
});

exports.registerAutoGoArrival = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  await applyAutoGoArrivalRegistration(poolId, request.auth.uid);
  return { ok: true };
});

exports.registerAutoGoDelay = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  const reason = String((request.data || {}).reason || "").trim();
  if (!/^[\w-]{1,120}$/.test(poolId) || !reason || reason.length > 500) {
    throw new HttpsError("invalid-argument", "a delay reason is required");
  }
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || !["purchased", "arrived"].includes(snap.data().status)) {
      throw new HttpsError("failed-precondition", "delay cannot be reported for this entry");
    }
    tx.update(entryRef, {
      status: "delayed",
      delayReason: reason,
      delayReportedAt: FV.serverTimestamp()
    });
  });
  await Promise.all(ADMIN_UIDS.map((adminUid) => notify(adminUid, {
    id: `autogo_delay_${poolId}_${request.auth.uid}`,
    text: `Auto-GO「${poolId}」で遅延理由が登録されました（参加者UID: ${request.auth.uid}）：${reason}`,
    type: "admin",
    link: { k: "autogo", id: poolId },
    title: "⚠️ Auto-GO遅延報告"
  })));
  return { ok: true };
});

exports.registerAutoGoShipment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const trackingNumber = String((request.data || {}).trackingNumber || "").replace(/\D/g, "");
  if (trackingNumber.length < 10) {
    throw new HttpsError("invalid-argument", "追跡番号は半角数字10桁以上で入力してください。");
  }
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  const entriesRef = entryRef.parent;
  let notifyUid = "";
  await db.runTransaction(async (tx) => {
    const [snap, entriesSnap] = await Promise.all([tx.get(entryRef), tx.get(entriesRef)]);
    if (!snap.exists || snap.data().status !== "matched" || !snap.data().shipToAddress || !snap.data().shippingProofUrl) {
      throw new HttpsError("failed-precondition", "shipping label evidence is required");
    }
    const duplicate = entriesSnap.docs.some((entry) =>
      entry.id !== request.auth.uid &&
      String(entry.data().trackingNumber || "").replace(/\D/g, "") === trackingNumber
    );
    if (duplicate) {
      throw new HttpsError("already-exists", "この追跡番号は同じプール内ですでに使用されています。");
    }
    const sender = snap.data();
    const receiverRef = sender.sendToUid ? autoGoEntryRef(poolId, sender.sendToUid) : null;
    if (receiverRef) {
      // Firestore: トランザクション内の読み取りは書き込みより前に行う
      await tx.get(receiverRef);
    }
    tx.update(entryRef, {
      shippedDone: true,
      shippedAt: FV.serverTimestamp(),
      trackingNumber
    });
    // 受取側が他人のエントリーを読まなくても追跡できるようコピー
    if (receiverRef) {
      notifyUid = sender.sendToUid;
      tx.update(receiverRef, {
        incomingTrackingNumber: trackingNumber,
        incomingShippedAt: FV.serverTimestamp(),
        incomingShipperName: sender.userName || "参加者"
      });
    }
  });
  if (notifyUid) {
    await notify(notifyUid, {
      id: `autogo_incoming_${poolId}_${request.auth.uid}`,
      text: `Auto-GOのトレカが発送されました。追跡番号: ${trackingNumber}`,
      type: "info",
      link: { k: "autogo", id: poolId },
      title: "📦 Auto-GO発送通知"
    }).catch((e) => console.warn("incoming ship notify", e));
  }
  return { ok: true };
});

exports.registerAutoGoReceipt = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  await applyAutoGoReceiptRegistration(poolId, request.auth.uid);
  return { ok: true };
});

function tradePushCopy(t) {
  const who = String(t.applicantName || "相手").slice(0, 24);
  const item = String(t.postGive || "出品").replace(/\s+/g, " ").slice(0, 60);
  const price = Number(t.postPrice || 0);
  const yen = price > 0 ? " ¥" + price.toLocaleString("ja-JP") : "";
  const slots = Array.isArray(t.bundleIndexes) && t.bundleIndexes.length
    ? " 枠" + t.bundleIndexes.map((n) => Number(n) + 1).join("・")
    : "";
  if (t.kind === "group") return { title: "共同購入の参加", text: `${who}さんが参加しました：${item}` };
  if (t.isBundle) return { title: "枠の申し込み", text: `${who}さんが申し込みました${slots}：${item}` };
  if (t.isBuy) return { title: "買取の申し込み", text: `${who}さんから買取の申し込み：${item}${yen}` };
  if (t.isSell) return { title: "購入申請", text: `${who}さんから購入申請：${item}${yen}` };
  if (t.postWant) return { title: "交換申請", text: `${who}さんから交換申請：${item} → ${String(t.postWant).slice(0, 40)}` };
  return { title: "新しい申し込み", text: `${who}さんから申し込み：${item}${yen}` };
}

// ===== 新しい申し込み／参加 → 出品者へ =====
exports.onTradeCreated = onDocumentCreated("trades/{tradeId}", async (event) => {
  const t = event.data.data();
  const copy = tradePushCopy(t);
  await notify(t.ownerId, {
    text: copy.text,
    type: "success",
    link: { k: "trade", id: event.params.tradeId },
    title: copy.title
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

  if (a.status === "completed" && b.status !== "completed" &&
      a.ownerId && a.applicantId && a.ownerId !== a.applicantId) {
    const userIds = [a.ownerId, a.applicantId].sort();
    const completedAt = event.data.after.updateTime?.toDate() || new Date();
    const completedDate = jstDate(completedAt);
    const month = completedDate.slice(0, 7);
    const pairId = createHash("sha256").update(userIds.join(":")).digest("hex");
    const pairRef = db.collection("tradePointPairs").doc(`${month}_${pairId}`);
    const tradeRef = db.collection("trades").doc(tid);
    const usageRefs = userIds.map((uid) => db.collection("tradePointUsage")
      .doc(`${month}_${createHash("sha256").update(uid).digest("hex")}`));
    const userRefs = userIds.map((uid) => db.collection("users").doc(uid));
    await db.runTransaction(async (tx) => {
      const [tradeSnap, pairSnap, ...rest] = await Promise.all([
        tx.get(tradeRef), tx.get(pairRef), ...usageRefs.map((ref) => tx.get(ref)),
        ...userRefs.map((ref) => tx.get(ref)), tx.get(db.collection("config").doc("pointCampaign"))
      ]);
      const usageSnaps = rest.slice(0, 2);
      const userSnaps = rest.slice(2, 4);
      const campaignSnap = rest[4];
      if (!tradeSnap.exists || tradeSnap.data().pointsAwarded !== undefined) return;
      if (pairSnap.exists || usageSnaps.some((snap) => Number(snap.data()?.count || 0) >= 5)) {
        tx.update(tradeRef, { pointsAwarded: false, pointsAwardedMonth: month });
        return;
      }
      const isDoubleDay = (campaignSnap.exists && Array.isArray(campaignSnap.data().doublePointDates)
        ? campaignSnap.data().doublePointDates : []).includes(completedDate);
      const points = isDoubleDay ? 200 : 100;
      userRefs.forEach((ref, i) => {
        const user = userSnaps[i].exists ? userSnaps[i].data() : {};
        tx.set(ref, {
          points: (Number(user.points) || 0) + points,
          pointHistory: appendPointHistory(user.pointHistory, points, "trade", "取引完了ポイント")
        }, { merge: true });
        tx.set(usageRefs[i], { count: Number(usageSnaps[i].data()?.count || 0) + 1 }, { merge: true });
      });
      tx.create(pairRef, { tradeId: tid, month, userIds, createdAt: FV.serverTimestamp() });
      tx.update(tradeRef, { pointsAwarded: true, pointsAwardedMonth: month, pointsAwardedAt: FV.serverTimestamp() });
    });
  }

  if (a.cancelRequest && !b.cancelRequest) {
    jobs.push(notify(other(a.cancelRequest.by), {
      text: `${name(a.cancelRequest.by)} さんからキャンセル申請が届きました`, type: "admin", link, title: "キャンセル申請"
    }));
  }

  if (a.status !== b.status) {
    if (a.status === "shipping") {
      both.forEach((u) => jobs.push(notify(u, { text: `合意が成立しました。決済・発送へ進んでください：${a.postGive}`, type: "success", link, title: "合意が成立" })));
    } else if (a.status === "completed") {
      both.forEach((u) => jobs.push(notify(u, { text: `取引が完了しました。相手の評価をお願いします：${a.postGive}`, type: "success", link, title: "取引が完了" })));
      jobs.push(clearTradeShippingCollection(tid));
    } else if (a.status === "cancelled") {
      if (a.adminCancelled) {
        both.forEach((u) => jobs.push(notify(u, { text: `運営により取引がキャンセルされました：${a.postGive}`, type: "admin", link, title: "運営がキャンセル" })));
      } else {
        const by = a.cancelledBy || (a.cancelRequest && a.cancelRequest.by);
        if (by) jobs.push(notify(other(by), { text: `${name(by)} さんが取引をキャンセルしました：${a.postGive}`, link, title: "取引がキャンセル" }));
      }
    }
  }

  for (const u of both) {
    if (a.shipped && a.shipped[u] && !(b.shipped && b.shipped[u])) {
      jobs.push(notify(other(u), { text: `${name(u)} さんが決済／発送を完了しました：${a.postGive || "取引"}`, link, title: "発送・決済の更新" }));
    }
  }
  await Promise.all(jobs);
});

exports.claimDailyLoginBonus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "authentication required");
  const uid = request.auth.uid;
  const today = jstDate();
  const month = today.slice(0, 7);
  const userRef = db.collection("users").doc(uid);
  const campaignRef = db.collection("config").doc("pointCampaign");
  return db.runTransaction(async (tx) => {
    const [userSnap, campaignSnap] = await Promise.all([tx.get(userRef), tx.get(campaignRef)]);
    const user = userSnap.exists ? userSnap.data() : {};
    const campaign = campaignSnap.exists ? campaignSnap.data() : {};
    const doublePointDates = Array.isArray(campaign.doublePointDates)
      ? campaign.doublePointDates.filter((date) => typeof date === "string") : [];
    const isDoubleDay = doublePointDates.includes(today);
    const loginStamps = (Array.isArray(user.loginStamps) ? user.loginStamps : [])
      .filter((date) => typeof date === "string" && date.startsWith(`${month}-`));
    const totalPoints = Number(user.points) || 0;
    if (user.lastLoginBonusDate === today) {
      const currentStamps = [...new Set([...loginStamps, today])].sort();
      if (currentStamps.length !== loginStamps.length) tx.set(userRef, { loginStamps: currentStamps }, { merge: true });
      return { awarded: false, pointsAdded: 0, isDoubleDay, totalPoints, loginStamps: currentStamps, doublePointDates };
    }
    const pointsAdded = isDoubleDay ? 20 : 10;
    const updatedStamps = [...new Set([...loginStamps, today])].sort();
    tx.set(userRef, {
      points: totalPoints + pointsAdded,
      lastLoginBonusDate: today,
      loginStamps: updatedStamps,
      pointHistory: appendPointHistory(user.pointHistory, pointsAdded, "login", "ログインボーナス")
    }, { merge: true });
    return {
      awarded: true, pointsAdded, isDoubleDay, totalPoints: totalPoints + pointsAdded,
      loginStamps: updatedStamps, doublePointDates
    };
  });
});

exports.grantProfileAndInviteBonus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "authentication required");
  const uid = request.auth.uid;
  const inviteCode = String((request.data || {}).inviteCode || "").trim().toUpperCase();
  if (inviteCode && !/^[A-Z0-9]{4,20}$/.test(inviteCode)) {
    throw new HttpsError("invalid-argument", "invalid invite code");
  }
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const currentUser = userSnap.exists ? userSnap.data() : {};
  let inviterRef = null;
  if (inviteCode && !currentUser.profileBonusGranted && !currentUser.referredBy) {
    const inviterSnap = await db.collection("users").where("inviteCode", "==", inviteCode).limit(1).get();
    if (!inviterSnap.empty && inviterSnap.docs[0].id !== uid) inviterRef = inviterSnap.docs[0].ref;
  }
  const code = createHash("sha256").update(uid).digest("hex").slice(0, 10).toUpperCase();
  return db.runTransaction(async (tx) => {
    const refs = [userRef, ...(inviterRef ? [inviterRef] : [])];
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const user = snaps[0].exists ? snaps[0].data() : {};
    const inviter = snaps[1]?.exists ? snaps[1].data() : null;
    const profile = user.profile || {};
    const isComplete = !!(String(profile.nickname || "").trim() ||
      (String(profile.name || "").trim() && String(profile.zip || "").trim() && String(profile.address1 || "").trim()));
    const updates = { inviteCode: user.inviteCode || code };
    let profileAwarded = false;
    let inviteAwarded = false;
    if (isComplete && !user.profileBonusGranted) {
      const points = (Number(user.points) || 0) + 100;
      updates.points = points;
      updates.profileBonusGranted = true;
      updates.pointHistory = appendPointHistory(user.pointHistory, 100, "profile", "プロフィール完了ボーナス");
      profileAwarded = true;
      if (inviter && inviter.inviteCode === inviteCode && !user.referredBy && inviterRef) {
        updates.referredBy = inviterRef.id;
        const inviterPoints = (Number(inviter.points) || 0) + 100;
        tx.set(inviterRef, {
          points: inviterPoints,
          pointHistory: appendPointHistory(inviter.pointHistory, 100, "invite", "友だち招待ボーナス")
        }, { merge: true });
        updates.points = points + 100;
        updates.pointHistory = appendPointHistory(updates.pointHistory, 100, "invite", "友だち招待ボーナス");
        inviteAwarded = true;
      }
    }
    tx.set(userRef, updates, { merge: true });
    return { profileAwarded, inviteAwarded, inviteCode: updates.inviteCode };
  });
});

exports.enterRaffle = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "authentication required");
  const raffleId = String((request.data || {}).raffleId || "");
  if (!/^[\w-]{1,120}$/.test(raffleId)) throw new HttpsError("invalid-argument", "invalid raffle");
  const uid = request.auth.uid;
  const raffleRef = db.collection("raffles").doc(raffleId);
  const userRef = db.collection("users").doc(uid);
  const entryRef = raffleRef.collection("entries").doc(randomUUID());
  return db.runTransaction(async (tx) => {
    const [raffleSnap, userSnap] = await Promise.all([tx.get(raffleRef), tx.get(userRef)]);
    if (!raffleSnap.exists || raffleSnap.data().status !== "active" ||
        timestampMillis(raffleSnap.data().endsAt) <= Date.now()) {
      throw new HttpsError("failed-precondition", "raffle is closed");
    }
    const user = userSnap.exists ? userSnap.data() : {};
    const points = Number(user.points) || 0;
    if (points < 100) throw new HttpsError("failed-precondition", "not enough points");
    tx.set(userRef, {
      points: points - 100,
      pointHistory: appendPointHistory(user.pointHistory, -100, "raffle", "トレカ抽選応募")
    }, { merge: true });
    tx.create(entryRef, { userId: uid, createdAt: FV.serverTimestamp() });
    tx.update(raffleRef, { entriesCount: (Number(raffleSnap.data().entriesCount) || 0) + 1 });
    return { ok: true, entryId: entryRef.id, totalPoints: points - 100 };
  });
});

exports.drawRaffleWinners = onCall({ timeoutSeconds: 300 }, async (request) => {
  assertAdmin(request);
  const raffleId = String((request.data || {}).raffleId || "");
  if (!/^[\w-]{1,120}$/.test(raffleId)) throw new HttpsError("invalid-argument", "invalid raffle");
  const raffleRef = db.collection("raffles").doc(raffleId);
  let claimed = false;
  try {
    const claimedStatus = await db.runTransaction(async (tx) => {
      const raffleSnap = await tx.get(raffleRef);
      if (!raffleSnap.exists || raffleSnap.data().status !== "active") {
        throw new HttpsError("failed-precondition", "raffle is not open");
      }
      tx.update(raffleRef, { status: "drawing" });
      return true;
    });
    claimed = claimedStatus;
    const entrySnap = await raffleRef.collection("entries").get();
    const ticketCounts = new Map();
    entrySnap.docs.forEach((entry) => {
      const uid = entry.data().userId;
      if (uid) ticketCounts.set(uid, (ticketCounts.get(uid) || 0) + 1);
    });
    const pool = [...ticketCounts.entries()];
    const raffleSnap = await raffleRef.get();
    const winnerCount = Math.max(0, Math.min(Number(raffleSnap.data().winnerCount) || 0, pool.length));
    const winners = [];
    while (winners.length < winnerCount && pool.length) {
      const totalTickets = pool.reduce((sum, [, count]) => sum + count, 0);
      let choice = Math.random() * totalTickets;
      let index = 0;
      for (; index < pool.length - 1; index++) {
        choice -= pool[index][1];
        if (choice < 0) break;
      }
      winners.push(pool.splice(index, 1)[0][0]);
    }
    await db.runTransaction(async (tx) => {
      const current = await tx.get(raffleRef);
      if (!current.exists || current.data().status !== "drawing") {
        throw new HttpsError("aborted", "raffle draw was interrupted");
      }
      tx.update(raffleRef, {
        status: "drawn", winners, drawnAt: FV.serverTimestamp(), drawnBy: request.auth.uid
      });
    });
    await Promise.all(winners.map((uid) =>
      push(uid, "トレカ抽選に当選しました！", `${raffleSnap.data().title || "トレカ抽選"}に当選しました。`, { url: SITE })
        .catch((error) => console.error("Raffle winner push failed:", uid, error))
    ));
    return { winners };
  } catch (error) {
    if (claimed) {
      await db.runTransaction(async (tx) => {
        const current = await tx.get(raffleRef);
        if (current.exists && current.data().status === "drawing") tx.update(raffleRef, { status: "active" });
      });
    }
    throw error;
  }
});

exports.setDoublePointDates = onCall(async (request) => {
  assertAdmin(request);
  const dates = (request.data || {}).doublePointDates;
  const isValidDate = (date) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  if (!Array.isArray(dates) || dates.length > 366 || dates.some((date) => !isValidDate(date))) {
    throw new HttpsError("invalid-argument", "dates must be YYYY-MM-DD values");
  }
  const doublePointDates = [...new Set(dates)].sort();
  await db.collection("config").doc("pointCampaign").set({
    doublePointDates, updatedAt: FV.serverTimestamp(), updatedBy: request.auth.uid
  });
  return { doublePointDates };
});

exports.createRaffle = onCall(async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const title = String(data.title || "").trim();
  const imageUrl = String(data.imageUrl || "").trim();
  const winnerCount = Number(data.winnerCount);
  const endsAt = new Date(data.endsAt);
  if (!title || title.length > 120 || !/^https:\/\//i.test(imageUrl) || imageUrl.length > 2048 ||
      !Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 100 ||
      !Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
    throw new HttpsError("invalid-argument", "invalid raffle data");
  }
  const raffleRef = db.collection("raffles").doc();
  await raffleRef.set({
    title, imageUrl, winnerCount, endsAt: admin.firestore.Timestamp.fromDate(endsAt),
    status: "active", entriesCount: 0, createdAt: FV.serverTimestamp(), createdBy: request.auth.uid
  });
  return { raffleId: raffleRef.id };
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

exports.adminRemoveAutoGoEntry = onCall(async (request) => {
  assertAdmin(request);
  const { poolId, uid } = request.data || {};
  if (typeof poolId !== "string" || !/^[\w-]{1,120}$/.test(poolId) ||
      typeof uid !== "string" || !uid || uid.length > 128) {
    throw new HttpsError("invalid-argument", "pool and participant are required");
  }
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, uid);
  let removedEntries = [];
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap] = await Promise.all([tx.get(poolRef), tx.get(entryRef)]);
    if (!poolSnap.exists || !entrySnap.exists) {
      throw new HttpsError("not-found", "Auto-GO participant not found");
    }
    const selected = entrySnap.data();
    if (["cancelled", "unshipped_penalty"].includes(selected.status)) {
      throw new HttpsError("failed-precondition", "this participant can no longer be excluded");
    }
    let entriesToRemove = [{ ref: entryRef, data: selected }];
    if (selected.status === "matched" && selected.matchRoomId) {
      const roomSnap = await tx.get(poolRef.collection("entries")
        .where("matchRoomId", "==", selected.matchRoomId));
      entriesToRemove = roomSnap.docs.map((entry) => ({ ref: entry.ref, data: entry.data() }));
    }
    if (entriesToRemove.some(({ data }) =>
      ["cancelled", "unshipped_penalty"].includes(data.status) ||
      (data.status === "matched" && (data.shippedAt || data.receivedDone)))) {
      throw new HttpsError("failed-precondition", "a matched participant has already shipped");
    }
    const pool = poolSnap.data();
    const counts = { ...(pool.memberCounts || {}) };
    for (const { data } of entriesToRemove) {
      if (data.wantedMember) {
        counts[data.wantedMember] = Math.max(0, (Number(counts[data.wantedMember]) || 0) - 1);
      }
    }
    tx.update(poolRef, {
      totalCount: Math.max(0, (Number(pool.totalCount) || 0) - entriesToRemove.length),
      memberCounts: counts
    });
    entriesToRemove.forEach(({ ref }) => tx.update(ref, {
      status: "cancelled",
      cancellationReason: "admin_removed",
      adminRemovedBy: request.auth.uid,
      adminRemovedAt: FV.serverTimestamp()
    }));
    removedEntries = entriesToRemove.map(({ ref }) => ref.id);
  });
  if (removedEntries.length) {
    await Promise.all(removedEntries.map((removedUid) => notify(removedUid, {
      id: `autogo_admin_removed_${poolId}`,
      text: "Auto-GOの参加エントリーが運営によりキャンセルされました。マッチング後の場合は同じ取引グループ全体がキャンセルされています。",
      type: "admin",
      link: { k: "autogo", id: poolId },
      title: "Auto-GO参加エントリーのキャンセル"
    })));
  }
  return { ok: true };
});

/** テスト用：ダミー参加者を1人〜N人、本番と同じ枠カウント経路で投入 */
exports.adminInjectAutoGoDummies = onCall({ timeoutSeconds: 120 }, async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const poolId = String(data.poolId || "");
  const count = Math.min(50, Math.max(1, Number(data.count) || 1));
  const fillToMin = data.fillToMin === true;
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");

  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap0 = await poolRef.get();
  if (!poolSnap0.exists) throw new HttpsError("not-found", "pool not found");
  const pool0 = poolSnap0.data();
  if (!isAutoGoTestPool(pool0)) {
    throw new HttpsError("failed-precondition", "dummy inject is allowed only on [TEST] pools");
  }
  if (pool0.entryLocked === true) {
    throw new HttpsError("failed-precondition", "new entries are locked");
  }

  const results = [];
  let injected = 0;
  const maxLoops = fillToMin ? 80 : count;

  for (let i = 0; i < maxLoops; i += 1) {
    if (!fillToMin && injected >= count) break;
    const dummyUid = `dummy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const entryRef = autoGoEntryRef(poolId, dummyUid);
    let row = null;
    try {
      row = await db.runTransaction(async (tx) => {
        const poolSnap = await tx.get(poolRef);
        if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
        const pool = poolSnap.data();
        if (!isAutoGoTestPool(pool)) {
          throw new HttpsError("failed-precondition", "not a test pool");
        }
        if (pool.entryLocked === true || pool.recruitmentClosedAt) {
          throw new HttpsError("failed-precondition", "recruitment locked/closed");
        }
        if (!["recruiting", "activating", "active"].includes(pool.status)) {
          throw new HttpsError("failed-precondition", "pool status does not accept entries");
        }
        if (fillToMin) {
          const minCount = Number(pool.minThreshold || pool.minParticipants || 20);
          if (Number(pool.totalCount || 0) >= minCount) return null;
        }
        const members = poolMemberList(pool);
        const preferenceOrder = shuffleArray(members);
        const alloc = allocateAutoGoMember(pool, preferenceOrder[0], preferenceOrder);
        const entrySeq = (Number(pool.totalCount) || 0) + 1;
        tx.update(poolRef, {
          totalCount: entrySeq,
          memberCounts: alloc.counts,
          memberCaps: alloc.caps,
          targetParticipants: alloc.targetParticipants
        });
        tx.create(entryRef, {
          uid: dummyUid,
          isDummy: true,
          wantedMember: alloc.assigned,
          preferenceOrder: alloc.preferenceOrder,
          assignedRank: alloc.assignedRank,
          entrySeq,
          pulledMember: null,
          status: "reserved",
          consentAt: FV.serverTimestamp(),
          userName: `ダミー参加者#${entrySeq}`,
          xId: `dummy_${entrySeq}`,
          createdAt: FV.serverTimestamp(),
          injectedBy: request.auth.uid
        });
        return {
          uid: dummyUid,
          entrySeq,
          wantedMember: alloc.assigned,
          assignedRank: alloc.assignedRank,
          preferenceOrder: alloc.preferenceOrder
        };
      });
    } catch (error) {
      if (error instanceof HttpsError && error.code === "resource-exhausted") break;
      if (error instanceof HttpsError && /locked|closed|status/i.test(error.message || "")) break;
      throw error;
    }
    if (!row) break;
    injected += 1;
    results.push(row);
    await writeAutoGoAuditLog(poolId, {
      action: "dummy_inject",
      actorUid: request.auth.uid,
      ...row
    }).catch(() => {});
  }

  await writeAutoGoAuditLog(poolId, {
    action: "dummy_inject_batch",
    actorUid: request.auth.uid,
    injected,
    fillToMin,
    requested: count
  }).catch(() => {});

  return { ok: true, injected, results };
});

/** テスト用プールとダミー／監査ログを完全削除 */
exports.adminResetAutoGoTestPool = onCall({ timeoutSeconds: 120 }, async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  if (!isAutoGoTestPool(poolSnap.data())) {
    throw new HttpsError("failed-precondition", "reset is allowed only on [TEST] pools");
  }

  const deleteCollection = async (colRef) => {
    const snap = await colRef.limit(400).get();
    if (snap.empty) return 0;
    const bw = db.bulkWriter();
    snap.docs.forEach((d) => bw.delete(d.ref));
    await bw.close();
    return snap.size + await deleteCollection(colRef);
  };

  const entriesDeleted = await deleteCollection(poolRef.collection("entries"));
  const auditsDeleted = await deleteCollection(poolRef.collection("auditLogs"));
  await poolRef.delete();
  // プール削除後はグローバル監査のみ（サブコレ書き込みで親ドキュメントが復活しないように）
  await db.collection("auditLogs").add({
    action: "test_pool_reset_deleted",
    poolId,
    actorUid: request.auth.uid,
    entriesDeleted,
    auditsDeleted,
    createdAt: FV.serverTimestamp()
  }).catch(() => {});
  return { ok: true, entriesDeleted, auditsDeleted };
});

/** 本番／テスト共通：新規エントリー緊急停止スイッチ */
exports.adminSetAutoGoEntryLock = onCall(async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  const locked = !!(request.data || {}).locked;
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const snap = await poolRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "pool not found");
  await poolRef.update({
    entryLocked: locked,
    entryLockedAt: locked ? FV.serverTimestamp() : null,
    entryLockedBy: locked ? request.auth.uid : null
  });
  await writeAutoGoAuditLog(poolId, {
    action: locked ? "entry_lock_on" : "entry_lock_off",
    actorUid: request.auth.uid
  });
  return { ok: true, locked };
});

/** 本番緊急：プール強制キャンセル（各自購入のためサイト側返金はなし） */
exports.adminForceCancelAutoGoPool = onCall({ timeoutSeconds: 120 }, async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const poolId = String(data.poolId || "");
  const confirmText = String(data.confirmText || "");
  const reason = String(data.reason || "admin_force_cancel").slice(0, 200);
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  if (confirmText !== "FORCE_CANCEL") {
    throw new HttpsError("failed-precondition", "confirmText must be FORCE_CANCEL");
  }
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  const pool = poolSnap.data();

  await poolRef.update({
    status: "cancelled",
    recruitmentClosedAt: FV.serverTimestamp(),
    entryLocked: true,
    forceCancelledAt: FV.serverTimestamp(),
    forceCancelledBy: request.auth.uid,
    forceCancelReason: reason
  });

  const entries = await poolRef.collection("entries").get();
  const bw = db.bulkWriter();
  const notifyUids = [];
  entries.docs.forEach((docSnap) => {
    const entry = docSnap.data() || {};
    if (["cancelled", "unshipped_penalty"].includes(entry.status) &&
        entry.cancellationReason === "admin_force_cancel") return;
    bw.update(docSnap.ref, {
      status: "cancelled",
      cancellationReason: "admin_force_cancel",
      // Auto-GOは各自購入のためサイト側の返金処理は発生しない
      followupStatus: "ops_closed",
      followupNote: "運営による緊急キャンセル。代金は各自購入のためサイトからの返金はありません。購入済みの場合はショップ側のキャンセル・返品をご確認ください。",
      adminForceCancelledBy: request.auth.uid,
      adminForceCancelledAt: FV.serverTimestamp()
    });
    if (!isAutoGoDummyUid(docSnap.id) && !isAutoGoTestPool(pool)) notifyUids.push(docSnap.id);
  });
  await bw.close();

  await Promise.all(notifyUids.map((uid) => notify(uid, {
    id: `autogo_force_cancel_${poolId}`,
    text: `「${pool.title || "Auto-GO"}」は運営により緊急キャンセルされました。代金は各自購入のためサイトからの返金はありません。購入済みの方はショップ側のキャンセル・返品をご確認ください。`,
    type: "admin",
    link: { k: "autogo", id: poolId },
    title: "🚨 Auto-GO緊急キャンセル"
  })));

  await writeAutoGoAuditLog(poolId, {
    action: "force_cancel_pool",
    actorUid: request.auth.uid,
    reason,
    affected: entries.size
  });
  return { ok: true, affected: entries.size };
});

/** 確定済みメンバー枠の手動再割り当て（監査ログ付き） */
exports.adminReassignAutoGoMember = onCall(async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const poolId = String(data.poolId || "");
  const uid = String(data.uid || "");
  const newMember = String(data.newMember || "").trim();
  const note = String(data.note || "").slice(0, 200);
  if (!/^[\w-]{1,120}$/.test(poolId) || !uid || uid.length > 128 || !newMember) {
    throw new HttpsError("invalid-argument", "pool, uid and newMember are required");
  }
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, uid);
  let beforeMember = "";
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap] = await Promise.all([tx.get(poolRef), tx.get(entryRef)]);
    if (!poolSnap.exists || !entrySnap.exists) throw new HttpsError("not-found", "not found");
    const pool = poolSnap.data();
    const entry = entrySnap.data();
    const members = poolMemberList(pool);
    if (!members.includes(newMember)) throw new HttpsError("invalid-argument", "unknown member");
    beforeMember = String(entry.wantedMember || "");
    if (beforeMember === newMember) return;
    if (["cancelled", "unshipped_penalty"].includes(entry.status)) {
      throw new HttpsError("failed-precondition", "cancelled entries cannot be reassigned");
    }
    const defaultCap = members.length === 5 ? 4 : members.length === 4 ? 5 : 0;
    const caps = { ...(pool.memberCaps || {}) };
    const counts = { ...(pool.memberCounts || {}) };
    members.forEach((member) => {
      caps[member] = Number(caps[member]) || defaultCap;
      counts[member] = Number(counts[member]) || 0;
    });
    if (beforeMember && counts[beforeMember] > 0) counts[beforeMember] -= 1;
    if (counts[newMember] >= caps[newMember]) {
      // 手動調整では必要に応じて枠を1つ拡張
      caps[newMember] = (Number(caps[newMember]) || 0) + 1;
    }
    counts[newMember] = (Number(counts[newMember]) || 0) + 1;
    tx.update(poolRef, { memberCounts: counts, memberCaps: caps });
    tx.update(entryRef, {
      wantedMember: newMember,
      previousWantedMember: beforeMember || null,
      reassignedBy: request.auth.uid,
      reassignedAt: FV.serverTimestamp(),
      reassignNote: note || null,
      assignedRank: 0
    });
  });
  await writeAutoGoAuditLog(poolId, {
    action: "reassign_member",
    actorUid: request.auth.uid,
    uid,
    beforeMember,
    newMember,
    note
  });
  return { ok: true, beforeMember, newMember };
});

/** 割り当て監査ログ取得 */
exports.adminGetAutoGoAuditLogs = onCall(async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  const limitN = Math.min(200, Math.max(1, Number((request.data || {}).limit) || 100));
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const snap = await db.collection("auto_go_pools").doc(poolId)
    .collection("auditLogs").orderBy("createdAt", "desc").limit(limitN).get();
  const logs = snap.docs.map((d) => {
    const row = d.data() || {};
    return {
      id: d.id,
      ...row,
      createdAtMs: timestampMillis(row.createdAt)
    };
  });
  const entriesSnap = await db.collection("auto_go_pools").doc(poolId).collection("entries").get();
  const assignments = entriesSnap.docs.map((d) => {
    const e = d.data() || {};
    return {
      uid: d.id,
      userName: e.userName || "",
      entrySeq: e.entrySeq || null,
      wantedMember: e.wantedMember || "",
      assignedRank: e.assignedRank || null,
      preferenceOrder: e.preferenceOrder || [],
      status: e.status || "",
      isDummy: !!e.isDummy,
      createdAtMs: timestampMillis(e.createdAt)
    };
  }).sort((a, b) => (a.entrySeq || a.createdAtMs) - (b.entrySeq || b.createdAtMs));
  return { ok: true, logs, assignments };
});

/**
 * テスト用：枠確定後のダミー購入報告シミュレーション
 * mode=all → 未報告ダミー全員 / mode=leave_one → 1人だけ未報告を残す / mode=one → 1人分だけ報告
 * 本番と同じ saveAutoGoPurchaseProofImage → applyAutoGoPurchaseRegistration 経路
 */
exports.adminSimAutoGoDummyPurchases = onCall({
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const poolId = String(data.poolId || "");
  const mode = String(data.mode || "all");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  if (!["all", "leave_one", "one"].includes(mode)) {
    throw new HttpsError("invalid-argument", "mode must be all, leave_one, or one");
  }

  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  if (!isAutoGoTestPool(poolSnap.data())) {
    throw new HttpsError("failed-precondition", "dummy purchase sim is allowed only on [TEST] pools");
  }

  const entriesSnap = await poolRef.collection("entries").get();
  const candidates = entriesSnap.docs
    .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
    .filter((e) => {
      const dummy = e.isDummy === true || isAutoGoDummyUid(e.uid);
      return dummy && e.status === "confirmed";
    })
    .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));

  let targets = candidates;
  let leftUnreported = [];
  if (mode === "one") {
    targets = candidates.slice(0, 1);
    leftUnreported = candidates.slice(1).map((e) => e.uid);
  } else if (mode === "leave_one") {
    if (candidates.length <= 1) {
      targets = [];
      leftUnreported = candidates.map((e) => e.uid);
    } else {
      leftUnreported = [candidates[candidates.length - 1].uid];
      targets = candidates.slice(0, -1);
    }
  }

  const results = [];
  for (const entry of targets) {
    const orderNote = `TEST-DUMMY-${entry.entrySeq || entry.uid.slice(-6)}`;
    let storage = entry.purchaseProofStorage || null;
    if (!entry.purchaseProofUrl) {
      const saved = await saveAutoGoPurchaseProofImage(
        poolId,
        entry.uid,
        DUMMY_PURCHASE_PROOF_PNG,
        "png",
        "adminSimAutoGoDummyPurchases"
      );
      storage = saved.storage;
    }
    await applyAutoGoPurchaseRegistration(poolId, entry.uid, orderNote);
    results.push({
      uid: entry.uid,
      orderNote,
      storage
    });
  }

  await writeAutoGoAuditLog(poolId, {
    action: "dummy_purchase_sim",
    actorUid: request.auth.uid,
    mode,
    reported: results.length,
    leftUnreported: leftUnreported.length,
    leftUnreportedUids: leftUnreported.slice(0, 40)
  }).catch(() => {});

  return {
    ok: true,
    mode,
    reported: results.length,
    leftUnreported: leftUnreported.length,
    leftUnreportedUids: leftUnreported,
    results
  };
});

function dummyShipProofUrl(uid, index) {
  const color = ((index * 47) + (String(uid).length * 13)) % 16777215;
  let hex = color.toString(16);
  while (hex.length < 6) {
    hex = "0" + hex;
  }
  const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><rect width=\"8\" height=\"8\" fill=\"#" + hex + "\"/></svg><!--" + uid + "-" + index + "-->";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function nextDummyTrackingNumber(used, index) {
  const base = String(Date.now() % 100000000).padStart(8, "0");
  let n = 0;
  while (n < 500) {
    const tail = String((index * 17 + n) % 100).padStart(2, "0");
    const tracking = "89" + base + tail;
    if (!used.has(tracking)) {
      used.add(tracking);
      return tracking;
    }
    n += 1;
  }
  return "";
}

/**
 * テスト用：マッチ済みダミーの発送報告を一括で付ける
 * 本番と同じ項目（伝票画像・追跡番号・相手への追跡コピー）を書く
 */
exports.adminSimAutoGoDummyShipments = onCall({
  timeoutSeconds: 180
}, async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");

  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  if (!isAutoGoTestPool(poolSnap.data())) {
    throw new HttpsError("failed-precondition", "dummy shipment sim is allowed only on [TEST] pools");
  }

  const entriesSnap = await poolRef.collection("entries").get();
  const usedTracking = new Set();
  entriesSnap.docs.forEach((docSnap) => {
    const row = docSnap.data() || {};
    const own = String(row.trackingNumber || "").replace(/\D/g, "");
    const incoming = String(row.incomingTrackingNumber || "").replace(/\D/g, "");
    if (own) usedTracking.add(own);
    if (incoming) usedTracking.add(incoming);
  });

  const candidates = entriesSnap.docs
    .map((docSnap) => ({ uid: docSnap.id, ...(docSnap.data() || {}) }))
    .filter((entry) => {
      const dummy = entry.isDummy === true || isAutoGoDummyUid(entry.uid);
      const already = entry.shippedDone === true || !!entry.shippedAt;
      return dummy && entry.status === "matched" && !already;
    })
    .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));

  const results = [];
  let skippedNoAddress = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const entry = candidates[i];
    if (!entry.shipToAddress) {
      skippedNoAddress += 1;
      continue;
    }
    const trackingNumber = nextDummyTrackingNumber(usedTracking, i + 1);
    if (!trackingNumber || trackingNumber.length < 10) {
      throw new HttpsError("internal", "追跡番号を作れませんでした");
    }
    const proofUrl = entry.shippingProofUrl || dummyShipProofUrl(entry.uid, i + 1);
    const hash = createHash("sha256").update(String(proofUrl) + "|" + entry.uid).digest("hex");
    const entryRef = autoGoEntryRef(poolId, entry.uid);
    const receiverRef = entry.sendToUid ? autoGoEntryRef(poolId, entry.sendToUid) : null;
    const hashRef = db.collection("auto_go_shipping_hashes").doc(hash);
    let notifyUid = "";
    let wrote = false;
    await db.runTransaction(async (tx) => {
      const reads = [tx.get(entryRef), tx.get(hashRef)];
      if (receiverRef) reads.push(tx.get(receiverRef));
      const snaps = await Promise.all(reads);
      const current = snaps[0];
      const hashSnap = snaps[1];
      const receiverSnap = receiverRef ? snaps[2] : null;
      if (!current.exists) return;
      const data = current.data() || {};
      const already = data.shippedDone === true || !!data.shippedAt;
      if (data.status !== "matched" || already || !data.shipToAddress) return;
      if (hashSnap.exists && !data.shippingProofUrl) return;
      if (!hashSnap.exists) {
        tx.create(hashRef, {
          poolId,
          uid: entry.uid,
          kind: "shipping",
          sha256: hash,
          storagePath: "inline-dummy",
          createdAt: FV.serverTimestamp()
        });
      }
      tx.update(entryRef, {
        shippingProofUrl: data.shippingProofUrl || proofUrl,
        shippingProofHash: data.shippingProofHash || hash,
        shippingProofSavedAt: data.shippingProofSavedAt || FV.serverTimestamp(),
        shippingProofStorage: data.shippingProofStorage || "firestore",
        shippedDone: true,
        shippedAt: FV.serverTimestamp(),
        trackingNumber
      });
      if (receiverRef && receiverSnap && receiverSnap.exists) {
        notifyUid = entry.sendToUid;
        tx.update(receiverRef, {
          incomingTrackingNumber: trackingNumber,
          incomingShippedAt: FV.serverTimestamp(),
          incomingShipperName: data.userName || "ダミー参加者"
        });
      }
      wrote = true;
    });
    if (!wrote) continue;
    if (notifyUid && !isAutoGoDummyUid(notifyUid)) {
      await notify(notifyUid, {
        id: "autogo_incoming_" + poolId + "_" + entry.uid,
        text: "Auto-GOのトレカが発送されました。追跡番号: " + trackingNumber,
        type: "info",
        link: { k: "autogo", id: poolId },
        title: "📦 Auto-GO発送通知"
      }).catch((e) => console.warn("dummy ship notify", e));
    }
    results.push({ uid: entry.uid, trackingNumber });
  }

  await writeAutoGoAuditLog(poolId, {
    action: "dummy_shipment_sim",
    actorUid: request.auth.uid,
    shipped: results.length,
    skippedNoAddress
  }).catch(() => {});

  return {
    ok: true,
    shipped: results.length,
    skippedNoAddress,
    results
  };
});

/**
 * テスト用：発送後のダミー受取完了一括シミュレーション
 * 本番と同じ applyAutoGoReceiptRegistration 経路
 */
exports.adminSimAutoGoDummyReceipts = onCall({
  timeoutSeconds: 180
}, async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");

  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  if (!isAutoGoTestPool(poolSnap.data())) {
    throw new HttpsError("failed-precondition", "dummy receipt sim is allowed only on [TEST] pools");
  }

  const entriesSnap = await poolRef.collection("entries").get();
  const candidates = entriesSnap.docs
    .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
    .filter((e) => {
      const dummy = e.isDummy === true || isAutoGoDummyUid(e.uid);
      return dummy && e.status === "matched" && e.receivedDone !== true;
    })
    .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));

  // 発送完了が確認できる相手を優先。誰も発送済みでない場合は matched ダミー全員を対象（テスト進行用）
  const withIncoming = candidates.filter((e) => e.incomingShippedAt || e.incomingTrackingNumber);
  const targets = withIncoming.length ? withIncoming : candidates;

  const results = [];
  for (const entry of targets) {
    await applyAutoGoReceiptRegistration(poolId, entry.uid);
    results.push({ uid: entry.uid });
  }

  await writeAutoGoAuditLog(poolId, {
    action: "dummy_receipt_sim",
    actorUid: request.auth.uid,
    received: results.length,
    preferredIncoming: withIncoming.length > 0
  }).catch(() => {});

  return {
    ok: true,
    received: results.length,
    preferredIncoming: withIncoming.length > 0,
    results
  };
});

/**
 * テスト用：ダミー到着・開封（トレカ報告）→ 5人以上で開封期間カウントダウン開始
 * mode:
 *  - arrive_all: purchased → arrived
 *  - reveal_all: arrived → 開封報告
 *  - five_plus: 購入済みダミーを到着+開封し、5人以上でカウントダウン開始（本番ロジック）
 * shortCountdown: true なら TEST 用に締切を約3分に短縮（動作確認用）
 */
exports.adminSimAutoGoDummyRevealPhase = onCall({
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (request) => {
  assertAdmin(request);
  const data = request.data || {};
  const poolId = String(data.poolId || "");
  const mode = String(data.mode || "five_plus");
  const shortCountdown = data.shortCountdown === true;
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  if (!["arrive_all", "reveal_all", "five_plus"].includes(mode)) {
    throw new HttpsError("invalid-argument", "mode must be arrive_all, reveal_all, or five_plus");
  }

  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  const pool = poolSnap.data() || {};
  if (!isAutoGoTestPool(pool)) {
    throw new HttpsError("failed-precondition", "dummy reveal sim is allowed only on [TEST] pools");
  }
  const members = poolMemberList(pool);
  if (!members.length) throw new HttpsError("failed-precondition", "pool has no members");

  const entriesSnap = await poolRef.collection("entries").get();
  const dummies = entriesSnap.docs
    .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
    .filter((e) => e.isDummy === true || isAutoGoDummyUid(e.uid))
    .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));

  const pickPulled = (entry, index) => {
    const wanted = entry.wantedMember;
    const others = members.filter((m) => m !== wanted);
    if (others.length) return others[index % others.length];
    return members[index % members.length];
  };

  let arrived = 0;
  let revealed = 0;
  const results = [];

  if (mode === "arrive_all" || mode === "five_plus") {
    const targets = dummies.filter((e) => e.status === "purchased");
    for (const entry of targets) {
      await applyAutoGoArrivalRegistration(poolId, entry.uid);
      arrived += 1;
      results.push({ uid: entry.uid, step: "arrived" });
      entry.status = "arrived";
      entry.albumReceivedAt = true;
    }
  }

  if (mode === "reveal_all" || mode === "five_plus") {
    // 最新を再読込
    const fresh = await poolRef.collection("entries").get();
    const arrivedDummies = fresh.docs
      .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
      .filter((e) => (e.isDummy === true || isAutoGoDummyUid(e.uid)) && e.status === "arrived")
      .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));

    let revealTargets = arrivedDummies;
    if (mode === "five_plus") {
      // すでに開封済みを含めて5人以上になるよう足りない分だけ開封
      const already = fresh.docs.filter((d) => {
        const e = d.data() || {};
        return (e.isDummy === true || isAutoGoDummyUid(d.id)) && !!(e.albumReceivedAt || e.revealedAt);
      }).length;
      const need = Math.max(0, 5 - already);
      // 到着済みをできるだけ開封（最低 need 人、余裕があれば全員）
      revealTargets = arrivedDummies;
      if (need === 0 && arrivedDummies.length === 0) {
        // nothing
      }
    }

    for (let i = 0; i < revealTargets.length; i += 1) {
      const entry = revealTargets[i];
      const pulled = pickPulled(entry, i);
      await applyAutoGoRevealRegistration(poolId, entry.uid, pulled);
      revealed += 1;
      results.push({ uid: entry.uid, step: "revealed", pulledMember: pulled });
    }
  }

  let countdown = { started: false };
  if (mode === "five_plus") {
    countdown = await tryStartAutoGoRevealWindow(poolId, {
      shortTestMs: shortCountdown ? 3 * 60 * 1000 : 0
    });
    // まだ足りない場合は明示
    if (!countdown.started && !countdown.already && countdown.reason === "need_five") {
      throw new HttpsError(
        "failed-precondition",
        `開封/到着が${countdown.arrivalCount || 0}人です。あと${countdown.need || 5}人必要です（購入→到着→開封の順でダミーを進めてください）`
      );
    }
  } else {
    // 到着/開封のみでも、条件を満たしていれば本番トリガーと同様に開始を試みる
    countdown = await tryStartAutoGoRevealWindow(poolId, {
      shortTestMs: shortCountdown ? 3 * 60 * 1000 : 0
    });
  }

  await writeAutoGoAuditLog(poolId, {
    action: "dummy_reveal_phase_sim",
    actorUid: request.auth.uid,
    mode,
    shortCountdown,
    arrived,
    revealed,
    countdownStarted: !!countdown.started,
    countdownAlready: !!countdown.already,
    revealDeadlineAtMs: countdown.revealDeadlineAtMs || null
  }).catch(() => {});

  return {
    ok: true,
    mode,
    arrived,
    revealed,
    shortCountdown,
    countdown,
    results
  };
});

exports.adminRunAutoGoMatch = onCall({
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (request) => {
  assertAdmin(request);
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) {
    throw new HttpsError("invalid-argument", "invalid pool");
  }
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const poolSnap = await poolRef.get();
  if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
  const pool = poolSnap.data() || {};
  if (!isAutoGoTestPool(pool)) {
    throw new HttpsError("failed-precondition", "manual match is allowed only on [TEST] pools");
  }
  const deadlinePassed = !!(pool.revealDeadlineAt && timestampMillis(pool.revealDeadlineAt) <= Date.now());
  const result = await closeAutoGoRevealWindow(poolId, poolRef, pool, {
    finalize: deadlinePassed,
    reshuffleUnshipped: true
  });
  await writeAutoGoAuditLog(poolId, {
    action: "admin_run_match",
    actorUid: request.auth.uid,
    matched: result.matched,
    unmatched: result.unmatched,
    finalized: result.finalized,
    deadlinePassed
  }).catch((error) => {
    console.error("admin_run_match audit failed", error);
  });
  return {
    ok: true,
    matched: result.matched,
    unmatched: result.unmatched,
    finalized: result.finalized,
    deadlinePassed
  };
});

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
      text: message, type: "admin", category: "notice", title: "運営からのお知らせ", link: null, read: false, createdAt: FV.serverTimestamp(), expireAt: expireAt()
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

// ===== 売却取引：購入から3日未発送で催促、7日未発送で強めの最終警告 =====
exports.remindUnshippedSales = onSchedule("every 1 hours", async () => {
  const now = Date.now();
  const H72 = 72 * 3600 * 1000;
  const H168 = 168 * 3600 * 1000;

  const snap = await db.collection("trades").where("isSell", "==", true).get();
  for (const docSnap of snap.docs) {
    const t = docSnap.data() || {};
    if (t.status === "done" || t.status === "completed" || t.status === "cancelled" || t.status === "canceled") continue;
    const ownerId = t.ownerId;
    if (!ownerId) continue;
    const shipped = t.shipped || {};
    if (shipped[ownerId]) continue; // すでに発送完了済み

    const createdMs = t.createdAt && typeof t.createdAt.toMillis === "function"
      ? t.createdAt.toMillis()
      : (typeof t.createdAt === "number" ? t.createdAt : 0);
    if (!createdMs) continue;

    const elapsed = now - createdMs;
    const itemLabel = t.giveTitle || t.title || "出品トレカ";

    if (elapsed >= H168 && !t.reminded7d) {
      await notify(ownerId, {
        title: "🚨【重要・最終警告】発送期限を大幅に超過しています",
        text: `「${itemLabel}」が購入されてから7日が経過しましたが、まだ発送完了になっていません。早急にアズカリの匿名配送で発送し「発送完了」を押してください。未対応が続く場合、運営介入・アカウント利用制限の対象となります。`,
        type: "trade"
      });
      await docSnap.ref.update({ reminded7d: true, reminded3d: true, updatedAt: FV.serverTimestamp() });
    } else if (elapsed >= H72 && !t.reminded3d) {
      await notify(ownerId, {
        title: "📦【発送のお願い】購入から3日が経過しました",
        text: `「${itemLabel}」が購入されてから3日が経過しました。アズカリでの入金確認後、匿名配送にて発送し取引画面から「発送完了」を押してください。`,
        type: "trade"
      });
      await docSnap.ref.update({ reminded3d: true, updatedAt: FV.serverTimestamp() });
    }
  }
});
