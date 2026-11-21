(function() {
  let xtType = "exchange";
  let pendingXTradePayload = null;

  function encodePayload(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodePayload(str) {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  window.openXTradeCreateModal = function() {
    const modal = document.getElementById("xtrade-create-modal");
    if (!modal) return;
    if (!window.currentUser) {
      if (typeof showToast === "function") showToast("先にログインしてください", "error");
      return;
    }
    const resBox = document.getElementById("xt-result-box");
    if (resBox) resBox.classList.add("hidden");
    modal.classList.remove("hidden");
  };

  window.closeXTradeCreateModal = function() {
    const modal = document.getElementById("xtrade-create-modal");
    if (modal) modal.classList.add("hidden");
  };

  window.setXTradeType = function(type) {
    xtType = type;
    const exBtn = document.getElementById("xt-type-ex");
    const sellBtn = document.getElementById("xt-type-sell");
    const wantWrap = document.getElementById("xt-want-wrap");
    const priceWrap = document.getElementById("xt-price-wrap");
    if (type === "exchange") {
      exBtn.className = "py-2 rounded-xl text-xs font-bold border-2 border-purple-500 bg-purple-50 text-purple-700";
      sellBtn.className = "py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-600";
      wantWrap.classList.remove("hidden");
      priceWrap.classList.add("hidden");
    } else {
      sellBtn.className = "py-2 rounded-xl text-xs font-bold border-2 border-pink-500 bg-pink-50 text-pink-700";
      exBtn.className = "py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-600";
      wantWrap.classList.add("hidden");
      priceWrap.classList.remove("hidden");
    }
  };

  window.generateXTradeLink = function() {
    if (!window.currentUser) {
      if (typeof showToast === "function") showToast("先にログインしてください", "error");
      return;
    }
    const give = (document.getElementById("xt-give").value || "").trim();
    const want = (document.getElementById("xt-want").value || "").trim();
    const price = Number(document.getElementById("xt-price").value || 0);
    const memo = (document.getElementById("xt-memo").value || "").trim();

    if (!give) {
      if (typeof showToast === "function") showToast("「こちらが譲るもの」を入力してください", "error");
      return;
    }
    if (xtType === "exchange" && !want) {
      if (typeof showToast === "function") showToast("「相手から受け取るもの」を入力してください", "error");
      return;
    }
    if (xtType === "sell" && price <= 0) {
      if (typeof showToast === "function") showToast("合意金額を入力してください", "error");
      return;
    }

    const myName = (window.currentUserProfile && (window.currentUserProfile.nickname || window.currentUserProfile.displayName))
      || window.currentUser.displayName
      || "出品者";

    const payload = {
      v: 1,
      oid: window.currentUser.uid,
      oname: myName,
      t: xtType,
      g: give,
      w: xtType === "exchange" ? want : "",
      p: xtType === "sell" ? price : 0,
      m: memo,
      ts: Date.now()
    };

    const token = encodePayload(payload);
    const url = `${location.origin}/?xtrade=${token}`;
    document.getElementById("xt-generated-url").value = url;
    document.getElementById("xt-result-box").classList.remove("hidden");
    if (typeof showToast === "function") showToast("招待URLを作成しました！", "success");
  };

  window.copyXTradeUrlOnly = async function() {
    const url = document.getElementById("xt-generated-url").value;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    if (typeof showToast === "function") showToast("URLをコピーしました", "success");
  };

  window.copyXTradeDmText = async function() {
    const url = document.getElementById("xt-generated-url").value;
    const give = (document.getElementById("xt-give").value || "").trim();
    const want = (document.getElementById("xt-want").value || "").trim();
    const price = Number(document.getElementById("xt-price").value || 0);
    const detail = xtType === "exchange"
      ? `【譲】${give}\n【求】${want}`
      : `【お譲り】${give}（${price.toLocaleString()}円）`;
    const msg = `お取引ありがとうございます！\n安全に住所交換・発送連絡ができる専用取引ルームを用意しました👇\n\n${detail}\n\nこちらから入室をお願いします：\n${url}`;
    await navigator.clipboard.writeText(msg);
    if (typeof showToast === "function") showToast("DM案内文をコピーしました！", "success");
  };

  window.closeXTradeJoinModal = function() {
    const modal = document.getElementById("xtrade-join-modal");
    if (modal) modal.classList.add("hidden");
    const u = new URL(location.href);
    u.searchParams.delete("xtrade");
    history.replaceState(null, "", u.pathname + u.search);
  };

  function checkIncomingXTrade() {
    const param = new URLSearchParams(location.search).get("xtrade");
    if (!param) return;
    try {
      const data = decodePayload(param);
      if (!data || !data.oid || !data.g) return;
      pendingXTradePayload = data;

      document.getElementById("xtj-badge").innerText = data.t === "sell" ? "💰 買取・譲渡" : "🔄 トレカ交換";
      document.getElementById("xtj-owner").innerText = data.oname || "出品者";
      document.getElementById("xtj-give").innerText = data.g;

      if (data.t === "sell") {
        document.getElementById("xtj-want-row").classList.add("hidden");
        document.getElementById("xtj-price-row").classList.remove("hidden");
        document.getElementById("xtj-price").innerText = `${Number(data.p || 0).toLocaleString()}円`;
      } else {
        document.getElementById("xtj-want-row").classList.remove("hidden");
        document.getElementById("xtj-price-row").classList.add("hidden");
        document.getElementById("xtj-want").innerText = data.w || "-";
      }

      if (data.m) {
        document.getElementById("xtj-memo-row").classList.remove("hidden");
        document.getElementById("xtj-memo").innerText = data.m;
      } else {
        document.getElementById("xtj-memo-row").classList.add("hidden");
      }

      document.getElementById("xtrade-join-modal").classList.remove("hidden");
    } catch (e) {
      console.error("Invalid xtrade param:", e);
    }
  }

  window.confirmJoinXTrade = async function() {
    if (!pendingXTradePayload) return;
    if (!window.currentUser) {
      alert("先にログインしてから入室してください。");
      return;
    }
    const d = pendingXTradePayload;
    if (d.oid === window.currentUser.uid) {
      alert("これはあなたが作成した招待URLです。\n別のアカウント（取引相手）でこのURLを開くと取引ルームが作成されます。");
      return;
    }

    const btn = document.getElementById("xtj-confirm-btn");
    btn.disabled = true;
    btn.innerText = "取引ルームを作成中...";

    try {
      const myName = (window.currentUserProfile && (window.currentUserProfile.nickname || window.currentUserProfile.displayName))
        || window.currentUser.displayName
        || "取引相手";

      const tradeDoc = {
        kind: d.t === "sell" ? "card_sell" : "card_exchange",
        isBuy: false,
        isSell: d.t === "sell",
        isXTrade: true,
        postId: "xtrade_" + (d.ts || Date.now()),
        postGive: d.g,
        postWant: d.w || "",
        postPrice: Number(d.p || 0),
        postMember: "X合意取引",
        postMemo: d.m || "",
        ownerId: d.oid,
        ownerName: d.oname || "出品者",
        applicantId: window.currentUser.uid,
        applicantName: myName,
        participants: [d.oid, window.currentUser.uid],
        status: "shipping",
        agreed: {
          [d.oid]: true,
          [window.currentUser.uid]: true
        },
        shipped: {},
        received: {},
        createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date(),
        updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date()
      };

      const refs = window.__autoGoRefs || {};
    const _db = window.db || refs.db;
    const _col = window.collection || refs.collection;
    const _add = window.addDoc || refs.addDoc;
    const _ts = window.serverTimestamp || refs.serverTimestamp;
    if (!_db || !_col || !_add) {
      alert("システム読込中です。数秒後にもう一度お試しください。");
      return;
    }
    tradeDoc.createdAt = _ts ? _ts() : new Date();
    tradeDoc.updatedAt = _ts ? _ts() : new Date();
    const btn = document.getElementById("xtj-confirm-btn") || event?.target;
    if (btn) { btn.disabled = true; btn.textContent = "入室処理中..."; }
    try {
      const ref = await _add(_col(_db, "trades"), tradeDoc);

    if (d.m) {
      await _add(_col(_db, "trades", ref.id, "messages"), {
        senderId: window.currentUser.uid,
        text: `【X合意ルーム開設】
条件メモ：${d.m}`,
        createdAt: _ts ? _ts() : new Date()
      });
    }

      closeXTradeJoinModal();
    } catch (err) {
      console.error(err);
      alert("取引ルーム作成エラー: " + (err.message || err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "この内容で取引ルームに入る"; }
    }
      if (typeof showToast === "function") showToast("取引ルームを作成しました！", "success");
      if (typeof window.openTrade === "function") {
        setTimeout(() => window.openTrade(ref.id), 300);
      }
    } catch (e) {
      console.error("confirmJoinXTrade error:", e);
      if (typeof showToast === "function") {
        showToast("ルーム作成に失敗しました: " + (e?.code || e?.message || ""), "error");
      }
    } finally {
      btn.disabled = false;
      btn.innerText = "🤝 この内容で取引ルームに入る";
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkIncomingXTrade, 700);
  });
})();
