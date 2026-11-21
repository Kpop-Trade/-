(function () {
  const nav = document.querySelector("body > nav");
  const glass = document.getElementById("nav-glass");
  if (!nav || !glass) return;
  const buttons = Array.from(nav.querySelectorAll("button"));
  function activeBtn() {
    return buttons.find(function (b) { return b.classList.contains("bg-white/70"); }) || buttons[0];
  }
  function sync() {
    const btn = activeBtn();
    if (!btn) return;
    const nr = nav.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    glass.style.width = br.width + "px";
    glass.style.transform = "translate3d(" + (br.left - nr.left) + "px,0,0)";
  }
  window.syncNavGlass = function () { requestAnimationFrame(sync); };
  nav.addEventListener("click", function () { setTimeout(sync, 0); });
  window.addEventListener("resize", sync);
  sync();
})();
(function () {
  const modal = document.getElementById("detail-modal");
  const sheet = modal && modal.firstElementChild;
  if (!modal || !sheet) return;
  let sx = 0, sy = 0, dx = 0, tracking = false;
  modal.addEventListener("touchstart", function (e) {
    if (modal.classList.contains("hidden") || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > 28) return;
    sx = t.clientX;
    sy = t.clientY;
    dx = 0;
    tracking = true;
    sheet.style.transition = "none";
  }, { passive: true });
  modal.addEventListener("touchmove", function (e) {
    if (!tracking || !e.touches) return;
    const t = e.touches[0];
    dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (dy * dy > dx * dx && Math.abs(dy) > 14) {
      tracking = false;
      sheet.style.transform = "";
      return;
    }
    if (dx > 0) {
      sheet.style.transform = "translate3d(" + dx + "px,0,0)";
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  function end() {
    if (!tracking) return;
    tracking = false;
    sheet.style.transition = "transform .22s ease";
    if (dx > 72) {
      sheet.style.transform = "translate3d(100%,0,0)";
      setTimeout(function () {
        sheet.style.transition = "none";
        sheet.style.transform = "";
        if (typeof closeDetailModal === "function") closeDetailModal();
      }, 200);
    } else {
      sheet.style.transform = "";
      setTimeout(function () { sheet.style.transition = ""; }, 220);
    }
    dx = 0;
  }
  modal.addEventListener("touchend", end);
  modal.addEventListener("touchcancel", end);
})();
