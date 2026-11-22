(function () {
  const nav = document.querySelector("body > nav");
  const glass = document.getElementById("nav-glass");
  if (!nav || !glass) return;
  const buttons = Array.from(nav.querySelectorAll("button"));
  function activeBtn() {
    return buttons.find(function (b) { return b.classList.contains("bg-white/70"); }) || buttons[0];
  }
  function sync(opts) {
    const btn = activeBtn();
    if (!btn) return;
    const nr = nav.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const stretch = opts && opts.stretch;
    glass.style.transition = stretch
      ? "transform .42s cubic-bezier(.34,1.56,.64,1), width .42s cubic-bezier(.34,1.56,.64,1)"
      : "transform .38s cubic-bezier(.2,.8,.2,1), width .38s cubic-bezier(.2,.8,.2,1)";
    glass.style.width = (stretch ? br.width * 1.12 : br.width) + "px";
    glass.style.transform = "translate3d(" + (br.left - nr.left - (stretch ? br.width * 0.06 : 0)) + "px,0,0)";
    if (stretch) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          glass.style.width = br.width + "px";
          glass.style.transform = "translate3d(" + (br.left - nr.left) + "px,0,0)";
        });
      });
    }
  }
  window.syncNavGlass = function () { requestAnimationFrame(function () { sync({ stretch: true }); }); };
  nav.addEventListener("click", function () { setTimeout(function () { sync({ stretch: true }); }, 0); });
  window.addEventListener("resize", function () { sync(); });
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

// ポイント・抽選UI
(function () {
  if (document.querySelector('script[src*="points-raffle.js"]')) return;
  var s = document.createElement("script");
  s.src = "./js/points-raffle.js?v=20261122pt13";
  s.defer = true;
  document.head.appendChild(s);
})();
