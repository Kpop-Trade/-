/**
 * トップページ最上部：募集中 Auto-GO ヒーローバナー
 * （未ログイン閲覧可・先着枠／締切カウントダウン／カルーセル）
 */
(function () {
  const PENDING_KEY = "ag_pending_pool_after_login";
  const PENDING_TAB_KEY = "ag_pending_tab_autogo";
  let heroIndex = 0;
  let countdownTimer = null;
  let lastPoolIds = "";

  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function isAdmin() {
    return typeof window.__isAutoGoAdmin === "function" && window.__isAutoGoAdmin() === true;
  }

  function isTestPool(pool) {
    if (!pool) return false;
    if (pool.isTest === true || pool.testTag === "[TEST]") return true;
    return /^\[TEST\]/i.test(String(pool.title || ""));
  }

  function timeMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function formatCountdown(ms) {
    const remain = Math.max(0, ms - Date.now());
    if (remain <= 0) return { text: "締切済み", urgent: true, done: true };
    const totalSec = Math.floor(remain / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    let text;
    if (days > 0) text = `締切まで ${pad(days)}日 ${pad(hours)}時間 ${pad(mins)}分`;
    else if (hours > 0) text = `締切まで ${pad(hours)}時間 ${pad(mins)}分 ${pad(secs)}秒`;
    else text = `締切まで ${pad(mins)}分 ${pad(secs)}秒`;
    return { text, urgent: remain < 6 * 3600 * 1000, done: false };
  }

  /** 募集中としてヒーローに出すプールか */
  function isRecruitingHeroPool(pool) {
    if (!pool || !pool.id) return false;
    if (isTestPool(pool) && !isAdmin()) return false;
    const status = String(pool.status || "");
    // コードベースは recruiting / activating（仕様書の open 相当）
    if (!["recruiting", "activating"].includes(status) && status !== "active") return false;
    if (status === "cancelled") return false;
    if (pool.entryLocked === true) return false;
    if (pool.recruitmentClosedAt) return false;
    const endMs = timeMs(pool.recruitEndAt);
    if (endMs > 0 && endMs <= Date.now()) return false;
    // active でも枠が残っていれば表示（開催確定後の追加募集）
    if (status === "active") {
      const target = Number(pool.targetParticipants) || Number(pool.minThreshold || pool.minParticipants) || 20;
      const total = Number(pool.totalCount) || 0;
      if (total >= target) return false;
    }
    return true;
  }

  function recruitingPools(allPools) {
    return (allPools || []).filter(isRecruitingHeroPool);
  }

  function capacityInfo(pool) {
    const total = Number(pool.totalCount) || 0;
    const minP = Number(pool.minThreshold || pool.minParticipants) || 20;
    const targetP = Number(pool.targetParticipants) || minP;
    const gaugeMax = Math.max(minP, targetP);
    const remainingToMin = Math.max(0, minP - total);
    const remainingToTarget = Math.max(0, targetP - total);
    const pct = Math.min(100, Math.round((total / Math.max(1, gaugeMax)) * 100));
    const established = total >= minP;
    return { total, minP, targetP, gaugeMax, remainingToMin, remainingToTarget, pct, established };
  }

  function priceLabel(pool) {
    const price = Number(pool.albumPrice || pool.purchasePrice || 0);
    if (price > 0) return `目安 ¥${price.toLocaleString("ja-JP")}（各自購入）`;
    return "定価・各自ショップ購入";
  }

  function perkSummary(pool) {
    const desc = String(pool.description || "").trim();
    if (desc) return desc.length > 72 ? desc.slice(0, 72) + "…" : desc;
    const members = (Array.isArray(pool.members) && pool.members.length)
      ? pool.members
      : (Array.isArray(pool.memberNames) ? pool.memberNames : []);
    if (members.length) return `対象メンバー：${members.slice(0, 5).join(" / ")}`;
    return "抱き合わせゼロ・希望メンバー枠で参加できる自動共同購入";
  }

  function renderCard(pool, idx, totalCards) {
    const cap = capacityInfo(pool);
    const endMs = timeMs(pool.recruitEndAt);
    const cd = endMs > 0 ? formatCountdown(endMs) : { text: "募集受付中", urgent: false, done: false };
    const title = String(pool.title || "Auto-GO").replace(/全体プール/g, "").trim() || "Auto-GO";
    const testBadge = isTestPool(pool)
      ? '<span class="ag-hero-test-badge">[TEST]</span>'
      : "";
    const remainNum = cap.established ? cap.remainingToTarget : cap.remainingToMin;
    const remainLabel = cap.established
      ? (remainNum > 0 ? `追加枠 残りあと${remainNum}！` : "まもなく満枠")
      : (remainNum > 0 ? `残りあと${remainNum}枠！` : "まもなく成立");
    const gaugeClass = remainNum <= 3 && remainNum > 0 ? "is-urgent" : (cap.established ? "is-ok" : "");
    const liveBadge = cap.established
      ? '<span class="ag-hero-live is-confirmed">開催確定・追加募集中</span>'
      : '<span class="ag-hero-live">受付中・先着順</span>';

    return `<article class="ag-hero-card snap-center shrink-0 w-full" data-ag-hero-idx="${idx}" data-pool-id="${esc(pool.id)}">
      <div class="ag-hero-inner">
        <div class="ag-hero-top">
          ${liveBadge}
          ${testBadge}
          <span class="ag-hero-brand">⚡ Auto-GO</span>
        </div>
        <h3 class="ag-hero-title">${esc(title)}</h3>
        <p class="ag-hero-perk">${esc(perkSummary(pool))}</p>
        <p class="ag-hero-price">${esc(priceLabel(pool))}</p>

        <div class="ag-hero-gauge-block">
          <div class="ag-hero-gauge-meta">
            <span>現在 <strong>${cap.total}</strong> / ${cap.minP}人参加中</span>
            <span class="ag-hero-remain ${remainNum > 0 && remainNum <= 5 ? "pulse" : ""}">${esc(remainLabel)}</span>
          </div>
          <div class="ag-hero-gauge" aria-hidden="true">
            <div class="ag-hero-gauge-fill ${gaugeClass}" style="width:${cap.pct}%"></div>
          </div>
          <p class="ag-hero-gauge-sub">定員目安 ${cap.targetP}人 · 最低成立 ${cap.minP}人</p>
        </div>

        <div class="ag-hero-countdown ${cd.urgent ? "is-urgent" : ""}" data-ag-countdown="${endMs || ""}">
          ${esc(cd.text)}
        </div>

        <button type="button" class="ag-hero-cta" data-ag-hero-join="${esc(pool.id)}">
          希望メンバーを選んで参加する →
        </button>
        ${totalCards > 1 ? `<p class="ag-hero-swipe-hint">${idx + 1} / ${totalCards} · 左右にスワイプ</p>` : ""}
      </div>
    </article>`;
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function tickCountdowns() {
    document.querySelectorAll("#autogo-home-banner [data-ag-countdown]").forEach((el) => {
      const endMs = Number(el.getAttribute("data-ag-countdown") || 0);
      if (!endMs) return;
      const cd = formatCountdown(endMs);
      el.textContent = cd.text;
      el.classList.toggle("is-urgent", !!cd.urgent);
    });
  }

  function syncDots(activeIdx) {
    document.querySelectorAll("#autogo-home-dots [data-ag-dot]").forEach((btn) => {
      const i = Number(btn.getAttribute("data-ag-dot"));
      btn.classList.toggle("is-active", i === activeIdx);
      btn.setAttribute("aria-current", i === activeIdx ? "true" : "false");
    });
  }

  function scrollToHeroIndex(idx, smooth) {
    const track = document.getElementById("autogo-home-track");
    if (!track) return;
    const cards = track.querySelectorAll(".ag-hero-card");
    const card = cards[idx];
    if (!card) return;
    heroIndex = idx;
    card.scrollIntoView({ behavior: smooth === false ? "auto" : "smooth", inline: "center", block: "nearest" });
    syncDots(idx);
  }

  function bindHeroInteractions(pools) {
    const wrap = document.getElementById("autogo-home-wrap");
    const track = document.getElementById("autogo-home-track");
    if (!wrap || !track) return;

    wrap.querySelectorAll("[data-ag-hero-join]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const poolId = btn.getAttribute("data-ag-hero-join");
        if (typeof window.openAutoGoModal === "function") {
          window.openAutoGoModal(poolId);
        }
      });
    });

    wrap.querySelectorAll("#autogo-home-dots [data-ag-dot]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        scrollToHeroIndex(Number(btn.getAttribute("data-ag-dot")), true);
      });
    });

    let scrollT = null;
    track.addEventListener("scroll", () => {
      if (scrollT) clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        const cards = track.querySelectorAll(".ag-hero-card");
        if (!cards.length) return;
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((card, i) => {
          const center = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        heroIndex = best;
        syncDots(best);
      }, 80);
    }, { passive: true });
  }

  window.__renderAutoGoHomeHero = function (allPools) {
    const wrap = document.getElementById("autogo-home-wrap");
    const banner = document.getElementById("autogo-home-banner");
    if (!wrap || !banner) return;

    const pools = recruitingPools(allPools);
    const ids = pools.map((p) => p.id).join("|");

    if (!pools.length) {
      stopCountdown();
      wrap.classList.add("is-empty");
      wrap.classList.add("hidden");
      banner.innerHTML = "";
      lastPoolIds = "";
      return;
    }

    wrap.classList.remove("hidden");
    wrap.classList.remove("is-empty");

    // 同一セットなら人数・カウントダウンだけ更新してチラつきを防ぐ
    if (ids === lastPoolIds && banner.querySelector(".ag-hero-card")) {
      pools.forEach((pool) => {
        let card = null;
        banner.querySelectorAll(".ag-hero-card").forEach((el) => {
          if (el.getAttribute("data-pool-id") === pool.id) card = el;
        });
        if (!card) return;
        const cap = capacityInfo(pool);
        const remainNum = cap.established ? cap.remainingToTarget : cap.remainingToMin;
        const remainLabel = cap.established
          ? (remainNum > 0 ? `追加枠 残りあと${remainNum}！` : "まもなく満枠")
          : (remainNum > 0 ? `残りあと${remainNum}枠！` : "まもなく成立");
        const meta = card.querySelector(".ag-hero-gauge-meta");
        if (meta) {
          meta.innerHTML = `<span>現在 <strong>${cap.total}</strong> / ${cap.minP}人参加中</span>
            <span class="ag-hero-remain ${remainNum > 0 && remainNum <= 5 ? "pulse" : ""}">${esc(remainLabel)}</span>`;
        }
        const fill = card.querySelector(".ag-hero-gauge-fill");
        if (fill) {
          fill.style.width = cap.pct + "%";
          fill.classList.toggle("is-urgent", remainNum <= 3 && remainNum > 0);
          fill.classList.toggle("is-ok", !!cap.established && !(remainNum <= 3 && remainNum > 0));
        }
      });
      tickCountdowns();
      return;
    }

    lastPoolIds = ids;
    if (heroIndex >= pools.length) heroIndex = 0;

    const dots = pools.length > 1
      ? `<div id="autogo-home-dots" class="ag-hero-dots" role="tablist" aria-label="募集中プール切替">
          ${pools.map((_, i) => `<button type="button" class="ag-hero-dot ${i === heroIndex ? "is-active" : ""}" data-ag-dot="${i}" aria-label="プール ${i + 1}" aria-current="${i === heroIndex ? "true" : "false"}"></button>`).join("")}
        </div>`
      : "";

    banner.innerHTML = `
      <div id="autogo-home-track" class="ag-hero-track hide-scrollbar" tabindex="0" aria-label="募集中の Auto-GO">
        ${pools.map((p, i) => renderCard(p, i, pools.length)).join("")}
      </div>
      ${dots}`;

    bindHeroInteractions(pools);
    stopCountdown();
    tickCountdowns();
    countdownTimer = setInterval(tickCountdowns, 1000);

    requestAnimationFrame(() => scrollToHeroIndex(heroIndex, false));
  };

  /** ログイン後にプール詳細へ戻すための保存 */
  window.__agRememberPoolForLogin = function (poolId) {
    try {
      if (poolId) sessionStorage.setItem(PENDING_KEY, String(poolId));
      else sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  };

  window.__agConsumePendingPoolAfterLogin = function () {
    let poolId = "";
    let wantTab = false;
    try {
      poolId = sessionStorage.getItem(PENDING_KEY) || "";
      wantTab = sessionStorage.getItem(PENDING_TAB_KEY) === "1";
      if (!poolId && !wantTab) return false;
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_TAB_KEY);
    } catch (_) {
      return false;
    }
    setTimeout(function () {
      if (typeof window.openAutoGoModal === "function") {
        window.openAutoGoModal(poolId || undefined);
      }
    }, 400);
    return true;
  };

  window.__agMarkAutogoTabIntent = function () {
    try { sessionStorage.setItem(PENDING_TAB_KEY, "1"); } catch (_) {}
  };

  // ディープリンク：?pool= / ?tab=autogo
  window.addEventListener("DOMContentLoaded", function () {
    let params;
    try { params = new URLSearchParams(location.search); } catch (_) { return; }
    const poolId = params.get("pool");
    const tab = params.get("tab");
    if (poolId) {
      window.__pendingAutoGoPoolId = poolId;
      setTimeout(function () {
        if (typeof window.openAutoGoModal === "function") window.openAutoGoModal(poolId);
      }, 500);
    } else if (tab === "autogo") {
      window.__agMarkAutogoTabIntent();
      setTimeout(function () {
        if (typeof window.openAutoGoModal === "function") window.openAutoGoModal();
      }, 500);
    }
  });
})();
