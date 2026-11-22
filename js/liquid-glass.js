/**
 * Liquid Glass — lightweight interactions (Safari-safe)
 * - Header scroll glass
 * - Touch specular + spring press
 * - Filter / segment pill highlight capsule
 * Does not alter DOM IDs or existing click handlers.
 */
(function () {
  "use strict";

  var SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  var PRESS_SEL =
    "#sell-fab, .lg-press, button.liquid-glass, button.liquid-glass-heavy, button.liquid-glass-input, #login-btn, .filter-chip, body > nav button, #detail-actions button";

  /* ---------- Header scroll ---------- */
  function initHeader() {
    var header = document.querySelector("header.liquid-glass, header.lg-header");
    if (!header) return;
    header.classList.add("lg-header");
    var ticking = false;
    function update() {
      ticking = false;
      header.classList.toggle("lg-scrolled", (window.scrollY || 0) > 6);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  /* ---------- Specular + spring press ---------- */
  function ensureWave(el) {
    if (el.querySelector(":scope > .lg-specular-wave")) return;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    var wave = document.createElement("span");
    wave.className = "lg-specular-wave";
    wave.setAttribute("aria-hidden", "true");
    el.appendChild(wave);
  }

  function setSpecularPoint(el, clientX, clientY) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var x = ((clientX - r.left) / r.width) * 100;
    var y = ((clientY - r.top) / r.height) * 100;
    el.style.setProperty("--lg-x", x.toFixed(2) + "%");
    el.style.setProperty("--lg-y", y.toFixed(2) + "%");
  }

  function pressIn(el, clientX, clientY) {
    ensureWave(el);
    setSpecularPoint(el, clientX, clientY);
    el.classList.add("lg-pressing", "is-pressing");
    el.classList.remove("lg-bounce");
  }

  function pressOut(el) {
    if (!el) return;
    el.classList.remove("lg-pressing", "is-pressing");
    el.classList.remove("lg-bounce");
    void el.offsetWidth;
    el.classList.add("lg-bounce");
    window.setTimeout(function () {
      el.classList.remove("lg-bounce");
    }, 480);
  }

  function initPress() {
    var active = null;

    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button != null && e.button !== 0) return;
        var el = e.target && e.target.closest ? e.target.closest(PRESS_SEL) : null;
        if (!el) return;
        /* skip disabled / hidden */
        if (el.disabled || el.getAttribute("aria-disabled") === "true") return;
        active = el;
        pressIn(el, e.clientX, e.clientY);
      },
      { passive: true }
    );

    function end() {
      if (!active) return;
      pressOut(active);
      active = null;
    }

    document.addEventListener("pointerup", end, { passive: true });
    document.addEventListener("pointercancel", end, { passive: true });
    document.addEventListener(
      "pointermove",
      function (e) {
        if (!active) return;
        setSpecularPoint(active, e.clientX, e.clientY);
      },
      { passive: true }
    );
  }

  /* ---------- Pill track highlight ---------- */
  function ensurePillGlass(track) {
    var g = track.querySelector(":scope > .lg-pill-glass");
    if (g) return g;
    g = document.createElement("span");
    g.className = "lg-pill-glass";
    g.setAttribute("aria-hidden", "true");
    track.insertBefore(g, track.firstChild);
    return g;
  }

  function activePill(track) {
    var buttons = track.querySelectorAll("button, .filter-chip");
    var i;
    for (i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (
        b.classList.contains("bg-illit-purple") ||
        b.classList.contains("bg-teal-500") ||
        b.classList.contains("bg-white") ||
        b.classList.contains("text-white") ||
        b.className.indexOf("from-illit-purple") >= 0 ||
        b.className.indexOf("bg-gradient") >= 0
      ) {
        /* prefer clearly selected chips */
        if (
          b.classList.contains("text-white") ||
          b.classList.contains("bg-illit-purple") ||
          b.classList.contains("bg-teal-500") ||
          b.className.indexOf("from-illit-purple") >= 0 ||
          (b.id && b.id.indexOf("mycards-tab") === 0 && b.classList.contains("bg-white"))
        ) {
          return b;
        }
      }
    }
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].classList.contains("bg-white") && buttons[i].classList.contains("text-gray-900")) {
        return buttons[i];
      }
    }
    return buttons[0] || null;
  }

  function syncPill(track) {
    var btn = activePill(track);
    var glass = ensurePillGlass(track);
    if (!btn) {
      glass.classList.remove("is-on");
      return;
    }
    var tr = track.getBoundingClientRect();
    var br = btn.getBoundingClientRect();
    if (!tr.width) return;
    var left = br.left - tr.left + track.scrollLeft;
    glass.style.width = Math.max(24, br.width) + "px";
    glass.style.height = Math.max(24, br.height) + "px";
    glass.style.top = br.top - tr.top + track.scrollTop + "px";
    glass.style.transform = "translate3d(" + left + "px,0,0)";
    glass.style.transition =
      "transform 0.42s " + SPRING + ", width 0.42s " + SPRING + ", top 0.42s " + SPRING + ", opacity 0.2s ease";
    glass.classList.add("is-on");
  }

  function initPillTracks() {
    var ids = ["kind-filters", "member-filters", "bundle-filters"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("lg-pill-track");
    });

    var mySeg = document.querySelector("#mycards-section .grid.grid-cols-2.gap-1");
    if (mySeg) {
      mySeg.classList.add("lg-pill-track", "lg-segment");
    }

    function syncAll() {
      document.querySelectorAll(".lg-pill-track").forEach(syncPill);
    }

    document.addEventListener(
      "click",
      function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(syncAll);
        });
      },
      true
    );

    var mo = new MutationObserver(function () {
      requestAnimationFrame(syncAll);
    });
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    });
    if (mySeg) mo.observe(mySeg, { attributes: true, subtree: true, attributeFilter: ["class"] });

    window.addEventListener("resize", syncAll);
    window.syncLiquidGlassPills = syncAll;
    setTimeout(syncAll, 0);
    setTimeout(syncAll, 400);
  }

  /* ---------- Nav glass spring (enhance existing #nav-glass) ---------- */
  function enhanceNavGlass() {
    var glass = document.getElementById("nav-glass");
    var nav = document.querySelector("body > nav");
    if (!nav) return;
    nav.classList.add("lg-nav");
    if (!glass) return;
    glass.style.transition =
      "transform 0.42s " + SPRING + ", width 0.42s " + SPRING;
  }

  /* ---------- Mark search ---------- */
  function initSearch() {
    var main = document.getElementById("main-search-input");
    if (main) main.classList.add("lg-search");
    var fab = document.getElementById("sell-fab");
    if (fab) fab.classList.add("lg-fab", "lg-press");
    var badge = document.getElementById("ag-status-badge");
    if (badge) badge.classList.add("lg-badge");
  }

  function boot() {
    initHeader();
    initPress();
    initPillTracks();
    enhanceNavGlass();
    initSearch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
