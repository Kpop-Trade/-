/**
 * ILLIT Trade - ポイント & トレカ抽選キャンペーン
 * 既存の app-main.js / Firebase と連携
 */
(function () {
  "use strict";

  const POINTS_PER_ENTRY_DEFAULT = 100;
  let cachedPoints = null;
  let openRaffles = [];

  function getFunctions() {
    if (typeof firebase !== "undefined" && firebase.functions) {
      return firebase.app().functions("asia-northeast1");
    }
    if (window.functions) return window.functions;
    return null;
  }

  function getDb() {
    return window.db || (typeof firebase !== "undefined" ? firebase.firestore() : null);
  }

  function getAuth() {
    return window.auth || (typeof firebase !== "undefined" ? firebase.auth() : null);
  }

  async function callFn(name, data) {
    const fns = getFunctions();
    if (!fns) throw new Error("Functions not ready");
    const fn = fns.httpsCallable(name);
    const res = await fn(data || {});
    return res.data;
  }

  async function loadMyPoints() {
    try {
      const data = await callFn("getMyPoints");
      cachedPoints = data;
      updatePointsUI();
      return data;
    } catch (e) {
      console.warn("getMyPoints", e);
      return null;
    }
  }

  function updatePointsUI() {
    const bal = cachedPoints ? cachedPoints.points : "—";
    document.querySelectorAll("[data-points-balance]").forEach((el) => {
      el.textContent = typeof bal === "number" ? bal.toLocaleString() + " pt" : bal;
    });
    document.querySelectorAll("[data-invite-code]").forEach((el) => {
      if (cachedPoints && cachedPoints.inviteCode) el.textContent = cachedPoints.inviteCode;
    });
  }

  async function loadOpenRaffles() {
    const db = getDb();
    if (!db) return [];
    try {
      const snap = await db.collection("raffles").where("status", "==", "open").orderBy("deadline", "asc").limit(10).get();
      openRaffles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderRaffleCards();
      return openRaffles;
    } catch (e) {
      try {
        const snap = await db.collection("raffles").where("status", "==", "open").limit(10).get();
        openRaffles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderRaffleCards();
      } catch (e2) {
        console.warn("load raffles", e2);
      }
      return openRaffles;
    }
  }

  function formatDeadline(ts) {
    if (!ts) return "未設定";
    const ms = ts.toMillis ? ts.toMillis() : Number(ts);
    if (!ms) return "未設定";
    const d = new Date(ms);
    return d.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function getMyEntryTickets(raffleId) {
    const auth = getAuth();
    if (!auth || !auth.currentUser) return 0;
    const db = getDb();
    try {
      const snap = await db.collection("raffle_entries").doc(raffleId).collection("entries").doc(auth.currentUser.uid).get();
      return snap.exists ? (Number(snap.data().tickets) || 0) : 0;
    } catch (_) {
      return 0;
    }
  }

  async function renderRaffleCards() {
    const container = document.getElementById("raffle-cards-container");
    if (!container) return;
    if (!openRaffles.length) {
      container.innerHTML = `<div class="text-center text-sm text-gray-500 py-8">現在開催中の抽選はありません</div>`;
      return;
    }
    const auth = getAuth();
    const isLoggedIn = !!(auth && auth.currentUser);
    let html = "";
    for (const r of openRaffles) {
      const myTickets = isLoggedIn ? await getMyEntryTickets(r.id) : 0;
      const cost = Number(r.pointsPerEntry) || POINTS_PER_ENTRY_DEFAULT;
      const img = r.imageUrl
        ? `<img src="${r.imageUrl}" alt="" class="w-full aspect-[3/4] object-cover rounded-xl bg-gray-100" loading="lazy">`
        : `<div class="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-4xl">🃏</div>`;
      html += `
      <div class="bg-white/80 backdrop-blur rounded-2xl border border-pink-100 shadow-sm overflow-hidden raffle-card" data-raffle-id="${r.id}">
        <div class="p-3">${img}</div>
        <div class="px-4 pb-4">
          <h3 class="font-black text-sm text-gray-900 leading-snug">${escapeHtml(r.title || "")}</h3>
          <p class="text-[11px] text-gray-500 mt-1 line-clamp-2">${escapeHtml(r.description || "")}</p>
          <div class="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-gray-600">
            <span class="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">当選 ${r.winnersCount || 1}名</span>
            <span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">締切 ${formatDeadline(r.deadline)}</span>
            <span class="bg-gray-50 px-2 py-0.5 rounded-full">${cost} pt / 1口</span>
          </div>
          ${isLoggedIn ? `
          <div class="mt-3 flex items-center justify-between gap-2">
            <div class="text-[11px] font-bold text-gray-700">
              あなたの応募口数：<span class="text-pink-600 text-sm" data-my-tickets="${r.id}">${myTickets}</span>口
            </div>
            <div class="text-[11px] text-gray-500" data-points-balance>${cachedPoints ? cachedPoints.points + " pt" : "—"}</div>
          </div>
          <button type="button" class="mt-2 w-full py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black shadow-md active:scale-[0.98] transition"
            onclick="window.PointsRaffle.enter('${r.id}', ${cost})">
            ${cost} pt で1口応募する
          </button>
          ` : `
          <div class="mt-3 text-center text-[11px] text-gray-500">
            ログインするとポイントで応募できます<br>
            <span class="text-pink-600 font-bold">取引や招待でポイントを貯めよう！</span>
          </div>
          `}
        </div>
      </div>`;
    }
    container.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }

  async function enter(raffleId, cost) {
    const auth = getAuth();
    if (!auth || !auth.currentUser) {
      alert("ログインが必要です");
      return;
    }
    if (cachedPoints && cachedPoints.points < cost) {
      alert(`ポイントが不足しています（必要: ${cost} pt）\n取引完了や友だち招待でポイントを貯めましょう！`);
      return;
    }
    if (!confirm(`${cost} pt を消費して1口応募しますか？`)) return;
    try {
      const res = await callFn("enterRaffle", { raffleId, tickets: 1 });
      cachedPoints = cachedPoints || {};
      cachedPoints.points = res.newPoints;
      updatePointsUI();
      const el = document.querySelector(`[data-my-tickets="${raffleId}"]`);
      if (el) el.textContent = res.totalTickets;
      alert(`応募完了！ 現在の口数: ${res.totalTickets}口\n残高: ${res.newPoints} pt`);
    } catch (e) {
      const msg = (e && e.message) || String(e);
      alert("応募に失敗しました: " + msg.replace("FirebaseError: ", ""));
    }
  }

  async function claimRegistrationBonus(inviteCode) {
    try {
      const res = await callFn("claimRegistrationBonus", { inviteCode: inviteCode || "" });
      if (res.ok && !res.already) {
        cachedPoints = cachedPoints || {};
        cachedPoints.points = res.points;
        cachedPoints.inviteCode = res.inviteCode;
        updatePointsUI();
        return res;
      }
      return res;
    } catch (e) {
      console.warn("claimRegistrationBonus", e);
      return null;
    }
  }

  function renderPointsHistory() {
    const box = document.getElementById("points-history-list");
    if (!box || !cachedPoints) return;
    const list = cachedPoints.pointHistory || [];
    if (!list.length) {
      box.innerHTML = `<div class="text-xs text-gray-400 py-4 text-center">まだ履歴がありません</div>`;
      return;
    }
    box.innerHTML = list.slice(0, 30).map((h) => {
      const sign = h.amount > 0 ? "+" : "";
      const color = h.amount > 0 ? "text-emerald-600" : "text-rose-600";
      const date = new Date(h.at || 0).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
      return `<div class="flex items-center justify-between py-2 border-b border-gray-50 text-[11px]">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-gray-800 truncate">${escapeHtml(h.reason || "")}</div>
          <div class="text-gray-400">${date}</div>
        </div>
        <div class="font-black ${color} ml-2">${sign}${h.amount} pt</div>
      </div>`;
    }).join("");
  }

  window.PointsRaffle = {
    loadMyPoints,
    loadOpenRaffles,
    enter,
    claimRegistrationBonus,
    renderPointsHistory,
    getCachedPoints: () => cachedPoints,
    init: async function () {
      await loadOpenRaffles();
      const auth = getAuth();
      if (auth && auth.currentUser) {
        await loadMyPoints();
        renderPointsHistory();
      }
      if (auth) {
        auth.onAuthStateChanged(async (u) => {
          if (u) {
            await loadMyPoints();
            renderPointsHistory();
            renderRaffleCards();
          } else {
            cachedPoints = null;
            updatePointsUI();
            renderRaffleCards();
          }
        });
      }
    }
  };

  window.PointsRaffleAdmin = {
    async create() {
      const title = document.getElementById("raffle-title")?.value?.trim();
      const description = document.getElementById("raffle-desc")?.value?.trim() || "";
      const imageUrl = document.getElementById("raffle-image")?.value?.trim() || "";
      const pointsPerEntry = Number(document.getElementById("raffle-cost")?.value) || 100;
      const winnersCount = Number(document.getElementById("raffle-winners")?.value) || 1;
      const dl = document.getElementById("raffle-deadline")?.value;
      const deadline = dl ? new Date(dl).getTime() : Date.now() + 7 * 86400000;
      if (!title) return alert("タイトルを入力してください");
      try {
        const res = await callFn("adminCreateRaffle", { title, description, imageUrl, pointsPerEntry, winnersCount, deadline });
        alert("抽選を公開しました: " + res.raffleId);
        const t = document.getElementById("raffle-title"); if (t) t.value = "";
        window.PointsRaffle.loadOpenRaffles();
        this.list();
      } catch (e) {
        alert("作成失敗: " + (e.message || e));
      }
    },
    async list() {
      const db = getDb();
      const box = document.getElementById("admin-raffle-list");
      if (!db || !box) return;
      try {
        const snap = await db.collection("raffles").orderBy("createdAt", "desc").limit(20).get();
        box.innerHTML = snap.docs.map((d) => {
          const r = d.data();
          const id = d.id;
          const st = r.status || "?";
          return `<div class="border rounded-lg p-2 bg-white/70">
            <div class="font-bold">${escapeHtml(r.title)} <span class="text-gray-400 font-normal">(${st})</span></div>
            <div class="text-gray-500">口数合計: ${r.totalTickets || 0} / 応募者: ${r.totalEntrants || 0}</div>
            ${st === "open" ? `<button class="mt-1 px-3 py-1 bg-pink-600 text-white rounded-full text-[10px] font-bold" onclick="window.PointsRaffleAdmin.draw('${id}')">抽選を実行する</button>` : ""}
            ${st === "drawn" && (r.winners || []).length ? `<div class="mt-1">当選: ${(r.winners || []).map(w => escapeHtml(w.displayName || w.uid)).join(", ")}</div>
              ${(r.winners || []).map(w => `<button class="mr-1 mt-1 px-2 py-0.5 border rounded text-[10px]" onclick="window.PointsRaffleAdmin.ship('${id}','${w.uid}','shipped')">発送済: ${escapeHtml(w.displayName||"")}</button>`).join("")} ` : ""}
          </div>`;
        }).join("") || "<div class='text-gray-400'>なし</div>";
      } catch (e) {
        box.innerHTML = "<div class='text-red-500'>読込失敗</div>";
      }
    },
    async draw(raffleId) {
      if (!confirm("抽選を実行しますか？この操作は取り消せません。")) return;
      try {
        const res = await callFn("adminDrawRaffle", { raffleId });
        alert("当選者: " + (res.winners || []).map(w => w.displayName).join(", "));
        this.list();
        window.PointsRaffle.loadOpenRaffles();
      } catch (e) {
        alert("抽選失敗: " + (e.message || e));
      }
    },
    async ship(raffleId, uid, status) {
      try {
        await callFn("adminUpdateRaffleShipping", { raffleId, uid, shippingStatus: status });
        alert("更新しました");
        this.list();
      } catch (e) {
        alert(e.message || e);
      }
    }
  };

  const _origSwitch = window.switchAdminTab;
  window.switchAdminTab = function (tab) {
    if (typeof _origSwitch === "function") _origSwitch(tab);
    document.querySelectorAll("[id^=admin-panel-]").forEach((el) => {
      if (el.id.indexOf("admin-panel-") === 0) el.classList.add("hidden");
    });
    const panel = document.getElementById("admin-panel-" + tab);
    if (panel) panel.classList.remove("hidden");
    if (tab === "raffle") window.PointsRaffleAdmin.list();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.PointsRaffle.init());
  } else {
    setTimeout(() => window.PointsRaffle.init(), 800);
  }
})();
