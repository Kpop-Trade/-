/**
 * Auto-GO 管理者専用：テストシミュレーション＆緊急フェイルセーフ
 * （一般ユーザーには関数を露出しても isAdmin チェックで拒否）
 */
(function () {
  function isAgAdmin() {
    return typeof window.__isAutoGoAdmin === "function" && window.__isAutoGoAdmin() === true;
  }

  function agRefs() {
    return window.__autoGoRefs || {};
  }

  function toast(msg, type) {
    if (typeof window.showToast === "function") window.showToast(msg, type || "info");
    else console.log(msg);
  }

  async function confirmTwice(firstMsg, firstOk, secondMsg, secondOk) {
    const ask = async (msg, ok) => {
      if (typeof window.appConfirm === "function") return window.appConfirm(msg, ok, true);
      return window.confirm(msg);
    };
    if (!(await ask(firstMsg, firstOk))) return false;
    return ask(secondMsg, secondOk);
  }

  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  window.createAdminAutoGoTestPool = async function (minThreshold) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const refs = agRefs();
    if (!refs.db || typeof window.addDoc !== "function") {
      toast("Firestoreの準備中です。数秒後に再試行してください", "error");
      return;
    }
    const minP = Math.min(20, Math.max(5, Number(minThreshold) || 5));
    const members = ["ユナ", "ミンジュ", "モカ", "ウォンヒ", "イロハ"];
    const cap = Math.max(1, Math.ceil(minP / members.length));
    const memberCaps = {};
    const memberCounts = {};
    members.forEach((m) => { memberCaps[m] = Math.max(cap, 2); memberCounts[m] = 0; });
    const recruitEndAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const user = refs.auth?.currentUser || window.currentUser;
    try {
      const docRef = await window.addDoc(refs.collection(refs.db, "auto_go_pools"), {
        title: `[TEST] シミュレーション用（成立 ${minP}人）`,
        description: "管理者専用のドライランプールです。一般ユーザー一覧・通知には出しません。",
        purchaseUrl: "https://kpop-trade.jp/?pool=test",
        albumPrice: 0,
        imageUrl: "",
        memberCountType: members.length,
        memberNames: members,
        members,
        memberCounts,
        memberCaps,
        minParticipants: minP,
        minThreshold: minP,
        minCompletedTrades: 0,
        targetParticipants: members.reduce((s, m) => s + memberCaps[m], 0),
        recruitEndAt,
        slotPerMember: memberCaps[members[0]],
        totalCount: 0,
        status: "recruiting",
        isTest: true,
        testTag: "[TEST]",
        entryLocked: false,
        createdBy: user?.uid || "admin",
        createdAt: refs.serverTimestamp()
      });
      toast(`テストプールを作成しました（成立人数 ${minP}）`, "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return docRef.id;
    } catch (error) {
      console.error(error);
      toast("テストプール作成に失敗: " + (error?.message || error), "error");
    }
  };

  function callableErrorText(error) {
    const code = String(error?.code || error?.customData?.status || "");
    const msg = String(error?.message || error || "");
    return (code ? code + ": " : "") + msg;
  }

  function isTestPoolData(pool) {
    if (!pool) return false;
    if (pool.isTest === true || pool.testTag === "[TEST]") return true;
    return /^\[TEST\]/i.test(String(pool.title || ""));
  }

  function shuffleMembers(list) {
    const arr = (list || []).slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function allocateMemberClient(pool, preferenceOrder) {
    const members = (Array.isArray(pool.members) && pool.members.length)
      ? pool.members.slice()
      : (Array.isArray(pool.memberNames) ? pool.memberNames.slice() : []);
    if (!members.length) throw new Error("メンバー一覧がありません");
    const defaultCap = members.length === 5 ? 4 : members.length === 4 ? 5 : 2;
    const caps = { ...(pool.memberCaps || {}) };
    const counts = { ...(pool.memberCounts || {}) };
    members.forEach((m) => {
      caps[m] = Number(caps[m]) || defaultCap;
      counts[m] = Number(counts[m]) || 0;
    });
    const order = (preferenceOrder || []).filter((m) => members.includes(m));
    let assigned = null;
    let assignedRank = 0;
    for (let i = 0; i < order.length; i += 1) {
      if (counts[order[i]] < caps[order[i]]) {
        assigned = order[i];
        assignedRank = i + 1;
        break;
      }
    }
    if (!assigned) throw new Error("member slots are full");
    counts[assigned] += 1;
    const allFilled = members.every((m) => counts[m] >= caps[m]);
    let targetParticipants = Number(pool.targetParticipants) || members.reduce((s, m) => s + caps[m], 0);
    if (allFilled) {
      members.forEach((m) => { caps[m] += 3; });
      targetParticipants = members.reduce((s, m) => s + caps[m], 0);
    }
    return { assigned, assignedRank, preferenceOrder: order, caps, counts, targetParticipants };
  }

  /** Functions未デプロイ時でも動く：管理者権限で Firestore に直接ダミー投入 */
  async function injectDummiesViaFirestore(poolId, count, fillToMin) {
    const refs = agRefs();
    if (!refs.db || typeof refs.doc !== "function" || typeof refs.runTransaction !== "function") {
      throw new Error("Firestoreの準備ができていません");
    }
    const poolRef = refs.doc(refs.db, "auto_go_pools", poolId);
    const results = [];
    let injected = 0;
    const maxLoops = fillToMin ? 80 : Math.min(50, Math.max(1, Number(count) || 1));
    const actorUid = (refs.auth && refs.auth.currentUser && refs.auth.currentUser.uid)
      || (window.currentUser && window.currentUser.uid)
      || "admin";

    for (let i = 0; i < maxLoops; i += 1) {
      if (!fillToMin && injected >= (Number(count) || 1)) break;
      const dummyUid = "dummy_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      const entryRef = refs.doc(refs.db, "auto_go_pools", poolId, "entries", dummyUid);
      let row = null;
      try {
        row = await refs.runTransaction(refs.db, async (tx) => {
          const poolSnap = await tx.get(poolRef);
          if (!poolSnap.exists()) throw new Error("プールが見つかりません");
          const pool = poolSnap.data() || {};
          if (!isTestPoolData(pool)) throw new Error("テストプール（isTest / [TEST]）だけ投入できます");
          if (pool.entryLocked === true || pool.recruitmentClosedAt) {
            throw new Error("エントリー停止中／募集終了です");
          }
          if (!["recruiting", "activating", "active"].includes(String(pool.status || ""))) {
            throw new Error("このステータスでは投入できません: " + pool.status);
          }
          // 古いテストプールで isTest 欠落している場合は補完
          const patch = {};
          if (pool.isTest !== true) patch.isTest = true;
          if (fillToMin) {
            const minCount = Number(pool.minThreshold || pool.minParticipants || 20);
            if (Number(pool.totalCount || 0) >= minCount) return null;
          }
          const members = (pool.members && pool.members.length) ? pool.members : (pool.memberNames || []);
          const preferenceOrder = shuffleMembers(members);
          const alloc = allocateMemberClient(pool, preferenceOrder);
          const entrySeq = (Number(pool.totalCount) || 0) + 1;
          const stamp = refs.serverTimestamp ? refs.serverTimestamp() : new Date();
          tx.update(poolRef, {
            ...patch,
            totalCount: entrySeq,
            memberCounts: alloc.counts,
            memberCaps: alloc.caps,
            targetParticipants: alloc.targetParticipants
          });
          tx.set(entryRef, {
            uid: dummyUid,
            isDummy: true,
            wantedMember: alloc.assigned,
            preferenceOrder: alloc.preferenceOrder,
            assignedRank: alloc.assignedRank,
            entrySeq,
            pulledMember: null,
            status: "reserved",
            consentAt: stamp,
            userName: "ダミー参加者#" + entrySeq,
            xId: "dummy_" + entrySeq,
            createdAt: stamp,
            injectedBy: actorUid
          });
          return {
            uid: dummyUid,
            entrySeq,
            wantedMember: alloc.assigned,
            assignedRank: alloc.assignedRank,
            preferenceOrder: alloc.preferenceOrder
          };
        });
      } catch (e) {
        const msg = String(e && e.message || e);
        if (/slots are full|停止中|募集終了|ステータス/i.test(msg)) break;
        throw e;
      }
      if (!row) break;
      injected += 1;
      results.push(row);
      // 監査ログ（失敗しても投入自体は成功扱い）
      try {
        if (typeof refs.collection === "function" && typeof window.addDoc === "function") {
          await window.addDoc(refs.collection(refs.db, "auto_go_pools", poolId, "auditLogs"), {
            action: "dummy_inject",
            actorUid,
            poolId,
            ...row,
            createdAt: refs.serverTimestamp ? refs.serverTimestamp() : new Date()
          });
        }
      } catch (_) {}
    }
    return { ok: true, injected, results, via: "firestore" };
  }

  function shouldFallbackToFirestore(error) {
    const blob = (String(error?.code || "") + " " + String(error?.message || "")).toLowerCase();
    return /not-found|not_found|unimplemented|unavailable|internal|cors|failed to fetch|deadline|timeout|404|does not exist|not been deployed/.test(blob);
  }

  window.adminInjectAutoGoDummies = async function (poolId, count, fillToMin) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    if (!poolId) { toast("プールIDがありません", "error"); return; }
    toast(fillToMin ? "定員までダミー投入中…" : `ダミー ${count || 1}人 投入中…`, "info");
    const fn = agRefs().adminInjectAutoGoDummies;
    try {
      let data = null;
      // まず Callable（デプロイ済みなら）。失敗時は管理者の直接書き込みにフォールバック
      if (typeof fn === "function") {
        try {
          const res = await fn({ poolId, count: count || 1, fillToMin: !!fillToMin });
          data = res?.data || res || {};
          data.via = data.via || "functions";
        } catch (callErr) {
          console.warn("adminInjectAutoGoDummies callable failed, trying Firestore:", callErr);
          if (!shouldFallbackToFirestore(callErr)) {
            // テストプール以外などは直接メッセージ表示
            throw callErr;
          }
          data = await injectDummiesViaFirestore(poolId, count, fillToMin);
        }
      } else {
        data = await injectDummiesViaFirestore(poolId, count, fillToMin);
      }
      if (!data || !data.injected) {
        toast("ダミーを投入できませんでした（枠満員・ロック・テストプール以外の可能性）", "error");
      } else {
        toast(`ダミー投入完了: ${data.injected}人` + (data.via === "firestore" ? "（直接書込）" : ""), "success");
      }
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return data;
    } catch (error) {
      console.error(error);
      toast("ダミー投入失敗: " + callableErrorText(error), "error");
    }
  };

  window.adminResetAutoGoTestPool = async function (poolId) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const ok = await confirmTwice(
      "テスト用プールとダミー参加データを完全削除します。よろしいですか？",
      "削除する",
      "本当に完全リセットしますか？元に戻せません。",
      "完全削除する"
    );
    if (!ok) return;
    const fn = agRefs().adminResetAutoGoTestPool;
    if (typeof fn !== "function") {
      toast("リセットAPIの準備中です", "error");
      return;
    }
    try {
      await fn({ poolId });
      toast("テストデータを完全削除しました", "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      toast("リセット失敗: " + (error?.message || error), "error");
    }
  };

  window.adminSetAutoGoEntryLock = async function (poolId, locked) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const fn = agRefs().adminSetAutoGoEntryLock;
    if (typeof fn !== "function") {
      toast("ロックAPIの準備中です", "error");
      return;
    }
    const label = locked ? "新規エントリーを緊急停止しますか？" : "エントリーロックを解除しますか？";
    let agreed = true;
    if (locked) {
      if (typeof window.appConfirm === "function") {
        agreed = await window.appConfirm(label, "緊急停止する", true);
      } else {
        agreed = window.confirm(label);
      }
    }
    if (!agreed) return;
    try {
      await fn({ poolId, locked: !!locked });
      toast(locked ? "新規エントリーを停止しました" : "エントリーロックを解除しました", "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      toast("ロック操作失敗: " + (error?.message || error), "error");
    }
  };

  window.adminForceCancelAutoGoPool = async function (poolId) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const ok = await confirmTwice(
      "【危険】このプールを強制キャンセルし、全参加者をキャンセル状態にします。\n※Auto-GOは各自購入のため、サイト側の返金はありません。続けますか？",
      "強制キャンセルへ進む",
      "最終確認：FORCE_CANCEL を実行します。本当によろしいですか？",
      "実行する"
    );
    if (!ok) return;
    const fn = agRefs().adminForceCancelAutoGoPool;
    if (typeof fn !== "function") {
      toast("強制キャンセルAPIの準備中です", "error");
      return;
    }
    try {
      const res = await fn({
        poolId,
        confirmText: "FORCE_CANCEL",
        reason: "admin_emergency_failsafe"
      });
      const data = res?.data || res || {};
      toast(`強制キャンセル完了（${data.affected || 0}人をキャンセル）`, "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      toast("強制キャンセル失敗: " + (error?.message || error), "error");
    }
  };

  window.adminReassignAutoGoMember = async function (poolId, uid, newMember) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const member = String(newMember || "").trim();
    if (!member) {
      toast("メンバー名を指定してください", "error");
      return;
    }
    let agreed = true;
    if (typeof window.appConfirm === "function") {
      agreed = await window.appConfirm(`${uid} の希望枠を「${member}」に再割り当てしますか？`, "再割り当てする", true);
    } else {
      agreed = window.confirm("再割り当てしますか？");
    }
    if (!agreed) return;
    const fn = agRefs().adminReassignAutoGoMember;
    if (typeof fn !== "function") {
      toast("再割り当てAPIの準備中です", "error");
      return;
    }
    try {
      await fn({ poolId, uid, newMember: member, note: "admin_manual_reassign" });
      toast("再割り当てしました（監査ログ記録済）", "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      toast("再割り当て失敗: " + (error?.message || error), "error");
    }
  };

  window.adminShowAutoGoAudit = async function (poolId) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const panel = document.getElementById("adm-ag-audit-" + poolId);
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.innerHTML = '<p class="text-[11px] text-gray-500 p-2">監査ログを読み込み中…</p>';
    const fn = agRefs().adminGetAutoGoAuditLogs;
    if (typeof fn !== "function") {
      panel.innerHTML = '<p class="text-[11px] text-red-600 p-2">監査APIの準備中です（Functionsデプロイ後に利用可）</p>';
      return;
    }
    try {
      const res = await fn({ poolId, limit: 100 });
      const data = res?.data || res || {};
      const assignments = Array.isArray(data.assignments) ? data.assignments : [];
      const logs = Array.isArray(data.logs) ? data.logs : [];
      const assignRows = assignments.length
        ? assignments.map((a, i) => {
          const prefs = Array.isArray(a.preferenceOrder) ? a.preferenceOrder.join(" → ") : "";
          return `<tr class="border-t border-gray-100">
            <td class="py-1.5 pr-2 font-bold">${a.entrySeq || (i + 1)}</td>
            <td class="py-1.5 pr-2">${esc(a.userName || a.uid)}${a.isDummy ? ' <span class="text-amber-700">[D]</span>' : ""}</td>
            <td class="py-1.5 pr-2">${esc(a.wantedMember)}</td>
            <td class="py-1.5 pr-2">${a.assignedRank != null ? "第" + a.assignedRank + "希望" : "-"}</td>
            <td class="py-1.5 pr-2 text-[9px] text-gray-500">${esc(prefs)}</td>
            <td class="py-1.5">${esc(a.status)}</td>
          </tr>`;
        }).join("")
        : '<tr><td colspan="6" class="py-3 text-gray-400">割り当てデータなし</td></tr>';
      const logRows = logs.slice(0, 40).map((l) => {
        const when = l.createdAtMs ? new Date(l.createdAtMs).toLocaleString("ja-JP") : "-";
        return `<div class="text-[10px] border-t border-gray-100 py-1"><span class="font-bold text-gray-700">${esc(l.action)}</span> · ${esc(when)} · ${esc(l.uid || l.actorUid || "")} ${l.wantedMember ? "→ " + esc(l.wantedMember) : ""}</div>`;
      }).join("") || '<p class="text-[10px] text-gray-400 py-2">監査ログはまだありません</p>';
      panel.innerHTML = `
        <div class="space-y-3">
          <div>
            <p class="text-[11px] font-black text-gray-800 mb-1">割り当て結果（先着順）</p>
            <div class="overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table class="min-w-full text-[10px] text-left">
                <thead class="bg-gray-50 text-gray-600">
                  <tr>
                    <th class="py-1.5 px-2">#</th>
                    <th class="py-1.5 px-2">参加者</th>
                    <th class="py-1.5 px-2">確定枠</th>
                    <th class="py-1.5 px-2">希望順位</th>
                    <th class="py-1.5 px-2">希望一覧</th>
                    <th class="py-1.5 px-2">状態</th>
                  </tr>
                </thead>
                <tbody class="px-2">${assignRows}</tbody>
              </table>
            </div>
          </div>
          <div>
            <p class="text-[11px] font-black text-gray-800 mb-1">操作監査ログ</p>
            <div class="rounded-xl border border-gray-100 bg-white px-2.5 py-1 max-h-48 overflow-y-auto">${logRows}</div>
          </div>
          <button type="button" onclick="this.closest('[id^=adm-ag-audit-]').classList.add('hidden')" class="text-[11px] font-bold text-gray-600 underline">閉じる</button>
        </div>`;
    } catch (error) {
      console.error(error);
      panel.innerHTML = `<p class="text-[11px] text-red-600 p-2">読み込み失敗: ${esc(error?.message || error)}</p>`;
    }
  };

  window.adminPromptReassign = async function (poolId, uid, membersCsv) {
    const members = String(membersCsv || "").split("|").map((m) => m.trim()).filter(Boolean);
    if (!members.length) {
      toast("メンバー一覧がありません", "error");
      return;
    }
    const pick = window.prompt("再割り当て先メンバーを入力してください:\n" + members.join(" / "), members[0]);
    if (!pick) return;
    await window.adminReassignAutoGoMember(poolId, uid, pick.trim());
  };

  /** 1x1 PNG（本番と同じ購入証明保存経路用のダミー画像） */
  const DUMMY_PURCHASE_PROOF_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  function isDummyEntry(entry, uid) {
    return !!(entry && (entry.isDummy === true || String(uid || entry.uid || "").startsWith("dummy_")));
  }

  /** Functions未デプロイ時：管理者権限で購入報告を直接書き込み（フィールドは本番と同名） */
  async function simDummyPurchasesViaFirestore(poolId, mode) {
    const refs = agRefs();
    if (!refs.db || typeof refs.doc !== "function" || typeof refs.getDocs !== "function") {
      throw new Error("Firestoreの準備ができていません");
    }
    const poolRef = refs.doc(refs.db, "auto_go_pools", poolId);
    const poolSnap = await refs.getDoc(poolRef);
    if (!poolSnap.exists()) throw new Error("プールが見つかりません");
    const pool = poolSnap.data() || {};
    if (!isTestPoolData(pool)) throw new Error("テストプール（isTest / [TEST]）だけ実行できます");

    const entriesSnap = await refs.getDocs(refs.collection(refs.db, "auto_go_pools", poolId, "entries"));
    const candidates = entriesSnap.docs
      .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
      .filter((e) => isDummyEntry(e, e.uid) && e.status === "confirmed")
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

    const stamp = refs.serverTimestamp ? refs.serverTimestamp() : new Date();
    const results = [];
    for (const entry of targets) {
      const entryRef = refs.doc(refs.db, "auto_go_pools", poolId, "entries", entry.uid);
      const orderNote = "TEST-DUMMY-" + (entry.entrySeq || String(entry.uid).slice(-6));
      const patch = {
        status: "purchased",
        orderNote,
        purchasedAt: stamp,
        purchaseProofUrl: entry.purchaseProofUrl || DUMMY_PURCHASE_PROOF_DATA_URL,
        purchaseProofSavedAt: stamp,
        purchaseProofStorage: entry.purchaseProofStorage || "firestore"
      };
      await refs.updateDoc(entryRef, patch);
      results.push({ uid: entry.uid, orderNote, storage: patch.purchaseProofStorage });
    }
    return {
      ok: true,
      mode,
      reported: results.length,
      leftUnreported: leftUnreported.length,
      leftUnreportedUids: leftUnreported,
      results,
      via: "firestore"
    };
  }

  /** Functions未デプロイ時：ダミー受取完了を直接書き込み */
  async function simDummyReceiptsViaFirestore(poolId) {
    const refs = agRefs();
    if (!refs.db || typeof refs.doc !== "function" || typeof refs.getDocs !== "function") {
      throw new Error("Firestoreの準備ができていません");
    }
    const poolRef = refs.doc(refs.db, "auto_go_pools", poolId);
    const poolSnap = await refs.getDoc(poolRef);
    if (!poolSnap.exists()) throw new Error("プールが見つかりません");
    if (!isTestPoolData(poolSnap.data() || {})) throw new Error("テストプールだけ実行できます");

    const entriesSnap = await refs.getDocs(refs.collection(refs.db, "auto_go_pools", poolId, "entries"));
    const candidates = entriesSnap.docs
      .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
      .filter((e) => isDummyEntry(e, e.uid) && e.status === "matched" && e.receivedDone !== true)
      .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));
    const withIncoming = candidates.filter((e) => e.incomingShippedAt || e.incomingTrackingNumber);
    const targets = withIncoming.length ? withIncoming : candidates;
    const stamp = refs.serverTimestamp ? refs.serverTimestamp() : new Date();
    const results = [];
    for (const entry of targets) {
      const entryRef = refs.doc(refs.db, "auto_go_pools", poolId, "entries", entry.uid);
      await refs.updateDoc(entryRef, { receivedDone: true, receivedAt: stamp });
      results.push({ uid: entry.uid });
    }
    return {
      ok: true,
      received: results.length,
      preferredIncoming: withIncoming.length > 0,
      results,
      via: "firestore"
    };
  }

  window.adminSimAutoGoDummyPurchases = async function (poolId, mode) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    if (!poolId) { toast("プールIDがありません", "error"); return; }
    const m = ["all", "leave_one", "one"].includes(mode) ? mode : "all";
    const label = m === "leave_one"
      ? "ダミー購入報告（1人未報告を残す）"
      : m === "one"
        ? "ダミー購入報告（1人分）"
        : "ダミー一括購入報告";
    toast(label + "を実行中…", "info");
    const fn = agRefs().adminSimAutoGoDummyPurchases;
    try {
      let data = null;
      if (typeof fn === "function") {
        try {
          const res = await fn({ poolId, mode: m });
          data = res?.data || res || {};
          data.via = data.via || "functions";
        } catch (callErr) {
          console.warn("adminSimAutoGoDummyPurchases callable failed, trying Firestore:", callErr);
          if (!shouldFallbackToFirestore(callErr)) throw callErr;
          data = await simDummyPurchasesViaFirestore(poolId, m);
        }
      } else {
        data = await simDummyPurchasesViaFirestore(poolId, m);
      }
      const reported = Number(data?.reported || 0);
      const left = Number(data?.leftUnreported || 0);
      if (!reported && !left) {
        toast("対象の未報告ダミー（status=confirmed）がいません。枠確定後に実行してください", "error");
      } else {
        toast(
          `購入報告シミュ完了: ${reported}人報告` +
          (left ? ` / ${left}人未報告のまま` : "") +
          (data.via === "firestore" ? "（直接書込）" : ""),
          "success"
        );
      }
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return data;
    } catch (error) {
      console.error(error);
      toast("購入報告シミュ失敗: " + callableErrorText(error), "error");
    }
  };

  window.adminSimAutoGoDummyReceipts = async function (poolId) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    if (!poolId) { toast("プールIDがありません", "error"); return; }
    toast("ダミー一括受取確認を実行中…", "info");
    const fn = agRefs().adminSimAutoGoDummyReceipts;
    try {
      let data = null;
      if (typeof fn === "function") {
        try {
          const res = await fn({ poolId });
          data = res?.data || res || {};
          data.via = data.via || "functions";
        } catch (callErr) {
          console.warn("adminSimAutoGoDummyReceipts callable failed, trying Firestore:", callErr);
          if (!shouldFallbackToFirestore(callErr)) throw callErr;
          data = await simDummyReceiptsViaFirestore(poolId);
        }
      } else {
        data = await simDummyReceiptsViaFirestore(poolId);
      }
      const n = Number(data?.received || 0);
      if (!n) {
        toast("受取対象のダミー（matched・未受取）がいません。発送完了後に実行してください", "error");
      } else {
        toast(`受取確認シミュ完了: ${n}人` + (data.via === "firestore" ? "（直接書込）" : ""), "success");
      }
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return data;
    } catch (error) {
      console.error(error);
      toast("受取確認シミュ失敗: " + callableErrorText(error), "error");
    }
  };

  function poolMemberNames(pool) {
    if (Array.isArray(pool.members) && pool.members.length) return pool.members.slice();
    if (Array.isArray(pool.memberNames) && pool.memberNames.length) return pool.memberNames.slice();
    return [];
  }

  function pickDummyPulled(entry, members, index) {
    const wanted = entry.wantedMember;
    const others = members.filter((m) => m !== wanted);
    if (others.length) return others[index % others.length];
    return members[index % members.length] || wanted || "ユナ";
  }

  /** Functions未デプロイ時：到着・開封・カウントダウン開始を直接書込 */
  async function simDummyRevealPhaseViaFirestore(poolId, mode, shortCountdown) {
    const refs = agRefs();
    if (!refs.db || typeof refs.doc !== "function" || typeof refs.getDocs !== "function") {
      throw new Error("Firestoreの準備ができていません");
    }
    const poolRef = refs.doc(refs.db, "auto_go_pools", poolId);
    const poolSnap = await refs.getDoc(poolRef);
    if (!poolSnap.exists()) throw new Error("プールが見つかりません");
    const pool = poolSnap.data() || {};
    if (!isTestPoolData(pool)) throw new Error("テストプールだけ実行できます");
    const members = poolMemberNames(pool);
    if (!members.length) throw new Error("メンバー一覧がありません");

    const stamp = refs.serverTimestamp ? refs.serverTimestamp() : new Date();
    let arrived = 0;
    let revealed = 0;
    const results = [];

    if (mode === "arrive_all" || mode === "five_plus") {
      const entriesSnap = await refs.getDocs(refs.collection(refs.db, "auto_go_pools", poolId, "entries"));
      const targets = entriesSnap.docs
        .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
        .filter((e) => isDummyEntry(e, e.uid) && e.status === "purchased");
      for (const entry of targets) {
        await refs.updateDoc(refs.doc(refs.db, "auto_go_pools", poolId, "entries", entry.uid), {
          status: "arrived",
          albumReceivedAt: stamp
        });
        arrived += 1;
        results.push({ uid: entry.uid, step: "arrived" });
      }
    }

    if (mode === "reveal_all" || mode === "five_plus") {
      const fresh = await refs.getDocs(refs.collection(refs.db, "auto_go_pools", poolId, "entries"));
      const arrivedDummies = fresh.docs
        .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
        .filter((e) => isDummyEntry(e, e.uid) && e.status === "arrived")
        .sort((a, b) => (Number(a.entrySeq) || 0) - (Number(b.entrySeq) || 0));
      for (let i = 0; i < arrivedDummies.length; i += 1) {
        const entry = arrivedDummies[i];
        const pulled = pickDummyPulled(entry, members, i);
        await refs.updateDoc(refs.doc(refs.db, "auto_go_pools", poolId, "entries", entry.uid), {
          pulledMember: pulled,
          openedCard: pulled,
          status: pulled === entry.wantedMember ? "self_pulled" : "waiting_match",
          revealedAt: stamp
        });
        revealed += 1;
        results.push({ uid: entry.uid, step: "revealed", pulledMember: pulled });
      }
    }

    const after = await refs.getDocs(refs.collection(refs.db, "auto_go_pools", poolId, "entries"));
    const arrivalCount = after.docs.filter((d) => {
      const e = d.data() || {};
      return !!(e.albumReceivedAt || e.revealedAt);
    }).length;

    let countdown = { started: false, arrivalCount };
    const poolNowSnap = await refs.getDoc(poolRef);
    const poolNow = poolNowSnap.exists() ? (poolNowSnap.data() || {}) : {};
    if (arrivalCount < 5) {
      countdown = { started: false, reason: "need_five", arrivalCount, need: 5 - arrivalCount };
      if (mode === "five_plus") {
        throw new Error(`開封/到着が${arrivalCount}人です。あと${5 - arrivalCount}人必要です`);
      }
    } else if (!poolNow.revealDeadlineAt || shortCountdown) {
      const durationMs = shortCountdown ? 3 * 60 * 1000 : 4 * 24 * 60 * 60 * 1000;
      const deadlineDate = new Date(Date.now() + durationMs);
      await refs.updateDoc(poolRef, {
        revealOpenedAt: poolNow.revealOpenedAt || stamp,
        revealDeadlineAt: deadlineDate,
        recruitmentClosedAt: poolNow.recruitmentClosedAt || stamp,
        revealDeadlineTestShort: !!shortCountdown
      });
      countdown = {
        started: true,
        arrivalCount,
        revealDeadlineAtMs: deadlineDate.getTime(),
        durationMs,
        shortTest: !!shortCountdown
      };
    } else {
      const ms = poolNow.revealDeadlineAt && typeof poolNow.revealDeadlineAt.toMillis === "function"
        ? poolNow.revealDeadlineAt.toMillis()
        : Number(poolNow.revealDeadlineAt) || 0;
      countdown = { started: false, already: true, arrivalCount, revealDeadlineAtMs: ms };
    }

    return {
      ok: true,
      mode,
      arrived,
      revealed,
      shortCountdown: !!shortCountdown,
      countdown,
      results,
      via: "firestore"
    };
  }

  window.adminSimAutoGoDummyRevealPhase = async function (poolId, mode, shortCountdown) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    if (!poolId) { toast("プールIDがありません", "error"); return; }
    const m = ["arrive_all", "reveal_all", "five_plus"].includes(mode) ? mode : "five_plus";
    const short = shortCountdown === true;
    const label = m === "arrive_all"
      ? "ダミー一括到着報告"
      : m === "reveal_all"
        ? "ダミー一括開封報告"
        : (short ? "ダミー5人以上で開封カウント開始（短縮3分）" : "ダミー5人以上で開封カウント開始");
    toast(label + "を実行中…", "info");
    const fn = agRefs().adminSimAutoGoDummyRevealPhase;
    try {
      let data = null;
      if (typeof fn === "function") {
        try {
          const res = await fn({ poolId, mode: m, shortCountdown: short });
          data = res?.data || res || {};
          data.via = data.via || "functions";
        } catch (callErr) {
          console.warn("adminSimAutoGoDummyRevealPhase callable failed, trying Firestore:", callErr);
          if (!shouldFallbackToFirestore(callErr)) throw callErr;
          data = await simDummyRevealPhaseViaFirestore(poolId, m, short);
        }
      } else {
        data = await simDummyRevealPhaseViaFirestore(poolId, m, short);
      }
      const cd = data.countdown || {};
      const parts = [];
      if (data.arrived) parts.push(`到着${data.arrived}`);
      if (data.revealed) parts.push(`開封${data.revealed}`);
      if (cd.started) {
        const when = cd.revealDeadlineAtMs
          ? new Date(cd.revealDeadlineAtMs).toLocaleString("ja-JP")
          : "";
        parts.push(cd.shortTest ? `カウント開始（短縮・期限 ${when}）` : `カウント開始（期限 ${when}）`);
      } else if (cd.already) {
        parts.push("カウントは既に開始済み");
      }
      if (!parts.length) {
        toast("対象ダミーがありません（購入済み→到着→開封の順で進めてください）", "error");
      } else {
        toast(parts.join(" / ") + (data.via === "firestore" ? "（直接書込）" : ""), "success");
      }
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return data;
    } catch (error) {
      console.error(error);
      toast("開封フェーズシミュ失敗: " + callableErrorText(error), "error");
    }
  };

  /** 管理パネル用：プールカード下部のシミュレーション／フェイルセーフ HTML */
  window.__agAdminOpsHtml = function (pool) {
    if (!pool || !pool.id) return "";
    const id = esc(pool.id);
    const isTest = isTestPoolData(pool);
    const locked = pool.entryLocked === true;
    const members = (pool.memberNames || pool.members || []).join("|");
    const testBlock = isTest ? `
      <div class="mt-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/90 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-black text-amber-900">🧪 テストシミュレーション</p>
          <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">[TEST]</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" onclick="window.adminInjectAutoGoDummies('${id}',1,false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-950 active:scale-[0.99]">ダミー1人追加（ランダム希望）</button>
          <button type="button" onclick="window.adminInjectAutoGoDummies('${id}',5,false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-950">一括ダミー 5人</button>
          <button type="button" onclick="window.adminInjectAutoGoDummies('${id}',10,false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-950">一括ダミー 10人</button>
          <button type="button" onclick="window.adminInjectAutoGoDummies('${id}',20,false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-950">一括ダミー 20人</button>
          <button type="button" onclick="window.adminInjectAutoGoDummies('${id}',1,true)" class="min-h-[44px] px-3 py-2 rounded-xl bg-amber-600 text-white text-[11px] font-black sm:col-span-2">定員まで一括ダミー投入（自動成立テスト）</button>
          <button type="button" onclick="window.adminShowAutoGoAudit('${id}')" class="min-h-[44px] px-3 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold">割り当て結果の監査ログ表示</button>
          <button type="button" onclick="window.adminResetAutoGoTestPool('${id}')" class="min-h-[44px] px-3 py-2 rounded-xl bg-red-600 text-white text-[11px] font-bold">テストデータ完全リセット</button>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 space-y-2">
          <p class="text-[10px] font-black text-emerald-900">取引進行フェーズ（枠確定後）</p>
          <p class="text-[9px] text-emerald-800 leading-relaxed">本番と同じ購入証明保存→決済完了／受取完了の経路でダミーを進めます。本番プールには表示されません。</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onclick="window.adminSimAutoGoDummyPurchases('${id}','all')" class="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black sm:col-span-2">ダミー一括購入報告（アズカリ決済完了シミュレーション）</button>
            <button type="button" onclick="window.adminSimAutoGoDummyPurchases('${id}','leave_one')" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-emerald-400 text-[11px] font-bold text-emerald-950">ダミー購入報告（1人分・1人未報告を残す）</button>
            <button type="button" onclick="window.adminSimAutoGoDummyReceipts('${id}')" class="min-h-[44px] px-3 py-2 rounded-xl bg-teal-700 text-white text-[11px] font-black">ダミー一括受取確認（取引完了シミュレーション）</button>
          </div>
        </div>
        <div class="rounded-xl border border-sky-200 bg-sky-50/90 p-2.5 space-y-2">
          <p class="text-[10px] font-black text-sky-900">開封報告 → カウントダウン（5人以上）</p>
          <p class="text-[9px] text-sky-800 leading-relaxed">本番は到着/開封が5人以上で開封登録期間（約4日）が始まります。短縮3分はTEST用の動作確認用です。</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onclick="window.adminSimAutoGoDummyRevealPhase('${id}','arrive_all',false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-sky-300 text-[11px] font-bold text-sky-950">ダミー一括到着報告</button>
            <button type="button" onclick="window.adminSimAutoGoDummyRevealPhase('${id}','reveal_all',false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-sky-300 text-[11px] font-bold text-sky-950">ダミー一括開封報告（トレカ）</button>
            <button type="button" onclick="window.adminSimAutoGoDummyRevealPhase('${id}','five_plus',false)" class="min-h-[44px] px-3 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-black sm:col-span-2">ダミー5人以上で開封期間カウント開始（本番相当・約4日）</button>
            <button type="button" onclick="window.adminSimAutoGoDummyRevealPhase('${id}','five_plus',true)" class="min-h-[44px] px-3 py-2 rounded-xl bg-indigo-700 text-white text-[11px] font-black sm:col-span-2">同上（短縮カウント3分・動作確認用）</button>
          </div>
        </div>
        <div id="adm-ag-audit-${id}" class="hidden"></div>
      </div>` : "";

    const failsafe = `
      <div class="mt-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-3 space-y-2">
        <p class="text-[11px] font-black text-rose-900">🚨 緊急フェイルセーフ</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" onclick="window.adminSetAutoGoEntryLock('${id}', ${locked ? "false" : "true"})" class="min-h-[44px] px-3 py-2 rounded-xl text-[11px] font-bold ${locked ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}">
            ${locked ? "エントリーロック解除" : "新規エントリー緊急停止"}
          </button>
          <button type="button" onclick="window.adminForceCancelAutoGoPool('${id}')" class="min-h-[44px] px-3 py-2 rounded-xl bg-black text-white text-[11px] font-bold">プール強制キャンセル</button>
        </div>
        <p class="text-[9px] text-rose-800 leading-relaxed">2段階確認あり。参加者を一括キャンセルし監査ログを残します。各自購入のためサイト側の返金はありません（購入済みの方はショップ側のキャンセル・返品案内を通知）。</p>
      </div>`;

    const reassignHint = (pool.entries || []).filter((e) => e && e.uid && !["cancelled", "unshipped_penalty"].includes(e.status)).slice(0, 8).map((e) => {
      return `<button type="button" onclick="window.adminPromptReassign('${id}','${esc(e.uid)}','${esc(members)}')" class="text-[10px] font-bold text-indigo-700 underline mr-2 mb-1">再割当:${esc(e.userName || e.uid.slice(0, 6))}(${esc(e.wantedMember || "")})</button>`;
    }).join("");

    return `${testBlock}${failsafe}
      <div class="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-2.5">
        <p class="text-[10px] font-black text-indigo-900 mb-1">手動再割り当て（監査ログ付き）</p>
        <div class="flex flex-wrap">${reassignHint || '<span class="text-[10px] text-gray-400">対象参加者なし</span>'}</div>
      </div>`;
  };
})();
