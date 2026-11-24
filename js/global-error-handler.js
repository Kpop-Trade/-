window.addEventListener("error", function(event) {
  console.error("Global Error:", event.error);
  const container = document.getElementById("posts-container") || document.body;
  const errDiv = document.createElement("div");
  errDiv.className = "p-4 m-4 bg-red-100 text-red-700 text-xs rounded-xl border border-red-300";
  errDiv.innerHTML = "<b>⚠️ 画面エラー発生:</b> " + (event.message || event.error) + 
    "<br><span class='text-[10px]'>" + 
    (event.filename ? event.filename.split("/").pop() + ":" + event.lineno : "") + 
    "</span>";
  if (location.search.includes("debug=1")) container.prepend(errDiv);
});

window.addEventListener("unhandledrejection", function(event) {
  console.error("Unhandled Promise Rejection:", event.reason);
  const container = document.getElementById("posts-container") || document.body;
  const errDiv = document.createElement("div");
  errDiv.className = "p-4 m-4 bg-orange-100 text-orange-700 text-xs rounded-xl border border-orange-300";
  errDiv.innerHTML = "<b>⚠️ 非同期処理エラー:</b> " + 
    (event.reason && event.reason.message ? event.reason.message : event.reason);
  if (location.search.includes("debug=1")) container.prepend(errDiv);
});

(function() {
  const MAX_PULL = 118;
  const THRESHOLD = 62;
  const HOLD = 54;
  const gap = document.getElementById("pull-gap");
  const spinWrap = gap && gap.querySelector(".pull-spin-wrap");
  let startY = 0, pulling = false, armed = false, pullH = 0, busy = false;

  function rubber(raw) {
    if (raw <= 0) return 0;
    return MAX_PULL * (1 - Math.exp(-raw / MAX_PULL));
  }
  function scrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  function setDragging(on) {
    if (!gap) return;
    gap.classList.toggle("is-dragging", !!on);
  }
  function setGap(h) {
    if (!gap) return;
    pullH = Math.max(0, h);
    gap.style.height = pullH + "px";
    const progress = Math.min(1, pullH / THRESHOLD);
    if (spinWrap && !busy) {
      spinWrap.style.opacity = String(progress);
      spinWrap.style.transform = "scale(" + (0.55 + progress * 0.45) + ")";
    }
    gap.classList.toggle("is-refreshing", !!busy);
    gap.setAttribute("aria-hidden", pullH < 1 && !busy ? "true" : "false");
  }
  function settleTo(h) {
    setDragging(false);
    // 次フレームで transition を効かせて閉じる／ホールドする
    requestAnimationFrame(function() { setGap(h); });
  }
  function onHome() {
    const hub = document.getElementById("gllit-hub");
    return !!(hub && !hub.classList.contains("hidden"));
  }
  function modalOpen() {
    return !!document.querySelector("#detail-modal:not(.hidden), .modal-backdrop:not(.hidden)");
  }

  document.addEventListener("touchstart", function(e) {
    if (!onHome() || modalOpen() || busy || scrollY() > 1 || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    pulling = true;
    armed = false;
  }, { passive: true });

  document.addEventListener("touchmove", function(e) {
    if (!pulling || busy) return;
    if (scrollY() > 1) {
      pulling = false;
      armed = false;
      settleTo(0);
      return;
    }
    const dy = Math.max(0, e.touches[0].clientY - startY);
    if (dy < 8) return;
    if (!armed) {
      armed = true;
      setDragging(true);
    }
    e.preventDefault();
    setGap(rubber(dy));
  }, { passive: false });

  async function endPull() {
    if (!pulling) return;
    pulling = false;
    const shouldRefresh = armed && pullH >= THRESHOLD;
    armed = false;
    if (!shouldRefresh) {
      settleTo(0);
      return;
    }
    busy = true;
    if (spinWrap) {
      spinWrap.style.opacity = "1";
      spinWrap.style.transform = "scale(1)";
    }
    settleTo(HOLD);
    try {
      if (typeof refreshPosts === "function") await refreshPosts();
    } finally {
      await new Promise(function(r) { setTimeout(r, 160); });
      busy = false;
      settleTo(0);
    }
  }

  document.addEventListener("touchend", endPull);
  document.addEventListener("touchcancel", function() {
    if (busy) return;
    pulling = false;
    armed = false;
    settleTo(0);
  });
})();
