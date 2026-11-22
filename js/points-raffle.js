/**
 * ILLIT Trade - ポイント & トレカ抽選
 * - ホーム: 開催中の抽選がある時だけポップアップ表示
 * - マイページ: 保有ポイント
 * - 管理: 🎁 抽選管理タブ → admin-content に描画
 */
(function () {
  "use strict";

  var POINTS_PER_ENTRY_DEFAULT = 100;
  var cachedPoints = null;
  var openRaffles = [];
  var popupDismissed = false;

  function getAuth() {
    return (window.__autoGoRefs && window.__autoGoRefs.auth) || window.auth || null;
  }

  async function callFn(name, data) {
    try {
      var mods = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js")
      ]);
      var fn = mods[1].httpsCallable(mods[1].getFunctions(mods[0].getApp(), "asia-northeast1"), name);
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" })[c];
    });
  }

  function formatDeadline(ts) {
    if (!ts) return "未設定";
    var ms = ts.toMillis ? ts.toMillis() : Number(ts);
    if (!ms) return "未設定";
    return new Date(ms).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
    if (!refs || !refs.db) {
      openRaffles = [];
      renderHomePopup();
      return [];
    }
    try {
      var q = refs.query(
        refs.collection(refs.db, "raffles"),
        refs.where("status", "==", "open"),
        refs.limit(10)
      );
      var snap = await refs.getDocs(q);
      openRaffles = snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    } catch (e) {
      console.warn("load raffles", e);
      openRaffles = [];
    }
    renderHomePopup();
    return openRaffles;
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

  async function renderHomePopup() {
    var existing = document.getElementById("raffle-popup");
    var oldSec = document.getElementById("raffle-section");
    if (oldSec) oldSec.remove();

    if (!openRaffles.length || popupDismissed) {
      if (existing) existing.remove();
      return;
    }

    var auth = getAuth();
    var isLoggedIn = !!(auth && auth.currentUser);
    var r = openRaffles[0];
    var cost = Number(r.pointsPerEntry) || POINTS_PER_ENTRY_DEFAULT;
    var myTickets = isLoggedIn ? await getMyEntryTickets(r.id) : 0;

    var overlay = existing;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "raffle-popup";
      overlay.className = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3";
      overlay.style.background = "rgba(15,10,30,0.45)";
      document.body.appendChild(overlay);
    }

    var more = openRaffles.length > 1
      ? '<p class="text-[10px] text-center text-gray-500 mt-2">他 ' + (openRaffles.length - 1) + " 件の抽選もあります</p>"
      : "";

    overlay.innerHTML =
      '<div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-pink-100" onclick="event.stopPropagation()">' +
        '<div class="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 flex items-center justify-between">' +
          '<div class="text-white font-black text-sm">🎁 トレカ抽選開催中</div>' +
          '<button type="button" id="raffle-popup-close" class="w-8 h-8 rounded-full bg-white/20 text-white font-bold">×</button>' +
        "</div>" +
        '<div class="p-4 space-y-2">' +
          (r.imageUrl
            ? '<img src="' + escapeHtml(r.imageUrl) + '" class="w-full max-h-40 object-contain rounded-xl bg-gray-50" alt="">'
            : "") +
          '<h3 class="font-black text-gray-900 text-base">' + escapeHtml(r.title || "") + "</h3>" +
          '<p class="text-[11px] text-gray-500">' + escapeHtml(r.description || "") + "</p>" +
          '<div class="flex flex-wrap gap-1.5 text-[10px] font-bold">' +
            '<span class="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">当選 ' + (r.winnersCount || 1) + "名</span>" +
            '<span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">締切 ' + formatDeadline(r.deadline) + "</span>" +
            '<span class="bg-gray-50 px-2 py-0.5 rounded-full">' + cost + " pt / 1口</span>" +
          "</div>" +
          (isLoggedIn
            ? '<div class="flex justify-between text-[11px] font-bold mt-2">' +
                "<span>応募口数: <span class=\"text-pink-600\" data-my-tickets=\"" + r.id + "\">" + myTickets + "</span>口</span>" +
                '<span data-points-balance>' + (cachedPoints ? cachedPoints.points + " pt" : "—") + "</span>" +
              "</div>" +
              '<button type="button" class="mt-2 w-full py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black" ' +
                "onclick=\"window.PointsRaffle.enter('" + r.id + "', " + cost + ")\">" + cost + " pt で1口応募する</button>"
            : '<p class="text-[11px] text-center text-gray-500 mt-2">ログインするとポイントで応募できます</p>') +
          more +
          '<button type="button" id="raffle-popup-later" class="w-full mt-1 py-2 text-[11px] text-gray-400 font-bold">あとで</button>' +
        "</div>" +
      "</div>";

    function dismiss() {
      popupDismissed = true;
      try { sessionStorage.setItem("raffle_popup_dismissed", "1"); } catch (_) {}
      overlay.remove();
    }
    var closeBtn = document.getElementById("raffle-popup-close");
    var laterBtn = document.getElementById("raffle-popup-later");
    if (closeBtn) closeBtn.onclick = dismiss;
    if (laterBtn) laterBtn.onclick = dismiss;
    overlay.onclick = function (e) {
      if (e.target === overlay) dismiss();
    };
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
    if (!box) return;
    if (!cachedPoints) {
      box.innerHTML = '<div class="text-xs text-gray-400 py-3 text-center">ログインで履歴表示</div>';
      return;
    }
    var list = cachedPoints.pointHistory || [];
    if (!list.length) {
      box.innerHTML = '<div class="text-xs text-gray-400 py-3 text-center">まだ履歴がありません</div>';
      return;
    }
    box.innerHTML = list.slice(0, 30).map(function (h) {
      var sign = h.amount > 0 ? "+" : "";
      var color = h.amount > 0 ? "text-emerald-600" : "text-rose-600";
      var date = new Date(h.at || 0).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
      return '<div class="flex items-center justify-between py-2 border-b border-gray-50 text-[11px]">' +
        '<div class="flex-1 min-w-0"><div class="font-bold text-gray-800 truncate">' + escapeHtml(h.reason || "") + "</div>" +
        '<div class="text-gray-400">' + date + "</div></div>" +
        '<div class="font-black ' + color + ' ml-2">' + sign + h.amount + " pt</div></div>";
    }).join("");
  }

  function ensureMyPagePoints() {
    if (document.getElementById("points-history-list")) return;
    var mypage = document.getElementById("mypage-section");
    if (!mypage) return;
    var block = document.createElement("div");
    block.id = "mypage-points-block";
    block.className = "liquid-glass-input rounded-2xl p-4 space-y-3";
    block.innerHTML =
      '<div class="flex items-center justify-between">' +
        '<span class="font-bold text-sm text-gray-800">💎 保有ポイント</span>' +
        '<span class="text-lg font-black text-pink-600" data-points-balance>—</span>' +
      "</div>" +
      '<div class="text-[11px] text-gray-500 leading-relaxed">初回登録 +100 / 友だち招待 +100 / 取引完了（双方評価）+100<br>月間取引ポイント上限 500pt・同一ペア月1回まで</div>' +
      '<div class="flex items-center gap-2 text-[11px] flex-wrap">' +
        '<span class="font-bold text-gray-700">招待コード:</span>' +
        '<code class="bg-gray-100 px-2 py-0.5 rounded font-mono text-purple-700" data-invite-code>—</code>' +
      "</div>" +
      '<div><div class="font-bold text-xs text-gray-700 mb-1">ポイント履歴</div>' +
      '<div id="points-history-list" class="max-h-40 overflow-y-auto"></div></div>';

    var profileCard = mypage.querySelector(".liquid-glass");
    if (profileCard && profileCard.parentElement === mypage) {
      if (profileCard.nextSibling) mypage.insertBefore(block, profileCard.nextSibling);
      else mypage.appendChild(block);
    } else {
      var btnWrap = mypage.querySelector(".space-y-2");
      if (btnWrap) mypage.insertBefore(block, btnWrap);
      else mypage.appendChild(block);
    }
  }

  function ensureAdminTab() {
    if (document.getElementById("admin-tab-raffle")) return;
    var tabs = document.getElementById("admin-tab-autogo");
    if (!tabs || !tabs.parentElement) return;
    var btn = document.createElement("button");
    btn.id = "admin-tab-raffle";
    btn.type = "button";
    btn.className = tabs.className;
    btn.textContent = "🎁 抽選管理";
    btn.onclick = function () {
      if (window.switchAdminTab) window.switchAdminTab("raffle");
    };
    tabs.parentElement.appendChild(btn);
  }

  function renderAdminRafflePanel(el) {
    if (!el) el = document.getElementById("admin-content");
    if (!el) return;
    el.innerHTML =
      '<div class="space-y-4">' +
        '<h3 class="font-bold text-sm text-gray-800">🎁 トレカ抽選管理</h3>' +
        '<div class="liquid-glass-input rounded-xl p-3 space-y-2 text-sm bg-white/70">' +
          '<input id="raffle-title" placeholder="景品タイトル" class="w-full rounded-lg border border-gray-200 p-2 text-xs">' +
          '<textarea id="raffle-desc" placeholder="説明文" class="w-full rounded-lg border border-gray-200 p-2 text-xs h-16"></textarea>' +
          '<input id="raffle-image" placeholder="画像URL" class="w-full rounded-lg border border-gray-200 p-2 text-xs">' +
          '<div class="flex gap-2 flex-wrap">' +
            '<input id="raffle-cost" type="number" value="100" class="w-20 rounded-lg border border-gray-200 p-2 text-xs" title="必要pt">' +
            '<input id="raffle-winners" type="number" value="1" class="w-16 rounded-lg border border-gray-200 p-2 text-xs" title="当選人数">' +
            '<input id="raffle-deadline" type="datetime-local" class="flex-1 min-w-[10rem] rounded-lg border border-gray-200 p-2 text-xs">' +
          "</div>" +
          '<button type="button" id="raffle-admin-create" class="w-full py-2.5 rounded-full bg-purple-600 text-white text-xs font-bold">公開する</button>' +
        "</div>" +
        '<div id="admin-raffle-list" class="space-y-2 text-xs"></div>' +
      "</div>";

    var createBtn = document.getElementById("raffle-admin-create");
    if (createBtn) {
      createBtn.onclick = function () {
        window.PointsRaffleAdmin.create();
      };
    }
    window.PointsRaffleAdmin.list();
  }

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
          title: title,
          description: description,
          imageUrl: imageUrl,
          pointsPerEntry: pointsPerEntry,
          winnersCount: winnersCount,
          deadline: deadline
        });
        alert("抽選を公開しました: " + res.raffleId);
        if (titleEl) titleEl.value = "";
        popupDismissed = false;
        try { sessionStorage.removeItem("raffle_popup_dismissed"); } catch (_) {}
        window.PointsRaffle.loadOpenRaffles();
        this.list();
      } catch (e) {
        alert("作成失敗: " + (e.message || e) + "\n※ Cloud Functions のデプロイが必要です");
      }
    },
    list: async function () {
      var box = document.getElementById("admin-raffle-list");
      var refs = window.__autoGoRefs;
      if (!box) return;
      if (!refs) {
        box.innerHTML = '<div class="text-gray-400">読み込み中...</div>';
        return;
      }
      try {
        var q = refs.query(refs.collection(refs.db, "raffles"), refs.orderBy("createdAt", "desc"), refs.limit(20));
        var snap = await refs.getDocs(q);
        if (!snap.docs.length) {
          box.innerHTML = '<div class="text-gray-400 py-4 text-center">まだ抽選がありません。上のフォームから公開してください。</div>';
          return;
        }
        box.innerHTML = snap.docs.map(function (d) {
          var r = d.data();
          var id = d.id;
          var st = r.status || "?";
          return '<div class="border rounded-xl p-3 bg-white/80">' +
            '<div class="font-bold text-gray-800">' + escapeHtml(r.title) +
            ' <span class="text-gray-400 font-normal text-[10px]">(' + st + ")</span></div>" +
            '<div class="text-gray-500 mt-0.5">口数: ' + (r.totalTickets || 0) + " / 応募者: " + (r.totalEntrants || 0) + "</div>" +
            (st === "open"
              ? '<button type="button" class="mt-2 px-3 py-1.5 bg-pink-600 text-white rounded-full text-[10px] font-bold" onclick="window.PointsRaffleAdmin.draw(\'' + id + "')">抽選を実行する</button>"
              : "") +
            (st === "drawn" && (r.winners || []).length
              ? '<div class="mt-1 text-pink-700 font-bold">当選: ' +
                (r.winners || []).map(function (w) { return escapeHtml(w.displayName || w.uid); }).join(", ") +
                "</div>"
              : "") +
            "</div>";
        }).join("");
      } catch (e) {
        box.innerHTML = '<div class="text-red-500">読込失敗: ' + escapeHtml(String(e.message || e)) +
          "<br><span class=\"text-gray-400\">Functions / ルールのデプロイ後に利用できます</span></div>";
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

  function hookAdminTab() {
    var orig = window.switchAdminTab;
    if (typeof orig !== "function") return;
    if (orig.__pointsRaffleHooked) return;
    window.switchAdminTab = function (tab) {
      if (tab === "raffle") {
        ["reports", "inquiries", "users", "posts", "trades", "stats", "likes", "broadcast", "cards", "logs", "autogo", "raffle"].forEach(function (k) {
          var el = document.getElementById("admin-tab-" + k);
          if (!el) return;
          if (tab === k) {
            el.classList.remove("border-transparent", "text-gray-500");
            el.classList.add("border-illit-darkPurple", "text-illit-darkPurple");
          } else {
            el.classList.add("border-transparent", "text-gray-500");
            el.classList.remove("border-illit-darkPurple", "text-illit-darkPurple");
          }
        });
        var controls = document.getElementById("admin-controls");
        if (controls) {
          controls.classList.add("hidden");
          controls.innerHTML = "";
        }
        renderAdminRafflePanel(document.getElementById("admin-content"));
        return;
      }
      orig(tab);
      var raffleTab = document.getElementById("admin-tab-raffle");
      if (raffleTab) {
        raffleTab.classList.add("border-transparent", "text-gray-500");
        raffleTab.classList.remove("border-illit-darkPurple", "text-illit-darkPurple");
      }
    };
    window.switchAdminTab.__pointsRaffleHooked = true;
  }

  function hookMyPage() {
    var orig = window.switchTab;
    if (typeof orig !== "function" || orig.__pointsRaffleHooked) return;
    window.switchTab = function (tab) {
      orig.apply(this, arguments);
      if (tab === "mypage" || tab === "my") {
        ensureMyPagePoints();
        loadMyPoints();
      }
    };
    window.switchTab.__pointsRaffleHooked = true;
  }

  window.PointsRaffle = {
    loadMyPoints: loadMyPoints,
    loadOpenRaffles: loadOpenRaffles,
    enter: enter,
    renderPointsHistory: renderPointsHistory,
    getCachedPoints: function () { return cachedPoints; },
    init: async function () {
      try {
        popupDismissed = sessionStorage.getItem("raffle_popup_dismissed") === "1";
      } catch (_) {}
      ensureMyPagePoints();
      ensureAdminTab();
      hookAdminTab();
      hookMyPage();
      await loadOpenRaffles();
      var auth = getAuth();
      if (auth && auth.currentUser) await loadMyPoints();
      if (auth && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(async function (u) {
          if (u) {
            await loadMyPoints();
            await loadOpenRaffles();
          } else {
            cachedPoints = null;
            updatePointsUI();
          }
        });
      }
    }
  };

  function boot() {
    var tries = 0;
    var tick = function () {
      tries += 1;
      if (refsOk()) {
        window.PointsRaffle.init();
        setTimeout(function () {
          ensureAdminTab();
          hookAdminTab();
          ensureMyPagePoints();
        }, 1500);
        return;
      }
      if (tries < 60) setTimeout(tick, 200);
      else window.PointsRaffle.init();
    };
    tick();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
