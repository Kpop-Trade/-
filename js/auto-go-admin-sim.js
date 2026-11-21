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

  window.adminInjectAutoGoDummies = async function (poolId, count, fillToMin) {
    if (!isAgAdmin()) { toast("管理者権限が必要です", "error"); return; }
    const fn = agRefs().adminInjectAutoGoDummies;
    if (typeof fn !== "function") {
      toast("シミュレーションAPIの準備中です（Functionsデプロイ後に利用可）", "error");
      return;
    }
    try {
      toast(fillToMin ? "定員までダミー投入中…" : `ダミー ${count}人 投入中…`, "info");
      const res = await fn({ poolId, count: count || 1, fillToMin: !!fillToMin });
      const data = res?.data || res || {};
      toast(`ダミー投入完了: ${data.injected || 0}人`, "success");
      if (typeof window.renderAdminAutoGoPanel === "function") await window.renderAdminAutoGoPanel();
      return data;
    } catch (error) {
      console.error(error);
      toast("ダミー投入失敗: " + (error?.message || error), "error");
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

  /** 管理パネル用：プールカード下部のシミュレーション／フェイルセーフ HTML */
  window.__agAdminOpsHtml = function (pool) {
    if (!pool || !pool.id) return "";
    const id = esc(pool.id);
    const isTest = pool.isTest === true;
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
