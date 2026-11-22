(function() {
  setInterval(async function() {
    const countdownEl = document.getElementById("ag-purchase-countdown");
    if (!countdownEl) return;

    const entry = window.__agCurrentEntryData;
    if (!entry || entry.status !== "confirmed" || !entry.purchaseDeadlineAt) return;
    const deadline = entry.purchaseDeadlineAt.toMillis
      ? entry.purchaseDeadlineAt.toMillis()
      : Number(entry.purchaseDeadlineAt);
    const remain = deadline - Date.now();
    const activeBox = document.getElementById("ag-purchase-active-actions");
    const expiredBox = document.getElementById("ag-purchase-expired-msg");

    if (remain <= 0) {
      countdownEl.textContent = "00:00:00（期限切れ）";
      if (activeBox) activeBox.classList.add("hidden");
      if (expiredBox) expiredBox.classList.remove("hidden");
    } else {
      const totalSec = Math.floor(remain / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      const s = String(totalSec % 60).padStart(2, "0");
      countdownEl.textContent = `残り ${h}:${m}:${s}`;
      if (activeBox) activeBox.classList.remove("hidden");
      if (expiredBox) expiredBox.classList.add("hidden");
    }
  }, 1000);
})();


window.renderRoomTaskBanner = function() {
  const el = document.getElementById("room-task-banner");
  if (!el || !currentTrade || !currentUser) return;
  const uid = currentUser.uid;
  const t = currentTrade;
  const isOwner = t.ownerId === uid;
  const isSell = !!t.isSell;
  const isBundle = !!t.isBundle || (Array.isArray(t.bundleIndexes) && t.bundleIndexes.length > 0);
  const isStandardExchange = !isSell && !isBundle && t.kind !== "group";
  const agreed = t.agreed || {};
  const shipped = t.shipped || {};
  const received = t.received || {};
  const cancelled = t.status === "cancelled" || t.status === "canceled";
  const done = t.status === "done" || t.status === "completed";

  let title = "";
  let desc = "";
  let badge = "あなたのタスク";
  let tone = "bg-purple-50 border-purple-300 text-purple-900";

  if (cancelled) {
    badge = "取引終了";
    title = "この取引はキャンセルされました";
    desc = "新たな操作は不要です。";
    tone = "bg-gray-100 border-gray-300 text-gray-700";
  } else if (done || (isSell ? received[t.applicantId] : (received[t.ownerId] && received[t.applicantId]))) {
    badge = "完了";
    title = "🎉 すべての取引タスクが完了しました！";
    desc = "お疲れさまでした。必要に応じて相手の評価を行ってください。";
    tone = "bg-emerald-50 border-emerald-300 text-emerald-900";
  } else if (isStandardExchange && t.status === "negotiating") {
    if (isOwner) {
      badge = "要対応";
      title = "交換条件を確認して合意してください";
      desc = "申込者の差し出しトレカ画像を確認し、この条件で進めるか選択してください。";
      tone = "bg-amber-50 border-amber-400 text-amber-950";
    } else {
      badge = "相手待ち";
      title = "出品者の合意を待っています";
      desc = "出品者が合意すると発送フェーズへ進みます。";
      tone = "bg-blue-50 border-blue-200 text-blue-900";
    }
  } else if (t.status === "negotiating" || (!agreed[t.ownerId] || !agreed[t.applicantId])) {
    if (!agreed[uid]) {
      badge = "要対応";
      title = "① 取引条件を確認して「合意する」を押してください";
      desc = "チャットで条件・梱包方法などを確認し、問題なければ合意ボタンを押して次のステップへ進みます。";
      tone = "bg-amber-50 border-amber-400 text-amber-950";
    } else {
      badge = "相手待ち";
      title = "相手の「合意」を待っています";
      desc = "あなたは合意済みです。相手が合意ボタンを押すと決済・発送フェーズへ進みます。";
      tone = "bg-blue-50 border-blue-200 text-blue-900";
    }
  } else if (isSell) {
    if (isOwner) {
      if (!shipped[uid]) {
        badge = "要対応";
        title = "② アズカリの入金を確認し、匿名配送で発送してください";
        desc = "購入者がアズカリに住所入力・お支払いを完了したら、アズカリの匿名配送で発送し「発送完了」ボタンを押してください。";
        tone = "bg-amber-50 border-amber-400 text-amber-950";
      } else if (!received[t.applicantId]) {
        badge = "相手待ち";
        title = "購入者の「受取確認」を待っています";
        desc = "匿名配送での発送完了済みです。購入者に届き、アズカリと当サイトの受取完了が押されると取引終了です。";
        tone = "bg-blue-50 border-blue-200 text-blue-900";
      }
    } else {
      if (!shipped[t.ownerId]) {
        badge = "要対応";
        title = "② アズカリに配送先住所を入力し、お支払いを完了してください";
        desc = "アズカリに住所を登録して決済すると、匿名配送で発送されます。決済後に出品者からの発送通知をお待ちください。";
        tone = "bg-amber-50 border-amber-400 text-amber-950";
      } else if (!received[uid]) {
        badge = "要対応";
        title = "③ 商品が届いたら中身を確認し「受取完了」を押してください";
        desc = "匿名配送で届いた商品を確認し、アズカリの受取評価とあわせて当サイトの「受取完了」ボタンを押してください。";
        tone = "bg-emerald-50 border-emerald-400 text-emerald-950";
      }
    }
  } else {
    if (!shipped[uid]) {
      badge = "要対応";
      title = "② 相手の住所を確認し、トレカを梱包・発送してください";
      desc = "スリーブ・硬質ケース等で梱包して発送し、「発送完了」ボタンを押してください。";
      tone = "bg-amber-50 border-amber-400 text-amber-950";
    } else if (!received[uid]) {
      badge = "要対応";
      title = "③ 相手からのトレカが届いたら「受取完了」を押してください";
      desc = shipped[isOwner ? t.applicantId : t.ownerId]
        ? "相手は発送済みです。到着したら中身を確認して受取完了を押してください。"
        : "あなたは発送済みです。相手の発送と到着をお待ちください。";
      tone = "bg-emerald-50 border-emerald-400 text-emerald-950";
    } else {
      badge = "相手待ち";
      title = "相手の「受取確認」を待っています";
      desc = "あなたの発送・受取は完了しています。相手が受取完了を押すと取引終了です。";
      tone = "bg-blue-50 border-blue-200 text-blue-900";
    }
  }

  el.innerHTML = `<div class="border rounded-xl p-2.5 shadow-sm ${tone}">
    <div class="flex items-center gap-1.5 mb-0.5">
      <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 border border-current">${badge}</span>
      <span class="text-xs font-extrabold">${title}</span>
    </div>
    <p class="text-[11px] opacity-90 leading-snug pl-0.5">${desc}</p>
  </div>`;
};



// === 出品・購入申請後のプッシュ通知オン誘導モーダル（強制ブロックなし） ===
window.promptTradePushNudge = function(contextLabel) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") return;
    const lastAsk = Number(localStorage.getItem("kt_push_nudge_ts") || 0);
    if (Date.now() - lastAsk < 6 * 3600 * 1000) return; // 6時間以内の連続表示を抑制
    localStorage.setItem("kt_push_nudge_ts", String(Date.now()));

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    let old = document.getElementById("kt-push-nudge-modal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "kt-push-nudge-modal";
    modal.className = "fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-purple-100">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔔</span>
          <h3 class="text-sm font-extrabold text-gray-900">${contextLabel || "取引"}の通知をオンにしますか？</h3>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed">
          購入申請・アズカリの決済完了・発送催促などをリアルタイムで受け取れます（通知オフでも取引自体はそのまま進められます）。
        </p>
        ${(isIOS && !isStandalone) ? `
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-[11px] text-purple-900 space-y-1">
            <div class="font-bold">📱 iPhoneでプッシュ通知を受け取る手順</div>
            <div>画面下の <strong>共有ボタン（□↑）</strong> → <strong>「ホーム画面に追加」</strong> から開くと通知をオンにできます。</div>
          </div>
        ` : ""}
        <div class="flex gap-2 pt-1">
          <button type="button" onclick="document.getElementById('kt-push-nudge-modal')?.remove()" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">あとで</button>
          <button type="button" id="kt-push-nudge-ok" class="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow">通知をオンにする</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("kt-push-nudge-ok").onclick = async function() {
      modal.remove();
      if (typeof enablePush === "function") {
        await enablePush();
      } else if (typeof Notification !== "undefined" && Notification.requestPermission) {
        await Notification.requestPermission();
      }
    };
  } catch (e) { console.warn(e); }
};

// 出品完了・購入/交換申請の通知トースト表示時に自動で通知誘導をフック
(function() {
  const origShowToast = window.showToast;
  if (typeof origShowToast === "function" && !window.__pushNudgeHooked) {
    window.__pushNudgeHooked = true;
    window.showToast = function(msg, type) {
      origShowToast.apply(this, arguments);
      const s = String(msg || "");
      if (s.includes("出品しました") || s.includes("投稿しました")) {
        setTimeout(() => window.promptTradePushNudge("出品後"), 600);
      } else if (s.includes("取引ルームを作成") || s.includes("申請しました") || s.includes("申し込みました")) {
        setTimeout(() => window.promptTradePushNudge("取引中"), 600);
      }
    };
  }
})();

