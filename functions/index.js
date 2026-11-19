const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { randomUUID } = require("crypto");
admin.initializeApp();
setGlobalOptions({ region: "asia-northeast1", maxInstances: 10 });

const db = admin.firestore();
const FV = admin.firestore.FieldValue;
const STORAGE_BUCKET = "illit-7ecd4.firebasestorage.app";

// ★ 要変更：実際のサイトURL（https・末尾 / まで）
const SITE = "https://kpop-trade.jp/";
const ADMIN_UIDS = ["Ay6VCS8HTgM3RqjDYZ0wKdHrSKz1", "GvVhAmT56GZjsWrl1YRaStB81im1"];
const expireAt = () => admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 86400000); // TTL用(60日)

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
    : String(text).slice(0, 200);
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

// アプリ内通知（サブコレクション）＋プッシュ
async function notify(uid, { id, text, type = "info", link = null, title = "ILLIT Trade" }) {
  if (!uid) return;
  const col = db.collection("users").doc(uid).collection("notifications");
  await (id ? col.doc(id) : col.doc()).set({
    text, type, link, read: false, createdAt: FV.serverTimestamp(), expireAt: expireAt()
  });
  await push(uid, title, text, link).catch((e) => console.warn("push error", e));
}

const autoGoEntryRef = (poolId, uid) =>
  db.collection("auto_go_pools").doc(poolId).collection("entries").doc(uid);

function timestampMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return Number(value) || 0;
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
    const poolRef = db.collection("auto_go_pools").doc(event.params.poolId);
    const poolSnap = await poolRef.get();
    if (!poolSnap.exists) return;
    const pool = poolSnap.data();
    if (pool.revealDeadlineAt) return;
    const arrivals = await poolRef.collection("entries").get();
    const arrivalCount = arrivals.docs.filter((entry) => {
      const data = entry.data();
      return !!(data.albumReceivedAt || data.revealedAt);
    }).length;
    if (arrivalCount < 5) return;
    const deadlineAt = admin.firestore.Timestamp.fromMillis(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const started = await db.runTransaction(async (tx) => {
      const current = await tx.get(poolRef);
      if (!current.exists || current.data().revealDeadlineAt) return false;
      tx.update(poolRef, {
        revealOpenedAt: FV.serverTimestamp(),
        revealDeadlineAt: deadlineAt,
        recruitmentClosedAt: FV.serverTimestamp()
      });
      return true;
    });
    if (!started) return;
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

function findAutoGoCycle(start, candidates, used) {
  const path = [start];
  const visited = new Set([start.id]);
  function search(current) {
    for (const next of candidates) {
      if (next.wantedMember !== current.pulledMember) continue;
      if (next.id === start.id) {
        if (path.length >= 2) return path.slice();
        continue;
      }
      if (used.has(next.id) || visited.has(next.id) || path.length >= 5) continue;
      visited.add(next.id);
      path.push(next);
      const result = search(next);
      if (result) return result;
      path.pop();
      visited.delete(next.id);
    }
    return null;
  }
  return search(start);
}

async function closeAutoGoRevealWindow(poolId, poolRef, poolData) {
  const entriesRef = poolRef.collection("entries");
  const waiting = await entriesRef.where("status", "==", "waiting_match").get();
  const candidates = waiting.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => timestampMillis(a.revealedAt) - timestampMillis(b.revealedAt));
  const used = new Set();
  const updates = [];

  for (const start of candidates) {
    if (used.has(start.id)) continue;
    const cycle = findAutoGoCycle(start, candidates, used);
    if (!cycle) continue;
    const profiles = await Promise.all(cycle.map((entry) =>
      db.collection("users").doc(entry.id).get()));
    if (profiles.some((profile) => {
      const address = profile.exists ? profile.data().profile || {} : {};
      return !address.name || !address.zip || !address.address1;
    })) continue;
    cycle.forEach((entry) => used.add(entry.id));
    const cycleId = `ag_${poolId}_${start.id}`;
    cycle.forEach((sender, index) => {
      const receiver = cycle[(index + 1) % cycle.length];
      const provider = cycle[(index + cycle.length - 1) % cycle.length];
      const receiverProfile = profiles[(index + 1) % cycle.length].data().profile || {};
      updates.push({
        ref: autoGoEntryRef(poolId, sender.id),
        data: {
          status: "matched",
          matchRoomId: cycleId,
          cycleSize: cycle.length,
          sendToUid: receiver.id,
          sendToName: receiver.userName || receiver.displayName || "参加者",
          shipToName: receiverProfile.name,
          shipToZip: receiverProfile.zip,
          shipToAddress: [receiverProfile.address1, receiverProfile.address2].filter(Boolean).join(" "),
          receiveFromUid: provider.id,
          receiveFromName: provider.userName || provider.displayName || "参加者",
          receivingCard: provider.pulledMember,
          matchedAt: FV.serverTimestamp()
        }
      });
    });
  }

  for (const candidate of candidates) {
    if (!used.has(candidate.id)) {
      updates.push({
        ref: autoGoEntryRef(poolId, candidate.id),
        data: { status: "matched", noMatchResult: true, matchedAt: FV.serverTimestamp() }
      });
    }
  }

  for (const status of ["purchased", "arrived"]) {
    const unregistered = await entriesRef.where("status", "==", status).get();
    for (const entry of unregistered.docs) {
      updates.push({
        ref: entry.ref,
        data: { status: "cancelled", penalty: true, penaltyReason: "reveal_not_registered", cancelledAt: FV.serverTimestamp() }
      });
    }
  }

  const writer = db.bulkWriter();
  updates.forEach(({ ref, data }) => writer.update(ref, data));
  await writer.close();
  await poolRef.update({ matchingClosedAt: FV.serverTimestamp() });

  await Promise.all(updates
    .filter(({ data }) => data.penalty)
    .map(({ ref }) => recordAutoGoPenalty(ref.id, poolId)));
  await Promise.all(updates.map(({ ref, data }) => {
    if (data.status === "matched") {
      return notify(ref.id, {
        id: `autogo_match_${poolId}`,
        text: data.noMatchResult
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
      const entries = await poolDoc.ref.collection("entries").where("status", "==", "confirmed").get();
      for (const entry of entries.docs) {
        if (!entry.data().purchaseDeadlineAt || timestampMillis(entry.data().purchaseDeadlineAt) > now) continue;
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

    if (pool.revealDeadlineAt && timestampMillis(pool.revealDeadlineAt) <= now && !pool.matchingClosedAt) {
      await closeAutoGoRevealWindow(poolId, poolDoc.ref, pool);
    }
  }
});

exports.uploadAutoGoEvidence = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const { poolId, kind, dataUrl } = request.data || {};
  if (!/^[\w-]{1,120}$/.test(String(poolId || "")) || !["purchase", "shipping"].includes(kind)) {
    throw new HttpsError("invalid-argument", "invalid pool or evidence type");
  }
  if (typeof dataUrl !== "string") throw new HttpsError("invalid-argument", "image required");
  const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new HttpsError("invalid-argument", "unsupported image");
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
  if (kind === "purchase" && timestampMillis(entry.purchaseDeadlineAt) <= Date.now()) {
    throw new HttpsError("deadline-exceeded", "purchase registration deadline has passed");
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const path = `auto-go/${poolId}/${uid}/${kind}-${Date.now()}.${extension}`;
  const token = randomUUID();
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  await bucket.file(path).save(buffer, {
    resumable: false,
    metadata: {
      contentType: `image/${match[1]}`,
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  await entryRef.update(kind === "purchase" ? { purchaseProofUrl: url } : { shippingProofUrl: url });
  return { url };
});

exports.registerAutoGoPurchase = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  const orderNote = String((request.data || {}).orderNote || "").trim();
  if (!/^[\w-]{1,120}$/.test(poolId) || orderNote.length > 120) {
    throw new HttpsError("invalid-argument", "invalid purchase registration");
  }
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "confirmed" || !snap.data().purchaseProofUrl) {
      throw new HttpsError("failed-precondition", "upload the purchase screenshot first");
    }
    if (timestampMillis(snap.data().purchaseDeadlineAt) <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "purchase registration deadline has passed");
    }
    tx.update(entryRef, {
      status: "purchased",
      orderNote,
      purchasedAt: FV.serverTimestamp()
    });
  });
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
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, uid);
  await db.runTransaction(async (tx) => {
    const [poolSnap, entrySnap, userSnap] = await Promise.all([
      tx.get(poolRef),
      tx.get(entryRef),
      tx.get(db.collection("users").doc(uid))
    ]);
    if (!poolSnap.exists) throw new HttpsError("not-found", "pool not found");
    if (entrySnap.exists) throw new HttpsError("already-exists", "one entry per person is allowed");
    const pool = poolSnap.data();
    if (!["recruiting", "activating", "active"].includes(pool.status) || pool.recruitmentClosedAt) {
      throw new HttpsError("failed-precondition", "recruitment is closed");
    }
    const recruitEndAt = timestampMillis(pool.recruitEndAt);
    if (recruitEndAt && recruitEndAt <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "recruitment period has ended");
    }
    const members = Array.isArray(pool.members) && pool.members.length
      ? pool.members
      : (Array.isArray(pool.memberNames) ? pool.memberNames : []);
    if (!members.includes(wantedMember)) throw new HttpsError("invalid-argument", "unknown member");
    const profile = userSnap.exists ? userSnap.data().profile || {} : {};
    if (!profile.name || !profile.zip || !profile.address1) {
      throw new HttpsError("failed-precondition", "shipping address is required");
    }

    const defaultCap = members.length === 5 ? 4 : members.length === 4 ? 5 : 0;
    const caps = { ...(pool.memberCaps || {}) };
    const counts = { ...(pool.memberCounts || {}) };
    members.forEach((member) => {
      caps[member] = Number(caps[member]) || defaultCap;
      counts[member] = Number(counts[member]) || 0;
    });
    if (!caps[wantedMember] || counts[wantedMember] >= caps[wantedMember]) {
      throw new HttpsError("resource-exhausted", "member slots are full");
    }
    counts[wantedMember] += 1;
    const allFilled = members.every((member) => counts[member] >= caps[member]);
    let targetParticipants = Number(pool.targetParticipants) || members.reduce((sum, member) => sum + caps[member], 0);
    if (allFilled) {
      members.forEach((member) => { caps[member] += 3; });
      targetParticipants = members.reduce((sum, member) => sum + caps[member], 0);
    }
    tx.update(poolRef, {
      totalCount: (Number(pool.totalCount) || 0) + 1,
      memberCounts: counts,
      memberCaps: caps,
      targetParticipants
    });
    tx.create(entryRef, {
      uid,
      wantedMember,
      pulledMember: null,
      status: "reserved",
      consentAt: FV.serverTimestamp(),
      userName: profile.nickname || request.auth.token.name || "参加者",
      createdAt: FV.serverTimestamp()
    });
  });
  return { ok: true };
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
  const poolRef = db.collection("auto_go_pools").doc(poolId);
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
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
  return { ok: true };
});

exports.registerAutoGoArrival = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "purchased") {
      throw new HttpsError("failed-precondition", "purchase must be registered before arrival");
    }
    tx.update(entryRef, { status: "arrived", albumReceivedAt: FV.serverTimestamp() });
  });
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
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "matched" || !snap.data().shipToAddress || !snap.data().shippingProofUrl) {
      throw new HttpsError("failed-precondition", "shipping label evidence is required");
    }
    tx.update(entryRef, { shippedDone: true, shippedAt: FV.serverTimestamp() });
  });
  return { ok: true };
});

exports.registerAutoGoReceipt = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "login required");
  const poolId = String((request.data || {}).poolId || "");
  if (!/^[\w-]{1,120}$/.test(poolId)) throw new HttpsError("invalid-argument", "invalid pool");
  const entryRef = autoGoEntryRef(poolId, request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists || snap.data().status !== "matched") {
      throw new HttpsError("failed-precondition", "entry is not matched");
    }
    tx.update(entryRef, { receivedDone: true, receivedAt: FV.serverTimestamp() });
  });
  return { ok: true };
});

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
