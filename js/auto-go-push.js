(function() {
  function agLocalPushToken() {
    try {
      const uid = (window.currentUser && window.currentUser.uid) ||
        (window.__autoGoRefs && window.__autoGoRefs.auth && window.__autoGoRefs.auth.currentUser && window.__autoGoRefs.auth.currentUser.uid) || "";
      if (!uid) return "";
      return String(localStorage.getItem("illit_push_" + uid) || "").trim();
    } catch (e) {}
    return "";
  }

  window.isAutoGoPushReady = function() {
    const granted = (typeof Notification !== "undefined" && Notification.permission === "granted");
    if (!granted) return false;
    if (agLocalPushToken()) return true;
    try {
      const ud = window.userData || {};
      if (String(ud.fcmToken || "").trim()) return true;
    } catch (e) {}
    return false;
  };

  window.syncAutoGoPushBanner = function() {
    const box = document.getElementById("ag-push-req-box");
    const offView = document.getElementById("ag-push-off-view");
    const onView = document.getElementById("ag-push-on-view");
    if (!box || !offView || !onView) return;
    const ready = window.isAutoGoPushReady();
    const grantedOnly = (typeof Notification !== "undefined" && Notification.permission === "granted");
    if (ready) {
      box.className = "mb-3 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 transition";
      offView.classList.add("hidden");
      onView.classList.remove("hidden");
      const onText = onView.querySelector("p");
      if (onText) onText.textContent = "通知ON";
    } else if (grantedOnly) {
      // 権限はあるがトークン未保存 → 「もう一度オン」ではなく準備中扱い
      box.className = "mb-3 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 transition";
      offView.classList.add("hidden");
      onView.classList.remove("hidden");
      const onText = onView.querySelector("p");
      if (onText) onText.textContent = "通知準備中（予約時に自動完了します）";
    } else {
      box.className = "mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm transition";
      offView.classList.remove("hidden");
      onView.classList.add("hidden");
    }
  };

  window.ensureAutoGoPushReady = async function() {
    if (window.isAutoGoPushReady()) {
      window.syncAutoGoPushBanner();
      return true;
    }
    try {
      if (typeof enablePush === "function") {
        await enablePush();
      } else if (typeof window.enablePush === "function") {
        await window.enablePush();
      } else if (typeof Notification !== "undefined" && Notification.requestPermission) {
        await Notification.requestPermission();
      }
      // 権限だけ付いてトークン未保存のとき、もう一度保存を試す
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && !agLocalPushToken()) {
        if (typeof enablePush === "function") await enablePush();
        else if (typeof window.enablePush === "function") await window.enablePush();
      }
    } catch (e) {
      console.error("ensureAutoGoPushReady error:", e);
    }
    window.syncAutoGoPushBanner();
    return window.isAutoGoPushReady() ||
      (typeof Notification !== "undefined" && Notification.permission === "granted" && !!agLocalPushToken());
  };

  window.requestAutoGoPushPermission = async function() {
    const ok = await window.ensureAutoGoPushReady();
    if (!ok && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      if (typeof showToast === "function") {
        showToast("ブラウザまたは端末の設定から通知を許可してください（iPhoneはホーム画面に追加後に通知ONできます）", "error");
      }
    } else if (ok && typeof showToast === "function") {
      showToast("通知の準備ができました", "success");
    }
  };

  // Auto-GOモーダルが開かれたタイミングでバナー状態を最新化
  document.addEventListener("click", function(e) {
    if (e.target && e.target.closest && e.target.closest('[onclick*="openAutoGoModal"]')) {
      setTimeout(window.syncAutoGoPushBanner, 50);
    }
  });
  window.addEventListener("DOMContentLoaded", function() {
    setTimeout(window.syncAutoGoPushBanner, 500);
  });
})();
