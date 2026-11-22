/**
 * ILLIT Trade - ポイント & トレカ抽選
 */
(function () {
  "use strict";

  var POINTS_PER_ENTRY_DEFAULT = 100;
  var cachedPoints = null;
  var openRaffles = [];

  function getAuth() {
    return (window.__autoGoRefs && window.__autoGoRefs.auth) || window.auth || null;
  }

  async function callFn(name, data) {
    try {
      var mods = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js")
      ]);
      var getApp = mods[0].getApp;
      var getFunctions = mods[1].getFunctions;
      var httpsCallable = mods[1].httpsCallable;
      var fn = httpsCallable(getFunctions(getApp(), "asia-northeast1"), name);
      var res = await fn(data || {});
      return res.data;
    } catch (e) {
      var refs = window.__autoGoRefs;
      if (refs && typeof refs[name] === "function") {
        var res2 = await refs[name](data || {});
        return res2 && res2.data !== undefined ? res2.data : res2;
      }
      throw e;
    }
  }

  function refsOk() {
    return !!(window.__autoGoRefs && window.__autoGoRefs.db);
  }

  async function loadMyPoints() {
    try {
      var data = await callFn("getMyPoints");
      cachedPoints = data;
      updatePointsUI();
      renderPointsHistory();
      return data;
    } catch (e) {
      console.warn("getMyPoints", e);
      return null;
    }
  }

  function updatePointsUI() {
    var bal = cachedPoints ? cachedPoints.points : "—";
    document.querySelectorAll("[data-points-balance]").forEach(function (el) {
      el.textContent = typeof bal === "number" ? bal.toLocaleString() + " pt" : bal;
    });
    document.querySelectorAll("[data-invite-code]").forEach(function (el) {
      if (cachedPoints && cachedPoints.inviteCode) el.textContent = cachedPoints.inviteCode;
    });
  }

  async function loadOpenRaffles() {
    var refs = window.__autoGoRefs;
    var container = document.getElementById("raffle-cards-container");
    if (!refs || !refs.db) {
      if (container) container.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">現在開催中の抽選はありません</div>';
      return [];
    }
    try {
      var q = refs.query(
        refs.collection(refs.db, "raffles"),
        refs.where("status", "==", "open"),
        refs.limit(10)
      );
      var snap = await refs.getDocs(q);
      openRaffles = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      await renderRaffleCards();
      return openRaffles;
    } catch (e) {
      console.warn("load raffles", e);
      openRaffles = [];
      await renderRaffleCards();
      return openRaffles;
    }
  }

  function formatDeadline(ts) {
    if (!ts) return "未設定";
    var ms = ts.toMillis ? ts.toMillis() : Number(ts);
    if (!ms) return "未設定";
    return new Date(ms).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" })[c];
    });
  }

  async function getMyEntryTickets(raffleId) {
    var auth = getAuth();
    if (!auth || !auth.currentUser) return 0;
    var refs = window.__autoGoRefs;
    if (!refs) return 0;
    try {
      var snap = await refs.getDoc(refs.doc(refs.db, "raffle_entries", raffleId, "entries", auth.currentUser.uid));
      return snap.exists() ? (Number(snap.data().tickets) || 0) : 0;
    } catch (_) {
      return 0;
    }
  }

  async function renderRaffleCards() {
    var container = document.getElementById("raffle-cards-container");
    if (!container) return;
    if (!openRaffles.length) {
      container.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">現在開催中の抽選はありません<br><span class="text-[11px] text-gray-400">管理画面「🎁 抽選管理」から作成できます</span></div>';
      return;
    }
    var auth = getAuth();
    var isLoggedIn = !!(auth && auth.currentUser);
    var html = "";
    for (var i = 0; i < openRaffles.length; i++) {
      var r = openRaffles[i];
      var myTickets = isLoggedIn ? await getMyEntryTickets(r.id) : 0;
      var cost = Number(r.pointsPerEntry) || POINTS_PER_ENTRY_DEFAULT;
      var img = r.imageUrl
        ? '<img src="' + escapeHtml(r.imageUrl) + '" alt="" class="w-full aspect-[3/4] object-cover rounded-xl bg-gray-100" loading="lazy">'
        : '<div class="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-4xl">🃏</div>';
      html += '<div class="bg-white/80 backdrop-blur rounded-2xl border border-pink-100 shadow-sm overflow-hidden" data-raffle-id="' + r.id + '">' +
        '<div class="p-3">' + img + '</div><div class="px-4 pb-4">' +
        '<h3 class="font-black text-sm text-gray-900 leading-snug">' + escapeHtml(r.title || "") + '</h3>' +
        '<p class="text-[11px] text-gray-500 mt-1 line-clamp-2">' + escapeHtml(r.description || "") + '</p>' +
        '<div class="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-gray-600">' +
        '<span class="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">当選 ' + (r.winnersCount || 1) + '名</span>' +
        '<span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">締切 ' + formatDeadline(r.deadline) + '</span>' +
        '<span class="bg-gray-50 px-2 py-0.5 rounded-full">' + cost + ' pt / 1口</span></div>';
      if (isLoggedIn) {
        html += '<div class="mt-3 flex items-center justify-between gap-2">' +
          '<div class="text-[11px] font-bold text-gray-700">応募口数：<span class="text-pink-600 text-sm" data-my-tickets="' + r.id + '">' + myTickets + '</span>口</div>' +
          '<div class="text-[11px] text-gray-500" data-points-balance>' + (cachedPoints ? cachedPoints.points + ' pt' : '—') + '</div></div>' +
          '<button type="button" class="mt-2 w-full py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black shadow-md"' +
          ' onclick="window.PointsRaffle.enter(\'' + r.id + '\', ' + cost + ')">' + cost + ' pt で1口応募する</button>';
      } else {
        html += '<div class="mt-3 text-center text-[11px] text-gray-500">ログインするとポイントで応募できます<br>' +
          '<span class="text-pink-600 font-bold">取引や招待でポイントを貯めよう！</span></div>';
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
  }

  async function enter(raffleId, cost) {
    var auth = getAuth();
    if (!auth || !auth.currentUser) return alert("ログインが必要です");
    if (cachedPoints && cachedPoints.points < cost) {
      return alert("ポイントが不足しています（必要: " + cost + " pt）\n取引完了や友だち招待でポイントを貯めましょう！");
    }
    if (!confirm(cost + " pt を消費して1口応募しますか？")) return;
    try {
      var res = await callFn("enterRaffle", { raffleId: raffleId, tickets: 1 });
      cachedPoints = cachedPoints || {};
      cachedPoints.points = res.newPoints;
      updatePointsUI();
      var el = document.querySelector('[data-my-tickets="' + raffleId + '"]');
      if (el) el.textContent = res.totalTickets;
      alert("応募完了！ 現在の口数: " + res.totalTickets + "口\n残高: " + res.newPoints + " pt");
    } catch (e) {
      alert("応募に失敗しました: " + String(e.message || e).replace("FirebaseError: ", ""));
    }
  }

  function renderPointsHistory() {
    var box = document.getElementById("points-history-list");
    if (!box || !cachedPoints) return;
    var list = cachedPoints.pointHistory || [];
    if (!list.length) {
      box.innerHTML = '<div class="text-xs text-gray-400 py-4 text-center">まだ履歴がありません</div>';
      return;
    }
    box.innerHTML = list.slice(0, 30).map(function (h) {
      var sign = h.amount > 0 ? "+" : "";
      var color = h.amount > 0 ? "text-emerald-600" : "text-rose-600";
      var date = new Date(h.at || 0).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
      return '<div class="flex items-center justify-between py-2 border-b border-gray-50 text-[11px]">' +
        '<div class="flex-1 min-w-0"><div class="font-bold text-gray-800 truncate">' + escapeHtml(h.reason || "") + '</div>' +
        '<div class="text-gray-400">' + date + '</div></div>' +
        '<div class="font-black ' + color + ' ml-2">' + sign + h.amount + ' pt</div></div>';
    }).join("");
  }

  function ensurePointsRaffleDom() {
    if (!document.getElementById("raffle-section")) {
      var section = document.createElement("section");
      section.id = "raffle-section";
      section.className = "mt-4 mb-3 w-full";
      section.innerHTML =
        '<div class="flex items-center justify-between mb-2 px-1">' +
        '<h3 class="font-bold text-base text-gray-800 flex items-center gap-1.5">' +
        '<span class="text-lg">🎁</span> 開催中のトレカ抽選</h3>' +
        '<span class="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full" data-points-balance>—</span></div>' +
        '<p class="text-[11px] text-gray-500 px-1 mb-2">取引完了・友だち招待でポイントを貯めて応募しよう。口数が多いほど当選確率UP！</p>' +
        '<div id="raffle-cards-container" class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
        '<div class="text-center text-sm text-gray-400 py-6">読み込み中...</div></div>';

      var postList = document.getElementById("post-list-section");
      var listTitle = document.getElementById("list-section-title");
      if (postList) {
        var titleRow = listTitle ? (listTitle.closest(".flex") || listTitle.parentElement) : null;
        if (titleRow && titleRow.parentElement === postList) {
          postList.insertBefore(section, titleRow);
        } else {
          postList.insertBefore(section, postList.firstChild);
        }
      } else if (listTitle && listTitle.parentElement && listTitle.parentElement.parentElement) {
        listTitle.parentElement.parentElement.insertBefore(section, listTitle.parentElement);
      } else {
        var main = document.querySelector("main");
        if (main) main.appendChild(section);
        else document.body.prepend(section);
      }
    }

    if (!document.getElementById("points-history-list")) {
      var block = document.createElement("div");
      block.className = "liquid-glass-input rounded-2xl p-4 space-y-3 mb-3";
      block.innerHTML =
        '<div class="flex items-center justify-between">' +
        '<span class="font-bold text-sm text-gray-800">💎 保有ポイント</span>' +
        '<span class="text-lg font-black text-pink-600" data-points-balance>—</span></div>' +
        '<div class="text-[11px] text-gray-500">初回登録 +100 / 友だち招待 +100 / 取引完了（双方評価）+100<br>月間取引ポイント上限 500pt・同一ペア月1回まで</div>' +
        '<div class="flex items-center gap-2 text-[11px] flex-wrap">' +
        '<span class="font-bold text-gray-700">招待コード:</span>' +
        '<code class="bg-gray-100 px-2 py-0.5 rounded font-mono text-purple-700" data-invite-code>—</code></div>' +
        '<div><div class="font-bold text-xs text-gray-700 mb-1">ポイント履歴</div>' +
        '<div id="points-history-list" class="max-h-40 overflow-y-auto"></div></div>';
      var mypage = document.getElementById("mypage-section");
      var firstBtn = mypage && mypage.querySelector("button");
      if (firstBtn) mypage.insertBefore(block, firstBtn);
      else if (mypage) mypage.appendChild(block);
    }

    if (!document.getElementById("admin-tab-raffle")) {
      var tabs = document.getElementById("admin-tab-autogo");
      if (tabs && tabs.parentElement) {
        var btn = document.createElement("button");
        btn.id = "admin-tab-raffle";
        btn.type = "button";
        btn.className = tabs.className;
        btn.textContent = "🎁 抽選管理";
        btn.onclick = function () { if (window.switchAdminTab) window.switchAdminTab("raffle"); };
        tabs.parentElement.appendChild(btn);
      }
    }

    if (!document.getElementById("admin-panel-raffle")) {
      var panel = document.createElement("div");
      panel.id = "admin-panel-raffle";
      panel.className = "hidden space-y-4 p-3";
      panel.innerHTML =
        '<h3 class="font-bold text-sm">🎁 トレカ抽選管理</h3>' +
        '<div class="liquid-glass-input rounded-xl p-3 space-y-2 text-sm">' +
        '<input id="raffle-title" placeholder="景品タイトル" class="w-full rounded-lg border p-2 text-xs">' +
        '<textarea id="raffle-desc" placeholder="説明文" class="w-full rounded-lg border p-2 text-xs h-16"></textarea>' +
        '<input id="raffle-image" placeholder="画像URL" class="w-full rounded-lg border p-2 text-xs">' +
        '<div class="flex gap-2 flex-wrap">' +
        '<input id="raffle-cost" type="number" value="100" class="w-20 rounded-lg border p-2 text-xs" title="必要pt">' +
        '<input id="raffle-winners" type="number" value="1" class="w-16 rounded-lg border p-2 text-xs" title="当選人数">' +
        '<input id="raffle-deadline" type="datetime-local" class="flex-1 min-w-[10rem] rounded-lg border p-2 text-xs"></div>' +
        '<button type="button" onclick="window.PointsRaffleAdmin && window.PointsRaffleAdmin.create()"' +
        ' class="w-full py-2 rounded-full bg-purple-600 text-white text-xs font-bold">公開する</button></div>' +
        '<div id="admin-raffle-list" class="space-y-2 text-xs"></div>';
      var host = document.getElementById("admin-panel-autogo") || document.querySelector("[id^=admin-panel-]");
      if (host && host.parentElement) host.parentElement.appendChild(panel);
      else {
        var main2 = document.querySelector("main");
        if (main2) main2.appendChild(panel);
      }
    }
  }

  window.PointsRaffle = {
    loadMyPoints: loadMyPoints,
    loadOpenRaffles: loadOpenRaffles,
    enter: enter,
    renderPointsHistory: renderPointsHistory,
    getCachedPoints: function () { return cachedPoints; },
    init: async function () {
      ensurePointsRaffleDom();
      await loadOpenRaffles();
      var auth = getAuth();
      if (auth && auth.currentUser) await loadMyPoints();
      if (auth && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(async function (u) {
          if (u) { await loadMyPoints(); await renderRaffleCards(); }
          else { cachedPoints = null; updatePointsUI(); await renderRaffleCards(); }
        });
      }
    }
  };

  window.PointsRaffleAdmin = {
    create: async function () {
      var titleEl = document.getElementById("raffle-title");
      var title = titleEl ? String(titleEl.value || "").trim() : "";
      var description = (document.getElementById("raffle-desc") && document.getElementById("raffle-desc").value) || "";
      var imageUrl = (document.getElementById("raffle-image") && document.getElementById("raffle-image").value) || "";
      var pointsPerEntry = Number(document.getElementById("raffle-cost") && document.getElementById("raffle-cost").value) || 100;
      var winnersCount = Number(document.getElementById("raffle-winners") && document.getElementById("raffle-winners").value) || 1;
      var dl = document.getElementById("raffle-deadline") && document.getElementById("raffle-deadline").value;
      var deadline = dl ? new Date(dl).getTime() : Date.now() + 7 * 86400000;
      if (!title) return alert("タイトルを入力してください");
      try {
        var res = await callFn("adminCreateRaffle", {
          title: title, description: description, imageUrl: imageUrl,
          pointsPerEntry: pointsPerEntry, winnersCount: winnersCount, deadline: deadline
        });
        alert("抽選を公開しました: " + res.raffleId);
        if (titleEl) titleEl.value = "";
        window.PointsRaffle.loadOpenRaffles();
        this.list();
      } catch (e) {
        alert("作成失敗: " + (e.message || e));
      }
    },
    list: async function () {
      var box = document.getElementById("admin-raffle-list");
      var refs = window.__autoGoRefs;
      if (!box || !refs) return;
      try {
        var q = refs.query(refs.collection(refs.db, "raffles"), refs.orderBy("createdAt", "desc"), refs.limit(20));
        var snap = await refs.getDocs(q);
        box.innerHTML = snap.docs.map(function (d) {
          var r = d.data();
          var id = d.id;
          var st = r.status || "?";
          return '<div class="border rounded-lg p-2 bg-white/70">' +
            '<div class="font-bold">' + escapeHtml(r.title) + ' <span class="text-gray-400 font-normal">(' + st + ')</span></div>' +
            '<div class="text-gray-500">口数: ' + (r.totalTickets || 0) + ' / 応募者: ' + (r.totalEntrants || 0) + '</div>' +
            (st === "open"
              ? '<button class="mt-1 px-3 py-1 bg-pink-600 text-white rounded-full text-[10px] font-bold" onclick="window.PointsRaffleAdmin.draw(\'' + id + '\')">抽選を実行する</button>'
              : '') +
            (st === "drawn" && (r.winners || []).length
              ? '<div class="mt-1">当選: ' + (r.winners || []).map(function (w) { return escapeHtml(w.displayName || w.uid); }).join(", ") + '</div>'
              : '') +
            '</div>';
        }).join("") || "<div class='text-gray-400'>なし</div>";
      } catch (e) {
        box.innerHTML = "<div class='text-red-500'>読込失敗（Functionsデプロイ後に利用可）</div>";
      }
    },
    draw: async function (raffleId) {
      if (!confirm("抽選を実行しますか？取り消せません。")) return;
      try {
        var res = await callFn("adminDrawRaffle", { raffleId: raffleId });
        alert("当選者: " + (res.winners || []).map(function (w) { return w.displayName; }).join(", "));
        this.list();
        window.PointsRaffle.loadOpenRaffles();
      } catch (e) {
        alert("抽選失敗: " + (e.message || e));
      }
    }
  };

  var _origSwitch = window.switchAdminTab;
  window.switchAdminTab = function (tab) {
    if (typeof _origSwitch === "function") _origSwitch(tab);
    document.querySelectorAll("[id^=admin-panel-]").forEach(function (el) {
      if (el.id.indexOf("admin-panel-") === 0) el.classList.add("hidden");
    });
    var panel = document.getElementById("admin-panel-" + tab);
    if (panel) panel.classList.remove("hidden");
    if (tab === "raffle") window.PointsRaffleAdmin.list();
  };

  function boot() {
    var tries = 0;
    var tick = function () {
      tries += 1;
      if (refsOk()) {
        window.PointsRaffle.init();
        setTimeout(function () { window.PointsRaffle.init(); }, 1500);
        setTimeout(function () { window.PointsRaffle.init(); }, 4000);
        return;
      }
      if (tries < 50) setTimeout(tick, 200);
      else {
        window.PointsRaffle.init();
        setTimeout(function () { window.PointsRaffle.init(); }, 2000);
      }
    };
    tick();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
