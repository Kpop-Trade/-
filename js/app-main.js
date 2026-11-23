    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
    import { getFirestore, collection, collectionGroup, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp, increment, runTransaction, getCountFromServer, documentId } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";



    import { getMessaging, getToken, deleteToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

    const firebaseConfig = {
      apiKey: "AIzaSyBB1_QTcXpF0Ap72tDaf5_CCUtNBwSlXCs",
      authDomain: "illit-7ecd4.firebaseapp.com",
      projectId: "illit-7ecd4",
      storageBucket: "illit-7ecd4.firebasestorage.app",
      messagingSenderId: "1060277997826",
      appId: "1:1060277997826:web:e47d21d9edc538bb86321b"
    };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const rewardCalls = {
      claimDailyLoginBonus: httpsCallable(getFunctions(app, "asia-northeast1"), "claimDailyLoginBonus"),
      claimProfileOrInviteBonus: httpsCallable(getFunctions(app, "asia-northeast1"), "claimProfileOrInviteBonus"),
      enterRaffle: httpsCallable(getFunctions(app, "asia-northeast1"), "enterRaffle"),
      drawRaffleWinner: httpsCallable(getFunctions(app, "asia-northeast1"), "drawRaffleWinner", { timeout: 300000 }),
      setDoublePointDates: httpsCallable(getFunctions(app, "asia-northeast1"), "setDoublePointDates"),
      adminToggleDoublePoint: httpsCallable(getFunctions(app, "asia-northeast1"), "adminToggleDoublePoint"),
      adminCreateRaffle: httpsCallable(getFunctions(app, "asia-northeast1"), "adminCreateRaffle"),
      adminUploadRaffleImage: httpsCallable(getFunctions(app, "asia-northeast1"), "adminUploadRaffleImage", { timeout: 120000 })
    };
window.__autoGoRefs = {
  app, auth,
  db: getFirestore(app),
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, runTransaction,
  uploadAutoGoEvidence: httpsCallable(getFunctions(app, "asia-northeast1"), "uploadAutoGoEvidence", { timeout: 180000 }),
  registerAutoGoPurchase: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoPurchase", { timeout: 60000 }),
  reserveAutoGoEntry: httpsCallable(getFunctions(app, "asia-northeast1"), "reserveAutoGoEntry"),
  cancelAutoGoEntry: httpsCallable(getFunctions(app, "asia-northeast1"), "cancelAutoGoEntry"),
  registerAutoGoReveal: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoReveal"),
  registerAutoGoArrival: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoArrival"),
  registerAutoGoDelay: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoDelay"),
  registerAutoGoShipment: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoShipment"),
  registerAutoGoReceipt: httpsCallable(getFunctions(app, "asia-northeast1"), "registerAutoGoReceipt"),
  adminRemoveAutoGoEntry: httpsCallable(getFunctions(app, "asia-northeast1"), "adminRemoveAutoGoEntry"),
  adminInjectAutoGoDummies: httpsCallable(getFunctions(app, "asia-northeast1"), "adminInjectAutoGoDummies", { timeout: 120000 }),
  adminResetAutoGoTestPool: httpsCallable(getFunctions(app, "asia-northeast1"), "adminResetAutoGoTestPool", { timeout: 120000 }),
  adminSetAutoGoEntryLock: httpsCallable(getFunctions(app, "asia-northeast1"), "adminSetAutoGoEntryLock"),
  adminForceCancelAutoGoPool: httpsCallable(getFunctions(app, "asia-northeast1"), "adminForceCancelAutoGoPool", { timeout: 120000 }),
  adminReassignAutoGoMember: httpsCallable(getFunctions(app, "asia-northeast1"), "adminReassignAutoGoMember"),
  adminGetAutoGoAuditLogs: httpsCallable(getFunctions(app, "asia-northeast1"), "adminGetAutoGoAuditLogs"),
  adminSimAutoGoDummyPurchases: httpsCallable(getFunctions(app, "asia-northeast1"), "adminSimAutoGoDummyPurchases", { timeout: 300000 }),
  adminSimAutoGoDummyShipments: httpsCallable(getFunctions(app, "asia-northeast1"), "adminSimAutoGoDummyShipments", { timeout: 180000 }),
  adminSimAutoGoDummyReceipts: httpsCallable(getFunctions(app, "asia-northeast1"), "adminSimAutoGoDummyReceipts", { timeout: 180000 }),
  adminSimAutoGoDummyRevealPhase: httpsCallable(getFunctions(app, "asia-northeast1"), "adminSimAutoGoDummyRevealPhase", { timeout: 300000 }),
  adminRunAutoGoMatch: httpsCallable(getFunctions(app, "asia-northeast1"), "adminRunAutoGoMatch", { timeout: 300000 })
};

  
    const db = getFirestore(app);
    window.db = db;
    window.collection = collection;
    window.getDocs = getDocs; window.query = query; window.where = where; window.orderBy = orderBy; window.limit = limit; window.getDoc = getDoc; window.doc = doc; window.setDoc = setDoc; window.updateDoc = updateDoc; window.addDoc = addDoc; window.deleteDoc = deleteDoc; window.serverTimestamp = serverTimestamp;
    window.getDocs = getDocs;
    window.addDoc = addDoc;
    window.serverTimestamp = serverTimestamp;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const VAPID_KEY = "BDDp7KKSAF7CUspZG5J6wnkIqJlwgPaabfUnjuAQd8EcIgeiVj8zzazsy_O4Ick_t8w__7NasrngncK102c7wWg";
// PWA/モバイル判定
function isPwaOrMobile() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches 
                  || window.navigator.standalone === true
                  || document.referrer.includes('android-app://');
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return standalone || mobile;
}

// リダイレクト結果の処理
getRedirectResult(auth)
  .then((result) => {
    if (result && result.user) {
      console.log("Redirect login success:", result.user.uid);
      setTimeout(() => {
        if (typeof showToast === "function") showToast("ログインしました！", "success");
      }, 600);
    }
  })
  .catch((error) => {
    console.error("Redirect result error:", error);
    if (error.code === 'auth/account-exists-with-different-credential') {
      if (typeof window.openGoogleLoginHelp === "function") {
        window.openGoogleLoginHelp(error);
      }
    } else if (error.code && error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      if (typeof window.openGoogleLoginHelp === "function") {
        window.openGoogleLoginHelp(error);
      }
    }
  });
    const ADMIN_UIDS = ["Ay6VCS8HTgM3RqjDYZ0wKdHrSKz1", "GvVhAmT56GZjsWrl1YRaStB81im1"];
    function isAdmin() { return currentUser && ADMIN_UIDS.includes(currentUser.uid); }
    window.__isAutoGoAdmin = isAdmin;
    window.isAdmin = isAdmin;

    const MEMBERS = ["すべて", "ウォニ (Wonhee)", "ミンジュ (Minju)", "イロハ (Iroha)", "モカ (Moka)", "ユナ (Yuna)"];
    const KINDS = [
      { key: "all", label: "すべて" },
      { key: "card_exchange", label: "🃏 トレカ交換" },
      { key: "card_buy", label: "💳 トレカ買取" },
      { key: "card_sell", label: "💰 トレカ売却" },
      { key: "album", label: "💿 アルバム" },
      { key: "dearlit", label: "🎁 DEARLIT" },
      { key: "serial_exchange", label: "🎫 シリアル➡求" },
      { key: "serial_buy", label: "💳 シリアル買取" },
      { key: "serial_sell", label: "💰 シリアル売却" },
      { key: "group_buy", label: "🛍 共同購入" },
      { key: "likes", label: "♡ いいね" }
    ];
    const BUNDLE_FILTERS = [
      { key: "all", label: "すべて" }, { key: "only", label: "🔒 限定" },
      { key: "prefer", label: "⭐ 優先" }, { key: "ok", label: "🔗 可" }, { key: "ng", label: "🚫 不可" }
    ];
    const BUNDLE_LABEL = { only: "🔒 抱き合わせ限定", prefer: "⭐ 抱き合わせ優先", ok: "🔗 どちらでも可", ng: "🚫 単品のみ" };
    const BUNDLE_CLASS = { only: "bg-purple-100 border-purple-200 text-purple-700", prefer: "bg-pink-100 border-pink-200 text-pink-700", ok: "bg-green-100 border-green-200 text-green-700", ng: "bg-gray-100 border-gray-200 text-gray-500" };
    const CONDITION_LABEL = { s: "S：新品同様・未使用", a: "A：美品", b: "B：傷・汚れあり", c: "C：状態要確認" };
    const CONDITION_CLASS = { s: "bg-emerald-100 text-emerald-800 border-emerald-200", a: "bg-blue-100 text-blue-800 border-blue-200", b: "bg-amber-100 text-amber-800 border-amber-200", c: "bg-gray-100 text-gray-700 border-gray-200" };
    const INQUIRY_SUBJECT_LABEL = { bug: "不具合・バグ報告", account: "アカウント関連", report: "悪質ユーザー報告", other: "その他" };
    const CANCEL_REASON_LABEL = { no_contact: "相手から連絡がない", condition: "商品の状態が説明と違う", personal: "都合が悪くなった", other: "その他" };
    const SORT_OPTIONS = [{ key: "random", label: "ランダム順" }, { key: "new", label: "新着順" }, { key: "popular", label: "人気順" }];

    const PHOTO_FULL = { maxSide: 900, quality: 0.72, maxChars: 380000 };
    const PHOTO_THUMB = { maxSide: 260, quality: 0.6, maxChars: 40000 };
    const CHAT_PHOTO = { maxSide: 1000, quality: 0.75, maxChars: 600000 };
    const PROFILE_PHOTO = { maxSide: 300, quality: 0.72, maxChars: 90000 };
    const MAX_POST_PHOTOS = 3;
    const NOTIF_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
    const MAX_NOTIFICATIONS = 300;
    function notifCreatedMs(n) {
      const c = n && n.createdAt;
      if (typeof c === "number") return c;
      if (c && typeof c.toMillis === "function") return c.toMillis();
      if (c && typeof c.seconds === "number") return c.seconds * 1000;
      return 0;
    }
    function notifCategory(n) {
      if (!n) return "notice";
      if (n.category === "trade" || n.category === "notice" || n.category === "autogo") return n.category;
      const linkK = n.link && n.link.k;
      const targetType = n.target && n.target.type;
      const blob = String((n.title || "") + " " + (n.text || ""));
      if (linkK === "autogo" || targetType === "autogo" || /Auto-GO/i.test(blob)) return "autogo";
      if (n.type === "admin" || n.type === "card_list") return "notice";
      if (linkK === "trade" || targetType === "trade" || n.type === "trade") return "trade";
      if (/申し込み|発送完了|発送・|合意|取引が|メッセージ/.test(blob)) return "trade";
      return "notice";
    }
    function trimNotifications(list) {
      const now = Date.now();
      const kept = [];
      const src = Array.isArray(list) ? list : [];
      for (let i = 0; i < src.length; i++) {
        const n = src[i];
        if (!n) continue;
        const t = notifCreatedMs(n);
        if (t && now - t >= NOTIF_KEEP_MS) continue;
        kept.push(n);
        if (kept.length >= MAX_NOTIFICATIONS) break;
      }
      return kept;
    }
    function capNotifications(list) {
      if (!Array.isArray(list)) return list;
      const trimmed = trimNotifications(list);
      if (trimmed.length !== list.length) list.splice(0, list.length, ...trimmed);
      return list;
    }
    function safeHttpUrl(raw) {
      try {
        const u = new URL(String(raw || ""));
        if (u.protocol === "https:" || u.protocol === "http:") return u.href;
      } catch (e) {}
      return "";
    }

    const ILLIT_MEMBERS = ["ユナ", "ミンジュ", "モカ", "ウォニ", "イロハ", "OT5"];

const ILLIT_CARD_ALBUMS = [
  { id: "srm", name: "SUPER REAL ME", year: "2024", cards: [] },
  { id: "ily", name: "I'LL LIKE YOU", year: "2024", cards: [] },
  { id: "bomb", name: "bomb", year: "2025", cards: [] },
  { id: "jp1", name: "時よ止まれ", year: "2025", cards: [] },
  { id: "nca", name: "NOT CUTE ANYMORE", year: "2025", cards: [] },
  { id: "mamih", name: "MAMIHLAPINATAPAI", year: "2026", cards: [] },
  { id: "jp2", name: "I Got Your Back", year: "2026", cards: [] },
  { id: "be", name: "BREAK EVEN", year: "2026", cards: [] },
  { id: "glliter", name: "GLLITER DAY", year: "2026", cards: [] },
  { id: "other", name: "その他・特典", year: "", cards: [] }
];
window.ILLIT_CARD_ALBUMS = ILLIT_CARD_ALBUMS;




    const CARD_STATUS = { owned: "所持", none: "未所持", want: "欲しい" };
    const CARD_STATUS_CLASS = {
      owned: "bg-emerald-100 text-emerald-800 border-emerald-200",
      none: "bg-gray-100 text-gray-500 border-gray-200",
      want: "bg-pink-100 text-pink-700 border-pink-200"
    };

    let currentUser = null, allPosts = [], unsubPosts = null, selectedMember = "すべて", kindFilter = "all", sortFilter = "random", bundleFilter = "all", searchText = "", activeOnly = false, currentDetailIndex = -1; window.currentUser = currentUser; window.currentUser = currentUser; window.currentUser = currentUser;
    let pendingPostId = new URLSearchParams(location.search).get("post");
    let postMode = "exchange", postPhotos = [], processingPhotos = false, submittingPost = false, submittingGroup = false, detailPhotos = [], roomPhotos = [], roomPhotosFor = null;
    let sendingChatMessage = false, tradeActing = false, applyingToPost = false, submittingReview = false, submittingPriceOffer = false, submittingComment = false;

    /** 二重送信防止：ボタンをロックしてラベルを一時変更 */
    function setBusyButton(el, busy, busyLabel) {
      if (!el) return;
      if (busy) {
        if (el.dataset.idleLabel == null) el.dataset.idleLabel = (el.innerText || el.textContent || "").trim();
        el.disabled = true;
        el.setAttribute("aria-busy", "true");
        el.classList.add("is-busy");
        if (busyLabel) el.innerText = busyLabel;
      } else {
        el.disabled = false;
        el.removeAttribute("aria-busy");
        el.classList.remove("is-busy");
        if (el.dataset.idleLabel != null) {
          el.innerText = el.dataset.idleLabel;
          delete el.dataset.idleLabel;
        }
      }
    }
    function postsSkeletonHtml() {
      return `<div class="posts-status col-span-full w-full" aria-busy="true" aria-label="読み込み中">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          ${Array.from({ length: 6 }).map(() => `<div class="kp-skel-card"><div class="kp-skel aspect-square"></div><div class="p-2 space-y-2"><div class="kp-skel h-3" style="width:78%"></div><div class="kp-skel h-2.5" style="width:55%"></div></div></div>`).join("")}
        </div>
        <p class="text-center text-[12px] text-gray-500 font-medium mt-3">募集一覧を読み込み中...</p>
      </div>`;
    }
    function postsEmptyHtml(msg, hint) {
      return `<div class="posts-status kp-empty">
        <p class="text-sm font-bold text-gray-700">${msg || "まだ募集がありません"}</p>
        <p class="text-[12px] text-gray-500 mt-1.5 leading-relaxed">${hint || "条件を変えるか、右下の出品から投稿してみましょう"}</p>
      </div>`;
    }
    let myTrades = [], unsubTrades = null, groupJoins = {}, unsubJoins = null, currentTrade = null, roomMessages = [], unsubRoom = null, unsubMsgs = null, unsubTradeShipping = null, roomTradeShipping = {};
    let reviewState = { tradeId: null, done: null }, selectedRating = 0, sendingImage = false, roomBoxKey = null, userData = { profile: {}, blocked: [], likes: [], reads: {}, notifications: [], cancelHistory: [], myCards: {}, collectionPublic: false, customCards: [], cardWatch: {}, points: 0, pointHistory: [], inviteCode: "", loginStamps: [], lastLoginBonusDate: "", profileBonusGranted: false, referredBy: "" };
    let loginCalendarData = null;
    let dailyBonusRequestUid = null;
    let doublePointActive = false;
    let unsubUser = null, unsubNotifs = null, editingPostId = null, migratingLocal = false, photoCache = {};
    let notifTab = "all";
    let serverNotifs = [];
    let pendingProfilePhoto = null;
    let prevUnreadCount = -1;
    let prevTradeCountAsOwner = -1;
    let profileSection = "basic";
    let currentDetailId = null, submittingSerial = false;
    let roomActionsKey = null, cancellingTrade = false;
    let pendingExchangePostIndex = -1, pendingExchangeSubmission = null, exchangeImageUrls = [], submittingExchangeApply = false;
    let myCardsAlbum = "srm", myCardsMember = "ALL", myCardsTab = "own";
    let myCardsFilterMissingOnly = false;
    let myCardsFilterListingOnly = false;
    let cardPhotoCache = {}; // cardId -> jpeg dataURL
    let _binderShareDataUrl = "";

    let adminCardsAlbum = "srm";
    let adminCardsMember = "ALL"; // 管理画面のメンバー絞り込み
    let adminSelectedCardIds = new Set(); // 管理画面の複数選択削除用
    
    let catalogCardsCache = []; // 管理者が登録したカード {id, albumId, name, member}
    let catalogCardsLoaded = false;
    let selectedPostCard = null; // { id, name, member, albumId } | null
    let postCardAlbum = "srm";

    const STATUS_LABEL = { negotiating: "交渉中", shipping: "取引・発送中", completed: "完了", cancelled: "キャンセル" };
    const STATUS_CLASS = { negotiating: "bg-yellow-400 text-yellow-900 border-yellow-200", shipping: "bg-blue-400 text-white border-blue-300", completed: "bg-green-400 text-white border-green-300", cancelled: "bg-gray-300 text-gray-700 border-gray-200" };

    function escapeHtml(str) { return String(str ?? "").replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)); }
    function fmtTime(ts) {
      if (!ts || !ts.toDate) return "";
      const d = ts.toDate(); return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    function tsValue(ts) { return ts && ts.toMillis ? ts.toMillis() : Number.MAX_SAFE_INTEGER; }
    function tsMillis(ts) { return ts && ts.toMillis ? ts.toMillis() : 0; }
    function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    function isExpired(p) { return !!(p && p.deadline && p.deadline < todayStr()); }
    const JPEG_DATA_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
    function isJpegData(s) { return typeof s === "string" && s.length < 1000000 && JPEG_DATA_RE.test(s); }
    function isPayTrade(t) { return !!(t && (t.isBuy || t.isSell || t.kind === "group")); }
    function joinsOf(postId) { return groupJoins[postId] || []; }
    function needsCondition(kind) { return kind === "card" || kind === "album" || kind === "dearlit"; }

    // 申込者の配送先情報（お名前・郵便番号・住所）が登録済みか
    function hasShippingInfo() {
      const p = (typeof getMyShipping === "function" ? getMyShipping() : null) || getMyProfile() || {};
      return !!(p && p.name && p.zip && p.address1);
    }
    function requireShippingInfo() {
      if (hasShippingInfo()) return true;
      /* alert hidden */ console.log("申し込み・参加には、お名前・郵便番号・住所の登録が必要です。\n先に「住所・配送先」を登録してください。");
      closeDetailModal();
      openProfileModal("address");
      return false;
    }

    // 投稿をactive（出品中）に戻す共通処理
    async function restorePostToActive(postId, kind, applicantId, tradeIdOverride) {
        const targetTradeId = tradeIdOverride || (typeof currentTrade !== "undefined" && currentTrade && currentTrade.id) || null;
        const lpCheck = allPosts.find(x => x.id === postId);
        if (lpCheck && lpCheck.isBulk) {
          try {
            const postRef = doc(db, "posts", postId);
            await runTransaction(db, async (tx) => {
              const ps = await tx.get(postRef);
              if (!ps.exists()) return;
              const pData = ps.data();
              const slots = Array.isArray(pData.bulkSlots) ? pData.bulkSlots : [];
              const rolledBack = slots.map(s => (targetTradeId && s.tradeId === targetTradeId) ? { ...s, sold: false, tradeId: null } : s);
              tx.update(postRef, { bulkSlots: rolledBack, status: "active" });
              lpCheck.bulkSlots = rolledBack;
              lpCheck.status = "active";
            });
            renderPosts();
          } catch (e) { console.warn("bulk rollback error:", e); }
          return;
        }
      if (!postId) return;
      if (kind === "group") {
        // 共同購入は参加枠を戻すだけ（statusは触らない）
        if (!applicantId) return;
        try {
          await deleteDoc(doc(db, "posts", postId, "joins", applicantId));
          groupJoins[postId] = (groupJoins[postId] || []).filter(j => j.id !== applicantId);
          await updateDoc(doc(db, "posts", postId), { joinsCount: increment(-1) });
          const lg = allPosts.find(x => x.id === postId);
          if (lg && typeof lg.joinsCount === "number") { lg.joinsCount = Math.max(0, lg.joinsCount - 1); renderPosts(); }
        } catch (e) { console.warn("group joins clear warning:", e?.code || e); }
        return;
      }
      try {
        await updateDoc(doc(db, "posts", postId), { status: "active" });
        const lp = allPosts.find(x => x.id === postId);
        if (lp) { lp.status = "active"; renderPosts(); }
      } catch (e) {
        // 申込者側は権限で失敗することがある → 出品者側の自動復旧で戻る
        console.warn("restorePostToActive error:", e?.code || e);
      }
    }

    // 出品者側：取引が残っていないSOLD投稿を自動でactiveに戻す
    let tradesLoaded = false, healTimer = null;
    function scheduleHealSoldPosts() {
      if (!currentUser || !tradesLoaded) return;
      clearTimeout(healTimer);
      healTimer = setTimeout(healSoldPosts, 3000); // 申込直後の同期ズレ対策で3秒待つ
    }
    let healing = false;
    async function healSoldPosts() {
      if (!currentUser || !tradesLoaded || healing) return;
      const uid = currentUser.uid;
      const findTargets = (busy) => allPosts.filter(p => p.userId === uid && p.kind !== "group" && p.status === "traded" && !busy.has(p.id));
      const localBusy = new Set(myTrades.filter(t => t.status !== "cancelled").map(t => t.postId));
      if (findTargets(localBusy).length === 0) return;
      healing = true;
      try {
        // 同期ズレ対策：復旧の直前にサーバーから最新の取引一覧を取り直して再判定する
        const fresh = await getDocs(query(collection(db, "trades"), where("participants", "array-contains", uid)));
        const busy = new Set(fresh.docs.map(d => d.data()).filter(t => t.status !== "cancelled").map(t => t.postId));
        for (const p of findTargets(busy)) {
          try { await updateDoc(doc(db, "posts", p.id), { status: "active" }); p.status = "active"; renderPosts(); }
          catch (e) { console.warn("healSoldPosts error:", e?.code || e); }
        }
      } catch (e) { console.warn("healSoldPosts fetch error:", e?.code || e); }
      finally { healing = false; }
    }

    // 停止中アカウントの表示
    let unsubSusp = null;
    function subscribeSuspension() {
      if (unsubSusp) { unsubSusp(); unsubSusp = null; }
      if (!currentUser || isAdmin()) return;
      unsubSusp = onSnapshot(doc(db, "suspensions", currentUser.uid), (snap) => {
        const modal = document.getElementById("suspended-modal");
        if (snap.exists()) { document.getElementById("suspended-reason").innerText = snap.data().reason || "（理由の記載なし）"; modal.classList.remove("hidden"); }
        else modal.classList.add("hidden");
      }, (err) => console.warn("suspension snapshot error:", err?.code || err));
    }

    const SHARE_TYPE_LABEL = {
      card_exchange: "🃏 トレカ交換募集", card_buy: "💳 トレカ買取募集", card_sell: "💰 トレカ売却",
      album: "💿 アルバム", dearlit: "🎁 DEARLIT",
      serial_exchange: "🎫 シリアル交換募集", serial_buy: "💳 シリアル買取募集", serial_sell: "💰 シリアル売却",
      group_buy: "🛍 共同購入募集"
    };

    window.shareToX = function(text) {
      window.open("https://x.com/intent/tweet?text=" + encodeURIComponent(text), "_blank");
    };

    // ===== Xシェア：実際の投稿のような自然な文面 + 写真付き =====
    const SHARE_HEAD = { card_exchange: "交換", card_buy: "トレカ買取", card_sell: "トレカ売却", album: "アルバム売却", dearlit: "DEARLIT売却", serial_exchange: "シリアル交換", serial_buy: "シリアル買取", serial_sell: "シリアル売却", group_buy: "共同購入" };
    const SHARE_TAG = { card_exchange: "#交換", card_buy: "#買取", card_sell: "#譲渡", album: "#譲渡", dearlit: "#譲渡", serial_exchange: "#交換", serial_buy: "#買取", serial_sell: "#譲渡", group_buy: "#共同購入" };
    const SHARE_SHIPPING = { organizer: "送料は主催者負担", split: "送料は参加者で割り勘", self: "送料は各自負担" };
    function buildShareText(p, link) {
      const type = getPostTypeKey(p);
      const yen = "¥" + Number(p.price || 0).toLocaleString();
      const mem = (p.member && p.member !== "指定なし") ? p.member.split(" ")[0] : "";
      const memTag = mem ? "（" + mem + "）" : "";
      const L = ["ILLIT アイリット " + (SHARE_HEAD[type] || "交換")];
      if (type === "group_buy") {
        L.push(p.give + memTag, "", "🌟募集は" + p.target + "人のみ🌟", "");
        L.push("求 " + yen + (SHARE_SHIPPING[p.shipping] ? " ＋" + SHARE_SHIPPING[p.shipping] : ""));
        if (p.bundle && p.bundle !== "ng") L.push("※" + (BUNDLE_LABEL[p.bundle] || "").replace(/^\S+\s/, "") + (p.bundleNote ? "（" + p.bundleNote + "）" : ""));
        if (p.deadline) L.push("募集締切 " + p.deadline.slice(5).replace("-", "/"));
      } else if (p.isBuy) {
        L.push("", "求 " + p.give + memTag, "希望価格 " + yen);
      } else if (p.isSell) {
        L.push("", "譲 " + p.give + memTag, "価格 " + yen);
      } else {
        L.push("", "譲 " + p.give, "求 " + p.want);
        if (mem && !(p.give + p.want).includes(mem)) L.push("メンバー " + mem);
      }
      if (p.condition && CONDITION_LABEL[p.condition] && type !== "group_buy") {
        const c = CONDITION_LABEL[p.condition].split("：");
        L.push("状態 " + c[0] + "（" + (c[1] || "") + "）");
      }
      if (p.kind === "serial" && p.deadline) L.push("有効期限 " + p.deadline.slice(5).replace("-", "/"));
      if (p.description) L.push("", p.description);
      if (link) L.push("", "詳細・申込はこちら", link);
      L.push("", "#ILLIT #アイリット " + (SHARE_TAG[type] || "#交換"));
      return L.join("\n");
    }
    function dataUrlToFile(dataUrl, name) {
      const bin = atob(dataUrl.split(",")[1]);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new File([u8], name, { type: "image/jpeg" });
    }
    window.shareCurrentPost = async function() {
      const p = allPosts[currentDetailIndex]; if (!p) return;
      if (!currentUser || p.userId !== currentUser.uid) return;
      const link = location.origin + location.pathname + "?post=" + p.id;
      const text = buildShareText(p, link);
      // Xアプリが文面の一部を落としても貼り付けられるよう、全文をコピーしておく
      try { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
      const hasPhotos = p.kind !== "serial" && p.photoCount > 0;
      let photos = (currentDetailId === p.id && detailPhotos.length) ? detailPhotos : [];
      if (hasPhotos && photos.length === 0) { try { photos = await getPhotos(p.id); } catch (e) {} }
      // 写真つき：端末の共有シート経由で X アプリに文章と写真を渡す
      if (photos.length && navigator.share && navigator.canShare) {
        try {
          const files = photos.slice(0, 4).map((d, i) => dataUrlToFile(d, "illit_" + (i + 1) + ".jpg"));
          if (navigator.canShare({ files })) { await navigator.share({ text, files }); return; }
        } catch (e) { if (e && e.name === "AbortError") return; console.warn("share error:", e); }
      }
      if (hasPhotos) showToast("この端末では写真を自動添付できません。Xの投稿画面で写真を追加してください", "info");
      shareToX(text);
    };

    function appConfirm(message, yesLabel = "はい", danger = false) {
      return new Promise((resolve) => {
        try {
          const m = document.getElementById("app-confirm");
          const yes = document.getElementById("app-confirm-yes");
          const no = document.getElementById("app-confirm-no");
          const msgEl = document.getElementById("app-confirm-msg");
          if (!m || !yes || !no || !msgEl) {
            resolve(window.confirm(String(message || "")));
            return;
          }
          msgEl.textContent = message;
          yes.textContent = yesLabel;
          yes.className = "flex-1 text-white font-medium py-3 rounded-full transition text-sm shadow-md " + (danger ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-illit-purple to-illit-accent");
          const done = (v) => {
            m.classList.add("hidden");
            m.style.removeProperty("display");
            m.style.removeProperty("pointer-events");
            yes.onclick = null;
            no.onclick = null;
            resolve(v);
          };
          yes.onclick = () => done(true);
          no.onclick = () => done(false);
          m.classList.remove("hidden");
          // Auto-GO など z-index 10000 のモーダルの背面に隠れないよう最前面へ
          m.style.setProperty("z-index", "11000", "important");
          m.style.setProperty("display", "flex", "important");
          m.style.setProperty("pointer-events", "auto", "important");
        } catch (e) {
          console.error("appConfirm failed", e);
          resolve(window.confirm(String(message || "")));
        }
      });
    }
    window.appConfirm = appConfirm;

    function showToast(message, type = "info") {
      const container = document.getElementById("toast-container");
      if (!container) return;
      const toast = document.createElement("div");
      const colorMap = {
        success: "bg-gradient-to-r from-green-400 to-green-500 text-white border-green-300",
        error: "bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300",
        info: "bg-gradient-to-r from-illit-purple to-illit-accent text-white border-white/40"
      };
      toast.className = `pointer-events-auto px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-center border toast-enter ${colorMap[type] || colorMap.info}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-leave");
        setTimeout(() => toast.remove(), 260);
      }, 3400);
    }
    window.showToast = showToast;

    function addNotification(text, type = "info", target = null, category = null) {
      if (!currentUser) return;
      const item = { id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text, type, read: false, createdAt: Date.now(), target: target || null };
      item.category = category || notifCategory(item);
      const list = trimNotifications([item, ...(userData.notifications || [])]);
      userData.notifications = list;
      saveUserData({ notifications: list }).catch(() => {});
      updateNotifBadge();
    }

    function inboxNotifications() {
      return trimNotifications([...(userData.notifications || [])]).sort((a, b) => notifCreatedMs(b) - notifCreatedMs(a));
    }

    function updateNotifBadge() {
      const badge = document.getElementById("notif-badge");
      if (!badge) return;
      const unread = inboxNotifications().filter(n => !n.read).length;
      badge.innerText = unread > 99 ? "99+" : unread;
      badge.classList.toggle("hidden", unread === 0);
    }

    function paintNotifTabs(list) {
      const counts = { all: 0, trade: 0, notice: 0, autogo: 0 };
      list.forEach(n => {
        if (n.read) return;
        const c = notifCategory(n);
        counts.all += 1;
        if (counts[c] !== undefined) counts[c] += 1;
      });
      const labels = { all: "すべて", trade: "取引", notice: "お知らせ", autogo: "Auto-GO" };
      document.querySelectorAll("[data-notif-tab]").forEach(btn => {
        const tab = btn.dataset.notifTab;
        const on = tab === notifTab;
        const n = counts[tab] || 0;
        btn.textContent = n ? labels[tab] + " " + n : labels[tab];
        btn.className = "notif-tab shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border " + (on
          ? (tab === "autogo" ? "bg-purple-600 text-white border-purple-600" : "bg-gray-900 text-white border-gray-900")
          : "bg-white/70 text-gray-600 border-white");
      });
    }

    window.openPwaGuideModal = function() { document.getElementById("pwa-modal").classList.remove("hidden"); };
    window.closePwaGuideModal = function() {
      document.getElementById("pwa-modal").classList.add("hidden");
      try { localStorage.setItem("illit_pwa_guide_seen", "1"); } catch (_) {}
      if (typeof window.__runAfterTermsOnboarding === "function") {
        window.__runAfterTermsOnboarding();
      }
    };

    window.openNotificationsModal = function(tab) {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      if (tab === "all" || tab === "trade" || tab === "notice" || tab === "autogo") notifTab = tab;
      renderNotificationsList();
      document.getElementById("notifications-modal").classList.remove("hidden");
    };
    window.setNotifTab = function(tab) {
      if (tab !== "all" && tab !== "trade" && tab !== "notice" && tab !== "autogo") return;
      notifTab = tab;
      renderNotificationsList();
    };
    window.closeNotificationsModal = function() { document.getElementById("notifications-modal").classList.add("hidden"); };
    function renderNotificationsList() {
      const el = document.getElementById("notifications-list");
      if (!el) return;
      const all = inboxNotifications();
      paintNotifTabs(all);
      const list = notifTab === "all" ? all : all.filter(n => notifCategory(n) === notifTab);
      const emptyCopy = {
        all: "通知はありません",
        trade: "取引の通知はありません",
        notice: "お知らせはありません",
        autogo: "Auto-GOの購入URLや催促は、まだ届いていません"
      };
      if (list.length === 0) {
        el.innerHTML = '<p class="text-xs text-gray-500 text-center py-8 font-medium bg-white/30 rounded-xl">' + emptyCopy[notifTab] + '</p>';
        return;
      }
      el.innerHTML = list.map(n => {
        const ms = notifCreatedMs(n);
        const time = ms ? new Date(ms) : null;
        const timeStr = time ? ((time.getMonth()+1) + "/" + time.getDate() + " " + String(time.getHours()).padStart(2,"0") + ":" + String(time.getMinutes()).padStart(2,"0")) : "";
        const cat = notifCategory(n);
        const isAdminNotif = n.type === "admin" || cat === "notice";
        const purchaseUrl = safeHttpUrl(n.purchaseUrl || (n.link && n.link.purchaseUrl));
        const hasTarget = (n.target && n.target.type && n.target.id) || cat === "autogo";
        const catLabel = cat === "trade" ? "取引" : cat === "autogo" ? "Auto-GO" : "お知らせ";
        const catClass = cat === "trade" ? "text-pink-600" : cat === "autogo" ? "text-purple-700" : "text-amber-700";
        const urlBtn = purchaseUrl ? `<a href="${escapeHtml(purchaseUrl)}" target="_blank" rel="noopener" data-notif-url="1" class="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">購入URLを開く</a>` : "";
        return `<div data-notif-id="${escapeHtml(n.id)}" class="liquid-glass-input rounded-xl p-3 ${n.read ? "opacity-70" : (cat === "autogo" ? "border-purple-300 bg-purple-50/60" : isAdminNotif ? "border-amber-200 bg-amber-50/40" : "border-pink-200")} ${hasTarget ? "cursor-pointer" : ""}">
          <div class="flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-bold ${catClass} mb-0.5">${catLabel}${n.title ? " · " + escapeHtml(n.title) : ""}</div>
              <p class="text-xs font-medium text-gray-800 leading-relaxed">${escapeHtml(n.text)}</p>
              ${urlBtn}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${!n.read ? '<span class="w-2 h-2 rounded-full bg-pink-500"></span>' : ""}
              ${hasTarget ? '<span class="text-gray-400 text-sm">›</span>' : ""}
            </div>
          </div>
          <div class="text-[10px] text-gray-500 mt-1 font-medium">${timeStr}${hasTarget ? " · タップで開く" : ""}</div>
        </div>`;
      }).join("");
    }
    async function markOneNotificationRead(n) {
      if (!n || n.read) return;
      n.read = true;
      const list = (userData.notifications || []).map(x => x.id === n.id ? { ...x, read: true } : x);
      if (list.some(x => x.id === n.id)) {
        userData.notifications = list;
        saveUserData({ notifications: list }).catch(() => {});
      }
      const remote = (serverNotifs || []).find(x => x.id === n.id);
      if (remote) {
        remote.read = true;
        updateDoc(doc(db, "users", currentUser.uid, "notifications", n.id), { read: true }).catch(() => {});
      }
      updateNotifBadge();
    }
    window.handleNotificationClick = async function(notifId) {
      const n = inboxNotifications().find(x => x.id === notifId);
      if (!n) return;
      await markOneNotificationRead(n);
      closeNotificationsModal();
      const cat = notifCategory(n);
      const t = n.target || (n.link && n.link.k ? { type: n.link.k === "autogo" ? "autogo" : n.link.k, id: n.link.id } : null);
      if (cat === "autogo" || (t && t.type === "autogo")) {
        const poolId = (t && t.id) || (n.link && n.link.id) || "";
        if (poolId && typeof openAutoGoModal === "function") openAutoGoModal(poolId);
        return;
      }
      if (!t || !t.type) return;
      if (t.type === "trade" && t.id) {
        openTrade(t.id);
      } else if (t.type === "post" && t.id) {
        let i = allPosts.findIndex(x => x.id === t.id);
        if (i < 0) {
          try {
            const ps = await getDoc(doc(db, "posts", t.id));
            if (ps.exists()) { allPosts.push({ id: ps.id, ...ps.data() }); i = allPosts.length - 1; }
          } catch (e) {}
        }
        if (i >= 0) openDetailModal(i);
        else showToast("募集が見つかりませんでした", "error");
      }
    };
    window.markAllNotificationsRead = async function() {
      if (!currentUser) return;
      const list = (userData.notifications || []).map(n => ({ ...n, read: true }));
      userData.notifications = list;
      serverNotifs = (serverNotifs || []).map(n => ({ ...n, read: true }));
      try { await saveUserData({ notifications: list }); } catch(e) {}
      const unreadRemote = [];
      try {
        const snap = await getDocs(query(collection(db, "users", currentUser.uid, "notifications"), limit(200)));
        for (const d of snap.docs) {
          if (!d.data().read) unreadRemote.push(d.ref);
        }
        await Promise.all(unreadRemote.slice(0, 80).map(ref => updateDoc(ref, { read: true }).catch(() => {})));
      } catch (e) {}
      updateNotifBadge();
      renderNotificationsList();
    };
    document.getElementById("notifications-list")?.addEventListener("click", (e) => {
      if (e.target.closest("[data-notif-url]")) return;
      const card = e.target.closest("[data-notif-id]");
      if (!card) return;
      handleNotificationClick(card.dataset.notifId);
    });

    window.openFaq = function() { document.getElementById("faq-modal").classList.remove("hidden"); };
    window.closeFaq = function() { document.getElementById("faq-modal").classList.add("hidden"); };
    window.openPrivacy = function() { document.getElementById("privacy-modal").classList.remove("hidden"); };
    window.closePrivacy = function() { document.getElementById("privacy-modal").classList.add("hidden"); };
    window.openInquiry = function() {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      document.getElementById("inquiry-body").value = "";
      document.getElementById("inquiry-subject").value = "other";
      document.getElementById("inquiry-modal").classList.remove("hidden");
    };
    window.closeInquiry = function() { document.getElementById("inquiry-modal").classList.add("hidden"); };
    window.submitInquiry = async function() {
      if (!currentUser) return;
      const subject = document.getElementById("inquiry-subject").value;
      const body = document.getElementById("inquiry-body").value.trim();
      if (!body) return /* alert hidden */ console.log("内容を入力してください。");
      if (body.length < 10) return /* alert hidden */ console.log("もう少し詳しくご記入ください。");
      const btn = document.getElementById("inquiry-submit-btn");
      btn.disabled = true; btn.innerText = "送信中…";
      try {
        await addDoc(collection(db, "inquiries"), {
          userId: currentUser.uid, userName: getMyDisplayName(), subject, body, status: "open", replies: [], createdAt: serverTimestamp(),
          deviceId: getOrCreateDeviceId()
        });
        showToast("お問い合わせを送信しました。返信をお待ちください。", "success");
        closeInquiry();
      } catch (e) { /* alert hidden */ console.log("送信に失敗しました。"); }
      finally { btn.disabled = false; btn.innerText = "送信する"; }
    };

    function fillMyPageHeader() {
      const nameEl = document.getElementById("mypage-name");
      const avatar = document.getElementById("mypage-avatar");
      const placeholder = document.getElementById("mypage-avatar-placeholder");
      if (!nameEl) return;
      nameEl.innerText = currentUser ? getMyDisplayName() : "ゲスト";
      const photo = getMyProfile()?.photo;
      if (photo && isJpegData(photo)) {
        avatar.src = photo; avatar.classList.remove("hidden"); placeholder.classList.add("hidden");
      } else {
        avatar.classList.add("hidden"); placeholder.classList.remove("hidden");
      }
    }
    const formatJstDateParts = (date = new Date()) => Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(date).map(({ type, value }) => [type, value])
    );
    const formatRaffleDeadline = (value) => {
      const date = value?.toDate ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? "締切未設定" : date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    };
    window.openLoginCalendar = async function(animateToday = false) {
      if (!currentUser) return;
      if (!loginCalendarData) {
        try {
          const campaign = await getDoc(doc(db, "config", "pointCampaign"));
          loginCalendarData = {
            loginStamps: userData.loginStamps || [],
            doublePointDates: campaign.exists() && Array.isArray(campaign.data().doublePointDates)
              ? campaign.data().doublePointDates : [],
            doubleActive: campaign.exists() && campaign.data().doubleActive === true
          };
        } catch (e) {
          console.error("Login calendar load failed:", e);
          loginCalendarData = { loginStamps: userData.loginStamps || [], doublePointDates: [], doubleActive: false };
        }
      }
      const parts = formatJstDateParts();
      const year = Number(parts.year), month = Number(parts.month);
      const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const today = `${parts.year}-${parts.month}-${parts.day}`;
      const stamps = new Set(loginCalendarData.loginStamps || []);
      const doubleDates = new Set(loginCalendarData.doublePointDates || []);
      document.getElementById("login-calendar-title").textContent = `${year}年${month}月 ログインボーナス`;
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      let html = weekdays.map((day) => `<div class="text-center text-[10px] font-bold text-gray-500">${day}</div>`).join("");
      for (let blank = 0; blank < firstDay; blank++) html += '<div aria-hidden="true"></div>';
      for (let day = 1; day <= dayCount; day++) {
        const date = `${parts.year}-${parts.month}-${String(day).padStart(2, "0")}`;
        const isDouble = loginCalendarData.doubleActive === true || doubleDates.has(date);
        const isToday = date === today;
        const stamped = stamps.has(date);
        const stamp = isToday && animateToday ? "GET / 済" : (stamped ? "済" : "");
        html += `<div class="relative min-w-0 min-h-[58px] rounded-lg border p-1 text-center ${isDouble ? "border-amber-400 bg-amber-100 text-amber-900" : "border-purple-100 bg-white/70 text-gray-700"} ${isToday ? "ring-2 ring-purple-500" : ""}">
          <div class="text-[10px] font-bold">${day}</div><div class="text-[8px] leading-tight ${isDouble ? "font-black text-amber-800" : "text-gray-500"}">${isDouble ? "2倍! 20pt" : "10pt"}</div>
          ${stamp ? `<span id="${isToday && animateToday ? "login-today-stamp" : ""}" class="login-stamp absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border-2 border-pink-500 bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-pink-600 shadow">${escapeHtml(stamp)}</span>` : ""}
        </div>`;
      }
      document.getElementById("login-calendar-grid").innerHTML = html;
      document.getElementById("login-calendar-award").textContent = loginCalendarData.awarded
        ? `ログインボーナス +${loginCalendarData.pointsAdded}pt${loginCalendarData.isDoubleDay ? "（2倍デー）" : ""}獲得！`
        : "";
      document.getElementById("login-calendar-modal").classList.remove("hidden");
      if (animateToday) {
        setTimeout(() => document.getElementById("login-today-stamp")?.classList.add("login-stamp-pop"), 400);
      }
    };
    window.closeLoginCalendar = function() {
      document.getElementById("login-calendar-modal").classList.add("hidden");
    };
    window.renderRewards = async function() {
      const pointsCard = document.getElementById("points-card");
      pointsCard.classList.toggle("hidden", !currentUser);
      if (currentUser) {
        document.getElementById("points-balance").textContent = String(Number(userData.points) || 0);
        document.getElementById("mypage-invite-code").textContent = userData.inviteCode || "準備中";
        const parts = formatJstDateParts();
        const today = `${parts.year}-${parts.month}-${parts.day}`;
        const doubleToday = loginCalendarData?.doubleActive === true ||
          (loginCalendarData?.doublePointDates || []).includes(today);
        const loginButton = document.getElementById("login-bonus-claim-btn");
        const alreadyClaimed = userData.lastLoginBonusDate === today;
        loginButton.disabled = alreadyClaimed;
        loginButton.textContent = alreadyClaimed
          ? "本日のログインボーナス受取済み"
          : `ログインボーナスを受け取る（${doubleToday ? 20 : 10}pt）`;
        document.getElementById("login-stamp-week").innerHTML = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(Date.parse(`${today}T00:00:00Z`) - (6 - index) * 86400000).toISOString().slice(0, 10);
          const stamped = (userData.loginStamps || []).includes(date);
          return `<div class="rounded-lg border ${stamped ? "border-pink-300 bg-pink-50 text-pink-700" : "border-purple-100 bg-white/70 text-gray-400"} p-1 text-center">
            <div class="text-[9px] text-gray-500">${index + 1}日目</div><div class="text-sm font-black">${stamped ? "済" : "・"}</div>
          </div>`;
        }).join("");
        const profile = userData.profile || {};
        const profileComplete = !!(String(profile.nickname || "").trim() ||
          (String(profile.name || "").trim() && String(profile.zip || "").trim() && String(profile.address1 || "").trim()));
        document.getElementById("profile-bonus-status").textContent = userData.profileBonusGranted
          ? "プロフィール完成ボーナスは受取済みです"
          : profileComplete ? "プロフィール完成ボーナス：30pt" : "プロフィールを完成させると30pt獲得できます";
        const profileButton = document.getElementById("profile-bonus-claim-btn");
        profileButton.disabled = !!userData.profileBonusGranted || !profileComplete;
        profileButton.textContent = userData.profileBonusGranted
          ? "プロフィール完成ボーナス受取済み"
          : "プロフィール完成ボーナスを受け取る（30pt）";
        const invited = !!userData.referredBy;
        const inviteButton = document.getElementById("invite-bonus-submit-btn");
        document.getElementById("mypage-invite-code-input").disabled = invited;
        inviteButton.disabled = invited;
        inviteButton.classList.toggle("opacity-50", invited);
        document.getElementById("invite-bonus-status").textContent = invited
          ? "招待ボーナスは受取済みです"
          : "招待した方・された方にそれぞれ50pt付与されます。";
        const history = Array.isArray(userData.pointHistory) ? [...userData.pointHistory].reverse().slice(0, 20) : [];
        document.getElementById("point-history-list").innerHTML = history.length
          ? history.map((item) => {
            const at = item.at?.toDate ? item.at.toDate() : new Date(Number(item.at) || item.at || 0);
            const date = Number.isNaN(at.getTime()) ? "" : at.toLocaleString("ja-JP");
            const value = Number(item.points) || 0;
            return `<div class="flex justify-between gap-2"><span class="min-w-0 truncate">${escapeHtml(item.description || item.type || "ポイント")}</span><span class="shrink-0 font-bold ${value >= 0 ? "text-purple-700" : "text-red-600"}">${value > 0 ? "+" : ""}${value}pt <span class="font-normal text-gray-400">${escapeHtml(date)}</span></span></div>`;
          }).join("")
          : "履歴はありません";
      }
      const list = document.getElementById("raffle-list");
      try {
        const snapshot = await getDocs(collection(db, "raffles"));
        const active = snapshot.docs
          .map((raffle) => ({ id: raffle.id, ...raffle.data() }))
          .filter((raffle) => raffle.status === "active" &&
            (raffle.endsAt?.toMillis ? raffle.endsAt.toMillis() : new Date(raffle.endsAt).getTime()) > Date.now())
          .sort((a, b) => {
            const endTime = (raffle) => raffle.endsAt?.toMillis ? raffle.endsAt.toMillis() : new Date(raffle.endsAt).getTime();
            return endTime(a) - endTime(b);
          });
        if (!active.length) {
          list.innerHTML = '<p class="text-xs text-gray-500">現在開催中の抽選はありません。</p>';
          return;
        }
        const cards = await Promise.all(active.map(async (raffle) => {
          let myEntries = 0;
          if (currentUser) {
            const entries = await getDocs(query(
              collection(db, "raffles", raffle.id, "entries"), where("userId", "==", currentUser.uid)
            ));
            myEntries = entries.size;
          }
          const costPoints = Number(raffle.costPoints ?? 100);
          return `<article class="overflow-hidden rounded-xl border border-white bg-white/70">
            ${raffle.imageUrl ? `<img src="${escapeHtml(raffle.imageUrl)}" alt="" loading="lazy" class="max-h-56 w-full object-contain bg-white">` : ""}
            <div class="space-y-2 p-3"><h4 class="break-words font-bold text-sm text-gray-900">${escapeHtml(raffle.title || "トレカ抽選")}</h4>
            <p class="break-words text-xs text-gray-600">${escapeHtml(raffle.prizeDescription || "")}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600"><span>締切：${escapeHtml(formatRaffleDeadline(raffle.endsAt))}</span><span>当選：${Number(raffle.winnerCount) || 0}人</span><span>応募口数：${myEntries}口</span></div>
            <button type="button" data-raffle-enter="${escapeHtml(raffle.id)}" ${currentUser ? "" : "disabled"} class="w-full rounded-full bg-purple-600 py-2.5 text-xs font-bold text-white disabled:bg-gray-300">${currentUser ? `${costPoints}ptで1口応募` : "ログインして応募"}</button></div>
          </article>`;
        }));
        list.innerHTML = cards.join("");
      } catch (e) {
        console.error("Raffle list load failed:", e);
        list.innerHTML = '<p class="text-xs text-red-600">抽選を読み込めませんでした。</p>';
      }
    };
    document.getElementById("raffle-list").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-raffle-enter]");
      if (!button || !currentUser) return;
      button.disabled = true;
      try {
        const result = await rewardCalls.enterRaffle({ raffleId: button.dataset.raffleEnter });
        userData.points = Number(result.data.totalPoints) || 0;
        document.getElementById("points-balance").textContent = String(userData.points);
        showToast("抽選に1口応募しました", "success");
        await window.renderRewards();
      } catch (e) {
        console.error("Raffle entry failed:", e);
        showToast(e?.code === "functions/failed-precondition" ? "ポイント不足または応募期間外です" : "応募に失敗しました", "error");
      } finally {
        button.disabled = false;
      }
    });
    window.claimDailyLoginBonus = async function() {
      if (!currentUser) return;
      const button = document.getElementById("login-bonus-claim-btn");
      button.disabled = true;
      try {
        const { data } = await rewardCalls.claimDailyLoginBonus();
        loginCalendarData = data;
        userData.points = Number(data.totalPoints) || 0;
        userData.loginStamps = Array.isArray(data.loginStamps) ? data.loginStamps : [];
        userData.lastLoginBonusDate = data.lastLoginBonusDate || userData.lastLoginBonusDate;
        document.getElementById("points-balance").textContent = String(userData.points);
        if (data.awarded) {
          showToast(`ログインボーナス +${data.pointsAdded}pt獲得！`, "success");
          window.openLoginCalendar(true);
        } else {
          showToast("本日のログインボーナスは受取済みです", "info");
        }
        await window.renderRewards();
      } catch (e) {
        console.error("Daily login bonus claim failed:", e);
        showToast("ログインボーナスを受け取れませんでした", "error");
        button.disabled = false;
      }
    };
    window.claimProfileOrInviteBonus = async function() {
      if (!currentUser) return;
      try {
        const { data } = await rewardCalls.claimProfileOrInviteBonus({});
        userData.points = Number(data.totalPoints);
        userData.inviteCode = data.inviteCode || userData.inviteCode;
        userData.profileBonusGranted = userData.profileBonusGranted || data.profileAwarded;
        userData.referredBy = data.referredBy || userData.referredBy;
        showToast(data.profileAwarded ? "プロフィール完成ボーナス +30pt！" : "プロフィールを完成するとボーナスを受け取れます", data.profileAwarded ? "success" : "info");
        await window.renderRewards();
      } catch (e) {
        console.error("Profile bonus claim failed:", e);
        showToast("プロフィールボーナスを受け取れませんでした", "error");
      }
    };
    window.claimInviteBonus = async function(event) {
      event.preventDefault();
      if (!currentUser) return;
      const input = document.getElementById("mypage-invite-code-input");
      const inviteCode = input.value.trim().toUpperCase();
      if (!inviteCode) return showToast("招待コードを入力してください", "error");
      try {
        const { data } = await rewardCalls.claimProfileOrInviteBonus({ inviteCode });
        userData.points = Number(data.totalPoints);
        userData.inviteCode = data.inviteCode || userData.inviteCode;
        userData.referredBy = data.referredBy || userData.referredBy;
        if (data.inviteAwarded) {
          input.value = "";
          showToast("招待ボーナス +50ptを受け取りました", "success");
        } else {
          showToast(data.alreadyInvited ? "招待ボーナスは受取済みです" : "招待ボーナスの対象ではありません", "info");
        }
        await window.renderRewards();
      } catch (e) {
        console.error("Invite bonus claim failed:", e);
        showToast(e?.code === "functions/not-found" ? "招待コードが見つかりません" : "招待ボーナスを受け取れませんでした", "error");
      }
    };
    window.openMyPage = function() { switchTab('mypage'); };
    window.closeMyPage = function() { switchTab('home'); };

    window.switchTab = function(tab) {
      closeDetailModal();
    if (!currentUser && (tab === "post" || tab === "mycards" || tab === "mypage")) { if (typeof showToast === "function") { showToast("ログインしてください", "error"); } else { alert("ログインしてください"); } return; }
      if ((tab === 'mycards' || tab === 'mypage') && !currentUser) {
        /* alert hidden */ console.log("ログインが必要です。");
        return;
      }
      const showList = tab === 'home' || tab === 'likes';
      document.getElementById("post-menu-section").classList.toggle("hidden", tab !== 'post');
      document.getElementById("post-list-section").classList.toggle("hidden", !showList);
      document.getElementById("intro-section").classList.toggle("hidden", tab !== 'home' && tab !== 'likes');
      const hub = document.getElementById("gllit-hub");
      if (hub) hub.classList.toggle("hidden", tab !== "home");
      const mycardsSec = document.getElementById("mycards-section");
      const mypageSec = document.getElementById("mypage-section");
      const adminSec = document.getElementById("admin-section");
      if (mycardsSec) mycardsSec.classList.toggle("hidden", tab !== 'mycards');
      if (mypageSec) mypageSec.classList.toggle("hidden", tab !== 'mypage');
      if (adminSec) adminSec.classList.toggle("hidden", tab !== 'admin');
      const fab = document.getElementById("sell-fab");
      fab.classList.toggle("hidden", tab !== 'post');
      fab.classList.toggle("flex", tab === 'post');
      if (tab === 'post') renderSellTab();
      if (tab === 'mypage') {
        fillMyPageHeader();
        window.renderRewards();
      }
      if (tab === 'mycards') openMyCardsPage();

      const setNav = (id, on, activeColor) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("bg-white/70", on);
        el.classList.toggle("shadow-sm", on);
        el.classList.toggle(activeColor || "text-illit-darkPurple", on);
        el.classList.toggle("text-gray-500", !on);
      };
      setNav("nav-home", tab === 'home');
      setNav("nav-likes", tab === 'likes', "text-pink-500");
      setNav("nav-post", tab === 'post');
      setNav("nav-mycards", tab === 'mycards');
      setNav("nav-mypage", tab === 'mypage');

      if (tab === 'likes') {
        kindFilter = 'likes';
        document.getElementById("list-section-title").innerText = "♡ いいねした募集";
        renderFilters(); renderPosts();
      } else if (tab === 'home') {
        kindFilter = 'all';
        document.getElementById("list-section-title").innerText = "最新の募集";
        renderFilters(); renderPosts();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof window.syncNavGlass === "function") window.syncNavGlass();
    };

    function getOrCreateDeviceId() {
      let did = localStorage.getItem("illit_device_id");
      if (!did) { did = "dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36); localStorage.setItem("illit_device_id", did); }
      return did;
    }
    async function checkDeviceLock() {
      if (!currentUser || isAdmin()) return true;
      try {
        const deviceId = getOrCreateDeviceId();
        // 端末BANチェック
        try {
          const banSnap = await getDoc(doc(db, "deviceBans", deviceId));
          if (banSnap.exists()) {
            showToast("この端末は利用が制限されています", "error");
            return false;
          }
        } catch (_) {}
        const ref = doc(db, "devices", deviceId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { uid: currentUser.uid, updatedAt: serverTimestamp() });
          return true;
        }
        if (snap.data().uid === currentUser.uid) {
          try { await updateDoc(ref, { updatedAt: serverTimestamp() }); } catch (_) {}
          return true;
        }
        showToast("この端末は別のアカウントで登録されています", "error");
        return false;
      } catch (e) {
        console.warn("checkDeviceLock error:", e);
        return true;
      }
    }

    async function logAdminAction(action, target, detail) {
      if (!currentUser || !isAdmin()) return;
      try {
        await addDoc(collection(db, "adminLogs"), {
          action: String(action || ""),
          target: String(target || ""),
          detail: String(detail || "").slice(0, 500),
          by: currentUser.uid,
          byName: getMyDisplayName(),
          createdAt: serverTimestamp()
        });
      } catch (e) { console.warn("admin log failed", e); }
    }

    async function loadSiteAnnouncement() {
      try {
        const snap = await getDoc(doc(db, "siteConfig", "announcement"));
        const box = document.getElementById("site-announcement");
        const textEl = document.getElementById("site-announcement-text");
        if (!box || !textEl) return;
        if (snap.exists() && snap.data().active && (snap.data().text || "").trim()) {
          textEl.textContent = String(snap.data().text || "");
          box.classList.remove("hidden");
        } else {
          box.classList.add("hidden");
        }
      } catch (e) { console.warn("announce load", e); }
    }
    function saveUserData(data) { return setDoc(doc(db, "users", currentUser.uid), data, { merge: true }); }

    // ===== 配送先個人情報（非公開サブコレクション） =====
    const SHIPPING_PII_KEYS = ["name", "zip", "address1", "address2", "phone"];
    function shippingPrivateRef(uid) {
      return doc(db, "users", uid || currentUser.uid, "private", "shipping");
    }
    function tradeShippingRef(tradeId, uid) {
      return doc(db, "trades", tradeId, "shipping", uid);
    }
    function pickShippingFields(source) {
      const out = {};
      SHIPPING_PII_KEYS.forEach((key) => {
        if (source && source[key] != null && String(source[key]).length) out[key] = String(source[key]);
        else if (source && source[key] === "") out[key] = "";
      });
      return out;
    }
    function stripShippingFromProfile(profile) {
      const next = { ...(profile || {}) };
      SHIPPING_PII_KEYS.forEach((key) => { delete next[key]; });
      return next;
    }
    function mergeShippingIntoLocalProfile(shipping) {
      if (!userData.profile) userData.profile = {};
      userData.shipping = { ...(shipping || {}) };
      SHIPPING_PII_KEYS.forEach((key) => {
        if (shipping && shipping[key] != null) userData.profile[key] = shipping[key];
      });
    }
    async function loadPrivateShipping(uid) {
      const targetUid = uid || currentUser?.uid;
      if (!targetUid) return {};
      try {
        const snap = await getDoc(shippingPrivateRef(targetUid));
        return snap.exists() ? (snap.data() || {}) : {};
      } catch (e) {
        console.warn("private shipping read:", e?.code || e);
        return {};
      }
    }
    async function savePrivateShipping(fields) {
      if (!currentUser) return;
      const payload = {
        ...pickShippingFields(fields),
        updatedAt: serverTimestamp()
      };
      await setDoc(shippingPrivateRef(currentUser.uid), payload, { merge: true });
      mergeShippingIntoLocalProfile(payload);
    }
    async function migratePublicProfileShippingIfNeeded(profile) {
      if (!currentUser || !profile) return profile || {};
      const hasPublicPii = SHIPPING_PII_KEYS.some((key) => String(profile[key] || "").trim());
      if (!hasPublicPii) return profile;
      try {
        const existing = await loadPrivateShipping(currentUser.uid);
        const hasPrivate = SHIPPING_PII_KEYS.some((key) => String(existing[key] || "").trim());
        if (!hasPrivate) {
          await setDoc(shippingPrivateRef(currentUser.uid), {
            ...pickShippingFields(profile),
            migratedFromProfileAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        const cleaned = stripShippingFromProfile(profile);
        await saveUserData({ profile: cleaned });
        return cleaned;
      } catch (e) {
        console.warn("shipping migration:", e?.code || e);
        return profile;
      }
    }
    async function clearTradeShippingDocs(tradeId) {
      if (!tradeId) return;
      try {
        const snap = await getDocs(collection(db, "trades", tradeId, "shipping"));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      } catch (e) {
        console.warn("clear trade shipping:", e?.code || e);
      }
    }
    window.loadPrivateShipping = loadPrivateShipping;
    window.savePrivateShipping = savePrivateShipping;
    window.clearTradeShippingDocs = clearTradeShippingDocs;
    window.pickShippingFields = pickShippingFields;
    function updateUserAvatar() {
      const avatar = document.getElementById("user-avatar");
      if (!avatar) return;
      const photo = getMyProfile()?.photo;
      if (photo && isJpegData(photo)) {
        avatar.src = photo; avatar.classList.remove("hidden");
      } else {
        avatar.classList.add("hidden"); avatar.removeAttribute("src");
      }
    }
    function subscribeUserData() {
      if (unsubUser) unsubUser();
      const ref = doc(db, "users", currentUser.uid);
      unsubUser = onSnapshot(ref, (snap) => {
        const d = snap.exists() ? snap.data() : {};
        if (d.migrated === undefined && !migratingLocal) {
          migratingLocal = true;
          const read = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k + currentUser.uid)); return v ?? def; } catch(e){ return def; } };
          const localProfile = read("illit_profile_", {});
          const firestoreProfile = d.profile && typeof d.profile === "object" ? d.profile : {};
          // Firestoreに既に中身がある場合は絶対に潰さない。空のときだけlocalStorageから補完
          const p = Object.keys(firestoreProfile).length > 0
            ? firestoreProfile
            : (localProfile && Object.keys(localProfile).length > 0 ? localProfile : firestoreProfile);
          const b = (d.blocked && d.blocked.length > 0) ? d.blocked : read("illit_blocked_", []);
          const l = (d.likes && d.likes.length > 0) ? d.likes : read("illit_likes_", []);
          const payload = { migrated: true, blocked: b, likes: l };
          // profileは中身があるときだけ書く（空オブジェクトで上書きしない）
          if (p && Object.keys(p).length > 0) payload.profile = p;
          setDoc(ref, payload, { merge: true }).finally(() => migratingLocal = false);
        }
        const storedNotifs = trimNotifications(d.notifications || []);
        if (Array.isArray(d.notifications) && storedNotifs.length !== d.notifications.length) {
          saveUserData({ notifications: storedNotifs }).catch(() => {});
        }
        userData = { profile: d.profile || {}, blocked: d.blocked || [], likes: d.likes || [], reads: d.reads || {}, notifications: storedNotifs, cancelHistory: d.cancelHistory || [], myCards: d.myCards || {}, collectionPublic: !!d.collectionPublic, customCards: Array.isArray(d.customCards) ? d.customCards : [], cardWatch: d.cardWatch && typeof d.cardWatch === "object" ? d.cardWatch : {}, shipping: userData.shipping || {}, points: Number(d.points) || 0, pointHistory: Array.isArray(d.pointHistory) ? d.pointHistory : [], inviteCode: d.inviteCode || "", loginStamps: Array.isArray(d.loginStamps) ? d.loginStamps : [], lastLoginBonusDate: d.lastLoginBonusDate || "", profileBonusGranted: !!d.profileBonusGranted, referredBy: d.referredBy || "" };
        if (currentUser) {
          document.getElementById("user-name").innerText = getMyDisplayName();
          updateUserAvatar();
        }
        syncTermsRecord(d);
        const adminBtn = document.getElementById("admin-panel-btn"); if (adminBtn) adminBtn.classList.toggle("hidden", !isAdmin());
        renderPosts(); renderBlockedBox(); updateBadge(); updateNotifBadge();
        if (!document.getElementById("mypage-section").classList.contains("hidden")) window.renderRewards();
        if (!document.getElementById("login-calendar-modal").classList.contains("hidden")) {
          loginCalendarData = { ...(loginCalendarData || {}), loginStamps: userData.loginStamps };
        }
        if (!document.getElementById("trades-modal").classList.contains("hidden")) renderTradesList();
        if (!document.getElementById("wallet-modal").classList.contains("hidden")) renderWallet();
        if (!document.getElementById("notifications-modal").classList.contains("hidden")) renderNotificationsList();
        // 公開プロフィールから配送先PIIを分離し、非公開サブコレクションをローカルへマージ
        (async () => {
          try {
            const cleaned = await migratePublicProfileShippingIfNeeded(userData.profile || {});
            userData.profile = cleaned;
            const shipping = await loadPrivateShipping(currentUser.uid);
            mergeShippingIntoLocalProfile(shipping);
            if (!document.getElementById("mypage-section").classList.contains("hidden")) window.renderRewards();
          } catch (e) {
            console.warn("private shipping hydrate:", e?.code || e);
          }
        })();
      }, (err) => console.warn("user snapshot error:", err?.code || err));
      subscribeNotifInbox();
    }
    function mapServerNotif(d) {
      const x = d.data() || {};
      const link = x.link || null;
      const purchaseUrl = safeHttpUrl((link && link.purchaseUrl) || x.purchaseUrl);
      const item = {
        id: d.id,
        text: x.text || "",
        type: x.type || "info",
        title: x.title || "",
        link,
        purchaseUrl: purchaseUrl || null,
        read: !!x.read,
        createdAt: notifCreatedMs(x) || Date.now(),
        target: link && link.k === "autogo" ? { type: "autogo", id: link.id } : (link && link.k === "trade" ? { type: "trade", id: link.id } : null)
      };
      item.category = x.category || notifCategory(item);
      return item;
    }
    function absorbServerNotifs(items) {
      const incoming = (items || []).filter(n => {
        const c = notifCategory(n);
        if (c === "autogo") return true;
        if (c === "trade" && !(n.link && n.link.k)) return true;
        return false;
      });
      if (!incoming.length || !currentUser) return;
      const list = [...(userData.notifications || [])];
      let changed = false;
      incoming.forEach(n => {
        if (list.some(x => x.id === n.id)) return;
        list.unshift({
          id: n.id,
          text: n.text,
          type: n.type,
          title: n.title || "",
          category: notifCategory(n),
          link: n.link || null,
          purchaseUrl: n.purchaseUrl || null,
          target: n.target || null,
          read: !!n.read,
          createdAt: notifCreatedMs(n) || Date.now()
        });
        changed = true;
      });
      if (!changed) return;
      const trimmed = trimNotifications(list);
      userData.notifications = trimmed;
      saveUserData({ notifications: trimmed }).catch(() => {});
      updateNotifBadge();
    }
    function subscribeNotifInbox() {
      if (!currentUser) return;
      if (unsubNotifs) unsubNotifs();
      const colRef = collection(db, "users", currentUser.uid, "notifications");
      const apply = (snap) => {
        serverNotifs = snap.docs.map(mapServerNotif);
        absorbServerNotifs(serverNotifs);
        updateNotifBadge();
        const modal = document.getElementById("notifications-modal");
        if (modal && !modal.classList.contains("hidden")) renderNotificationsList();
      };
      const fallback = () => {
        if (unsubNotifs) unsubNotifs();
        unsubNotifs = onSnapshot(query(colRef, limit(200)), apply, (err2) => {
          console.warn("notif inbox", err2?.code || err2);
          serverNotifs = [];
        });
      };
      unsubNotifs = onSnapshot(query(colRef, orderBy("createdAt", "desc"), limit(200)), apply, (err) => {
        console.warn("notif inbox order", err?.code || err);
        fallback();
      });
    }
    // 共同購入の参加者は、詳細を開いたときにその投稿の分だけ取得
    const joinsFresh = {};
    async function loadJoins(postId) {
      try {
        const snap = await getDocs(collection(db, "posts", postId, "joins"));
        groupJoins[postId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("joins load error:", e?.code || e); }
    }

    let adminTab = "stats";
    let adminSearchQuery = "";

    const ADMIN_ALLOWED_ACTIONS = ["adminSendWarning", "adminSuspendUser", "adminUnsuspendUser", "adminDeletePost", "adminForceCancelTrade", "deleteReportedPost", "markInquiryDone", "copyText", "adminFixLikes", "adminFixAllLikes", "adminReplyUser", "adminOpenUserDetail", "adminHidePost", "adminUnhidePost", "adminBanDevice", "adminUnbanDevice", "adminReplyInquiry", "adminReplyReport"];
    window.copyText = function(t) { navigator.clipboard.writeText(String(t || "")).catch(() => {}); };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b || !isAdmin()) return;
      // 管理画面内の data-act のみ
      if (!b.closest("#admin-content, #admin-user-detail-modal, #admin-section")) return;
      const fn = b.dataset.act; if (!ADMIN_ALLOWED_ACTIONS.includes(fn) || typeof window[fn] !== "function") return;
      window[fn](b.dataset.a1, b.dataset.a2);
    });

    window.openAdminModal = function() { 
      if (!isAdmin()) return; 
      // 通常ページとして開く（浮きモーダルにしない）
      switchTab('admin');
      switchAdminTab(adminTab || 'stats');
    };
    
    window.closeAdminModal = function() { 
      const adminSec = document.getElementById("admin-section");
      if (adminSec) adminSec.classList.add("hidden");
      switchTab('home');
    };

    window.switchAdminTab = function(tab) {
      adminTab = tab;
      adminSearchQuery = "";
      const tabs = ["reports", "inquiries", "users", "posts", "trades", "stats", "likes", "broadcast", "cards", "logs", "autogo", "rewards"];
      tabs.forEach((k) => {
        const el = document.getElementById("admin-tab-" + k);
        if (el) {
          if (tab === k) {
            el.classList.remove("border-transparent", "text-gray-500");
            el.classList.add("border-illit-darkPurple", "text-illit-darkPurple");
          } else {
            el.classList.add("border-transparent", "text-gray-500");
            el.classList.remove("border-illit-darkPurple", "text-illit-darkPurple");
          }
        }
      });

      const controls = document.getElementById("admin-controls");
      const rewardsPanel = document.getElementById("admin-rewards-panel");
      const adminContent = document.getElementById("admin-content");
      rewardsPanel.classList.toggle("hidden", tab !== "rewards");
      adminContent.classList.toggle("hidden", tab === "rewards");
      if (tab === "users" || tab === "posts" || tab === "trades") {
        controls.innerHTML = `<input type="text" placeholder="名前, UID, またはキーワードで検索..." oninput="adminSearch(this.value)" class="liquid-glass-input w-full rounded-xl p-2.5 text-xs text-gray-800">`;
        controls.classList.remove("hidden");
      } else if (tab === "cards") {
        // アルバムタブはコンテンツ内に描画（外枠の出し入れでレイアウトがズレないように）
        controls.innerHTML = "";
        controls.classList.add("hidden");
      } else {
        controls.classList.add("hidden");
        controls.innerHTML = "";
      }

      if (tab === "rewards") {
        window.renderAdminRewards();
        return;
      }
      loadAdminData();
    };

    window.renderAdminRewards = async function() {
      if (!isAdmin()) return;
      try {
        const [campaign, raffles] = await Promise.all([
          getDoc(doc(db, "config", "pointCampaign")), getDocs(collection(db, "raffles"))
        ]);
        doublePointActive = campaign.exists() && campaign.data().doubleActive === true;
        const toggle = document.getElementById("double-point-toggle");
        toggle.textContent = doublePointActive ? "2倍デー：ON" : "2倍デー：OFF";
        toggle.className = `shrink-0 rounded-full px-3 py-2 text-xs font-bold ${doublePointActive ? "bg-amber-200 text-amber-900" : "bg-gray-200 text-gray-700"}`;
        const dates = campaign.exists() && Array.isArray(campaign.data().doublePointDates)
          ? campaign.data().doublePointDates : [];
        document.getElementById("double-point-date-list").innerHTML = dates.length
          ? dates.map((date) => `<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-900">${escapeHtml(date)}<button type="button" aria-label="削除" onclick="removeDoublePointDate('${escapeHtml(date)}')" class="font-bold">×</button></span>`).join("")
          : '<span class="text-gray-500">設定なし</span>';
        const records = raffles.docs.map((raffle) => ({ id: raffle.id, ...raffle.data() }));
        document.getElementById("admin-raffle-list").innerHTML = records.length
          ? records.map((raffle) => `<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 p-2"><span class="min-w-0 flex-1 break-words">${escapeHtml(raffle.title || "トレカ抽選")}・${escapeHtml(raffle.status || "")}（${Number(raffle.entriesCount) || 0}口）</span>${raffle.status === "active" ? `<button type="button" onclick="drawRaffle('${escapeHtml(raffle.id)}')" class="shrink-0 rounded-full bg-pink-600 px-3 py-1.5 font-bold text-white">当選確定</button>` : ""}</div>`).join("")
          : '<p class="text-gray-500">抽選はありません。</p>';
      } catch (e) {
        console.error("Admin reward data load failed:", e);
        document.getElementById("double-point-date-list").textContent = "設定を読み込めませんでした";
        document.getElementById("admin-raffle-list").textContent = "抽選を読み込めませんでした";
      }
    };
    window.toggleDoublePointDay = async function() {
      try {
        const { data } = await rewardCalls.adminToggleDoublePoint({ doubleActive: !doublePointActive });
        doublePointActive = data.doubleActive;
        loginCalendarData = null;
        await window.renderAdminRewards();
        showToast(data.doubleActive ? "ポイント2倍デーを有効にしました" : "ポイント2倍デーを無効にしました", "success");
      } catch (e) {
        console.error("Double point toggle failed:", e);
        showToast("ポイント2倍デーを切り替えできませんでした", "error");
      }
    };
    window.addDoublePointDate = async function() {
      const date = document.getElementById("double-point-date-input").value;
      if (!date) return showToast("日付を選択してください", "error");
      await updateDoublePointDates(date, false);
    };
    window.removeDoublePointDate = async function(date) { await updateDoublePointDates(date, true); };
    async function updateDoublePointDates(date, remove) {
      try {
        const snap = await getDoc(doc(db, "config", "pointCampaign"));
        const dates = snap.exists() && Array.isArray(snap.data().doublePointDates)
          ? snap.data().doublePointDates : [];
        const next = remove ? dates.filter((item) => item !== date) : [...new Set([...dates, date])].sort();
        await rewardCalls.setDoublePointDates({ doublePointDates: next });
        loginCalendarData = null;
        await window.renderAdminRewards();
        showToast(remove ? "ポイント2倍デーを削除しました" : "ポイント2倍デーを設定しました", "success");
      } catch (e) {
        console.error("Double point date update failed:", e);
        showToast("ポイント2倍デーを更新できませんでした", "error");
      }
    }
    window.createRaffleFromAdmin = async function(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const imageFile = document.getElementById("raffle-image-input").files?.[0];
        const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/apng", "image/avif", "image/heic", "image/heif"];
        if (!imageFile || !supportedImageTypes.includes(imageFile.type.toLowerCase())) {
          throw new Error("JPEG・PNG・WebP・GIFなどの画像を選択してください");
        }
        if (imageFile.size > 4 * 1024 * 1024) throw new Error("画像は4MB以下にしてください");
        const imageDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error("画像を読み込めませんでした"));
          reader.readAsDataURL(imageFile);
        });
        const uploaded = await rewardCalls.adminUploadRaffleImage({ dataUrl: imageDataUrl });
        const endsAtJst = document.getElementById("raffle-ends-at-input").value;
        await rewardCalls.adminCreateRaffle({
          title: document.getElementById("raffle-title-input").value.trim(),
          imageUrl: uploaded.data.imageUrl,
          prizeDescription: document.getElementById("raffle-prize-description-input").value.trim(),
          costPoints: Number(document.getElementById("raffle-cost-points-input").value),
          winnerCount: Number(document.getElementById("raffle-winner-count-input").value),
          endsAt: new Date(`${endsAtJst}:00+09:00`).toISOString()
        });
        form.reset();
        await Promise.all([window.renderAdminRewards(), window.renderRewards()]);
        showToast("トレカ抽選を作成しました", "success");
      } catch (e) {
        console.error("Raffle creation failed:", e);
        showToast(e?.message || "抽選を作成できませんでした", "error");
      } finally {
        button.disabled = false;
      }
    };
    window.drawRaffle = async function(raffleId) {
      if (!isAdmin()) return;
      try {
        const result = await rewardCalls.drawRaffleWinner({ raffleId });
        showToast(`${result.data.winners.length}人の当選者を確定しました`, "success");
        await Promise.all([window.renderAdminRewards(), window.renderRewards()]);
      } catch (e) {
        console.error("Raffle draw failed:", e);
        showToast("抽選を実行できませんでした", "error");
      }
    };

    window.adminSearch = function(v) { adminSearchQuery = String(v || "").trim().toLowerCase(); loadAdminData(); };

    async function loadAdminData() {
      const el = document.getElementById("admin-content"); 
      el.innerHTML = '<div class="flex justify-center items-center h-full"><p class="text-gray-500 font-medium">⏳ データ読み込み中...</p></div>';
      
      try {
        const _safeAdminGetDocs = async (q) => {
      try {
        return await getDocs(q);
      } catch (err) {
        console.warn("Admin query fallback:", err && err.message ? err.message : err);
        return { docs: [], size: 0, empty: true, forEach: () => {} };
      }
    };
    if (adminTab === "autogo") {
      await window.renderAdminAutoGoPanel(el);
      return;
    }
    if (adminTab === "stats") {
          const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
          const dayKeys = tokyoDateKeysLastN(30);
          const safeCount = async (colRef) => {
            try {
              const agg = await getCountFromServer(colRef);
              return Number(agg.data().count) || 0;
            } catch (err) {
              console.warn("Admin count fallback:", err && err.message ? err.message : err);
              try {
                const snap = await getDocs(query(colRef, limit(5000)));
                return snap.size;
              } catch (_) {
                return 0;
              }
            }
          };
          const loadDauDay = async (key) => {
            try {
              const [daySnap, visitorCount] = await Promise.all([
                getDoc(doc(db, "dailyActive", key)),
                safeCount(collection(db, "dailyActive", key, "visitors"))
              ]);
              const docCount = daySnap && daySnap.exists() ? (Number(daySnap.data().count) || 0) : 0;
              // visitors 実数を正とし、ドキュメント count が遅れ/欠損していても反映する
              const count = Math.max(docCount, visitorCount);
              // count が visitors より少ない場合は管理者向けに補正書き込み（ベストエフォート）
              if (visitorCount > docCount && isAdmin()) {
                setDoc(doc(db, "dailyActive", key), { count: visitorCount, updatedAt: serverTimestamp(), repairedAt: serverTimestamp() }, { merge: true }).catch(() => {});
              }
              return { key, count, label: key.slice(5).replace("-", "/") };
            } catch (err) {
              console.warn("DAU day load:", key, err && err.message ? err.message : err);
              return { key, count: 0, label: key.slice(5).replace("-", "/") };
            }
          };
          const [tradesSnap, usersCountRaw, postsCount, dauSeries, dummyUserSnap] = await Promise.all([
            _safeAdminGetDocs(query(collection(db, "trades"), limit(2000))),
            safeCount(collection(db, "users")),
            safeCount(collection(db, "posts")),
            Promise.all(dayKeys.map(loadDauDay)),
            getDocs(query(collection(db, "users"), where(documentId(), ">=", "dummy_"), where(documentId(), "<", "dummy_\uf8ff"))).catch((error) => {
              console.error("dummy user count failed", error);
              return { docs: [] };
            })
          ]);
          const dummyUserDocs = (dummyUserSnap.docs || []).filter((userDoc) => String(userDoc.id).indexOf("dummy_") === 0);
          const usersCount = Math.max(0, Number(usersCountRaw || 0) - dummyUserDocs.length);
          if (dummyUserDocs.length > 0 && isAdmin()) {
            Promise.all(dummyUserDocs.map((userDoc) => deleteDoc(userDoc.ref))).catch((error) => {
              console.error("dummy user delete failed", error);
            });
          }

          let platformTotal = 0; let thisMonthTotal = 0; let completedCount = 0;
          tradesSnap.docs.forEach(docSnap => {
            const t = docSnap.data();
            const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
            if (t.status === "completed") {
              const price = Number(t.postPrice || 0);
              platformTotal += price;
              completedCount++;
              if (tDate >= d) thisMonthTotal += price;
            }
          });

          const todayDau = dauSeries.length ? dauSeries[dauSeries.length - 1].count : 0;
          const last7 = dauSeries.slice(-7);
          const avg7 = last7.length ? Math.round(last7.reduce((s, x) => s + x.count, 0) / last7.length) : 0;
          const maxDau = Math.max(1, ...dauSeries.map((x) => x.count));
          const chartW = 320, chartH = 140, padL = 28, padR = 8, padT = 12, padB = 28;
          const plotW = chartW - padL - padR, plotH = chartH - padT - padB;
          const points = dauSeries.map((x, i) => {
            const px = padL + (dauSeries.length === 1 ? plotW / 2 : (i / (dauSeries.length - 1)) * plotW);
            const py = padT + plotH - (x.count / maxDau) * plotH;
            return { ...x, px, py };
          });
          const polyline = points.map((p) => p.px.toFixed(1) + "," + p.py.toFixed(1)).join(" ");
          const areaPath = points.length
            ? `M ${points[0].px.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${points.map((p) => p.px.toFixed(1) + " " + p.py.toFixed(1)).join(" L ")} L ${points[points.length - 1].px.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
            : "";
          const yTicks = [0, Math.round(maxDau / 2), maxDau];
          const xLabelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);

          el.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                <div class="text-[10px] opacity-80 font-medium">今日のアクティブ（DAU）</div>
                <div class="text-2xl font-bold">${todayDau.toLocaleString()} 人</div>
                <div class="text-[10px] opacity-80 mt-1">直近7日平均 ${avg7.toLocaleString()} 人</div>
              </div>
              <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
                <div class="text-[10px] opacity-80 font-medium">総ユーザー数</div>
                <div class="text-2xl font-bold">${Number(usersCount || 0).toLocaleString()} 人</div>
              </div>
              <div class="bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl p-4 text-white shadow-md">
                <div class="text-[10px] opacity-80 font-medium">総出品数</div>
                <div class="text-2xl font-bold">${Number(postsCount || 0).toLocaleString()} 件</div>
              </div>
              <div class="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 text-white shadow-md">
                <div class="text-[10px] opacity-80 font-medium">成立取引</div>
                <div class="text-2xl font-bold">${completedCount} 件</div>
              </div>
              <div class="bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl p-4 text-white shadow-md col-span-2">
                <div class="text-[10px] opacity-80 font-medium">プラットフォーム累計取引額 (成立済)</div>
                <div class="text-3xl font-bold">￥${platformTotal.toLocaleString()}</div>
                <div class="flex justify-between mt-2 text-xs opacity-90 border-t border-white/30 pt-2">
                  <span>今月の取引額: ￥${thisMonthTotal.toLocaleString()}</span>
                  <span>成立件数: ${completedCount} 件</span>
                </div>
              </div>
            </div>
            <div class="mt-3 bg-white/90 border border-indigo-100 rounded-2xl p-3 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <div class="text-xs font-bold text-gray-800">日次アクティブユーザー（直近30日）</div>
                  <div class="text-[10px] text-gray-500">タイムゾーン: Asia/Tokyo · ログイン日ごとに1カウント</div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] text-gray-500">ピーク</div>
                  <div class="text-sm font-bold text-indigo-700">${maxDau.toLocaleString()} 人</div>
                </div>
              </div>
              <div class="w-full overflow-x-auto">
                <svg viewBox="0 0 ${chartW} ${chartH}" class="w-full h-auto min-w-[280px]" role="img" aria-label="DAU折れ線グラフ">
                  <defs>
                    <linearGradient id="dauFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
                      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.02"/>
                    </linearGradient>
                  </defs>
                  ${yTicks.map((t) => {
                    const y = padT + plotH - (t / maxDau) * plotH;
                    return `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
                      <text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9ca3af">${t}</text>`;
                  }).join("")}
                  ${areaPath ? `<path d="${areaPath}" fill="url(#dauFill)"/>` : ""}
                  ${polyline ? `<polyline fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${polyline}"/>` : ""}
                  ${points.map((p) => `<circle cx="${p.px}" cy="${p.py}" r="2.5" fill="#4f46e5"><title>${p.key}: ${p.count}人</title></circle>`).join("")}
                  ${xLabelIdx.map((i) => {
                    const p = points[i];
                    if (!p) return "";
                    return `<text x="${p.px}" y="${chartH - 8}" text-anchor="middle" font-size="9" fill="#6b7280">${p.label}</text>`;
                  }).join("")}
                </svg>
              </div>
              <div class="mt-2 grid grid-cols-7 gap-1">
                ${last7.map((x) => {
                  const h = Math.max(4, Math.round((x.count / maxDau) * 36));
                  return `<div class="flex flex-col items-center gap-0.5" title="${x.key}: ${x.count}人">
                    <div class="w-full flex items-end justify-center h-9">
                      <div class="w-3/5 rounded-t bg-indigo-500/80" style="height:${h}px"></div>
                    </div>
                    <div class="text-[9px] text-gray-500">${x.label.slice(3)}</div>
                    <div class="text-[9px] font-bold text-gray-700">${x.count}</div>
                  </div>`;
                }).join("")}
              </div>
              <p class="text-[10px] text-gray-400 mt-2 leading-relaxed">※ Asia/Tokyo の日付で、ログイン済みユーザーがアプリを開いた日に1回カウントします。表示は訪問者サブコレクション実数を優先します。</p>
            </div>`;
          return;
        }

        if (adminTab === "cards") {
          await Promise.all([ensureCardPhotosLoaded(), ensureCatalogCardsLoaded()]);
          renderAdminCardsPanel(el);
          return;
        }

        if (adminTab === "likes") {
          const rows = await fetchLikeAudit();
          lastLikeAudit = rows;
          const bad = rows.filter(r => r.diff !== 0 || r.missing.length > 0);
          const susp = bad.filter(r => r.diff > 0);
          el.innerHTML = `
            <div class="bg-white/80 border border-purple-200 rounded-xl p-3 text-xs space-y-1.5">
              <div class="font-bold text-gray-800">いいねの実数チェック</div>
              <div class="text-gray-600">表示されている数と、新方式で記録されたいいねのアカウント数を比べます。旧方式のいいねは記録が残っていないため、「実際」は0になります（検証できない分）。</div>
              <div>対象投稿: <b>${rows.length}</b> 件 ／ ズレあり: <b class="text-red-600">${bad.length}</b> 件 ／ 記録のない分あり: <b class="text-red-600">${susp.length}</b> 件</div>
              ${bad.length ? `<button data-act="adminFixAllLikes" class="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-2.5 rounded-lg text-xs mt-1">記録のある実数にすべて補正（旧方式のカウントは初期化）</button>` : '<div class="text-green-600 font-bold">すべて一致しています。</div>'}
            </div>
            ${bad.map(r => `
            <div class="bg-white/80 border ${r.diff > 0 ? 'border-red-300' : 'border-purple-200'} rounded-xl p-3 text-xs space-y-1 shadow-sm">
              <div class="flex justify-between gap-2"><span class="font-bold text-gray-800 truncate">${escapeHtml(r.give)}</span><span class="text-gray-400 shrink-0">${escapeHtml(r.userName)}</span></div>
              <div>表示: <b>${r.shown}</b> ／ 実際: <b>${r.real}</b> ${r.diff > 0 ? `<span class="text-red-600 font-bold">（+${r.diff} 記録のない分）</span>` : (r.diff < 0 ? `<span class="text-amber-600 font-bold">（${r.diff} 不足）</span>` : '')}${r.missing.length ? ` <span class="text-gray-500">／ 旧方式のみ ${r.missing.length} 人</span>` : ''}</div>
              <div class="text-[10px] text-gray-500 break-words">いいねした人: ${r.names.length ? r.names.map(escapeHtml).join("、") : "なし"}${r.real > r.names.length ? ` ほか${r.real - r.names.length}人` : ''}</div>
              <div class="flex justify-end"><button data-act="adminFixLikes" data-a1="${escapeHtml(r.id)}" class="bg-red-500 text-white font-medium px-3 py-1 rounded-md text-[10px] hover:bg-red-600">この投稿を補正</button></div>
            </div>`).join("")}`;
          return;
        }

        if (adminTab === "users") {
          const snap = await _safeAdminGetDocs(collection(db, "users")); 
          const suspSnap = await _safeAdminGetDocs(collection(db, "suspensions"));
          const suspSet = new Set(suspSnap.docs.map(x => x.id));
          const dummyDocs = snap.docs.filter((userDoc) => String(userDoc.id).indexOf("dummy_") === 0);
          if (dummyDocs.length > 0) {
            Promise.all(dummyDocs.map((userDoc) => deleteDoc(userDoc.ref))).catch((error) => {
              console.error("dummy user delete failed", error);
            });
          }
          
          let users = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((user) => String(user.id).indexOf("dummy_") !== 0);
          if (adminSearchQuery) {
            users = users.filter(u => 
              (u.profile?.nickname || '').toLowerCase().includes(adminSearchQuery) || 
              u.id.toLowerCase().includes(adminSearchQuery)
            );
          }

          if (users.length === 0) { el.innerHTML = '<p class="text-gray-500 text-center py-4">該当するユーザーがいません。</p>'; return; }

          el.innerHTML = users.map(u => {
            const isSuspended = suspSet.has(u.id);
            const isAdminUser = ADMIN_UIDS.includes(u.id);
            return `
            <div class="bg-white/80 border ${isSuspended ? 'border-red-300' : 'border-purple-200'} rounded-xl p-3 space-y-2 shadow-sm">
              <div class="flex justify-between items-start">
                <div>
                  <span class="font-bold text-gray-800 text-sm">${escapeHtml(u.profile?.nickname || '名無し')}</span>
                  ${isAdminUser ? '<span class="bg-yellow-100 text-yellow-800 text-[9px] px-2 py-0.5 rounded-full ml-1">Admin</span>' : ''}
                  ${isSuspended ? '<span class="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full ml-1">停止中</span>' : ''}
                  <div class="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">UID: ${u.id.slice(0,12)}... <button data-act="copyText" data-a1="${escapeHtml(u.id)}" class="hover:text-gray-700">📋</button></div>
                </div>
              </div>
              ${!isAdminUser ? `
              <div class="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-gray-100">
                <button data-act="adminOpenUserDetail" data-a1="${escapeHtml(u.id)}" class="bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium px-3 py-1.5 rounded-lg text-[10px] transition">👤 詳細</button>
                <button data-act="adminSendWarning" data-a1="${escapeHtml(u.id)}" data-a2="${escapeHtml(u.profile?.nickname || '')}" class="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium px-3 py-1.5 rounded-lg text-[10px] transition">⚠️ 警告</button>
                ${isSuspended 
                  ? `<button data-act="adminUnsuspendUser" data-a1="${escapeHtml(u.id)}" class="bg-green-100 text-green-700 hover:bg-green-200 font-medium px-3 py-1.5 rounded-lg text-[10px] transition">🔓 停止解除</button>` 
                  : `<button data-act="adminSuspendUser" data-a1="${escapeHtml(u.id)}" data-a2="${escapeHtml(u.profile?.nickname || '')}" class="bg-red-100 text-red-700 hover:bg-red-200 font-medium px-3 py-1.5 rounded-lg text-[10px] transition">🚫 停止</button>`
                }
              </div>` : `<div class="flex justify-end pt-2 border-t border-gray-100"><button data-act="adminOpenUserDetail" data-a1="${escapeHtml(u.id)}" class="bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium px-3 py-1.5 rounded-lg text-[10px] transition">👤 詳細</button></div>`}
            </div>`;
          }).join("");
          return;
        }

        if (adminTab === "posts") {
          const snap = await _safeAdminGetDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
          let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          if (adminSearchQuery) {
            posts = posts.filter(p => 
              (p.give || '').toLowerCase().includes(adminSearchQuery) || 
              (p.want || '').toLowerCase().includes(adminSearchQuery) ||
              (p.userName || '').toLowerCase().includes(adminSearchQuery)
            );
          }

          if (posts.length === 0) { el.innerHTML = '<p class="text-gray-500 text-center py-4">投稿がありません。</p>'; return; }

          el.innerHTML = posts.map(p => `
            <div class="bg-white/80 border ${p.status === 'active' ? 'border-purple-200' : 'border-gray-300 opacity-70'} rounded-xl p-3 flex gap-3 shadow-sm">
              ${isJpegData(p.thumb) ? `<img src="${p.thumb}" class="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0">` : '<div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No Image</div>'}
              <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div class="text-[10px] text-gray-500 mb-0.5 flex justify-between"><span>${escapeHtml(p.userName)}</span> <span class="${p.status==='active'?'text-green-600':(p.status==='hidden'?'text-amber-600 font-bold':'text-gray-500')}">${escapeHtml(p.status === 'hidden' ? '審査中(非公開)' : p.status)}</span></div>
                  <div class="font-bold text-xs text-gray-800 truncate">譲: ${escapeHtml(p.give)}</div>
                  ${p.want ? `<div class="text-[11px] text-gray-600 truncate">求: ${escapeHtml(p.want)}</div>` : ''}
                </div>
                <div class="flex flex-wrap justify-end gap-1.5 mt-2">
                  ${p.status === "hidden"
                    ? `<button data-act="adminUnhidePost" data-a1="${escapeHtml(p.id)}" class="bg-green-500 text-white font-medium px-3 py-1 rounded-md text-[10px] shadow-sm">再公開</button>`
                    : `<button data-act="adminHidePost" data-a1="${escapeHtml(p.id)}" class="bg-amber-500 text-white font-medium px-3 py-1 rounded-md text-[10px] shadow-sm">一時非公開</button>`}
                  <button data-act="adminDeletePost" data-a1="${escapeHtml(p.id)}" class="bg-red-500 text-white font-medium px-3 py-1 rounded-md text-[10px] shadow-sm hover:bg-red-600">強制削除</button>
                </div>
              </div>
            </div>`).join("");
          return;
        }

        if (adminTab === "trades") {
          const snap = await _safeAdminGetDocs(query(collection(db, "trades"), orderBy("createdAt", "desc")));
          let trades = snap.docs.map(d => ({ id: d.id, ...d.data() }));

          if (adminSearchQuery) {
            trades = trades.filter(t => 
              (t.ownerName || '').toLowerCase().includes(adminSearchQuery) || 
              (t.applicantName || '').toLowerCase().includes(adminSearchQuery) ||
              (t.id).toLowerCase().includes(adminSearchQuery)
            );
          }

          if (trades.length === 0) { el.innerHTML = '<p class="text-gray-500 text-center py-4">取引データがありません。</p>'; return; }

          el.innerHTML = trades.map(t => {
            const statColor = t.status === 'completed' ? 'text-green-600' : t.status === 'cancelled' ? 'text-gray-500' : 'text-blue-600';
            return `
            <div class="bg-white/80 border border-purple-200 rounded-xl p-3 shadow-sm text-xs space-y-1.5">
              <div class="flex justify-between items-center border-b border-gray-100 pb-1">
                <span class="font-mono text-[9px] text-gray-400">ID: ${t.id.slice(0,8)}</span>
                <span class="font-bold ${statColor}">${STATUS_LABEL[t.status] || escapeHtml(t.status)}</span>
              </div>
              <div class="font-medium text-gray-800 truncate">商品: ${escapeHtml(t.postGive || '不明')}</div>
              <div class="flex justify-between items-center text-gray-600 bg-gray-50 p-1.5 rounded">
                <span>出品: ${escapeHtml(t.ownerName)}</span>
                <span class="text-[9px]">↔</span>
                <span>申込: ${escapeHtml(t.applicantName)}</span>
              </div>
              ${t.status !== 'completed' && t.status !== 'cancelled' ? `
              <div class="flex justify-end pt-1">
                <button data-act="adminForceCancelTrade" data-a1="${escapeHtml(t.id)}" class="bg-red-500 text-white px-3 py-1 rounded text-[10px] font-medium hover:bg-red-600 shadow-sm">強制キャンセル介入</button>
              </div>` : ''}
            </div>`;
          }).join("");
          return;
        }

        if (adminTab === "reports") {
          const snap = await _safeAdminGetDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
          if (snap.empty) { el.innerHTML = '<p class="text-gray-500 text-center py-6 font-medium">通報はありません。</p>'; return; }
          el.innerHTML = snap.docs.map(d => {
            const data = d.data();
            const reporterId = data.reporterId || "";
            const reporterName = data.reporterName || "通報者";
            const st = data.status || "open";
            const stLabel = st === "done" ? "完了" : (st === "replied" ? "返信済" : "未対応");
            const stCls = st === "done" ? "bg-green-100 text-green-700" : (st === "replied" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700");
            const hist = Array.isArray(data.replies) ? data.replies : [];
            const histHtml = hist.length
              ? `<div class="bg-white/80 rounded-lg p-2 border border-red-100 space-y-1">${hist.map(h => `<div class="text-[10px] text-gray-700"><span class="font-bold text-red-700">運営:</span> ${escapeHtml(h.text || "")}<div class="text-[9px] text-gray-400">${escapeHtml(fmtTime(h.at) || "")}</div></div>`).join("")}</div>`
              : "";
            return `<div class="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5 shadow-sm">
              <div class="flex justify-between items-center text-[10px] text-red-700 gap-2">
                <span>通報者: ${escapeHtml(reporterName)}</span>
                <span class="flex items-center gap-1"><span class="${stCls} px-2 py-0.5 rounded-full font-bold">${stLabel}</span><span>${fmtTime(data.createdAt)}</span></span>
              </div>
              <div class="font-bold text-gray-800 text-xs">対象: ${escapeHtml(data.postGive || "")}</div>
              <div class="text-red-700 bg-white p-2 rounded-lg border border-red-100 text-xs">理由: ${escapeHtml(data.reason || "")}</div>
              ${histHtml}
              <div class="flex flex-wrap justify-end gap-1.5 pt-1">
                ${reporterId ? `<button data-act="adminReplyReport" data-a1="${escapeHtml(d.id)}" data-a2="${escapeHtml(reporterId)}" class="bg-white border border-red-300 text-red-700 font-medium px-3 py-1.5 rounded-md text-[10px] hover:bg-red-100 shadow-sm">返信する</button>` : ""}
                <button data-act="deleteReportedPost" data-a1="${escapeHtml(data.postId || "")}" data-a2="${escapeHtml(d.id)}" class="bg-red-500 text-white font-medium px-3 py-1.5 rounded-md text-[10px] hover:bg-red-600 shadow-sm">投稿を強制削除</button>
              </div>
            </div>`;
          }).join("");
        }
        else if (adminTab === "inquiries") {
          const snap = await _safeAdminGetDocs(query(collection(db, "inquiries"), orderBy("createdAt", "desc")));
          if (snap.empty) { el.innerHTML = '<p class="text-gray-500 text-center py-6 font-medium">問い合わせはありません。</p>'; return; }
          el.innerHTML = snap.docs.map(d => {
            const data = d.data();
            const subj = INQUIRY_SUBJECT_LABEL[data.subject] || data.subject;
            const uid = data.userId || "";
            const uname = data.userName || "ユーザー";
            const st = data.status || "open";
            const stLabel = st === "done" ? "完了" : (st === "replied" ? "返信済" : "未対応");
            const stCls = st === "done" ? "bg-green-100 text-green-700" : (st === "replied" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700");
            const hist = Array.isArray(data.replies) ? data.replies : [];
            const histHtml = hist.length
              ? `<div class="bg-purple-50/80 rounded-lg p-2 border border-purple-100 space-y-1">${hist.map(h => `<div class="text-[10px] text-gray-700"><span class="font-bold text-illit-darkPurple">運営:</span> ${escapeHtml(h.text || "")}<div class="text-[9px] text-gray-400">${escapeHtml(fmtTime(h.at) || "")}</div></div>`).join("")}</div>`
              : "";
            return `<div class="bg-white/80 border border-purple-200 rounded-xl p-3 space-y-1.5 shadow-sm">
              <div class="flex justify-between items-center text-[10px] text-gray-500 gap-2">
                <span class="font-bold text-illit-darkPurple bg-purple-50 px-2 py-0.5 rounded">${escapeHtml(subj)}</span>
                <span class="flex items-center gap-1"><span class="${stCls} px-2 py-0.5 rounded-full font-bold">${stLabel}</span><span>${fmtTime(data.createdAt)}</span></span>
              </div>
              <div class="font-bold text-gray-800 text-xs">${escapeHtml(uname)}</div>
              <div class="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 whitespace-pre-wrap text-xs leading-relaxed">${escapeHtml(data.body || "")}</div>
              ${histHtml}
              <div class="flex flex-wrap justify-end gap-1.5 pt-1">
                ${uid ? `<button data-act="adminReplyInquiry" data-a1="${escapeHtml(d.id)}" data-a2="${escapeHtml(uid)}" class="bg-illit-purple text-white font-medium px-3 py-1.5 rounded-md text-[10px] hover:opacity-90 shadow-sm">返信する</button>` : ""}
                <button data-act="markInquiryDone" data-a1="${escapeHtml(d.id)}" class="bg-green-500 hover:bg-green-600 text-white font-medium px-3 py-1.5 rounded-md text-[10px] shadow-sm">対応済み</button>
              </div>
            </div>`;
          }).join("");
        }
                else if (adminTab === "broadcast") {
          el.innerHTML = `
            <div class="space-y-4">
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div class="font-bold text-amber-900 text-xs">📌 ホーム固定お知らせ</div>
                <p class="text-[11px] text-amber-800">ホーム上部に常時表示されます（通知一覧には入りません）。</p>
                <textarea id="admin-announce-text" rows="3" maxlength="400" placeholder="例: 本日22時〜メンテのため一時停止します" class="liquid-glass-input w-full rounded-xl p-2.5 text-xs text-gray-800"></textarea>
                <label class="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" id="admin-announce-active" class="rounded"> 表示する</label>
                <button onclick="saveSiteAnnouncement()" class="w-full bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs">固定お知らせを保存</button>
                <p id="admin-announce-status" class="text-[11px] text-center text-gray-500"></p>
              </div>
              <div class="bg-red-50/80 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">⚠️ 下の一斉通知は全ユーザーの「通知一覧」に追加されます。</div>
              <div>
                <label class="block font-medium text-gray-700 mb-1 text-xs">通知メッセージ内容</label>
                <textarea id="admin-broadcast-msg" rows="5" maxlength="300" placeholder="例: メンテナンスのお知らせ" class="liquid-glass-input w-full rounded-xl p-3 text-sm text-gray-800 focus:ring-2 focus:ring-purple-400"></textarea>
              </div>
              <button onclick="sendBroadcast()" id="broadcast-send-btn" class="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition shadow-md border border-white/30 text-sm">📢 全員に通知を送信する</button>
              <p id="broadcast-status" class="text-xs text-center text-gray-500 font-medium"></p>
            </div>`;
          // 現在の固定お知らせを読み込み
          getDoc(doc(db, "siteConfig", "announcement")).then(s => {
            if (!s.exists()) return;
            const d = s.data() || {};
            const t = document.getElementById("admin-announce-text");
            const a = document.getElementById("admin-announce-active");
            if (t) t.value = d.text || "";
            if (a) a.checked = !!d.active;
          }).catch(() => {});
        }
        else if (adminTab === "logs") {
          const snap = await _safeAdminGetDocs(query(collection(db, "adminLogs"), orderBy("createdAt", "desc")));
          const docs = snap.docs.slice(0, 80);
          if (!docs.length) { el.innerHTML = '<p class="text-gray-500 text-center py-6">操作ログはまだありません。</p>'; return; }
          el.innerHTML = `<div class="text-[11px] text-gray-500 mb-2">最新 ${docs.length} 件</div>` + docs.map(d => {
            const x = d.data();
            return `<div class="bg-white/80 border border-gray-200 rounded-xl p-3 text-xs space-y-0.5">
              <div class="flex justify-between gap-2"><span class="font-bold text-gray-800">${escapeHtml(x.action || "")}</span><span class="text-[10px] text-gray-400">${fmtTime(x.createdAt)}</span></div>
              <div class="text-gray-600">対象: ${escapeHtml(x.target || "—")}</div>
              ${x.detail ? `<div class="text-gray-500">${escapeHtml(x.detail)}</div>` : ""}
              <div class="text-[10px] text-gray-400">by ${escapeHtml(x.byName || x.by || "")}</div>
            </div>`;
          }).join("");
        }

      } catch(e) {
        console.error(e);
        el.innerHTML = `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-center"><p class="font-bold mb-1">一部のFirestoreデータを取得できませんでした</p><p class="text-[11px] opacity-80">${escapeHtml(e && e.message ? e.message : "権限またはインデックス未設定")}</p></div>`;
      }
    }

    window.adminSendWarning = async function(uid, name) {
      const msg = prompt(`【${name}】への警告メッセージを入力してください:\n(相手の通知一覧に運営からのメッセージとして届きます)`);
      if (!msg) return;
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : {};
        const list = Array.isArray(data.notifications) ? [...data.notifications] : [];
        list.unshift({ 
          id: "admin_warn_" + Date.now(), 
          text: `【運営より警告】${msg}`, 
          type: "admin", 
          read: false, 
          createdAt: Date.now() 
        });
        capNotifications(list);
        await updateDoc(userRef, { notifications: list });
        /* alert hidden */ console.log("警告を送信しました。");
      } catch (e) { /* alert hidden */ console.log("送信に失敗しました。"); }
    };

    // 通報者・問い合わせ者などへの個別返信（通知に届く）
    window.adminReplyUser = async function(uid, name) {
      if (!uid) return /* alert hidden */ console.log("送信先ユーザーが不明です。");
      const label = name || "ユーザー";
      const msg = prompt(`【${label}】への返信を入力してください:\n(相手の通知一覧に「運営からの返信」として届きます)`);
      if (!msg || !msg.trim()) return;
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return /* alert hidden */ console.log("ユーザーデータが見つかりません。");
        const data = snap.data() || {};
        const list = Array.isArray(data.notifications) ? [...data.notifications] : [];
        list.unshift({
          id: "admin_reply_" + Date.now(),
          text: `【運営からの返信】${msg.trim()}`,
          type: "admin",
          read: false,
          createdAt: Date.now()
        });
        capNotifications(list);
        await updateDoc(userRef, { notifications: list });
        /* alert hidden */ console.log("返信を送信しました。相手の通知一覧に届きます。");
      } catch (e) {
        console.error("buildAndDownloadCardPackZip error:", e);
        /* alert hidden */ console.log("ZIP生成エラー: " + (e && e.stack ? e.stack : (e.message || e)));
        /* alert hidden */ console.log("返信の送信に失敗しました。\n" + (e?.message || e));
      }
    };

    window.adminSuspendUser = async function(uid, name) {
      const reason = prompt(`【${name}】のアカウントを停止する理由を入力してください:`);
      if (!reason) return;
      try {
        await setDoc(doc(db, "suspensions", uid), { reason, name, createdAt: serverTimestamp() });
        await logAdminAction("user_suspend", uid, reason);
        /* alert hidden */ console.log("アカウントを停止しました。");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("失敗しました。"); }
    };

    window.adminUnsuspendUser = async function(uid) {
      if (!(await appConfirm("アカウント停止を解除しますか？"))) return;
      try {
        await deleteDoc(doc(db, "suspensions", uid));
        await logAdminAction("user_unsuspend", uid, "");
        /* alert hidden */ console.log("停止を解除しました。");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("失敗しました。"); }
    };

    window.adminDeletePost = async function(postId) {
      if(!(await appConfirm("この投稿を強制的に削除しますか？\n(画像や共同購入の参加データも削除されます)"))) return;
      try {
        const snap = await getDocs(collection(db, "posts", postId, "photos")); 
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        const js = await getDocs(collection(db, "posts", postId, "joins")); 
        await Promise.all(js.docs.map(d => deleteDoc(d.ref)));
        
        await deleteDoc(doc(db, "posts", postId)); 
        delete photoCache[postId];
        await logAdminAction("post_delete", postId, "");
        /* alert hidden */ console.log("削除しました。"); 
        loadAdminData();
      } catch(e){ /* alert hidden */ console.log("削除に失敗しました。"); }
    };

    window.adminForceCancelTrade = async function(tradeId) {
      if(!(await appConfirm("運営権限でこの取引を強制的にキャンセルしますか？\n（トラブル対応用です）"))) return;
      try {
        await updateDoc(doc(db, "trades", tradeId), { 
          status: "cancelled", 
          adminCancelled: true,
          updatedAt: serverTimestamp() 
        });
        
        const tradeSnap = await getDoc(doc(db, "trades", tradeId));
        if(tradeSnap.exists()) {
          const tData = tradeSnap.data();
          await restorePostToActive(tData.postId, tData.kind, tData.applicantId);
        }
        /* alert hidden */ console.log("取引を強制キャンセルしました。");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("処理に失敗しました。"); }
    };

        window.markInquiryDone = async function(id) {
      if (!(await appConfirm("この問い合わせを対応済みにしますか？"))) return;
      try {
        await updateDoc(doc(db, "inquiries", id), { status: "done", doneAt: serverTimestamp() });
        await logAdminAction("inquiry_done", id, "");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("更新に失敗しました。"); }
    };


    window.adminHidePost = async function(postId) {
      if (!(await appConfirm("この投稿を一時非公開（審査中）にしますか？\n一覧から一般ユーザーには見えなくなります。"))) return;
      try {
        await updateDoc(doc(db, "posts", postId), { status: "hidden", hiddenAt: serverTimestamp(), hiddenBy: currentUser.uid });
        const lp = allPosts.find(x => x.id === postId); if (lp) lp.status = "hidden";
        renderPosts();
        await logAdminAction("post_hide", postId, "");
        /* alert hidden */ console.log("一時非公開にしました。");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("失敗しました。"); }
    };
    window.adminUnhidePost = async function(postId) {
      if (!(await appConfirm("この投稿を再公開しますか？"))) return;
      try {
        await updateDoc(doc(db, "posts", postId), { status: "active", hiddenAt: null });
        const lp = allPosts.find(x => x.id === postId); if (lp) lp.status = "active";
        renderPosts();
        await logAdminAction("post_unhide", postId, "");
        /* alert hidden */ console.log("再公開しました。");
        loadAdminData();
      } catch(e) { /* alert hidden */ console.log("失敗しました。"); }
    };

    window.adminReplyInquiry = async function(inquiryId, uid) {
      const msg = prompt("問い合わせへの返信を入力してください:\\n(相手の通知＋対応履歴に残ります)");
      if (!msg || !msg.trim()) return;
      try {
        const ref = doc(db, "inquiries", inquiryId);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        const replies = Array.isArray(data.replies) ? [...data.replies] : [];
        replies.push({ text: msg.trim(), at: Date.now(), by: currentUser.uid });
        await updateDoc(ref, { replies, status: "replied", updatedAt: serverTimestamp() });
        // 通知
        const userRef = doc(db, "users", uid);
        const us = await getDoc(userRef);
        if (us.exists()) {
          const list = Array.isArray(us.data().notifications) ? [...us.data().notifications] : [];
          list.unshift({ id: "admin_reply_" + Date.now(), text: "【運営からの返信】" + msg.trim(), type: "admin", read: false, createdAt: Date.now() });
          capNotifications(list);
          await updateDoc(userRef, { notifications: list });
        }
        await logAdminAction("inquiry_reply", inquiryId, msg.trim().slice(0, 80));
        /* alert hidden */ console.log("返信しました。");
        loadAdminData();
      } catch(e) { console.error(e); /* alert hidden */ console.log("返信に失敗しました。"); }
    };

    window.adminReplyReport = async function(reportId, reporterId) {
      const msg = prompt("通報者への返信を入力してください:\\n(相手の通知＋対応履歴に残ります)");
      if (!msg || !msg.trim()) return;
      try {
        const ref = doc(db, "reports", reportId);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        const replies = Array.isArray(data.replies) ? [...data.replies] : [];
        replies.push({ text: msg.trim(), at: Date.now(), by: currentUser.uid });
        await updateDoc(ref, { replies, status: "replied", updatedAt: serverTimestamp() });
        const userRef = doc(db, "users", reporterId);
        const us = await getDoc(userRef);
        if (us.exists()) {
          const list = Array.isArray(us.data().notifications) ? [...us.data().notifications] : [];
          list.unshift({ id: "admin_reply_" + Date.now(), text: "【運営からの返信】" + msg.trim(), type: "admin", read: false, createdAt: Date.now() });
          capNotifications(list);
          await updateDoc(userRef, { notifications: list });
        }
        await logAdminAction("report_reply", reportId, msg.trim().slice(0, 80));
        /* alert hidden */ console.log("返信しました。");
        loadAdminData();
      } catch(e) { console.error(e); /* alert hidden */ console.log("返信に失敗しました。"); }
    };

    window.saveSiteAnnouncement = async function() {
      const t = (document.getElementById("admin-announce-text")?.value || "").trim();
      const active = !!document.getElementById("admin-announce-active")?.checked;
      const st = document.getElementById("admin-announce-status");
      try {
        await setDoc(doc(db, "siteConfig", "announcement"), { text: t, active: active && !!t, updatedAt: serverTimestamp(), updatedBy: currentUser.uid }, { merge: true });
        await logAdminAction("announce_save", "siteConfig/announcement", (active ? "ON: " : "OFF: ") + t.slice(0, 60));
        await loadSiteAnnouncement();
        if (st) st.textContent = "保存しました";
        showToast("固定お知らせを保存しました", "success");
      } catch(e) {
        if (st) st.textContent = "保存に失敗しました";
        /* alert hidden */ console.log("保存に失敗しました。Firestoreルールを確認してください。");
      }
    };

    window.closeAdminUserDetail = function() {
      document.getElementById("admin-user-detail-modal")?.classList.add("hidden");
    };

    window.adminOpenUserDetail = async function(uid) {
      if (!uid) return;
      const modal = document.getElementById("admin-user-detail-modal");
      const body = document.getElementById("admin-user-detail-body");
      if (!modal || !body) return;
      modal.classList.remove("hidden");
      body.innerHTML = `<p class="text-center text-gray-500 py-6">読み込み中...</p>`;
      try {
        const [userSnap, suspSnap, reviewsSnap, tradesSnap] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getDoc(doc(db, "suspensions", uid)),
          getDocs(query(collection(db, "reviews"), where("toId", "==", uid))),
          getDocs(query(collection(db, "trades"), where("participants", "array-contains", uid)))
        ]);
        const u = userSnap.exists() ? userSnap.data() : {};
        const name = u.profile?.nickname || "名無し";
        const cancelHist = Array.isArray(u.cancelHistory) ? u.cancelHistory : [];
        const blocked = Array.isArray(u.blocked) ? u.blocked.length : 0;
        let avg = 0, rc = reviewsSnap.size;
        if (rc) {
          let sum = 0; reviewsSnap.forEach(d => { sum += Number(d.data().rating) || 0; });
          avg = sum / rc;
        }
        const trades = tradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const completed = trades.filter(t => t.status === "completed").length;
        const activeT = trades.filter(t => t.status === "negotiating" || t.status === "shipping").length;
        const cancelled = trades.filter(t => t.status === "cancelled").length;
        const listings = (allPosts || []).filter(p => p.userId === uid);
        const activeListings = listings.filter(p => p.status === "active").length;
        const hiddenListings = listings.filter(p => p.status === "hidden").length;

        // 端末: devices のうち uid 一致
        let deviceIds = [];
        try {
          const devSnap = await getDocs(query(collection(db, "devices"), where("uid", "==", uid)));
          deviceIds = devSnap.docs.map(d => d.id);
        } catch (_) {}

        let banHtml = "";
        if (deviceIds.length) {
          banHtml = deviceIds.map(did => {
            return `<div class="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-2 py-1.5 border border-white">
              <span class="font-mono text-[10px] text-gray-600 truncate">${escapeHtml(did)}</span>
              <span class="flex gap-1 shrink-0">
                <button data-act="adminBanDevice" data-a1="${escapeHtml(did)}" data-a2="${escapeHtml(uid)}" class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded">BAN</button>
                <button data-act="adminUnbanDevice" data-a1="${escapeHtml(did)}" class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">解除</button>
              </span>
            </div>`;
          }).join("");
        } else {
          banHtml = `<p class="text-gray-400">紐づく端末IDが見つかりません</p>`;
        }

        body.innerHTML = `
          <div class="bg-white/60 border border-white rounded-xl p-3 space-y-1">
            <div class="font-bold text-sm text-gray-900">${escapeHtml(name)} ${suspSnap.exists() ? '<span class="text-red-600 text-[10px]">停止中</span>' : ""}</div>
            <div class="font-mono text-[10px] text-gray-400 break-all">UID: ${escapeHtml(uid)}</div>
            <div class="text-yellow-600 font-bold">${rc ? ("⭐ " + avg.toFixed(1) + "（" + rc + "件）") : "評価なし"}</div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">取引完了</div><div class="font-bold text-sm">${completed}</div></div>
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">取引中</div><div class="font-bold text-sm">${activeT}</div></div>
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">キャンセル</div><div class="font-bold text-sm">${cancelled}</div></div>
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">出品中 / 非公開</div><div class="font-bold text-sm">${activeListings} / ${hiddenListings}</div></div>
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">キャンセル履歴</div><div class="font-bold text-sm">${cancelHist.length}</div></div>
            <div class="bg-white/70 rounded-xl p-2.5 border border-white"><div class="text-[10px] text-gray-500">ブロック数</div><div class="font-bold text-sm">${blocked}</div></div>
          </div>
          <div>
            <div class="font-bold text-gray-800 mb-1">端末BAN</div>
            <div class="space-y-1">${banHtml}</div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button data-act="adminSendWarning" data-a1="${escapeHtml(uid)}" data-a2="${escapeHtml(name)}" class="bg-yellow-100 text-yellow-800 font-bold px-3 py-2 rounded-lg text-[10px]">警告</button>
            ${suspSnap.exists()
              ? `<button data-act="adminUnsuspendUser" data-a1="${escapeHtml(uid)}" class="bg-green-100 text-green-800 font-bold px-3 py-2 rounded-lg text-[10px]">停止解除</button>`
              : `<button data-act="adminSuspendUser" data-a1="${escapeHtml(uid)}" data-a2="${escapeHtml(name)}" class="bg-red-100 text-red-800 font-bold px-3 py-2 rounded-lg text-[10px]">アカウント停止</button>`}
          </div>`;
      } catch (e) {
        console.error(e);
        body.innerHTML = `<p class="text-red-600 text-center py-6">読み込みに失敗しました</p>`;
      }
    };

    window.adminBanDevice = async function(deviceId, uid) {
      if (!deviceId) return;
      const reason = prompt("端末BANの理由（任意）:") || "admin";
      try {
        await setDoc(doc(db, "deviceBans", deviceId), { reason, uid: uid || "", by: currentUser.uid, createdAt: serverTimestamp() });
        await logAdminAction("device_ban", deviceId, reason);
        /* alert hidden */ console.log("端末をBANしました。");
      } catch(e) { /* alert hidden */ console.log("BANに失敗しました。"); }
    };
    window.adminUnbanDevice = async function(deviceId) {
      if (!deviceId) return;
      if (!(await appConfirm("この端末のBANを解除しますか？"))) return;
      try {
        await deleteDoc(doc(db, "deviceBans", deviceId));
        await logAdminAction("device_unban", deviceId, "");
        /* alert hidden */ console.log("BANを解除しました。");
      } catch(e) { /* alert hidden */ console.log("解除に失敗しました。"); }
    };

    window.sendBroadcast = async function() {
      if (!isAdmin()) return;
      const msgEl = document.getElementById("admin-broadcast-msg");
      const statusEl = document.getElementById("broadcast-status");
      const btn = document.getElementById("broadcast-send-btn");
      if (!msgEl) return;
      const message = msgEl.value.trim();
      if (!message) return /* alert hidden */ console.log("メッセージを入力してください。");
      if (message.length > 300) return /* alert hidden */ console.log("300文字以内で入力してください。");
      if (!(await appConfirm(`以下の内容を全ユーザーに通知します。よろしいですか？\n\n「${message}」`))) return;
      btn.disabled = true; btn.innerText = "送信中…"; statusEl.innerText = "ユーザーを取得しています…";
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const total = usersSnap.size; let done = 0;
        statusEl.innerText = `送信中… 0 / ${total}`;
        const notifItem = { id: "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text: message, type: "admin", read: false, createdAt: Date.now() };
        const docs = usersSnap.docs; const chunkSize = 20;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (userDoc) => {
            try {
              const data = userDoc.data() || {};
              const list = Array.isArray(data.notifications) ? [...data.notifications] : [];
              list.unshift(notifItem);
              capNotifications(list);
              await updateDoc(doc(db, "users", userDoc.id), { notifications: list });
            } catch (e) {}
            done++; statusEl.innerText = `送信中… ${done} / ${total}`;
          }));
        }
        statusEl.innerText = `✅ 完了！ ${total}人に送信しました。`;
        showToast("一斉通知を送信しました！", "success");
        msgEl.value = "";
      } catch (e) {
        statusEl.innerText = "送信に失敗しました。";
        /* alert hidden */ console.log("送信に失敗しました。");
      } finally {
        btn.disabled = false; btn.innerText = "📢 全員に通知を送信する";
      }
    };

    // ===== いいね検証・補正（運営用） =====
    let lastLikeAudit = [];
    async function fetchLikeAudit() {
      const [postsSnap, usersSnap, likesSnap] = await Promise.all([
        getDocs(collection(db, "posts")),
        getDocs(collection(db, "users")),
        getDocs(collectionGroup(db, "likes"))
      ]);
      const nick = {}, legacy = {}, docsMap = {};
      usersSnap.docs.forEach(u => {
        const d = u.data();
        nick[u.id] = d.profile?.nickname || "名無し";
        (Array.isArray(d.likes) ? d.likes : []).forEach(pid => { (legacy[pid] = legacy[pid] || new Set()).add(u.id); });
      });
      likesSnap.docs.forEach(l => {
        const pid = l.ref.parent.parent && l.ref.parent.parent.id; if (!pid) return;
        (docsMap[pid] = docsMap[pid] || new Set()).add(l.id);
      });
      return postsSnap.docs.map(d => {
        const data = d.data();
        const uids = new Set([...(legacy[d.id] || []), ...(docsMap[d.id] || [])]);
        const shown = Math.max(0, Number(data.likesCount) || 0);
        const missing = [...uids].filter(u => !(docsMap[d.id] && docsMap[d.id].has(u)));
        return { id: d.id, give: data.give || "", userName: data.userName || "", shown, real: uids.size, diff: shown - uids.size, uids: [...uids], missing, names: [...uids].slice(0, 8).map(u => nick[u] || "不明") };
      }).sort((a, b) => b.diff - a.diff);
    }
    async function fixLikesRow(r) {
      for (let i = 0; i < r.missing.length; i += 20) {
        await Promise.all(r.missing.slice(i, i + 20).map(uid => setDoc(doc(db, "posts", r.id, "likes", uid), { uid, createdAt: serverTimestamp(), migrated: true })));
      }
      await updateDoc(doc(db, "posts", r.id), { likesCount: r.real });
    }
    window.adminFixLikes = async function(postId) {
      if (!isAdmin()) return;
      const r = lastLikeAudit.find(x => x.id === postId); if (!r) return;
      if (!(await appConfirm(`「${r.give}」のいいねを ${r.shown} → ${r.real} に補正します。よろしいですか？`))) return;
      try { await fixLikesRow(r); /* alert hidden */ console.log("補正しました。"); loadAdminData(); } catch (e) { console.error(e); /* alert hidden */ console.log("補正に失敗しました。"); }
    };
    window.adminFixAllLikes = async function() {
      if (!isAdmin()) return;
      const targets = lastLikeAudit.filter(r => r.diff !== 0 || r.missing.length > 0);
      if (!targets.length) return;
      if (!(await appConfirm(`${targets.length} 件の投稿を、記録のある実数に補正します。\n旧方式で付いたいいね数は0に戻ります。よろしいですか？`))) return;
      let ok = 0, ng = 0;
      for (const r of targets) { try { await fixLikesRow(r); ok++; } catch (e) { ng++; console.error(e); } }
      /* alert hidden */ console.log(`補正完了: 成功 ${ok} 件 / 失敗 ${ng} 件`);
      loadAdminData();
    };

    window.deleteReportedPost = async function(postId, reportId) {
      if(!(await appConfirm("強制削除しますか？"))) return;
      try {
        const snap = await getDocs(collection(db, "posts", postId, "photos")); await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        const js = await getDocs(collection(db, "posts", postId, "joins")); await Promise.all(js.docs.map(d => deleteDoc(d.ref)));
        await deleteDoc(doc(db, "posts", postId)); delete photoCache[postId];
        await deleteDoc(doc(db, "reports", reportId)); /* alert hidden */ console.log("削除しました。"); loadAdminData();
      } catch(e){}
    };
    
    function isUnread(t) { return currentUser && t && t.lastMessageAt && t.lastSenderId !== currentUser.uid && tsMillis(t.lastMessageAt) > ((userData.reads || {})[t.id] || 0); }
    function markTradeRead(t) {
      if (!currentUser || !t || !isUnread(t)) return;
      const ms = tsMillis(t.lastMessageAt); userData.reads = { ...(userData.reads || {}), [t.id]: ms };
      saveUserData({ reads: { [t.id]: ms } }).catch(()=>{});
    }
    async function postMessage(data) {
      const t = currentTrade; if (!t || !currentUser) return;
      await addDoc(collection(db, "trades", t.id, "messages"), { ...data, senderId: currentUser.uid, senderName: getMyDisplayName(), createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() });
      try { await updateDoc(doc(db, "trades", t.id), { lastMessageAt: serverTimestamp(), lastSenderId: currentUser.uid }); } catch (e) {}
    }

    function getBlockedUsers() { return userData.blocked || []; }
    window.blockUser = async function(userId, userName) {
      if (!currentUser || !userId || !(await appConfirm(`「${userName}」さんをブロックしますか？`, "ブロックする", true))) return;
      const list = [...getBlockedUsers()];
      if (!list.includes(userId)) { list.push(userId); userData.blocked = list; try { await saveUserData({ blocked: list }); } catch(e){return;} }
      /* alert hidden */ console.log("ブロックしました。"); closeDetailModal(); renderPosts();
    };
    window.clearBlockedUsers = async function() {
      if (!currentUser || !(await appConfirm("ブロックをすべて解除しますか？", "解除する"))) return;
      userData.blocked = []; try { await saveUserData({ blocked: [] }); } catch(e){}
      /* alert hidden */ console.log("解除しました。"); renderBlockedBox(); renderPosts();
    };
    function renderBlockedBox() { const el = document.getElementById("blocked-users-box"); if (el) el.innerText = getBlockedUsers().length === 0 ? "なし" : `${getBlockedUsers().length}人をブロック中`; }
    function getMyLikes() { return userData.likes || []; }
    // ===== いいね：posts/{postId}/likes/{uid} を正とし、カウントと同じトランザクションで更新 =====
    const likeBusy = new Set();
    let deviceOkFor = null;
    async function checkDeviceLockCached() {
      if (!currentUser) return false;
      if (deviceOkFor === currentUser.uid) return true;
      const ok = await checkDeviceLock();
      if (ok) deviceOkFor = currentUser.uid;
      return ok;
    }
    async function toggleLikeServer(postId) {
      const postRef = doc(db, "posts", postId);
      const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
      return runTransaction(db, async (tx) => {
        const ps = await tx.get(postRef);
        const ls = await tx.get(likeRef);
        if (!ps.exists()) throw new Error("notfound");
        const cnt = Math.max(0, Number(ps.data().likesCount) || 0);
        if (ls.exists()) {
          tx.delete(likeRef);
          if (cnt > 0) tx.update(postRef, { likesCount: cnt - 1 });
          return { liked: false, count: Math.max(0, cnt - 1) };
        }
        tx.set(likeRef, { uid: currentUser.uid, deviceId: getOrCreateDeviceId(), createdAt: serverTimestamp() });
        tx.update(postRef, { likesCount: cnt + 1 });
        return { liked: true, count: cnt + 1 };
      });
    }
    async function doToggleLike(p) {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      if (!p || likeBusy.has(p.id)) return;
      if (!(await checkDeviceLockCached())) return;
      likeBusy.add(p.id);
      try {
        const r = await toggleLikeServer(p.id);
        p.likesCount = r.count;
        const likes = getMyLikes().filter(x => x !== p.id);
        if (r.liked) likes.push(p.id);
        userData.likes = likes;
        saveUserData({ likes }).catch(() => {});
      } catch (e) {
        console.warn("like error:", e?.code || e);
        showToast("いいねに失敗しました。時間をおいてもう一度お試しください。", "error");
      } finally { likeBusy.delete(p.id); }
      updateDetailLikeUI(p.id); renderPosts();
    }
    window.toggleDetailLike = function() { doToggleLike(allPosts[currentDetailIndex]); };
    function updateDetailLikeUI(postId) {
      const p = allPosts.find(x => x.id === postId);
      const likesCount = p ? (Number(p.likesCount) || 0) : 0;
      const liked = getMyLikes().includes(postId); 
      const btn = document.getElementById("detail-like-btn"); if (!btn) return;
      btn.className = liked ? "bg-pink-500 text-white font-medium px-4 py-2 rounded-full text-xs border border-pink-500 transition shadow-md flex items-center space-x-1" : "bg-white/80 text-pink-500 font-medium px-4 py-2 rounded-full text-xs border border-white hover:bg-white transition flex items-center space-x-1 shadow-md";
      document.getElementById("detail-like-icon").innerText = liked ? "♥" : "♡";
      document.getElementById("detail-like-count").innerText = likesCount;
    }

    function normalizeProfileZipDigits(value) {
      return String(value || "").replace(/\D/g, "").slice(0, 7);
    }
    function formatProfileZipDisplay(digits) {
      const d = normalizeProfileZipDigits(digits);
      if (d.length > 3) return d.slice(0, 3) + "-" + d.slice(3);
      return d;
    }
    function clearProfileZipSuggestions() {
      const box = document.getElementById("profile-zip-suggestions");
      const hint = document.getElementById("profile-zip-hint");
      if (box) {
        box.innerHTML = "";
        box.classList.add("hidden");
      }
      if (hint) hint.textContent = "7桁入れると下に候補が出ます。タップで住所を入れられます。";
    }
    function renderProfileZipSuggestions(results, zipDigits) {
      const box = document.getElementById("profile-zip-suggestions");
      const hint = document.getElementById("profile-zip-hint");
      if (!box) return;
      if (!results || !results.length) {
        box.classList.remove("hidden");
        box.innerHTML = `<p class="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">該当する住所が見つかりませんでした。郵便番号を確認してください。</p>`;
        if (hint) hint.textContent = "候補なし";
        return;
      }
      const uniq = [];
      const seen = new Set();
      results.forEach((row) => {
        const pref = String(row.address1 || "");
        const city = String(row.address2 || "");
        const town = String(row.address3 || "");
        const line = (pref + city + town).trim();
        if (!line || seen.has(line)) return;
        seen.add(line);
        uniq.push({ pref, city, town, line });
      });
      box.classList.remove("hidden");
      box.innerHTML =
        `<p class="text-[10px] font-bold text-purple-700 px-0.5">候補をタップして住所を入れる（番地は手入力）</p>` +
        uniq.map((row, idx) =>
          `<button type="button" data-zip-suggest="${idx}" class="w-full text-left rounded-xl border border-purple-100 bg-white px-3 py-2.5 shadow-sm active:scale-[0.99] transition">
            <div class="text-[13px] font-bold text-gray-900 leading-snug">${escapeHtml(row.line)}</div>
            <div class="text-[10px] text-gray-500 mt-0.5">〒${escapeHtml(formatProfileZipDisplay(zipDigits))} · 続けて番地を入力</div>
          </button>`
        ).join("");
      box.querySelectorAll("[data-zip-suggest]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-zip-suggest"));
          const picked = uniq[i];
          if (!picked) return;
          const zipEl = document.getElementById("profile-zip");
          const addrEl = document.getElementById("profile-address1");
          if (zipEl) zipEl.value = formatProfileZipDisplay(zipDigits);
          if (addrEl) {
            addrEl.value = picked.line;
            addrEl.focus();
            try {
              const len = addrEl.value.length;
              addrEl.setSelectionRange(len, len);
            } catch (e) {}
          }
          if (typeof showToast === "function") {
            showToast("住所を入れました。番地・建物名を続けて入力してください", "success");
          }
          box.querySelectorAll("button").forEach((b) => {
            b.classList.remove("ring-2", "ring-purple-400", "bg-purple-50");
          });
          btn.classList.add("ring-2", "ring-purple-400", "bg-purple-50");
        });
      });
      if (hint) hint.textContent = uniq.length + "件の候補があります。タップで入力できます。";
    }
    window.lookupProfileZipAddress = async function(options = {}) {
      const silent = !!options.silent;
      const zipEl = document.getElementById("profile-zip");
      const hint = document.getElementById("profile-zip-hint");
      const box = document.getElementById("profile-zip-suggestions");
      const digits = normalizeProfileZipDigits(zipEl && zipEl.value);
      if (zipEl && zipEl.value !== formatProfileZipDisplay(digits) && digits.length >= 3) {
        // 入力中の整形は7桁到達時のみ（途中でのカーソル飛びを避ける）
        if (digits.length === 7) zipEl.value = formatProfileZipDisplay(digits);
      }
      if (digits.length !== 7) {
        if (!silent) {
          clearProfileZipSuggestions();
          if (hint) hint.textContent = "郵便番号は7桁で入力してください";
          if (typeof showToast === "function") showToast("郵便番号は7桁で入力してください", "error");
        }
        return;
      }
      if (hint) hint.textContent = "住所を検索中...";
      if (box) {
        box.classList.remove("hidden");
        box.innerHTML = `<p class="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">検索中...</p>`;
      }
      try {
        const res = await fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + encodeURIComponent(digits), {
          method: "GET",
          cache: "no-store"
        });
        if (!res.ok) throw new Error("lookup failed");
        const data = await res.json();
        if (data && data.status === 200) {
          renderProfileZipSuggestions(data.results || [], digits);
        } else {
          renderProfileZipSuggestions([], digits);
        }
      } catch (error) {
        console.warn("zip lookup error:", error);
        if (box) {
          box.classList.remove("hidden");
          box.innerHTML = `<p class="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">住所検索に失敗しました。通信状況を確認するか、住所を手入力してください。</p>`;
        }
        if (hint) hint.textContent = "検索に失敗しました。手入力もできます。";
        if (!silent && typeof showToast === "function") {
          showToast("住所検索に失敗しました", "error");
        }
      }
    };
    function bindProfileZipLookup() {
      const zipEl = document.getElementById("profile-zip");
      if (!zipEl || zipEl.dataset.zipBound === "1") return;
      zipEl.dataset.zipBound = "1";
      let timer = null;
      const schedule = () => {
        clearTimeout(timer);
        const digits = normalizeProfileZipDigits(zipEl.value);
        if (digits.length === 7) {
          timer = setTimeout(() => window.lookupProfileZipAddress({ silent: true }), 280);
        } else {
          timer = setTimeout(() => clearProfileZipSuggestions(), 120);
        }
      };
      zipEl.addEventListener("input", () => {
        const digits = normalizeProfileZipDigits(zipEl.value);
        // 入力中は数字以外を除去しつつ、7桁でハイフン付き表示
        if (/[^\d-]/.test(zipEl.value) || zipEl.value.replace(/\D/g, "").length !== digits.length) {
          zipEl.value = digits.length === 7 ? formatProfileZipDisplay(digits) : digits;
          try { zipEl.setSelectionRange(zipEl.value.length, zipEl.value.length); } catch (e) {}
        } else if (digits.length === 7 && zipEl.value !== formatProfileZipDisplay(digits)) {
          zipEl.value = formatProfileZipDisplay(digits);
        }
        schedule();
      });
      zipEl.addEventListener("blur", () => {
        const digits = normalizeProfileZipDigits(zipEl.value);
        if (digits.length === 7) zipEl.value = formatProfileZipDisplay(digits);
      });
      zipEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          window.lookupProfileZipAddress();
        }
      });
    }

    window.openProfileModal = async function(section = "basic") {
      if (!currentUser) return;
      profileSection = section;
      const titles = { basic: "✏️ プロフィール・写真", address: "📦 住所・配送先", paypay: "🔒 アズカリ決済ガイド", push: "📢 プッシュ通知", block: "🚫 ブロック管理" };
      document.getElementById("profile-modal-title").innerText = titles[section] || "設定";
      ["basic","address","paypay","push","block"].forEach(s => {
        const el = document.getElementById("profile-section-" + s);
        if (el) el.classList.toggle("hidden", s !== section);
      });
      if (section === "address") {
        try {
          const shipping = await loadPrivateShipping(currentUser.uid);
          mergeShippingIntoLocalProfile(shipping);
        } catch (e) { console.warn("openProfile shipping:", e?.code || e); }
      }
      const s = userData.profile || {};
      pendingProfilePhoto = null;
      document.getElementById("profile-nickname").value = s.nickname || "";
      const pp = document.getElementById("profile-paypay"); if (pp) pp.value = s.paypay || "";
      document.getElementById("profile-name").value = s.name || currentUser.displayName || "";
      document.getElementById("profile-zip").value = s.zip ? formatProfileZipDisplay(s.zip) : "";
      document.getElementById("profile-address1").value = s.address1 || "";
      document.getElementById("profile-xid").value = s.xId || s.twitter || s.xUsername || "";
      document.getElementById("profile-address2").value = s.address2 || "";
      document.getElementById("profile-phone").value = s.phone || "";
      clearProfileZipSuggestions();
      bindProfileZipLookup();
      const preview = document.getElementById("profile-photo-preview");
      const clearBtn = document.getElementById("profile-photo-clear");
      if (s.photo && isJpegData(s.photo)) {
        preview.innerHTML = `<img src="${s.photo}" class="w-full h-full object-cover">`;
        clearBtn.classList.remove("hidden");
      } else {
        preview.innerHTML = "👤"; clearBtn.classList.add("hidden");
      }
      renderBlockedBox(); updatePushUI();
      document.getElementById("profile-modal").classList.remove("hidden");
      if (section === "address") {
        const existingZip = normalizeProfileZipDigits(s.zip || "");
        if (existingZip.length === 7 && !(s.address1 || "").trim()) {
          setTimeout(() => window.lookupProfileZipAddress({ silent: true }), 50);
        }
      }
    };
    window.closeProfileModal = function() { document.getElementById("profile-modal").classList.add("hidden"); pendingProfilePhoto = null; };

    window.handleProfilePhoto = async function(inputEl) {
      const file = inputEl.files && inputEl.files[0]; inputEl.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const img = await loadImageFromFile(file);
        const data = compressFromImage(img, PROFILE_PHOTO);
        pendingProfilePhoto = data;
        const preview = document.getElementById("profile-photo-preview");
        preview.innerHTML = `<img src="${data}" class="w-full h-full object-cover">`;
        document.getElementById("profile-photo-clear").classList.remove("hidden");
      } catch (e) { /* alert hidden */ console.log("画像の処理に失敗しました。"); }
    };
    window.clearProfilePhoto = function() {
      pendingProfilePhoto = "";
      document.getElementById("profile-photo-preview").innerHTML = "👤";
      document.getElementById("profile-photo-clear").classList.add("hidden");
    };

    window.saveProfile = async function() {
      if (!currentUser) return;
      const prev = userData.profile || {};
      let p = {};
      let shippingPatch = null;

      // セクションごとに更新する項目を限定（他項目を空で上書きしない）
      if (profileSection === "address") {
        shippingPatch = {
          name: document.getElementById("profile-name").value.trim(),
          zip: document.getElementById("profile-zip").value.trim(),
          address1: document.getElementById("profile-address1").value.trim(),
          address2: document.getElementById("profile-address2").value.trim(),
          phone: document.getElementById("profile-phone").value.trim()
        };
        p = {
          xId: document.getElementById("profile-xid").value.trim().replace(/^@/, "")
        };
        if (!shippingPatch.name || !shippingPatch.zip || !shippingPatch.address1) return /* alert hidden */ console.log("お名前・郵便番号・住所は必須です。");
        if (!/^\d{3}-?\d{4}$/.test(shippingPatch.zip)) return /* alert hidden */ console.log("郵便番号は7桁の数字で入力してください。（例: 123-4567）");
      } else if (profileSection === "basic") {
        p = {
          nickname: document.getElementById("profile-nickname").value.trim()
        };
        if (pendingProfilePhoto !== null) {
          p.photo = pendingProfilePhoto; // "" の場合は写真削除
        }
        // 写真を触っていないときは既存 photo を維持（上書きしない）
      } else if (profileSection === "paypay") {
        p = {
          paypay: (document.getElementById("profile-paypay") && document.getElementById("profile-paypay").value || "").trim()
        };
      } else {
        // 念のためのフォールバック（全項目マージだが空上書きは避ける）
        const nick = document.getElementById("profile-nickname").value.trim();
        const paypay = (document.getElementById("profile-paypay") && document.getElementById("profile-paypay").value || "").trim();
        const name = document.getElementById("profile-name").value.trim();
        const zip = document.getElementById("profile-zip").value.trim();
        const address1 = document.getElementById("profile-address1").value.trim();
        const address2 = document.getElementById("profile-address2").value.trim();
        const phone = document.getElementById("profile-phone").value.trim();
        const xId = document.getElementById("profile-xid").value.trim().replace(/^@/, "");
        if (nick) p.nickname = nick;
        if (paypay || paypay === "") p.paypay = paypay;
        if (xId) p.xId = xId;
        if (name || zip || address1) {
          shippingPatch = {
            name: name || "",
            zip: zip || "",
            address1: address1 || "",
            address2: address2 || "",
            phone: phone || ""
          };
        }
        if (pendingProfilePhoto !== null) p.photo = pendingProfilePhoto;
      }

      try {
        if (shippingPatch) {
          await savePrivateShipping(shippingPatch);
        }
        // 公開プロフィールには配送先PIIを残さない
        const mergedPublic = stripShippingFromProfile({ ...prev, ...p });
        userData.profile = mergedPublic;
        if (shippingPatch) mergeShippingIntoLocalProfile(shippingPatch);
        await saveUserData({ profile: mergedPublic });
      } catch (e) {
        console.error(e);
        return /* alert hidden */ console.log("失敗しました。\n" + (e?.code || e?.message || ""));
      }
      try {
        const { data } = await rewardCalls.claimProfileOrInviteBonus({});
        userData.points = Number(data.totalPoints);
        userData.inviteCode = data.inviteCode || userData.inviteCode;
        userData.profileBonusGranted = userData.profileBonusGranted || data.profileAwarded;
        userData.referredBy = data.referredBy || userData.referredBy;
      } catch (e) {
        console.error("Profile bonus claim failed:", e);
        showToast("ポイント特典を反映できませんでした。時間をおいて再度お試しください。", "error");
      }
      showToast("設定を保存しました！", "success");
      closeProfileModal();
      if (!document.getElementById("mypage-section").classList.contains("hidden")) window.renderRewards();
      renderSellTab();
      if (currentUser) {
        document.getElementById("user-name").innerText = getMyDisplayName();
        updateUserAvatar();
      }
      if (currentTrade) { renderRoomAddressBox(); renderRoomPayPayBox(); }
    };
    function getMyProfile() { return currentUser && userData.profile && Object.keys(userData.profile).length ? userData.profile : null; }
    function getMyDisplayName() { return getMyProfile()?.nickname || currentUser?.displayName || "匿名ファン"; }
    function getMyShipping() {
      const fromPrivate = userData.shipping || {};
      const fromProfile = userData.profile || {};
      return {
        name: fromPrivate.name || fromProfile.name || "",
        zip: fromPrivate.zip || fromProfile.zip || "",
        address1: fromPrivate.address1 || fromProfile.address1 || "",
        address2: fromPrivate.address2 || fromProfile.address2 || "",
        phone: fromPrivate.phone || fromProfile.phone || ""
      };
    }
    window.getMyShipping = getMyShipping;

    window.sendMyAddress = async function() {
      if (!currentTrade || !currentUser) return;
      let ship = getMyShipping();
      if (!ship.zip || !ship.address1 || !ship.name) {
        try {
          ship = { ...ship, ...(await loadPrivateShipping(currentUser.uid)) };
          mergeShippingIntoLocalProfile(ship);
        } catch (e) {}
      }
      if (!ship.zip || !ship.address1 || !ship.name) {
        /* alert hidden */ console.log("マイページから住所を入力してください。");
        openProfileModal("address");
        return;
      }
      try {
        await setDoc(tradeShippingRef(currentTrade.id, currentUser.uid), {
          ...pickShippingFields(ship),
          sharedAt: serverTimestamp(),
          sharedBy: currentUser.uid
        }, { merge: true });
        await postMessage({
          senderId: currentUser.uid,
          senderName: getMyDisplayName(),
          text: "【配送先情報を共有しました】取引ルーム上部の「配送先の共有」から確認できます。",
          createdAt: serverTimestamp()
        });
        renderRoomAddressBox();
        showToast("配送先を相手と共有しました", "success");
      } catch (e) {
        console.error(e);
        showToast("配送先の共有に失敗しました", "error");
      }
    };
    window.copyPayPayId = function(idStr) { navigator.clipboard.writeText(idStr).then(()=>/* alert hidden */ console.log("コピーしました！")).catch(()=>{}); };

    function loadImageFromFile(file) {
      return new Promise((res, rej) => {
        const reader = new FileReader(); reader.onerror = rej;
        reader.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => res(img); img.src = reader.result; };
        reader.readAsDataURL(file);
      });
    }
    function compressFromImage(img, opt) {
      let maxSide = opt.maxSide, quality = opt.quality;
      for (let i = 0; i < 7; i++) {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.max(1, img.width * scale); canvas.height = Math.max(1, img.height * scale);
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", quality); if (out.length < opt.maxChars) return out;
        maxSide = Math.round(maxSide * 0.8); quality = Math.max(0.4, quality - 0.07);
      } throw new Error("画像大");
    }
        async function compressImage(file, opt) { return compressFromImage(await loadImageFromFile(file), opt); }

        function loadImageFast(file) {
      return new Promise((res, rej) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
        img.src = url;
      });
    }

    async function compressCardClean(file, opt) {
      const o = opt || PHOTO_THUMB;
      const img = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const scale = Math.min(1, o.maxW / img.width, o.maxH / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", o.quality || 0.85);
    }

    async function compressCardWithWatermark(file, opt) {
      const img = await loadImageFast(file);
      let maxSide = opt.maxSide, quality = opt.quality;
      for (let i = 0; i < 7; i++) {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        const fontSize = Math.max(16, Math.round(Math.min(canvas.width, canvas.height) * 0.28));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
        ctx.lineWidth = Math.max(1, fontSize * 0.06);

        const stepY = fontSize * 2.2;
        for (let y = -canvas.height; y <= canvas.height; y += stepY) {
          ctx.strokeText("SAMPLE", 0, y);
          ctx.fillText("SAMPLE", 0, y);
        }
        ctx.restore();

        const out = canvas.toDataURL("image/jpeg", quality);
        canvas.width = 0;
        canvas.height = 0;
        if (out.length < opt.maxChars) return out;
        maxSide = Math.round(maxSide * 0.8);
        quality = Math.max(0.4, quality - 0.07);
      }
      throw new Error("画像サイズが大きすぎます");
    }


    function pushStorageKey() { return "illit_push_" + currentUser.uid; }

    function updatePushUI() {
      const onBtn = document.getElementById("push-on-btn"), offBtn = document.getElementById("push-off-btn"), status = document.getElementById("push-status");
      if (!onBtn || !currentUser) return;
      const on = !!localStorage.getItem(pushStorageKey());
      onBtn.classList.toggle("hidden", on); offBtn.classList.toggle("hidden", !on);
      status.innerText = on ? "この端末：通知オン ✅" : "この端末：通知オフ";
    }

    async function saveToken() {
      let reg;
      try {
        reg = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
      } catch (swErr) {
        console.error("Service Worker 登録エラー:", swErr);
        throw new Error("「/firebase-messaging-sw.js」が読み込めません。ルート直下に配置されているか確認してください。");
      }

      const options = { serviceWorkerRegistration: reg, vapidKey: VAPID_KEY };

      const token = await getToken(getMessaging(app), options);
      if (!token) throw new Error("通知トークンの取得に失敗しました。");

      await setDoc(doc(db, "users", currentUser.uid, "tokens", token), { 
        token, 
        ua: navigator.userAgent.slice(0, 120), 
        updatedAt: serverTimestamp() 
      });
      await setDoc(doc(db, "users", currentUser.uid), {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.setItem(pushStorageKey(), token);
      bindForegroundPush();
    }

    // アプリを開いている間はOSの通知が出ないため、トーストで知らせる
    let fgPushBound = false;
    function bindForegroundPush() {
      if (fgPushBound) return;
      try {
        onMessage(getMessaging(app), (payload) => {
          const n = payload.notification || payload.data || {};
          showToast("🔔 " + [n.title, n.body].filter(Boolean).join(" "), "info");
        });
        fgPushBound = true;
      } catch (e) { console.warn("onMessage bind error:", e); }
    }

    window.enablePush = async function() {
      if (!currentUser || !("Notification" in window) || !("serviceWorker" in navigator)) {
        return /* alert hidden */ console.log("お使いのブラウザはプッシュ通知に対応していません。");
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return /* alert hidden */ console.log("プッシュ通知はHTTPS通信（またはlocalhost）環境でのみ動作します。");
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        markPushPromptAsked();
        return /* alert hidden */ console.log("通知権限が拒否されています。ブラウザの設定から通知を許可してください。");
      }

      try { 
        await saveToken(); 
        markPushPromptAsked();
        updatePushUI(); 
        renderSellTab(); showToast("通知をオンにしました！", "success");
      } catch(e){ 
        console.error("プッシュ通知設定エラー:", e);
        /* alert hidden */ console.log("設定失敗: " + (e.message || e)); 
      }
    };

    // ===== 初回のみ通知オン確認 =====
    const PUSH_PROMPT_KEY = "illit_push_prompt_asked_v1";
    function hasAskedPushPrompt() {
      try { return localStorage.getItem(PUSH_PROMPT_KEY) === "1"; } catch (e) { return true; }
    }
    function markPushPromptAsked() {
      try { localStorage.setItem(PUSH_PROMPT_KEY, "1"); } catch (e) {}
    }
    window.dismissPushPrompt = function() {
      markPushPromptAsked();
      const m = document.getElementById("push-prompt-modal");
      if (m) m.classList.add("hidden");
    };
    window.openPushPromptModal = function() {
      const m = document.getElementById("push-prompt-modal");
      if (m) m.classList.remove("hidden");
    };
    window.enablePushFromPrompt = async function() {
      markPushPromptAsked();
      const m = document.getElementById("push-prompt-modal");
      if (m) m.classList.add("hidden");
      await enablePush();
    };
    window.maybeShowPushPrompt = function() {
      try {
        if (hasAskedPushPrompt()) return;
        if (!currentUser) return;
        if (!hasAgreedLocally()) return;
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          markPushPromptAsked();
          return;
        }
        // すでにオン
        if (Notification.permission === "granted" && localStorage.getItem(pushStorageKey())) {
          markPushPromptAsked();
          return;
        }
        // 拒否済みは再表示しない
        if (Notification.permission === "denied") {
          markPushPromptAsked();
          return;
        }
        // 利用規約・他モーダルと被らないよう少し遅らせる
        setTimeout(() => {
          if (hasAskedPushPrompt() || !currentUser) return;
          if (!hasAgreedLocally()) return;
          const terms = document.getElementById("terms-modal");
          if (terms && !terms.classList.contains("hidden")) return;
          openPushPromptModal();
        }, 900);
      } catch (e) {
        console.warn("maybeShowPushPrompt", e);
      }
    };

    async function removePushToken() {
      if (!currentUser) return;
      const token = localStorage.getItem(pushStorageKey());
      try { 
        if (token) await deleteDoc(doc(db, "users", currentUser.uid, "tokens", token)); 
        if ("serviceWorker" in navigator && "Notification" in window) await deleteToken(getMessaging(app)); 
      } catch(e){}
      localStorage.removeItem(pushStorageKey());
    }

    window.disablePush = async function() { 
      await removePushToken(); 
      updatePushUI(); 
      renderSellTab(); showToast("通知をオフにしました。", "info");
    };

    function isInAppBrowser() {
      const ua = String(navigator.userAgent || "");
      if (/Instagram/i.test(ua)) return true;
      if (/Twitter/i.test(ua)) return true;
      if (/TwitterAndroid/i.test(ua)) return true;
      if (/\bX\//i.test(ua)) return true;
      if (/\bLine\//i.test(ua)) return true;
      if (/musical_ly|BytedanceWebview|TikTok|trill_|aweme/i.test(ua)) return true;
      if (/FBAN|FBAV|FB_IAB|Threads\//i.test(ua)) return true;
      if (/Snapchat|Pinterest/i.test(ua)) return true;
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isStandaloneBrowser = /Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
      if (isIOS && /AppleWebKit/i.test(ua) && !isStandaloneBrowser) return true;
      return false;
    }
    window.isInAppBrowser = isInAppBrowser;

    function googleLoginHelpCopy(error) {
      const code = error && error.code ? String(error.code) : "";
      const message = error && error.message ? String(error.message) : "";
      const joined = code + " " + message;
      if (code === "auth/account-exists-with-different-credential") {
        return {
          title: "ログイン方法が違います",
          lead: "このメールアドレスは別の方法ですでに登録されています。以前使った方法で入るか、下のメールアドレスでログインしてください。"
        };
      }
      if (code === "auth/popup-blocked") {
        return {
          title: "Googleログインを完了できませんでした",
          lead: "ポップアップがブロックされたため、Googleの画面を開けませんでした。Safariで開き直すか、下のメールアドレスで登録・ログインしてください。"
        };
      }
      if (isInAppBrowser() || /disallowed_useragent/i.test(joined)) {
        return {
          title: "Safariで開くとGoogleログインできます",
          lead: "Xの画面右下にあるコンパスマーク（または『⋯』メニュー）から『ブラウザで開く（Safari）』を選択してください"
        };
      }
      return {
        title: "Googleログインを完了できませんでした",
        lead: "このブラウザではGoogleログインが正常に動作しませんでした。Safariで開き直すか、下のメールアドレスで登録・ログインしてください。"
      };
    }

    function syncFirstVisitWelcome() {
      const card = document.getElementById("first-visit-welcome");
      if (!card) return;
      let dismissed = false;
      try {
        dismissed = localStorage.getItem("illit_welcome_card_dismissed") === "1";
      } catch (e) {
        dismissed = false;
      }
      if (dismissed || currentUser) {
        card.classList.add("hidden");
        return;
      }
      card.classList.remove("hidden");
    }
    window.dismissFirstVisitWelcome = function() {
      try {
        localStorage.setItem("illit_welcome_card_dismissed", "1");
      } catch (e) {}
      const card = document.getElementById("first-visit-welcome");
      if (card) card.classList.add("hidden");
    };
    window.syncFirstVisitWelcome = syncFirstVisitWelcome;

    window.closeGoogleLoginHelp = function() {
      const modal = document.getElementById("xlogin-help-modal");
      if (modal) modal.classList.add("hidden");
    };

    window.openGoogleLoginHelp = function(error) {
      const modal = document.getElementById("xlogin-help-modal");
      if (!modal) return;
      const copy = googleLoginHelpCopy(error || null);
      const title = document.getElementById("xlogin-help-title");
      const lead = document.getElementById("xlogin-help-lead");
      const status = document.getElementById("xlogin-copy-status");
      const emailError = document.getElementById("xlogin-email-error");
      if (title) title.textContent = copy.title;
      if (lead) lead.textContent = copy.lead;
      if (status) status.textContent = "";
      if (emailError) emailError.textContent = "";
      modal.classList.remove("hidden");
    };

    window.copyLoginPageUrl = async function() {
      const status = document.getElementById("xlogin-copy-status");
      const url = String(location.href || "");
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
          copied = true;
        }
      } catch (e) {
        copied = false;
      }
      if (!copied) {
        try {
          const area = document.createElement("textarea");
          area.value = url;
          area.setAttribute("readonly", "readonly");
          area.style.position = "fixed";
          area.style.top = "0";
          area.style.left = "0";
          area.style.width = "1px";
          area.style.height = "1px";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.focus();
          area.select();
          copied = document.execCommand("copy");
          document.body.removeChild(area);
        } catch (e) {
          copied = false;
        }
      }
      if (status) {
        if (copied) {
          status.textContent = "コピーしました！Safariのアドレスバーに貼り付けて開いてください";
        } else {
          status.textContent = "コピーできませんでした。アドレスバーのURLを長押ししてコピーしてください。";
        }
      }
    };

    window.focusEmailAuthForm = function() {
      const box = document.getElementById("xlogin-email-box");
      const email = document.getElementById("xlogin-email");
      if (box && box.scrollIntoView) {
        box.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      if (email) email.focus();
    };

    function emailAuthErrorText(error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "auth/email-already-in-use") return "このメールアドレスは登録済みです。下の「ログイン」を押してください。";
      if (code === "auth/invalid-email") return "メールアドレスの形式を確認してください。";
      if (code === "auth/weak-password") return "パスワードは6文字以上にしてください。";
      if (code === "auth/user-not-found") return "このメールアドレスは未登録です。上の「新規登録」を押してください。";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "メールアドレスかパスワードが違います。";
      if (code === "auth/too-many-requests") return "試行が多すぎます。しばらくしてからお試しください。";
      if (code === "auth/operation-not-allowed") return "メールでの登録は現在使えません。SafariからGoogleログインをお試しください。";
      if (code === "auth/network-request-failed") return "通信できませんでした。電波のよい場所でもう一度お試しください。";
      return "登録・ログインできませんでした。入力内容を確認してもう一度お試しください。";
    }

    window.submitEmailAuth = function(mode) {
      const emailInput = document.getElementById("xlogin-email");
      const passwordInput = document.getElementById("xlogin-password");
      const errorBox = document.getElementById("xlogin-email-error");
      const email = emailInput ? String(emailInput.value || "").trim() : "";
      const password = passwordInput ? String(passwordInput.value || "") : "";
      if (errorBox) errorBox.textContent = "";
      if (!email || email.indexOf("@") < 1) {
        if (errorBox) errorBox.textContent = "メールアドレスを入力してください。";
        if (emailInput) emailInput.focus();
        return;
      }
      if (!password || password.length < 6) {
        if (errorBox) errorBox.textContent = "パスワードは6文字以上にしてください。";
        if (passwordInput) passwordInput.focus();
        return;
      }
      const run = async function() {
        if (window.__emailAuthBusy) return;
        window.__emailAuthBusy = true;
        try {
          if (mode === "register") {
            await createUserWithEmailAndPassword(auth, email, password);
          } else {
            await signInWithEmailAndPassword(auth, email, password);
          }
          window.closeGoogleLoginHelp();
          if (typeof showToast === "function") showToast("ログインしました", "success");
        } catch (error) {
          if (errorBox) errorBox.textContent = emailAuthErrorText(error);
        } finally {
          window.__emailAuthBusy = false;
        }
      };
      if (typeof window.requireTermsAgreement === "function" &&
          !window.requireTermsAgreement({ resume: function() { run(); } })) {
        return;
      }
      run();
    };

         window.loginWithGoogle = function() { 
      // iPhoneのホーム画面アプリでもSafariでも、小窓（ポップアップ）方式に統一
      // Auto-GO 参加途中なら、今開いているプールを復帰先に覚えておく
      try {
        const poolId = window.__agActivePoolId || window.__pendingAutoGoPoolId ||
          (new URLSearchParams(location.search).get("pool") || "");
        if (poolId && typeof window.__agRememberPoolForLogin === "function") {
          window.__agRememberPoolForLogin(poolId);
        }
      } catch (_) {}
      if (isInAppBrowser()) {
        window.openGoogleLoginHelp(null);
        return;
      }
      // 未同意なら先に利用規約同意ボタン → アプリ登録案内
      if (typeof window.requireTermsAgreement === "function" &&
          !window.requireTermsAgreement({ resume: function() { window.loginWithGoogle(); } })) {
        return;
      }
      signInWithPopup(auth, provider).catch(e => {
        const code = e && e.code ? String(e.code) : "";
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          return;
        }
        window.openGoogleLoginHelp(e);
      });
    };
   
    window.logout = async function() { closeRoom(); await removePushToken(); signOut(auth); };

    // ===== DAU（日次アクティブ）記録 =====
    function tokyoDateKey(dateObj) {
      const d = dateObj || new Date();
      try {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(d);
      } catch (_) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
      }
    }
    function tokyoDateKeysLastN(n) {
      const keys = [];
      const now = Date.now();
      for (let i = n - 1; i >= 0; i--) {
        keys.push(tokyoDateKey(new Date(now - i * 86400000)));
      }
      return keys;
    }
    async function recordDailyActiveUser(force) {
      if (!currentUser) return;
      const day = tokyoDateKey();
      const localKey = "illit_dau_" + currentUser.uid + "_" + day;
      if (!force && localStorage.getItem(localKey) === "1") return;
      try {
        const visitorRef = doc(db, "dailyActive", day, "visitors", currentUser.uid);
        const dayRef = doc(db, "dailyActive", day);
        // Firestore トランザクションは「全読み取り → 全書き込み」の順が必須。
        // 以前は visitor 書き込み後に day を読んで失敗し、DAU がほぼ記録されていなかった。
        let recorded = false;
        await runTransaction(db, async (tx) => {
          const visitorSnap = await tx.get(visitorRef);
          const daySnap = await tx.get(dayRef);
          if (visitorSnap.exists()) {
            recorded = false;
            return;
          }
          const prev = daySnap.exists() ? (Number(daySnap.data().count) || 0) : 0;
          tx.set(visitorRef, { at: serverTimestamp(), uid: currentUser.uid });
          tx.set(dayRef, { count: prev + 1, updatedAt: serverTimestamp() }, { merge: true });
          recorded = true;
        });
        localStorage.setItem(localKey, "1");
        if (recorded || force) {
          saveUserData({ lastLoginAt: serverTimestamp() }).catch(() => {});
        }
      } catch (e) {
        console.warn("DAU record:", e?.code || e?.message || e);
        // 失敗時はローカル済みフラグを立てない（次回リトライ）
        try { localStorage.removeItem(localKey); } catch (_) {}
      }
    }
    window.recordDailyActiveUser = recordDailyActiveUser;

    // 日付跨ぎ・タブ復帰でも DAU を拾う
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && currentUser) {
        recordDailyActiveUser().catch(() => {});
      }
    });
    window.addEventListener("focus", () => {
      if (currentUser) recordDailyActiveUser().catch(() => {});
    });

    onAuthStateChanged(auth, (user) => {
      currentUser = user; window.currentUser = currentUser; window.currentUser = currentUser; window.currentUser = currentUser;
      const loginBtn = document.getElementById("login-btn"), userProfile = document.getElementById("user-profile");
      if (user) {
        if (dailyBonusRequestUid !== user.uid) {
          dailyBonusRequestUid = user.uid;
          (async () => {
            try {
              const { data } = await rewardCalls.claimDailyLoginBonus();
              loginCalendarData = data;
              userData.points = Number(data.totalPoints) || 0;
              userData.loginStamps = Array.isArray(data.loginStamps) ? data.loginStamps : [];
              userData.lastLoginBonusDate = data.lastLoginBonusDate || "";
              if (!document.getElementById("mypage-section").classList.contains("hidden")) window.renderRewards();
              if (data.awarded) {
                showToast(`ログインボーナス +${data.pointsAdded}pt獲得！`, "success");
                window.openLoginCalendar(true);
              }
            } catch (e) {
              console.error("Daily login bonus claim failed:", e);
            }
            try {
              const { data } = await rewardCalls.claimProfileOrInviteBonus({});
              userData.points = Number(data.totalPoints);
              userData.inviteCode = data.inviteCode || userData.inviteCode;
              userData.profileBonusGranted = userData.profileBonusGranted || data.profileAwarded;
              userData.referredBy = data.referredBy || userData.referredBy;
              if (!document.getElementById("mypage-section").classList.contains("hidden")) window.renderRewards();
            } catch (e) {
              console.error("Profile bonus initialization failed:", e);
            }
          })();
        }
        loginBtn.classList.add("hidden"); userProfile.classList.remove("hidden");
        document.getElementById("user-name").innerText = getMyDisplayName();
        updateUserAvatar();
        subscribeUserData(); subscribeTrades(); subscribeSuspension();
        if (typeof loadPosts === "function") loadPosts(true);
        setTimeout(() => { if (typeof updateUserAvatar === "function") updateUserAvatar(); }, 800);
        if ("Notification" in window && Notification.permission === "granted" && localStorage.getItem(pushStorageKey())) saveToken().catch(()=>{});
        // ログイン済みでも未同意なら同意ボタン必須（X経由でもログイン後は必須）
        setTimeout(function() {
          if (typeof window.hasAgreedTerms === "function" && !window.hasAgreedTerms() &&
              typeof window.requireTermsAgreement === "function") {
            window.requireTermsAgreement({
              resume: function() {
                if (typeof window.__agConsumePendingPoolAfterLogin === "function") {
                  window.__agConsumePendingPoolAfterLogin();
                }
              }
            });
          } else if (typeof maybeShowPushPrompt === "function") {
            maybeShowPushPrompt();
          }
        }, 350);
        recordDailyActiveUser().catch(() => {});
        // Auto-GO プールを先読み（開いたときの待ちを減らす）
        setTimeout(function() {
          if (typeof window.__loadAutoGoPools === "function") {
            Promise.resolve(window.__loadAutoGoPools({ prefetch: true })).catch(function() {});
          }
        }, 300);
        // 規約済みならログイン後に Auto-GO へ復帰
        setTimeout(function() {
          if (typeof window.hasAgreedTerms === "function" && window.hasAgreedTerms() &&
              typeof window.__agConsumePendingPoolAfterLogin === "function") {
            window.__agConsumePendingPoolAfterLogin();
          }
        }, 500);
        if (typeof window.closeGoogleLoginHelp === "function") window.closeGoogleLoginHelp();
        syncFirstVisitWelcome();
      } else {
        dailyBonusRequestUid = null;
        loginCalendarData = null;
        window.closeLoginCalendar();
        loginBtn.classList.remove("hidden"); userProfile.classList.add("hidden");
        if (unsubTrades) unsubTrades(); if (unsubUser) unsubUser(); if (unsubNotifs) unsubNotifs(); unsubTrades=null; unsubUser=null; unsubNotifs=null; serverNotifs = [];
        tradesLoaded = false;
        if (typeof loadPosts === "function" && allPosts.length === 0) loadPosts(true);
        if (unsubSusp) { unsubSusp(); unsubSusp = null; }
        document.getElementById("suspended-modal").classList.add("hidden");
        userData = { profile: {}, blocked: [], likes: [], reads: {}, notifications: [], cancelHistory: [], myCards: {}, collectionPublic: false, customCards: [], cardWatch: {}, points: 0, pointHistory: [], inviteCode: "", loginStamps: [], lastLoginBonusDate: "", profileBonusGranted: false, referredBy: "" }; myTrades = []; updateBadge(); updateNotifBadge();
        window.renderRewards();
        prevUnreadCount = -1; prevTradeCountAsOwner = -1;
        window._tradeWatchReady = false;
        window._tradeWatch = {};
        updateUserAvatar();
        // X経由の未ログインは投稿をそのまま表示。それ以外は規約ゲート
        setTimeout(function() {
          if (typeof window.maybeGateTermsOnBoot === "function") window.maybeGateTermsOnBoot();
        }, 200);
        syncFirstVisitWelcome();
      }
    });

    window.openPostModal = async function(mode) {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      try {
        if (typeof checkDeviceLock === "function" && !(await checkDeviceLock())) return;
      } catch (lockErr) {
        console.warn("checkDeviceLock skipped:", lockErr);
      }
      postMode = mode;
      const isBuy = mode === "buy";
      const isAlbum = mode.startsWith("album");
      const isDearlit = mode.startsWith("dearlit");
      const isSell = mode.endsWith("_sell") || mode === "buy";
      const isActualSell = mode.endsWith("_sell");
      const isExchange = mode === "exchange";
      let title = "商品の情報を入力";
      if (mode === "buy") title = "商品の情報を入力";
      else if (isExchange) title = "商品の情報を入力";
      else if (isActualSell) title = "商品の情報を入力";

      const _byId = (id) => document.getElementById(id);
      if (_byId("post-modal-title")) _byId("post-modal-title").innerText = title;
      if (_byId("label-give")) {
        _byId("label-give").innerText = isBuy
          ? "商品名（求）"
          : (isActualSell ? "商品名" : "商品名（譲）");
      }
      if (_byId("input-give")) {
        _byId("input-give").placeholder = "40字以内、例）ILLIT ミンジュ 封入トレカ";
        _byId("input-give").maxLength = 40;
      }
      if (_byId("label-want")) {
        _byId("label-want").innerText = "希望するもの（求）";
      }
      if (_byId("input-want")) {
        _byId("input-want").placeholder = "例）同じメンバーの別衣装トレカ";
      }
      if (_byId("label-member")) _byId("label-member").innerText = "カテゴリー（メンバー）";
      if (_byId("label-desc")) {
        _byId("label-desc").innerHTML = '商品の説明 <span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">任意</span>';
      }
      if (_byId("input-desc")) {
        _byId("input-desc").placeholder = "1,000字以内、例）スリーブ保管・折れなし。写真の状態です。";
        _byId("input-desc").maxLength = 1000;
        _byId("input-desc").rows = 5;
      }
      if (_byId("label-price")) _byId("label-price").innerText = isBuy ? "希望価格（円）" : "販売価格";
      if (_byId("want-container")) _byId("want-container").classList.toggle("hidden", isBuy || isSell);
      if (_byId("price-container")) _byId("price-container").classList.toggle("hidden", !(isBuy || isSell));
      if (_byId("photo-req-label")) _byId("photo-req-label").innerText = (isBuy) ? "（任意・最大3枚）" : "（必須・最大3枚）";
      if (_byId("condition-container")) _byId("condition-container").classList.remove("hidden");

      ["input-give", "input-want", "input-price", "input-desc", "input-condition"].forEach(id => {
        if (_byId(id)) _byId(id).value = "";
      });
      if (_byId("input-shipping")) _byId("input-shipping").value = "";
      postPhotos = [];
      if (typeof renderPostPhotoPreview === "function") renderPostPhotoPreview();
      selectedPostCard = null;
      postCardAlbum = "srm";

      try {
        Promise.all([ensureCatalogCardsLoaded(), ensureCardPhotosLoaded()]).catch(() => {});
      } catch (_) {}

      const _pm = _byId("post-modal");
      const bundleBox = document.getElementById("bundle-box");
      if (bundleBox) bundleBox.classList.add("hidden");
      // まとめて出品ボタン経由なら bundle、通常は single にリセット（__isBulkMode の残留防止）
      const wantBundle = !!(window.__fromBulkBtn);
      window.exchangeStyle = wantBundle ? "bundle" : "single";
      window.__isBulkMode = wantBundle;
      window.isBulkMode = wantBundle;
      const styleBox = document.getElementById("exchange-style-box");
      if (styleBox) styleBox.classList.toggle("hidden", mode !== "exchange");
      if (mode === "exchange" && typeof setExchangeStyle === "function") {
        setExchangeStyle(wantBundle ? "bundle" : "single");
      } else {
        window.__isBulkMode = false;
        window.isBulkMode = false;
        window.exchangeStyle = "single";
      }
      bundleExtras = [];
      window._pendingBundleBoxes = [];
      window.__presetGuideBoxes = null;
      const detectEl = document.getElementById("bundle-detect");
      if (detectEl) detectEl.textContent = "";
      renderBundleList();
      if (typeof applyListingLayout === "function") applyListingLayout({ isActualSell, isBuy, isExchange });
      if (_pm) {
        _pm.classList.remove("hidden");
        _pm.style.display = "";
      } else {
        /* alert hidden */ console.log("エラー: post-modal が見つかりません");
      }
    };

    const SELL_FEE_RATE = 0.044;
    const POST_DRAFT_KEY = "illit_listing_draft_v2";
    const EXCHANGE_SHIPPING_LABEL = {
      consult: "相手と相談",
      regular: "普通郵便",
      clickpost: "クリックポスト",
      yuupacket: "ゆうパケット",
      letterpack: "レターパック（追跡あり）",
      takkyubin: "宅配便",
      other: "その他",
      // 旧データの表示互換（送料負担の選択肢だった頃）
      seller: "出品者負担（送料込み）",
      buyer: "相手負担",
      cod: "着払い",
      split: "折半"
    };
    const EXCHANGE_SHIPPING_TRACKED = {
      letterpack: true,
      takkyubin: true,
      yuupacket: true,
      clickpost: true
    };
    function placePriceInput(isActualSell) {
      const input = document.getElementById("input-price");
      const buyHost = document.getElementById("price-input-host-buy");
      const sellHost = document.getElementById("price-input-host-sell");
      if (!input || !buyHost || !sellHost) return;
      if (isActualSell) {
        if (input.parentElement !== sellHost) sellHost.appendChild(input);
        input.className = "sell-price-input";
        input.placeholder = "300〜";
        buyHost.classList.add("hidden");
      } else {
        if (input.parentElement !== buyHost) buyHost.appendChild(input);
        input.className = "liquid-glass-input w-full rounded-xl p-2.5 text-gray-800";
        input.placeholder = "希望価格";
        buyHost.classList.remove("hidden");
      }
    }
    function syncShippingRow(isActualSell, isExchange) {
      const row = document.getElementById("shipping-row");
      const sellFixed = document.getElementById("shipping-sell-fixed");
      const exSelect = document.getElementById("shipping-exchange-select");
      const show = !!(isActualSell || isExchange);
      if (row) row.classList.toggle("hidden", !show);
      // 売却のみアズカリ固定表示。交換では絶対に出さない
      if (sellFixed) {
        sellFixed.classList.toggle("hidden", !isActualSell);
        sellFixed.setAttribute("aria-hidden", isActualSell ? "false" : "true");
      }
      if (exSelect) exSelect.classList.toggle("hidden", !isExchange);
      const shipLabel = document.getElementById("label-shipping");
      if (shipLabel && isExchange) {
        shipLabel.innerHTML = '配送方法 <span class="text-pink-600">必須</span>';
      }
    }
    function applyListingLayout(opts) {
      const isActualSell = !!(opts && opts.isActualSell);
      const isBuy = !!(opts && opts.isBuy);
      const isExchange = !!(opts && opts.isExchange);
      const modal = document.getElementById("post-modal");
      const sellCard = document.getElementById("sell-price-card");
      const labelPrice = document.getElementById("label-price");
      const secondary = document.getElementById("post-secondary-btn");
      const submit = document.getElementById("post-submit-btn");
      if (modal) {
        modal.classList.add("post-modal--listing");
        modal.classList.remove("post-modal--sell");
      }
      if (sellCard) sellCard.classList.toggle("hidden", !isActualSell);
      if (labelPrice) labelPrice.classList.toggle("hidden", !!isActualSell);
      placePriceInput(!!isActualSell);
      syncShippingRow(isActualSell, isExchange);
      if (secondary) {
        secondary.textContent = "下書きに保存";
        secondary.onclick = function() { if (typeof saveListingDraft === "function") saveListingDraft(); };
      }
      if (submit) {
        submit.textContent = "出品する";
        submit.className = "flex-1 text-white font-medium py-3 transition";
      }
      updateSellFeePreview();
      try {
        const raw = localStorage.getItem(POST_DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.postMode === postMode) {
            const map = {
              "input-give": d.give,
              "input-want": d.want,
              "input-desc": d.desc,
              "input-price": d.price,
              "input-condition": d.condition,
              "input-member": d.member,
              "input-shipping": d.shipping
            };
            Object.keys(map).forEach((id) => {
              const el = document.getElementById(id);
              if (el && map[id] != null && map[id] !== "") el.value = map[id];
            });
            updateSellFeePreview();
          }
        }
      } catch (_) {}
    }
    // 旧名互換
    function applySellListingLayout(isActualSell, isBuy) {
      applyListingLayout({ isActualSell, isBuy, isExchange: postMode === "exchange" });
    }
    window.updateSellFeePreview = function() {
      const input = document.getElementById("input-price");
      const feeEl = document.getElementById("sell-fee-display");
      const profitEl = document.getElementById("sell-profit-display");
      if (!feeEl || !profitEl) return;
      const price = Number(input && input.value);
      if (!price || price <= 0) {
        feeEl.textContent = "—";
        feeEl.className = "text-gray-400";
        profitEl.textContent = "—";
        profitEl.className = "text-gray-400";
        return;
      }
      const fee = Math.floor(price * SELL_FEE_RATE);
      const profit = Math.max(0, price - fee);
      feeEl.textContent = "¥" + fee.toLocaleString();
      feeEl.className = "text-gray-700 font-medium";
      profitEl.textContent = "¥" + profit.toLocaleString();
      profitEl.className = "text-gray-900 font-bold";
    };
    window.saveListingDraft = function() {
      try {
        const draft = {
          postMode,
          give: (document.getElementById("input-give") || {}).value || "",
          want: (document.getElementById("input-want") || {}).value || "",
          desc: (document.getElementById("input-desc") || {}).value || "",
          price: (document.getElementById("input-price") || {}).value || "",
          condition: (document.getElementById("input-condition") || {}).value || "",
          member: (document.getElementById("input-member") || {}).value || "",
          shipping: (document.getElementById("input-shipping") || {}).value || "",
          savedAt: Date.now()
        };
        localStorage.setItem(POST_DRAFT_KEY, JSON.stringify(draft));
        if (typeof showToast === "function") showToast("下書きを保存しました", "success");
        else console.log("下書きを保存しました");
      } catch (e) {
        if (typeof showToast === "function") showToast("下書きの保存に失敗しました", "error");
      }
    };
    window.saveSellListingDraft = window.saveListingDraft;
    window.clearSellListingDraft = function() {
      try { localStorage.removeItem(POST_DRAFT_KEY); } catch (_) {}
    };
    window.clearListingDraft = window.clearSellListingDraft;
    window.setExchangeStyle = function(style) {
      window.exchangeStyle = style === "bundle" ? "bundle" : "single";
      const bundle = window.exchangeStyle === "bundle";
      // 1枚/まとめ切替でフラグを同期（まとめガイド枠の残留を防ぐ）
      window.__isBulkMode = bundle;
      window.isBulkMode = bundle;
      setTimeout(function(){ try{ if(typeof window.syncGuideCamByMode==="function") window.syncGuideCamByMode(); }catch(e){} },0);
      const singleBtn = document.getElementById("exchange-style-single");
      const bundleBtn = document.getElementById("exchange-style-bundle");
      if (singleBtn) singleBtn.className = "py-2 rounded-full text-[13px] font-medium " + (bundle ? "text-gray-500" : "bg-white text-gray-900 shadow-sm");
      if (bundleBtn) bundleBtn.className = "py-2 rounded-full text-[13px] font-medium " + (bundle ? "bg-white text-gray-900 shadow-sm" : "text-gray-500");
      const guide = document.getElementById("exchange-style-guide");
      if (guide) guide.textContent = bundle
        ? "カードを並べた写真を入れてください。まとめ切り抜きと同じ画面で、感度・枠の追加・解除・切り抜きができます。"
        : "1枚を机に置いて、明るくして、真上から撮ってください。近いカードを自動で入れます。";
      const figure = document.getElementById("post-guide-figure");
      if (figure) figure.classList.remove("hidden");
      const photoLabel = document.getElementById("photo-section-label");
      if (photoLabel && postMode === "exchange") {
        photoLabel.innerHTML = bundle
          ? '📷 まとめ写真 <span id="photo-req-label" class="text-pink-600">（必須・1枚）</span>'
          : '📷 トレカ写真・AI自動入力 <span id="photo-req-label" class="text-pink-600">（必須・最大3枚）</span>';
      }
      const suggest = document.getElementById("similar-cards-suggest");
      if (suggest && bundle) { suggest.classList.add("hidden"); suggest.innerHTML = ""; }
      const box = document.getElementById("bundle-box");
      if (box) box.classList.toggle("hidden", !bundle);
      if (typeof mountBundleCropTool === "function") mountBundleCropTool(bundle);
      if (!bundle) {
        window._pendingBundleBoxes = [];
        window._bundleCrops = [];
        window.__presetGuideBoxes = null;
        const cropHost = document.getElementById("bundle-crop-host");
        if (cropHost) cropHost.innerHTML = "";
        const bulkSetup = document.getElementById("bulk-slot-setup-box");
        if (bulkSetup && !window.__fromBulkBtn) bulkSetup.classList.add("hidden");
      }
    };
    window.closePostModal = function() {
      if (typeof mountBundleCropTool === "function") mountBundleCropTool(false);
      window.__isBulkMode = false;
      window.isBulkMode = false;
      window.exchangeStyle = "single";
      window.__presetGuideBoxes = null;
      try { if (typeof window.syncGuideCamByMode === "function") window.syncGuideCamByMode(); } catch (e) {}
      const pm = document.getElementById("post-modal");
      if (pm) {
        pm.classList.add("hidden");
        pm.classList.remove("post-modal--sell");
        pm.classList.remove("post-modal--listing");
      }
      selectedPostCard = null;
    };
    function renderPostCardPicker() {
      const tabsEl = document.getElementById("post-card-album-tabs");
      const listEl = document.getElementById("post-card-list");
      const selEl = document.getElementById("post-card-selected");
      if (!tabsEl || !listEl) return;
      const activeChip = "filter-chip bg-illit-purple text-white shadow-md text-[11px]";
      const normalChip = "filter-chip bg-white/70 text-gray-700 hover:bg-white text-[11px]";
      tabsEl.innerHTML = ILLIT_CARD_ALBUMS.map(a =>
        `<button type="button" onclick="setPostCardAlbum('${a.id}')" class="${a.id === postCardAlbum ? activeChip : normalChip}">${a.name}</button>`
      ).join("") + `<button type="button" onclick="clearPostCardSelection()" class="filter-chip bg-white/50 text-gray-500 text-[11px]">選択解除</button>`;
      const cards = getAlbumCards(postCardAlbum).filter(c => !c.custom);
      listEl.innerHTML = cards.map(c => {
        const on = selectedPostCard && selectedPostCard.id === c.id;
        return `<button type="button" onclick="selectPostCard('${escapeHtml(c.id)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] ${on ? "bg-illit-purple/15 text-illit-darkPurple font-bold border border-illit-purple/30" : "hover:bg-white/70 text-gray-800"}">
          <span class="font-medium">${escapeHtml(c.name)}</span>
          <span class="text-gray-500 ml-1">${c.member ? escapeHtml(c.member) : ""}</span>
        </button>`;
      }).join("") || '<p class="text-[11px] text-gray-500 text-center py-2">このアルバムにカードがありません</p>';
      if (selEl) {
        if (selectedPostCard) {
          selEl.classList.remove("hidden");
          selEl.textContent = "選択中: " + selectedPostCard.name + (selectedPostCard.member ? "（" + selectedPostCard.member + "）" : "");
        } else {
          selEl.classList.add("hidden");
          selEl.textContent = "";
        }
      }
    }
    window.setPostCardAlbum = function(id) {
      postCardAlbum = id;
      renderPostCardPicker();
    };
    window.selectPostCard = function(cardId) {
      let found = null;
      for (const a of ILLIT_CARD_ALBUMS) {
        const c = getAlbumCards(a.id).find(x => x.id === cardId);
        if (c) { found = { id: c.id, name: c.name, member: c.member || "", albumId: a.id, albumName: a.name || "" }; break; }
      }
      selectedPostCard = found;
      if (found) {
        const giveEl = document.getElementById("input-give");
        const giveText = [found.albumName, found.member].filter(Boolean).join(" / ");
        if (giveEl && !giveEl.value.trim()) giveEl.value = giveText;
        if (found.member) {
          const memEl = document.getElementById("input-member");
          if (memEl) {
            const opts = Array.from(memEl.options);
            const hit = opts.find(o => o.value.includes(found.member) || found.member.includes(o.value.split(" ")[0]));
            if (hit) memEl.value = hit.value;
          }
        }
      }
      renderPostCardPicker();
    };
    window.clearPostCardSelection = function() {
      selectedPostCard = null;
      renderPostCardPicker();
    };

    function renderPostPhotoPreview() {
      const el1 = document.getElementById("post-photo-preview"), el2 = document.getElementById("group-photo-preview");
      let html = postPhotos.map((p, i) => `<div class="relative w-20 h-20"><img src="${p.thumb}" class="w-20 h-20 object-cover rounded-xl shadow-sm border border-white/50"><button onclick="removePostPhoto(${i})" class="absolute -top-1.5 -right-1.5 bg-gray-700/80 backdrop-blur text-white text-xs font-bold w-5 h-5 rounded-full hover:scale-110">×</button></div>`).join("");
      if (processingPhotos) html += '<div class="w-20 h-20 rounded-xl bg-white/50 flex items-center justify-center text-xl shadow-sm">⏳</div>';
      if (el1) el1.innerHTML = html;
      if (el2) {
        let more = html;
        if (!processingPhotos && postPhotos.length < MAX_POST_PHOTOS) more += `<button onclick="document.getElementById('post-photo-input').click()" class="w-20 h-20 rounded-xl border border-white bg-white/40 text-purple-600 text-xs font-medium flex flex-col items-center justify-center hover:bg-white/60 transition shadow-sm"><span class="text-2xl leading-none">＋</span>追加</button>`;
        el2.innerHTML = more;
      }
    }
        window.addPostPhotos = async function(inputEl) {
      const files = Array.from(inputEl.files || []); inputEl.value = "";
      if (files.length === 0 || processingPhotos) return;
      const targets = files.filter(f => f.type.startsWith("image/")).slice(0, MAX_POST_PHOTOS - postPhotos.length);
      if (targets.length === 0) return;
      const isFirstPhoto = postPhotos.length === 0;
      processingPhotos = true; renderPostPhotoPreview();
      try {
        for (const f of targets) {
          const img = await loadImageFromFile(f);
          postPhotos.push({ full: compressFromImage(img, PHOTO_FULL), thumb: compressFromImage(img, PHOTO_THUMB) });
          if (isFirstPhoto) window._pendingRecogImage = compressFromImage(img, { maxSide: 1400, quality: 0.92, maxChars: 1200000 });
        }
        if (isFirstPhoto && window._pendingRecogImage && typeof runCardImageRecognition === "function" && !(postMode === "exchange" && window.exchangeStyle === "bundle")) {
          runCardImageRecognition(window._pendingRecogImage);
        }
        if (isFirstPhoto && postMode === "exchange" && window.exchangeStyle === "bundle" && postPhotos[0] && !window.__fromGuide) {
          if (typeof openBundleFrameEditor === "function") openBundleFrameEditor();
        }
      } catch(e) {} finally { window.__fromGuide = false; processingPhotos = false; renderPostPhotoPreview(); }
    };

    window.removePostPhoto = function(i) { postPhotos.splice(i, 1); renderPostPhotoPreview(); };

    let bundleExtras = [];
    function renderBundleList() {
      const el = document.getElementById("bundle-list");
      if (!el) return;
      el.innerHTML = bundleExtras.map((row, i) => `
        <div class="bg-white border border-gray-200 rounded-xl p-2 space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-[11px] text-gray-500">${i + 2}枚目</span>
            <button type="button" onclick="removeBundleRow(${i})" class="text-[11px] text-gray-400">削除</button>
          </div>
          <input value="${escapeHtml(row.give || "")}" oninput="bundleExtras[${i}].give=this.value" maxlength="100" placeholder="出すカード" class="w-full bg-[#f6f6f7] rounded-lg px-2.5 py-2 text-[13px]">
          <input value="${escapeHtml(row.want || "")}" oninput="bundleExtras[${i}].want=this.value" maxlength="100" placeholder="希望するカード" class="w-full bg-[#f6f6f7] rounded-lg px-2.5 py-2 text-[13px]">
          <label class="block text-[12px] text-gray-600">
            ${row.thumb ? "写真を変更" : "写真を追加"}
            <input type="file" accept="image/*" class="hidden" onchange="setBundlePhoto(${i}, this)">
          </label>
          ${row.thumb ? `<img src="${row.thumb}" alt="" class="w-16 h-20 object-cover rounded-lg">` : ""}
        </div>`).join("");
    }
    window.addBundleRow = function() {
      if (bundleExtras.length >= 7) return /* alert hidden */ console.log("一度に追加できるのは8枚までです。");
      bundleExtras.push({ give: "", want: "", full: "", thumb: "" });
      renderBundleList();
    };
    window.removeBundleRow = function(i) { bundleExtras.splice(i, 1); renderBundleList(); };
    window.setBundlePhoto = async function(i, input) {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file || !bundleExtras[i]) return;
      try {
        const img = await loadImageFromFile(file);
        bundleExtras[i].full = compressFromImage(img, PHOTO_FULL);
        bundleExtras[i].thumb = compressFromImage(img, PHOTO_THUMB);
        renderBundleList();
      } catch (e) { /* alert hidden */ console.log("写真を読み込めませんでした"); }
    };

    window.submitPost = async function() {
      if (typeof checkCancelAccountLock === "function" && checkCancelAccountLock()) {
        showToast("いまは出品できません", "error");
        return;
      }
      if (submittingPost) return;
      if (processingPhotos) {
        showToast("写真の準備が終わるまで待ってください", "info");
        return;
      }
      if (!(await checkDeviceLock())) return;
      const isBuy = postMode === "buy";
      const isAlbum = postMode.startsWith("album");
      const isDearlit = postMode.startsWith("dearlit");
      const isSell = postMode.endsWith("_sell") || postMode === "buy";
      let kind = "card";
      if (isAlbum) kind = "album";
      else if (isDearlit) kind = "dearlit";
      const memberInput = document.getElementById("input-member");
      const giveInput = document.getElementById("input-give");
      const wantInput = document.getElementById("input-want");
      const shippingInput = document.getElementById("input-shipping");
      const priceInput = document.getElementById("input-price");
      const descInput = document.getElementById("input-desc");
      const conditionInput = document.getElementById("input-condition");
      if (!memberInput || !giveInput || !wantInput || !descInput || !conditionInput) {
        showToast("入力欄を読み込めませんでした。画面を開き直してください", "error");
        return;
      }
      const member = memberInput.value;
      const bundleMode = postMode === "exchange" && window.exchangeStyle === "bundle";
      let give = giveInput.value.trim();
      let want = wantInput.value.trim();
      if (bundleMode) {
        if (!give) give = "まとめ出品";
        if (!want) want = "複数希望（枠指定）";
      }
      const price = (isBuy || isSell) ? Number(priceInput ? priceInput.value : 0) : 0;
      const desc = descInput.value.trim().slice(0, 1000);
      const condition = conditionInput.value;
      const isActualSellPost = postMode.endsWith("_sell");
      const isExchangePost = postMode === "exchange";
      const shippingMethod = isActualSellPost
        ? "azukari_anonymous"
        : (isExchangePost ? String((shippingInput && shippingInput.value) || "").trim() : "");
      const shippingLabel = isActualSellPost
        ? "アズカリ匿名配送"
        : (isExchangePost ? (EXCHANGE_SHIPPING_LABEL[shippingMethod] || shippingMethod) : "");
      if (isExchangePost && !shippingMethod) {
        showToast("配送方法を選択してください", "info");
        return;
      }
      if (!give) {
        showToast("出すものを入力してください", "info");
        return;
      }
      if (!isBuy && !isSell && !want) {
        showToast("希望するものを入力してください", "info");
        return;
      }
      if ((isBuy || isSell) && (!price || price <= 0)) {
        showToast("価格を入力してください", "info");
        return;
      }
      if (!condition) {
        showToast("商品の状態を選択してください", "info");
        return;
      }
      if (!isBuy && postPhotos.length < 1) {
        showToast("写真を1枚以上追加してください", "info");
        return;
      }
      const isExchange = postMode === "exchange";
      if (isExchange) {
        for (let rowIndex = 0; rowIndex < bundleExtras.length; rowIndex++) {
          const row = bundleExtras[rowIndex];
          const rowGive = String(row.give || "").trim();
          const rowWant = String(row.want || "").trim();
          if (!rowGive || !rowWant || !row.full) {
            showToast("追加したカードは、出すもの・希望・写真をすべて入れてください", "info");
            return;
          }
        }
      }
      const submitButton = document.getElementById("post-submit-btn");
      submittingPost = true;
      setBusyButton(submitButton, true, "出品中…");
      try {
        const catalogCardId = selectedPostCard ? selectedPostCard.id : "";
        const catalogCardName = selectedPostCard ? selectedPostCard.name : "";
        const items = [{
          give: give,
          want: (isBuy || isSell) ? "" : want,
          photos: postPhotos.slice(),
          catalogCardId: catalogCardId || null,
          catalogCardName: catalogCardName || null
        }];
        if (isExchange) {
          bundleExtras.forEach(function(row) {
            items.push({
              give: row.give.trim(),
              want: row.want.trim(),
              photos: [{ full: row.full, thumb: row.thumb }],
              catalogCardId: null,
              catalogCardName: null
            });
          });
        }
        let bundleBoxes = [];
        if (bundleMode && postPhotos[0]) {
          if (Array.isArray(window.__bulkSlots) && window.__bulkSlots.length) {
            bundleBoxes = asUnitBoxes(window.__bulkSlots).map(function(box) {
              return { x: box.x, y: box.y, w: box.w, h: box.h, state: "open" };
            });
          } else {
            const liveBoxes = sheetCropState && sheetCropState.img && Array.isArray(sheetCropState.boxes) ? sheetCropState.boxes : [];
            if (liveBoxes.length && sheetCropState.img) {
              const sourceImage = sheetCropState.img;
              bundleBoxes = liveBoxes.filter(function(box) {
                return box && box.active !== false && box.w > 8 && box.h > 8;
              }).map(function(box) {
                return {
                  x: box.x / sourceImage.width,
                  y: box.y / sourceImage.height,
                  w: box.w / sourceImage.width,
                  h: box.h / sourceImage.height,
                  state: "open"
                };
              });
            } else if (Array.isArray(window._pendingBundleBoxes) && window._pendingBundleBoxes.length) {
              bundleBoxes = asUnitBoxes(window._pendingBundleBoxes).map(function(box) {
                return { x: box.x, y: box.y, w: box.w, h: box.h, state: "open" };
              });
            } else {
              const detectedBoxes = await detectBundleBoxes(postPhotos[0].full);
              bundleBoxes = asUnitBoxes(detectedBoxes).map(function(box) {
                return { x: box.x, y: box.y, w: box.w, h: box.h, state: "open" };
              });
            }
          }
          if (bundleBoxes.length < 1) {
            showToast("まとめ出品では、写真の枠を1つ以上設定してください", "info");
            return;
          }
        }
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          const item = items[itemIndex];
          const useBundle = bundleMode && bundleBoxes.length >= 2 && itemIndex === 0;
          const bulkExtra = (bundleMode && Array.isArray(window.__bulkSlots) && window.__bulkSlots.length > 0)
            ? { isBulk: true, bulkSlots: JSON.parse(JSON.stringify(window.__bulkSlots)) }
            : { isBulk: false };
          const ref = await addDoc(collection(db, "posts"), {
            isBulk: bulkExtra.isBulk,
            bulkSlots: bulkExtra.bulkSlots || [],
            kind: kind,
            isBuy: isBuy,
            isSell: isSell && !isBuy,
            member: member,
            give: item.give,
            want: item.want,
            price: (isBuy || isSell) ? price : 0,
            sellFeeRate: (isSell && !isBuy) ? SELL_FEE_RATE : null,
            description: desc,
            condition: condition,
            shippingMethod: shippingMethod || null,
            shippingLabel: shippingLabel || null,
            shippingTrackingRequired: isActualSellPost
              ? true
              : (isExchangePost ? !!EXCHANGE_SHIPPING_TRACKED[shippingMethod] : false),
            status: "active",
            photoCount: item.photos.length,
            thumb: item.photos.length > 0 ? item.photos[0].thumb : "",
            userId: currentUser.uid,
            userName: getMyDisplayName(),
            userPhoto: getMyProfile() ? (getMyProfile().photo || "") : "",
            likesCount: 0,
            createdAt: serverTimestamp(),
            deviceId: getOrCreateDeviceId(),
            paymentMethod: "azukari",
            catalogCardId: item.catalogCardId,
            catalogCardName: item.catalogCardName,
            bundleBoxes: useBundle ? bundleBoxes : [],
            bundleTotal: useBundle ? bundleBoxes.length : 0,
            bundleLeft: useBundle ? bundleBoxes.length : 0
          });
          for (let photoIndex = 0; photoIndex < item.photos.length; photoIndex++) {
            await addDoc(collection(db, "posts", ref.id, "photos"), {
              data: item.photos[photoIndex].full,
              order: photoIndex,
              createdAt: serverTimestamp()
            });
          }
          if (useBundle && item.photos[0]) {
            await addDoc(collection(db, "posts", ref.id, "photos"), {
              data: item.photos[0].full,
              order: -1,
              role: "base",
              createdAt: serverTimestamp()
            });
          }
          if (item.catalogCardId) {
            notifyCardWatchers(item.catalogCardId, item.catalogCardName || item.give, ref.id).catch(function() {});
          }
        }
        if (typeof clearSellListingDraft === "function") clearSellListingDraft();
        showToast(items.length > 1 ? items.length + "件出品しました" : "出品が完了しました", "success");
        closePostModal();
        loadPosts(true);
        switchTab("home");
      } catch (error) {
        console.error(error);
        const errorText = error && error.message ? error.message : "失敗しました";
        showToast("出品できませんでした: " + errorText, "error");
      } finally {
        submittingPost = false;
        setBusyButton(submitButton, false);
      }
    };

    async function notifyCardWatchers(cardId, cardName, postId) {
      if (!cardId || !currentUser) return;
      try {
        const snap = await getDocs(collection(db, "cardWatchers", cardId, "users"));
        const targets = snap.docs.map(d => d.id).filter(uid => uid !== currentUser.uid);
        if (targets.length === 0) return;
        const text = `「${cardName || "トレカ"}」が出品されました`;
        const itemBase = {
          id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          text,
          type: "card_list",
          read: false,
          createdAt: Date.now(),
          target: { type: "post", id: postId }
        };
        // 最大20人まで（負荷抑制）
        for (const uid of targets.slice(0, 20)) {
          try {
            const uref = doc(db, "users", uid);
            const us = await getDoc(uref);
            const list = us.exists() ? [...(us.data().notifications || [])] : [];
            list.unshift({ ...itemBase, id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) });
            capNotifications(list);
            await updateDoc(uref, { notifications: list });
          } catch (e) { console.warn("notify user failed", uid, e?.code || e); }
        }
      } catch (e) {
        console.warn("notifyCardWatchers:", e?.code || e);
      }
    }

    window.openSerialPostModal = async function(mode) {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      try {
        if (typeof checkDeviceLock === "function" && !(await checkDeviceLock())) return;
      } catch (lockErr) {
        console.warn("checkDeviceLock skipped:", lockErr);
      }
      postMode = mode;
      document.getElementById("serial-modal-title").innerText = mode === "buy" ? "💳 シリアルの買取" : (mode === "sell" ? "💰 シリアルを売る" : "🎫 シリアルでトレカを求める");
      document.getElementById("serial-label-give").innerText = mode === "buy" ? "【求】（買いたいシリアル）" : (mode === "sell" ? "【譲】売りたいシリアル" : "【譲】出せるシリアル");
      document.getElementById("serial-want-container").classList.toggle("hidden", mode === "buy" || mode === "sell");
      document.getElementById("serial-price-container").classList.toggle("hidden", mode !== "buy" && mode !== "sell");
      document.getElementById("serial-give").value = ""; document.getElementById("serial-want").value = ""; document.getElementById("serial-price").value = ""; document.getElementById("serial-deadline").value = ""; document.getElementById("serial-note").value = "";
      document.getElementById("serial-post-modal").classList.remove("hidden");
    };
    window.closeSerialPostModal = function() { document.getElementById("serial-post-modal").classList.add("hidden"); };
    window.submitSerialPost = async function() {
      if (submittingSerial || !(await checkDeviceLock())) return;
      const isSell = postMode === "sell", isBuy = postMode === "buy";
      const member = document.getElementById("serial-member").value, give = document.getElementById("serial-give").value.trim(), want = document.getElementById("serial-want").value.trim(), price = Number(document.getElementById("serial-price").value), dl = document.getElementById("serial-deadline").value, note = document.getElementById("serial-note").value.trim().slice(0, 200);
      if (!give || (!isBuy && !isSell && !want) || ((isBuy || isSell) && (!price || price <= 0)) || (dl && dl < todayStr())) return /* alert hidden */ console.log("正しく入力してください。");
      submittingSerial = true; const sbtn = document.getElementById("serial-submit-btn"); if (sbtn) sbtn.disabled = true;
      try {
        await addDoc(collection(db, "posts"), {
          kind: "serial", isBuy, isSell, member, give, want: (isBuy || isSell) ? "" : want, price: (isBuy || isSell) ? price : 0,
          deadline: dl, description: note, status: "active",
          userId: currentUser.uid, userName: getMyDisplayName(), userPhoto: getMyProfile()?.photo || "",
          likesCount: 0, createdAt: serverTimestamp(),
          deviceId: getOrCreateDeviceId(),
          paymentMethod: "azukari"
        });
        
        showToast("出品が完了しました！詳細画面からXでシェアできます", "success");
        
        closeSerialPostModal(); loadPosts(true); switchTab('home');
      } catch(e) { /* alert hidden */ console.log("失敗しました"); } finally { submittingSerial = false; if (sbtn) sbtn.disabled = false; }
    };

    window.onGroupBundleChange = function() { document.getElementById("group-bundle-note-box").classList.toggle("hidden", document.getElementById("group-bundle").value === "ng"); };
    window.openGroupPostModal = async function() {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      if (!(await checkDeviceLock())) return;
      document.getElementById("group-give").value = ""; document.getElementById("group-price").value = ""; document.getElementById("group-target").value = ""; document.getElementById("group-deadline").value = ""; document.getElementById("group-bundle").value = "ok"; document.getElementById("group-bundle-note").value = ""; document.getElementById("group-desc").value = "";
      postPhotos = []; renderPostPhotoPreview(); onGroupBundleChange();
            const suggestEl = document.getElementById("similar-cards-suggest");
      if (suggestEl) { suggestEl.classList.add("hidden"); suggestEl.innerHTML = ""; }

      document.getElementById("group-post-modal").classList.remove("hidden");
    };
    window.closeGroupPostModal = function() { document.getElementById("group-post-modal").classList.add("hidden"); };
    window.submitGroupPost = async function() {
      if (submittingGroup || processingPhotos || !(await checkDeviceLock())) return;
      const member = document.getElementById("group-member").value, give = document.getElementById("group-give").value.trim(), price = Number(document.getElementById("group-price").value), target = Number(document.getElementById("group-target").value), bundle = document.getElementById("group-bundle").value, bundleNote = document.getElementById("group-bundle-note").value.trim().slice(0, 100), ship = document.getElementById("group-shipping").value, dl = document.getElementById("group-deadline").value, desc = document.getElementById("group-desc").value.trim().slice(0, 200);
      if (!give || !price || price <= 0 || !Number.isInteger(target) || target < 1 || target > 100) return /* alert hidden */ console.log("正しく入力してください。");
      if (!dl) return /* alert hidden */ console.log("募集締切を設定してください。");
      if (dl < todayStr()) return /* alert hidden */ console.log("締切は今日以降の日付を指定してください。");
      submittingGroup = true; const btn = document.getElementById("group-submit-btn"); btn.disabled = true; btn.innerText = "投稿中…";
      try {
        const ref = await addDoc(collection(db, "posts"), {
          kind: "group", photoCount: postPhotos.length, thumb: postPhotos.length > 0 ? postPhotos[0].thumb : "",
          isBuy: false, member, give, want: "", price, target, bundle, bundleNote: bundle === "ng" ? "" : bundleNote,
          shipping: ship, deadline: dl, description: desc, status: "active", joinsCount: 0,
          userId: currentUser.uid, userName: getMyDisplayName(), userPhoto: getMyProfile()?.photo || "",
          likesCount: 0, createdAt: serverTimestamp(),
          deviceId: getOrCreateDeviceId(),
          paymentMethod: "azukari"
        });
        for (let i = 0; i < postPhotos.length; i++) await addDoc(collection(db, "posts", ref.id, "photos"), { data: postPhotos[i].full, order: i, createdAt: serverTimestamp() });
        
        showToast("共同購入の募集を開始しました！詳細画面からXでシェアできます", "success");
        
        closeGroupPostModal(); loadPosts(true); switchTab('home');
      } catch(e) { /* alert hidden */ console.log("失敗しました"); } finally { submittingGroup = false; btn.disabled = false; btn.innerText = "主催する"; }
    };

    function renderFilters() {
      const activeChip = "filter-chip bg-gradient-to-r from-illit-purple to-illit-accent text-white border-white/50 shadow-md";
      const normalChip = "filter-chip bg-white/70 text-gray-700 hover:bg-white";
      document.getElementById("kind-filters").innerHTML = KINDS.map(k =>
        `<button onclick="setKind('${k.key}')" class="${k.key === kindFilter ? activeChip : normalChip}">${k.label}</button>`
      ).join("");
      document.getElementById("member-filters").innerHTML = MEMBERS.map((m, i) =>
        `<button onclick="setMember(${i})" class="${m === selectedMember ? activeChip : normalChip}">${m.split(" ")[0]}</button>`
      ).join("");
      const wrap = document.getElementById("bundle-filters-wrap");
      wrap.classList.toggle("hidden", kindFilter !== "group_buy");
      document.getElementById("bundle-filters").innerHTML = BUNDLE_FILTERS.map(b =>
        `<button onclick="setBundle('${b.key}')" class="filter-chip ${b.key === bundleFilter ? 'bg-teal-500 text-white shadow-md' : 'bg-white/70 text-teal-800 hover:bg-white'}">${b.label}</button>`
      ).join("");
      const sortOpt = SORT_OPTIONS.find(s => s.key === sortFilter) || SORT_OPTIONS[0];
      document.getElementById("sort-label").innerText = sortOpt.label;
    }
    window.setMember = function(i) { selectedMember = MEMBERS[i]; renderFilters(); renderPosts(); };
    window.setKind = function(k) { kindFilter = k; renderFilters(); renderPosts(); };
        window.setBundle = function(k) { bundleFilter = k; renderFilters(); renderPosts(); };
    window.setSearch = function(v) { searchText = v.trim().toLowerCase(); renderPosts(); };
    window.syncSearch = function(v) {
      const mainInput = document.getElementById("main-search-input");
      const modalInput = document.getElementById("search-input");
      const clearBtn = document.getElementById("main-search-clear");
      if (mainInput && mainInput.value !== v) mainInput.value = v;
      if (modalInput && modalInput.value !== v) modalInput.value = v;
      if (clearBtn) clearBtn.classList.toggle("hidden", !v);
      setSearch(v);
    };
    window.setActiveOnly = function(v) { activeOnly = !!v; renderPosts(); };

    window.cycleSort = function() {
      const idx = SORT_OPTIONS.findIndex(s => s.key === sortFilter);
      sortFilter = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key; if (sortFilter === "random") window._randOrderMap = {};
      renderFilters(); renderPosts();
    };
    window.openFilterModal = function() { renderFilters(); document.getElementById("filter-modal").classList.remove("hidden"); };
    window.closeFilterModal = function() { document.getElementById("filter-modal").classList.add("hidden"); renderPosts(); };
    window.resetFilters = function() {
      selectedMember = "すべて"; kindFilter = "all"; sortFilter = "random"; bundleFilter = "all"; searchText = ""; activeOnly = false;
      document.getElementById("search-input").value = "";
      document.getElementById("active-only-check").checked = false;
      renderFilters(); renderPosts();
    };

    function getPostTypeKey(p) {
      if (p.kind === "group") return "group_buy";
      if (p.kind === "album") return "album";
      if (p.kind === "dearlit") return "dearlit";
      if (p.isSell) return p.kind === "serial" ? "serial_sell" : "card_sell";
      if (p.isBuy) return p.kind === "serial" ? "serial_buy" : "card_buy";
      if (p.kind === "serial") return "serial_exchange";
      return "card_exchange";
    }

    window.openPostTypeSheet = function() {
      if (!currentUser) {
        showToast("ログインしてください", "info");
        return;
      }
      const sheet = document.getElementById("post-type-sheet");
      if (!sheet) {
        showToast("出品画面を開けませんでした", "error");
        return;
      }
      sheet.classList.remove("hidden");
      sheet.style.display = "flex";
    };
    window.closePostTypeSheet = function() { const el = document.getElementById("post-type-sheet"); if (el) { el.classList.add("hidden"); el.style.display = "none"; } };

    function renderSellTab() {
      const sec = document.getElementById("post-menu-section");
      if (!sec || sec.classList.contains("hidden")) return;
      const uid = currentUser ? currentUser.uid : null;
      const mine = uid ? allPosts.map((p, i) => ({ p, i })).filter(x => x.p.userId === uid && x.p.status === "active") : [];
      const trading = myTrades.filter(t => t.status === "negotiating" || t.status === "shipping").length;
      const done = myTrades.filter(t => t.status === "completed").length;
      document.getElementById("sell-list-count").innerText = mine.length;
      document.getElementById("sell-count-trading").innerText = trading;
      document.getElementById("sell-count-done").innerText = done;
      document.getElementById("sell-my-list").innerHTML = mine.length === 0
        ? '<p class="col-span-3 text-xs text-gray-500 text-center py-6">出品中の商品はありません</p>'
        : mine.map(({ p, i }) => {
            const isGroup = p.kind === "group";
            const photo = (p.photoCount && isJpegData(p.thumb)) ? `<img src="${p.thumb}" alt="" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-2xl text-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">${isGroup ? "🛍" : (p.kind === "serial" ? "🎫" : "🃏")}</div>`;
            const price = (p.isBuy || p.isSell || isGroup) && Number(p.price || 0) > 0 ? `<span class="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">¥${Number(p.price).toLocaleString()}</span>` : "";
            return `<div onclick="openDetailModal(${i})" class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition"><div class="relative aspect-square bg-gray-50 overflow-hidden">${photo}${price}<span class="absolute top-1 right-1 bg-black/65 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">👁 ${Math.max(0, Number(p.viewsCount) || 0)}</span></div><div class="p-1.5 space-y-0.5"><p class="text-[10px] font-medium text-gray-900 line-clamp-2 leading-snug">${escapeHtml(p.give || "")}</p>${formatRelativeTimeJa(p.updatedAt || p.createdAt) ? `<p class="text-[9px] text-gray-400">🕒 ${formatRelativeTimeJa(p.updatedAt || p.createdAt)}</p>` : ""}</div></div>`;
          }).join("");
      const setStatus = (id, ok, okText, ngText) => { const el = document.getElementById(id); if (!el) return; el.innerText = ok ? okText : ngText; el.className = "text-[11px] font-bold mt-1 " + (ok ? "text-green-600" : "text-pink-600"); };
      const prof = getMyProfile();
      setStatus("sell-status-address", !!(currentUser && hasShippingInfo()), "✅ 登録済み", currentUser ? "⚠️ 未登録（申し込みに必要です）" : "ログインすると設定できます");
      const azEl = document.getElementById("sell-status-azukari"); if (azEl) { azEl.innerText = "✅ 推奨決済方法"; azEl.className = "text-[11px] font-bold mt-1 text-green-600"; }
      setStatus("sell-status-push", !!(currentUser && localStorage.getItem(pushStorageKey())), "✅ オン", currentUser ? "オフ" : "ログインすると設定できます");
    }

    function renderPosts() {
      const container = document.getElementById("posts-container");
      const blocked = userData.blocked || []; const likes = userData.likes || [];
      const filtered = [];
      allPosts.forEach((p, index) => {
        if (blocked.includes(p.userId)) return;
        // 審査中（hidden）は本人・管理者以外に見せない
        if (p.status === "hidden" && !(currentUser && (p.userId === currentUser.uid || isAdmin()))) return;
        if (activeOnly && p.status !== "active") return;
        if (p.kind === "group" && Number(p.target || 0) > 0) {
          const jcnt = Math.max(0, typeof p.joinsCount === "number" ? p.joinsCount : joinsOf(p.id).length);
          if (jcnt >= Number(p.target) && !(currentUser && (p.userId === currentUser.uid || isAdmin()))) return;
        }
        const type = getPostTypeKey(p);
        const okKind = kindFilter === "all" || (kindFilter === "likes" ? likes.includes(p.id) : kindFilter === type);
        const okMember = selectedMember === "すべて" || p.member === selectedMember;
        const okBundle = kindFilter !== "group_buy" || bundleFilter === "all" || p.bundle === bundleFilter;
        const okText = !searchText || (p.give + " " + p.want + " " + p.userName + " " + (p.price || "")).toLowerCase().includes(searchText);
        if (!okKind || !okMember || !okText || !okBundle) return;
        filtered.push({ p, index });
      });
      if (sortFilter === "random") {
        window._randOrderMap = window._randOrderMap || {};
        filtered.forEach(({ p }) => {
          if (p && p.id && window._randOrderMap[p.id] === undefined) {
            window._randOrderMap[p.id] = Math.random();
          }
        });
        filtered.sort((a, b) => (window._randOrderMap[a.p.id] || 0) - (window._randOrderMap[b.p.id] || 0));
      } else if (sortFilter === "popular") {
        filtered.sort((a, b) => {
          const likeDiff = (Number(b.p.likesCount) || 0) - (Number(a.p.likesCount) || 0);
          if (likeDiff !== 0) return likeDiff;
          return tsMillis(b.p.createdAt) - tsMillis(a.p.createdAt);
        });
      }
      const cards = filtered.map(({ p, index }) => {
        const isLiked = likes.includes(p.id);
        const likesCount = Number(p.likesCount) || 0;
        const isGroup = p.kind === "group";
        const joins = isGroup ? joinsOf(p.id) : [];
        const target = Number(p.target || 0);
        const joinCount = isGroup ? Math.max(0, typeof p.joinsCount === "number" ? p.joinsCount : joins.length) : 0;
        const full = isGroup && target > 0 && joinCount >= target;
        const closed = isGroup && p.status === "closed";
        const isSold = p.status === "traded";
        const dim = isExpired(p) || closed || isSold;
        const hasPrice = !!(p.isBuy || p.isSell || isGroup) && Number(p.price || 0) > 0;
        const priceText = hasPrice ? "¥" + Number(p.price || 0).toLocaleString() : "";

        let ribbon = "";
        if (isSold) ribbon = `<span class="absolute top-0 left-0 z-10 bg-gray-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">SOLD</span>`;
        else if (isGroup && full) ribbon = `<span class="absolute top-0 left-0 z-10 bg-teal-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">満員</span>`;
        else if (isGroup && closed) ribbon = `<span class="absolute top-0 left-0 z-10 bg-gray-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">終了</span>`;
        else if (p.kind === "dearlit") ribbon = `<span class="absolute top-0 left-0 z-10 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">DEARLIT</span>`;
        else if (p.kind === "album") ribbon = `<span class="absolute top-0 left-0 z-10 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">アルバム</span>`;
        else if (p.isSell) ribbon = `<span class="absolute top-0 left-0 z-10 bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">売却</span>`;
        else if (p.isBuy) ribbon = `<span class="absolute top-0 left-0 z-10 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">買取</span>`;
        else if (p.kind === "serial") ribbon = `<span class="absolute top-0 left-0 z-10 bg-yellow-500 text-yellow-900 text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">シリアル</span>`;
        else if (isGroup) ribbon = `<span class="absolute top-0 left-0 z-10 bg-teal-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">共同購入</span>`;
        else ribbon = `<span class="absolute top-0 left-0 z-10 bg-illit-purple text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow">交換</span>`;

        const hasPhoto = p.photoCount && isJpegData(p.thumb);
        const photoBlock = hasPhoto
          ? `<img src="${p.thumb}" alt="" class="w-full h-full object-cover ${isSold ? 'opacity-50 grayscale' : ''}">`
          : `<div class="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center text-2xl text-purple-200">${isGroup ? "🛍" : (p.kind === "serial" ? "🎫" : "🃏")}</div>`;

        let title = escapeHtml(p.give || "");
        if (p.member && p.member !== "指定なし") title += ` (${escapeHtml(p.member.split(" ")[0])})`;
        if (!p.isBuy && !isGroup && !p.isSell && p.want) title += ` ⇄ ${escapeHtml(p.want)}`;

        let subInfo = "";
        if (isGroup) subInfo = `${joinCount}/${target}人`;
        else if (p.condition && CONDITION_LABEL[p.condition]) subInfo = CONDITION_LABEL[p.condition].split("：")[0];
        else if (p.deadline) subInfo = "期限 " + escapeHtml(p.deadline);

        return `
          <div onclick="openDetailModal(${index})" class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer ${dim ? 'opacity-60' : ''} group relative">
            <div class="relative aspect-square bg-gray-50 overflow-hidden">
              ${ribbon}
              <button onclick="event.stopPropagation(); toggleDetailLikeFromCard('${p.id}')" class="absolute top-1.5 right-1.5 z-10 px-2 h-7 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-[11px] font-bold ${isLiked ? 'text-pink-500 border-pink-200 bg-pink-50/80' : 'text-gray-500'} hover:scale-105 hover:border-pink-300 transition">
                <span>${isLiked ? "♥" : "♡"}</span>
                <span>${likesCount}</span>
              </button>
              ${photoBlock}
              ${priceText ? `<span class="absolute left-1.5 bottom-1.5 z-10 text-[12px] font-bold text-gray-900 bg-white/50 backdrop-blur rounded-lg px-2 py-1">${priceText}</span>` : ''}
              ${isSold ? '<div class="absolute inset-0 bg-black/35 flex items-center justify-center"><span class="text-white font-bold text-sm tracking-widest">SOLD</span></div>' : ''}
              ${!isSold && p.photoCount > 1 ? `<span class="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">📷${p.photoCount}</span>` : ''}
            </div>
            <div class="pt-1.5 px-0.5 space-y-0.5">
              <p class="text-[12px] font-normal text-gray-900 line-clamp-2 leading-snug">${title}</p>
              ${subInfo ? `<p class="text-[10px] text-gray-500">${subInfo}</p>` : ''}
                        ${formatRelativeTimeJa(p.updatedAt || p.createdAt) ? `<p class="text-[9px] text-gray-400">🕒 ${formatRelativeTimeJa(p.updatedAt || p.createdAt)}</p>` : ''}
              <p class="text-[10px] text-gray-400 truncate">${escapeHtml(p.userName || "")}</p>
            </div>
          </div>
        `;
      });
      container.innerHTML = cards.length === 0
          ? (loadingPosts && allPosts.length === 0
            ? postsSkeletonHtml() + `<div class="posts-status col-span-full text-center pt-1 pb-4"><button type="button" onclick="window._retriedInitialPosts=false; if(window.loadPosts) window.loadPosts(true);" class="text-[12px] text-indigo-600 underline font-bold">再試行する</button></div>`
            : postsEmptyHtml("条件に合う募集はありません", "フィルターを外すか、キーワードを変えてみてください"))
        : cards.join("");
      renderSellTab();
    }

    window.toggleDetailLikeFromCard = function(postId) { doToggleLike(allPosts.find(x => x.id === postId)); };

    // 投稿はリアルタイム監視せず、50件ずつ取得（読み取り回数の節約）
    const POSTS_PAGE = 50;
    let postsCursor = null, postsHasMore = false, loadingPosts = false, loadPostsGen = 0;
    function postsErrorHtml(title, detail) {
      return `<div class="posts-status p-4 m-4 bg-red-100 text-red-700 text-sm rounded-xl border border-red-300 text-center font-bold">⚠️ ${title}<br><span class="text-xs font-normal">${detail || ""}</span><br><button type="button" onclick="window.loadPosts && window.loadPosts(true)" class="mt-2 text-xs underline text-red-600">再試行</button></div>`;
    }
    async function fetchPostsSnap(reset, useOrderBy) {
      const timeoutMs = 12000;
      const withTimeout = (p) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error("通信がタイムアウトしました")), timeoutMs))
      ]);
      if (useOrderBy) {
        const base = [collection(db, "posts"), orderBy("createdAt", "desc")];
        const q = (!reset && postsCursor)
          ? query(...base, startAfter(postsCursor), limit(POSTS_PAGE))
          : query(...base, limit(POSTS_PAGE));
        return withTimeout(getDocs(q));
      }
      // インデックス未整備・一時障害時のフォールバック（作成日ソートなし）
      return withTimeout(getDocs(query(collection(db, "posts"), limit(POSTS_PAGE))));
    }
    async function loadPosts(reset = true) {
      console.log("loadPosts called, reset=", reset, "loading=", loadingPosts);
      // 追加読み込み中に「もっと見る」が重なったときだけスキップ。
      // reset=true（初回・再試行・更新）は進行中でも世代を上げてやり直す。
      if (loadingPosts && !reset) {
        console.log("loadPosts skipped (already loading more)");
        return;
      }
      const gen = ++loadPostsGen;
      loadingPosts = true;
      if (reset) {
        const container = document.getElementById("posts-container");
        if (container && allPosts.length === 0) container.innerHTML = postsSkeletonHtml();
      }
      try {
        let snap = null;
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (gen !== loadPostsGen) return;
          try {
            // 1回目・2回目は orderBy、3回目はフォールバック
            snap = await fetchPostsSnap(reset, attempt < 2);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            console.warn("loadPosts attempt", attempt + 1, e?.message || e);
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          }
        }
        if (gen !== loadPostsGen) return;
        if (!snap) {
          loadingPosts = false;
          const container = document.getElementById("posts-container");
          if (container) {
            container.innerHTML = postsErrorHtml(
              "データの読み込みに失敗しました",
              escapeHtml((lastErr && lastErr.message) || "通信エラー") + " · 再試行してください"
            );
          }
          return;
        }
        if (reset && snap.empty && !window._retriedInitialPosts) {
          window._retriedInitialPosts = true;
          await new Promise((r) => setTimeout(r, 800));
          if (gen !== loadPostsGen) return;
          try { snap = await fetchPostsSnap(true, true); } catch (_) {}
        }
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // フォールバック取得時はクライアント側で新しい順に寄せる
        if (list.length && list.every(x => x.createdAt)) {
          list.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
        }
        if (reset) {
          allPosts = list;
          Object.keys(joinsFresh).forEach(k => delete joinsFresh[k]);
          postsCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        } else {
          const seen = new Set(allPosts.map(x => x.id));
          list.forEach(x => { if (!seen.has(x.id)) allPosts.push(x); });
          if (snap.docs.length) postsCursor = snap.docs[snap.docs.length - 1];
        }
        postsHasMore = snap.docs.length === POSTS_PAGE;
        const wrap = document.getElementById("load-more-wrap");
        if (wrap) wrap.classList.toggle("hidden", !postsHasMore);
        if (gen === loadPostsGen) loadingPosts = false;
        renderPosts();
        notifyWatchedListings();
        scheduleHealSoldPosts();
        if (reset && currentDetailId && !document.getElementById("detail-modal").classList.contains("hidden")) {
          const di = allPosts.findIndex(x => x.id === currentDetailId);
          if (di < 0) closeDetailModal(); else { currentDetailIndex = di; openDetailModal(di); }
        }
        if (pendingPostId) {
          const pid = pendingPostId; pendingPostId = null;
          let i = allPosts.findIndex(x => x.id === pid);
          if (i < 0) {
            try { const ps = await getDoc(doc(db, "posts", pid)); if (ps.exists()) { allPosts.push({ id: ps.id, ...ps.data() }); i = allPosts.length - 1; } } catch (e) {}
          }
          if (i >= 0) openDetailModal(i);
        }
      } catch (err) {
        console.error("posts load error:", err);
        if (gen === loadPostsGen) {
          loadingPosts = false;
          const container = document.getElementById("posts-container");
          if (container && allPosts.length === 0) {
            container.innerHTML = postsErrorHtml(
              "投稿の読み込みに失敗しました",
              escapeHtml(err?.message || "error") + " · 🔄 または下の再試行を押してください"
            );
          } else {
            showToast("投稿の読み込みに失敗しました。🔄で再読み込みしてください。", "error");
          }
        }
      } finally {
        // 失敗時のエラー文言を renderPosts で上書きしない（成功時は上で loadingPosts=false → render済み）
        if (gen === loadPostsGen && loadingPosts) loadingPosts = false;
        if (typeof renderGllitHub === "function") renderGllitHub();
      }
    }
    window.loadPosts = loadPosts;
    window.renderPosts = renderPosts;
    // 認証待ちでも早めに一覧取得を開始（ゲスト閲覧含む）
    setTimeout(function() {
      if (typeof loadPosts === "function" && allPosts.length === 0 && !loadingPosts) {
        loadPosts(true);
      }
    }, 80);

    let _gllitRoutine = null;
    let _gllitEvents = null;
    function gllitTodayKey() {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    }
    function gllitChecks() {
      try { return JSON.parse(localStorage.getItem("gllit_checks") || "{}"); } catch (_) { return {}; }
    }
    function gllitTaskKey(task) {
      return task.daily ? task.id + ":" + gllitTodayKey() : task.id;
    }
    window.toggleGllitTask = function(id) {
      const bag = gllitChecks();
      if (bag[id]) delete bag[id];
      else bag[id] = gllitTodayKey();
      localStorage.setItem("gllit_checks", JSON.stringify(bag));
      renderGllitHub();
    };
    window.focusBoard = function(kind) {
      if (typeof setKind === "function") setKind(kind);
      const list = document.getElementById("post-list-section");
      if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    function gllitMedian(nums) {
      if (!nums.length) return null;
      const s = nums.slice().sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
    }
    async function renderGllitHub() {
      const taskBox = document.getElementById("gllit-hub-tasks");
      const sched = document.getElementById("gllit-hub-schedule");
      if (!taskBox || !sched) return;
      if (!_gllitRoutine) {
        try {
          const res = await fetch("./gllit_routine.json?t=" + Date.now().toString().slice(0, 8));
          _gllitRoutine = res.ok ? await res.json() : { tasks: [] };
        } catch (_) { _gllitRoutine = { tasks: [] }; }
      }
      const now = Date.now();
      const done = gllitChecks();
      const tasks = (_gllitRoutine.tasks || []).filter(t => !t.until || Date.parse(t.until) >= now);
      taskBox.innerHTML = tasks.length ? tasks.map(t => {
        const key = gllitTaskKey(t);
        const on = !!done[key];
        const place = t.place === "公式アプリ" || t.place === "音楽アプリ" ? "公式アプリで完了" : "ここで完了";
        return `<div class="liquid-glass rounded-2xl p-3 flex gap-3 items-start">
          <button type="button" onclick="toggleGllitTask('${escapeHtml(key)}')" class="mt-0.5 w-6 h-6 rounded-full border shrink-0 font-bold text-sm ${on ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-300 text-transparent"}" aria-label="完了">${on ? "✓" : "·"}</button>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <div class="font-bold text-sm text-gray-900 ${on ? "line-through text-gray-400" : ""}">${escapeHtml(t.title)}</div>
              <span class="text-[10px] font-bold text-gray-500 shrink-0">${place}</span>
            </div>
            <p class="text-[11px] text-gray-600 mt-0.5 leading-relaxed">${escapeHtml(t.detail || "")}</p>
            ${t.href ? `<a href="${escapeHtml(t.href)}" target="_blank" rel="noopener" class="inline-block mt-1.5 text-[12px] font-medium text-indigo-700 underline">${t.place === "公式アプリ" ? "投票ページを開く" : "再生ページを開く"}</a>` : ""}
          </div>
        </div>`;
      }).join("") : `<div class="liquid-glass rounded-2xl p-3 text-[11px] text-gray-500">今日の投票締切はありません。下の交換・シリアル・共同購入はサイト内で最後までできます。</div>`;

      const active = (allPosts || []).filter(p => p && p.status === "active");
      const exchanges = active.filter(p => !p.isBuy && !p.isSell && p.kind !== "serial" && p.kind !== "group" && p.kind !== "album" && p.kind !== "dearlit");
      const serials = active.filter(p => p.kind === "serial" && p.isSell && Number(p.price) > 0);
      const groups = active.filter(p => p.kind === "group");
      const med = gllitMedian(serials.map(p => Number(p.price)));
      const exEl = document.getElementById("gllit-stat-exchange");
      const seEl = document.getElementById("gllit-stat-serial");
      const grEl = document.getElementById("gllit-stat-group");
      if (exEl) exEl.textContent = exchanges.length ? `募集 ${exchanges.length}件` : "募集を見る";
      if (seEl) seEl.textContent = med ? `売却の中央値 ¥${med.toLocaleString()}（${serials.length}件）` : "相場を見る";
      if (grEl) grEl.textContent = groups.length ? `募集 ${groups.length}件` : "募集を見る";

      try {
        if (!_gllitEvents) {
          const res = await fetch("./illit_calendar.json?t=" + Date.now().toString().slice(0, 8));
          _gllitEvents = res.ok ? await res.json() : [];
        }
        const today = gllitTodayKey();
        const upcoming = dedupeCalendarEvents(_gllitEvents || []).filter(e => e && e.date >= today).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || "").localeCompare(String(b.time || ""))).slice(0, 4);
        sched.innerHTML = upcoming.length
          ? `<div class="font-bold text-gray-800 mb-1">次の予定</div>` + upcoming.map(e => {
              const href = e.link && String(e.link).startsWith("http") ? e.link : "";
              return `<div class="py-1.5 border-t border-white/70 first:border-0">
                <button type="button" onclick="openIllitCalendar()" class="text-left"><span class="text-indigo-700 font-bold">${escapeHtml(String(e.date).slice(5).replace("-", "/"))}</span> ${escapeHtml(e.title || "")}</button>
                ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="block text-[11px] text-indigo-700 underline">詳細を開く</a>` : ""}
              </div>`;
            }).join("")
          : "直近の予定はありません";
      } catch (_) {
        sched.textContent = "予定を読み込めませんでした";
      }
      renderGllitMatches();
    }
    function renderGllitMatches() {
      const el = document.getElementById("gllit-matches");
      if (!el) return;
      if (!currentUser) { el.innerHTML = ""; return; }
      const mine = userData.myCards || {};
      const want = new Set(Object.keys(mine).filter(id => mine[id] === "want"));
      const owned = new Set(Object.keys(mine).filter(id => mine[id] === "owned"));
      if (!want.size && !owned.size) {
        el.innerHTML = `<button type="button" onclick="switchTab('mycards')" class="w-full text-left bg-white border border-gray-200 rounded-2xl px-3 py-3 text-[13px] text-gray-600">欲しいを登録すると、交換できそうな出品がここに出ます</button>`;
        return;
      }
      const nameOf = (id) => {
        try {
          if (typeof findCardById === "function") {
            const found = findCardById(id);
            if (found && found.card && found.card.name) return found.card.name;
          }
        } catch (_) {}
        const c = (typeof catalogCardsCache !== "undefined" ? catalogCardsCache : []).find(x => x && x.id === id);
        return c && c.name ? c.name : "";
      };
      const rows = [];
      (allPosts || []).forEach((p, i) => {
        if (!p || p.status !== "active" || p.userId === currentUser.uid) return;
        if (p.kind === "serial" || p.kind === "group" || p.kind === "album" || p.kind === "dearlit") return;
        const cid = p.catalogCardId || "";
        if (cid && want.has(cid) && !p.isBuy) rows.push({ i, p, why: "欲しいカードの出品" });
        else if (cid && owned.has(cid) && p.isBuy) rows.push({ i, p, why: "あなたの所持を買いたい人" });
      });
      if (rows.length < 4) {
        const names = [...owned].map(nameOf).filter(n => n.length >= 4);
        (allPosts || []).forEach((p, i) => {
          if (rows.length >= 4 || !p || p.status !== "active" || p.userId === currentUser.uid || p.isBuy || p.isSell || !p.want) return;
          if (rows.some(r => r.i === i)) return;
          if (names.some(n => String(p.want).includes(n))) rows.push({ i, p, why: "あなたの所持を探している" });
        });
      }
      if (!rows.length) {
        el.innerHTML = `<div class="bg-white border border-gray-200 rounded-2xl px-3 py-3 text-[13px] text-gray-500">いま交換できそうな出品はありません</div>`;
        return;
      }
      el.innerHTML = `<div class="px-1 text-[13px] font-medium text-gray-800">交換できそう</div>` + rows.slice(0, 4).map(r => {
        const price = Number(r.p.price) > 0 ? "¥" + Number(r.p.price).toLocaleString() : "交換";
        return `<button type="button" onclick="openDetailModal(${r.i})" class="w-full text-left bg-white border border-gray-200 rounded-2xl px-3 py-2.5">
          <div class="text-[11px] text-gray-400">${escapeHtml(r.why)}</div>
          <div class="text-[14px] font-medium text-gray-900 truncate">${escapeHtml(r.p.give || r.p.catalogCardName || "出品")}</div>
          <div class="text-[12px] text-gray-500">${escapeHtml(price)} · ${escapeHtml(r.p.userName || "")}</div>
        </button>`;
      }).join("");
    }
    window.renderGllitHub = renderGllitHub;

    function subscribePosts() { loadPosts(true); }
    window.loadMorePosts = function() { loadPosts(false); };
    window.refreshPosts = async function() { await loadPosts(true); showToast("最新の情報に更新しました。", "info"); };

    function asUnitBoxes(list) {
      return (Array.isArray(list) ? list : []).map(function(b) {
        let x = Number(b && b.x) || 0, y = Number(b && b.y) || 0, w = Number(b && b.w) || 0, h = Number(b && b.h) || 0;
        if (Math.max(x, y, w, h) > 1.5) { x /= 100; y /= 100; w /= 100; h /= 100; }
        x = Math.max(0, Math.min(0.96, x));
        y = Math.max(0, Math.min(0.96, y));
        w = Math.max(0.03, Math.min(1 - x, w));
        h = Math.max(0.03, Math.min(1 - y, h));
        const state = (b && b.sold) ? "sold" : ((b && b.state) || "open");
        return { x: x, y: y, w: w, h: h, state: state };
      });
    }
    function listingBoxes(p) {
      if (!p) return [];
      if (Array.isArray(p.bundleBoxes) && p.bundleBoxes.length) return asUnitBoxes(p.bundleBoxes);
      if (Array.isArray(p.bulkSlots) && p.bulkSlots.length > 1) return asUnitBoxes(p.bulkSlots);
      return [];
    }
    async function getPhotos(postId) {
      if (photoCache[postId]) return photoCache[postId];
      try { const snap = await getDocs(collection(db, "posts", postId, "photos")); const list = snap.docs.map(d => d.data()).filter(d => d.role !== "base").sort((a,b)=>(a.order||0)-(b.order||0)).map(d=>d.data).filter(isJpegData); photoCache[postId] = list; return list; } catch(e) { return []; }
    }
    window.viewPhoto = function(kind, i) { const arr = kind === "room" ? roomPhotos : detailPhotos; if (isJpegData(arr[i])) { document.getElementById("image-viewer-img").src = arr[i]; document.getElementById("image-viewer").classList.remove("hidden"); } };
    async function loadDetailPhotos(p, index) {
      const el = document.getElementById("detail-photos"); detailPhotos = [];
      if (p.kind === "serial" || !p.photoCount) { el.innerHTML = ""; return; }
      const paint = function (list) {
        if (!list.length) { el.innerHTML = ""; return; }
        const boxes = listingBoxes(p);
        const picks = window._bundlePick || new Set();
        const shots = list.map((src, i) => {
          if (i === 0 && boxes.length > 1) {
            const hits = boxes.map((b, bi) => {
              const sold = b.state === "sold";
              const hold = b.state === "hold";
              const on = !sold && !hold && picks.has(bi);
              const cls = sold ? "sold" : (hold ? "hold" : (on ? "on" : ""));
              return `<button type="button" class="bundle-hit ${cls}" style="left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%" onclick="event.stopPropagation(); toggleBundleBox(${bi})">${sold || hold || on ? "<span>×</span>" : ""}</button>`;
            }).join("");
            el.style.height = "64vh";
            return `<div class="shot"><div class="bundle-frame"><img src="${src}" alt="">${hits}</div></div>`;
          }
          return `<div class="shot"><img src="${src}" alt="" onclick="viewPhoto('detail', ${i})"></div>`;
        }).join("");
        if (!(boxes.length > 1)) el.style.height = "";
        el.innerHTML = `<div class="detail-film">${shots}</div>`;
      };
      const first = isJpegData(p.thumb) ? p.thumb : "";
      if (first) paint([first]);
      try { const list = await getPhotos(p.id); if (currentDetailIndex !== index) return; detailPhotos = list; if (list.length) paint(list); }
      catch (e) {}
    }

    function formatRelativeTimeJa(ts) {
      if (!ts) return "";
      let ms = 0;
      if (typeof ts.toMillis === "function") ms = ts.toMillis();
      else if (typeof ts.seconds === "number") ms = ts.seconds * 1000;
      else if (ts instanceof Date) ms = ts.getTime();
      else if (typeof ts === "number") ms = ts;
      else { const d = Date.parse(ts); if (!isNaN(d)) ms = d; }
      if (!ms) return "";
      const diff = Math.max(0, Date.now() - ms);
      const min = Math.floor(diff / 60000);
      if (min < 1) return "たった今";
      if (min < 60) return min + "分前";
      const hr = Math.floor(min / 60);
      if (hr < 24) return hr + "時間前";
      const day = Math.floor(hr / 24);
      return day + "日前";
    }
    window._viewedPostIds = window._viewedPostIds || new Set();
    function trackPostView(p) {
      if (!p || !p.id) return;
      if (currentUser && p.userId === currentUser.uid) return;
      if (window._viewedPostIds.has(p.id)) return;
      window._viewedPostIds.add(p.id);
      p.viewsCount = Math.max(0, Number(p.viewsCount) || 0) + 1;
      try { updateDoc(doc(db, "posts", p.id), { viewsCount: increment(1) }).catch(() => {}); } catch(_) {}
    }
    window.openDetailModal = function(index) {
      const p = allPosts[index]; if (!p) return;
      currentDetailIndex = index; currentDetailId = p.id; window._bundlePick = new Set(); const isGroup = p.kind === "group", isBuy = !!p.isBuy;
      let title = "募集の詳細";
      if (isGroup) title = "🛍 共同購入の詳細";
      else if (p.kind === "album") title = "💿 アルバムの詳細";
      else if (p.kind === "dearlit") title = "🎁 DEARLITの詳細";
      else if (isBuy) title = "💳 買取（購入希望）の詳細";
      else if (p.isSell) title = "💰 売却の詳細";
      document.getElementById("detail-title").innerText = "";
      const itemTitle = document.getElementById("detail-item-title");
      if (itemTitle) itemTitle.innerText = p.give || title;
      const priceHead = document.getElementById("detail-price-head");
      if (priceHead) priceHead.innerText = "";
      if (isGroup || isBuy || p.isSell) {
        document.getElementById("detail-price").innerHTML = "¥" + Number(p.price || 0).toLocaleString();
      }
      document.getElementById("detail-give").innerText = p.give;
      document.getElementById("detail-want").innerText = p.want || "（なし）";
      document.getElementById("detail-member").innerText = p.member || "指定なし";
      const _relTime = formatRelativeTimeJa(p.updatedAt || p.createdAt);
      const timeEl = document.getElementById("detail-time");
      if (timeEl) timeEl.textContent = _relTime || "";
      document.getElementById("detail-user").innerText = p.userName || "";
      trackPostView(p);
      updateDetailLikeUI(p.id);
      const avatarEl = document.getElementById("detail-user-avatar");
      const placeholder = document.getElementById("detail-user-avatar-placeholder");
      if (p.userPhoto && isJpegData(p.userPhoto)) {
        avatarEl.src = p.userPhoto; avatarEl.classList.remove("hidden"); placeholder.classList.add("hidden");
      } else {
        avatarEl.classList.add("hidden"); avatarEl.removeAttribute("src"); placeholder.classList.remove("hidden");
      }
      document.getElementById("detail-give-box").querySelector("span").innerText = isGroup ? "商品" : (isBuy ? "求" : "譲");
      document.getElementById("detail-want-box").classList.toggle("hidden", isBuy || isGroup || p.isSell);
      document.getElementById("detail-price-box").classList.toggle("hidden", !(isBuy || isGroup || p.isSell));
      const condBox = document.getElementById("detail-condition-box");
      if (p.condition && CONDITION_LABEL[p.condition]) {
        condBox.classList.remove("hidden");
        document.getElementById("detail-condition").innerText = String(CONDITION_LABEL[p.condition] || "").split("：").pop();
      } else condBox.classList.add("hidden");
      const descBox = document.getElementById("detail-desc-box");
      if (p.description) { descBox.classList.remove("hidden"); descBox.innerText = p.description; }
      else { descBox.classList.add("hidden"); }
      const joins = isGroup ? joinsOf(p.id) : []; const target = Number(p.target || 0); const joinCount = isGroup ? Math.max(0, typeof p.joinsCount === "number" ? p.joinsCount : joins.length) : 0; const full = isGroup && target > 0 && joinCount >= target; const closed = isGroup && p.status === "closed"; const isSold = p.status === "traded"; const joined = !!(isGroup && currentUser && joins.some(j => j.id === currentUser.uid));
      let extra = "";
      if (p.kind === "serial" && p.deadline) extra += `<div>有効期限: <b>${escapeHtml(p.deadline)}</b></div>`;
      if (p.shippingLabel) {
        extra += `<div>配送: <b>${escapeHtml(p.shippingLabel)}</b>${p.shippingTrackingRequired ? "（追跡あり）" : "（追跡の指定なし）"}</div>`;
      }
      if (listingBoxes(p).length > 1) extra += `<div>欲しいカードの枠をタップすると、赤くバツが付きます。残り <b>${Number(p.bundleLeft ?? listingBoxes(p).filter(b => !b.state || b.state === "open").length)}</b> / ${listingBoxes(p).length}枚</div>`;
      if (isGroup) {
        if (p.deadline) extra += `<div>締切: <b>${escapeHtml(p.deadline)}</b></div>`;
        extra += `<div>👥 参加: <b>${joinCount} / ${target}人</b></div>`;
        extra += `<div>🔗 抱き合わせ: <span class="${BUNDLE_CLASS[p.bundle]||BUNDLE_CLASS.ng} px-2 py-0.5 rounded-full text-[10px] shadow-sm">${BUNDLE_LABEL[p.bundle]||BUNDLE_LABEL.ng}</span></div>`;
        if (p.bundle !== "ng" && p.bundleNote) extra += `<div class="bg-white/60 rounded-xl p-2 border border-white mt-2 shadow-inner">内容: <b>${escapeHtml(p.bundleNote)}</b></div>`;
        if (currentUser && p.userId === currentUser.uid) extra += `<div class="pt-2 mt-2 border-t border-white/50"><div class="text-xs text-gray-700 mb-1">参加者一覧</div>${joins.map(j => `<div>・${escapeHtml(j.userName)}</div>`).join("")}</div>`;
      }
      document.getElementById("detail-extra").innerHTML = extra;
      const actions = document.getElementById("detail-actions");
      // 売却のみ即購入（合意スキップ）。共同購入は応募→合意
      const isDirectPurchase = !!p.isSell;
      if (!currentUser) {
        const loginLabel = isGroup ? "ログインして応募" : (isDirectPurchase ? "ログインして購入を確定" : "ログインして申し込む");
        actions.innerHTML = `<button onclick="loginWithGoogle()" class="w-full bg-gradient-to-r from-illit-purple to-illit-accent text-white font-medium py-3 rounded-full shadow-md border border-white/30">${loginLabel}</button>`;
      } else if (p.userId === currentUser.uid) {
        const hasAnyTradeOrSold = isSold || p.status === "traded" || p.status === "closed" || myTrades.some(t => t.postId === p.id && t.status !== "cancelled");
      const editBtnHtml = hasAnyTradeOrSold
        ? `<div class="w-full bg-gray-100/80 border border-gray-200 text-gray-400 text-xs font-bold py-3 rounded-full text-center">🔒 購入・取引開始済みのため編集不可</div>`
        : `<button onclick="openEditPost(${index})" class="w-full bg-white/80 border border-white text-illit-darkPurple font-medium py-3 rounded-full hover:bg-white transition shadow-sm">✏️ 編集</button>`;
      actions.innerHTML = `${isGroup ? `<button onclick="toggleGroupClosed(${index})" class="w-full bg-teal-50 text-teal-700 border border-teal-200 font-medium py-3 rounded-full hover:bg-teal-100 transition shadow-sm mb-2">${closed ? '🔓 募集再開' : '🔒 募集締切'}</button>` : ''}${editBtnHtml}<button onclick="deletePost(${index})" class="w-full bg-red-50 text-red-500 font-medium py-3 rounded-full border border-red-200 hover:bg-red-100 transition mt-2 shadow-sm">削除</button>`;
      } else {
        const existingTrade = myTrades.find(t => t.postId === p.id && t.status !== "cancelled");
        if (existingTrade) {
          actions.innerHTML = `<button onclick="openTrade('${existingTrade.id}')" class="w-full bg-gradient-to-r from-illit-purple to-illit-accent text-white font-medium py-3 rounded-full shadow-md border border-white/30">💬 取引ルームを開く</button>`;
        } else if (isGroup && joined) {
          actions.innerHTML = `<button onclick="openMyGroupTrade(${index})" class="w-full bg-gradient-to-r from-teal-400 to-teal-500 text-white font-medium py-3 rounded-full shadow-md border border-white/30">💬 取引ルーム</button>`;
        } else if (isSold) {
          actions.innerHTML = `<p class="text-xs text-red-500 font-bold text-center bg-white/50 p-3 rounded-xl border border-white">SOLD OUT（取引進行中・終了）</p>`;
        } else if (isGroup && (closed || full)) {
          actions.innerHTML = `<p class="text-xs text-gray-500 font-medium text-center bg-white/50 p-2 rounded-xl border border-white">終了または満員です</p>`;
        } else if (isExpired(p)) {
          actions.innerHTML = `<p class="text-xs text-red-400 font-medium text-center bg-white/50 p-2 rounded-xl border border-white">期限切れです</p>`;
        } else if (listingBoxes(p).length > 1) {
          const boxesNow = listingBoxes(p);
          const left = Number(p.bundleLeft ?? boxesNow.filter(b => !b.state || b.state === "open").length);
          actions.innerHTML = left <= 0 || p.status === "closed"
            ? `<p class="text-xs text-gray-500 font-medium text-center bg-white/50 p-2 rounded-xl border border-white">この募集は停止しています</p>`
            : `<button type="button" onclick="applyBundlePost(${index})" class="w-full bg-gradient-to-r from-illit-purple to-illit-accent text-white font-medium py-3 rounded-full shadow-md border border-white/30">バツを付けたカードを申し込む</button>`;
        } else {
          const pillWrap = document.getElementById("detail-pricecut-pill-wrap");
      if (pillWrap) {
        if (p.isSell && (!currentUser || p.userId !== currentUser.uid)) {
          pillWrap.innerHTML = `<button type="button" onclick="proposePriceCutById('${escapeHtml(p.id)}')" class="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb] active:scale-95 transition px-3.5 py-2 text-[12px] font-bold text-[#333333]"><span class="w-4 h-4 rounded-full border border-[#555555] inline-flex items-center justify-center text-[10px] leading-none">¥</span><span>値下げ依頼</span></button>`;
        } else {
          pillWrap.innerHTML = "";
        }
      }
      const btnLabel = isGroup ? "応募する" : (p.isSell ? "購入へ" : "申し込む");
      const onclick = isGroup ? `joinGroup(${index})` : (p.isSell ? `confirmPurchase(${index})` : `applyToPost(${index})`);
      const btnGrad = isGroup ? "from-teal-400 to-teal-500" : "from-illit-purple to-illit-accent";
      actions.innerHTML = `<div class="px-3 py-2.5"><button type="button" onclick="${onclick}" class="w-full bg-gradient-to-r ${btnGrad} text-white font-bold py-3 rounded-full shadow-md border border-white/30">${btnLabel}</button></div>`;
        }
      }
      const more = document.getElementById("detail-more");
      if (more) {
        let moreHtml = "";
        if (currentUser && p.userId === currentUser.uid) moreHtml += `<button type="button" onclick="shareCurrentPost()" class="text-gray-400">シェア</button>`;
        more.innerHTML = moreHtml;
      }
      document.getElementById("detail-menu")?.classList.add("hidden");
      const moreBtn = document.getElementById("detail-more-btn");
      if (moreBtn) moreBtn.classList.toggle("hidden", !!(currentUser && p.userId === currentUser.uid));
      const modal = document.getElementById("detail-modal");
      const sheet = modal.querySelector(".detail-sheet");
      if (sheet) { sheet.style.transition = "none"; sheet.style.transform = ""; }
      const scroller = modal.querySelector(".detail-scroll");
      if (scroller) { scroller.scrollTop = 0; scroller.scrollLeft = 0; }
      modal.classList.remove("hidden"); loadDetailPhotos(p, index); if (p.userId) loadRating(p.userId, index); renderDetailRails(p); loadPostComments(p.id); loadSellOffers(p);
      if (isGroup && currentUser && !joinsFresh[p.id]) {
        joinsFresh[p.id] = true;
        loadJoins(p.id).then(() => {
          const ni = allPosts.findIndex(x => x.id === p.id);
          if (ni >= 0 && currentDetailId === p.id && !document.getElementById("detail-modal").classList.contains("hidden")) openDetailModal(ni);
        });
      }
    };
    window.closeDetailModal = function() {
      const modal = document.getElementById("detail-modal");
      const sheet = modal && modal.querySelector(".detail-sheet");
      if (sheet) { sheet.style.transition = "none"; sheet.style.transform = ""; }
      modal.classList.add("hidden");
      currentDetailIndex = -1;
      currentDetailId = null;
    };

    function renderDetailRails(p) {
      const sellerEl = document.getElementById("detail-seller-items");
      const relEl = document.getElementById("detail-related");
      if (!sellerEl || !relEl || !p) return;
      const tile = function (post) {
        const i = allPosts.indexOf(post);
        const price = Number(post.price || 0) > 0 ? "¥" + Number(post.price).toLocaleString() : "交換";
        const img = isJpegData(post.thumb) ? `<img src="${post.thumb}" alt="" class="w-full h-full object-cover">` : "";
        return `<button type="button" onclick="openDetailModal(${i})" class="text-left w-[104px] shrink-0"><div class="aspect-[3/4] bg-[#f3f3f3] overflow-hidden rounded-md">${img}</div><div class="text-[12px] text-gray-900 mt-1">${price}</div></button>`;
      };
      const others = allPosts.filter(function (x) { return x.userId && x.userId === p.userId && x.id !== p.id; }).slice(0, 8);
      const similar = allPosts.filter(function (x) { return x.id !== p.id && p.member && x.member === p.member; }).slice(0, 6);
      sellerEl.innerHTML = others.length ? `<div class="text-[13px] text-gray-500 mb-2">この人のほかの出品</div><div class="flex gap-3 overflow-x-auto pb-1">${others.map(tile).join("")}</div>` : "";
      relEl.innerHTML = similar.length ? `<div class="text-[15px] text-gray-900 mb-2">似ている出品</div><div class="flex gap-3 overflow-x-auto pb-1">${similar.map(tile).join("")}</div>` : "";
    }

    async function loadPostComments(postId) {
      const el = document.getElementById("detail-comments");
      if (!el || !postId) return;
      el.innerHTML = "";
      try {
        let snap;
        try { snap = await getDocs(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"))); }
        catch (e) { snap = await getDocs(collection(db, "posts", postId, "comments")); }
        if (currentDetailId !== postId) return;
        const rows = snap.docs.map(d => d.data());
        const countEl = document.getElementById("detail-comment-count");
        if (countEl) countEl.textContent = String(rows.length);
        el.innerHTML = rows.length
          ? rows.map(c => {
              const img = c.image && isJpegData(c.image)
                ? `<button type="button" onclick="openCommentImage(this.dataset.src)" data-src="${c.image}" class="block mt-1"><img src="${c.image}" alt="" class="max-h-40 rounded-xl"></button>`
                : "";
              return `<div class="text-[13px] leading-relaxed"><div class="text-gray-500 text-[12px]">${escapeHtml(c.userName || "ユーザー")}</div>${c.text ? `<div class="text-gray-800">${escapeHtml(c.text || "")}</div>` : ""}${img}</div>`;
            }).join("")
          : `<p class="text-[13px] text-gray-400">まだコメントはありません</p>`;
      } catch (e) {
        if (currentDetailId !== postId) return;
        el.innerHTML = `<p class="text-[13px] text-gray-400">まだコメントはありません</p>`;
      }
    }
    let pendingCommentImage = "";
    window.openCommentImage = function(src) {
      const img = document.getElementById("image-viewer-img");
      const box = document.getElementById("image-viewer");
      if (!img || !box || !src) return;
      img.src = src;
      box.classList.remove("hidden");
    };
    window.setCommentPhoto = async function(input) {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      try {
        const img = await loadImageFromFile(file);
        pendingCommentImage = compressFromImage(img, { maxSide: 720, quality: 0.7, maxChars: 120000 });
        const preview = document.getElementById("detail-comment-preview");
        if (preview) {
          preview.classList.remove("hidden");
          preview.innerHTML = `<div class="flex items-center gap-2"><img src="${pendingCommentImage}" alt="" class="h-16 rounded-lg"><button type="button" onclick="clearCommentPhoto()" class="text-[12px] text-gray-500">取り消す</button></div>`;
        }
      } catch (e) { /* alert hidden */ console.log("画像を読み込めませんでした"); }
    };
    window.clearCommentPhoto = function() {
      pendingCommentImage = "";
      const preview = document.getElementById("detail-comment-preview");
      if (preview) { preview.classList.add("hidden"); preview.innerHTML = ""; }
    };
    window.submitPostComment = async function(ev) {
      if (ev) ev.preventDefault();
      if (submittingComment) return;
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      const input = document.getElementById("detail-comment-input");
      const submitBtn = document.getElementById("detail-comment-submit");
      const text = (input && input.value || "").trim();
      const postId = currentDetailId;
      const image = pendingCommentImage;
      if ((!text && !image) || !postId) return;
      submittingComment = true;
      setBusyButton(submitBtn, true, "送信中…");
      if (input) input.value = "";
      pendingCommentImage = "";
      if (typeof clearCommentPhoto === "function") clearCommentPhoto();
      try {
        await addDoc(collection(db, "posts", postId, "comments"), {
          text: text,
          image: image || "",
          userId: currentUser.uid,
          userName: getMyDisplayName(),
          createdAt: serverTimestamp()
        });
        loadPostComments(postId);
      } catch (e) {
        if (input) input.value = text;
        /* alert hidden */ console.log("コメントを送れませんでした。");
      } finally {
        submittingComment = false;
        setBusyButton(submitBtn, false);
      }
    };

    async function loadSellOffers(p) {
      const box = document.getElementById("detail-offers");
      if (!box) return;
      box.innerHTML = "";
      if (!p || !p.isSell || !p.id || p.status === "traded") return;
      try {
        const snap = await getDocs(collection(db, "posts", p.id, "offers"));
        if (currentDetailId !== p.id) return;
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.status === "pending");
        const mine = currentUser && p.userId === currentUser.uid;
        const visible = mine ? rows : rows.filter(o => currentUser && o.userId === currentUser.uid);
        if (!visible.length) return;
        box.innerHTML = `<div class="text-[13px] font-medium text-gray-800">値下げの提案</div>` + visible.map(o => {
          const price = "¥" + Number(o.price || 0).toLocaleString();
          const actions = mine
            ? `<div class="flex gap-2 mt-1"><button type="button" onclick="acceptPriceOffer('${p.id}','${o.id}',${Number(o.price)||0})" class="px-3 py-1 rounded-full bg-[#ff4d4f] text-white text-[12px]">この値段にする</button><button type="button" onclick="declinePriceOffer('${p.id}','${o.id}')" class="px-3 py-1 rounded-full bg-white border text-[12px] text-gray-600">断る</button></div>`
            : "";
          const who = mine || (currentUser && o.userId === currentUser.uid) ? escapeHtml(o.userName || "ユーザー") : "提案";
          return `<div class="bg-white border border-gray-200 rounded-xl px-3 py-2"><div class="text-[13px] text-gray-800">${who} ${price}</div>${actions}</div>`;
        }).join("");
      } catch (e) {}
    }
    window.proposePriceCutById = function(postId) {
      if (!currentUser) { showToast("ログインが必要です", "info"); return; }
      const p = allPosts.find(x => x.id === postId);
      if (!p || !p.isSell) return;
      if (p.userId === currentUser.uid) { showToast("自分の出品には提案できません", "info"); return; }
      window._priceOfferPostId = p.id;
      const now = Number(p.price || 0);
      const label = document.getElementById("price-offer-now");
      const input = document.getElementById("price-offer-input");
      if (label) label.textContent = "いまの価格 " + now.toLocaleString() + "円より低い金額を入力";
      if (input) input.value = "";
      const modal = document.getElementById("price-offer-modal");
      if (!modal) { showToast("入力欄を開けませんでした", "error"); return; }
      modal.classList.remove("hidden");
      if (input) setTimeout(function(){ input.focus(); }, 50);
    };
    window.proposePriceCut = function(index) {
      const p = allPosts[index];
      if (p && p.id) window.proposePriceCutById(p.id);
    };
    window.closePriceOffer = function() {
      const modal = document.getElementById("price-offer-modal");
      if (modal) modal.classList.add("hidden");
    };
    window.submitPriceOffer = async function() {
      if (submittingPriceOffer) return;
      const p = allPosts.find(x => x.id === window._priceOfferPostId);
      const input = document.getElementById("price-offer-input");
      const submitBtn = document.getElementById("price-offer-submit");
      if (!currentUser || !p || !p.isSell) return;
      const now = Number(p.price || 0);
      const normalized = String(input && input.value || "").replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[,，円\s]/g, "");
      const price = Math.floor(Number(normalized));
      if (!price || price <= 0 || price >= now) { showToast("今の価格より低い金額にしてください", "info"); return; }
      submittingPriceOffer = true;
      setBusyButton(submitBtn, true, "送信中…");
      try {
        const snap = await getDocs(collection(db, "posts", p.id, "offers"));
        const mine = snap.docs.find(d => d.data().userId === currentUser.uid && d.data().status === "pending");
        if (mine) await updateDoc(doc(db, "posts", p.id, "offers", mine.id), { price, createdAt: serverTimestamp() });
        else await addDoc(collection(db, "posts", p.id, "offers"), {
          userId: currentUser.uid, userName: getMyDisplayName(), price, status: "pending", createdAt: serverTimestamp()
        });
        closePriceOffer();
        showToast("値下げを提案しました", "success");
        loadSellOffers(p);
      } catch (e) { showToast("提案を送れませんでした", "error"); }
      finally {
        submittingPriceOffer = false;
        setBusyButton(submitBtn, false);
      }
    };
    window.acceptPriceOffer = async function(postId, offerId, price) {
      try {
        await updateDoc(doc(db, "posts", postId), { price: Number(price) });
        await updateDoc(doc(db, "posts", postId, "offers", offerId), { status: "accepted" });
        const i = allPosts.findIndex(x => x.id === postId);
        if (i >= 0) allPosts[i].price = Number(price);
        showToast("値下げに同意し、価格を更新しました", "success");
        if (i >= 0) openDetailModal(i);
      } catch (e) { showToast("価格を更新できませんでした", "error"); }
    };
    window.declinePriceOffer = async function(postId, offerId) {
      try {
        await updateDoc(doc(db, "posts", postId, "offers", offerId), { status: "rejected" });
        const i = allPosts.findIndex(x => x.id === postId);
        showToast("値下げ提案を拒否しました", "info");
        if (i >= 0) openDetailModal(i);
      } catch (e) { showToast("拒否処理に失敗しました", "error"); }
    };

    async function loadRating(userId, index) {
      try {
        const snap = await getDocs(query(collection(db, "reviews"), where("toId", "==", userId)));
        if (currentDetailIndex !== index) return;
        const el = document.getElementById("detail-rating"); if (snap.empty) { el.innerText = "評価なし"; return; }
        let sum = 0; snap.forEach(d => { sum += d.data().rating || 0; }); el.innerText = "⭐ " + (sum / snap.size).toFixed(1) + "（" + snap.size + "）";
      } catch(e){}
    }

    window.openSellerProfileFromDetail = function() {
      const p = (currentDetailIndex >= 0) ? allPosts[currentDetailIndex] : null;
      if (!p || !p.userId) return;
      openUserProfile(p.userId, p.userName || "出品者", p.userPhoto || "");
    };
    window.openSellerProfileFromRoom = function() {
      const t = currentTrade; if (!t || !currentUser) return;
      const otherId = currentUser.uid === t.ownerId ? t.applicantId : t.ownerId;
      const otherName = currentUser.uid === t.ownerId ? t.applicantName : t.ownerName;
      if (!otherId) return;
      openUserProfile(otherId, otherName || "相手", "");
    };
    window.closeUserProfileModal = function() {
      const m = document.getElementById("user-profile-modal");
      if (m) m.classList.add("hidden");
    };
    window.openUserProfile = async function(userId, displayName, photoUrl) {
      if (!userId) return;
      const modal = document.getElementById("user-profile-modal");
      const body = document.getElementById("user-profile-body");
      if (!modal || !body) return;
      modal.classList.remove("hidden");
      body.innerHTML = `<p class="text-center text-gray-500 py-8">読み込み中...</p>`;

      let avg = 0, count = 0, reviews = [];
      try {
        const snap = await getDocs(query(collection(db, "reviews"), where("toId", "==", userId)));
        reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        reviews.sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return tb - ta;
        });
        count = reviews.length;
        if (count) {
          avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count;
        }
      } catch (e) { console.warn("reviews load", e); }

      // 公開中の出品（クライアント側の allPosts から）
      const listings = (allPosts || []).filter(p => p.userId === userId && p.status !== "traded" && !isExpired(p));

      let photo = photoUrl || "";
      if ((!photo || !isJpegData(photo)) && listings.length) {
        const hit = listings.find(p => p.userPhoto && isJpegData(p.userPhoto));
        if (hit) photo = hit.userPhoto;
      }

      const stars = (n) => {
        const r = Math.round(Number(n) || 0);
        return [1,2,3,4,5].map(i => i <= r ? "★" : "☆").join("");
      };

      const avatarHtml = (photo && typeof isJpegData === "function" && isJpegData(photo))
        ? `<img src="${photo}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md">`
        : `<div class="w-14 h-14 rounded-full bg-white/70 border border-white flex items-center justify-center text-2xl shadow-md">👤</div>`;

      const reviewsHtml = reviews.length
        ? reviews.slice(0, 30).map(r => {
            const comment = (r.comment || "").trim();
            const when = fmtTime(r.createdAt);
            const from = r.fromName ? escapeHtml(r.fromName) : "取引相手";
            return `<div class="bg-white/70 border border-white rounded-xl p-3 space-y-1">
              <div class="flex justify-between items-center gap-2">
                <span class="text-yellow-500 font-bold tracking-tight">${stars(r.rating)}</span>
                <span class="text-[10px] text-gray-400">${escapeHtml(when)}</span>
              </div>
              <div class="text-[11px] text-gray-500">${from} さん</div>
              ${comment ? `<div class="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">${escapeHtml(comment)}</div>` : `<div class="text-[11px] text-gray-400">コメントなし</div>`}
            </div>`;
          }).join("")
        : `<p class="text-center text-gray-500 py-3 bg-white/40 rounded-xl">まだ評価がありません</p>`;

      const listHtml = listings.length
        ? `<div class="grid grid-cols-2 gap-2">${listings.slice(0, 20).map(p => {
            const price = (p.isSell || p.isBuy || p.kind === "group") && p.price != null
              ? `<div class="text-[10px] font-bold text-pink-600">￥${Number(p.price).toLocaleString()}</div>` : "";
            return `<button type="button" onclick="closeUserProfileModal(); const i=allPosts.findIndex(x=>x.id==='${escapeHtml(p.id)}'); if(i>=0) openDetailModal(i);" class="text-left bg-white/70 border border-white rounded-xl p-2.5 hover:bg-white transition space-y-1">
              <div class="text-[11px] font-bold text-gray-900 line-clamp-2 leading-snug">${escapeHtml(p.give || "")}</div>
              ${price}
              <div class="text-[10px] text-gray-500">${escapeHtml(p.member || "")}</div>
            </button>`;
          }).join("")}</div>`
        : `<p class="text-center text-gray-500 py-3 bg-white/40 rounded-xl">公開中の出品はありません</p>`;

      body.innerHTML = `
        <div class="flex items-center gap-3 bg-white/50 border border-white rounded-2xl p-3">
          ${avatarHtml}
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm text-gray-900 truncate">${escapeHtml(displayName || "ユーザー")}</div>
            <div class="text-yellow-500 font-bold text-sm mt-0.5">${count ? ("⭐ " + avg.toFixed(1) + "（" + count + "件）") : "評価なし"}</div>
          </div>
        </div>
        <div>
          <div class="font-bold text-sm text-gray-800 mb-2">評価・コメント</div>
          <div class="space-y-2">${reviewsHtml}</div>
        </div>
        <div>
          <div class="font-bold text-sm text-gray-800 mb-2">出品中（${listings.length}）</div>
          ${listHtml}
        </div>
        ${currentUser && currentUser.uid !== userId ? `<div class="grid grid-cols-2 gap-2">
          <button type="button" onclick="blockUser(window._profileTarget.id, window._profileTarget.name)" class="py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700">ブロック</button>
          <button type="button" id="seller-notify-btn" onclick="toggleSellerNotify(window._profileTarget.id)" class="py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-800">${(userData.watchSellers || []).includes(userId) ? "通知オン" : "通知"}</button>
        </div>` : ""}`;
      window._profileTarget = { id: userId, name: displayName || "ユーザー" };
    };

    window.deletePost = async function(index) {
      const p = allPosts[index]; if (!p) return;
      if (myTrades.some(t => t.postId === p.id && (t.status === "negotiating" || t.status === "shipping"))) {
        showToast("取引中のため削除できません。先に取引を完了させてください", "error");
      return;
      }
      if (!(await appConfirm("この投稿を削除しますか？", "削除する", true))) return;
      try {
        try { const ps = await getDocs(collection(db, "posts", p.id, "photos")); await Promise.all(ps.docs.map(d => deleteDoc(d.ref))); } catch(e) { console.warn("photos delete:", e?.code || e); }
        if (p.kind === "group") { try { const js = await getDocs(collection(db, "posts", p.id, "joins")); await Promise.all(js.docs.map(d => deleteDoc(d.ref))); } catch(e) { console.warn("joins delete:", e?.code || e); } }
        await deleteDoc(doc(db, "posts", p.id));
        delete photoCache[p.id];
        allPosts = allPosts.filter(x => x.id !== p.id);
        closeDetailModal(); renderPosts();
      } catch(e) { /* alert hidden */ console.log("失敗しました。"); }
    };
    window.blockPostOwner = function(index) { const p = allPosts[index]; if (p) blockUser(p.userId, p.userName); };
    window.toggleDetailMenu = function(ev) {
      if (ev) ev.stopPropagation();
      const menu = document.getElementById("detail-menu");
      if (!menu) return;
      menu.classList.toggle("hidden");
    };
    document.addEventListener("click", function() {
      document.getElementById("detail-menu")?.classList.add("hidden");
    });
    window.reportCurrentDetail = function() {
      document.getElementById("detail-menu")?.classList.add("hidden");
      if (currentDetailIndex < 0) return;
      reportPost(currentDetailIndex);
    };
    window.toggleSellerNotify = async function(userId) {
      if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。");
      if (!userId) return;
      const list = Array.isArray(userData.watchSellers) ? [...userData.watchSellers] : [];
      const on = list.includes(userId);
      if (on) list.splice(list.indexOf(userId), 1);
      else list.push(userId);
      userData.watchSellers = list;
      try { await saveUserData({ watchSellers: list }); } catch (e) { return /* alert hidden */ console.log("保存できませんでした。"); }
      if (!on) {
        const seen = new Set(JSON.parse(localStorage.getItem("gllit_watch_seen") || "[]"));
        allPosts.forEach(function (p) { if (p.userId === userId) seen.add(p.id); });
        localStorage.setItem("gllit_watch_seen", JSON.stringify(Array.from(seen).slice(-400)));
      }
      const btn = document.getElementById("seller-notify-btn");
      if (btn) btn.textContent = on ? "通知" : "通知オン";
      showToast(on ? "この人の通知をオフにしました" : "この人の新しい出品を通知します", "info");
    };
    function notifyWatchedListings() {
      if (!currentUser || !Array.isArray(userData.watchSellers) || !userData.watchSellers.length) return;
      let seen;
      try { seen = new Set(JSON.parse(localStorage.getItem("gllit_watch_seen") || "[]")); } catch (e) { seen = new Set(); }
      let changed = false;
      allPosts.forEach(function (p) {
        if (!userData.watchSellers.includes(p.userId) || seen.has(p.id) || p.userId === currentUser.uid) return;
        seen.add(p.id);
        changed = true;
        addNotification((p.userName || "出品者") + "さんが出品しました: " + (p.give || "出品"), "info");
      });
      if (changed) localStorage.setItem("gllit_watch_seen", JSON.stringify(Array.from(seen).slice(-400)));
    }
    window.reportPost = async function(index) {
      const p = allPosts[index]; if (!p || !currentUser) return;
      const reason = prompt("通報の理由を入力してください:");
      if (!reason || !reason.trim()) return;
      try {
        await addDoc(collection(db, "reports"), { reporterId: currentUser.uid, reporterName: getMyDisplayName(), postId: p.id, postGive: p.give || "", postUserId: p.userId || "", reason: reason.trim().slice(0, 200), status: "open", replies: [], createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() });
        showToast("通報を送信しました。ご協力ありがとうございます。", "success");
      } catch(e) { /* alert hidden */ console.log("通報の送信に失敗しました。"); }
    };
    window.toggleGroupClosed = async function(index) {
      const p = allPosts[index]; if (!p || !currentUser || p.userId !== currentUser.uid) return;
      const nextStatus = p.status === "closed" ? "active" : "closed";
      try { await updateDoc(doc(db, "posts", p.id), { status: nextStatus }); p.status = nextStatus; closeDetailModal(); renderPosts(); } catch(e) {}
    };

    window.onEditBundleChange = function() { document.getElementById("edit-bundle-note-box").classList.toggle("hidden", document.getElementById("edit-bundle").value === "ng"); };
    window.openEditPost = function(index) {
    const _ep = allPosts[index];
    if (_ep && (_ep.status === "traded" || _ep.status === "closed" || myTrades.some(t => t.postId === _ep.id && t.status !== "cancelled"))) {
      showToast("購入・取引が開始された投稿は編集できません", "error");
      return;
    }
      const p = allPosts[index]; if (!p || !currentUser || (p.userId !== currentUser.uid && !isAdmin())) return;
      closeDetailModal(); editingPostId = p.id;
      document.getElementById("edit-give").value = p.give || ""; document.getElementById("edit-want").value = p.want || ""; document.getElementById("edit-price").value = p.price || ""; document.getElementById("edit-deadline").value = p.deadline || ""; document.getElementById("edit-desc").value = p.description || "";
      document.getElementById("edit-want-container").classList.toggle("hidden", !!p.isBuy || p.kind === "group" || !!p.isSell);
      document.getElementById("edit-price-container").classList.toggle("hidden", !(!!p.isBuy || p.kind === "group" || !!p.isSell));
      document.getElementById("edit-deadline-container").classList.toggle("hidden", !(p.kind === "serial" || p.kind === "group"));
      document.getElementById("edit-group-container").classList.toggle("hidden", p.kind !== "group");
      document.getElementById("edit-condition-container").classList.toggle("hidden", !needsCondition(p.kind));
      if (p.condition) document.getElementById("edit-condition").value = p.condition;
      if (p.kind === "group") { document.getElementById("edit-target").value = p.target || ""; document.getElementById("edit-bundle").value = p.bundle || "ok"; document.getElementById("edit-bundle-note").value = p.bundleNote || ""; onEditBundleChange(); }
      document.getElementById("edit-modal").classList.remove("hidden");
    };
    window.closeEditModal = function() { document.getElementById("edit-modal").classList.add("hidden"); editingPostId = null; };
    window.submitEditPost = async function() {
      const p = allPosts.find(x => x.id === editingPostId); if (!p || !currentUser || (p.userId !== currentUser.uid && !isAdmin())) return;
      const data = { give: document.getElementById("edit-give").value.trim(), want: (!!p.isBuy || p.kind === "group" || !!p.isSell) ? "" : document.getElementById("edit-want").value.trim(), price: (!!p.isBuy || p.kind === "group" || !!p.isSell) ? Number(document.getElementById("edit-price").value) : 0, description: document.getElementById("edit-desc").value.trim().slice(0, 200), editedAt: serverTimestamp() };
      if (!data.give) return /* alert hidden */ console.log("内容を入力してください。");
      if (needsCondition(p.kind)) {
        data.condition = document.getElementById("edit-condition").value;
        if (!data.condition) return /* alert hidden */ console.log("状態を選択してください。");
      }
      if (p.kind === "serial" || p.kind === "group") data.deadline = document.getElementById("edit-deadline").value;
      if (p.kind === "group") { data.target = Number(document.getElementById("edit-target").value); data.bundle = document.getElementById("edit-bundle").value; data.bundleNote = data.bundle === "ng" ? "" : document.getElementById("edit-bundle-note").value.trim().slice(0, 100); }
      data.updatedAt = serverTimestamp();
      try { await updateDoc(doc(db, "posts", p.id), data); /* alert hidden */ console.log("更新しました！"); closeEditModal(); loadPosts(true); } catch(e) { /* alert hidden */ console.log("更新失敗"); }
    };

    // 売却出品の「購入を確定」確認ステップ
    window.confirmPurchase = async function(index) {
      if (typeof checkCancelAccountLock === "function" && checkCancelAccountLock()) return;
      const p = allPosts[index];
      if (!currentUser || !p || !p.isSell) return applyToPost(index);
      const price = Number(p.price || 0);
      const priceText = price > 0 ? `¥${price.toLocaleString()}` : "価格未設定";
      const msg = `【購入を確定しますか？】\n\n商品：${p.give || "（内容なし）"}\n金額：${priceText}\n\n確定すると取引ルームが作成され、出品者との取引が始まります。\n（アズカリ決済が原則です）`;
      const ok = await appConfirm(msg, "購入を確定", false);
      if (!ok) return;
      return applyToPost(index);
    };

    function detectBundleBoxes(dataUrl) {
      return new Promise((resolve) => {
        const prevImg = sheetCropState && sheetCropState.img;
        const prevBoxes = sheetCropState && Array.isArray(sheetCropState.boxes) ? sheetCropState.boxes.map(b => ({ ...b })) : [];
        const img = new Image();
        img.onload = () => {
          try {
            sheetCropState.img = img;
            if (typeof rerunSheetAutoDetect === "function") rerunSheetAutoDetect();
            const boxes = (sheetCropState.boxes || []).filter(b => b && b.active !== false && b.w > 8 && b.h > 8).map(b => ({
              x: b.x / img.width, y: b.y / img.height, w: b.w / img.width, h: b.h / img.height, state: "open"
            })).filter(b => b.w > 0.03 && b.h > 0.03 && b.x >= -0.02 && b.y >= -0.02);
            resolve(boxes.slice(0, 24));
          } catch (e) { resolve([]); }
          sheetCropState.img = prevImg || null;
          sheetCropState.boxes = prevBoxes;
        };
        img.onerror = () => resolve([]);
        img.src = dataUrl;
      });
    }
    function drawBundleMarks(baseUrl, boxes) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          boxes.forEach(b => {
            if (!b || b.state === "open") return;
            const x = b.x * img.width, y = b.y * img.height, w = b.w * img.width, h = b.h * img.height;
            ctx.fillStyle = "rgba(225,29,72,0.38)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = Math.max(8, Math.min(w, h) * 0.08);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x + w * 0.22, y + h * 0.22); ctx.lineTo(x + w * 0.78, y + h * 0.78);
            ctx.moveTo(x + w * 0.78, y + h * 0.22); ctx.lineTo(x + w * 0.22, y + h * 0.78);
            ctx.stroke();
          });
          resolve(c.toDataURL("image/jpeg", 0.72));
        };
        img.onerror = () => resolve(baseUrl);
        img.src = baseUrl;
      });
    }
    async function bundlePhotoDocs(postId) {
      const snap = await getDocs(collection(db, "posts", postId, "photos"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    async function rememberBundlePhoto(postId, dataUrl) {
      if (!isJpegData(dataUrl)) return;
      await addDoc(collection(db, "posts", postId, "photoHistory"), { data: dataUrl, createdAt: serverTimestamp() });
      const snap = await getDocs(collection(db, "posts", postId, "photoHistory"));
      const docs = snap.docs.slice().sort((a, b) => ((a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0) - ((b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0));
      while (docs.length > 10) {
        const old = docs.shift();
        try { await deleteDoc(old.ref); } catch (_) {}
      }
    }
    async function saveBundleDisplay(postId, dataUrl) {
      const docs = await bundlePhotoDocs(postId);
      const shown = docs.filter(d => d.role !== "base").sort((a, b) => (a.order || 0) - (b.order || 0));
      const img = await new Promise((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = dataUrl;
      });
      let stored = dataUrl;
      let thumb = dataUrl;
      if (img) {
        try { stored = compressFromImage(img, PHOTO_FULL); } catch (_) {}
        try { thumb = compressFromImage(img, PHOTO_THUMB); } catch (_) { thumb = stored; }
      }
      if (!isJpegData(stored)) return;
      if (shown[0]) await updateDoc(doc(db, "posts", postId, "photos", shown[0].id), { data: stored });
      await updateDoc(doc(db, "posts", postId), { thumb: isJpegData(thumb) ? thumb : stored });
      delete photoCache[postId];
      const lp = allPosts.find(x => x.id === postId);
      if (lp) lp.thumb = isJpegData(thumb) ? thumb : stored;
    }
    window.toggleBundleBox = function(i) {
      const p = allPosts[currentDetailIndex];
      const boxes = listingBoxes(p);
      if (!p || !boxes[i] || (boxes[i].state && boxes[i].state !== "open")) return;
      if (currentUser && p.userId === currentUser.uid) return;
      window._bundlePick = window._bundlePick || new Set();
      if (window._bundlePick.has(i)) window._bundlePick.delete(i); else window._bundlePick.add(i);
      const hits = document.querySelectorAll("#detail-photos .bundle-hit");
      if (hits[i]) {
        const on = window._bundlePick.has(i);
        hits[i].classList.toggle("on", on);
        hits[i].innerHTML = on ? "<span>×</span>" : "";
      }
    };
    async function releaseBundleHolds(postId, indexes) {
      const pref = doc(db, "posts", postId);
      const ps = await getDoc(pref);
      if (!ps.exists() || !Array.isArray(ps.data().bundleBoxes)) return null;
      const boxes = ps.data().bundleBoxes.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, state: b.state || "open" }));
      indexes.forEach(i => { if (boxes[i] && boxes[i].state === "hold") boxes[i].state = "open"; });
      const left = boxes.filter(b => b.state === "open").length;
      await updateDoc(pref, { bundleBoxes: boxes, bundleLeft: left, status: "active" });
      const lp = allPosts.find(x => x.id === postId);
      if (lp) { lp.bundleBoxes = boxes; lp.bundleLeft = left; lp.status = "active"; }
      return boxes;
    }
    async function revertBundleTrade(t) {
      if (!t || !t.postId) return;
      const indexes = Array.isArray(t.bundleIndexes) ? t.bundleIndexes.map(Number).filter(Number.isInteger) : [];
      const selectedSlotIds = new Set(Array.isArray(t.selectedSlotIds) ? t.selectedSlotIds : []);
      if (!indexes.length && !selectedSlotIds.size) return;
      const pref = doc(db, "posts", t.postId);
      let boxes = null;
      let bulkSlots = null;
      let released = false;
      await runTransaction(db, async (tx) => {
        const ps = await tx.get(pref);
        if (!ps.exists()) return;
        const pData = ps.data();
        const updates = {};
        const slotIndexes = Array.isArray(pData.bulkSlots)
          ? pData.bulkSlots.reduce((result, slot, index) => {
              if (selectedSlotIds.has(slot.id)) result.push(index);
              return result;
            }, [])
          : [];
        const boxIndexes = new Set([...indexes, ...slotIndexes]);
        if (boxIndexes.size && Array.isArray(pData.bundleBoxes)) {
          boxes = pData.bundleBoxes.map(b => ({ ...b }));
          boxIndexes.forEach(i => {
            const box = boxes[i];
            if (!box || box.state === "open" || (box.soldTo && box.soldTo !== t.applicantId)) return;
            if (!indexes.includes(i) && (box.state === "hold" || (box.state === "sold" && !box.soldTo))) return;
            box.state = "open";
            delete box.soldTo;
            delete box.holdBy;
            delete box.holdUntil;
            released = true;
          });
          updates.bundleBoxes = boxes;
          updates.bundleLeft = boxes.filter(b => !b.state || b.state === "open").length;
        }
        if ((selectedSlotIds.size || indexes.length) && Array.isArray(pData.bulkSlots)) {
          bulkSlots = pData.bulkSlots.map(slot => {
            if (slot.tradeId !== t.id) return slot;
            released = true;
            return { ...slot, sold: false, tradeId: null };
          });
          updates.bulkSlots = bulkSlots;
        }
        if (!Object.keys(updates).length) return;
        if (released) updates.status = "active";
        updates.updatedAt = serverTimestamp();
        tx.update(pref, updates);
      });
      if (boxes) {
        const left = boxes.filter(b => !b.state || b.state === "open").length;
        const lp = allPosts.find(x => x.id === t.postId);
        if (lp) { lp.bundleBoxes = boxes; lp.bundleLeft = left; if (released) lp.status = "active"; }
      }
      if (bulkSlots) {
        const lp = allPosts.find(x => x.id === t.postId);
        if (lp) { lp.bulkSlots = bulkSlots; if (released) lp.status = "active"; }
      }
      if (indexes.length && t.bundlePhotoApplied) {
        const hist = await getDocs(collection(db, "posts", t.postId, "photoHistory"));
        const newest = hist.docs.slice().sort((a, b) => ((b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0) - ((a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0))[0];
        if (newest && isJpegData(newest.data().data)) {
          await saveBundleDisplay(t.postId, newest.data().data);
          try { await deleteDoc(newest.ref); } catch (_) {}
        }
      }
      renderPosts();
    }
    async function bundleMarkedJpeg(baseUrl, boxes) {
      const raw = await drawBundleMarks(baseUrl, boxes);
      if (!isJpegData(raw)) return raw;
      const img = await new Promise((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = raw;
      });
      if (!img) return raw;
      try { return compressFromImage(img, { maxSide: 900, quality: 0.68, maxChars: 220000 }) || raw; } catch (_) { return raw; }
    }
    window.applyBundlePost = async function(index) {
      if (typeof checkCancelAccountLock === "function" && checkCancelAccountLock()) return;
      const p = allPosts[index];
      if (!currentUser || !p) return;
      if (!requireShippingInfo()) return;
      if (!(await checkDeviceLock())) return;
      const boxesNow = listingBoxes(p);
      const picks = [...(window._bundlePick || [])].map(Number).filter(i => boxesNow[i] && (!boxesNow[i].state || boxesNow[i].state === "open"));
      if (!picks.length) { showToast("欲しいトレカの枠をタップしてください", "info"); return; }
      let held = false;
      try {
        let nextBoxes = null;
        await runTransaction(db, async (tx) => {
          const postRef = doc(db, "posts", p.id);
          const ps = await tx.get(postRef);
          if (!ps.exists()) throw new Error("notfound");
          const cur = ps.data();
          if (cur.status && cur.status !== "active") throw new Error("notactive");
          const boxes = asUnitBoxes(cur.bundleBoxes && cur.bundleBoxes.length ? cur.bundleBoxes : boxesNow).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, state: b.state || "open" }));
          for (const i of picks) {
            if (!boxes[i] || boxes[i].state !== "open") throw new Error("taken");
            boxes[i].state = "hold";
          }
          const left = boxes.filter(b => b.state === "open").length;
          nextBoxes = boxes;
          tx.update(postRef, { bundleBoxes: boxes, bundleLeft: left, status: "active" });
        });
        held = true;
        const docs = await bundlePhotoDocs(p.id);
        const base = docs.find(d => d.role === "base") || docs.filter(d => d.role !== "base").sort((a, b) => (a.order || 0) - (b.order || 0))[0];
        const source = base && isJpegData(base.data) ? base.data : (isJpegData(p.thumb) ? p.thumb : "");
        const previewBoxes = (nextBoxes || []).map((b, i) => ({ x: b.x, y: b.y, w: b.w, h: b.h, state: picks.indexOf(i) >= 0 ? "sold" : "open" }));
        const preview = source ? await bundleMarkedJpeg(source, previewBoxes) : "";
        const ref = await addDoc(collection(db, "trades"), {
          kind: p.kind, isBuy: false, isSell: !!p.isSell, isBundle: true, postId: p.id,
          postGive: p.give, postWant: p.want || "", postPrice: p.price || 0, postMember: p.member || "指定なし",
          bundleIndexes: picks, bundlePhotoApplied: false, paymentMethod: p.paymentMethod || "azukari",
          ownerId: p.userId, ownerName: p.userName, applicantId: currentUser.uid, applicantName: getMyDisplayName(),
          participants: [p.userId, currentUser.uid], status: "negotiating",
          agreed: {}, shipped: {}, received: {}, disputed: {},
          lastMessageAt: serverTimestamp(), lastSenderId: currentUser.uid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deviceId: getOrCreateDeviceId()
        });
        if (isJpegData(preview)) {
          await addDoc(collection(db, "trades", ref.id, "messages"), {
            senderId: currentUser.uid, senderName: getMyDisplayName(),
            text: "枠 " + picks.map(i => i + 1).join("、") + " で申し込みます",
            image: preview, createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId()
          });
        }
        p.bundleBoxes = nextBoxes;
        p.bundleLeft = nextBoxes.filter(b => b.state === "open").length;
        window._bundlePick = new Set();
        renderPosts();
        closeDetailModal();
        openTrade(ref.id);
        showToast("申し込みました。出品者の合意を待っています", "success");
      } catch (e) {
        if (held) { try { await releaseBundleHolds(p.id, picks); } catch (_) {} }
        if (e && (e.message === "taken" || e.message === "notactive")) { showToast("そのカードは、さきほど選ばれました", "info"); return; }
        console.error(e);
        showToast("申し込みに失敗しました", "error");
      }
    };
    window.agreeBundleTrade = async function() {
    const t = currentTrade;
    if (!t || !currentUser || t.ownerId !== currentUser.uid || t.status !== "negotiating") return;
    const picks = Array.isArray(t.bundleIndexes) ? t.bundleIndexes.map(Number) : [];
    if (!picks.length || !t.postId) return;
    try {
      let nextBoxes = null;
      const lp0 = allPosts.find(x => x.id === t.postId);
      await runTransaction(db, async (tx) => {
        const pRef = doc(db, "posts", t.postId);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) throw new Error("notfound");
        const data = pSnap.data() || {};
        const rawBoxes = (Array.isArray(data.bundleBoxes) && data.bundleBoxes.length)
          ? data.bundleBoxes
          : (lp0 && Array.isArray(lp0.bundleBoxes) ? lp0.bundleBoxes : []);
        const normalized = typeof asUnitBoxes === "function" ? asUnitBoxes(rawBoxes) : rawBoxes;
        const boxes = normalized.map(b => ({ ...b, state: b.state || "open" }));

        for (const idx of picks) {
          const b = boxes[idx];
          if (!b) throw new Error("taken");
          // 既に別の人に確定済み（sold）の場合のみブロック。hold や open、または同一申込者宛ては確定可能
          if (b.state === "sold" && b.soldTo && b.soldTo !== t.applicantId) {
            throw new Error("taken");
          }
          b.state = "sold";
          b.soldTo = t.applicantId;
          delete b.holdBy;
          delete b.holdUntil;
        }
        nextBoxes = boxes;
        const left = boxes.filter(b => b.state === "open").length;
        tx.update(pRef, {
          bundleBoxes: boxes,
          bundleLeft: left,
          status: left === 0 ? "closed" : "active",
          updatedAt: serverTimestamp()
        });
      });

      await updateDoc(doc(db, "trades", t.id), {
        status: "shipping",
        [`agreed.${currentUser.uid}`]: true,
        updatedAt: serverTimestamp()
      });

      const lp = allPosts.find(x => x.id === t.postId);
      if (lp && nextBoxes) {
        lp.bundleBoxes = nextBoxes;
        lp.bundleLeft = nextBoxes.filter(b => b.state === "open").length;
        lp.status = lp.bundleLeft === 0 ? "closed" : "active";
      }

      try {
        if (nextBoxes && typeof loadBundlePhoto === "function" && typeof bundleMarkedJpeg === "function") {
          const base = await loadBundlePhoto(t.postId);
          const shown = await loadBundlePhoto(t.postId + ":shown");
          if (shown && typeof isJpegData === "function" && isJpegData(shown.data)) {
            await rememberBundlePhoto(t.postId, shown.data);
          }
          const source = base && typeof isJpegData === "function" && isJpegData(base.data) ? base.data : (shown && shown.data);
          if (source) {
            const marked = await bundleMarkedJpeg(source, nextBoxes.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, state: b.state === "sold" ? "sold" : "open" })));
            await saveBundleDisplay(t.postId, marked);
          }
        }
      } catch (imgErr) {
        console.warn("bundle mark skip:", imgErr);
      }

      renderPosts();
      showToast("合意しました！", "success");
    } catch (e) {
      console.error("agreeBundleTrade error:", e);
      if (e && e.message === "taken") {
        showToast("その枠はもう選べません", "error");
      } else {
        showToast("合意に失敗しました: " + (e?.code || e?.message || ""), "error");
      }
    }
  };
  window.declineBundleTrade = async function() {
      const t = currentTrade;
      if (!t || !currentUser || t.ownerId !== currentUser.uid || t.status !== "negotiating") return;
      if (!(await appConfirm("この申し込みには合意しません。枠を空けます。", "合意しない", true))) return;
      try {
        await updateDoc(doc(db, "trades", t.id), { status: "cancelled", updatedAt: serverTimestamp() });
        if (Array.isArray(t.bundleIndexes)) await releaseBundleHolds(t.postId, t.bundleIndexes.map(Number));
        renderPosts();
        showToast("合意しませんでした", "info");
        closeRoom();
      } catch (e) { showToast("処理に失敗しました", "error"); }
    };
    window.withdrawBundleTrade = async function() {
      const t = currentTrade;
      if (!t || !currentUser || t.applicantId !== currentUser.uid || t.status !== "negotiating") return;
      if (!(await appConfirm("申し込みを取り下げますか？", "取り下げる", true))) return;
      try {
        await updateDoc(doc(db, "trades", t.id), { status: "cancelled", updatedAt: serverTimestamp() });
        if (Array.isArray(t.bundleIndexes)) await releaseBundleHolds(t.postId, t.bundleIndexes.map(Number));
        renderPosts();
        showToast("申し込みを取り下げました", "info");
        closeRoom();
      } catch (e) { showToast("取り下げに失敗しました", "error"); }
    };
    window.agreeStandardExchange = async function() {
      const t = currentTrade;
      if (!t || !currentUser || t.ownerId !== currentUser.uid || t.status !== "negotiating" || !isStandardExchangeTrade(t)) return;
      try {
        await updateDoc(doc(db, "trades", t.id), {
          status: "shipping",
          [`agreed.${t.ownerId}`]: true,
          updatedAt: serverTimestamp()
        });
        showToast("合意しました。発送フェーズに進みます。", "success");
      } catch (e) {
        console.error("agreeStandardExchange error:", e);
        showToast("合意に失敗しました", "error");
      }
    };
    window.declineStandardExchange = async function() {
      const t = currentTrade;
      if (!t || !currentUser || t.ownerId !== currentUser.uid || t.status !== "negotiating" || !isStandardExchangeTrade(t)) return;
      if (!(await appConfirm("この申し込みを断りますか？\n取引はキャンセルされ、募集を再開します。", "合意しない", true))) return;
      try {
        await updateDoc(doc(db, "trades", t.id), { status: "cancelled", updatedAt: serverTimestamp() });
        await restorePostToActive(t.postId, t.kind, t.applicantId, t.id);
        renderPosts();
        showToast("申し込みを断り、募集を再開しました", "info");
        closeRoom();
      } catch (e) {
        console.error("declineStandardExchange error:", e);
        showToast("キャンセルに失敗しました", "error");
      }
    };
    window.withdrawStandardExchange = async function() {
      const t = currentTrade;
      if (!t || !currentUser || t.applicantId !== currentUser.uid || t.status !== "negotiating" || !isStandardExchangeTrade(t)) return;
      if (!(await appConfirm("申し込みを取り下げますか？\n募集は再開されます。", "取り下げる", true))) return;
      try {
        await updateDoc(doc(db, "trades", t.id), { status: "cancelled", updatedAt: serverTimestamp() });
        await restorePostToActive(t.postId, t.kind, t.applicantId, t.id);
        renderPosts();
        showToast("申し込みを取り下げました", "info");
        closeRoom();
      } catch (e) {
        console.error("withdrawStandardExchange error:", e);
        showToast("取り下げに失敗しました", "error");
      }
    };

    function isStandardExchangePost(post) {
      return !!post && !post.isSell && !post.isBundle && !post.isBulk &&
        post.kind !== "group" && !(Array.isArray(post.bundleBoxes) && post.bundleBoxes.length);
    }
    function isStandardExchangeTrade(trade) {
      return !!trade && !trade.isSell && !trade.isBundle && trade.kind !== "group" &&
        !(Array.isArray(trade.bundleIndexes) && trade.bundleIndexes.length);
    }
    window.openExchangeApplyModal = function(index) {
      pendingExchangePostIndex = index;
      const input = document.getElementById("exchange-apply-images");
      if (input) input.value = "";
      const submit = document.getElementById("exchange-apply-submit");
      if (submit) submit.disabled = true;
      const preview = document.getElementById("exchange-apply-preview");
      if (preview) preview.innerHTML = "";
      exchangeImageUrls.forEach(url => URL.revokeObjectURL(url));
      exchangeImageUrls = [];
      document.getElementById("exchange-apply-modal").classList.remove("hidden");
    };
    window.closeExchangeApplyModal = function(force) {
      if (submittingExchangeApply && !force) return;
      document.getElementById("exchange-apply-modal").classList.add("hidden");
      pendingExchangePostIndex = -1;
      const preview = document.getElementById("exchange-apply-preview");
      if (preview) preview.innerHTML = "";
      const input = document.getElementById("exchange-apply-images");
      if (input) input.value = "";
      exchangeImageUrls.forEach(url => URL.revokeObjectURL(url));
      exchangeImageUrls = [];
    };
    window.previewExchangeApplyImages = function(input) {
      const preview = document.getElementById("exchange-apply-preview");
      const submit = document.getElementById("exchange-apply-submit");
      if (!preview || !submit) return;
      exchangeImageUrls.forEach(url => URL.revokeObjectURL(url));
      exchangeImageUrls = [];
      preview.innerHTML = "";
      const files = Array.from(input.files || []).filter(file => file.type.startsWith("image/"));
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        exchangeImageUrls.push(url);
        const img = document.createElement("img");
        img.src = url;
        img.alt = "差し出すトレカ";
        img.className = "w-full aspect-square object-cover rounded-lg border border-gray-200";
        preview.appendChild(img);
      });
      submit.disabled = files.length === 0;
      if (!files.length && input.files && input.files.length) showToast("画像ファイルを選択してください", "error");
    };
    window.confirmExchangeApply = async function() {
      if (submittingExchangeApply || applyingToPost) return;
      const index = pendingExchangePostIndex;
      const post = allPosts[index];
      const input = document.getElementById("exchange-apply-images");
      const files = Array.from(input?.files || []).filter(file => file.type.startsWith("image/"));
      if (!isStandardExchangePost(post) || !files.length) {
        showToast("差し出すトレカの画像を1枚以上選択してください", "info");
        return;
      }
      submittingExchangeApply = true;
      const submit = document.getElementById("exchange-apply-submit");
      setBusyButton(submit, true, "画像を準備中…");
      try {
        const images = [];
        for (const file of files) images.push(await compressImage(file, CHAT_PHOTO));
        pendingExchangeSubmission = { index, images };
        setBusyButton(submit, true, "申込中…");
        await applyToPost(index);
      } catch (e) {
        console.error("exchange application image error:", e);
        showToast("画像を準備できませんでした。別の画像をお試しください。", "error");
      } finally {
        submittingExchangeApply = false;
        setBusyButton(submit, false);
        if (submit) submit.disabled = !input?.files?.length;
      }
    };

    window.applyToPost = async function(index) {
      if (applyingToPost) return;
      const exchangeSubmission = pendingExchangeSubmission && pendingExchangeSubmission.index === index ? pendingExchangeSubmission : null;
      pendingExchangeSubmission = null;
      if (typeof checkCancelAccountLock === "function" && checkCancelAccountLock()) return;
      const p = allPosts[index]; if (!currentUser || !p || !p.userId) return;
      if (!requireShippingInfo()) return;
      if (p.kind === "group") return joinGroup(index);
      if (!(await checkDeviceLock())) return;

      if (p.isBulk && Array.isArray(p.bulkSlots) && p.bulkSlots.length > 0) {
          if (!window.__pendingBulkSlotIds) {
            window.__proceedOriginalTradeApply = () => {
              if (typeof window.applyTrade === "function") window.applyTrade(index);
              else if (typeof applyTrade === "function") applyTrade(index);
            };
            window.openBulkSelectModal(p);
            return;
          }
        }
        const __chosenBulkSlotIds = window.__pendingBulkSlotIds || null;
        window.__pendingBulkSlotIds = null;
        const existing = myTrades.find(t => t.postId === p.id && t.applicantId === currentUser.uid && t.status !== "cancelled");
      if (existing) {
        /* alert hidden */ console.log("すでにこの出品に対する取引ルームが存在します。");
        closeDetailModal();
        openTrade(existing.id);
        return;
      }
      const normalExchange = isStandardExchangePost(p);
      if (normalExchange && !exchangeSubmission) {
        openExchangeApplyModal(index);
        return;
      }

      applyingToPost = true;
      const detailApplyBtn = document.querySelector('#detail-actions button[onclick*="applyToPost"], #detail-actions button[onclick*="confirmPurchase"], #detail-actions button[onclick*="joinGroup"], #detail-actions button[onclick*="applyBundlePost"]');
      setBusyButton(detailApplyBtn, true, "処理中…");
      try {
      const deviceId = getOrCreateDeviceId();
      // 先着：出品が active のときだけ traded にして確保（同時申込の二重取引を防ぐ）
      let claimed = false;
      try {
        await runTransaction(db, async (tx) => {
          const postRef = doc(db, "posts", p.id);
          const ps = await tx.get(postRef);
          if (!ps.exists()) throw new Error("notfound");
          if (ps.data().status !== "active") throw new Error("notactive");
          tx.update(postRef, { status: "traded" });
        });
        if (!p.isBulk) { claimed = true; p.status = "traded"; renderPosts(); }
      } catch (claimErr) {
        if (claimErr && (claimErr.message === "notactive" || claimErr.message === "notfound")) {
          return /* alert hidden */ console.log("この出品はすでに取引中、または終了しています。");
        }
        console.warn("post claim failed:", claimErr?.code || claimErr); // 権限などは従来どおり続行
      }
      let createdTradeId = null;
      try {
        // 売却は合意ステップをスキップし、即「取引・発送中」でルームを開く
        const direct = true;
        const agreedMap = normalExchange
          ? { [currentUser.uid]: true }
          : { [p.userId]: true, [currentUser.uid]: true };
        const ref = await addDoc(collection(db, "trades"), {
          kind: p.kind,
          isBuy: !!p.isBuy,
          isSell: !!p.isSell,
          postId: p.id,
          postGive: p.give,
          postWant: p.want || "",
          postPrice: p.price || 0,
          postMember: p.member || "指定なし",
          postDeadline: p.deadline || "",
          postPhotoCount: p.photoCount || 0,
          postCondition: p.condition || "",
          paymentMethod: p.paymentMethod || (usesAzukariPayment(p) ? "azukari" : "paypay"),
          ownerId: p.userId,
          ownerName: p.userName,
          applicantId: currentUser.uid,
          applicantName: getMyDisplayName(),
          participants: [p.userId, currentUser.uid],
          status: normalExchange ? "negotiating" : "shipping",
          agreed: agreedMap,
          shipped: {},
          received: {},
          disputed: {},
          lastMessageAt: serverTimestamp(),
          lastSenderId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deviceId: deviceId
        });
        createdTradeId = ref.id;

        claimed = false; // 取引作成まで成功
        if (normalExchange && exchangeSubmission) {
          for (let imageIndex = 0; imageIndex < exchangeSubmission.images.length; imageIndex++) {
            await addDoc(collection(db, "trades", ref.id, "messages"), {
              senderId: currentUser.uid,
              senderName: getMyDisplayName(),
              text: imageIndex === 0 ? "交換を申し込みました" : "差し出しトレカ画像",
              image: exchangeSubmission.images[imageIndex],
              createdAt: serverTimestamp(),
              deviceId: deviceId
            });
          }
        }

        closeDetailModal();
        if (normalExchange) closeExchangeApplyModal(true);
        openTrade(ref.id);
        showToast(normalExchange ? "交換を申し込みました。出品者の合意をお待ちください。" : "申し込みが完了しました。取引ルームで決済・発送を進めてください。", "success");
      } catch (e) {
        console.error("applyToPost error:", e);
        if (createdTradeId) {
          closeDetailModal();
          closeExchangeApplyModal(true);
          openTrade(createdTradeId);
          showToast("取引は作成されましたが、申込画像を送信できませんでした。取引ルームから再送してください。", "error");
          return;
        }
        if (claimed) restorePostToActive(p.id, p.kind, null); // 取引が作れなかったら確保を戻す
        const msg = e?.code || e?.message || String(e);
        if (msg.includes("permission-denied") || msg.includes("PERMISSION_DENIED")) {
          /* alert hidden */ console.log("処理に失敗しました。\n（権限エラー）\nページを再読み込みしてからもう一度お試しください。");
        } else if (msg.includes("device") || msg.includes("Device")) {
          /* alert hidden */ console.log("処理に失敗しました。\n（デバイス認証エラー）\n一度ログアウト→ログインしてから再度お試しください。");
        } else {
          /* alert hidden */ console.log("処理に失敗しました。\n" + msg);
        }
      }
      } finally {
        applyingToPost = false;
        setBusyButton(detailApplyBtn, false);
      }
    };
    window.joinGroup = async function(index) {
      if (typeof checkCancelAccountLock === "function" && checkCancelAccountLock()) return;
      const p = allPosts[index]; if (!currentUser || !p || !p.userId || p.kind !== "group" || !(await checkDeviceLock())) return;
      if (!requireShippingInfo()) return;
      if (p.status === "closed" || isExpired(p)) return /* alert hidden */ console.log("募集終了。");
      
      const existing = myTrades.find(t => t.postId === p.id && t.status !== "cancelled");
      if (existing) {
        /* alert hidden */ console.log("すでにこの共同購入に参加しています。");
        closeDetailModal();
        openTrade(existing.id);
        return;
      }

      const joins = joinsOf(p.id); if (joins.some(j => j.id === currentUser.uid)) return /* alert hidden */ console.log("参加済みです。");
      const localCount = Math.max(0, typeof p.joinsCount === "number" ? p.joinsCount : joins.length);
      if (localCount >= Number(p.target || 0)) return /* alert hidden */ console.log("満員です。");
      const bc = p.bundle === "ng" ? "none" : (p.bundle === "only" ? "want" : "none");
      try {
        const postRef = doc(db, "posts", p.id);
        const joinRef = doc(db, "posts", p.id, "joins", currentUser.uid);
        await runTransaction(db, async (transaction) => {
          const postSnap = await transaction.get(postRef);
          if (!postSnap.exists()) throw new Error("notfound");
          const data = postSnap.data();
          if (data.status === "closed") throw new Error("closed");
          if (isExpired(data)) throw new Error("expired");
          const joinSnap = await transaction.get(joinRef);
          if (joinSnap.exists()) throw new Error("already");
          const target = Number(data.target || 0);
          const currentCount = typeof data.joinsCount === "number" ? data.joinsCount : 0;
          if (currentCount >= target) throw new Error("full");
          transaction.update(postRef, { joinsCount: increment(1) });
          transaction.set(joinRef, { uid: currentUser.uid, userName: getMyDisplayName(), bundleChoice: bc, createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() });
        });
        p.joinsCount = (typeof p.joinsCount === "number" ? p.joinsCount : 0) + 1;
        (groupJoins[p.id] = groupJoins[p.id] || []).push({ id: currentUser.uid, userName: getMyDisplayName(), bundleChoice: bc });
        // 共同購入は応募後、双方の合意ボタンで進行
        const ref = await addDoc(collection(db, "trades"), {
          kind: "group", isBuy: false, postId: p.id, postGive: p.give, postWant: "", postPrice: p.price || 0,
          postMember: p.member || "指定なし", postDeadline: p.deadline || "", postPhotoCount: p.photoCount || 0,
          postTarget: p.target || 0, postBundle: p.bundle || "ng", postBundleNote: p.bundleNote || "", bundleChoice: bc,
          paymentMethod: p.paymentMethod || (usesAzukariPayment(p) ? "azukari" : "paypay"),
          ownerId: p.userId, ownerName: p.userName, applicantId: currentUser.uid, applicantName: getMyDisplayName(),
          participants: [p.userId, currentUser.uid], status: "shipping",
          agreed: { [p.userId]: true, [currentUser.uid]: true },
          shipped: {}, received: {}, disputed: {},
          lastMessageAt: serverTimestamp(), lastSenderId: currentUser.uid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deviceId: getOrCreateDeviceId()
        });
        closeDetailModal();
        openTrade(ref.id);
        showToast("応募が完了しました。取引ルームで決済・発送を進めてください。", "success");
      } catch(e) {
        const msg = e && e.message;
        if (msg === "full") /* alert hidden */ console.log("満員です。");
        else if (msg === "already") /* alert hidden */ console.log("参加済みです。");
        else if (msg === "closed" || msg === "expired") /* alert hidden */ console.log("募集終了。");
        else /* alert hidden */ console.log("失敗しました。");
      }
    };
    window.openMyGroupTrade = function(index) {
      const p = allPosts[index]; if (!p || !currentUser) return;
      const t = myTrades.find(x => x.postId === p.id && x.applicantId === currentUser.uid && x.status !== "cancelled");
      if (t) { closeDetailModal(); openTrade(t.id); } else /* alert hidden */ console.log("取引ルームが見つかりません。");
    };

    window.openWalletModal = function() { if (!currentUser) return /* alert hidden */ console.log("ログインが必要です。"); renderWallet(); document.getElementById("wallet-modal").classList.remove("hidden"); };
    window.closeWalletModal = function() { document.getElementById("wallet-modal").classList.add("hidden"); };
    function renderWallet() {
      const now = new Date(); let totalCompleted = 0, totalPending = 0, completedCount = 0;
      myTrades.forEach(t => {
        const sellerId = t.isBuy ? t.applicantId : t.ownerId;
        if (sellerId !== currentUser.uid || !isPayTrade(t)) return;
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          const p = Number(t.postPrice || 0);
          if (t.status === "completed") { totalCompleted += p; completedCount++; } else if (t.status === "negotiating" || t.status === "shipping") { totalPending += p; }
        }
      });
      document.getElementById("wallet-month-title").innerText = `${now.getFullYear()}年${now.getMonth() + 1}月 のアナリティクス`;
      document.getElementById("wallet-total").innerText = `￥${totalCompleted.toLocaleString()}`;
      document.getElementById("wallet-pending").innerText = `￥${totalPending.toLocaleString()}`;
      document.getElementById("wallet-count").innerText = `${completedCount} 件`;
    }

    function clipNotice(value, max) {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      return text.length > max ? text.slice(0, max) + "…" : text;
    }
    function tradeItemLabel(t) {
      const member = t.postMember && t.postMember !== "指定なし" ? "（" + clipNotice(t.postMember, 12) + "）" : "";
      return clipNotice(t.postGive || "出品", 36) + member;
    }
    function tradeRequestCopy(t) {
      const who = clipNotice(t.applicantName || "相手", 16);
      const item = tradeItemLabel(t);
      const price = Number(t.postPrice || 0);
      const yen = price > 0 ? " ¥" + price.toLocaleString() : "";
      const want = clipNotice(t.postWant || "", 20);
      if (t.kind === "group") {
        return { toast: "👥 " + who + "さんが共同購入に参加", note: who + "さんが共同購入に参加：" + item, type: "success" };
      }
      if (t.isBundle && Array.isArray(t.bundleIndexes) && t.bundleIndexes.length) {
        const nums = t.bundleIndexes.map(function (n) { return Number(n) + 1; }).join("・");
        return { toast: "🃏 " + who + "さんが枠" + nums + "を申し込み", note: who + "さんが枠" + nums + "を申し込み：" + item, type: "success" };
      }
      if (t.isBuy) {
        return { toast: "💳 " + who + "さんから買取の申し込み", note: who + "さんから買取の申し込み：" + item + yen, type: "success" };
      }
      if (t.isSell) {
        return { toast: "📥 " + who + "さんから購入申請", note: who + "さんから購入申請：" + item + yen, type: "success" };
      }
      if (want) {
        return { toast: "🔄 " + who + "さんから交換申請", note: who + "さんから交換申請：" + item + " → " + want, type: "success" };
      }
      return { toast: "📥 " + who + "さんから申し込み", note: who + "さんから申し込み：" + item + yen, type: "success" };
    }
    function tradeWatchSnap(t) {
      return {
        status: t.status || "",
        msgAt: tsMillis(t.lastMessageAt),
        shipO: !!(t.shipped && t.ownerId && t.shipped[t.ownerId]),
        shipA: !!(t.shipped && t.applicantId && t.shipped[t.applicantId]),
        recO: !!(t.received && t.ownerId && t.received[t.ownerId]),
        recA: !!(t.received && t.applicantId && t.received[t.applicantId]),
        cancelBy: (t.cancelRequest && t.cancelRequest.by) || ""
      };
    }
    function tradeUpdateCopy(t, prev) {
      if (!prev || !currentUser) return null;
      const uid = currentUser.uid;
      const iAmOwner = uid === t.ownerId;
      const otherName = clipNotice(iAmOwner ? (t.applicantName || "相手") : (t.ownerName || "相手"), 16);
      const item = tradeItemLabel(t);
      if (prev.status !== (t.status || "")) {
        if (t.status === "cancelled") {
          const by = t.cancelledBy || (t.cancelRequest && t.cancelRequest.by) || "";
          if (by === uid) return null;
          const who = t.adminCancelled ? "運営" : otherName + "さん";
          return { toast: who + "が取引をキャンセル", note: who + "が取引をキャンセル：" + item, type: "admin" };
        }
        if (t.status === "completed") {
          return { toast: "🎉 取引が完了", note: "取引が完了しました。評価をお願いします：" + item, type: "success" };
        }
        if (t.status === "shipping" && prev.status === "negotiating" && !iAmOwner) {
          return { toast: "✅ " + otherName + "さんが合意しました", note: otherName + "さんが合意。決済・発送へ：" + item, type: "success" };
        }
      }
      if (t.cancelRequest && t.cancelRequest.by && t.cancelRequest.by !== prev.cancelBy && t.cancelRequest.by !== uid) {
        return { toast: "⚠️ " + otherName + "さんからキャンセル申請", note: otherName + "さんからキャンセル申請：" + item, type: "admin" };
      }
      const otherShipped = iAmOwner
        ? (!prev.shipA && !!(t.shipped && t.applicantId && t.shipped[t.applicantId]))
        : (!prev.shipO && !!(t.shipped && t.ownerId && t.shipped[t.ownerId]));
      if (otherShipped) {
        return { toast: "📦 " + otherName + "さんが発送・決済", note: otherName + "さんが決済／発送を完了：" + item, type: "info" };
      }
      const otherReceived = iAmOwner
        ? (!prev.recA && !!(t.received && t.applicantId && t.received[t.applicantId]))
        : (!prev.recO && !!(t.received && t.ownerId && t.received[t.ownerId]));
      if (otherReceived) {
        return { toast: "✨ " + otherName + "さんが受け取り完了", note: otherName + "さんが受け取りを確認：" + item, type: "success" };
      }
      if (tsMillis(t.lastMessageAt) > (prev.msgAt || 0) && t.lastSenderId && t.lastSenderId !== uid) {
        return { toast: "💬 " + otherName + "さんからメッセージ", note: otherName + "さんからメッセージ：" + item, type: "info" };
      }
      return null;
    }
    function announceTrade(copy, tradeId) {
      if (!copy) return;
      addNotification(copy.note, copy.type || "info", { type: "trade", id: tradeId });
      if ((window._tradeToastLeft || 0) > 0) {
        window._tradeToastLeft -= 1;
        showToast(copy.toast, copy.type === "admin" ? "error" : (copy.type === "success" ? "success" : "info"));
      }
    }

    function subscribeTrades() {
      if (unsubTrades) unsubTrades();
      tradesLoaded = false;
      window._tradeWatchReady = false;
      window._tradeWatch = {};
      unsubTrades = onSnapshot(query(collection(db, "trades"), where("participants", "array-contains", currentUser.uid)), (snap) => {
        myTrades = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tradesLoaded = true;
        const lastAct = t => Math.max(tsValue(t.updatedAt), tsMillis(t.lastMessageAt));
        myTrades.sort((a, b) => lastAct(b) - lastAct(a));
        const unread = myTrades.filter(t => isUnread(t)).length;
        const fromCache = !!(snap.metadata && snap.metadata.fromCache);
        if (!window._tradeWatchReady) {
          if (!fromCache) {
            window._tradeWatchReady = true;
            window._tradeWatch = {};
            myTrades.forEach(t => { window._tradeWatch[t.id] = tradeWatchSnap(t); });
          }
        } else {
          window._tradeToastLeft = 3;
          const keep = {};
          myTrades.forEach(t => {
            const prev = window._tradeWatch[t.id];
            if (!prev) {
              if (t.ownerId === currentUser.uid && t.applicantId !== currentUser.uid) announceTrade(tradeRequestCopy(t), t.id);
            } else {
              announceTrade(tradeUpdateCopy(t, prev), t.id);
            }
            keep[t.id] = tradeWatchSnap(t);
          });
          window._tradeWatch = keep;
        }
        prevUnreadCount = unread;
        updateBadge();
        renderSellTab();
        scheduleHealSoldPosts();
        if (!document.getElementById("trades-modal").classList.contains("hidden")) renderTradesList();
        if (!document.getElementById("wallet-modal").classList.contains("hidden")) renderWallet();
      }, (err) => {
        console.warn("trades snapshot error:", err?.code || err);
        tradesLoaded = true;
        if (!document.getElementById("trades-modal").classList.contains("hidden")) renderTradesList();
      });
    }
    function updateBadge() {
      const unread = myTrades.filter(t => isUnread(t)).length, active = myTrades.filter(t => t.status === "negotiating" || t.status === "shipping").length;
      const n = unread > 0 ? unread : active; const b1 = document.getElementById("trades-badge"), b2 = document.getElementById("nav-trades-badge");
      if (b1) { b1.innerText = n; b1.className = "absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm border border-white " + (unread > 0 ? "bg-pink-500" : "bg-gray-400") + (n === 0 ? " hidden" : ""); }
      if (b2) { b2.innerText = n; b2.className = "absolute top-1 right-2.5 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white " + (unread > 0 ? "bg-pink-500" : "bg-gray-400") + (n === 0 ? " hidden" : ""); }
    }

    const tradeSecOpen = { active: true, done: true, cancel_other: false, cancel_me: false, cancel_unknown: false };
    window.tradeSecToggle = function(id, open) { tradeSecOpen[id] = !!open; };
    window.openTradesModal = function(section) {
      if (section && section in tradeSecOpen) tradeSecOpen[section] = true;
      renderTradesList(); document.getElementById("trades-modal").classList.remove("hidden");
      if (section) setTimeout(() => { const el = document.getElementById("trades-sec-" + section); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
    };
    window.closeTradesModal = function() { document.getElementById("trades-modal").classList.add("hidden"); };
    document.getElementById("trades-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-trade-id]"); if (b) openTrade(b.dataset.tradeId);
    });
    // キャンセルの主体： me=自分 / other=相手 / admin=運営 / unknown=記録なし（旧データ）
    function cancelSide(t) {
      if (t.adminCancelled) return "admin";
      const by = t.cancelledBy || (t.cancelRequest && t.cancelRequest.by);
      if (!by) return "unknown";
      return by === currentUser.uid ? "me" : "other";
    }
    window.renderTradesList = function() {
      const el = document.getElementById("trades-list");
      if (!tradesLoaded) {
        el.innerHTML = `<div class="space-y-3" aria-busy="true" aria-label="取引一覧を読み込み中">
          ${Array.from({ length: 4 }).map(() => `<div class="kp-skel-card p-3.5 space-y-2"><div class="flex gap-3"><div class="kp-skel w-11 h-11 rounded-full shrink-0"></div><div class="flex-1 space-y-2"><div class="kp-skel h-3" style="width:55%"></div><div class="kp-skel h-2.5" style="width:80%"></div><div class="kp-skel h-2.5" style="width:40%"></div></div></div></div>`).join("")}
          <p class="text-center text-[12px] text-gray-500 font-medium pt-1">取引一覧を読み込み中...</p>
        </div>`;
        return;
      }
      if (myTrades.length === 0) {
        el.innerHTML = '<div class="kp-empty" style="display:block"><div class="text-2xl mb-2" aria-hidden="true">💬</div><p class="text-sm font-bold text-gray-700">まだ取引はありません</p><p class="text-[12px] text-gray-500 mt-1.5 leading-relaxed">出品や購入が始まるとここに表示されます</p></div>';
        return;
      }
      const kindLabel = (t) => {
        if (t.kind === "group") return "共同購入";
        if (t.isBundle) return "枠取引";
        if (t.isBuy) return "買取";
        if (t.isSell) return "購入";
        return "交換";
      };
      const nextHint = (t) => {
        if (t.status === "negotiating") return "チャットで条件を確認しましょう";
        if (t.status === "shipping") {
          const iAmOwner = currentUser && currentUser.uid === t.ownerId;
          if (usesAzukariPayment(t)) return iAmOwner ? "発送・受取の進捗を確認" : "支払い・受取の進捗を確認";
          return "発送・住所共有を進めましょう";
        }
        if (t.status === "completed") return "取引完了";
        if (t.status === "cancelled") return "キャンセル済み";
        return "";
      };
      const accent = { negotiating: "border-l-amber-400", shipping: "border-l-sky-500", completed: "border-l-emerald-500", cancelled: "border-l-gray-300" };
      const card = (t) => {
        const otherName = currentUser.uid === t.ownerId ? t.applicantName : t.ownerName;
        const initial = String(otherName || "相").slice(0, 1);
        let note = "";
        if (t.status === "cancelled") {
          const side = cancelSide(t);
          const who = side === "admin" ? "運営によりキャンセル" : (side === "other" ? "相手側のキャンセル" : (side === "me" ? "あなたのキャンセル" : ""));
          const reason = t.cancelRequest && t.cancelRequest.reasonText ? "理由: " + t.cancelRequest.reasonText : "";
          const text = [who, reason].filter(Boolean).join(" ／ ");
          if (text) note = `<div class="mt-1.5 text-[11px] text-gray-500 leading-snug">${escapeHtml(text)}</div>`;
        }
        const unread = !!(currentUser && t.lastSenderId !== currentUser.uid && isUnread(t));
        const when = formatRelativeTimeJa(t.lastMessageAt || t.updatedAt || t.createdAt);
        const price = Number(t.postPrice || 0);
        const priceTxt = price > 0 ? "¥" + price.toLocaleString() : "";
        const hint = nextHint(t);
        return `<button data-trade-id="${escapeHtml(t.id)}" class="w-full text-left rounded-2xl bg-white border border-gray-100 shadow-sm border-l-4 ${accent[t.status] || "border-l-gray-200"} ${unread ? "ring-2 ring-pink-200" : ""} px-3.5 py-3.5 active:scale-[0.99] transition">
            <div class="flex gap-3">
              <div class="w-11 h-11 rounded-full ${unread ? "bg-pink-100 text-pink-700" : "bg-purple-100 text-purple-800"} flex items-center justify-center text-base font-black shrink-0">${escapeHtml(initial)}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[15px] font-bold text-gray-900 truncate">${escapeHtml(otherName || "相手")}さん</span>
                  <span class="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_CLASS[t.status] || "bg-gray-100 text-gray-600"}">${STATUS_LABEL[t.status] || ""}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">${kindLabel(t)}</span>
                  ${priceTxt ? `<span class="text-[12px] font-bold text-gray-800">${priceTxt}</span>` : ""}
                </div>
                <div class="mt-1 text-[13px] text-gray-700 leading-snug line-clamp-2 font-medium">${escapeHtml(t.postGive || "取引")}</div>
                ${hint ? `<div class="mt-1.5 text-[11px] font-medium ${t.status === "completed" || t.status === "cancelled" ? "text-gray-400" : "text-purple-700"}">${escapeHtml(hint)}</div>` : ""}
                <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                  <span class="flex items-center gap-2">
                    ${unread ? '<span class="inline-flex items-center gap-1 text-pink-600 font-bold"><span class="w-1.5 h-1.5 rounded-full bg-pink-500"></span>新しいメッセージ</span>' : "<span>ルームを開く</span>"}
                    ${when ? `<span>· ${escapeHtml(when)}</span>` : ""}
                  </span>
                  <span class="text-gray-300 text-sm">›</span>
                </div>
                ${note}
              </div>
            </div>
          </button>`;
      };
      const active = myTrades.filter(t => t.status === "negotiating" || t.status === "shipping");
      const done = myTrades.filter(t => t.status === "completed");
      const cancelled = myTrades.filter(t => t.status === "cancelled");
      const byOther = cancelled.filter(t => { const x = cancelSide(t); return x === "other" || x === "admin"; });
      const byMe = cancelled.filter(t => cancelSide(t) === "me");
      const unknown = cancelled.filter(t => cancelSide(t) === "unknown");
      const unreadActive = active.filter(t => isUnread(t)).length;
      const section = (id, title, list, emptyText, tone) => {
        if (list.length === 0 && !emptyText) return "";
        const toneCls = tone || "bg-white text-gray-600 border-gray-200";
        return `<details id="trades-sec-${id}" class="rounded-2xl bg-white/70 border border-gray-100 overflow-hidden" ${tradeSecOpen[id] ? "open" : ""} ontoggle="tradeSecToggle('${id}', this.open)">
          <summary class="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden px-3.5 py-3 bg-white border-b border-gray-50">
            <span class="inline-flex items-center gap-2">
              <span class="text-[12px] font-black px-2.5 py-1 rounded-full border ${toneCls}">${title}</span>
              <span class="text-[13px] font-bold text-gray-800">${list.length}</span>
            </span>
            <span class="text-gray-400 text-xs font-bold">開閉 ▾</span>
          </summary>
          <div class="space-y-2.5 p-2.5">${list.length ? list.map(card).join("") : `<p class="text-[12px] text-gray-400 text-center py-5">${emptyText}</p>`}</div>
        </details>`;
      };
      el.innerHTML = [
        section("active", "取引中" + (unreadActive ? ` · 未読${unreadActive}` : ""), active, "取引中のものはありません", "bg-amber-50 text-amber-800 border-amber-200"),
        section("done", "完了", done, "", "bg-emerald-50 text-emerald-800 border-emerald-200"),
        section("cancel_other", "キャンセルされたもの", byOther, "", "bg-gray-50 text-gray-600 border-gray-200"),
        section("cancel_me", "キャンセルしたもの", byMe, "", "bg-gray-50 text-gray-600 border-gray-200"),
        section("cancel_unknown", "キャンセル（不明）", unknown, "", "bg-gray-50 text-gray-600 border-gray-200")
      ].join("");
    };

    function cleanupRoom() {
      if (unsubRoom) { unsubRoom(); unsubRoom = null; }
      if (unsubMsgs) { unsubMsgs(); unsubMsgs = null; }
      if (unsubTradeShipping) { unsubTradeShipping(); unsubTradeShipping = null; }
      roomTradeShipping = {};
      currentTrade = null; roomMessages = []; roomPhotos = []; roomPhotosFor = null; roomBoxKey = null; roomActionsKey = null; reviewState = { tradeId: null, done: null }; selectedRating = 0;
    }
    async function loadRoomPhotos(t) {
      const el = document.getElementById("room-photos"); if (t.kind === "serial" || !t.postPhotoCount) { el.innerHTML = ""; return; }
      try { const list = await getPhotos(t.postId); if (currentTrade?.id !== t.id) return; roomPhotos = list; if (list.length === 0) { el.innerHTML = ""; return; } el.innerHTML = `<div><div class="text-[11px] font-medium text-gray-700 mb-1">📷 出品時の写真</div><div class="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">${list.map((src, i) => `<img src="${src}" onclick="viewPhoto('room', ${i})" class="w-20 h-20 object-cover rounded-xl border border-white/50 cursor-pointer shadow-sm hover:opacity-80 transition">`).join("")}</div></div>`; } catch(e){ el.innerHTML = ""; }
    }
    function formatTradeShippingHtml(ship) {
      if (!ship || !ship.name || !ship.zip || !ship.address1) return "";
      return `<div class="mt-2 text-[11px] text-gray-800 leading-relaxed bg-white/80 rounded-lg p-2.5 border border-white/80">
        <div>お名前: ${escapeHtml(ship.name)}</div>
        <div>郵便番号: 〒${escapeHtml(ship.zip)}</div>
        <div>住所: ${escapeHtml(ship.address1)}${ship.address2 ? " " + escapeHtml(ship.address2) : ""}</div>
        <div>電話番号: ${escapeHtml(ship.phone || "なし")}</div>
      </div>`;
    }
    function renderRoomAddressBox() {
      const el = document.getElementById("room-address-box");
      if (!el) return;
      if (!currentTrade || currentTrade.status !== "shipping") { el.innerHTML = ""; return; }
      const uid = currentUser?.uid;
      const otherId = currentTrade.ownerId === uid ? currentTrade.applicantId : currentTrade.ownerId;
      const mine = (roomTradeShipping && roomTradeShipping[uid]) || {};
      const theirs = (roomTradeShipping && roomTradeShipping[otherId]) || {};
      const myShared = !!(mine.name && mine.zip && mine.address1);
      const theirShared = !!(theirs.name && theirs.zip && theirs.address1);
      el.innerHTML = `<div class="bg-white/60 rounded-xl p-3 border border-white space-y-2 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-medium text-gray-800">📦 配送先の共有</div>
          <button onclick="sendMyAddress()" class="bg-white/80 hover:bg-white text-illit-darkPurple font-medium text-xs px-4 py-2 rounded-full transition shadow-md border border-white">${myShared ? "住所を再送する" : "住所を送る"}</button>
        </div>
        <div class="text-[10px] text-gray-600">あなた: ${myShared ? "共有済み" : "未共有"} ／ 相手: ${theirShared ? "共有済み" : "未共有"}</div>
        ${theirShared ? `<div class="text-[11px] font-bold text-gray-700">相手の配送先</div>${formatTradeShippingHtml(theirs)}` : `<p class="text-[10px] text-gray-500">相手が住所を送ると、ここに表示されます（公開プロフィールには保存されません）。</p>`}
      </div>`;
    }
    const PAYPAY_LINK_RE = /^https:\/\/(pay\.)?paypay\.ne\.jp\/[^\s]+$/;
        async function renderRoomPayPayBox() {
      const el = document.getElementById("room-paypay-box");
      if (!currentTrade || currentTrade.status !== "shipping") { el.innerHTML = ""; return; }
      if (!isPayTrade(currentTrade) && (!currentTrade.kind || currentTrade.kind !== "bundle") && (!currentTrade.type || currentTrade.type !== "bundle")) { el.innerHTML = ""; return; }
      const amtTxt = "￥" + Number(currentTrade.postPrice || 0).toLocaleString();
      const az = usesAzukariPayment(currentTrade);
      const iAmOwner = currentUser.uid === currentTrade.ownerId;
      const iAmPayer = currentTrade.isBuy ? iAmOwner : !iAmOwner;

      if (!az) {
        // ===== 既存取引：PayPay =====
        const myPayPay = getMyProfile()?.paypay || "";
        const receiverId = currentTrade.isBuy ? currentTrade.applicantId : currentTrade.ownerId;
        const showLink = currentUser.uid === receiverId;
        el.innerHTML = `<div class="bg-pink-100/70 backdrop-blur rounded-xl p-4 border border-pink-200 space-y-3 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="text-xs font-medium text-pink-800">💳 PayPay送金</div>
            <span class="text-[11px] font-medium text-pink-700 bg-white/70 px-2 py-0.5 rounded-full shadow-sm">${amtTxt}</span>
          </div>
          <p class="text-[10px] text-pink-800/80">※この取引はPayPayでのやり取りです（切り替え前の取引）</p>
          <div class="flex items-center space-x-2">
            <input type="text" id="chat-paypay-input" value="${escapeHtml(myPayPay)}" placeholder="あなたのPayPay ID" class="liquid-glass-input flex-1 rounded-xl p-2 text-xs focus:ring-pink-400">
            <button onclick="sendMyPayPayId()" class="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-full transition shadow-md border border-pink-400">IDを送る</button>
          </div>
          ${showLink ? `<div class="border-t border-pink-300 pt-3 space-y-2"><div class="text-[11px] font-medium text-pink-800">⚡ ワンタップ送金リンク</div><div class="flex items-center space-x-2"><input type="text" id="chat-paypay-link" placeholder="https://pay.paypay.ne.jp/..." class="liquid-glass-input flex-1 rounded-xl p-2 text-xs focus:ring-pink-400"><button onclick="sendPayPayLink()" class="bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs px-3 py-2 rounded-full transition shadow-md border border-pink-400">リンク送信</button></div></div>` : ""}
        </div>`;
        return;
      }

      // ===== 新規取引：アズカリ =====
      const roleHint = iAmPayer
        ? "あなたが支払い側です。下のボタンからアズカリを開き、約束メモを作成／支払いしてください。"
        : "相手がアズカリで支払います。約束メモのリンクが届いたら確認し、商品到着後にロック解除してもらってください。";
      // 新規売却（isSell）の購入者側、および有料取引全般で匿名配送を案内
      const showAnon = !!currentTrade.isSell || !!currentTrade.isBuy || currentTrade.kind === "group";
      const anonNote = showAnon ? `<div class="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 leading-relaxed">
          <p class="font-bold mb-0.5">📦 匿名配送が利用できます</p>
          <p>アズカリはヤマト運輸と連携した<strong>匿名配送</strong>に対応しています。住所・氏名を相手に知らせず発送・受取が可能です（ネコポス180円〜）。約束メモ作成時に「匿名配送」を選択してください。</p>
          <a href="https://azkari.jp/guide/yamato" target="_blank" rel="noopener" class="inline-block mt-1.5 text-emerald-700 underline font-medium">匿名配送の使い方を見る →</a>
        </div>` : "";
      el.innerHTML = `<div class="bg-gradient-to-br from-blue-50/90 to-cyan-50/90 backdrop-blur rounded-xl p-4 border border-blue-200 space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-blue-900 flex items-center gap-1.5">🔒 アズカリ決済</div>
          <span class="text-[11px] font-bold text-blue-800 bg-white/80 px-2.5 py-0.5 rounded-full shadow-sm">${amtTxt}</span>
        </div>
        <p class="text-[11px] text-gray-700 leading-relaxed">${roleHint}</p>
        ${anonNote}
        <div class="space-y-2">
          <button onclick="openAzukariApp()" class="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white font-bold text-sm py-3 rounded-full transition shadow-md border border-white/40">アプリでアズカリを開く</button>
          <button onclick="window.open('https://azkari.jp/','_blank')" class="w-full bg-white/90 border border-blue-200 text-blue-800 font-medium text-xs py-2.5 rounded-full hover:bg-white transition">公式サイト（Web版）を開く</button>
        </div>
        <div class="bg-white/70 rounded-xl p-2.5 text-[10px] text-gray-600 leading-relaxed border border-white space-y-1">
          <div><b>流れ：</b>①売る人が約束メモ作成 → ②買う人がアズカリに支払い → ③商品受取後ロック解除 → ④売る人が受取</div>
          <div class="text-amber-800 font-medium pt-1 border-t border-blue-100">※出品者が未成年の場合は「売るリンク」を作れないため、購入者（大人側など）がアズカリで買うリンクを作成してください。</div>
        </div>
        <button onclick="sendQuickMsg('アズカリの約束メモを作成しました。リンクを送りますので、アプリまたはWebから支払いをお願いします！')" class="w-full bg-white/80 border border-white text-blue-700 font-medium text-[11px] py-2 rounded-full hover:bg-white transition">💬 「約束メモ作成した」を送る</button>
      </div>`;
    }

    
    
    window.sendPayPayLink = async function() {
      if (!currentTrade || !currentUser) return;
      const url = document.getElementById("chat-paypay-link")?.value.trim();
      if (!PAYPAY_LINK_RE.test(url)) return /* alert hidden */ console.log("PayPayのリンクを貼り付けてください。");
      try {
        await postMessage({
          senderId: currentUser.uid, senderName: getMyDisplayName(),
          text: `【PayPay請求リンク】\n${url}\n金額: ￥${Number(currentTrade.postPrice || 0).toLocaleString()}`,
          createdAt: serverTimestamp()
        });
        /* alert hidden */ console.log("送信しました！");
      } catch (e) {}
    };
    window.sendMyPayPayId = async function() {
      if (!currentTrade || !currentUser) return;
      const idVal = document.getElementById("chat-paypay-input")?.value.trim();
      if (!idVal) return /* alert hidden */ console.log("PayPay IDを入力してください。");
      try {
        await postMessage({
          senderId: currentUser.uid, senderName: getMyDisplayName(),
          text: `【PayPay受取用 ID】\n${idVal}\n（タップしてコピーしてください）`,
          createdAt: serverTimestamp()
        });
        /* alert hidden */ console.log("送信しました！");
      } catch (e) {}
    };
window.openAzukariApp = function() {
      const ua = navigator.userAgent || "";
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isAndroid = /Android/i.test(ua);
      // 1) Web（約束メモ共有URLを開ける） 2) ストアへフォールバック
      // アズカリは https://azkari.jp/ のリンクからアプリ誘導されるため、まず公式を開く
      const web = "https://azkari.jp/";
      const iosStore = "https://apps.apple.com/jp/app/id1408478462";
      const androidStore = "https://play.google.com/store/apps/details?id=jp.azkari";
      if (isIOS) {
        // アプリが入っていればサイト経由で起動、なければストア
        window.open(web, "_blank");
        setTimeout(() => { try { window.location.href = iosStore; } catch(e){} }, 1500);
      } else if (isAndroid) {
        // Android Intent でアプリ優先
        const intent = "intent://azkari.jp/#Intent;scheme=https;package=jp.azkari;S.browser_fallback_url=" + encodeURIComponent(androidStore) + ";end";
        try { window.location.href = intent; } catch(e) { window.open(web, "_blank"); }
      } else {
        window.open(web, "_blank");
      }
    };
    window.openAzukariGuide = function() {
      openProfileModal("paypay"); // reuse section id which now shows Azukari guide
    };
    

    window.copyAmount = function(amt) { navigator.clipboard.writeText(String(amt)).then(()=>/* alert hidden */ console.log(`コピー完了`)).catch(()=>{}); };

    window.openTrade = function(id) {
      closeTradesModal(); closeDetailModal(); cleanupRoom();
      document.getElementById("room-messages").innerHTML = ""; document.getElementById("room-modal").classList.remove("hidden");
      unsubRoom = onSnapshot(doc(db, "trades", id), (snap) => {
        if (!snap.exists()) { closeRoom(); return; }
        const prevStatus = currentTrade && currentTrade.status;
        currentTrade = { id: snap.id, ...snap.data() };
        if (currentTrade.status === "completed" && prevStatus && prevStatus !== "completed") {
          clearTradeShippingDocs(currentTrade.id);
        }
        renderRoom();
    if (typeof renderRoomTaskBanner === "function") renderRoomTaskBanner();
        const boxKey = currentTrade.id + ":" + currentTrade.status;
        if (boxKey !== roomBoxKey) { roomBoxKey = boxKey; renderRoomAddressBox(); renderRoomPayPayBox(); }
        markTradeRead(currentTrade);
        if (roomPhotosFor !== currentTrade.id) { roomPhotosFor = currentTrade.id; loadRoomPhotos(currentTrade); }
        advanceIfNeeded(); checkReview();
      });
      unsubMsgs = onSnapshot(query(collection(db, "trades", id, "messages"), orderBy("createdAt", "asc")), (snap) => { roomMessages = snap.docs.map(d => d.data()); renderMessages(); });
      unsubTradeShipping = onSnapshot(collection(db, "trades", id, "shipping"), (snap) => {
        roomTradeShipping = {};
        snap.docs.forEach((d) => { roomTradeShipping[d.id] = d.data() || {}; });
        renderRoomAddressBox();
      }, (err) => console.warn("trade shipping snapshot:", err?.code || err));
    };
    window.closeRoom = function() { document.getElementById("room-modal").classList.add("hidden"); closeImageViewer(); cleanupRoom(); };

    function flag(t, field, uid) { return !!(t[field] && t[field][uid]); }
    async function advanceIfNeeded() {
      const t = currentTrade; if (!t) return;
      const both = f => flag(t, f, t.ownerId) && flag(t, f, t.applicantId); let next = null;
      if (t.status === "negotiating" && both("agreed")) {
        next = "shipping";
        if (t.postId && t.kind !== "group") try { await updateDoc(doc(db, "posts", t.postId), { status: "traded" }); const lp = allPosts.find(x => x.id === t.postId); if (lp) { lp.status = "traded"; renderPosts(); } } catch(e){}
      } else if (t.status === "shipping" && both("received")) { next = "completed"; }
      if (next) {
        updateDoc(doc(db, "trades", t.id), { status: next, updatedAt: serverTimestamp() })
          .then(() => { if (next === "completed") clearTradeShippingDocs(t.id); })
          .catch(()=>{});
      }
    }
    function reviewFormHtml(buttonClass) {
      return `<div class="bg-white rounded-2xl p-4 border border-gray-200 space-y-3 shadow-md">
        <div class="text-xs font-medium text-gray-700 text-center">相手を評価してください</div>
        <div class="flex justify-center space-x-2">
          <button type="button" data-star="1" onclick="setRating(1)" class="text-3xl text-gray-300">★</button>
          <button type="button" data-star="2" onclick="setRating(2)" class="text-3xl text-gray-300">★</button>
          <button type="button" data-star="3" onclick="setRating(3)" class="text-3xl text-gray-300">★</button>
          <button type="button" data-star="4" onclick="setRating(4)" class="text-3xl text-gray-300">★</button>
          <button type="button" data-star="5" onclick="setRating(5)" class="text-3xl text-gray-300">★</button>
        </div>
        <textarea id="review-comment" rows="2" maxlength="200" placeholder="任意：取引の感想コメント（相手のプロフィールに表示されます）" class="w-full liquid-glass-input rounded-xl p-2.5 text-base text-gray-800" style="font-size:16px"></textarea>
        <button type="button" id="review-submit-btn" onclick="submitReview()" class="${buttonClass}">評価を送信して取引を終える</button>
      </div>`;
    }
    function shouldShowReviewForm(trade, userId) {
      if (!trade || !userId) {
        return false;
      }
      if (trade.status === "cancelled") {
        return false;
      }
      if (reviewState.done === true && reviewState.tradeId === trade.id) {
        return false;
      }
      if (trade.status === "completed" || trade.status === "done") {
        return true;
      }
      if (flag(trade, "received", userId) || (window.__localReceivedTrades && window.__localReceivedTrades[trade.id + "_" + userId])) {
        return true;
      }
      return false;
    }
    function paintReviewSlot(trade, userId, buttonClass) {
      const host = document.getElementById("room-review-slot");
      if (!host) {
        return;
      }
      if (!shouldShowReviewForm(trade, userId)) {
        host.innerHTML = "";
        host.removeAttribute("data-review-key");
        host.classList.add("hidden");
        return;
      }
      host.classList.remove("hidden");
      const reviewKey = trade.id + ":open";
      if (host.getAttribute("data-review-key") !== reviewKey) {
        host.innerHTML = reviewFormHtml(buttonClass);
        host.setAttribute("data-review-key", reviewKey);
        if (selectedRating > 0 && typeof window.setRating === "function") {
          window.setRating(selectedRating);
        }
      }
      if (window.__scrollReviewSlot) {
        window.__scrollReviewSlot = false;
        setTimeout(function() {
          host.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }
    }
    function checkReview() {
      const trade = currentTrade;
      if (!trade || !currentUser) {
        return;
      }
      const userId = currentUser.uid;
      const iHaveReceived = flag(trade, "received", userId);
      const finished = trade.status === "completed" || trade.status === "done";
      if (!finished && !iHaveReceived) {
        return;
      }
      if (reviewState.tradeId === trade.id && reviewState.done === true) {
        return;
      }
      const reviewId = trade.id + "_" + userId;
      if (checkReview.inflightId === reviewId) {
        return;
      }
      checkReview.inflightId = reviewId;
      if (reviewState.tradeId !== trade.id || reviewState.done !== false) {
        reviewState = { tradeId: trade.id, done: false };
        const host = document.getElementById("room-review-slot");
        if (host) {
          host.removeAttribute("data-review-key");
        }
        roomActionsKey = "";
        renderRoom();
      }
      getDoc(doc(db, "reviews", reviewId)).then(function(snapshot) {
        if (checkReview.inflightId === reviewId) {
          checkReview.inflightId = "";
        }
        if (!currentTrade || currentTrade.id !== trade.id) {
          return;
        }
        const alreadyReviewed = snapshot.exists();
        if (reviewState.tradeId === trade.id && reviewState.done === alreadyReviewed) {
          return;
        }
        reviewState.tradeId = trade.id;
        reviewState.done = alreadyReviewed;
        const host = document.getElementById("room-review-slot");
        if (host) {
          host.removeAttribute("data-review-key");
        }
        roomActionsKey = "";
        renderRoom();
      }).catch(function(error) {
        if (checkReview.inflightId === reviewId) {
          checkReview.inflightId = "";
        }
        console.error(error);
        if (!currentTrade || currentTrade.id !== trade.id) {
          return;
        }
        reviewState.tradeId = trade.id;
        reviewState.done = false;
        const host = document.getElementById("room-review-slot");
        if (host) {
          host.removeAttribute("data-review-key");
        }
        roomActionsKey = "";
        renderRoom();
        showToast("評価の確認に失敗しました。この画面から評価を送れます", "info");
      });
    }

    window.openCancelModal = function() {
      if (!currentTrade || currentTrade.status !== "shipping") return;
      document.getElementById("cancel-reason").value = "";
      document.getElementById("cancel-other").value = "";
      document.getElementById("cancel-other-box").classList.add("hidden");
      document.getElementById("cancel-modal").classList.remove("hidden");
    };
    window.closeCancelModal = function() { document.getElementById("cancel-modal").classList.add("hidden"); };
    document.getElementById("cancel-reason")?.addEventListener("change", function() {
      document.getElementById("cancel-other-box").classList.toggle("hidden", this.value !== "other");
    });

    window.submitCancelRequest = async function() {
      if (!currentTrade || !currentUser) return;
      const reason = document.getElementById("cancel-reason").value;
      if (!reason) return /* alert hidden */ console.log("理由を選択してください。");
      let reasonText = CANCEL_REASON_LABEL[reason] || reason;
      if (reason === "other") {
        const other = document.getElementById("cancel-other").value.trim();
        if (!other) return /* alert hidden */ console.log("理由を入力してください。");
        reasonText = other;
      }
      if (!(await appConfirm("キャンセルを申請しますか？\n申請した側にペナルティが付きます。", "申請する", true))) return;
      try {
        await updateDoc(doc(db, "trades", currentTrade.id), {
          cancelRequest: { by: currentUser.uid, byName: getMyDisplayName(), reason: reason, reasonText: reasonText, at: Date.now() },
          updatedAt: serverTimestamp()
        });
        applyCancelPenalty(currentUser.uid, currentTrade.id).catch(() => {});
        closeCancelModal();
        showToast("キャンセルを申請しました。相手の同意をお待ちください。", "info");
      } catch (e) { /* alert hidden */ console.log("申請に失敗しました。"); }
    };

    window.agreeCancel = async function() {
      if (!currentTrade || !currentTrade.cancelRequest) return;
      if (!(await appConfirm("キャンセル申請に同意しますか？\n取引がキャンセルされます。", "同意する", true))) return;
      const postId = currentTrade.postId;
      const kind = currentTrade.kind;
      const applicantId = currentTrade.applicantId;

      try {
        await updateDoc(doc(db, "trades", currentTrade.id), { status: "cancelled", cancelAgreed: true, updatedAt: serverTimestamp() });
        
        // 投稿を active（出品中）に戻す
        await restorePostToActive(postId, kind, applicantId);
        await revertBundleTrade(currentTrade);

        showToast("取引がキャンセルされました。", "info");
      } catch (e) { /* alert hidden */ console.log("処理に失敗しました。"); }
    };

    // 申請者が申請時に「自分の」記録へ書き込む（他人のドキュメントは書けないため）
    async function applyCancelPenalty(uid, tradeId) {
      if (!currentUser || uid !== currentUser.uid) return;
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : {};
        const history = Array.isArray(data.cancelHistory) ? [...data.cancelHistory] : [];
        if (history.some(h => h.tradeId === tradeId)) return; // 二重カウント防止
        const now = Date.now();
        history.push({ tradeId, at: now });
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
        const recent = history.filter(h => h.at >= monthAgo);
        const count = recent.length;
        const update = { cancelHistory: recent };
        let noticeText = "";
        if (count > 8) noticeText = `合意後キャンセルが1ヶ月で${count}回に達しました。一時停止の対象となり、運営に通知されました。`;
        else if (count >= 3) noticeText = `合意後キャンセルが${count}回になりました。8回を超えると一時停止されます。`;
        if (noticeText) {
          const list = Array.isArray(data.notifications) ? [...data.notifications] : [];
          list.unshift({ id: "p_" + Date.now(), text: noticeText, type: "admin", read: false, createdAt: Date.now() });
          capNotifications(list);
          update.notifications = list;
        }
        await updateDoc(userRef, update);
        if (count > 8) {
          // suspensions は管理者のみ書き込み可 → 自動停止を試み、拒否されたら運営へ問い合わせとして通知
          const reason = `合意後キャンセルが1ヶ月で${count}回を超えたため一時停止`;
          try {
            await setDoc(doc(db, "suspensions", uid), { reason, name: data.profile?.nickname || "", createdAt: serverTimestamp() }, { merge: true });
          } catch (e) {
            try {
              await addDoc(collection(db, "inquiries"), {
                userId: uid, userName: getMyDisplayName(), subject: "report",
                body: `[自動通知] ${reason}（UID: ${uid}）。停止の判断をお願いします。`,
                status: "open", createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId()
              });
            } catch (e2) { console.warn("penalty notify error:", e2?.code || e2); }
          }
        }
      } catch (e) { console.error("penalty error", e); }
    }

    function renderRoom() {
      const t = currentTrade; if (!t) return;
      const uid = currentUser.uid, iAmOwner = uid === t.ownerId, otherId = iAmOwner ? t.applicantId : t.ownerId, otherName = iAmOwner ? t.applicantName : t.ownerName, payFlow = isPayTrade(t);
      const iAmPayer = t.isBuy ? iAmOwner : !iAmOwner; // 買取は出品者が支払う側
      const roomTitleEl = document.getElementById("room-title");
      if (roomTitleEl) roomTitleEl.textContent = (otherName || "相手") + " さんとの取引（プロフィール）";
      const order = ["negotiating", "shipping", "completed"], labels = payFlow ? ["① 開始", usesAzukariPayment(t) ? "② アズカリ決済・発送" : "② 送金・発送", "③ 完了"] : ["① 開始", "② 発送・受取", "③ 完了"];
      const on = payFlow ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md border border-white/50" : "bg-gradient-to-r from-illit-purple to-illit-accent text-white shadow-md border border-white/50";
      let idx = order.indexOf(t.status);
      if (t.status === "negotiating") {
        const bundleWait = Array.isArray(t.bundleIndexes) && t.bundleIndexes.length;
        const standardExchange = isStandardExchangeTrade(t);
        idx = bundleWait || standardExchange ? 0 : 1;
        if (!bundleWait && !standardExchange && !t._skipAgree) {
          t._skipAgree = true;
          updateDoc(doc(db, "trades", t.id), {
            status: "shipping",
            agreed: Object.assign({}, t.agreed || {}, { [t.ownerId]: true, [t.applicantId]: true }),
            updatedAt: serverTimestamp()
          }).catch(function () {});
        }
      }
      document.getElementById("room-steps").innerHTML = t.status === "cancelled" ? '<div class="text-xs font-medium text-gray-600 bg-white/60 border border-white rounded-xl p-2 text-center shadow-sm">この取引はキャンセルされました</div>' : '<div class="flex space-x-2">' + labels.map((l, i) => `<div class="flex-1 text-center text-[10px] font-medium py-2 rounded-xl border ${i <= idx ? on : "bg-white/40 border-white text-gray-500"}">${l}</div>`).join("") + "</div>";
      document.getElementById("room-info").innerHTML = `<div class="bg-white/60 backdrop-blur rounded-xl p-3 text-xs space-y-1 border shadow-sm border-white"><div class="font-medium text-gray-900">${escapeHtml(t.postGive)}</div></div>`;
      const mark = b => b ? "✅" : "⏳";
      const btn = "w-full font-medium py-3 rounded-full text-sm transition shadow-md border border-white/40 ", primary = btn + "bg-gradient-to-r from-illit-purple to-illit-accent text-white hover:opacity-90", pinkBtn = btn + "bg-gradient-to-r from-pink-400 to-pink-500 text-white hover:opacity-90";
      let html = "";
      if (t.cancelRequest && t.status === "shipping") {
        const isInitiator = t.cancelRequest.by === uid;
        html += `<div class="bg-red-50/80 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-2">
          <p class="font-medium">⚠️ キャンセル申請中</p>
          <p>申請者: ${escapeHtml(t.cancelRequest.byName || "")}</p>
          <p>理由: ${escapeHtml(t.cancelRequest.reasonText || CANCEL_REASON_LABEL[t.cancelRequest.reason] || "")}</p>
          ${isInitiator ? '<p class="text-[11px]">相手の同意をお待ちください。</p>' : `<button onclick="agreeCancel()" class="${btn} bg-red-500 text-white hover:bg-red-600">キャンセルに同意する</button>`}
        </div>`;
      }
      if (t.status === "negotiating" && isStandardExchangeTrade(t)) {
        html += iAmOwner
          ? `<div class="space-y-2"><p class="text-xs text-gray-700">申込者の差し出しトレカ画像を確認してください。</p><div class="flex gap-2"><button type="button" onclick="agreeStandardExchange()" class="${primary} flex-1">この条件で合意する</button><button type="button" onclick="declineStandardExchange()" class="${btn} bg-white text-gray-700 border border-gray-200 flex-1">合意しない</button></div></div>`
          : `<div class="space-y-2"><p class="text-xs text-gray-700">出品者の合意を待っています</p><button type="button" onclick="withdrawStandardExchange()" class="${btn} bg-white text-gray-700 border border-gray-200">申し込みを取り下げる</button></div>`;
      } else if (t.status === "negotiating" && Array.isArray(t.bundleIndexes) && t.bundleIndexes.length) {
        const nums = t.bundleIndexes.map(n => Number(n) + 1).join("、");
        html += `<div class="bg-white border border-rose-200 rounded-2xl p-3 text-[13px] text-gray-800 space-y-2"><div>選ばれた枠: <b>${nums}</b></div><div class="text-[12px] text-gray-500">赤くバツの付いた写真を確認して、合意するか決めてください。</div>${iAmOwner ? `<button type="button" onclick="agreeBundleTrade()" class="${primary}">この枠で合意する</button><button type="button" onclick="declineBundleTrade()" class="${btn} bg-white text-gray-700 border border-gray-200">合意しない</button>` : `<p class="text-[12px] text-gray-500">出品者の合意を待っています</p><button type="button" onclick="withdrawBundleTrade()" class="${btn} bg-white text-gray-700 border border-gray-200">申し込みを取り下げる</button>`}</div>`;
      } else if (t.status === "shipping" || t.status === "negotiating") {
        const myS = flag(t, "shipped", uid), otherS = flag(t, "shipped", otherId);
        const myR = flag(t, "received", uid), otherR = flag(t, "received", otherId);
        html += `<div class="text-xs text-gray-700 font-medium bg-white/50 p-3 rounded-lg border border-white shadow-inner space-y-1"><div>決済/発送: あなた ${mark(myS)} ／ 相手 ${mark(otherS)}</div><div>受取確認: あなた ${mark(myR)} ／ 相手 ${mark(otherR)}</div></div>${!myS ? `<button onclick="tradeAction('shipped')" class="${payFlow ? pinkBtn : primary} mt-2">${payFlow ? (usesAzukariPayment(t) ? (iAmPayer ? 'アズカリ支払い完了' : '発送した・支払い確認') : (iAmPayer ? '送金した' : '送った・確認した')) : '発送した'}</button>` : ''}${otherS && !myR ? `<button onclick="tradeAction('received')" class="${btn} bg-gradient-to-r from-green-400 to-green-500 text-white hover:opacity-90 mt-2">完了確認</button>` : ''}`;
        if (!t.cancelRequest) {
          html += `<div class="mt-3 pt-3 border-t border-red-200/50">
            <p class="text-[10px] text-red-600 mb-2 font-medium bg-white/50 p-2 rounded-lg border border-red-200 shadow-inner">※合意後のキャンセルは申請した側にペナルティが付きます（月3回で警告・8回超で一時停止）</p>
            <button onclick="openCancelModal()" class="${btn} bg-white/80 text-red-500 border border-red-300 hover:bg-white">キャンセルを申請する</button>
          </div>`;
        }
      } else if (t.status === "completed") {
        html += `<p class="text-xs text-green-700 font-medium text-center bg-white/60 p-3 rounded-xl border border-white shadow-sm">🎉 取引が完了しました！下の評価を送ると取引を終えられます。</p>`;
      }
      const actionsKey = t.id + "|" + html;
      const actionsChanged = roomActionsKey !== actionsKey;
      if (actionsChanged) { roomActionsKey = actionsKey; document.getElementById("room-actions").innerHTML = html; }
      paintReviewSlot(t, uid, primary);
      if (selectedRating > 0) setRating(selectedRating);
      const disabled = t.status === "cancelled"; document.getElementById("room-input").disabled = disabled; document.getElementById("room-send").disabled = disabled; document.getElementById("room-photo").disabled = disabled;
      if (actionsChanged) setTimeout(() => { const topBox = document.getElementById("room-top-box"), actionsBox = document.getElementById("room-actions"); if (topBox && actionsBox && t.status !== "completed" && t.status !== "cancelled") topBox.scrollTo({ top: actionsBox.offsetTop, behavior: "smooth" }); }, 300);
    }

    window.renderMessages = function() {
      const el = document.getElementById("room-messages"); if (!currentUser) return;
      if (roomMessages.length === 0) { el.innerHTML = '<p class="text-xs text-gray-600 text-center py-6 font-medium bg-white/30 rounded-xl p-4 shadow-inner">メッセージを送信してみましょう 👋</p>'; return; }
      el.innerHTML = roomMessages.map((m) => {
        const mine = m.senderId === currentUser.uid;
        const bubble = mine ? "bg-gradient-to-br from-illit-purple/90 to-illit-accent/90 backdrop-blur text-white border border-white/40 shadow-md" : "bg-white/80 backdrop-blur border border-white text-gray-800 shadow-sm";
        const imgHtml = isJpegData(m.image) ? `<img src="${m.image}" onclick="viewImage(${roomMessages.indexOf(m)})" class="rounded-2xl max-h-48 w-auto cursor-pointer shadow-md border border-white/50 ${m.text ? 'mb-2' : ''}">` : "";
        let textContent = escapeHtml(m.text);
        if (m.text && m.text.includes("【PayPay受取用 ID】")) {
          const lines = m.text.split("\n"), paypayId = lines[1] ? lines[1].trim() : "";
          if (paypayId) textContent = `【PayPay受取用 ID】<br><b class="text-pink-600">${escapeHtml(paypayId)}</b><br><button data-copy-paypay="${escapeHtml(paypayId)}" class="mt-2 bg-white/80 text-pink-600 border border-white font-medium text-[10px] px-3 py-1.5 rounded-full shadow-sm hover:bg-white">📋 コピー</button>`;
        } else if (m.text && m.text.startsWith("【PayPay請求リンク】")) {
          const lines = m.text.split("\n"), url = (lines[1] || "").trim(), amountLine = lines[2] || "";
          if (PAYPAY_LINK_RE.test(url)) textContent = `【PayPay請求リンク】<br><b class="text-pink-600">${escapeHtml(amountLine)}</b><br><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-medium text-xs px-4 py-2 rounded-full no-underline shadow-md border border-white/50">⚡ 支払う</a>`;
        }
        const textHtml = m.text ? `<div class="${bubble} px-4 py-2.5 rounded-[1.5rem] ${mine ? 'rounded-br-md' : 'rounded-bl-md'} text-[13px] whitespace-pre-wrap break-words font-medium leading-relaxed">${textContent}</div>` : "";
        return `<div class="flex ${mine ? 'justify-end' : 'justify-start'} mb-1"><div class="max-w-[82%] flex flex-col ${mine ? 'items-end' : 'items-start'}">${!mine ? `<div class="text-[10px] font-medium text-gray-600 mb-1 ml-1">${escapeHtml(m.senderName)}</div>` : ''}${imgHtml}${textHtml}<div class="text-[9px] text-gray-500 mt-1 font-medium">${fmtTime(m.createdAt)}</div></div></div>`;
      }).join("");
      el.querySelectorAll("[data-copy-paypay]").forEach(b => b.addEventListener("click", () => copyPayPayId(b.dataset.copyPaypay)));
      el.scrollTop = el.scrollHeight;
    };

    window.sendMessage = async function() {
      if (sendingChatMessage) return;
      const input = document.getElementById("room-input");
      const sendBtn = document.getElementById("room-send");
      const text = input && input.value.trim();
      if (!text || !currentTrade || currentTrade.status === "cancelled") return;
      sendingChatMessage = true;
      setBusyButton(sendBtn, true, "送信中…");
      if (input) input.disabled = true;
      input.value = "";
      try {
        await postMessage({ senderId: currentUser.uid, senderName: getMyDisplayName(), text: text.slice(0, 1000), createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() });
      } catch (e) {
        input.value = text;
      } finally {
        sendingChatMessage = false;
        if (input) input.disabled = currentTrade && currentTrade.status === "cancelled";
        setBusyButton(sendBtn, false);
        if (sendBtn && currentTrade && currentTrade.status === "cancelled") sendBtn.disabled = true;
      }
    };
    window.sendQuickMsg = async function(text) { if (!currentTrade || currentTrade.status === "cancelled") return; try { await postMessage({ senderId: currentUser.uid, senderName: getMyDisplayName(), text: text, createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() }); } catch(e){} };
    window.sendImage = async function(inputEl) {
      const file = inputEl.files && inputEl.files[0]; inputEl.value = ""; if (!file || !currentTrade || currentTrade.status === "cancelled" || sendingImage) return;
      sendingImage = true; try { const dataUrl = await compressImage(file, CHAT_PHOTO); await postMessage({ senderId: currentUser.uid, senderName: getMyDisplayName(), text: "", image: dataUrl, createdAt: serverTimestamp(), deviceId: getOrCreateDeviceId() }); } catch(e) { /* alert hidden */ console.log("送信失敗"); } finally { sendingImage = false; }
    };
    window.viewImage = function(i) { const m = roomMessages[i]; if (!m || !isJpegData(m.image)) return; document.getElementById("image-viewer-img").src = m.image; document.getElementById("image-viewer").classList.remove("hidden"); };
    window.closeImageViewer = function() { document.getElementById("image-viewer").classList.add("hidden"); };

    window.tradeAction = async function(field) {
      if (tradeActing) return;
      if (!currentTrade || !currentUser) {
        showToast("取引情報を読み込めませんでした", "error");
        return;
      }
      const tradeId = currentTrade.id;
      const userId = currentUser.uid;
      const updateData = {};
      updateData[field + "." + userId] = true;
      updateData.updatedAt = serverTimestamp();
      tradeActing = true;
      const actionBtns = Array.from(document.querySelectorAll("#room-actions button")).filter(b => (b.getAttribute("onclick") || "").includes("tradeAction"));
      actionBtns.forEach(b => setBusyButton(b, true, field === "received" ? "確認中…" : "処理中…"));
      try {
        await updateDoc(doc(db, "trades", tradeId), updateData);
        if (!currentTrade[field] || typeof currentTrade[field] !== "object") {
          currentTrade[field] = {};
        }
        currentTrade[field][userId] = true;
        if (field === "received") {
          window.__localReceivedTrades = window.__localReceivedTrades || {};
          window.__localReceivedTrades[tradeId + "_" + userId] = true;
          if (!currentTrade[field] || typeof currentTrade[field] !== "object") { currentTrade[field] = {}; }
          currentTrade[field][userId] = true;
          const ownerReceived = flag(currentTrade, "received", currentTrade.ownerId);
          const applicantReceived = flag(currentTrade, "received", currentTrade.applicantId);
          if (ownerReceived && applicantReceived && currentTrade.status !== "completed") {
            try {
              await updateDoc(doc(db, "trades", tradeId), { status: "completed", updatedAt: serverTimestamp() });
              currentTrade.status = "completed";
              await clearTradeShippingDocs(tradeId);
            } catch (error) {
              console.error(error);
              showToast("取引完了の保存に失敗しました", "error");
            }
          }
          if (!(reviewState.tradeId === tradeId && reviewState.done === true)) {
            reviewState = { tradeId: tradeId, done: false };
          }
          const reviewHost = document.getElementById("room-review-slot");
          if (reviewHost) {
            reviewHost.removeAttribute("data-review-key");
          }
          window.__scrollReviewSlot = true;
          roomActionsKey = "";
          renderRoom();
          checkReview();
          if (currentTrade.status === "completed") {
            showToast("取引を完了しました。下に出た星を選んで評価してください", "success");
          } else {
            showToast("完了確認を送りました。下の評価を送信できます", "success");
          }
          return;
        }
        roomActionsKey = "";
        renderRoom();
      } catch (error) {
        console.error(error);
        showToast("操作を保存できませんでした", "error");
        actionBtns.forEach(b => setBusyButton(b, false));
      } finally {
        tradeActing = false;
      }
    };
    window.checkCancelAccountLock = function() {
      if (!currentUser || !userData) return false;
      const lockedUntil = Number(userData.cancelLockedUntil || 0);
      if (lockedUntil > Date.now()) {
        const d = new Date(lockedUntil);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        /* alert hidden */ console.log(`直近で2回取引をキャンセルしたため、24時間のアカウントロック（利用制限）中です。\n\n解除予定： ${mm}/${dd} ${hh}:${mi}\n※ロック期間中は新規出品・購入確定・取引申し込みができません。`);
        return true;
      }
      return false;
    };
    async function recordUserCancelAndMaybeLock() {
      if (!currentUser) return false;
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const prevList = Array.isArray(userData && userData.cancelTimestamps) ? userData.cancelTimestamps : [];
      const recent = prevList.map(Number).filter(ts => ts > 0 && (now - ts) < sevenDaysMs);
      recent.push(now);
      const patch = { cancelTimestamps: recent };
      let locked = false;
      if (recent.length >= 2) {
        patch.cancelLockedUntil = now + 24 * 60 * 60 * 1000;
        locked = true;
      }
      userData = Object.assign({}, userData || {}, patch);
      try { await setDoc(doc(db, "users", currentUser.uid), patch, { merge: true }); } catch(_) {}
      return locked;
    }
    
      window.approveBulkTradeByOwner = async function() {
        const t = currentTrade;
        if (!t || !currentUser || t.ownerId !== currentUser.uid) return /* alert hidden */ console.log("この操作は出品者のみ実行できます。");
        try {
          const postRef = doc(db, "posts", t.postId);
          await runTransaction(db, async (tx) => {
            const ps = await tx.get(postRef);
            if (!ps.exists()) throw new Error("投稿が見つかりません");
            const pData = ps.data();
            const slots = Array.isArray(pData.bulkSlots) ? [...pData.bulkSlots] : [];
            const targetIds = new Set(t.selectedSlotIds || []);
            for (const s of slots) {
              if (targetIds.has(s.id) && s.sold && s.tradeId !== t.id) throw new Error("すでに他の取引で成約済みの枠が含まれています");
            }
            const updatedSlots = slots.map(s => targetIds.has(s.id) ? { ...s, sold: true, tradeId: t.id } : s);
            const allSold = updatedSlots.length > 0 && updatedSlots.every(s => s.sold);
            tx.update(postRef, { bulkSlots: updatedSlots, ...(allSold ? { status: "traded" } : {}) });
            const localPost = allPosts.find(x => x.id === t.postId);
            if (localPost) { localPost.bulkSlots = updatedSlots; if (allSold) localPost.status = "traded"; }
          });
          await updateDoc(doc(db, "trades", t.id), { [`agreed.${currentUser.uid}`]: true, status: "shipping", updatedAt: serverTimestamp() });
          showToast("交換に合意しました！選択された枠が成約確定しました。", "success");
          renderPosts();
        } catch (err) { console.error("approveBulkTradeByOwner error:", err); showToast("合意エラー: " + (err?.code || err?.message || "失敗しました"), "error"); }
      };
      window.cancelTrade = async function() {
      const t = currentTrade; if (!t || cancellingTrade) return;
      if (!(await appConfirm("この取引をキャンセルしますか？\n相手にもキャンセルされたと表示されます。", "キャンセルする", true))) return;
      cancellingTrade = true;
      try {
        await updateDoc(doc(db, "trades", t.id), { status: "cancelled", cancelledBy: currentUser.uid, updatedAt: serverTimestamp() });
        // 投稿を active（出品中）に戻す
        await restorePostToActive(t.postId, t.kind, t.applicantId);
        await revertBundleTrade(t);
        const isNowLocked = await recordUserCancelAndMaybeLock();
                if (isNowLocked) {
                  /* alert hidden */ console.log("⚠️ 直近で2回キャンセルが行われたため、利用規約に基づき24時間のアカウントロックが適用されました。\n（ロック中は新規出品・購入確定・取引申し込みが制限されます）");
                } else {
                  showToast("取引をキャンセルしました。（直近2回で24時間ロックとなります）", "info");
                }
        closeRoom();
      } catch(e) {
        console.error("cancelTrade error:", e);
        showToast("キャンセルに失敗しました（" + (e?.code || "error") + "）。もう一度お試しください。", "error");
      } finally { cancellingTrade = false; }
    };

    window.setRating = function(n) { selectedRating = n; document.querySelectorAll("[data-star]").forEach(b => b.className = "text-3xl transition drop-shadow-sm hover:scale-110 " + (Number(b.dataset.star) <= n ? "text-yellow-400" : "text-gray-300")); };
    window.submitReview = async function() {
      if (submittingReview) return;
      const trade = currentTrade;
      if (!trade || !currentUser) {
        showToast("取引情報を読み込めませんでした", "error");
        return;
      }
      if (selectedRating < 1) {
        showToast("星を選んでください", "info");
        return;
      }
      const toId = currentUser.uid === trade.ownerId ? trade.applicantId : trade.ownerId;
      const commentEl = document.getElementById("review-comment");
      const comment = commentEl && commentEl.value ? commentEl.value.trim().slice(0, 200) : "";
      const submitButton = document.getElementById("review-submit-btn") || document.querySelector("#room-review-slot button[onclick='submitReview()']");
      submittingReview = true;
      setBusyButton(submitButton, true, "送信中…");
      try {
        await setDoc(doc(db, "reviews", trade.id + "_" + currentUser.uid), {
          tradeId: trade.id,
          fromId: currentUser.uid,
          fromName: getMyDisplayName(),
          toId: toId,
          rating: selectedRating,
          comment: comment,
          createdAt: serverTimestamp(),
          deviceId: getOrCreateDeviceId()
        });
        const ownerReceived = flag(trade, "received", trade.ownerId);
        const applicantReceived = flag(trade, "received", trade.applicantId);
        if (ownerReceived && applicantReceived && trade.status !== "completed" && trade.status !== "cancelled") {
          await updateDoc(doc(db, "trades", trade.id), { status: "completed", updatedAt: serverTimestamp() });
          trade.status = "completed";
          await clearTradeShippingDocs(trade.id);
        }
        reviewState = { tradeId: trade.id, done: true };
        const host = document.getElementById("room-review-slot");
        if (host) {
          host.removeAttribute("data-review-key");
        }
        roomActionsKey = "";
        renderRoom();
        showToast("評価を送信しました。取引を終えました", "success");
      } catch (error) {
        console.error(error);
        const message = error && error.message ? error.message : "失敗しました";
        showToast("評価を送れませんでした: " + message, "error");
        setBusyButton(submitButton, false);
      } finally {
        submittingReview = false;
      }
    };

    // この日時以降に作成された出品・取引はアズカリ表示（既存はPayPay）
    // 必要なら日付だけ変えてください
    const PAYMENT_SWITCH_AT = "2026-11-12T00:00:00+09:00";
    function usesAzukariPayment(entity) {
      if (!entity) return true;
      if (entity.paymentMethod === "azukari") return true;
      if (entity.paymentMethod === "paypay") return false;
      const ms = (entity.createdAt && entity.createdAt.toMillis) ? entity.createdAt.toMillis()
        : (typeof entity.createdAt === "number" ? entity.createdAt : 0);
      if (!ms) return true; // 新規作成直後など
      return ms >= new Date(PAYMENT_SWITCH_AT).getTime();
    }
    function paymentLabel(entity) {
      return usesAzukariPayment(entity) ? "アズカリ" : "PayPay";
    }
    const TERMS_VERSION = "2026-11-09", TERMS_KEY = "illit_terms_version"; let termsSaving = false;
    let pendingAfterTerms = null;
    let termsOnboardingRunning = false;
    function hasAgreedLocally() { try { return localStorage.getItem(TERMS_KEY) === TERMS_VERSION; } catch(e){ return false; } }
    window.hasAgreedTerms = hasAgreedLocally;

    /** X（旧Twitter）経由の流入判定：未ログイン閲覧をブロックしないため */
    function isXInboundVisit() {
      try {
        if (sessionStorage.getItem("illit_x_inbound") === "1") return true;
        const params = new URLSearchParams(location.search);
        if (params.get("pool") || params.get("tab") === "autogo") {
          sessionStorage.setItem("illit_x_inbound", "1");
          return true;
        }
        const from = String(params.get("from") || params.get("utm_source") || "").toLowerCase();
        if (from === "x" || from === "twitter" || from.includes("twitter")) {
          sessionStorage.setItem("illit_x_inbound", "1");
          return true;
        }
        const ref = String(document.referrer || "");
        if (/twitter\.com|x\.com|t\.co/i.test(ref)) {
          sessionStorage.setItem("illit_x_inbound", "1");
          return true;
        }
        const ua = String(navigator.userAgent || "");
        if (/Twitter|TwitterAndroid|\bX\/\d/i.test(ua)) {
          sessionStorage.setItem("illit_x_inbound", "1");
          return true;
        }
      } catch (_) {}
      return false;
    }
    window.isXInboundVisit = isXInboundVisit;

    /**
     * 利用規約未同意ならモーダルを出し、同意＋アプリ登録案内の後に resume を実行。
     * @returns {boolean} すでに同意済みなら true
     */
    window.requireTermsAgreement = function(opts) {
      if (hasAgreedLocally()) return true;
      const options = opts || {};
      if (typeof options.resume === "function") {
        pendingAfterTerms = options.resume;
      }
      openTerms(false);
      if (typeof showToast === "function") {
        showToast("利用には規約への同意が必要です。チェックを入れて「同意して利用する」を押してください", "info");
      }
      return false;
    };

    window.__runAfterTermsOnboarding = function() {
      if (termsOnboardingRunning) return;
      const resume = pendingAfterTerms;
      pendingAfterTerms = null;
      if (typeof resume === "function") {
        termsOnboardingRunning = true;
        try { resume(); } catch (e) { console.warn("after terms resume", e); }
        termsOnboardingRunning = false;
      }
      setTimeout(() => {
        if (typeof maybeShowPushPrompt === "function") maybeShowPushPrompt();
      }, 400);
    };

    window.openTerms = function(readOnly) {
      const view = !!readOnly && hasAgreedLocally();
      document.getElementById("terms-agree-area").classList.toggle("hidden", view);
      document.getElementById("terms-close-btn").classList.toggle("hidden", !view);
      document.getElementById("terms-lead").classList.toggle("hidden", view);
      document.getElementById("terms-check").checked = false;
      document.getElementById("terms-agree-btn").disabled = true;
      document.getElementById("terms-modal").classList.remove("hidden");
    };
    window.closeTerms = function() {
      if (hasAgreedLocally()) document.getElementById("terms-modal").classList.add("hidden");
    };
    window.onTermsCheck = function() {
      document.getElementById("terms-agree-btn").disabled = !document.getElementById("terms-check").checked;
    };
    window.declineTerms = function() {
      if (typeof showToast === "function") {
        showToast("利用規約に同意いただけない場合は、本サービスをご利用いただけません", "error");
      }
      pendingAfterTerms = null;
    };
    
    window.agreeTerms = async function() {
      const check = document.getElementById("terms-check");
      const btn = document.getElementById("terms-agree-btn");
      if (!check || !check.checked) {
        if (typeof showToast === "function") showToast("「利用規約をすべて読み、同意します」にチェックを入れてください", "error");
        return;
      }
      if (btn) btn.disabled = true;
      try { localStorage.setItem(TERMS_KEY, TERMS_VERSION); } catch(e){}
      document.getElementById("terms-modal").classList.add("hidden");
      if (currentUser) {
        try { await saveUserData({ terms: { version: TERMS_VERSION, agreedAt: serverTimestamp() } }); } catch(e){}
      }
      // 必ずアプリ登録案内を出す（未表示時は毎回、表示済みでも同意直後は出す）
      openPwaGuideModal();
    };

    /** 初回ゲート：X経由の未ログイン閲覧は投稿を見せ、それ以外は規約を必須表示 */
    window.maybeGateTermsOnBoot = function() {
      if (hasAgreedLocally()) return;
      const loggedIn = !!(window.currentUser || (typeof auth !== "undefined" && auth.currentUser));
      // Xから来た未ログインは投稿・Auto-GO閲覧を妨げない
      if (!loggedIn && isXInboundVisit()) return;
      openTerms(false);
    };

    function syncTermsRecord(d) {
      if (!currentUser) return; const recorded = d && d.terms && d.terms.version === TERMS_VERSION;
      if (recorded && !hasAgreedLocally()) { try { localStorage.setItem(TERMS_KEY, TERMS_VERSION); } catch(e){} document.getElementById("terms-modal").classList.add("hidden"); }
      else if (!recorded && hasAgreedLocally() && !termsSaving) { termsSaving = true; saveUserData({ terms: { version: TERMS_VERSION, agreedAt: serverTimestamp() } }).finally(() => { termsSaving = false; }); }
      // 未同意の強制表示は onAuthStateChanged / requireTermsAgreement 側で行う
    }

           // ===== IndexedDB キャッシュヘルパー（スマホ・PC本体に永久保存） =====
    const IDB_NAME = "illit_trade_cache_v1";
    const IDB_STORE = "kv";
    let idbPromise = null;

    function openCacheDB() {
      if (idbPromise) return idbPromise;
      idbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            const dbInst = req.result;
            if (!dbInst.objectStoreNames.contains(IDB_STORE)) {
              dbInst.createObjectStore(IDB_STORE);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
      return idbPromise;
    }

    async function idbGet(key) {
      const dbInst = await openCacheDB();
      if (!dbInst) return null;
      return new Promise((resolve) => {
        try {
          const tx = dbInst.transaction(IDB_STORE, "readonly");
          const req = tx.objectStore(IDB_STORE).get(key);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    }

    async function idbSet(key, val) {
      const dbInst = await openCacheDB();
      if (!dbInst) return;
      return new Promise((resolve) => {
        try {
          const tx = dbInst.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put(val, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (_) {
          resolve();
        }
      });
    }

    async function idbDelete(key) {
      const dbInst = await openCacheDB();
      if (!dbInst) return;
      return new Promise((resolve) => {
        try {
          const tx = dbInst.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (_) {
          resolve();
        }
      });
    }

    // ===== トレカ画像・カタログ読み込み（GitHub静的パック ＋ IndexedDB優先） =====
    const loadedPhotoAlbums = new Set();
    const CATALOG_CACHE_TTL = 1000 * 60 * 60 * 6; // カタログは6時間キャッシュ
    let staticPackCards = [];
    let staticPackLoaded = false;
    async function loadStaticCardPack(force = false) {
      if (!force && staticPackLoaded && staticPackCards.length > 0) return;
      try {
        const res = await fetch("./catalog.json?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data.cards) ? data.cards : []);
        staticPackCards = items.map(c => ({
          id: String(c.id || ""),
          albumId: String(c.albumId || "other"),
          name: String(c.name || ""),
          member: String(c.member || ""),
          photoUrl: String(c.image || c.photo || c.img || c.photoUrl || ""),
          staticPack: true
        })).filter(c => c.id);
        staticPackCards.forEach(c => {
          if (c.photoUrl) cardPhotoCache[c.id] = c.photoUrl;
        });
        staticPackLoaded = true;
      } catch (e) {
        console.warn("catalog.json load error:", e);
      }
    }
    // 起動時に catalog.json (3,699枚) を自動読み込みし、開いている画面を再描画
    const _bootStaticPackPromise = loadStaticCardPack().then(() => {
      try { if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs(); } catch (_) {}
      try { if (typeof renderMyCardsMemberTabs === "function") renderMyCardsMemberTabs(); } catch (_) {}
      try { if (typeof renderMyCardsList === "function") renderMyCardsList(); } catch (_) {}
      try { if (typeof renderMyCardsShareStats === "function") renderMyCardsShareStats(); } catch (_) {}
    });

        // ==========================================
    // 🔍 トレカ画像認識（v4: 前処理強化 + dHash/pHash + エッジ + 局所色）
    // ==========================================
    const _cardFeatureCache = {};
    const CARD_FEAT_VERSION = 4;
    const CARD_CANDIDATE_TOP_K = 3;

    function _cosineVec(a, b) {
      if (!a || !b || a.length !== b.length) return 0;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    function _hammingSim(a, b) {
      if (!a || !b || a.length !== b.length || !a.length) return 0;
      let same = 0;
      for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
      return same / a.length;
    }

    /** 正規化相互相関（平均差し引き）0–1 */
    function _ncc(a, b) {
      if (!a || !b || a.length !== b.length || !a.length) return 0;
      let ma = 0, mb = 0;
      for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
      ma /= a.length; mb /= b.length;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        const da = a[i] - ma, db = b[i] - mb;
        dot += da * db; na += da * da; nb += db * db;
      }
      if (na < 1e-8 || nb < 1e-8) return 0;
      return Math.max(0, Math.min(1, dot / Math.sqrt(na * nb)));
    }

    /** 簡易2D DCT（N x N） */
    function _dct2d(block, N) {
      const out = new Float64Array(N * N);
      for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
          let sum = 0;
          const cu = u === 0 ? 1 / Math.SQRT2 : 1;
          const cv = v === 0 ? 1 / Math.SQRT2 : 1;
          for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
              sum += block[y * N + x] *
                Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) *
                Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
            }
          }
          out[u * N + v] = 0.25 * cu * cv * sum;
        }
      }
      return out;
    }

    /** 白フチを大まかに除去した有効矩形を推定 */
    function _detectContentRect(data, w, h) {
      const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
      let br = 0, bg = 0, bb = 0;
      corners.forEach(([x, y]) => {
        const i = (y * w + x) * 4;
        br += data[i]; bg += data[i + 1]; bb += data[i + 2];
      });
      br /= 4; bg /= 4; bb /= 4;
      const thr = 28;
      const isBg = (x, y) => {
        const i = (y * w + x) * 4;
        return Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) < thr * 3;
      };
      let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
      const step = Math.max(1, Math.floor(Math.min(w, h) / 80));
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          if (!isBg(x, y)) {
            found = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!found || maxX - minX < w * 0.25 || maxY - minY < h * 0.25) {
        return { x: 0, y: 0, w, h };
      }
      const padX = Math.round((maxX - minX) * 0.02);
      const padY = Math.round((maxY - minY) * 0.02);
      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(w - 1, maxX + padX);
      maxY = Math.min(h - 1, maxY + padY);
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    /** 照明・反射対策: コントラスト正規化（ヒストグラム均等化寄り）を ImageData に適用 */
    function _normalizeLightingInPlace(data, w, h, rect) {
      const x0 = Math.max(0, rect?.x | 0);
      const y0 = Math.max(0, rect?.y | 0);
      const x1 = Math.min(w, x0 + Math.max(1, rect?.w | w));
      const y1 = Math.min(h, y0 + Math.max(1, rect?.h | h));
      const hist = new Uint32Array(256);
      const lumArr = [];
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          const lum = Math.max(0, Math.min(255, Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])));
          hist[lum]++;
          lumArr.push(lum);
        }
      }
      const total = Math.max(1, lumArr.length);
      // 端の1%を切り捨てて実効レンジを取る（反射ハイライト耐性）
      const cut = Math.max(1, Math.floor(total * 0.01));
      let acc = 0, lo = 0, hi = 255;
      for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= cut) { lo = i; break; } }
      acc = 0;
      for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= cut) { hi = i; break; } }
      if (hi <= lo + 8) { lo = 0; hi = 255; }
      const range = hi - lo || 1;
      // CDF ベースの弱い均等化 + レンジ正規化を混合
      const cdf = new Float32Array(256);
      let running = 0;
      for (let i = 0; i < 256; i++) {
        running += hist[i];
        cdf[i] = running / total;
      }
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const stretched = ((lum - lo) / range) * 255;
          const equalized = cdf[Math.max(0, Math.min(255, Math.round(lum)))] * 255;
          const target = stretched * 0.65 + equalized * 0.35;
          const scale = lum > 1e-3 ? target / lum : 1;
          data[i] = Math.max(0, Math.min(255, r * scale));
          data[i + 1] = Math.max(0, Math.min(255, g * scale));
          data[i + 2] = Math.max(0, Math.min(255, b * scale));
        }
      }
    }

    function _sampleGrayRect(data, srcW, srcH, rect, outW, outH) {
      const gray = new Float32Array(outW * outH);
      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const sx = Math.min(srcW - 1, rect.x + Math.floor((x + 0.5) * rect.w / outW));
          const sy = Math.min(srcH - 1, rect.y + Math.floor((y + 0.5) * rect.h / outH));
          const i = (sy * srcW + sx) * 4;
          gray[y * outW + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      }
      return gray;
    }

    function _sampleRgbGrid(data, srcW, srcH, rect, gw, gh) {
      const vec = [];
      for (let by = 0; by < gh; by++) {
        for (let bx = 0; bx < gw; bx++) {
          const x0 = rect.x + Math.floor(bx * rect.w / gw);
          const x1 = rect.x + Math.floor((bx + 1) * rect.w / gw);
          const y0 = rect.y + Math.floor(by * rect.h / gh);
          const y1 = rect.y + Math.floor((by + 1) * rect.h / gh);
          let r = 0, g = 0, b = 0, c = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * srcW + x) * 4;
              r += data[i]; g += data[i + 1]; b += data[i + 2]; c++;
            }
          }
          vec.push((r / (c * 255)) || 0, (g / (c * 255)) || 0, (b / (c * 255)) || 0);
        }
      }
      return vec;
    }

    /** 局所色分布（セル内の平均RGB + 簡易ヒストグラム） */
    function _sampleLocalColorHist(data, srcW, srcH, rect, gw, gh) {
      const vec = [];
      const bins = 4;
      for (let by = 0; by < gh; by++) {
        for (let bx = 0; bx < gw; bx++) {
          const x0 = rect.x + Math.floor(bx * rect.w / gw);
          const x1 = rect.x + Math.floor((bx + 1) * rect.w / gw);
          const y0 = rect.y + Math.floor(by * rect.h / gh);
          const y1 = rect.y + Math.floor((by + 1) * rect.h / gh);
          let r = 0, g = 0, b = 0, c = 0;
          const hr = new Float32Array(bins), hg = new Float32Array(bins), hb = new Float32Array(bins);
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * srcW + x) * 4;
              const rv = data[i], gv = data[i + 1], bv = data[i + 2];
              r += rv; g += gv; b += bv; c++;
              hr[Math.min(bins - 1, rv >> 6)]++;
              hg[Math.min(bins - 1, gv >> 6)]++;
              hb[Math.min(bins - 1, bv >> 6)]++;
            }
          }
          const inv = 1 / Math.max(1, c);
          vec.push(r * inv / 255, g * inv / 255, b * inv / 255);
          for (let k = 0; k < bins; k++) {
            vec.push(hr[k] * inv, hg[k] * inv, hb[k] * inv);
          }
        }
      }
      return vec;
    }

    function _makePHash(gray32) {
      const N = 32;
      const dct = _dct2d(gray32, N);
      const coeffs = [];
      for (let u = 0; u < 8; u++) {
        for (let v = 0; v < 8; v++) {
          if (u === 0 && v === 0) continue;
          coeffs.push(dct[u * N + v]);
        }
      }
      const sorted = coeffs.slice().sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      let hash = "";
      for (const c of coeffs) hash += c > med ? "1" : "0";
      return hash;
    }

    /** 差分ハッシュ（水平方向）— 複数解像度対応 */
    function _makeDHash(gray, gw, gh) {
      // gray は (gw+1) * gh を想定し、各行で隣接比較
      let hash = "";
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          hash += gray[y * (gw + 1) + x] < gray[y * (gw + 1) + x + 1] ? "1" : "0";
        }
      }
      return hash;
    }

    /** Sobel風エッジ強度マップ（正規化） */
    function _makeEdgeMap(gray, w, h) {
      const out = new Float32Array(w * h);
      let maxV = 1e-6;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx =
            -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
             gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
          const gy =
            -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
             gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
          const v = Math.sqrt(gx * gx + gy * gy);
          out[i] = v;
          if (v > maxV) maxV = v;
        }
      }
      for (let i = 0; i < out.length; i++) out[i] /= maxV;
      return out;
    }

    function _featuresFromCanvasData(data, w, h) {
      const content = _detectContentRect(data, w, h);
      // 照明・反射のバラつきを抑えてから特徴抽出
      _normalizeLightingInPlace(data, w, h, content);

      const patch = _sampleGrayRect(data, w, h, content, 32, 32);
      const faceRect = {
        x: content.x + Math.round(content.w * 0.15),
        y: content.y + Math.round(content.h * 0.08),
        w: Math.round(content.w * 0.70),
        h: Math.round(content.h * 0.48)
      };
      const face = _sampleGrayRect(data, w, h, faceRect, 24, 24);
      const lowerRect = {
        x: content.x + Math.round(content.w * 0.1),
        y: content.y + Math.round(content.h * 0.5),
        w: Math.round(content.w * 0.8),
        h: Math.round(content.h * 0.45)
      };
      const lower = _sampleGrayRect(data, w, h, lowerRect, 16, 16);

      // マルチサイズ知覚ハッシュ
      const pHash = _makePHash(patch);
      const dHashSm = _makeDHash(_sampleGrayRect(data, w, h, content, 9, 8), 8, 8);
      const dHashMd = _makeDHash(_sampleGrayRect(data, w, h, content, 17, 16), 16, 16);
      // 3x3 グリッド dHash（局所構造）
      const gridDHashes = [];
      for (let gy = 0; gy < 3; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          const cell = {
            x: content.x + Math.floor(gx * content.w / 3),
            y: content.y + Math.floor(gy * content.h / 3),
            w: Math.floor(content.w / 3),
            h: Math.floor(content.h / 3)
          };
          gridDHashes.push(_makeDHash(_sampleGrayRect(data, w, h, cell, 9, 8), 8, 8));
        }
      }

      const edgeFull = _makeEdgeMap(patch, 32, 32);
      // エッジを 8x8 に畳み込み（速度とノイズ耐性）
      const edgeGrid = new Float32Array(64);
      for (let by = 0; by < 8; by++) {
        for (let bx = 0; bx < 8; bx++) {
          let s = 0, c = 0;
          for (let y = by * 4; y < by * 4 + 4; y++) {
            for (let x = bx * 4; x < bx * 4 + 4; x++) {
              s += edgeFull[y * 32 + x]; c++;
            }
          }
          edgeGrid[by * 8 + bx] = s / Math.max(1, c);
        }
      }

      const colorGrid = _sampleRgbGrid(data, w, h, content, 6, 8);
      const faceColor = _sampleRgbGrid(data, w, h, faceRect, 4, 4);
      const localColor = _sampleLocalColorHist(data, w, h, content, 3, 4);

      const norm = (arr) => {
        let s = 0;
        for (let i = 0; i < arr.length; i++) s += arr[i];
        const m = s / arr.length || 1;
        const out = new Float32Array(arr.length);
        for (let i = 0; i < arr.length; i++) out[i] = arr[i] / m;
        return out;
      };

      return {
        pHash,
        dHashSm,
        dHashMd,
        gridDHashes,
        edgeGrid: Array.from(edgeGrid),
        patch: Array.from(norm(patch)),
        face: Array.from(norm(face)),
        lower: Array.from(norm(lower)),
        colorGrid,
        faceColor,
        localColor,
        version: CARD_FEAT_VERSION
      };
    }

    async function extractImageFeatures(imgSrc) {
      if (!imgSrc || typeof imgSrc !== "string") return null;
      let resolvedSrc = imgSrc;
      if (!imgSrc.startsWith("data:") && !imgSrc.startsWith("blob:")) {
        try {
          const res = await fetch(imgSrc, { mode: "cors" });
          if (res.ok) {
            const blob = await res.blob();
            resolvedSrc = URL.createObjectURL(blob);
          }
        } catch (_) {}
      }
      return new Promise((resolve) => {
        const img = new Image();
        if (!resolvedSrc.startsWith("data:") && !resolvedSrc.startsWith("blob:")) {
          try { img.crossOrigin = "anonymous"; } catch (_) {}
        }
        const cleanup = () => { if (resolvedSrc.startsWith("blob:")) try { URL.revokeObjectURL(resolvedSrc); } catch (_) {} };
        const timer = setTimeout(() => { cleanup(); resolve(null); }, 15000);
        img.onload = () => {
          clearTimeout(timer);
          try {
            const maxSide = 280;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const tw = Math.max(48, Math.round(img.width * scale));
            const th = Math.max(48, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, tw, th);
            const imageData = ctx.getImageData(0, 0, tw, th);
            const feat = _featuresFromCanvasData(imageData.data, tw, th);
            canvas.width = 0; canvas.height = 0;
            cleanup();
            resolve(feat);
          } catch (e) {
            console.warn("extractImageFeatures", e);
            cleanup();
            resolve(null);
          }
        };
        img.onerror = () => { clearTimeout(timer); cleanup(); resolve(null); };
        img.src = resolvedSrc;
      });
    }

    /**
     * 類似度 0–100
     * dHash/pHash + エッジ + 局所色の重み付け。似た構図の別メンバー誤判定を抑える。
     */
    function calcFeatureSimilarity(fa, fb) {
      if (!fa || !fb) return 0;
      if (Array.isArray(fa) || Array.isArray(fb)) return 0;
      if (fa.version !== CARD_FEAT_VERSION || fb.version !== CARD_FEAT_VERSION) return 0;
      if (!fa.pHash || !fb.pHash) return 0;

      const pHash = _hammingSim(fa.pHash, fb.pHash);
      const dSm = _hammingSim(fa.dHashSm, fb.dHashSm);
      const dMd = _hammingSim(fa.dHashMd, fb.dHashMd);
      let gridD = 0;
      if (Array.isArray(fa.gridDHashes) && Array.isArray(fb.gridDHashes) && fa.gridDHashes.length === fb.gridDHashes.length) {
        let s = 0;
        for (let i = 0; i < fa.gridDHashes.length; i++) s += _hammingSim(fa.gridDHashes[i], fb.gridDHashes[i]);
        gridD = s / fa.gridDHashes.length;
      }
      const hashScore = pHash * 0.34 + dSm * 0.22 + dMd * 0.22 + gridD * 0.22;

      const patch = _ncc(fa.patch, fb.patch);
      const face = _ncc(fa.face, fb.face);
      const lower = _ncc(fa.lower, fb.lower);
      const edge = _ncc(fa.edgeGrid, fb.edgeGrid);
      const color = _cosineVec(fa.colorGrid, fb.colorGrid);
      const faceCol = _cosineVec(fa.faceColor, fb.faceColor);
      const localCol = _cosineVec(fa.localColor, fb.localColor);

      const structure = hashScore * 0.42 + patch * 0.22 + face * 0.18 + edge * 0.18;
      const colorScore = localCol * 0.40 + color * 0.30 + faceCol * 0.20 + lower * 0.10;
      let score = structure * 0.70 + colorScore * 0.30;

      // 厳格ゲート: 構図だけ似て別メンバーになる誤爆を落とす
      if (hashScore < 0.68) score *= 0.55;
      if (pHash < 0.62) score *= 0.50;
      if (edge < 0.45) score *= 0.70;
      if (face < 0.48) score *= 0.72;
      if (localCol < 0.55 && face >= 0.55) score *= 0.85;
      if (hashScore >= 0.88 && edge >= 0.72 && face >= 0.70 && localCol >= 0.70) {
        score = Math.min(1, score * 1.10);
      }

      return Math.round(Math.max(0, Math.min(100, score * 100)));
    }

    function calcCosineSimilarity(vecA, vecB) {
      return calcFeatureSimilarity(vecA, vecB);
    }

    
    // AI画像検索 (Transformers.js CLIP-ViT-B-32 + card_vectors.json)
    let _aiCardVectorsPromise = null;
    let _aiClipExtractorPromise = null;
    // AIベクトルの先読みはエラーを無視して非同期で（ページ読み込みを邪魔しない）
    setTimeout(() => { 
      try { getAiCardVectors().catch(() => {}); } catch(_) {} 
    }, 5000);
function getAiCardVectors() {
      if (!_aiCardVectorsPromise) {
        _aiCardVectorsPromise = (async () => {
          const base = await fetch("./card_vectors.json?v=20261117b", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => (d && d.vectors) ? { ...d.vectors } : {})
            .catch(() => ({}));
          // ベクトルは clean/ から作った静的ファイルだけを使う。
          // Firestore を読むと古いベクトルで上書きされ、読み取りも増える。
          return Object.keys(base).length > 0 ? base : null;
        })();
      }
      return _aiCardVectorsPromise;
    }
    async function getAiClipExtractor() {
    if (_aiClipExtractorPromise) return _aiClipExtractorPromise;
    _aiClipExtractorPromise = (async () => {
      const updateStatus = (msg) => {
        ["similar-cards-suggest", "mycards-image-search-result"].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.classList.remove("hidden"); el.textContent = msg; }
        });
      };
      
      updateStatus("🔄 AIライブラリ(Transformers.js)を初期化中...");
      
      // タイムアウト監視付きインポート (20秒)
      const importPromise = import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1");
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("AIライブラリの読み込みがタイムアウトしました。通信環境を確認してください。")), 20000));
      
      const { pipeline, env } = await Promise.race([importPromise, timeoutP]);
      
      // ブラウザ環境でのキャッシュ設定最適化
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      updateStatus("🤖 AIモデル(DINOv2)のダウンロード準備中...");
      
      let lastProgressTime = Date.now();
      
      // モデルロード処理自体に35秒タイムアウトを設定
      const modelPromise = pipeline("image-feature-extraction", "Xenova/dinov2-base", {
        dtype: "q8",
        progress_callback: (p) => {
          lastProgressTime = Date.now();
          if (p && typeof p.progress === "number") {
            updateStatus(`🤖 AIモデル準備中... ${Math.round(p.progress)}% (${p.file || ""})`);
          } else if (p && p.status) {
            updateStatus(`⚡ ${p.status}...`);
          }
        }
      });
      
      // 進行状況が35秒間一切更新されない場合の強制ガード
      const modelTimeoutP = new Promise((_, rej) => {
        const timer = setInterval(() => {
          if (Date.now() - lastProgressTime > 35000) {
            clearInterval(timer);
            rej(new Error("AIモデルのダウンロードがネットワークまたはブラウザの制限により停止しました。"));
          }
        }, 1000);
      });
      
      const extractor = await Promise.race([modelPromise, modelTimeoutP]);
      updateStatus("✅ DINOv2モデルの準備が完了しました！");
      return extractor;
    })().catch(e => {
      _aiClipExtractorPromise = null;
      console.error("AI Clip Extractor Error:", e);
      const errMsg = "⚠️ " + (e.message || e);
      ["similar-cards-suggest", "mycards-image-search-result"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove("hidden"); el.innerHTML = `${errMsg} <br><button onclick="window.clearMyCardsImageSearch && window.clearMyCardsImageSearch()" class="mt-1 text-[10px] underline text-purple-600 font-bold">閉じる・手動選択へ</button>`; }
      });
      throw e;
    });
    return _aiClipExtractorPromise;
  }
  
  // 元の関数名との互換性維持
  window.getAiClipExtractor = getAiClipExtractor;
  
  async function _dummy_old_clip() {
      if (!_aiClipExtractorPromise) {
        _aiClipExtractorPromise = import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1")
          .then(({ pipeline, env }) => {
            env.allowLocalModels = false;
            return pipeline("image-feature-extraction", "Xenova/dinov2-base", {
          dtype: "q8",
          progress_callback: (p) => {
            const resEl = document.getElementById("mycards-image-search-result");
            if (resEl && p && typeof p.progress === "number") {
              resEl.textContent = "🤖 AIモデル準備中... " + Math.round(p.progress) + "%（初回のみキャッシュ保存）";
            }
          }
        });
          })
          .catch(e => { _aiClipExtractorPromise = null; throw e; });
      }
      return _aiClipExtractorPromise;
    }
        window.ensureCatalogCardsLoaded = async function() {
    if (Array.isArray(catalogCardsCache) && catalogCardsCache.length > 0) return true;
    if (window._catalogJsonLoadingPromise) return await window._catalogJsonLoadingPromise;
    window._catalogJsonLoadingPromise = (async () => {
        try {
            if (typeof loadCatalogCards === "function") await loadCatalogCards();
        } catch (_) {}
        if (!Array.isArray(catalogCardsCache) || catalogCardsCache.length === 0) {
            try {
                const res = await fetch("./catalog.json?v=" + Date.now(), { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    const raw = data && data.cards ? data.cards : data;
                    const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
                    const valid = arr.filter(c => c && c.id);
                    if (valid.length > 0) {
                        catalogCardsCache = valid.map(c => ({
                          ...c,
                          id: String(c.id),
                          albumId: String(c.albumId || "other"),
                          name: c.name || "",
                          member: c.member || "",
                          photoUrl: c.photoUrl || c.image || c.photo || c.img || ""
                        }));
                        catalogCardsCache.forEach(c => {
                            const img = c.photoUrl || c.image || c.photo || c.img;
                            if (img && !cardPhotoCache[c.id]) cardPhotoCache[c.id] = img;
                        });
                    }
                }
            } catch (e) {
                console.warn("catalog.json load error:", e);
            }
        }
        return true;
    })();
    return await window._catalogJsonLoadingPromise;
};
    window.ensureCardPhotosLoaded = window.ensureCardPhotosLoaded || (async function() {
      if (typeof loadCardPhotos === "function") return await loadCardPhotos();
      return true;
    });

    // DINOv2 は [1, tokens, 768] を返す。平均して正規化しないと保存ベクトル(768)と長さが合わず0件になる。
    function poolImageEmbedding(out) {
      if (!out) return null;
      const data = out.data || out;
      if (!data || !data.length) return null;
      const dims = out.dims;
      let seq = 0;
      let dim = 0;
      if (dims && dims.length === 3) {
        seq = dims[1];
        dim = dims[2];
      } else if (data.length > 768 && data.length % 768 === 0) {
        dim = 768;
        seq = data.length / 768;
      }
      let vec;
      if (seq > 1 && dim > 0 && data.length >= seq * dim) {
        vec = new Float32Array(dim);
        for (let t = 0; t < seq; t++) {
          const off = t * dim;
          for (let i = 0; i < dim; i++) vec[i] += data[off + i];
        }
        for (let i = 0; i < dim; i++) vec[i] /= seq;
      } else if (data.length > 0 && data.length <= 4096) {
        vec = Float32Array.from(data);
      } else {
        return null;
      }
      let norm = 0;
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm) || 1;
      const arr = new Array(vec.length);
      for (let i = 0; i < vec.length; i++) arr[i] = vec[i] / norm;
      return arr;
    }

    function isolateCardSource(img) {
      const w0 = img.naturalWidth || img.width;
      const h0 = img.naturalHeight || img.height;
      if (!w0 || !h0) return img;
      const scale = Math.min(1, 360 / w0);
      const w = Math.max(48, Math.round(w0 * scale));
      const h = Math.max(48, Math.round(h0 * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const samples = [];
      const take = (x, y) => {
        const i = (y * w + x) * 4;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      };
      for (let x = 0; x < w; x += 3) { take(x, 1); take(x, h - 2); }
      for (let y = 0; y < h; y += 3) { take(1, y); take(w - 2, y); }
      samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
      const mid = samples[Math.floor(samples.length / 2)] || [200, 200, 200];
      let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
      for (let y = 2; y < h - 2; y += 2) {
        for (let x = 2; x < w - 2; x += 2) {
          const i = (y * w + x) * 4;
          const dr = data[i] - mid[0];
          const dg = data[i + 1] - mid[1];
          const db = data[i + 2] - mid[2];
          if (dr * dr + dg * dg + db * db > 38 * 38) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            count++;
          }
        }
      }
      const bw = maxX - minX;
      const bh = maxY - minY;
      const area = (bw * bh) / (w * h);
      let sx, sy, sw, sh;
      if (count < 60 || bw < 24 || bh < 24 || area < 0.2 || area > 0.9) {
        sx = 0; sy = 0; sw = w0; sh = h0;
      } else {
        const inv = w0 / w;
        const padX = bw * 0.04;
        const padY = bh * 0.04;
        sx = Math.max(0, (minX - padX) * inv);
        sy = Math.max(0, (minY - padY) * inv);
        sw = Math.min(w0 - sx, (bw + padX * 2) * inv);
        sh = Math.min(h0 - sy, (bh + padY * 2) * inv);
      }
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(sw));
      out.height = Math.max(1, Math.round(sh));
      const octx = out.getContext("2d", { willReadFrequently: true });
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
      // クロップ後に照明正規化（DINOv2・特徴量の両方に効かせる）
      try {
        const od = octx.getImageData(0, 0, out.width, out.height);
        _normalizeLightingInPlace(od.data, out.width, out.height, { x: 0, y: 0, w: out.width, h: out.height });
        octx.putImageData(od, 0, 0);
      } catch (_) {}
      return out;
    }
    function paintSquareView(img, mode) {
      const side = 518;
      const c = document.createElement("canvas");
      c.width = side;
      c.height = side;
      const ctx = c.getContext("2d");
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      ctx.fillStyle = "#f3f3f3";
      ctx.fillRect(0, 0, side, side);
      if (!w || !h) return c.toDataURL("image/jpeg", 0.92);
      if (mode === "crop") {
        const s = Math.min(w, h);
        ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, side, side);
      } else {
        const scale = Math.min(side / w, side / h);
        const dw = Math.round(w * scale);
        const dh = Math.round(h * scale);
        ctx.drawImage(img, (side - dw) / 2, (side - dh) / 2, dw, dh);
      }
      return c.toDataURL("image/jpeg", 0.92);
    }
    function cardQueryViews(dataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const src = isolateCardSource(img);
          const w = src.naturalWidth || src.width;
          const h = src.naturalHeight || src.height;
          const maxSide = 768;
          const scale = Math.min(1, maxSide / Math.max(w, h, 1));
          const tight = document.createElement("canvas");
          tight.width = Math.max(1, Math.round(w * scale));
          tight.height = Math.max(1, Math.round(h * scale));
          tight.getContext("2d").drawImage(src, 0, 0, tight.width, tight.height);
          resolve([tight.toDataURL("image/jpeg", 0.92), paintSquareView(src, "crop")]);
        };
        img.onerror = () => resolve([dataUrl]);
        img.src = dataUrl;
      });
    }
    function pickNearMatches(scored) {
      if (!scored.length || scored[0].raw < 0.5) return [];
      const best = scored[0].raw;
      const span = best >= 0.93 ? 0.018 : best >= 0.86 ? 0.032 : 0.050;
      const near = scored.filter(s => best - s.raw <= span);
      // 上位3件を常に提示（似た構図の別メンバーを選べるように）
      return (near.length ? near : scored).slice(0, CARD_CANDIDATE_TOP_K);
    }
    function dinov2MatchScore(dot) {
      return Math.max(1, Math.min(99, Math.round(((dot - 0.88) / 0.12) * 70 + 29)));
    }

    async function findSimilarCardsWithAI(dataUrl) {
      try {
        return await _findSimilarCardsWithAIRaw(dataUrl);
      } catch (aiErr) {
        console.warn("DINOv2 AI fallback to standard image search:", aiErr);
        return null;
      }
    }
    async function _findSimilarCardsWithAIRaw(dataUrl) {
      if (typeof loadStaticCardPack === "function") {
        try { await loadStaticCardPack(); } catch (_) {}
      }
      if (typeof ensureCatalogCardsLoaded === "function") {
        try { await ensureCatalogCardsLoaded(); } catch (_) {}
      }
      const vecMap = await getAiCardVectors();
      if (!vecMap || !Object.keys(vecMap).length) return null;
      const resEl = document.getElementById("mycards-image-search-result");
      if (resEl) resEl.textContent = "🤖 AIモデル準備＆解析中（初回のみ数秒）...";
      const extractor = await getAiClipExtractor();
      const views = await cardQueryViews(dataUrl);
      const qVecs = [];
      for (const view of views) {
        const out = await extractor(view, { pooling: "mean", normalize: true });
        const qVec = poolImageEmbedding(out);
        if (qVec && qVec.length) qVecs.push(qVec);
      }
      if (!qVecs.length) return null;

      const allCards = [];
      const seen = new Set();
      const pushCard = (c) => {
        if (c && c.id && !seen.has(c.id)) { seen.add(c.id); allCards.push(c); }
      };
      (window.ILLIT_CARD_ALBUMS || (typeof ILLIT_CARD_ALBUMS !== "undefined" ? ILLIT_CARD_ALBUMS : [])).forEach(a => {
        if (typeof getAlbumCards === "function") getAlbumCards(a.id).forEach(pushCard);
      });
      (staticPackCards || []).forEach(pushCard);
      (catalogCardsCache || []).forEach(pushCard);

      const scored = [];
      let compared = 0;
      for (const c of allCards) {
        const v = vecMap[c.id];
        if (!v) continue;
        let dot = -1;
        for (const qVec of qVecs) {
          if (v.length !== qVec.length) continue;
          let d = 0;
          for (let i = 0; i < qVec.length; i++) d += qVec[i] * v[i];
          if (d > dot) dot = d;
        }
        if (dot < 0) continue;
        compared++;
        scored.push({ card: c, score: dinov2MatchScore(dot), raw: dot });
      }
      if (!compared) return null;
      scored.sort((a, b) => b.raw - a.raw);
      const head = scored.slice(0, 12);
      try {
        const qFeat = await extractImageFeatures(views[0]);
        if (qFeat) {
          // 上位候補だけマルチ特徴量で再ランク（体感速度を維持）
          await Promise.all(head.map(async (s) => {
            const url = typeof getCardPhoto === "function" ? getCardPhoto(s.card && s.card.id) : "";
            if (!url) return;
            let feat = _cardFeatureCache[s.card.id];
            if (!feat || feat.version !== CARD_FEAT_VERSION) {
              feat = await extractImageFeatures(url);
              if (feat) _cardFeatureCache[s.card.id] = feat;
            }
            if (!feat) return;
            const pix = calcFeatureSimilarity(qFeat, feat) / 100;
            s.base = s.raw;
            s.pix = pix;
            // DINOv2 を主軸にしつつ、マルチ特徴量の寄与を強化（誤判定低減）
            if (pix > 0) s.raw = s.base * 0.82 + pix * 0.18;
            s.score = Math.max(1, Math.min(99, Math.round((s.raw * 0.55 + pix * 0.45) * 100)));
          }));
          head.sort((a, b) => b.raw - a.raw);
        }
      } catch (_) {}
      return pickNearMatches(head.concat(scored.slice(8)));
    }

    async function recognizeCardImage(dataUrl) {
      try {
        const ai = await _findSimilarCardsWithAIRaw(dataUrl);
        if (ai && ai.length) return ai;
      } catch (e) {
        console.warn("DINOv2 search failed:", e);
      }
      return findSimilarCards(dataUrl, true);
    }
    async function findSimilarCards(uploadedDataUrl, skipAI) {
      try {
        if (!skipAI) {
          const aiHits = await findSimilarCardsWithAI(uploadedDataUrl);
          if (Array.isArray(aiHits) && aiHits.length) return aiHits;
        }
      } catch (aiErr) {
        console.warn("AI search fallback:", aiErr);
      }
      await ensureCatalogCardsLoaded();
      for (const a of ILLIT_CARD_ALBUMS) {
        await ensureCardPhotosLoaded(a.id);
      }

      const targetVec = await extractImageFeatures(uploadedDataUrl);
      if (!targetVec) return [];

      if (typeof _bootStaticPackPromise !== "undefined" && _bootStaticPackPromise) {
        try { await _bootStaticPackPromise; } catch (e) {}
      }
      const allCards = [];
      const seenIds = new Set();
      const albumNameMap = {};
      for (const a of ILLIT_CARD_ALBUMS) {
        albumNameMap[a.id] = a.name;
        getAlbumCards(a.id).forEach(c => {
          if (c.custom) return;
          if (seenIds.has(c.id)) return;
          seenIds.add(c.id);
          allCards.push({ ...c, albumName: a.name });
        });
      }
      if (typeof staticPackCards !== "undefined" && Array.isArray(staticPackCards)) {
        staticPackCards.forEach(c => {
          if (!c || !c.id || seenIds.has(c.id)) return;
          seenIds.add(c.id);
          allCards.push({ ...c, albumName: albumNameMap[c.albumId] || c.albumName || c.albumId || "" });
        });
      }

      const results = [];
      for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        if ((card.albumId || "").toLowerCase().includes("glitter") || (card.albumName || "").toLowerCase().includes("glitter")) continue;
    if (/^pk_mwk4is71_00(?:0[1-9]|[1-4][0-9]|5[0-7])$/i.test(String(card.id || ""))) continue;
    const photoUrl = cardPhotoCache[card.id] || card.photoUrl;
        if (!photoUrl) continue;

        if (!_cardFeatureCache[card.id] ||
            Array.isArray(_cardFeatureCache[card.id]) ||
            _cardFeatureCache[card.id].version !== CARD_FEAT_VERSION) {
          _cardFeatureCache[card.id] = await extractImageFeatures(photoUrl);
        }
        const cardVec = _cardFeatureCache[card.id];
        if (!cardVec) continue;

        const score = calcFeatureSimilarity(targetVec, cardVec);
        // 厳格だが上位候補提示のため閾値を少し緩和
        if (score >= 68) {
          results.push({ card, photoUrl, score, vec: cardVec, raw: score / 100 });
        }
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
      }

      results.sort((a, b) => b.score - a.score);

      if (results.length) {
        const top = results[0].score;
        for (let i = results.length - 1; i >= 1; i--) {
          if (top - results[i].score >= 20 && results[i].score < 82) {
            results.splice(i, 1);
          }
        }
      }

      const unique = [];
      for (const r of results) {
        const dup = unique.some(u => calcFeatureSimilarity(u.vec, r.vec) >= 94);
        if (!dup) unique.push(r);
      }
      return unique.slice(0, CARD_CANDIDATE_TOP_K).map(({ card, photoUrl, score, raw }) => ({ card, photoUrl, score, raw }));
    }

    // CLIP用に画像を224x224に縮小
    function shrinkForClip(dataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = 224;
          c.height = 224;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, 224, 224);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    function _candidateAlbumName(card) {
      if (!card) return "";
      if (card.albumName) return card.albumName;
      try {
        const albums = window.ILLIT_CARD_ALBUMS || (typeof ILLIT_CARD_ALBUMS !== "undefined" ? ILLIT_CARD_ALBUMS : []);
        const hit = albums.find(a => a && a.id === card.albumId);
        if (hit && hit.name) return hit.name;
      } catch (_) {}
      return card.albumId || "";
    }

    function renderAiCandidates(container, matches) {
      if (!container) return;
      const esc = window.escapeHtml || ((s) => String(s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m] || m)));
      if (!Array.isArray(matches) || matches.length === 0) {
        container.classList.remove("hidden");
        container.innerHTML = `<div class="text-[11px] text-gray-400 py-1.5 text-center">一致する候補が見つかりませんでした（手動で選択してください）</div>`;
        return;
      }
      const top = matches.slice(0, CARD_CANDIDATE_TOP_K);
      container.classList.remove("hidden");
      container.innerHTML = `
        <div class="text-[11px] font-bold text-purple-700 mb-1.5 flex items-center justify-between">
          <span>✨ 候補トップ${top.length}（タップで確定）</span>
          <span class="text-[10px] text-gray-400">一致度順</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          ${top.map((m, idx) => {
            const c = m.card || {};
            const img = (typeof getCardPhoto === "function" && getCardPhoto(c.id)) || c.img || c.photoUrl || m.photoUrl || "";
            const album = _candidateAlbumName(c);
            const pct = Math.max(0, Math.min(99, Number(m.score) || 0));
            const rank = idx === 0 ? "1位" : idx === 1 ? "2位" : "3位";
            return `<button type="button" onclick="applyRecognizedCard('${esc(c.id)}')" class="bg-white border-2 ${idx === 0 ? "border-purple-500" : "border-purple-200"} hover:border-purple-600 rounded-xl p-1.5 text-left shadow-md transition active:scale-95">
              <div class="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-1">
                ${img ? `<img src="${esc(img)}" class="w-full h-full object-cover" loading="lazy">` : `<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Img</div>`}
                <span class="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">${rank}</span>
                <span class="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 rounded">${pct}%</span>
              </div>
              <div class="text-[10px] font-bold text-gray-800 truncate">${esc(c.member || "")}</div>
              <div class="text-[9px] text-gray-500 truncate">${esc(album || c.name || "")}</div>
              <div class="text-[9px] text-gray-400 truncate">${esc(c.name || "")}</div>
            </button>`;
          }).join("")}
        </div>
        <button type="button" onclick="dismissAiCandidates()" class="mt-2 w-full py-2 rounded-xl bg-white text-[12px] font-medium text-gray-600 border border-gray-200">この中にない</button>
      `;
    }
    window.dismissAiCandidates = function() {
      selectedPostCard = null;
      const container = document.getElementById("similar-cards-suggest");
      if (!container) return;
      container.classList.remove("hidden");
      container.innerHTML = `<div class="text-[11px] text-gray-500 py-1.5 text-center">候補は使わず、下の欄に入力できます</div>`;
    };

    window.runCardImageRecognition = async function(uploadedDataUrl) {
      const container = document.getElementById("similar-cards-suggest");
      const updateStatus = (msg) => {
        ["similar-cards-suggest", "mycards-image-search-result"].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.classList.remove("hidden");
            el.textContent = msg;
          }
        });
      };

      // 全体タイムアウト（モバイルでモデルDLが固まる対策）
      const overallTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI準備がタイムアウトしました。軽量検索に切り替えます")), 180000)
      );

      try {
        updateStatus("🤖 AIモデルを準備中...");

        // カタログを先にロード
        if (typeof ensureCatalogCardsLoaded === "function") {
          await ensureCatalogCardsLoaded().catch(() => {});
        }

        let matches = null;
        try {
          matches = await Promise.race([
            recognizeCardImage(uploadedDataUrl),
            overallTimeout
          ]);
        } catch (clipErr) {
          console.warn("card search failed or timed out:", clipErr);
          matches = null;
        }

        renderAiCandidates(container, matches || []);
        const best = matches && matches[0];
        const second = matches && matches[1];
        const raw = best ? Number(best.raw || 0) : 0;
        const gap = second ? raw - Number(second.raw || 0) : 1;
        // 十分自信があるときだけ1位を仮入力（候補リストは残してワンタップ修正可能）
        if (best && best.card && best.card.id && (raw >= 0.92 || (raw >= 0.88 && gap >= 0.025) || (Number(best.score) >= 88 && gap >= 0.02))) {
          applyRecognizedCard(best.card.id, true);
        }
        return matches || [];
      } catch (e) {
        console.error("AI Recognition Error:", e);
        updateStatus("⚠️ 解析エラー: " + (e.message || e));
        if (container) {
          container.classList.remove("hidden");
          container.innerHTML = `<div class="text-[11px] text-red-500 py-1.5 text-center">解析エラー: ${e.message || e}</div>`;
        }
        return [];
      }
    };

  // 元の処理を生かすためのプレースホルダー
  window._runCardImageRecognition_orig = async function(uploadedDataUrl) {
      const container = document.getElementById("similar-cards-suggest");
      if (!container) return;
      container.innerHTML = `<div class="text-[11px] text-purple-600 font-bold py-2 px-2 bg-purple-50 rounded-xl text-center">🤖 AIがトレカを解析中...</div>`;
      try {
        await ensureCatalogCardsLoaded();
        const matches = await findSimilarCardsWithAI(uploadedDataUrl);
        if (!matches || matches.length === 0) {
          container.innerHTML = `<div class="text-[11px] text-gray-400 py-1.5 text-center">一致する候補が見つかりませんでした（手動で選択してください）</div>`;
          return;
        }
        renderAiCandidates(container, matches);
      } catch (e) {
        console.warn("runCardImageRecognition AI error:", e);
        container.innerHTML = `<div class="text-[11px] text-gray-400 py-1 text-center">AI解析をスキップしました</div>`;
      }
    };

    window.applyRecognizedCard = function(cardId, keepList) {
      const found = findCardById(cardId);
      if (!found) return;
      const { card, album } = found;

      if (typeof selectPostCard === "function") {
        selectPostCard(card.id);
      }
      const giveEl = document.getElementById("input-give");
      const albumName = (album && album.name) || "";
      if (giveEl) {
        giveEl.value = [albumName, card.member || ""].filter(Boolean).join(" / ");
      }
      if (card.member) {
        const memEl = document.getElementById("input-member");
        if (memEl) {
          const hit = Array.from(memEl.options).find(o => o.value.includes(card.member) || card.member.includes(String(o.value).split(" ")[0]));
          if (hit) memEl.value = hit.value;
        }
      }

      const container = document.getElementById("similar-cards-suggest");
      const noteText = "「" + (card.member || "") + " / " + (card.name || "") + "」を入力しました";
      if (keepList && container) {
        let note = document.getElementById("ai-autofill-note");
        if (!note) {
          note = document.createElement("div");
          note.id = "ai-autofill-note";
          container.prepend(note);
        }
        note.className = "text-[11px] text-emerald-700 font-bold mb-1.5";
        note.textContent = noteText + "。違えば下の候補をタップ";
        return;
      }
      if (container) {
        container.innerHTML = `<div class="text-[11px] text-emerald-700 font-bold py-1.5 px-2 bg-emerald-50 rounded-xl text-center">✅ ${escapeHtml(noteText)}</div>`;
      }
    };


    let adminBulkFiles = [];
    let adminZipPackFiles = [];
    let detailCardId = null;

    // ===== まとめ画像からのトレカ自動検出＆切り抜き用ステート =====
    window.sheetCropState = {
      img: null,
      scale: 1,
      boxes: [], // { x, y, w, h, active, member }
      fileName: ""
    };

    function guessMemberFromFileName(filename) {
      const n = String(filename || "").toLowerCase();
      if (n.includes("wonhee") || n.includes("ウォニ")) return "ウォニ";
      if (n.includes("minju") || n.includes("ミンジュ")) return "ミンジュ";
      if (n.includes("iroha") || n.includes("イロハ")) return "イロハ";
      if (n.includes("moka") || n.includes("モカ")) return "モカ";
      if (n.includes("yuna") || n.includes("ユナ")) return "ユナ";
      if (n.includes("ot5") || n.includes("group") || n.includes("全員")) return "OT5";
      return "";
    }

    function guessAlbumFromPath(pathOrName, fallbackAlbumId) {
      const n = String(pathOrName || "").toLowerCase();
      for (const a of ILLIT_CARD_ALBUMS) {
        if (n.includes(a.id.toLowerCase()) || n.includes(a.name.toLowerCase())) {
          return a.id;
        }
      }
      return fallbackAlbumId || "other";
    }

    function getCardPhoto(cardId) {
  if (!cardId) return null;
  if (cardPhotoCache[cardId]) return cardPhotoCache[cardId];
  const fromCatalog = (Array.isArray(catalogCardsCache) ? catalogCardsCache : []).find(c => c && c.id === cardId);
  if (fromCatalog && (fromCatalog.image || fromCatalog.photo || fromCatalog.img)) {
    return fromCatalog.image || fromCatalog.photo || fromCatalog.img;
  }
  const fromStatic = (typeof staticPackCards !== "undefined" && Array.isArray(staticPackCards))
    ? staticPackCards.find(c => c && c.id === cardId)
    : null;
  if (fromStatic && (fromStatic.image || fromStatic.photo || fromStatic.img)) {
    return fromStatic.image || fromStatic.photo || fromStatic.img;
  }
  const fromCustom = (userData && Array.isArray(userData.customCards))
    ? userData.customCards.find(c => c && c.id === cardId)
    : null;
  if (fromCustom && (fromCustom.image || fromCustom.photo || fromCustom.img)) {
    return fromCustom.image || fromCustom.photo || fromCustom.img;
  }
  return null;
}
    function isAdminCatalogCard(cardId) {
      return catalogCardsCache.some(c => c.id === cardId);
    }

    function renderAdminCardsPanel(el) {
      if (!el) return;
      window.toggleSpCardSelect = function(id) {
        if (window._spBulkSelected.has(id)) window._spBulkSelected.delete(id);
        else window._spBulkSelected.add(id);
        renderStaticPackBulkManager();
      };
      window.filteredSelectSp = function() {
        const all = Array.isArray(staticPackCards) ? staticPackCards : [];
        all.filter(c => (window._spBulkAlbum==="ALL"||c.albumId===window._spBulkAlbum) && (window._spBulkMember==="ALL"||(c.member||"")===window._spBulkMember))
           .slice(0, window._spBulkLimit).forEach(c => window._spBulkSelected.add(c.id));
        renderStaticPackBulkManager();
      };
      window.applySpBulkMember = function() {
        if (!window._spBulkSelected.size) return /* alert hidden */ console.log("カードを選択してください");
        const m = document.getElementById("spBulkTargetMember").value;
        staticPackCards.forEach(c => { if (window._spBulkSelected.has(c.id)) c.member = m; });
        window._spBulkSelected.clear();
        renderStaticPackBulkManager();
        try { renderMyCardsList(); renderMyCardsMemberTabs(); } catch (_) {}
      };
      window.applySpBulkAlbum = function() {
        if (!window._spBulkSelected.size) return /* alert hidden */ console.log("カードを選択してください");
        const a = document.getElementById("spBulkTargetAlbum").value;
        staticPackCards.forEach(c => { if (window._spBulkSelected.has(c.id)) c.albumId = a; });
        window._spBulkSelected.clear();
        renderStaticPackBulkManager();
        try { renderMyCardsList(); renderMyCardsAlbumTabs(); } catch (_) {}
      };
      window.downloadUpdatedCatalogJson = function() {
        const payload = {
          updatedAt: new Date().toISOString(),
          source: "admin-bulk-editor",
          cards: (staticPackCards || []).map(c => ({
            id: c.id,
            albumId: c.albumId,
            name: c.name || "",
            member: c.member || "OT5",
            photo: c.photoUrl || c.photo || ""
          }))
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "catalog.json";
        a.click();
      };

      const photosReady = loadedPhotoAlbums.has(adminCardsAlbum);
      // 写真未読込でも絞り込みUIはすぐ出す（読み込み中でボタンが消えないようにする）
      if (!photosReady) {
        ensureCardPhotosLoaded(adminCardsAlbum).then(() => {
        loadedPhotoAlbums.add(adminCardsAlbum);
        loadedPhotoAlbums.add(adminCardsAlbum);
          const again = document.getElementById("admin-content");
          if (again && adminTab === "cards") renderAdminCardsPanel(again);
        }).catch(() => {
          loadedPhotoAlbums.add(adminCardsAlbum);
          const again = document.getElementById("admin-content");
          if (again && adminTab === "cards") renderAdminCardsPanel(again);
        });
      }
      const album = ILLIT_CARD_ALBUMS.find(a => a.id === adminCardsAlbum);
      let cards = getAlbumCards(adminCardsAlbum);
      if (!album) { el.innerHTML = "<p class='text-xs text-gray-500'>アルバムがありません</p>"; return; }
      // メンバー絞り込み
      const normMember = (s) => String(s || "").split(" ")[0];
      if (adminCardsMember && adminCardsMember === "__NONE__") {
        cards = cards.filter(c => !normMember(c.member));
      } else if (adminCardsMember && adminCardsMember !== "ALL") {
        cards = cards.filter(c => normMember(c.member) === adminCardsMember);
      }
      const memberOpts = ["", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"].map(m =>
        `<option value="${m}">${m || "（メンバーなし）"}</option>`
      ).join("");
      const activeChip = "filter-chip bg-teal-500 text-white shadow-md text-[11px] cursor-pointer select-none";
      const normalChip = "filter-chip bg-white/90 text-teal-800 hover:bg-white text-[11px] cursor-pointer select-none border border-teal-200/80";
      const albumTabsHtml = ILLIT_CARD_ALBUMS.map(a =>
        `<button type="button" data-admin-album="${escapeHtml(a.id)}" class="${a.id === adminCardsAlbum ? activeChip : normalChip}">${escapeHtml(a.name)}</button>`
      ).join("");
      // メンバーフィルターチップ（常に全メンバーを表示）
      const memberOrder = ["ALL", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"];
      const existingMembers = new Set(getAlbumCards(adminCardsAlbum).map(c => normMember(c.member)).filter(Boolean));
      const memberTabs = memberOrder.slice();
      existingMembers.forEach(m => { if (!memberTabs.includes(m)) memberTabs.push(m); });
      // メンバーなしカード用
      if (!memberTabs.includes("__NONE__")) {
        const hasNone = getAlbumCards(adminCardsAlbum).some(c => !normMember(c.member));
        if (hasNone) memberTabs.push("__NONE__");
      }
      const memActive = "filter-chip bg-gradient-to-r from-illit-purple to-illit-accent text-white shadow-md text-[11px] cursor-pointer select-none";
      const memNormal = "filter-chip bg-white/90 text-gray-700 hover:bg-white text-[11px] cursor-pointer select-none border border-gray-200";
      const memberLabel = (m) => m === "ALL" ? "全員" : (m === "__NONE__" ? "メンバーなし" : m);
      const memberTabsHtml = memberTabs.map(m =>
        `<button type="button" data-admin-member="${escapeHtml(m)}" class="${m === adminCardsMember ? memActive : memNormal}">${escapeHtml(memberLabel(m))}</button>`
      ).join("");
      const selectedCount = adminSelectedCardIds.size;
      // 表示中の削除可能カードID（管理者登録のみ・静的パックは除外）
      const deletableVisibleIds = cards.filter(c => (!!c.admin || isAdminCatalogCard(c.id)) && !c.staticPack).map(c => c.id);
      const filterAlbumName = album.name || adminCardsAlbum;
      const filterMemberName = memberLabel(adminCardsMember || "ALL");

      el.innerHTML = `
        <div class="liquid-glass rounded-2xl p-3 mb-3 space-y-2.5 border border-pink-200/70 bg-gradient-to-br from-pink-50/80 to-purple-50/70">
          <div class="text-xs font-bold text-pink-900 flex items-center gap-1.5">
            <span>🗑 削除用の絞り込み</span>
            <span class="font-normal text-[10px] text-gray-500">アルバム → メンバーの順で絞ってから削除</span>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 mb-1 px-0.5">アルバム</div>
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5" id="admin-card-album-tabs">${albumTabsHtml}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-500 mb-1 px-0.5">メンバー</div>
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5" id="admin-card-member-tabs">${memberTabsHtml}</div>
          </div>
          <div class="bg-white/80 rounded-xl px-3 py-2 text-[11px] text-gray-700 border border-white flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>表示中: <b class="text-illit-darkPurple">${escapeHtml(filterAlbumName)}</b> / <b class="text-illit-darkPurple">${escapeHtml(filterMemberName)}</b></span>
            <span class="text-gray-400">·</span>
            <span>全 <b>${cards.length}</b> 件</span>
            <span class="text-gray-400">·</span>
            <span>削除可能 <b class="text-red-600">${deletableVisibleIds.length}</b> 件</span>
            <span class="text-gray-400">·</span>
            <span>選択中 <b class="text-illit-darkPurple">${selectedCount}</b> 件</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <label class="flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer select-none bg-white/70 border border-white px-3 py-2 rounded-full">
              <input type="checkbox" id="admin-select-all-visible" onchange="adminToggleSelectAllVisible(this.checked)" class="w-4 h-4 rounded border-gray-300 text-illit-accent" ${deletableVisibleIds.length && deletableVisibleIds.every(id => adminSelectedCardIds.has(id)) ? "checked" : ""}>
              表示中を全選択
            </label>
            <button type="button" onclick="adminClearCardSelection()" class="text-[11px] font-bold text-gray-500 underline px-2 ${selectedCount ? "" : "hidden"}">選択解除</button>
            <button type="button" onclick="adminDeleteSelectedCards()" class="flex-1 min-w-[120px] bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm ${selectedCount ? "" : "opacity-40 pointer-events-none"}">
              🗑 選択を削除 (${selectedCount})
            </button>
            <button type="button" onclick="adminDeleteAllVisibleFiltered()" class="flex-1 min-w-[140px] bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm ${deletableVisibleIds.length ? "" : "opacity-40 pointer-events-none"}">
              表示中の削除可能をすべて削除 (${deletableVisibleIds.length})
            </button>
          </div>
          <p class="text-[10px] text-gray-500 leading-snug">※ GitHub静的パックのカードはここから削除できません。管理者登録分のみ対象です。</p>
        </div>
        <div class="grid grid-cols-1 gap-2 mb-3">
          <button type="button" onclick="adminDeduplicateCatalogCards()" class="w-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold py-2.5 rounded-full hover:bg-amber-100 transition shadow-sm">
            🧹 重複トレカを自動削除（画像が完全一致のみ・超厳格）
          </button>
          <button type="button" onclick="adminDeduplicateExactIds()" class="w-full bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold py-2.5 rounded-full hover:bg-rose-100 transition shadow-sm">
            🆔 全く同じIDの重複を削除
          </button>
        </div>
        <div class="liquid-glass rounded-2xl p-3 mb-3 space-y-2.5 border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-purple-50/80">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-indigo-900">🚀 2400枚大量パック生成（Firestore消費0回）</div>
            <span class="text-[10px] font-bold text-indigo-600">ZIP書き出し</span>
          </div>
          <p class="text-[11px] text-gray-600 leading-relaxed">
            選んだ画像を自動で<strong>透かし＋軽量JPEG圧縮</strong>し、GitHubに置くだけの <code>catalog.json</code> と <code>cards/</code> フォルダをZIPで出力します。
          </p>
          <div class="space-y-2">
            <select id="admin-zip-album" class="w-full liquid-glass-input rounded-lg px-2.5 py-2.5 text-xs">
              ${ILLIT_CARD_ALBUMS.map(a => `<option value="${a.id}" ${a.id === adminCardsAlbum ? "selected" : ""}>${a.name}</option>`).join("")}
            </select>
            <input id="admin-zip-prefix" type="text" maxlength="50" placeholder="共通名（空ならファイル名）" class="w-full liquid-glass-input rounded-lg px-2.5 py-2.5 text-xs">
          </div>

          <div class="grid grid-cols-1 gap-2">
            <label class="bg-white border border-indigo-200 text-[11px] text-indigo-800 font-bold py-2.5 px-3 rounded-full cursor-pointer text-center hover:bg-indigo-50 shadow-sm block">
              🖼️ 単体画像を複数追加
              <input type="file" accept="image/*" multiple class="hidden" onchange="handleAdminZipPackSelect(this)">
            </label>
            <label class="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[11px] font-bold py-2.5 px-3 rounded-full cursor-pointer text-center hover:opacity-95 shadow-sm block">
              ✂️ まとめ画像から自動切り抜き
              <input type="file" accept="image/*" multiple class="hidden" onchange="handleMultipleSheetCrop(this)">
            </label>
          </div>

          <!-- 自動切り抜きプレビュー＆調整エリア -->
          <div id="sheet-crop-area" class="hidden bg-white/95 rounded-xl p-3 border border-pink-200 space-y-2.5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-pink-700">✂️ トレカ枠 自動検出プレビュー</span>
              <button onclick="closeSheetCropArea()" class="text-xs text-gray-400 hover:text-gray-700 font-bold px-1">✕ 閉じる</button>
            </div>
            <p class="text-[10px] text-gray-600 leading-snug">
              赤い枠が有効なトレカです。感度で絞れます。枠をドラッグで移動、空きを押したまま伸ばして離すと枠を追加、枠をタップで解除、もう一度タップで戻します。間違えたら「ひとつ戻す」。
            </p>
            <div class="flex items-center gap-2 text-[11px] bg-pink-50/70 px-2.5 py-1.5 rounded-lg">
              <span class="text-gray-700 shrink-0">検出感度:</span>
              <input id="sheet-crop-threshold" type="range" min="8" max="60" value="22" class="flex-1 accent-pink-500" onchange="rerunSheetAutoDetect()">
              <span id="sheet-crop-detected-count" class="font-bold text-pink-700 shrink-0">0枚検出</span>
            </div>
            <div class="flex flex-wrap gap-1.5 items-center text-[10px]">
              <span class="text-gray-500 font-bold">行ごとのメンバー一括設定:</span>
              <button onclick="assignSheetRowMembers('yunah_order')" class="px-2 py-1 rounded bg-purple-100 text-purple-800 font-bold">上から ユナ→ミンジュ→モカ→ウォニ→イロハ</button>
              <button onclick="assignSheetRowMembers('wonhee_order')" class="px-2 py-1 rounded bg-teal-100 text-teal-800 font-bold">上から ウォニ→ミンジュ→モカ→ユナ→イロハ</button>
              <button onclick="assignSheetRowMembers('clear')" class="px-2 py-1 rounded bg-gray-100 text-gray-600">クリア</button>
            </div>
            <div class="flex justify-end mb-1"><button type="button" onclick="undoLastSheetBoxAction()" class="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold">↶ ひとつ戻す</button></div>
<div class="relative max-h-80 overflow-auto border border-gray-200 rounded-lg bg-gray-900 flex justify-center">
              <canvas id="sheet-crop-canvas" onclick="handleSheetCanvasClick(event)" class="max-w-full h-auto cursor-pointer"></canvas>
            </div>
            <div class="flex gap-2">
              <button onclick="closeSheetCropArea()" class="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-full">キャンセル</button>
              <button id="sheet-crop-confirm-btn" onclick="confirmAndNextSheet()" class="flex-[2] bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold py-2 rounded-full shadow">
                ✂️ 有効な枠を切り抜いてZIPリストへ追加
              </button>
            </div>
          </div>

                      <div class="flex items-center gap-2 bg-white/80 rounded-lg px-2.5 py-1.5 text-xs">
              <span class="text-gray-600 shrink-0 text-[11px] font-bold">全員一括:</span>
              <select onchange="setAllAdminZipMember(this.value)" class="flex-1 liquid-glass-input rounded px-2 py-1 text-xs">
                <option value="">（個別設定のまま）</option>
                <option value="ウォニ">ウォニ</option>
                <option value="ミンジュ">ミンジュ</option>
                <option value="イロハ">イロハ</option>
                <option value="モカ">モカ</option>
                <option value="ユナ">ユナ</option>
                <option value="OT5">OT5</option>
              </select>
            </div>
            <div id="admin-zip-list" class="space-y-1.5 max-h-56 overflow-y-auto pr-1"></div>

            
      <div class="bg-gradient-to-br from-fuchsia-50 to-indigo-50 border border-fuchsia-200 rounded-2xl p-3 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-fuchsia-900">📚 まとめ画像 一括切り抜き＆ZIP作成</div>
          <div class="flex items-center gap-2"><span id="batch-sheets-autosave-status" class="text-[10px] font-bold text-emerald-700"></span><span id="batch-sheets-count" class="text-[11px] font-bold text-fuchsia-700">0枚選択中</span></div>
        </div>
        <div class="text-[11px] text-gray-600 leading-relaxed">
          まとめ画像を何枚も同時に追加し、シートごとにアルバムとメンバーを選んでボタン1つで一気にZIP化します。
        </div>
        <div class="flex gap-2">
          <label class="flex-1 text-center bg-white border border-fuchsia-300 text-fuchsia-800 font-bold text-xs py-2 px-3 rounded-xl shadow-sm cursor-pointer active:scale-95 transition">
            ➕ まとめ画像を複数追加
            <input type="file" id="batch-sheets-input" accept="image/*" multiple class="hidden" onchange="handleBatchSheetsSelect(this)" />
          </label>
          <button type="button" onclick="clearBatchSheets()" class="bg-white border border-gray-200 text-gray-500 text-xs font-bold px-3 py-2 rounded-xl">クリア</button>
        </div>
        <div id="batch-sheets-list" class="space-y-2 max-h-72 overflow-y-auto"></div>
        <button type="button" id="batch-sheets-run-btn" onclick="runBatchSheetsToZip()" class="hidden w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs py-2.5 rounded-full shadow-md">
          ⚡ 全シートを一括切り抜きして一気にZIPダウンロード (v72)
        </button>
      </div>
      <label class="flex items-center gap-2 text-[11px] text-gray-700 px-1">
              <input type="checkbox" id="admin-zip-merge-existing" checked class="rounded">
              <span>すでに公開中の <code>catalog.json</code>（${staticPackCards.length}枚）に追記して合体する</span>
            </label>
            <button id="admin-zip-build-btn" onclick="buildAndDownloadCardPackZip()" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold py-2.5 rounded-full shadow-md">
              📦 透かし圧縮してZIPダウンロード
            </button>
            <button id="admin-zip-firestore-btn" onclick="adminRegisterZipPackToFirestore()" class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold py-2.5 rounded-full shadow-md">
              🔥 Firestoreに登録してMyトレカへ反映
            </button>
            <button id="admin-export-fs-catalog-btn" onclick="adminExportFirestoreToCatalogZip()" class="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-bold py-2.5 rounded-full shadow-md">
              ☁️→📦 Firebase写真をcatalog ZIPに一括出力
            </button>
            <p class="text-[10px] text-gray-500 text-center leading-snug">上2つ: 手元画像の登録　／　下: Firestoreの cardCatalog＋cardPhotos を GitHub用 catalog.json + cards/ に変換</p>
            <div id="admin-zip-progress" class="text-[11px] text-center text-indigo-800 font-medium hidden"></div>
          </div>
        </div>

        <details class="liquid-glass-input rounded-xl p-3 mb-3 border border-purple-200/80 bg-purple-50/40">
          <summary class="text-xs font-bold text-illit-darkPurple cursor-pointer select-none">📦 少数をすぐFirestoreに一括登録（数枚〜数十枚向け）</summary>
          <div class="space-y-2.5 mt-2.5">
            <div class="space-y-2">
              <select id="admin-bulk-album" class="w-full liquid-glass-input rounded-lg px-2.5 py-2.5 text-xs">
                ${ILLIT_CARD_ALBUMS.map(a => `<option value="${a.id}" ${a.id === adminCardsAlbum ? "selected" : ""}>${a.name}</option>`).join("")}
              </select>
              <input id="admin-bulk-prefix" type="text" maxlength="50" placeholder="共通名（例: Weverse特典）" class="w-full liquid-glass-input rounded-lg px-2.5 py-2.5 text-xs">
            </div>
            <label class="block w-full bg-white/90 border border-purple-200 text-xs text-illit-darkPurple font-bold py-2.5 rounded-full cursor-pointer text-center hover:bg-white shadow-sm">
              🖼️ 写真まとめて選択
              <input type="file" id="admin-bulk-photos" accept="image/*" multiple class="hidden" onchange="handleAdminBulkSelect(this)">
            </label>
            <div id="admin-bulk-preview-area" class="space-y-2 hidden">
              <div id="admin-bulk-list" class="space-y-1.5 max-h-60 overflow-y-auto pr-1"></div>
              <div class="flex gap-2 pt-1">
                <button onclick="clearAdminBulk()" class="flex-1 bg-white/80 text-gray-600 text-xs font-medium py-2 rounded-full border border-gray-200">クリア</button>
                <button id="admin-bulk-submit-btn" onclick="adminSubmitBulkCards()" class="flex-[2] bg-gradient-to-r from-illit-purple to-illit-accent text-white text-xs font-bold py-2 rounded-full shadow">まとめて登録</button>
              </div>
            </div>
          </div>
        </details>

        <details class="liquid-glass-input rounded-xl p-3 mb-3 border border-teal-200/60">
          <summary class="text-xs font-bold text-teal-800 cursor-pointer select-none">＋ 1枚ずつ登録する（写真なしも可）</summary>
          <div class="space-y-2 mt-2.5">
            <input id="admin-new-card-name" type="text" maxlength="80" placeholder="カード名（例: ウォニ Weverse特典）" class="w-full liquid-glass-input rounded-lg px-2.5 py-2 text-xs">
            <div class="flex gap-2">
              <select id="admin-new-card-member" class="flex-1 liquid-glass-input rounded-lg px-2 py-2 text-xs">${memberOpts}</select>
              <select id="admin-new-card-album" class="flex-1 liquid-glass-input rounded-lg px-2 py-2 text-xs">
                ${ILLIT_CARD_ALBUMS.map(a => `<option value="${a.id}" ${a.id === adminCardsAlbum ? "selected" : ""}>${a.name}</option>`).join("")}
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="flex-1 bg-white/80 border border-white text-[11px] text-gray-700 font-medium px-2.5 py-2 rounded-full cursor-pointer text-center hover:bg-white">
                写真を選ぶ（任意）
                <input type="file" id="admin-new-card-photo" accept="image/*" class="hidden">
              </label>
              <button onclick="adminRegisterNewCard()" class="shrink-0 bg-gradient-to-r from-teal-400 to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow">登録</button>
            </div>
            <p id="admin-new-card-photo-name" class="text-[10px] text-gray-400 truncate"></p>
          </div>
        </details>

        <div class="text-xs font-bold text-gray-700 mb-2">${escapeHtml(album.name)}${album.year ? " · " + album.year : ""}${adminCardsMember !== "ALL" && adminCardsMember !== "__NONE__" ? " / " + escapeHtml(adminCardsMember) : (adminCardsMember === "__NONE__" ? " / メンバーなし" : "")} · ${cards.length}種${!photosReady ? ' <span class="text-gray-400 font-normal">（写真読み込み中…）</span>' : ""}</div>
        <div class="space-y-2">
          ${(window._adminCardRenderLimit = window._adminCardRenderLimit || 30, cards.slice(0, window._adminCardRenderLimit)).map(c => {
            const photo = getCardPhoto(c.id);
            const isStatic = !!c.staticPack;
            const isAdminCard = !!c.admin || isAdminCatalogCard(c.id);
            const canSelect = isAdminCard && !isStatic;
            const isSelected = adminSelectedCardIds.has(c.id);
            const thumb = photo
              ? `<img loading="lazy" decoding="async" src="${photo}" class="w-14 h-14 object-cover rounded-lg border border-white shadow-sm">`
              : `<div class="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-lg">🃏</div>`;
            return `<div class="liquid-glass-input rounded-xl p-2.5 flex items-center gap-2.5 ${isSelected ? "ring-2 ring-pink-400 bg-pink-50/40" : ""}">
              ${canSelect ? `<input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-illit-accent shrink-0" ${isSelected ? "checked" : ""} onchange="toggleAdminCardSelect('${escapeHtml(c.id)}', this.checked)">` : `<span class="w-4 shrink-0"></span>`}
              ${thumb}
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-gray-900 truncate">${escapeHtml(c.name)}${isStatic ? ' <span class="text-[9px] text-indigo-600 font-bold">GitHubパック</span>' : (isAdminCard ? ' <span class="text-[9px] text-teal-600">管理者追加</span>' : "")}</div>
                <div class="text-[10px] text-gray-500">${c.member ? escapeHtml(c.member) : "—"} · <span class="text-gray-400">ID:</span> <span class="font-mono text-[9px]">${escapeHtml(c.id)}</span> · <span class="${photo ? "text-green-600" : "text-pink-600"}">${photo ? "写真あり" : "写真なし"}</span></div>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                ${isStatic ? `<span class="text-[9px] text-gray-400">静的配信中</span>` : `
                  <label class="bg-illit-purple/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full cursor-pointer hover:opacity-90 text-center">
                    ${photo ? "差し替え" : "写真登録"}
                    <input type="file" accept="image/*" class="hidden" onchange="adminUploadCardPhoto('${escapeHtml(c.id)}', this)">
                  </label>
                  ${photo ? `<button onclick="adminDeleteCardPhoto('${escapeHtml(c.id)}')" class="text-[10px] text-red-500 underline">写真削除</button>` : ""}
                  ${isAdminCard ? `<button onclick="adminDeleteCatalogCard('${escapeHtml(c.id)}')" class="text-[10px] text-red-600 underline">カード削除</button>` : ""}
                `}
              </div>
            </div>`;
          }).join("") || '<p class="text-xs text-gray-500 text-center py-4">カードがありません</p>'}
        </div>`;

      const photoInput = document.getElementById("admin-new-card-photo");
      if (photoInput) {
        photoInput.onchange = () => {
          const f = photoInput.files && photoInput.files[0];
          const label = document.getElementById("admin-new-card-photo-name");
          if (label) label.textContent = f ? f.name : "";
        };
      }
      renderAdminBulkList();
      updateAdminZipPackUI();
    }

   // ===== まとめ画像からのトレカ枠自動検出ロジック =====
    
    // ===== 複数まとめ画像の一括シート切り抜き＆ZIP化ロジック =====
    // ===== クラッシュ対策：iOS Safari完全対応 IndexedDB 即時保存＆確実復元 =====
    const BATCH_SHEET_DB_NAME = "illit_batch_sheet_draft_db_v3";
    const BATCH_SHEET_STORE_NAME = "drafts";

    function openBatchSheetDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(BATCH_SHEET_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(BATCH_SHEET_STORE_NAME)) {
            db.createObjectStore(BATCH_SHEET_STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    function compressSheetToBuffer(fileOrBlob, maxDim = 1400) {
      return new Promise((resolve) => {
        if (!fileOrBlob) return resolve(null);
        const url = URL.createObjectURL(fileOrBlob);
        const im = new Image();
        im.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(im.width, im.height));
            const w = Math.max(10, Math.round(im.width * scale));
            const h = Math.max(10, Math.round(im.height * scale));
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d");
            ctx.drawImage(im, 0, 0, w, h);
            URL.revokeObjectURL(url);
            c.toBlob(async (blob) => {
              c.width = 0;
              c.height = 0;
              if (!blob) return resolve(null);
              const buf = await blob.arrayBuffer();
              resolve(buf);
            }, "image/jpeg", 0.85);
          } catch (_) {
            URL.revokeObjectURL(url);
            resolve(null);
          }
        };
        im.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        im.src = url;
      });
    }

    window.scheduleSaveBatchSheetsDraft = function() {
      window.saveBatchSheetsDraftNow();
    };

    let isSavingBatchDraft = false;
    let pendingSaveBatchDraft = false;

    window.saveBatchSheetsDraftNow = async function() {
      if (isSavingBatchDraft) {
        pendingSaveBatchDraft = true;
        return;
      }
      isSavingBatchDraft = true;
      try {
        const statusEl = document.getElementById("batch-sheets-autosave-status");
        if (statusEl) statusEl.textContent = "⏳ 保存中...";

        const db = await openBatchSheetDB();
        const items = window.batchSheetItems || [];
        if (!items.length) {
          await new Promise((resolve) => {
            const tx = db.transaction(BATCH_SHEET_STORE_NAME, "readwrite");
            tx.objectStore(BATCH_SHEET_STORE_NAME).delete("latest_batch");
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
          if (statusEl) statusEl.textContent = "";
          return;
        }

        const serialized = [];
        for (const it of items) {
          if (!it._cachedBuffer && it.file) {
            it._cachedBuffer = await compressSheetToBuffer(it.file, 1400);
          }
          serialized.push({
            id: it.id,
            fileName: it.file ? it.file.name : (it.fileName || "sheet.jpg"),
            fileBuffer: it._cachedBuffer || null,
            albumId: it.albumId || "",
            member: it.member || "",
            threshold: Number(it.threshold || 22),
            detectedCount: it.detectedCount,
            customBoxes: Array.isArray(it.customBoxes) ? it.customBoxes.map(b => ({ ...b })) : null
          });
        }

        await new Promise((resolve, reject) => {
          const tx = db.transaction(BATCH_SHEET_STORE_NAME, "readwrite");
          tx.objectStore(BATCH_SHEET_STORE_NAME).put({
            savedAt: Date.now(),
            items: serialized
          }, "latest_batch");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        if (statusEl) {
          const d = new Date();
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const ss = String(d.getSeconds()).padStart(2, "0");
          statusEl.textContent = "💾 保存済 (" + hh + ":" + mm + ":" + ss + ")";
        }
      } catch (e) {
        console.warn("saveBatchSheetsDraftNow error:", e);
        const statusEl = document.getElementById("batch-sheets-autosave-status");
        if (statusEl) statusEl.textContent = "⚠️ 保存エラー";
      } finally {
        isSavingBatchDraft = false;
        if (pendingSaveBatchDraft) {
          pendingSaveBatchDraft = false;
          window.saveBatchSheetsDraftNow();
        }
      }
    };

    window.clearBatchSheetsDraftStorage = async function() {
      try {
        const db = await openBatchSheetDB();
        await new Promise((resolve) => {
          const tx = db.transaction(BATCH_SHEET_STORE_NAME, "readwrite");
          tx.objectStore(BATCH_SHEET_STORE_NAME).delete("latest_batch");
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        const statusEl = document.getElementById("batch-sheets-autosave-status");
        if (statusEl) statusEl.textContent = "";
      } catch (_) {}
    };

    window._batchDraftRestoredOnce = false;
    window.restoreBatchSheetsDraft = async function() {
      if (window._batchDraftRestoredOnce) return;
      try {
        const db = await openBatchSheetDB();
        const data = await new Promise((resolve, reject) => {
          const tx = db.transaction(BATCH_SHEET_STORE_NAME, "readonly");
          const req = tx.objectStore(BATCH_SHEET_STORE_NAME).get("latest_batch");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!data || !Array.isArray(data.items) || !data.items.length) return;
        if (window.batchSheetItems && window.batchSheetItems.length > 0) {
          window._batchDraftRestoredOnce = true;
          return;
        }

        window._batchDraftRestoredOnce = true;
        window.batchSheetItems = data.items.map(raw => {
          const buf = raw.fileBuffer;
          const blob = buf ? new Blob([buf], { type: "image/jpeg" }) : null;
          const file = blob ? new File([blob], (raw.fileName || "sheet").replace(/.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
          const url = blob ? URL.createObjectURL(blob) : "";
          const restoredItem = {
            id: raw.id || ("bs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)),
            file: file,
            _cachedBuffer: buf || null,
            fileName: raw.fileName || "sheet.jpg",
            fileType: "image/jpeg",
            previewUrl: url,
            imgObj: null,
            albumId: raw.albumId || "",
            member: raw.member || "",
            threshold: Number(raw.threshold || 22),
            detectedCount: raw.detectedCount !== undefined ? raw.detectedCount : null,
            customBoxes: Array.isArray(raw.customBoxes) ? raw.customBoxes : null
          };
          if (url) {
            const im = new Image();
            im.onload = () => {
              restoredItem.imgObj = im;
              if (restoredItem.detectedCount === null && typeof countDetectedBoxesForImage === "function") {
                restoredItem.detectedCount = countDetectedBoxesForImage(im, restoredItem.threshold);
              }
              if (typeof renderBatchSheetsList === "function") renderBatchSheetsList();
            };
            im.src = url;
          }
          return restoredItem;
        });

        if (typeof renderBatchSheetsList === "function") renderBatchSheetsList();
        const statusEl = document.getElementById("batch-sheets-autosave-status");
        if (statusEl) {
          statusEl.textContent = "♻️ クラッシュ前のデータ (" + window.batchSheetItems.length + "シート) を復元しました";
        }
      } catch (e) {
        console.warn("restoreBatchSheetsDraft error:", e);
      }
    };

    // 画面の初期化完了後＆まとめ切り抜き画面を開いた時にも確実に復元チェック
    setTimeout(() => window.restoreBatchSheetsDraft(), 800);
    setTimeout(() => window.restoreBatchSheetsDraft(), 2000);

    window.batchSheetItems = window.batchSheetItems || [];
    window.activeBatchPreviewIdx = -1;

    function getAvailableAlbumOptionsList() {
      const mainSel = document.getElementById("admin-zip-album");
      if (mainSel && mainSel.options && mainSel.options.length > 0) {
        return Array.from(mainSel.options).map(o => ({ id: o.value, name: o.textContent || o.value })).filter(a => a.id);
      }
      if (typeof ILLIT_CARD_ALBUMS !== "undefined" && Array.isArray(ILLIT_CARD_ALBUMS)) {
        return ILLIT_CARD_ALBUMS.map(a => ({ id: a.id, name: a.name }));
      }
      if (Array.isArray(window.ILLIT_CARD_ALBUMS)) {
        return window.ILLIT_CARD_ALBUMS.map(a => ({ id: a.id, name: a.name }));
      }
      return [];
    }

    function countDetectedBoxesForImage(img, thresholdVal) {
      try {
        const prevImg = window.sheetCropState.img;
        const prevBoxes = window.sheetCropState.boxes;
        const thrEl = document.getElementById("sheet-crop-threshold");
        const prevThr = thrEl ? thrEl.value : "22";
        if (thrEl) thrEl.value = String(thresholdVal || 22);
        window.sheetCropState.img = img;
        if (typeof rerunSheetAutoDetect === "function") {
          rerunSheetAutoDetect();
        }
        const count = Array.isArray(window.sheetCropState.boxes) ? window.sheetCropState.boxes.filter(b => b.active !== false).length : 0;
        if (thrEl) thrEl.value = prevThr;
        window.sheetCropState.img = prevImg;
        window.sheetCropState.boxes = prevBoxes;
        return count;
      } catch (_) {
        return 0;
      }
    }

    window.handleBatchSheetsSelect = function(inputEl) {
      const files = Array.from((inputEl && inputEl.files) || []);
      if (inputEl) inputEl.value = "";
      if (!files.length) return;
      const albums = getAvailableAlbumOptionsList();
      const defaultAlb = (document.getElementById("admin-zip-album") && document.getElementById("admin-zip-album").value) || (typeof adminCardsAlbum !== "undefined" ? adminCardsAlbum : "") || (albums[0] ? albums[0].id : "");
      const curThr = Number((document.getElementById("sheet-crop-threshold") && document.getElementById("sheet-crop-threshold").value) || 22);

      files.forEach(file => {
        const url = URL.createObjectURL(file);
        const guessed = (typeof guessMemberFromFileName === "function") ? guessMemberFromFileName(file.name) : "";
        const item = {
          id: "bs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          file: file,
          previewUrl: url,
          imgObj: null,
          albumId: defaultAlb,
          member: guessed || "",
          threshold: curThr,
          detectedCount: null,
          customBoxes: null
        };
        window.batchSheetItems.push(item);

        const im = new Image();
        im.onload = () => {
          item.imgObj = im;
          item.detectedCount = countDetectedBoxesForImage(im, item.threshold);
          renderBatchSheetsList();
        };
        im.src = url;
      });
      renderBatchSheetsList();
      if (typeof scheduleSaveBatchSheetsDraft === "function") scheduleSaveBatchSheetsDraft();
    };

    window.clearBatchSheets = function() {
      (window.batchSheetItems || []).forEach(it => {
        try { if (it.previewUrl) URL.revokeObjectURL(it.previewUrl); } catch (_) {}
      });
      window.batchSheetItems = [];
      window.activeBatchPreviewIdx = -1;
      renderBatchSheetsList();
      if (typeof clearBatchSheetsDraftStorage === "function") clearBatchSheetsDraftStorage();
    };

    window.removeBatchSheetItem = function(idx) {
      const item = window.batchSheetItems[idx];
      if (item && item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
      window.batchSheetItems.splice(idx, 1);
      if (window.activeBatchPreviewIdx === idx) window.activeBatchPreviewIdx = -1;
      renderBatchSheetsList();
      if (typeof scheduleSaveBatchSheetsDraft === "function") scheduleSaveBatchSheetsDraft();
    };

    window.updateBatchSheetField = function(idx, key, val) {
      const it = window.batchSheetItems[idx];
      if (!it) return;
      if (key === "threshold") {
        it.threshold = Number(val) || 22;
        it.customBoxes = null;
        if (it.imgObj) {
          it.detectedCount = countDetectedBoxesForImage(it.imgObj, it.threshold);
        }
        const lbl = document.getElementById("bs-thr-val-" + idx);
        if (lbl) lbl.textContent = String(it.threshold);
        const cnt = document.getElementById("bs-cnt-" + idx);
        if (cnt && it.detectedCount !== null) cnt.textContent = it.detectedCount + "枚検出";
        if (window.activeBatchPreviewIdx === idx) {
          previewBatchSheetItem(idx);
        }
      } else {
        it[key] = val;
      }
      if (typeof scheduleSaveBatchSheetsDraft === "function") scheduleSaveBatchSheetsDraft();
    };

    window.previewBatchSheetItem = function(idx) {
      const it = window.batchSheetItems[idx];
      if (!it || !it.imgObj) return;
      window.activeBatchPreviewIdx = idx;
      window.sheetCropState.img = it.imgObj;
      window.sheetCropState.fileName = it.file.name;
      const area = document.getElementById("sheet-crop-area");
      if (area) area.classList.remove("hidden");
      const thrEl = document.getElementById("sheet-crop-threshold");
      if (thrEl) thrEl.value = String(it.threshold || 22);
      if (Array.isArray(it.customBoxes) && it.customBoxes.length > 0) {
        window.sheetCropState.boxes = it.customBoxes.map(b => ({ ...b }));
        if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
      } else if (typeof rerunSheetAutoDetect === "function") {
        rerunSheetAutoDetect();
      }
      it.detectedCount = Array.isArray(window.sheetCropState.boxes) ? window.sheetCropState.boxes.filter(b => b.active !== false).length : 0;
      const cnt = document.getElementById("bs-cnt-" + idx);
      if (cnt) cnt.textContent = it.detectedCount + "枚検出";
      if (area) area.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    window.renderBatchSheetsList = function() {
      const listEl = document.getElementById("batch-sheets-list");
      const countEl = document.getElementById("batch-sheets-count");
      const runBtn = document.getElementById("batch-sheets-run-btn");
      const items = window.batchSheetItems || [];
      if (countEl) countEl.textContent = items.length + "枚選択中";
      if (runBtn) {
        if (items.length > 0) runBtn.classList.remove("hidden");
        else runBtn.classList.add("hidden");
      }
      if (!listEl) return;
      if (!items.length) {
        listEl.innerHTML = "";
        return;
      }
      const albums = getAvailableAlbumOptionsList();
      const members = ["", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"];
      listEl.innerHTML = items.map((it, idx) => {
        const albOpts = albums.length
          ? albums.map(a => "<option value=\"" + a.id + "\"" + (a.id === it.albumId ? " selected" : "") + ">" + a.name + "</option>").join("")
          : "<option value=\"\">アルバム未取得</option>";
        const memOpts = members.map(m => "<option value=\"" + m + "\"" + (m === it.member ? " selected" : "") + ">" + (m || "メンバー自動/なし") + "</option>").join("");
        const safeName = String(it.file.name || "").replace(/</g, "&lt;");
        const thr = Number(it.threshold || 22);
        const cntLabel = it.detectedCount !== null ? (it.detectedCount + "枚検出") : "解析中...";
        return "<div class=\"bg-white border border-fuchsia-200 rounded-xl p-2.5 space-y-1.5 shadow-xs\">" +
          "<div class=\"flex gap-2 items-center\">" +
            "<img src=\"" + it.previewUrl + "\" class=\"w-12 h-14 object-cover rounded-lg border border-gray-200 shrink-0\" />" +
            "<div class=\"flex-1 min-w-0 space-y-1\">" +
              "<div class=\"flex items-center justify-between gap-1\">" +
                "<div class=\"text-[11px] font-bold text-gray-800 truncate\">#" + (idx + 1) + " " + safeName + "</div>" +
                "<div class=\"flex items-center gap-1 shrink-0\">" +
                  "<button type=\"button\" onclick=\"previewBatchSheetItem(" + idx + ")\" class=\"bg-pink-50 border border-pink-200 text-pink-700 font-bold text-[10px] px-1.5 py-0.5 rounded\">🔍 枠確認</button>" +
                  "<button type=\"button\" onclick=\"removeBatchSheetItem(" + idx + ")\" class=\"text-gray-400 hover:text-red-500 text-xs px-1\">✕</button>" +
                "</div>" +
              "</div>" +
              "<select onchange=\"updateBatchSheetField(" + idx + ", 'albumId', this.value)\" class=\"w-full liquid-glass-input rounded-lg px-2 py-1 text-[11px]\">" + albOpts + "</select>" +
              "<select onchange=\"updateBatchSheetField(" + idx + ", 'member', this.value)\" class=\"w-full liquid-glass-input rounded-lg px-2 py-1 text-[11px]\">" + memOpts + "</select>" +
            "</div>" +
          "</div>" +
          "<div class=\"flex items-center gap-2 bg-fuchsia-50/70 px-2 py-1 rounded-lg text-[10px]\">" +
            "<span class=\"text-gray-700 shrink-0\">絞り(感度): <strong id=\"bs-thr-val-" + idx + "\" class=\"text-fuchsia-800\">" + thr + "</strong></span>" +
            "<input type=\"range\" min=\"8\" max=\"60\" value=\"" + thr + "\" oninput=\"updateBatchSheetField(" + idx + ", 'threshold', this.value)\" class=\"flex-1 accent-fuchsia-600\" />" +
            "<span id=\"bs-cnt-" + idx + "\" class=\"font-bold text-pink-700 shrink-0\">" + cntLabel + "</span>" +
          "</div>" +
        "</div>";
      }).join("");
    };

    window.runBatchSheetsToZip = async function() {
      const items = window.batchSheetItems || [];
      if (!items.length) {
        /* alert hidden */ console.log("まとめ画像を1枚以上追加してください。");
        return;
      }
      if (typeof JSZip === "undefined") {
        /* alert hidden */ console.log("ZIPライブラリ(JSZip)が読み込まれていません。ページを再読み込みしてください。");
        return;
      }

      const btn = document.getElementById("batch-sheets-run-btn");
      const origText = btn ? btn.textContent : "✂️ 全シートを一括切り抜きして一気にZIPダウンロード";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ 切り抜き準備中...";
      }
      await new Promise(r => setTimeout(r, 20));

      const mainAlbumEl = document.getElementById("admin-zip-album");
      const origMainAlbum = mainAlbumEl ? mainAlbumEl.value : "";

      try {
        const croppedList = [];

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (btn) btn.textContent = "切り抜き中 (" + (i + 1) + "/" + items.length + "シート目)...";
          await new Promise(r => setTimeout(r, 20));

          let needRevoke = false;
          let objUrl = "";
          const img = it.imgObj || await new Promise((resolve, reject) => {
            if (!it.file) return reject(new Error("画像データが見つかりません"));
            objUrl = URL.createObjectURL(it.file);
            needRevoke = true;
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = (err) => {
              URL.revokeObjectURL(objUrl);
              reject(err);
            };
            im.src = objUrl;
          });

          let boxes = [];
          if (Array.isArray(it.customBoxes) && it.customBoxes.length > 0) {
            boxes = it.customBoxes.filter(b => b && b.active !== false && b.w >= 10 && b.h >= 10);
          } else if (typeof detectCardBoxesFromImage === "function") {
            boxes = detectCardBoxesFromImage(img, Number(it.threshold || 22)) || [];
          } else {
            window.sheetCropState = window.sheetCropState || {};
            window.sheetCropState.img = img;
            const thEl = document.getElementById("sheet-crop-threshold");
            if (thEl) thEl.value = String(it.threshold || 22);
            if (typeof rerunSheetAutoDetect === "function") rerunSheetAutoDetect();
            boxes = (window.sheetCropState && Array.isArray(window.sheetCropState.boxes))
              ? window.sheetCropState.boxes.filter(b => b && b.active !== false && b.w >= 10 && b.h >= 10)
              : [];
          }

          const albumId = it.albumId || origMainAlbum || "srm";
          const cropCanvas = document.createElement("canvas");
          const cctx = cropCanvas.getContext("2d");

          for (let bi = 0; bi < boxes.length; bi++) {
            const b = boxes[bi];
            const sx = Math.max(0, Math.round(b.x));
            const sy = Math.max(0, Math.round(b.y));
            const sw = Math.min(img.width - sx, Math.round(b.w));
            const sh = Math.min(img.height - sy, Math.round(b.h));
            if (sw < 10 || sh < 10) continue;

            // 1. クリーン画像（判定用：元解像度・透かしなし）
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            cctx.clearRect(0, 0, sw, sh);
            cctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            const cleanBlob = await new Promise(res => cropCanvas.toBlob(res, "image/jpeg", 0.92));

            // 2. 公開用画像（解像度落とし・透かしあり）
            const maxW = 360;
            const scale = sw > maxW ? (maxW / sw) : 1;
            const dw = Math.max(1, Math.round(sw * scale));
            const dh = Math.max(1, Math.round(sh * scale));
            cropCanvas.width = dw;
            cropCanvas.height = dh;
            cctx.clearRect(0, 0, dw, dh);
            cctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

            // 透かし（ウォーターマーク）描画
            cctx.save();
            cctx.globalAlpha = 0.28;
            cctx.fillStyle = "#ffffff";
            cctx.strokeStyle = "rgba(0,0,0,0.45)";
            cctx.lineWidth = 2;
            const fontSize = Math.max(14, Math.round(dw * 0.085));
            cctx.font = "bold " + fontSize + "px sans-serif";
            cctx.textAlign = "center";
            cctx.textBaseline = "middle";
            cctx.translate(dw / 2, dh / 2);
            cctx.rotate(-Math.PI / 6);
            cctx.strokeText("ILLIT TRADE SAMPLE", 0, 0);
            cctx.fillText("ILLIT TRADE SAMPLE", 0, 0);
            cctx.restore();

            const wmBlob = await new Promise(res => cropCanvas.toBlob(res, "image/jpeg", 0.78));

            if (cleanBlob && wmBlob) {
              croppedList.push({
                cleanBlob,
                wmBlob,
                albumId,
                member: (b.member || it.member || "").trim()
              });
            }

            if (bi % 5 === 4) {
              if (btn) btn.textContent = "切り抜き中 (" + (i + 1) + "/" + items.length + "シート: " + (bi + 1) + "/" + boxes.length + "枚)...";
              await new Promise(r => setTimeout(r, 15));
            }
          }

          cropCanvas.width = 0;
          cropCanvas.height = 0;
          if (needRevoke && objUrl) URL.revokeObjectURL(objUrl);
        }

        if (croppedList.length === 0) {
          /* alert hidden */ console.log("切り抜かれたトレカが0枚でした。各シートの「絞り(感度)」スライダーを調整してください。");
          return;
        }

        if (btn) btn.textContent = "📦 ZIPパッケージ作成中 (" + croppedList.length + "枚)...";
        await new Promise(r => setTimeout(r, 20));

        const zip = new JSZip();
        const cardsFolder = zip.folder("cards");
        const cleanFolder = zip.folder("clean");
        const batchTs = Date.now().toString(36);
        const catalogList = [];

        for (let idx = 0; idx < croppedList.length; idx++) {
          const item = croppedList[idx];
          const cardId = "pk_" + batchTs + "_" + String(idx + 1).padStart(4, "0");
          const fileName = cardId + ".jpg";

          cardsFolder.file(fileName, item.wmBlob);
          cleanFolder.file(fileName, item.cleanBlob);

          catalogList.push({
            id: cardId,
            albumId: item.albumId,
            member: item.member,
            image: "cards/" + fileName
          });
        }

        zip.file("catalog.json", JSON.stringify({
          updatedAt: new Date().toISOString(),
          cards: catalogList
        }, null, 2));

        const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        const zipFileName = "illit-cards-pack-" + batchTs + ".zip";
        const url = URL.createObjectURL(zipBlob);
        const sizeMb = (zipBlob.size / (1024 * 1024)).toFixed(1);

        // 画面最前面に確実に見えるダウンロード完了バナーを表示
        let modal = document.getElementById("batch-zip-ready-modal");
        if (!modal) {
          modal = document.createElement("div");
          modal.id = "batch-zip-ready-modal";
          modal.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:16px;";
          document.body.appendChild(modal);
        }
        modal.innerHTML =
          '<div style="background:#fff;border-radius:20px;padding:22px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.3);">' +
            '<div style="font-size:18px;font-weight:900;color:#065f46;margin-bottom:8px;">✅ 一括ZIP作成完了！</div>' +
            '<div style="font-size:13px;color:#374151;margin-bottom:14px;line-height:1.5;">' +
              '<b>' + croppedList.length + '枚</b>（' + sizeMb + 'MB）<br>' +
              '同一IDで <b>cards/（透かし・低解像度）</b> と <b>clean/（判定用）</b> を同梱しました。' +
            '</div>' +
            '<a href="' + url + '" download="' + zipFileName + '" style="display:block;width:100%;padding:14px 16px;border-radius:14px;background:#059669;color:#fff;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:10px;">📦 ZIPをダウンロード保存</a>' +
            '<button type="button" onclick="document.getElementById(\'batch-zip-ready-modal\').remove()" style="width:100%;padding:10px;border-radius:12px;background:#f3f4f6;color:#4b5563;font-weight:700;font-size:13px;border:none;">閉じる</button>' +
          '</div>';
      } catch (e) {
        console.error("runBatchSheetsToZip error:", e);
        /* alert hidden */ console.log("一括切り抜き中にエラーが発生しました: " + (e && e.message ? e.message : e));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = origText;
        }
      }
    };

    window.handleSheetAutoCropSelect = function(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      inputEl.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          sheetCropState.img = img;
          sheetCropState.fileName = file.name;
          const area = document.getElementById("sheet-crop-area");
          if (area) area.classList.remove("hidden");
          rerunSheetAutoDetect();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    window.mountBundleCropTool = function(on) {
      const area = document.getElementById("sheet-crop-area");
      const host = document.getElementById("bundle-crop-host");
      if (!area) return;
      if (!window._sheetCropParent) {
        window._sheetCropParent = area.parentNode;
        window._sheetCropNext = area.nextSibling;
      }
      const btn = document.getElementById("sheet-crop-confirm-btn");
      if (on && host) {
        host.appendChild(area);
        area.classList.remove("hidden");
        area.dataset.mode = "bundle";
        area.style.cssText = "";
        if (btn) { btn.textContent = "✂️ 有効な枠を切り抜く"; btn.onclick = cropBundleSheet; }
      } else if (window._sheetCropParent) {
        area.classList.add("hidden");
        area.dataset.mode = "";
        area.style.cssText = "";
        if (btn) { btn.textContent = "✂️ 有効な枠を切り抜いてZIPリストへ追加"; btn.onclick = window.confirmAndNextSheet; }
        window._sheetCropParent.insertBefore(area, window._sheetCropNext || null);
      }
    };
    
    function paintBundleCrops(list) {
      const el = document.getElementById("bundle-crop-preview");
      if (!el) return;
      el.innerHTML = (list || []).map(src => `<img src="${src}" alt="" class="w-full aspect-[3/4] object-cover rounded-md border border-gray-200">`).join("");
    }
    async function cropBundleSheet() {
            const areaEl = document.getElementById("sheet-crop-area");
            if (window.__isBulkMode || (areaEl && areaEl.dataset.mode === "bundle")) {
              const img = sheetCropState && sheetCropState.img;
              const boxes = ((sheetCropState && sheetCropState.boxes) || []).filter(b => b && b.active !== false && b.w > 8 && b.h > 8);
              if (!img || !boxes.length) return /* alert hidden */ console.log("有効な枠がありません。感度を下げるか「枠の追加」で枠を設定してください。");
              const iw = img.naturalWidth || img.width || 1;
              const ih = img.naturalHeight || img.height || 1;
              window.__bulkSlots = boxes.map((b, idx) => {
                const isRatio = (b.w <= 1 && b.h <= 1);
                const isPct = (!isRatio && b.w <= 100 && b.h <= 100 && iw > 150);
                const x = isRatio ? b.x * 100 : isPct ? b.x : (b.x / iw) * 100;
                const y = isRatio ? b.y * 100 : isPct ? b.y : (b.y / ih) * 100;
                const w = isRatio ? b.w * 100 : isPct ? b.w : (b.w / iw) * 100;
                const h = isRatio ? b.h * 100 : isPct ? b.h : (b.h / ih) * 100;
                return {
                  id: b.id || ("slot_" + (idx + 1)),
                  x: +Math.max(0, Math.min(98, x)).toFixed(2),
                  y: +Math.max(0, Math.min(98, y)).toFixed(2),
                  w: +Math.max(2, Math.min(100, w)).toFixed(2),
                  h: +Math.max(2, Math.min(100, h)).toFixed(2),
                  sold: false,
                  tradeId: null
                };
              });
              const detectEl = document.getElementById("bundle-detect");
              if (detectEl) detectEl.innerHTML = `<span class="text-emerald-700 font-bold">✅ ${window.__bulkSlots.length}枠の設定が完了しました！下の「出品する」を押してください。</span>`;
              if (areaEl) areaEl.classList.add("hidden");
              if (typeof showToast === "function") showToast(`${window.__bulkSlots.length}枠を設定しました！`, "success");
              return;
            }
      const img = sheetCropState && sheetCropState.img;
      const boxes = ((sheetCropState && sheetCropState.boxes) || []).filter(b => b && b.active !== false && b.w > 8 && b.h > 8);
      if (!img || !boxes.length) return /* alert hidden */ console.log("有効な枠がありません。");
      const btn = document.getElementById("sheet-crop-confirm-btn");
      if (btn) { btn.disabled = true; btn.textContent = "切り抜き中..."; }
      const crops = [];
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (btn) btn.textContent = "切り抜き中... (" + (i + 1) + "/" + boxes.length + ")";
        await new Promise(r => setTimeout(r, 10));
        const sx = Math.max(0, Math.round(Number(b.x) || 0));
        const sy = Math.max(0, Math.round(Number(b.y) || 0));
        const cropW = Math.max(1, Math.min(img.naturalWidth || img.width, Math.round(Number(b.w) || 1)));
        const cropH = Math.max(1, Math.min(img.naturalHeight || img.height, Math.round(Number(b.h) || 1)));
        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cropW, cropH);
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        canvas.width = 0; canvas.height = 0;
        if (isJpegData(dataUrl) || (typeof dataUrl === "string" && dataUrl.indexOf("data:image/jpeg") === 0)) crops.push(dataUrl);
      }
      window._bundleCrops = crops;
      window._pendingBundleBoxes = boxes.map(b => ({
        x: b.x / img.width, y: b.y / img.height, w: b.w / img.width, h: b.h / img.height, state: "open"
      }));
      paintBundleCrops(crops.map(src => {
        try {
          return src;
        } catch (_) { return src; }
      }));
      const note = document.getElementById("bundle-detect");
      if (note) note.textContent = crops.length + "枚を写真から切り抜きました";
      if (btn) { btn.disabled = false; btn.textContent = "✂️ 有効な枠を切り抜く"; }
      showToast(crops.length + "枚を切り抜きました", "success");
    }
    function confirmBundleFrames() { return cropBundleSheet(); }
    window.closeSheetCropArea = function() {
      sheetCropState.img = null;
      sheetCropState.boxes = [];
      const area = document.getElementById("sheet-crop-area");
      if (area) area.classList.add("hidden");
    };

    window.rerunSheetAutoDetect = function() {
      const img = sheetCropState && sheetCropState.img;
      if (!img) return;
      const thrInput = document.getElementById("sheet-crop-threshold");
      const sensitivity = Number(thrInput ? thrInput.value : 22) || 22;

      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const sw = Math.max(10, Math.round(img.width * scale));
      const sh = Math.max(10, Math.round(img.height * scale));

      const off = document.createElement("canvas");
      off.width = sw;
      off.height = sh;
      const ctx = off.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, sw, sh);
      const { data } = ctx.getImageData(0, 0, sw, sh);
      off.width = 0;
      off.height = 0;

      // 1. 画面直撮りの黒ベゼルを避けて内側領域(14%〜86%)からシート台紙色を推定
      const colorCounts = new Map();
      const addSample = (x, y) => {
        if (x < 0 || x >= sw || y < 0 || y >= sh) return;
        const i = (y * sw + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r < 45 && g < 45 && b < 45) return;
        const key = ((r & 0xf8) << 16) | ((g & 0xf8) << 8) | (b & 0xf8);
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      };
      const x0 = Math.round(sw * 0.14), x1 = Math.round(sw * 0.86);
      const y0 = Math.round(sh * 0.24), y1 = Math.round(sh * 0.96);
      for (let y = y0; y <= y1; y += 3) {
        for (let x = x0; x <= x1; x += 6) {
          addSample(x, y);
        }
      }
      const sortedBg = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
      const bg1 = sortedBg[0] ? sortedBg[0][0] : ((220 << 16) | (220 << 8) | 220);
      const bg1R = (bg1 >> 16) & 0xff, bg1G = (bg1 >> 8) & 0xff, bg1B = bg1 & 0xff;

      // 2. 台紙色との色差 ＋ 局所エッジ勾配による前景マスク
      const totalPx = sw * sh;
      const fg = new Uint8Array(totalPx);
      const colorTol = Math.max(8, sensitivity * 1.25);
      const edgeTol = Math.max(9, sensitivity * 0.95);

      for (let y = 1; y < sh - 1; y++) {
        const rowOff = y * sw;
        for (let x = 1; x < sw - 1; x++) {
          const idx = rowOff + x;
          const p = idx * 4;
          const r = data[p], g = data[p + 1], b = data[p + 2];

          if (r < 38 && g < 38 && b < 38 && (x < sw * 0.12 || x > sw * 0.88)) {
            continue;
          }

          const diff = (Math.abs(r - bg1R) + Math.abs(g - bg1G) + Math.abs(b - bg1B)) / 3;
          if (diff > colorTol) {
            fg[idx] = 1;
            continue;
          }

          const pR = (idx + 1) * 4;
          const pD = (idx + sw) * 4;
          const gx = (Math.abs(r - data[pR]) + Math.abs(g - data[pR + 1]) + Math.abs(b - data[pR + 2])) / 3;
          const gy = (Math.abs(r - data[pD]) + Math.abs(g - data[pD + 1]) + Math.abs(b - data[pD + 2])) / 3;
          if (gx > edgeTol || gy > edgeTol) {
            fg[idx] = 1;
          }
        }
      }

      // 3. 連結成分ラベリング（BFS）
      const visited = new Uint8Array(totalPx);
      const queue = new Int32Array(totalPx);
      const rawBlobs = [];
      const minSide = Math.max(16, Math.round(Math.min(sw, sh) * 0.032));

      for (let y = 1; y < sh - 1; y++) {
        for (let x = 1; x < sw - 1; x++) {
          const start = y * sw + x;
          if (!fg[start] || visited[start]) continue;

          let head = 0, tail = 0;
          queue[tail++] = start;
          visited[start] = 1;

          let minX = x, maxX = x, minY = y, maxY = y, area = 0;
          while (head < tail) {
            const cur = queue[head++];
            const cx = cur % sw;
            const cy = (cur - cx) / sw;
            area++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            const n1 = cur - 1, n2 = cur + 1, n3 = cur - sw, n4 = cur + sw;
            if (cx > 1 && fg[n1] && !visited[n1]) { visited[n1] = 1; queue[tail++] = n1; }
            if (cx < sw - 2 && fg[n2] && !visited[n2]) { visited[n2] = 1; queue[tail++] = n2; }
            if (cy > 1 && fg[n3] && !visited[n3]) { visited[n3] = 1; queue[tail++] = n3; }
            if (cy < sh - 2 && fg[n4] && !visited[n4]) { visited[n4] = 1; queue[tail++] = n4; }
          }

          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          if (bw < minSide || bh < minSide) continue;
          if (bw > sw * 0.35 || bh > sh * 0.22) continue;

          const fillRatio = area / (bw * bh);
          if (fillRatio < 0.38) continue;

          rawBlobs.push({ minX, minY, maxX, maxY, bw, bh, area, fillRatio });
        }
      }

      // 4. トレカらしい縦長矩形（比率 1.25〜1.85）から標準カードサイズ（中央値）を厳密に算出
      const strictCards = rawBlobs.filter(b => {
        const ratio = b.bh / b.bw;
        return ratio >= 1.25 && ratio <= 1.85;
      });
      const refPool = strictCards.length >= 2 ? strictCards : rawBlobs;
      const sortedW = refPool.map(b => b.bw).sort((a, b) => a - b);
      const sortedH = refPool.map(b => b.bh).sort((a, b) => a - b);
      const stdW = sortedW.length ? sortedW[Math.floor(sortedW.length / 2)] : Math.round(sw * 0.055);
      // 高さは標準幅の 1.48〜1.56 倍の範囲にクランプして下部の文字ラベル混入を完全に防ぐ
      const rawMedH = sortedH.length ? sortedH[Math.floor(sortedH.length / 2)] : Math.round(stdW * 1.52);
      const stdH = Math.max(Math.round(stdW * 1.45), Math.min(rawMedH, Math.round(stdW * 1.56)));

      // 5. 単体・横結合（2〜3枚）・縦結合（2段）を標準カードサイズ(stdW x stdH)で綺麗に切り出し
      const singleCards = [];
      const mergedCards = [];

      for (const b of rawBlobs) {
        if (b.bh < stdH * 0.68 || b.bw < stdW * 0.65) continue;
        if (b.bh > stdH * 2.35 || b.bw > stdW * 3.4) continue;

        const ratio = b.bh / b.bw;
        // 単体カード：上端(minY)と水平中心を基準に、サイズは全カード共通の stdW x stdH に統一
        if (ratio >= 1.18 && ratio <= 2.15 && b.bw >= stdW * 0.68 && b.bw <= stdW * 1.32) {
          const centerX = b.minX + b.bw / 2;
          singleCards.push({
            minX: Math.round(centerX - stdW / 2),
            minY: b.minY,
            bw: stdW,
            bh: stdH
          });
          continue;
        }

        // 縦に2段くっついた塊を上下2枚に分離
        if (b.bw >= stdW * 0.72 && b.bw <= stdW * 1.32 && b.bh >= stdH * 1.75 && b.bh <= stdH * 2.35) {
          const centerX = b.minX + b.bw / 2;
          const nx = Math.round(centerX - stdW / 2);
          const halfH = b.bh / 2;
          mergedCards.push({ minX: nx, minY: b.minY, bw: stdW, bh: stdH });
          mergedCards.push({ minX: nx, minY: Math.round(b.minY + halfH), bw: stdW, bh: stdH });
          continue;
        }

        // 横に2枚または3枚くっついた塊を左右に分離
        const cols = Math.round(b.bw / stdW);
        if ((cols === 2 || cols === 3) && Math.abs(b.bw - cols * stdW) < stdW * 0.35 && b.bh <= stdH * 1.45) {
          const cellW = b.bw / cols;
          for (let c = 0; c < cols; c++) {
            const centerX = b.minX + (c + 0.5) * cellW;
            mergedCards.push({
              minX: Math.round(centerX - stdW / 2),
              minY: b.minY,
              bw: stdW,
              bh: stdH
            });
          }
        }
      }

      // 6. 重複排除（IoU 18%以上は追加しない）
      const overlapRatio = (a, b) => {
        const ix0 = Math.max(a.minX, b.minX);
        const iy0 = Math.max(a.minY, b.minY);
        const ix1 = Math.min(a.minX + a.bw, b.minX + b.bw);
        const iy1 = Math.min(a.minY + a.bh, b.minY + b.bh);
        if (ix1 <= ix0 || iy1 <= iy0) return 0;
        const inter = (ix1 - ix0) * (iy1 - iy0);
        const minArea = Math.min(a.bw * a.bh, b.bw * b.bh);
        return minArea > 0 ? inter / minArea : 0;
      };

      const deduped = [];
      for (const cand of [...singleCards, ...mergedCards]) {
        if (!deduped.some(kept => overlapRatio(cand, kept) > 0.18)) {
          deduped.push(cand);
        }
      }

      // 7. 行ごとのY座標スナップ（同じ行のカードの上端Y位置を一直線にピタッと揃える）＋ 欠損補完
      deduped.sort((a, b) => {
        const rowTol = Math.max(10, stdH * 0.35);
        if (Math.abs(a.minY - b.minY) > rowTol) return a.minY - b.minY;
        return a.minX - b.minX;
      });

      const rowsGrouped = [];
      for (const item of deduped) {
        const lastRow = rowsGrouped[rowsGrouped.length - 1];
        if (lastRow && Math.abs(item.minY - lastRow[0].minY) <= Math.max(10, stdH * 0.35)) {
          lastRow.push(item);
        } else {
          rowsGrouped.push([item]);
        }
      }

      const alignedAndCompleted = [];
      for (const row of rowsGrouped) {
        row.sort((a, b) => a.minX - b.minX);
        // 行の中央値Yに揃えて、ガタつきを完全に解消
        const ys = row.map(r => r.minY).sort((a, b) => a - b);
        const snapY = ys[Math.floor(ys.length / 2)];
        row.forEach(r => { r.minY = snapY; r.bw = stdW; r.bh = stdH; });

        alignedAndCompleted.push(...row);

        if (row.length >= 3) {
          const gaps = [];
          for (let i = 1; i < row.length; i++) {
            const g = row[i].minX - row[i - 1].minX;
            if (g > stdW * 0.92 && g < stdW * 1.45) gaps.push(g);
          }
          if (gaps.length >= 2) {
            gaps.sort((a, b) => a - b);
            const stepX = gaps[Math.floor(gaps.length / 2)];
            for (let i = 0; i < row.length - 1; i++) {
              const diff = row[i + 1].minX - row[i].minX;
              const missing = Math.round(diff / stepX) - 1;
              if (missing === 1 || missing === 2) {
                for (let m = 1; m <= missing; m++) {
                  const cand = {
                    minX: Math.round(row[i].minX + m * stepX),
                    minY: snapY,
                    bw: stdW,
                    bh: stdH
                  };
                  if (!alignedAndCompleted.some(kept => overlapRatio(cand, kept) > 0.15)) {
                    alignedAndCompleted.push(cand);
                  }
                }
              }
            }
          }
        }
      }

      alignedAndCompleted.sort((a, b) => {
        const rowTol = Math.max(10, stdH * 0.35);
        if (Math.abs(a.minY - b.minY) > rowTol) return a.minY - b.minY;
        return a.minX - b.minX;
      });

      const rawBoxes = alignedAndCompleted.map(c => ({
        x: Math.max(0, Math.round(c.minX / scale)),
        y: Math.max(0, Math.round(c.minY / scale)),
        w: Math.round(c.bw / scale),
        h: Math.round(c.bh / scale),
        active: true,
        member: ""
      }));

      sheetCropState.boxes = rawBoxes;
      drawSheetCropPreview();
    };

    function drawSheetCropPreview() {
      const img = sheetCropState.img;
      const canvas = document.getElementById("sheet-crop-canvas");
      const countEl = document.getElementById("sheet-crop-detected-count");
      if (!img || !canvas) return;

      const maxDispW = 760;
      const dispScale = img.width > maxDispW ? maxDispW / img.width : 1;
      sheetCropState.scale = dispScale;
      canvas.width = Math.round(img.width * dispScale);
      canvas.height = Math.round(img.height * dispScale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let activeCount = 0;
      sheetCropState.boxes.forEach((b, idx) => {
        if (b.active) activeCount++;
        const bx = b.x * dispScale;
        const by = b.y * dispScale;
        const bw = b.w * dispScale;
        const bh = b.h * dispScale;

        ctx.lineWidth = b.active ? 2.5 : 1.5;
        ctx.strokeStyle = b.active ? "#ff1e6e" : "rgba(180,180,180,0.6)";
        ctx.fillStyle = b.active ? "rgba(255, 30, 110, 0.14)" : "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);

        if (b.active) {
          const label = b.member ? `${idx + 1}:${b.member}` : `${idx + 1}`;
          ctx.fillStyle = "#ff1e6e";
          ctx.fillRect(bx, by, Math.min(bw, 54), 15);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(label, bx + 3, by + 11);
        }
      });

      if (countEl) countEl.textContent = `${activeCount}枚有効 / 全${sheetCropState.boxes.length}枠`;
    }

    window.syncActiveBatchSheetBoxes = function() {
      const idx = window.activeBatchPreviewIdx;
      if (typeof idx === "number" && idx >= 0 && window.batchSheetItems && window.batchSheetItems[idx]) {
        const it = window.batchSheetItems[idx];
        it.customBoxes = (sheetCropState.boxes || []).map(b => ({ ...b }));
        it.detectedCount = it.customBoxes.filter(b => b.active !== false).length;
        const cnt = document.getElementById("bs-cnt-" + idx);
        if (cnt) cnt.textContent = it.detectedCount + "枚検出";
        if (typeof scheduleSaveBatchSheetsDraft === "function") scheduleSaveBatchSheetsDraft();
      }
    };

    window._sheetBoxHistory = [];
    window.pushSheetBoxHistory = function() {
      if (!sheetCropState || !Array.isArray(sheetCropState.boxes)) return;
      window._sheetBoxHistory.push(sheetCropState.boxes.map(b => ({ ...b })));
      if (window._sheetBoxHistory.length > 30) window._sheetBoxHistory.shift();
    };

    window.undoLastSheetBoxAction = function() {
      if (!sheetCropState || !Array.isArray(sheetCropState.boxes)) return;
      if (window._sheetBoxHistory && window._sheetBoxHistory.length > 0) {
        sheetCropState.boxes = window._sheetBoxHistory.pop();
      } else if (sheetCropState.boxes.length > 0) {
        sheetCropState.boxes.pop();
      }
      if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
      if (typeof syncActiveBatchSheetBoxes === "function") syncActiveBatchSheetBoxes();
    };

    window._sheetBoxHistory = [];
    window.pushSheetBoxHistory = function() {
      if (!sheetCropState || !Array.isArray(sheetCropState.boxes)) return;
      window._sheetBoxHistory.push(sheetCropState.boxes.map(b => ({ ...b })));
      if (window._sheetBoxHistory.length > 30) window._sheetBoxHistory.shift();
    };

    window.undoLastSheetBoxAction = function() {
      if (!sheetCropState || !Array.isArray(sheetCropState.boxes)) return;
      if (window._sheetBoxHistory && window._sheetBoxHistory.length > 0) {
        sheetCropState.boxes = window._sheetBoxHistory.pop();
      } else if (sheetCropState.boxes.length > 0) {
        sheetCropState.boxes.pop();
      }
      if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
      if (typeof syncActiveBatchSheetBoxes === "function") syncActiveBatchSheetBoxes();
    };

    window.handleSheetCanvasClick = function(ev) {
      if (window._sheetDragHandledClick) {
        window._sheetDragHandledClick = false;
        return;
      }
      const canvas = document.getElementById("sheet-crop-canvas");
      const img = sheetCropState && sheetCropState.img;
      if (!canvas || !img) return;
      if (!Array.isArray(sheetCropState.boxes)) sheetCropState.boxes = [];
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const scale = sheetCropState.scale > 0 ? sheetCropState.scale : 1;
      const clickX = ((ev.clientX - rect.left) / rect.width) * (canvas.width / scale);
      const clickY = ((ev.clientY - rect.top) / rect.height) * (canvas.height / scale);

      for (let i = sheetCropState.boxes.length - 1; i >= 0; i--) {
        const b = sheetCropState.boxes[i];
        if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
          if (typeof pushSheetBoxHistory === "function") pushSheetBoxHistory();
          b.active = b.active === false;
          drawSheetCropPreview();
          if (typeof syncActiveBatchSheetBoxes === "function") syncActiveBatchSheetBoxes();
          return;
        }
      }

      if (typeof pushSheetBoxHistory === "function") pushSheetBoxHistory();

      const existing = sheetCropState.boxes.filter(b => b && b.w > 10 && b.h > 10);
      let stdW, stdH;
      if (existing.length > 0) {
        const ws = existing.map(b => b.w).sort((a, b) => a - b);
        const hs = existing.map(b => b.h).sort((a, b) => a - b);
        stdW = ws[Math.floor(ws.length / 2)];
        stdH = hs[Math.floor(hs.length / 2)];
      } else {
        stdW = Math.max(40, Math.round(img.width * 0.08));
        stdH = Math.round(stdW * 1.52);
      }

      let newX = Math.round(clickX - stdW / 2);
      let newY = Math.round(clickY - stdH / 2);
      const sameRowBox = existing.find(b => Math.abs((b.y + b.h / 2) - clickY) < stdH * 0.45);
      if (sameRowBox) newY = sameRowBox.y;

      newX = Math.max(0, Math.min(img.width - stdW, newX));
      newY = Math.max(0, Math.min(img.height - stdH, newY));

      sheetCropState.boxes.push({ x: newX, y: newY, w: stdW, h: stdH, active: true, member: "" });
      sheetCropState.boxes.sort((a, b) => {
        const rowTol = Math.max(12, stdH * 0.35);
        if (Math.abs(a.y - b.y) > rowTol) return a.y - b.y;
        return a.x - b.x;
      });

      drawSheetCropPreview();
      if (typeof syncActiveBatchSheetBoxes === "function") syncActiveBatchSheetBoxes();
    };

    // ===== キャンバス上のドラッグ操作（既存枠の移動 ＆ 空き場所からの自由サイズ枠ドラッグ作成） =====
    (function initSheetCanvasDragSupport() {
      let dragState = null;

      function getCanvasImgCoords(canvas, clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scale = sheetCropState && sheetCropState.scale > 0 ? sheetCropState.scale : 1;
        const x = ((clientX - rect.left) / rect.width) * (canvas.width / scale);
        const y = ((clientY - rect.top) / rect.height) * (canvas.height / scale);
        return { x, y, scale };
      }

      function renderDragDraftBox(draft) {
        if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
        if (!draft) return;
        const canvas = document.getElementById("sheet-crop-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const scale = sheetCropState && sheetCropState.scale > 0 ? sheetCropState.scale : 1;
        ctx.save();
        ctx.strokeStyle = "#f43f5e";
        ctx.fillStyle = "rgba(244, 63, 94, 0.22)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.fillRect(draft.x * scale, draft.y * scale, draft.w * scale, draft.h * scale);
        ctx.strokeRect(draft.x * scale, draft.y * scale, draft.w * scale, draft.h * scale);
        ctx.restore();
      }

      function onPointerDown(clientX, clientY, target, ev) {
        if (!target || target.id !== "sheet-crop-canvas") return;
        const img = sheetCropState && sheetCropState.img;
        if (!img) return;
        if (!Array.isArray(sheetCropState.boxes)) sheetCropState.boxes = [];

        const pt = getCanvasImgCoords(target, clientX, clientY);
        let hitIdx = -1;
        for (let i = sheetCropState.boxes.length - 1; i >= 0; i--) {
          const b = sheetCropState.boxes[i];
          if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
            hitIdx = i;
            break;
          }
        }

        dragState = {
          canvas: target,
          startClientX: clientX,
          startClientY: clientY,
          startImgX: pt.x,
          startImgY: pt.y,
          moved: false,
          mode: hitIdx >= 0 ? "move" : "create",
          boxIdx: hitIdx,
          origBoxX: hitIdx >= 0 ? sheetCropState.boxes[hitIdx].x : 0,
          origBoxY: hitIdx >= 0 ? sheetCropState.boxes[hitIdx].y : 0,
          draftBox: null
        };
      }

      function onPointerMove(clientX, clientY, ev) {
        if (!dragState) return;
        const img = sheetCropState && sheetCropState.img;
        if (!img) return;

        const dist = Math.hypot(clientX - dragState.startClientX, clientY - dragState.startClientY);
        if (!dragState.moved && dist < 7) return;
        dragState.moved = true;
        if (ev && ev.cancelable) ev.preventDefault();

        const pt = getCanvasImgCoords(dragState.canvas, clientX, clientY);
        if (dragState.mode === "move" && dragState.boxIdx >= 0) {
          const b = sheetCropState.boxes[dragState.boxIdx];
          if (!b) return;
          const dx = pt.x - dragState.startImgX;
          const dy = pt.y - dragState.startImgY;
          b.x = Math.max(0, Math.min(img.width - b.w, Math.round(dragState.origBoxX + dx)));
          b.y = Math.max(0, Math.min(img.height - b.h, Math.round(dragState.origBoxY + dy)));
          if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
        } else if (dragState.mode === "create") {
          const x0 = Math.max(0, Math.min(img.width, Math.min(dragState.startImgX, pt.x)));
          const y0 = Math.max(0, Math.min(img.height, Math.min(dragState.startImgY, pt.y)));
          const x1 = Math.max(0, Math.min(img.width, Math.max(dragState.startImgX, pt.x)));
          const y1 = Math.max(0, Math.min(img.height, Math.max(dragState.startImgY, pt.y)));
          dragState.draftBox = {
            x: Math.round(x0),
            y: Math.round(y0),
            w: Math.max(12, Math.round(x1 - x0)),
            h: Math.max(12, Math.round(y1 - y0))
          };
          renderDragDraftBox(dragState.draftBox);
        }
      }

      function onPointerUp(clientX, clientY) {
        if (!dragState) return;
        const st = dragState;
        dragState = null;

        if (!st.moved) {
          // 動かさずにタップした場合は、既存のクリック処理（ON/OFF または 標準サイズ枠追加）を実行
          window._sheetDragHandledClick = false;
          window.handleSheetCanvasClick({ clientX, clientY });
          window._sheetDragHandledClick = true;
          return;
        }

        window._sheetDragHandledClick = true;
        if (typeof pushSheetBoxHistory === "function") pushSheetBoxHistory();
        if (st.mode === "create" && st.draftBox && st.draftBox.w >= 16 && st.draftBox.h >= 16) {
          sheetCropState.boxes.push({
            x: st.draftBox.x,
            y: st.draftBox.y,
            w: st.draftBox.w,
            h: st.draftBox.h,
            active: true,
            member: ""
          });
        }
        if (typeof drawSheetCropPreview === "function") drawSheetCropPreview();
        if (typeof syncActiveBatchSheetBoxes === "function") syncActiveBatchSheetBoxes();
      }

      document.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 1) {
          onPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target, e);
        }
      }, { passive: true });

      document.addEventListener("touchmove", (e) => {
        if (dragState && e.touches && e.touches.length === 1) {
          onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
        }
      }, { passive: false });

      document.addEventListener("touchend", (e) => {
        if (dragState) {
          const t = (e.changedTouches && e.changedTouches[0]) || { clientX: dragState.startClientX, clientY: dragState.startClientY };
          onPointerUp(t.clientX, t.clientY);
        }
      });

      document.addEventListener("mousedown", (e) => {
        if (e.button === 0) onPointerDown(e.clientX, e.clientY, e.target, e);
      });
      document.addEventListener("mousemove", (e) => {
        if (dragState) onPointerMove(e.clientX, e.clientY, e);
      });
      document.addEventListener("mouseup", (e) => {
        if (dragState) onPointerUp(e.clientX, e.clientY);
      });
    })();

    window.assignSheetRowMembers = function(mode) {
      const activeBoxes = sheetCropState.boxes.filter(b => b.active);
      if (!activeBoxes.length) return;
      if (mode === "clear") {
        sheetCropState.boxes.forEach(b => { b.member = ""; });
        drawSheetCropPreview();
        return;
      }

      const order = mode === "yunah_order"
        ? ["ユナ", "ミンジュ", "モカ", "ウォニ", "イロハ"]
        : ["ウォニ", "ミンジュ", "モカ", "ユナ", "イロハ"];

      // Y座標が近いものを行（Row）としてグループ化
      const rows = [];
      activeBoxes.forEach(b => {
        const rowTol = Math.max(20, b.h * 0.45);
        const hitRow = rows.find(r => Math.abs(r.avgY - b.y) <= rowTol);
        if (hitRow) {
          hitRow.items.push(b);
          hitRow.avgY = hitRow.items.reduce((s, it) => s + it.y, 0) / hitRow.items.length;
        } else {
          rows.push({ avgY: b.y, items: [b] });
        }
      });

      rows.forEach((r, rowIdx) => {
        const memberName = order[rowIdx] || "";
        r.items.forEach(b => { b.member = memberName; });
      });
      drawSheetCropPreview();
      showToast(`${rows.length}行にメンバー名を割り当てました`, "info");
    };

    window.commitSheetAutoCropsToZip = async function() {
      try {
        const img = sheetCropState && sheetCropState.img;
        const allBoxes = (sheetCropState && sheetCropState.boxes) ? sheetCropState.boxes : [];
        // active が明示的に false でないものを有効とみなす（undefined も有効）
        const boxes = allBoxes.filter(b => b && b.active !== false);

        if (!img) {
          /* alert hidden */ console.log("元画像が読み込まれていません。もう一度画像を選んでください。");
          return;
        }
        if (!boxes.length) {
          /* alert hidden */ console.log("有効な枠がありません。\nプレビュー上の枠をタップして赤枠（有効）にしてから再度お試しください。\n検出数: " + allBoxes.length);
          return;
        }

        const btn = document.getElementById("sheet-crop-confirm-btn");
        const origText = btn ? btn.textContent : "✂️ 有効な枠を切り抜いてZIPリストへ追加";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "切り抜き中... (0 / " + boxes.length + ")";
        }

        const defaultAlbum = (document.getElementById("admin-zip-album") && document.getElementById("admin-zip-album").value) || adminCardsAlbum || "";
        const baseStem = ((sheetCropState.fileName || "sheet").replace(/\.[^.]+$/, "") || "sheet");
        let added = 0;
        const errors = [];

        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          if (btn) btn.textContent = "切り抜き中... (" + (i + 1) + " / " + boxes.length + ")";
          // ブラウザに描画フレームを渡して進捗表示を確実に更新
          await new Promise(function(r) { setTimeout(r, 30); });

          try {
            const sx = Math.max(0, Math.round(Number(b.x) || 0));
            const sy = Math.max(0, Math.round(Number(b.y) || 0));
            const sw = Math.max(1, Math.min(img.naturalWidth || img.width, Math.round(Number(b.w) || 1)));
            const sh = Math.max(1, Math.min(img.naturalHeight || img.height, Math.round(Number(b.h) || 1)));
            // 画像外にはみ出さないよう再クランプ
            const cropW = Math.min(sw, (img.naturalWidth || img.width) - sx);
            const cropH = Math.min(sh, (img.naturalHeight || img.height) - sy);
            if (cropW < 1 || cropH < 1) {
              errors.push("#" + (i + 1) + " 範囲外");
              continue;
            }

            const canvas = document.createElement("canvas");
            canvas.width = cropW;
            canvas.height = cropH;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              errors.push("#" + (i + 1) + " canvas不可");
              continue;
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, cropW, cropH);
            ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

            const blob = await new Promise(function(resolve) {
              try {
                canvas.toBlob(function(b) { resolve(b); }, "image/jpeg", 0.92);
              } catch (err) {
                resolve(null);
              }
            });
            // メモリ解放
            canvas.width = 0;
            canvas.height = 0;

            if (!blob) {
              errors.push("#" + (i + 1) + " blob失敗");
              continue;
            }

            const member = (b.member || "").trim();
            const fileName = (member ? member + "_" : "") + baseStem + "_" + String(i + 1).padStart(2, "0") + ".jpg";
            const file = new File([blob], fileName, { type: "image/jpeg" });

            adminZipPackFiles.push({
              file: file,
              relPath: fileName,
              albumId: defaultAlbum,
              member: member || (typeof guessMemberFromFileName === "function" ? guessMemberFromFileName(fileName) : "")
            });
            added++;
          } catch (itemErr) {
            console.error("crop item error", i, itemErr);
            errors.push("#" + (i + 1) + " " + (itemErr && itemErr.message ? itemErr.message : "error"));
          }
        }

        if (typeof closeSheetCropArea === "function") closeSheetCropArea();
        if (typeof updateAdminZipPackUI === "function") updateAdminZipPackUI();

        if (added > 0) {
          if (typeof showToast === "function") {
            showToast(added + "枚のトレカを切り抜いてZIPリストに追加しました！", "success");
          } else {
            /* alert hidden */ console.log(added + "枚をZIPリストに追加しました。");
          }
        } else {
          /* alert hidden */ console.log("1枚も切り抜けませんでした。\n" + (errors.length ? errors.join("\n") : "不明なエラー"));
        }
        if (errors.length && added > 0) {
          console.warn("一部スキップ:", errors);
        }

        if (btn) {
          btn.disabled = false;
          btn.textContent = origText;
        }
      } catch (e) {
        console.error("commitSheetAutoCropsToZip fatal", e);
        /* alert hidden */ console.log("切り抜き処理中にエラーが発生しました:\n" + (e && e.message ? e.message : e));
        const btn = document.getElementById("sheet-crop-confirm-btn");
        if (btn) {
          btn.disabled = false;
          btn.textContent = "✂️ 有効な枠を切り抜いてZIPリストへ追加";
        }
      }
    };

    // 互換エイリアス
    window.applySheetCropsToZip = window.commitSheetAutoCropsToZip;

    window.handleAdminZipPackSelect = function(inputEl) {
      const files = Array.from(inputEl.files || []);
      inputEl.value = "";
      if (!files.length) return;
      const defaultAlbum = document.getElementById("admin-zip-album")?.value || adminCardsAlbum;
      files.forEach(file => {
        const relPath = file.webkitRelativePath || file.name;
        adminZipPackFiles.push({
          file,
          relPath,
          albumId: guessAlbumFromPath(relPath, defaultAlbum),
          member: guessMemberFromFileName(file.name)
        });
      });
      updateAdminZipPackUI();
      showToast(`${files.length}枚を追加しました（合計 ${adminZipPackFiles.length}枚）`, "info");
    };

    window.clearAdminZipPack = function() {
      adminZipPackFiles.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
      adminZipPackFiles = [];
      updateAdminZipPackUI();
    };

    window.removeAdminZipItem = function(idx) {
      const item = adminZipPackFiles[idx];
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      adminZipPackFiles.splice(idx, 1);
      updateAdminZipPackUI();
    };

    window.setAllAdminZipMember = function(member) {
      if (!member) return;
      adminZipPackFiles.forEach(item => { item.member = member; });
      updateAdminZipPackUI();
    };

        function updateAdminZipPackUI() {
      const listEl = document.getElementById("admin-zip-list");
      if (!listEl) return;
      if (!adminZipPackFiles.length) {
        listEl.innerHTML = "";
        return;
      }

      const members = ["", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"];
      listEl.innerHTML = adminZipPackFiles.map((item, idx) => {
        if (!item.previewUrl && item.file) {
          item.previewUrl = URL.createObjectURL(item.file);
        }
        return `
          <div class="bg-white/90 rounded-lg p-1.5 flex items-center gap-2 border border-indigo-100">
            ${item.previewUrl ? `<img src="${item.previewUrl}" class="w-10 h-10 object-cover rounded shrink-0">` : ""}
            <div class="flex-1 min-w-0 space-y-1">
              <div class="text-[10px] text-gray-500 truncate">${escapeHtml(item.file?.name || `画像 ${idx + 1}`)}</div>
              <select onchange="adminZipPackFiles[${idx}].member = this.value" class="w-full liquid-glass-input rounded px-2 py-1 text-xs font-bold text-gray-800">
                ${members.map(m => `<option value="${m}" ${m === item.member ? "selected" : ""}>${m || "（メンバー選択）"}</option>`).join("")}
              </select>
            </div>
            <button onclick="removeAdminZipItem(${idx})" class="text-gray-400 hover:text-red-500 px-1.5 text-xs font-bold">✕</button>
          </div>
        `;
      }).join("");
    }



    /** Firestoreの cardCatalog + cardPhotos を GitHub用 catalog.zip に一括出力 */
    window.adminExportFirestoreToCatalogZip = async function() {
      try {
        if (typeof isAdmin === "function" && !isAdmin()) {
          /* alert hidden */ console.log("管理者のみ実行できます。");
          return;
        }
        if (!currentUser) {
          /* alert hidden */ console.log("ログインが必要です。");
          return;
        }
        if (typeof JSZip === "undefined") {
          return /* alert hidden */ console.log("JSZipライブラリが読み込まれていません。ページを再読み込みしてください。");
        }

        const scopeAlbumOnly = await appConfirm(
          "出力範囲を選んでください。\n\n「はい」= いま選んでいるアルバムのみ\n「戻る」= Firestoreの全カード",
          "このアルバムのみ",
          false
        );
        // appConfirm: はい=true, 戻る=false → false のとき全件
        const albumFilter = scopeAlbumOnly ? adminCardsAlbum : null;
        const memberFilter = scopeAlbumOnly ? adminCardsMember : "ALL";

        const mergeExisting = !!document.getElementById("admin-zip-merge-existing")?.checked;
        const ok = await appConfirm(
          "Firebase（cardCatalog / cardPhotos）の写真を catalog.json + cards/ のZIPにします。\n\n" +
          "範囲: " + (albumFilter ? ("アルバム " + albumFilter) : "全アルバム") +
          (memberFilter && memberFilter !== "ALL" ? (" / メンバー " + (memberFilter === "__NONE__" ? "なし" : memberFilter)) : "") + "\n" +
          "既存catalog.jsonへ追記: " + (mergeExisting ? "する" : "しない（新規のみ）") + "\n\n" +
          "枚数が多いと時間がかかります。続行しますか？",
          "ZIPを作る",
          false
        );
        if (!ok) return;

        const btn = document.getElementById("admin-export-fs-catalog-btn");
        const prog = document.getElementById("admin-zip-progress");
        if (btn) btn.disabled = true;
        if (prog) { prog.classList.remove("hidden"); prog.textContent = "Firestoreからカタログ取得中..."; }

        // カタログ一覧
        let list = [];
        try {
          const snap = await getDocs(collection(db, "cardCatalog"));
          list = snap.docs.map(d => {
            const data = d.data() || {};
            return {
              id: d.id,
              albumId: data.albumId || "other",
              name: data.name || "",
              member: data.member || ""
            };
          });
          catalogCardsCache = list.filter(c => c.name).map(c => ({ ...c, admin: true }));
          catalogCardsLoaded = true;
        } catch (e) {
          /* alert hidden */ console.log("cardCatalog の取得に失敗しました。\n" + (e && (e.code || e.message) ? (e.code || e.message) : e));
          if (btn) btn.disabled = false;
          return;
        }

        // 絞り込み
        const normMember = (s) => String(s || "").split(" ")[0];
        if (albumFilter) {
          list = list.filter(c => c.albumId === albumFilter);
        }
        if (memberFilter && memberFilter === "__NONE__") {
          list = list.filter(c => !normMember(c.member));
        } else if (memberFilter && memberFilter !== "ALL") {
          list = list.filter(c => normMember(c.member) === memberFilter);
        }

        if (!list.length) {
          /* alert hidden */ console.log("出力対象のカードがありません。");
          if (btn) btn.disabled = false;
          if (prog) prog.textContent = "";
          return;
        }

        // 既存静的パック
        try { await loadStaticCardPack(); } catch (_) {}
        const existingIds = new Set((staticPackCards || []).map(c => c.id));
        const catalogList = mergeExisting
          ? (staticPackCards || []).map(c => ({
              id: c.id,
              albumId: c.albumId,
              name: c.name,
              member: c.member || "",
              photo: c.photoUrl || ("./cards/" + c.id + ".jpg")
            }))
          : [];

        // 既存ZIP内の cards/ は再同梱できない（URL参照のみ）ので、
        // merge時は catalog.json のエントリだけ継承し、今回のFirestore分の画像ファイルを追加する
        const zip = new JSZip();
        const cardsFolder = zip.folder("cards");

        // merge時に既存の相対パス写真を可能な範囲で同梱（同一オリジンの ./cards/ のみ）
        if (mergeExisting && staticPackCards && staticPackCards.length) {
          if (prog) prog.textContent = "既存パックの画像を取得中...";
          let emb = 0;
          for (let i = 0; i < staticPackCards.length; i++) {
            const c = staticPackCards[i];
            if (!c || !c.id) continue;
            let src = c.photoUrl || cardPhotoCache[c.id] || "";
            if (!src) continue;
            try {
              let dataUrl = null;
              if (typeof src === "string" && src.startsWith("data:image")) {
                dataUrl = src;
              } else if (typeof src === "string" && (src.startsWith("./") || src.startsWith("cards/") || src.startsWith("/"))) {
                const res = await fetch(src);
                if (res.ok) {
                  const blob = await res.blob();
                  dataUrl = await new Promise((resolve, reject) => {
                    const fr = new FileReader();
                    fr.onload = () => resolve(fr.result);
                    fr.onerror = reject;
                    fr.readAsDataURL(blob);
                  });
                }
              }
              if (dataUrl && typeof dataUrl === "string" && /^data:image\/jpeg;base64,/i.test(dataUrl)) {
                const b64 = dataUrl.split(",")[1];
                const fname = String(c.id).replace(/[^\w.-]/g, "_") + ".jpg";
                cardsFolder.file(fname, b64, { base64: true });
                // catalog の photo パスを統一
                const hit = catalogList.find(x => x.id === c.id);
                if (hit) hit.photo = "./cards/" + fname;
                emb++;
              }
            } catch (_) {}
            if (i % 8 === 0) await new Promise(r => setTimeout(r, 0));
          }
          if (prog) prog.textContent = "既存画像 " + emb + " 枚を同梱しました。Firestore分を取得中...";
        }

        let processed = 0, skipped = 0, skippedNoPhoto = 0;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          if (prog) prog.textContent = "Firestore写真... (" + (i + 1) + "/" + list.length + ") 追加" + processed + " / スキップ" + skipped;
          await new Promise(r => setTimeout(r, 0));

          // すでに静的パックに同じIDがある場合はスキップ（merge時）
          if (mergeExisting && existingIds.has(c.id)) {
            skipped++;
            continue;
          }

          let dataUrl = cardPhotoCache[c.id] || null;
          if (!dataUrl) {
            try {
              const cached = typeof idbGet === "function" ? await idbGet("photo_" + c.id) : null;
              if (cached) dataUrl = cached;
            } catch (_) {}
          }
          if (!dataUrl) {
            try {
              const snap = await getDoc(doc(db, "cardPhotos", c.id));
              if (snap.exists()) {
                const d = snap.data() || {};
                dataUrl = d.data || d.photo || null;
                if (dataUrl) {
                  cardPhotoCache[c.id] = dataUrl;
                  if (typeof idbSet === "function") await idbSet("photo_" + c.id, dataUrl);
                }
              }
            } catch (_) {}
          }

          if (!dataUrl || typeof dataUrl !== "string") {
            skippedNoPhoto++;
            skipped++;
            continue;
          }

          // JPEG dataURL でなければ再エンコードを試みる（サイズ上限は緩め）
          const isJpegLoose = (s) => typeof s === "string" && /^data:image\/jpeg;base64,/i.test(s);
          let jpegUrl = dataUrl;
          if (!isJpegLoose(jpegUrl)) {
            try {
              const img = await new Promise((resolve, reject) => {
                const im = new Image();
                if (!dataUrl.startsWith("data:")) {
                  try { im.crossOrigin = "anonymous"; } catch (_) {}
                }
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = dataUrl;
              });
              const maxSide = PHOTO_THUMB.maxSide || 260;
              const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(img.width * scale));
              canvas.height = Math.max(1, Math.round(img.height * scale));
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              jpegUrl = canvas.toDataURL("image/jpeg", PHOTO_THUMB.quality || 0.6);
              canvas.width = 0; canvas.height = 0;
            } catch (e) {
              skipped++;
              continue;
            }
          }
          if (!isJpegLoose(jpegUrl)) {
            skipped++;
            continue;
          }

          const safeId = String(c.id).replace(/[^\w.-]/g, "_") || ("card_" + i);
          const fileName = safeId + ".jpg";
          const b64 = jpegUrl.split(",")[1];
          cardsFolder.file(fileName, b64, { base64: true });

          catalogList.push({
            id: c.id,
            albumId: c.albumId || "other",
            name: c.name || safeId,
            member: c.member || "",
            photo: "./cards/" + fileName
          });
          processed++;
        }

        if (processed === 0 && !catalogList.length) {
          throw new Error("出力できる画像が1枚もありませんでした（写真なし: " + skippedNoPhoto + "）");
        }

        // ID重複をcatalogList内で除去（後ろ優先）
        const byId = new Map();
        catalogList.forEach(c => { if (c && c.id) byId.set(c.id, c); });
        const finalList = Array.from(byId.values());

        if (prog) prog.textContent = "ZIP生成中...（" + finalList.length + "件）";
        await new Promise(r => setTimeout(r, 20));
        zip.file("catalog.json", JSON.stringify({
          updatedAt: new Date().toISOString(),
          source: "firestore-export",
          cards: finalList
        }, null, 2));

        const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ts = Date.now().toString(36);
        a.download = "illit-firestore-catalog-" + ts + ".zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);

        const msg = "✅ 完了！Firestoreから " + processed + " 枚追加 / スキップ " + skipped +
          "（写真なし " + skippedNoPhoto + "）/ catalog合計 " + finalList.length + " 件";
        if (prog) prog.textContent = msg;
        showToast("catalog ZIPをダウンロードしました", "success");
        /* alert hidden */ console.log(msg + "\n\nZIP内の catalog.json と cards/ をGitHubの公開先に配置してください。");
      } catch (e) {
        console.error(e);
        const prog = document.getElementById("admin-zip-progress");
        if (prog) prog.textContent = "❌ エラー: " + (e && e.message ? e.message : e);
        /* alert hidden */ console.log("出力中にエラーが発生しました。\n" + (e && (e.message || e.code) ? (e.message || e.code) : e));
      } finally {
        const btn = document.getElementById("admin-export-fs-catalog-btn");
        if (btn) btn.disabled = false;
      }
    };

        // ===== ZIP生成（クリーン画像＋透かし画像の両方を含む） =====
// 既存の buildAndDownloadCardPackZip を以下に置き換え

window.buildAndDownloadCardPackZip = async function() {
  if (!adminZipPackFiles.length) return;
  if (typeof JSZip === "undefined") {
    return /* alert hidden */ console.log("JSZipライブラリが読み込まれていません。");
  }
  const selectedAlbum = document.getElementById("admin-zip-album")?.value || adminCardsAlbum;
  const prefix = (document.getElementById("admin-zip-prefix")?.value || "").trim();
  const btn = document.getElementById("admin-zip-build-btn");
  const prog = document.getElementById("admin-zip-progress");
  if (btn) btn.disabled = true;
  if (prog) { prog.classList.remove("hidden"); prog.textContent = "準備中..."; }

  try {
    const zip = new JSZip();
    const cardsFolder = zip.folder("cards");
    const cleanFolder = zip.folder("cards_clean");
    const catalogList = [];

    const batchTs = Date.now().toString(36);
    let processed = 0;

    for (let i = 0; i < adminZipPackFiles.length; i++) {
      const item = adminZipPackFiles[i];
      if (prog) prog.textContent = "処理中... (" + (i + 1) + "/" + adminZipPackFiles.length + ")";
      await new Promise(r => setTimeout(r, 10));

      try {
        const cardId = item.cardId || ("pk_" + batchTs + "_" + String(i + 1).padStart(4, "0"));
        const fileName = cardId + ".jpg";

        // 透かし画像（公開用）
        const wmDataUrl = await compressCardWithWatermark(item.file, PHOTO_THUMB);
        if (isJpegData(wmDataUrl)) {
          const b64 = wmDataUrl.split(",")[1];
          cardsFolder.file(fileName, b64, { base64: true });
        }

        // クリーン画像（判定用）
        if (item.cleanFile) {
          const cleanDataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(item.cleanFile);
          });
          if (cleanDataUrl && cleanDataUrl.startsWith("data:image")) {
            const b64 = cleanDataUrl.split(",")[1];
            cleanFolder.file(fileName, b64, { base64: true });
          }
        }

        const rawStem = item.file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        const cardName = prefix
          ? [item.member, prefix].filter(Boolean).join(" ")
          : (rawStem || [item.member, "トレカ " + (i + 1)].filter(Boolean).join(" "));

        catalogList.push({
          id: cardId,
          albumId: selectedAlbum || item.albumId,
          name: cardName,
          member: item.member || "",
          photo: "./cards/" + fileName,
          cleanPhoto: "./cards_clean/" + fileName
        });
        processed++;
      } catch (e) {
        console.warn("Skip:", item.file.name, e);
      }
    }

    if (processed === 0) throw new Error("処理できる画像がありません。");

    zip.file("catalog.json", JSON.stringify({
      updatedAt: new Date().toISOString(),
      cards: catalogList
    }, null, 2));

    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    const zipFileName = "illit-cards-pack-" + batchTs + ".zip";
    const url = URL.createObjectURL(blob);
    const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

    // 1. まず自動ダウンロードを試行
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2. iOS Safariで自動ダウンロードがブロックされた場合に備え、タップで確実に保存できるボタンを表示
    let dlBox = document.getElementById("batch-zip-manual-dl-box");
    if (!dlBox) {
      dlBox = document.createElement("div");
      dlBox.id = "batch-zip-manual-dl-box";
      dlBox.className = "mt-3 p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-center shadow-sm";
      const runBtn = document.getElementById("batch-sheets-run-btn");
      if (runBtn && runBtn.parentNode) {
        runBtn.parentNode.insertBefore(dlBox, runBtn.nextSibling);
      } else {
        document.body.appendChild(dlBox);
      }
    }
    dlBox.innerHTML =
      '<div class="text-xs font-extrabold text-emerald-800 mb-1.5">✅ ZIP生成完了（' + processed + '枚 / ' + sizeMb + 'MB）</div>' +
      '<a href="' + url + '" download="' + zipFileName + '" class="inline-block w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-extrabold text-sm shadow active:scale-95">📦 ここをタップしてZIPを保存</a>';

    if (prog) prog.textContent = "完了！" + processed + "枚をZIPに保存しました";
    showToast("ZIPをダウンロードしました", "success");
  } catch (e) {
    console.error(e);
    if (prog) prog.textContent = "エラー: " + (e.message || e);
    /* alert hidden */ console.log("エラー: " + (e.message || e));
  } finally {
    if (btn) btn.disabled = false;
  }
};

// 使い方：
// 1. 上記のコードを既存の buildAndDownloadCardPackZip と置き換え
// 2. ZIPには cards/（透かし）と cards_clean/（クリーン）の両方が入る
// 3. catalog.json に photo と cleanPhoto の両方が記録される
// 4. GitHubにZIPを展開すれば、Firestoreを圧迫せずに両方を保存できる



    window.adminRegisterZipPackToFirestore = async function() {
      if (typeof isAdmin === "function" && !isAdmin()) {
        /* alert hidden */ console.log("管理者のみ実行できます。");
        return;
      }
      if (!adminZipPackFiles || !adminZipPackFiles.length) {
        /* alert hidden */ console.log("登録する画像がありません。先に切り抜きまたは画像追加をしてください。");
        return;
      }
      if (!currentUser) {
        /* alert hidden */ console.log("ログインが必要です。");
        return;
      }

      const albumId = (document.getElementById("admin-zip-album") && document.getElementById("admin-zip-album").value) || adminCardsAlbum || "";
      const prefix = ((document.getElementById("admin-zip-prefix") && document.getElementById("admin-zip-prefix").value) || "").trim();
      const btn = document.getElementById("admin-zip-firestore-btn");
      const prog = document.getElementById("admin-zip-progress");
      const origText = btn ? btn.textContent : "🔥 Firestoreに登録してMyトレカへ反映";

      if (btn) {
        btn.disabled = true;
        btn.textContent = "登録中...";
      }
      if (prog) {
        prog.classList.remove("hidden");
        prog.textContent = "準備中...";
      }

      let successCount = 0;
      let skipped = 0;
      const errors = [];

      try {
        for (let i = 0; i < adminZipPackFiles.length; i++) {
          const item = adminZipPackFiles[i];
          if (btn) btn.textContent = "登録中 (" + (i + 1) + "/" + adminZipPackFiles.length + ")...";
          if (prog) prog.textContent = "透かし・登録中... (" + (i + 1) + " / " + adminZipPackFiles.length + ")";
          await new Promise(function(r) { setTimeout(r, 20); });

          try {
            const dataUrl = await compressCardWithWatermark(item.file, PHOTO_THUMB);
          const cleanDataUrl = await compressCardClean(item.file, PHOTO_THUMB).catch(() => null);
            if (!isJpegData(dataUrl)) {
              skipped++;
              errors.push((item.file && item.file.name ? item.file.name : "#" + (i + 1)) + " 画像処理失敗");
              continue;
            }

            const rawStem = (item.file && item.file.name ? item.file.name : "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
            const cardName = prefix
              ? [item.member, prefix].filter(Boolean).join(" ")
              : (rawStem || [item.member, "トレカ " + (i + 1)].filter(Boolean).join(" "));

            const ref = doc(collection(db, "cardCatalog"));
            const cardId = ref.id;
            await setDoc(ref, {
              albumId: albumId || item.albumId || "",
              name: cardName,
              member: item.member || "",
              createdAt: serverTimestamp(),
              createdBy: currentUser.uid
            });
            await setDoc(doc(db, "cardPhotos", cardId), {
            data: dataUrl,
            hasCleanRef: Boolean(cleanDataUrl && isJpegData(cleanDataUrl)),
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
          }, { merge: true });
          if (cleanDataUrl && isJpegData(cleanDataUrl)) {
            await setDoc(doc(db, "cardPhotosClean", cardId), {
              data: cleanDataUrl,
              cardId: cardId,
              albumId: albumId || item.albumId || "",
              name: cardName,
              member: item.member || "",
              updatedAt: serverTimestamp(),
              updatedBy: currentUser.uid
            }, { merge: true });
            _aiCardVectorsPromise = null;
          }

            cardPhotoCache[cardId] = dataUrl;
            if (typeof idbSet === "function") await idbSet("photo_" + cardId, dataUrl);
            catalogCardsCache.push({
              id: cardId,
              albumId: albumId || item.albumId || "",
              name: cardName,
              member: item.member || "",
              admin: true
            });
            successCount++;
          } catch (itemErr) {
            console.error("register item error", i, itemErr);
            skipped++;
            errors.push("#" + (i + 1) + " " + (itemErr && (itemErr.code || itemErr.message) ? (itemErr.code || itemErr.message) : "error"));
          }
        }

        if (typeof idbDelete === "function") await idbDelete("catalog_cards");
        adminCardsAlbum = albumId || adminCardsAlbum;

        // 登録完了 → リストをクリアして続けて登録できるようにする
        if (typeof clearAdminZipPack === "function") clearAdminZipPack();

        if (prog) {
          prog.classList.remove("hidden");
          prog.textContent = "✅ 完了！ " + successCount + "枚を登録しました（スキップ" + skipped + "枚）。続けて別の画像も登録できます。";
        }
        if (typeof showToast === "function") {
          showToast(successCount + "枚を登録しました。続けて登録できます", "success");
        } else {
          /* alert hidden */ console.log(successCount + "枚を登録しました。\n続けて別の画像を登録できます。");
        }
        if (errors.length) console.warn("一部スキップ:", errors);

        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards" && typeof renderAdminCardsPanel === "function") {
          renderAdminCardsPanel(el);
        }
        if (typeof isMyCardsPageOpen === "function" && isMyCardsPageOpen()) {
          if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
          if (typeof renderMyCardsList === "function") renderMyCardsList();
        }
      } catch (e) {
        console.error(e);
        if (prog) prog.textContent = "❌ エラー: " + (e && e.message ? e.message : e);
        /* alert hidden */ console.log("登録中にエラーが発生しました（" + successCount + "枚は登録済み）。\n" + (e && (e.code || e.message) ? (e.code || e.message) : e));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "✅ 完了（続けて登録する）";
          setTimeout(function() {
            if (btn && btn.textContent.indexOf("完了") !== -1) btn.textContent = origText;
          }, 4000);
        }
      }
    };

    window.handleAdminBulkSelect = function(inputEl) {
      const files = Array.from(inputEl.files || []);
      inputEl.value = "";
      if (!files.length) return;
      files.forEach(file => {
        adminBulkFiles.push({
          file,
          previewUrl: URL.createObjectURL(file),
          member: guessMemberFromFileName(file.name)
        });
      });
      renderAdminBulkList();
    };

    function renderAdminBulkList() {
      const area = document.getElementById("admin-bulk-preview-area");
      const listEl = document.getElementById("admin-bulk-list");
      const btn = document.getElementById("admin-bulk-submit-btn");
      if (!area || !listEl) return;
      if (!adminBulkFiles.length) {
        area.classList.add("hidden");
        return;
      }
      area.classList.remove("hidden");
      if (btn) btn.textContent = `まとめて登録 (${adminBulkFiles.length}枚)`;
      const members = ["", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"];
      listEl.innerHTML = adminBulkFiles.map((item, idx) => `
        <div class="bg-white/85 rounded-lg p-1.5 flex items-center gap-2 border border-white">
          <img src="${item.previewUrl}" class="w-10 h-10 object-cover rounded shrink-0">
          <select onchange="adminBulkFiles[${idx}].member = this.value" class="flex-1 liquid-glass-input rounded px-2 py-1.5 text-xs font-medium">
            ${members.map(m => `<option value="${m}" ${m === item.member ? "selected" : ""}>${m || "（メンバーなし）"}</option>`).join("")}
          </select>
          <button onclick="removeAdminBulkItem(${idx})" class="text-gray-400 hover:text-red-500 px-1.5 text-xs font-bold">✕</button>
        </div>
      `).join("");
    }

    window.removeAdminBulkItem = function(idx) {
      const item = adminBulkFiles[idx];
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      adminBulkFiles.splice(idx, 1);
      renderAdminBulkList();
    };

    window.clearAdminBulk = function() {
      adminBulkFiles.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
      adminBulkFiles = [];
      renderAdminBulkList();
    };

    window.adminSubmitBulkCards = async function() {
      if (!isAdmin() || !adminBulkFiles.length) return;
      const albumId = document.getElementById("admin-bulk-album")?.value || adminCardsAlbum;
      const prefix = (document.getElementById("admin-bulk-prefix")?.value || "").trim();
      const btn = document.getElementById("admin-bulk-submit-btn");
      if (btn) { btn.disabled = true; btn.textContent = "登録中..."; }

      let successCount = 0;
      try {
        for (let i = 0; i < adminBulkFiles.length; i++) {
          const item = adminBulkFiles[i];
          if (btn) btn.textContent = `登録中 (${i + 1}/${adminBulkFiles.length})...`;
          const cardName = [item.member, prefix].filter(Boolean).join(" ") || `トレカ ${i + 1}`;
          const dataUrl = await compressCardWithWatermark(item.file, PHOTO_THUMB);
          if (!isJpegData(dataUrl)) continue;

          const ref = doc(collection(db, "cardCatalog"));
          const cardId = ref.id;
          await setDoc(ref, {
            albumId,
            name: cardName,
            member: item.member || "",
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          });
          await setDoc(doc(db, "cardPhotos", cardId), {
            data: dataUrl,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
          }, { merge: true });

          cardPhotoCache[cardId] = dataUrl;
          await idbSet("photo_" + cardId, dataUrl);
          catalogCardsCache.push({ id: cardId, albumId, name: cardName, member: item.member || "", admin: true });
          successCount++;
        }
        await idbDelete("catalog_cards");
        clearAdminBulk();
        adminCardsAlbum = albumId;
        showToast(`${successCount}枚をまとめて登録しました。続けて登録できます`, "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (isMyCardsPageOpen()) {
          renderMyCardsAlbumTabs();
          renderMyCardsList();
        }
      } catch (e) {
        console.error(e);
        /* alert hidden */ console.log(`一括登録中にエラーが発生しました（${successCount}枚は登録済み）。\n` + (e?.code || e?.message || ""));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "✅ 完了（続けて登録する）";
          setTimeout(function() {
            if (btn && btn.textContent.indexOf("完了") !== -1) btn.textContent = "まとめて登録";
          }, 4000);
        }
      }
    };

    window.setAdminCardsAlbum = async function(id) {
      if (!id) return;
      adminCardsAlbum = id;
      adminCardsMember = "ALL";
      adminSelectedCardIds = new Set();
      const el = document.getElementById("admin-content");
      // 絞り込みUIは残したまま即再描画（読み込みでボタンが消えない）
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
      try {
        await ensureCardPhotosLoaded(id);
      } catch (e) {
        console.warn("setAdminCardsAlbum photos", e);
        loadedPhotoAlbums.add(id);
      }
      const el2 = document.getElementById("admin-content");
      if (el2 && adminTab === "cards") renderAdminCardsPanel(el2);
    };
    window.setAdminCardsMember = function(member) {
      adminCardsMember = member || "ALL";
      adminSelectedCardIds = new Set();
      const el = document.getElementById("admin-content");
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
    };

    // 管理画面のアルバム／メンバー絞り込み（イベント委譲・タッチ対応）
    if (!window.__adminFilterClickBound) {
      window.__adminFilterClickBound = true;
      document.addEventListener("click", (e) => {
        const albumBtn = e.target.closest("[data-admin-album]");
        if (albumBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = albumBtn.getAttribute("data-admin-album");
          if (id && typeof window.setAdminCardsAlbum === "function") window.setAdminCardsAlbum(id);
          return;
        }
        const memBtn = e.target.closest("[data-admin-member]");
        if (memBtn) {
          e.preventDefault();
          e.stopPropagation();
          const m = memBtn.getAttribute("data-admin-member");
          if (m != null && typeof window.setAdminCardsMember === "function") window.setAdminCardsMember(m);
        }
      }, true);
    }
    function getAdminFilteredCards() {
      const normMember = (s) => String(s || "").split(" ")[0];
      let cards = getAlbumCards(adminCardsAlbum);
      if (adminCardsMember && adminCardsMember === "__NONE__") {
        cards = cards.filter(c => !normMember(c.member));
      } else if (adminCardsMember && adminCardsMember !== "ALL") {
        cards = cards.filter(c => normMember(c.member) === adminCardsMember);
      }
      return cards;
    }
    function getAdminDeletableVisibleIds() {
      return getAdminFilteredCards()
        .filter(c => (!!c.admin || isAdminCatalogCard(c.id)) && !c.staticPack)
        .map(c => c.id);
    }
    window.toggleAdminCardSelect = function(cardId, checked) {
      if (checked) adminSelectedCardIds.add(cardId);
      else adminSelectedCardIds.delete(cardId);
      const el = document.getElementById("admin-content");
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
    };
    window.adminToggleSelectAllVisible = function(checked) {
      const cards = getAdminFilteredCards();
      cards.forEach(c => {
        const isAdminCard = !!c.admin || isAdminCatalogCard(c.id);
        if (isAdminCard && !c.staticPack) {
          if (checked) adminSelectedCardIds.add(c.id);
          else adminSelectedCardIds.delete(c.id);
        }
      });
      const el = document.getElementById("admin-content");
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
    };
    window.adminClearCardSelection = function() {
      adminSelectedCardIds = new Set();
      const el = document.getElementById("admin-content");
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
    };
    /** 絞り込み表示中の削除可能カードをすべて削除 */
    window.adminDeleteAllVisibleFiltered = async function() {
      try {
        if (typeof isAdmin === "function" && !isAdmin()) {
          /* alert hidden */ console.log("管理者のみ実行できます。");
          return;
        }
        const ids = getAdminDeletableVisibleIds();
        if (!ids.length) {
          /* alert hidden */ console.log("この絞り込み条件で削除できるカードがありません。\n（静的パックは削除不可です）");
          return;
        }
        const album = (ILLIT_CARD_ALBUMS.find(a => a.id === adminCardsAlbum) || {}).name || adminCardsAlbum;
        const mem = adminCardsMember === "ALL" ? "全員"
          : (adminCardsMember === "__NONE__" ? "メンバーなし" : adminCardsMember);
        const ok = await appConfirm(
          "【" + album + " / " + mem + "】\n" +
          "表示中の削除可能カード " + ids.length + " 件をすべて削除しますか？\n" +
          "（写真も一緒に削除されます）",
          "すべて削除する",
          true
        );
        if (!ok) return;

        showToast("削除中... (" + ids.length + "件)", "info");
        let success = 0, fail = 0;
        for (const cardId of ids) {
          try {
            await deleteDoc(doc(db, "cardCatalog", cardId));
            try { await deleteDoc(doc(db, "cardPhotos", cardId)); } catch (_) {}
            delete cardPhotoCache[cardId];
            if (typeof idbDelete === "function") {
              try { await idbDelete("photo_" + cardId); } catch (_) {}
            }
            success++;
          } catch (e) {
            console.warn("filtered bulk delete failed", cardId, e);
            fail++;
          }
        }
        catalogCardsCache = (catalogCardsCache || []).filter(c => !ids.includes(c.id));
        if (typeof idbDelete === "function") {
          try { await idbDelete("catalog_cards"); } catch (_) {}
        }
        adminSelectedCardIds = new Set();
        /* alert hidden */ console.log("削除完了: " + success + "件" + (fail ? "（失敗 " + fail + "）" : ""));
        showToast("絞り込み削除: " + success + "件" + (fail ? "（失敗" + fail + "）" : ""), fail ? "error" : "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (typeof isMyCardsPageOpen === "function" && isMyCardsPageOpen()) {
          if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
          if (typeof renderMyCardsList === "function") renderMyCardsList();
        }
      } catch (e) {
        console.error(e);
        /* alert hidden */ console.log("削除中にエラーが発生しました。\n" + (e && (e.message || e.code) ? (e.message || e.code) : e));
      }
    };
    window.adminDeleteSelectedCards = async function() {
      if (typeof isAdmin === "function" && !isAdmin()) {
        /* alert hidden */ console.log("管理者のみ実行できます。");
        return;
      }
      const ids = Array.from(adminSelectedCardIds);
      if (!ids.length) {
        /* alert hidden */ console.log("削除するカードを選択してください。");
        return;
      }
      if (!(await appConfirm(
        `選択した ${ids.length} 件のトレカをカタログから削除しますか？\n（写真も一緒に削除されます）`,
        "まとめて削除する",
        true
      ))) return;

      let ok = 0, fail = 0;
      for (const cardId of ids) {
        try {
          await deleteDoc(doc(db, "cardCatalog", cardId));
          try { await deleteDoc(doc(db, "cardPhotos", cardId)); } catch (_) {}
          delete cardPhotoCache[cardId];
          if (typeof idbDelete === "function") {
            try { await idbDelete("photo_" + cardId); } catch (_) {}
          }
          ok++;
        } catch (e) {
          console.warn("bulk delete failed", cardId, e);
          fail++;
        }
      }
      catalogCardsCache = catalogCardsCache.filter(c => !ids.includes(c.id));
      if (typeof idbDelete === "function") {
        try { await idbDelete("catalog_cards"); } catch (_) {}
      }
      adminSelectedCardIds = new Set();
      showToast(`まとめて削除: ${ok}件${fail ? `（失敗${fail}）` : ""}`, fail ? "error" : "success");
      const el = document.getElementById("admin-content");
      if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
      if (typeof isMyCardsPageOpen === "function" && isMyCardsPageOpen()) {
        if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
        if (typeof renderMyCardsList === "function") renderMyCardsList();
      }
    };
    /** 全く同じIDの重複を検出して削除（キャッシュ内の重複 + 静的パックとIDが衝突する管理者登録分） */
    window.adminDeduplicateExactIds = async function() {
      try {
        if (typeof isAdmin === "function" && !isAdmin()) {
          /* alert hidden */ console.log("管理者のみ実行できます。");
          return;
        }
        if (!currentUser) {
          /* alert hidden */ console.log("ログインが必要です。");
          return;
        }

        showToast("同一ID・同一内容の重複を検索中...", "info");

        try {
          await ensureCatalogCardsLoaded(true);
        } catch (e) {
          console.warn("ensureCatalogCardsLoaded", e);
        }

        // Firestoreから直接取り直す（キャッシュ欠落対策）
        let list = (catalogCardsCache || []).slice();
    // GitHubパック優先のためFirestore全件再取得をスキップ

        if (!list.length) {
          /* alert hidden */ console.log("カタログに登録されたカードがありません。\n（管理者追加のカードが0件です）");
          return;
        }

        const toDeleteMap = new Map(); // id -> card

        // 1) キャッシュ／取得結果内で同じIDが複数（通常は起きないが保険）
        const seenIds = new Map();
        for (const c of list) {
          if (!c || !c.id) continue;
          if (seenIds.has(c.id)) toDeleteMap.set(c.id, c);
          else seenIds.set(c.id, c);
        }

        // 2) 静的パック／定義カードとIDが完全一致する管理者登録
        const staticOrBaseIds = new Set();
        (staticPackCards || []).forEach(c => { if (c && c.id) staticOrBaseIds.add(String(c.id)); });
        (ILLIT_CARD_ALBUMS || []).forEach(a => {
          (a.cards || []).forEach(c => { if (c && c.id) staticOrBaseIds.add(String(c.id)); });
        });
        list.forEach(c => {
    const _safeAdminGetDocs2 = async (q) => {
      try {
        return await getDocs(q);
      } catch (err) {
        console.warn("Admin2 getDocs fallback:", err && err.message ? err.message : err);
        return { docs: [], size: 0, empty: true, forEach: () => {} };
      }
    };
    const _safeAdminGetDoc2 = async (r) => {
      try {
        return await getDoc(r);
      } catch (err) {
        console.warn("Admin2 getDoc fallback:", err && err.message ? err.message : err);
        return { exists: () => false, data: () => ({}), id: r && r.id ? r.id : "" };
      }
    };
    const _safeAdminGetCount2 = async (q) => {
      try {
        return await getCountFromServer(q);
      } catch (err) {
        console.warn("Admin2 getCount fallback:", err && err.message ? err.message : err);
        return { data: () => ({ count: 0 }) };
      }
    };
          if (c && c.id && staticOrBaseIds.has(String(c.id))) toDeleteMap.set(c.id, c);
        });

        // 3) 同じ albumId + name + member の重複（IDは違うが実質同じ登録）
        //    名前ありのものを優先して残し、残りを削除対象に
        const keyGroups = new Map();
        list.forEach(c => {
          if (!c || !c.id) return;
          const key = [String(c.albumId || ""), String(c.name || "").trim(), String(c.member || "").trim()].join("\t");
          if (!String(c.name || "").trim()) return;
          if (!keyGroups.has(key)) keyGroups.set(key, []);
          keyGroups.get(key).push(c);
        });
        keyGroups.forEach(group => {
          if (group.length < 2) return;
          group.sort((a, b) => String(a.id).localeCompare(String(b.id)));
          for (let i = 1; i < group.length; i++) {
            toDeleteMap.set(group[i].id, group[i]);
          }
        });

        const toDelete = Array.from(toDeleteMap.values());

        if (!toDelete.length) {
          /* alert hidden */ console.log(
            "削除できる重複は見つかりませんでした。\n\n" +
            "チェック内容:\n" +
            "・同じドキュメントIDの重複\n" +
            "・静的パック／定義カードとIDが同じ管理者登録\n" +
            "・同じアルバム＋名前＋メンバーの重複登録\n\n" +
            "（現在の管理者カタログ: " + list.length + " 件）"
          );
          return;
        }

        const preview = toDelete.slice(0, 12).map(c =>
          "・" + (c.name || "(無題)") + "（" + (c.member || "—") + " / " + c.id + ")"
        ).join("\n");
        const more = toDelete.length > 12 ? "\n…他 " + (toDelete.length - 12) + " 件" : "";
        const okConfirm = await appConfirm(
          "重複 " + toDelete.length + " 件を削除しますか？\n" +
          "（同一ID・静的パック衝突・同一名・メンバーの重複）\n\n" +
          preview + more,
          "削除する",
          true
        );
        if (!okConfirm) return;

        showToast("削除中... (" + toDelete.length + "件)", "info");
        let ok = 0, fail = 0;
        for (const c of toDelete) {
          try {
            await deleteDoc(doc(db, "cardCatalog", c.id));
            try { await deleteDoc(doc(db, "cardPhotos", c.id)); } catch (_) {}
            delete cardPhotoCache[c.id];
            if (typeof idbDelete === "function") {
              try { await idbDelete("photo_" + c.id); } catch (_) {}
            }
            ok++;
          } catch (e) {
            console.warn("exact-id delete failed", c.id, e);
            fail++;
          }
        }

        const deleteIds = new Set(toDelete.map(c => c.id));
        catalogCardsCache = (catalogCardsCache || []).filter(c => !deleteIds.has(c.id));
        const uniq = new Map();
        catalogCardsCache.forEach(c => { if (c && c.id && !uniq.has(c.id)) uniq.set(c.id, c); });
        catalogCardsCache = Array.from(uniq.values());
        if (typeof idbDelete === "function") {
          try { await idbDelete("catalog_cards"); } catch (_) {}
        }

        /* alert hidden */ console.log("削除完了: " + ok + "件" + (fail ? "（失敗 " + fail + "）" : ""));
        showToast("重複削除: " + ok + "件" + (fail ? "（失敗" + fail + "）" : ""), fail ? "error" : "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (typeof isMyCardsPageOpen === "function" && isMyCardsPageOpen()) {
          if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
          if (typeof renderMyCardsList === "function") renderMyCardsList();
        }
      } catch (e) {
        console.error("adminDeduplicateExactIds", e);
        /* alert hidden */ console.log("処理中にエラーが発生しました。\n" + (e && (e.message || e.code) ? (e.message || e.code) : e));
      }
    };
    window.adminRegisterNewCard = async function() {
      if (!isAdmin()) return;
      const nameEl = document.getElementById("admin-new-card-name");
      const memberEl = document.getElementById("admin-new-card-member");
      const albumEl = document.getElementById("admin-new-card-album");
      const photoEl = document.getElementById("admin-new-card-photo");
      const name = (nameEl?.value || "").trim();
      const member = (memberEl?.value || "").trim();
      const albumId = albumEl?.value || adminCardsAlbum;
      if (!name) return /* alert hidden */ console.log("カード名を入力してください。");
      if (!ILLIT_CARD_ALBUMS.some(a => a.id === albumId)) return /* alert hidden */ console.log("アルバムを選んでください。");
      try {
        const ref = doc(collection(db, "cardCatalog"));
        const cardId = ref.id;
        await setDoc(ref, {
          albumId,
          name,
          member,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        const file = photoEl?.files && photoEl.files[0];
        if (file) {
          const dataUrl = await compressCardWithWatermark(file, PHOTO_THUMB);
          if (isJpegData(dataUrl)) {
            await setDoc(doc(db, "cardPhotos", cardId), {
              data: dataUrl,
              updatedAt: serverTimestamp(),
              updatedBy: currentUser.uid
            }, { merge: true });
            cardPhotoCache[cardId] = dataUrl;
            await idbSet("photo_" + cardId, dataUrl);
          }
        }
        catalogCardsCache.push({ id: cardId, albumId, name, member, admin: true });
        await idbDelete("catalog_cards");
        adminCardsAlbum = albumId;
        showToast("トレカを登録しました", "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (isMyCardsPageOpen()) {
          renderMyCardsAlbumTabs();
          renderMyCardsList();
        }
      } catch (e) {
        console.error(e);
        /* alert hidden */ console.log("登録に失敗しました。\n" + (e?.code || e?.message || ""));
      }
    };

    // 画像のパーセプチュアルハッシュ（超厳格判定用: 16x16 aHash + 9x8 dHash）
    async function computeImageAHash(dataUrl) {
      return new Promise((resolve, reject) => {
        if (!dataUrl || typeof dataUrl !== "string") {
          reject(new Error("empty image src"));
          return;
        }
        const img = new Image();
        // dataURL以外はCORSを試す（失敗しても onerror へ）
        if (!dataUrl.startsWith("data:")) {
          try { img.crossOrigin = "anonymous"; } catch (_) {}
        }
        const timer = setTimeout(() => {
          try { img.src = ""; } catch (_) {}
          reject(new Error("image load timeout"));
        }, 15000);
        img.onload = () => {
          clearTimeout(timer);
          try {
            // aHash: 16x16（細かい差も拾う）
            const aSize = 16;
            const aCanvas = document.createElement("canvas");
            aCanvas.width = aSize;
            aCanvas.height = aSize;
            const aCtx = aCanvas.getContext("2d", { willReadFrequently: true });
            aCtx.drawImage(img, 0, 0, aSize, aSize);
            const aData = aCtx.getImageData(0, 0, aSize, aSize).data;
            const aGrays = [];
            for (let i = 0; i < aData.length; i += 4) {
              aGrays.push(0.299 * aData[i] + 0.587 * aData[i + 1] + 0.114 * aData[i + 2]);
            }
            const aAvg = aGrays.reduce((a, b) => a + b, 0) / aGrays.length;
            let aHash = "";
            for (const g of aGrays) aHash += g >= aAvg ? "1" : "0";

            // dHash: 横方向の勾配（9x8 → 64bit）
            const dw = 9, dh = 8;
            const dCanvas = document.createElement("canvas");
            dCanvas.width = dw;
            dCanvas.height = dh;
            const dCtx = dCanvas.getContext("2d", { willReadFrequently: true });
            dCtx.drawImage(img, 0, 0, dw, dh);
            const dData = dCtx.getImageData(0, 0, dw, dh).data;
            const dGrays = [];
            for (let i = 0; i < dData.length; i += 4) {
              dGrays.push(0.299 * dData[i] + 0.587 * dData[i + 1] + 0.114 * dData[i + 2]);
            }
            let dHash = "";
            for (let y = 0; y < dh; y++) {
              for (let x = 0; x < dw - 1; x++) {
                const idx = y * dw + x;
                dHash += dGrays[idx] >= dGrays[idx + 1] ? "1" : "0";
              }
            }

            aCanvas.width = 0; aCanvas.height = 0;
            dCanvas.width = 0; dCanvas.height = 0;
            resolve({ aHash, dHash });
          } catch (e) { reject(e); }
        };
        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error("image load failed"));
        };
        img.src = dataUrl;
      });
    }
    function hammingDistance(a, b) {
      if (!a || !b || a.length !== b.length) return 999;
      let d = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
      return d;
    }
    /** 超厳格: aHash・dHash ともに完全一致のみ同一とみなす */
    function isExactImageDuplicate(h1, h2) {
      if (!h1 || !h2) return false;
      return h1.aHash === h2.aHash && h1.dHash === h2.dHash;
    }

    window.adminDeduplicateCatalogCards = async function() {
      try {
        if (typeof isAdmin === "function" && !isAdmin()) {
          /* alert hidden */ console.log("管理者のみ実行できます。");
          return;
        }
        if (!currentUser) {
          /* alert hidden */ console.log("ログインが必要です。");
          return;
        }

        showToast("カタログを読み込み中...", "info");

        try {
          await ensureCatalogCardsLoaded(true);
        } catch (e) { console.warn(e); }

        // Firestoreから直接取り直し
        let list = (catalogCardsCache || []).slice();
        try {
          const snap = await _safeAdminGetDocs2(collection(db, "cardCatalog"));
          list = snap.docs.map(d => {
            const data = d.data() || {};
            return {
              id: d.id,
              albumId: data.albumId || "other",
              name: data.name || "",
              member: data.member || "",
              admin: true
            };
          });
          catalogCardsCache = list.filter(c => c.name);
          catalogCardsLoaded = true;
        } catch (e) {
          console.warn("cardCatalog refresh", e);
          /* alert hidden */ console.log("カタログの取得に失敗しました。\n" + (e && (e.code || e.message) ? (e.code || e.message) : e));
          return;
        }

        if (!list.length) {
          /* alert hidden */ console.log("カタログに登録されたカードがありません。\n（管理者追加のカードが0件です）");
          return;
        }

        const okStart = await appConfirm(
          "画像が完全に同一のトレカだけを探して、重複分を削除します。\n" +
          "（超厳格モード: aHash+dHash完全一致のみ）\n\n" +
          "対象: 管理者カタログ " + list.length + " 件\n" +
          "枚数が多いと数分かかることがあります。続行しますか？",
          "画像判定を開始",
          false
        );
        if (!okStart) return;

        showToast("写真を読み込み中... (0/" + list.length + ")", "info");

        // 写真データを揃える（dataURL / http(s) / 相対パス いずれも可）
        const withPhoto = [];
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          let dataUrl = cardPhotoCache[c.id] || c.photoUrl || null;
          if (!dataUrl) {
            try {
              const cached = typeof idbGet === "function" ? await idbGet("photo_" + c.id) : null;
              if (cached) dataUrl = cached;
            } catch (_) {}
          }
          if (!dataUrl) {
            try {
              const snap = await _safeAdminGetDoc2(doc(db, "cardPhotos", c.id));
              if (snap.exists()) {
                const d = snap.data();
                dataUrl = d.data || d.photo || null;
                if (dataUrl) {
                  cardPhotoCache[c.id] = dataUrl;
                  if (typeof idbSet === "function") await idbSet("photo_" + c.id, dataUrl);
                }
              }
            } catch (_) {}
          }
          if (dataUrl && typeof dataUrl === "string") {
            withPhoto.push({ card: c, dataUrl });
          }
          if (i % 10 === 0) {
            showToast("写真を読み込み中... (" + (i + 1) + "/" + list.length + ")", "info");
            await new Promise(r => setTimeout(r, 0));
          }
        }

        if (withPhoto.length < 2) {
          /* alert hidden */ console.log(
            "比較できる写真付きカードが足りません。\n" +
            "カタログ: " + list.length + " 件 / 写真あり: " + withPhoto.length + " 件"
          );
          return;
        }

        showToast("ハッシュ計算中... (0/" + withPhoto.length + ")", "info");
        const hashed = [];
        for (let i = 0; i < withPhoto.length; i++) {
          const item = withPhoto[i];
          try {
            const hash = await computeImageAHash(item.dataUrl);
            if (hash && hash.aHash && hash.dHash) {
              hashed.push({ card: item.card, hash });
            }
          } catch (e) {
            console.warn("hash fail", item.card.id, e);
          }
          if (i % 5 === 0) {
            showToast("ハッシュ計算中... (" + (i + 1) + "/" + withPhoto.length + ")", "info");
            await new Promise(r => setTimeout(r, 0));
          }
        }

        // 超厳格: aHash・dHash ともに完全一致のみ同一とみなす
        const used = new Set();
        const groups = [];
        for (let i = 0; i < hashed.length; i++) {
          if (used.has(i)) continue;
          const group = [hashed[i]];
          used.add(i);
          for (let j = i + 1; j < hashed.length; j++) {
            if (used.has(j)) continue;
            if (isExactImageDuplicate(hashed[i].hash, hashed[j].hash)) {
              group.push(hashed[j]);
              used.add(j);
            }
          }
          if (group.length > 1) groups.push(group);
        }

        const toDelete = [];
        for (const g of groups) {
          g.sort((a, b) => {
            const an = (a.card.name || "").trim() ? 1 : 0;
            const bn = (b.card.name || "").trim() ? 1 : 0;
            if (an !== bn) return bn - an;
            return String(a.card.id).localeCompare(String(b.card.id));
          });
          for (let k = 1; k < g.length; k++) toDelete.push(g[k].card);
        }

        if (!toDelete.length) {
          /* alert hidden */ console.log(
            "完全に同一の画像重複は見つかりませんでした。\n\n" +
            "比較した写真: " + withPhoto.length + " 件\n" +
            "ハッシュ成功: " + hashed.length + " 件\n" +
            "（超厳格モードのため、1ピクセルでも違う画像は対象外です）"
          );
          return;
        }

        const preview = toDelete.slice(0, 8).map(c =>
          "・" + (c.name || c.id) + "（" + (c.member || "メンバーなし") + "）"
        ).join("\n");
        const more = toDelete.length > 8 ? "\n…他 " + (toDelete.length - 8) + " 件" : "";
        const okDel = await appConfirm(
          "画像が完全一致の重複 " + toDelete.length + " 件を削除しますか？\n" +
          "（各グループで1枚だけ残します／超厳格モード）\n\n" +
          preview + more,
          "削除する",
          true
        );
        if (!okDel) return;

        showToast("削除中... (" + toDelete.length + "件)", "info");
        let ok = 0, fail = 0;
        for (const c of toDelete) {
          try {
            await deleteDoc(doc(db, "cardCatalog", c.id));
            try { await deleteDoc(doc(db, "cardPhotos", c.id)); } catch (_) {}
            delete cardPhotoCache[c.id];
            if (typeof idbDelete === "function") {
              try { await idbDelete("photo_" + c.id); } catch (_) {}
            }
            ok++;
          } catch (e) {
            console.warn("dedupe delete failed", c.id, e);
            fail++;
          }
        }

        catalogCardsCache = (catalogCardsCache || []).filter(c => !toDelete.some(d => d.id === c.id));
        if (typeof idbDelete === "function") {
          try { await idbDelete("catalog_cards"); } catch (_) {}
        }

        /* alert hidden */ console.log("画像重複削除 完了: " + ok + "件" + (fail ? "（失敗 " + fail + "）" : ""));
        showToast("画像重複削除: " + ok + "件" + (fail ? "（失敗" + fail + "）" : ""), fail ? "error" : "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards" && typeof renderAdminCardsPanel === "function") {
          renderAdminCardsPanel(el);
        }
        if (typeof isMyCardsPageOpen === "function" && isMyCardsPageOpen()) {
          if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
          if (typeof renderMyCardsList === "function") renderMyCardsList();
        }
      } catch (e) {
        console.error("adminDeduplicateCatalogCards", e);
        /* alert hidden */ console.log("処理中にエラーが発生しました。\n" + (e && (e.message || e.code) ? (e.message || e.code) : e));
      }
    };

    window.adminDeleteCatalogCard = async function(cardId) {
      if (!isAdmin()) return;
      if (!(await appConfirm("このトレカをカタログから削除しますか？\n（写真も一緒に削除されます）", "削除する", true))) return;
      try {
        await deleteDoc(doc(db, "cardCatalog", cardId));
        try { await deleteDoc(doc(db, "cardPhotos", cardId)); } catch (_) {}
        catalogCardsCache = catalogCardsCache.filter(c => c.id !== cardId);
        delete cardPhotoCache[cardId];
        adminSelectedCardIds.delete(cardId);
        await idbDelete("photo_" + cardId);
        await idbDelete("catalog_cards");
        showToast("トレカを削除しました", "info");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (isMyCardsPageOpen()) renderMyCardsList();
      } catch (e) {
        /* alert hidden */ console.log("削除に失敗しました。");
      }
    };
    window.adminUploadCardPhoto = async function(cardId, inputEl) {
      if (!isAdmin()) return;
      const file = inputEl.files && inputEl.files[0];
      inputEl.value = "";
      if (!file) return;
      try {
        const dataUrl = await compressCardWithWatermark(file, PHOTO_THUMB);
        if (!isJpegData(dataUrl)) return /* alert hidden */ console.log("画像の処理に失敗しました。");
        await setDoc(doc(db, "cardPhotos", cardId), {
          data: dataUrl,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        }, { merge: true });
        cardPhotoCache[cardId] = dataUrl;
        await idbSet("photo_" + cardId, dataUrl);
        showToast("写真を登録しました", "success");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (isMyCardsPageOpen()) renderMyCardsList();
      } catch (e) {
        console.error(e);
        /* alert hidden */ console.log("登録に失敗しました。\n" + (e?.code || e?.message || ""));
      }
    };
    window.adminDeleteCardPhoto = async function(cardId) {
      if (!isAdmin()) return;
      if (!(await appConfirm("このトレカ写真を削除しますか？", "削除する", true))) return;
      try {
        await deleteDoc(doc(db, "cardPhotos", cardId));
        delete cardPhotoCache[cardId];
        await idbDelete("photo_" + cardId);
        showToast("写真を削除しました", "info");
        const el = document.getElementById("admin-content");
        if (el && adminTab === "cards") {
    el.innerHTML = "<div class=\"p-4 text-xs text-purple-800 font-bold\">トレカ写真パネルを読み込み中...</div>";
    setTimeout(() => {
      try {
        renderAdminCardsPanel(el);
      } catch (err) {
        console.error("AdminCardsPanel Error:", err);
        el.innerHTML = "<div class=\"p-4 bg-red-50 text-red-700 rounded-xl text-xs\">エラー検出: " + (err.message || err) + "</div>";
      }
    }, 50);
  }
        if (isMyCardsPageOpen()) renderMyCardsList();
      } catch (e) {
        /* alert hidden */ console.log("削除に失敗しました。");
      }
    };

    let myCardsImageFilterIds = null; // Set<string> | null

    function getMyListingCardIds() {
      const ids = new Set();
      if (!currentUser) return ids;
      const posts = (typeof allPosts !== "undefined" && Array.isArray(allPosts)) ? allPosts : [];
      posts.forEach(p => {
        if (!p || p.userId !== currentUser.uid) return;
        if (p.status && p.status !== "active") return;
        if (!(p.isSell || p.kind === "card_sell" || p.kind === "album" || p.kind === "dearlit")) return;
        if (p.catalogCardId) ids.add(p.catalogCardId);
        // 名前一致のフォールバック
        const give = String(p.give || "").trim();
        if (give) {
          for (const a of ILLIT_CARD_ALBUMS) {
            getAlbumCards(a.id).forEach(c => {
              if (c.name && (c.name === give || give.includes(c.name) || c.name.includes(give))) ids.add(c.id);
            });
          }
        }
      });
      return ids;
    }

    window.runMyCardsImageSearch = async function(inputEl) {
      const file = inputEl && inputEl.files && inputEl.files[0];
      if (inputEl) inputEl.value = "";
      if (!file) return;
      const resultEl = document.getElementById("mycards-image-search-result");
      const clearBtn = document.getElementById("mycards-image-search-clear");
      if (resultEl) {
        resultEl.classList.remove("hidden");
        resultEl.innerHTML = '<div class="text-center py-2">🔍 画像から検索中...</div>';
      }
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        });
        const img = await loadImageFromFile(file);
        const query = compressFromImage(img, { maxSide: 1400, quality: 0.92, maxChars: 1200000 }) || dataUrl;
        const matches = await recognizeCardImage(query);
        if (!matches || !matches.length) {
          myCardsImageFilterIds = null;
          if (resultEl) resultEl.innerHTML = `<div class="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3 items-center"><img src="${dataUrl}" alt="" class="w-16 h-20 object-cover rounded-lg bg-gray-100"><div class="text-[13px] text-gray-500">一致するトレカが見つかりませんでした</div></div>`;
          if (clearBtn) clearBtn.classList.remove("hidden");
          renderMyCardsList();
          return;
        }
        myCardsImageFilterIds = null;
        window._myCardsQueryImage = dataUrl;
        if (resultEl) {
          const esc = window.escapeHtml || ((s) => String(s || ""));
          const top3 = matches.slice(0, CARD_CANDIDATE_TOP_K || 3);
          resultEl.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-2xl p-3">
              <div class="flex gap-3 items-center mb-3">
                <img src="${dataUrl}" alt="" class="w-16 h-20 object-cover rounded-lg bg-gray-100">
                <div>
                  <div class="text-[13px] font-medium text-gray-900">検索した画像</div>
                  <div class="text-[12px] text-gray-500 mt-0.5">候補トップ${top3.length}（タップで開く）</div>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                ${top3.map((m, idx) => {
                  const c = m.card || {};
                  const img = (typeof getCardPhoto === "function" && getCardPhoto(c.id)) || c.photoUrl || "";
                  const album = (typeof _candidateAlbumName === "function") ? _candidateAlbumName(c) : (c.albumName || "");
                  const pct = Math.max(0, Math.min(99, Number(m.score) || 0));
                  return `<button type="button" onclick="jumpToSearchedCard('${esc(c.id)}')" class="text-left">
                    <div class="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                      ${img ? `<img src="${esc(img)}" class="w-full h-full object-cover" loading="lazy">` : ""}
                      <span class="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 rounded">${pct}%</span>
                      <span class="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">${idx + 1}位</span>
                    </div>
                    <div class="text-[11px] text-gray-800 truncate mt-1">${esc(c.member || "")}</div>
                    <div class="text-[10px] text-gray-500 truncate">${esc(album || "")}</div>
                    <div class="text-[10px] text-gray-400 truncate">${esc(c.name || "")}</div>
                  </button>`;
                }).join("")}
              </div>
            </div>`;
        }
        if (clearBtn) clearBtn.classList.remove("hidden");
      } catch (e) {
        console.error(e);
        if (resultEl) resultEl.innerHTML = '<div class="text-center py-2 text-red-500">検索に失敗しました</div>';
        /* alert hidden */ console.log("画像検索に失敗しました: " + (e && e.message ? e.message : e));
      }
    };

    window.jumpToSearchedCard = function(cardId) {
      const found = typeof findCardById === "function" ? findCardById(cardId) : null;
      if (!found || !found.card) return;
      myCardsImageFilterIds = null;
      myCardsAlbum = found.card.albumId || (found.album && found.album.id) || myCardsAlbum;
      myCardsMember = "ALL";
      if (typeof renderMyCardsAlbumTabs === "function") renderMyCardsAlbumTabs();
      if (typeof renderMyCardsMemberTabs === "function") renderMyCardsMemberTabs();
      renderMyCardsList();
      openCardDetailModal(cardId);
      setTimeout(function () {
        const el = document.querySelector('[data-card-id="' + cardId.replace(/"/g, "") + '"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    };
    window.clearMyCardsImageSearch = function() {
      myCardsImageFilterIds = null;
      window._myCardsQueryImage = "";
      const resultEl = document.getElementById("mycards-image-search-result");
      const clearBtn = document.getElementById("mycards-image-search-clear");
      if (resultEl) { resultEl.classList.add("hidden"); resultEl.textContent = ""; }
      if (clearBtn) clearBtn.classList.add("hidden");
      renderMyCardsList();
    };

        function getCardStatus(cardId) {
      const s = (userData.myCards || {})[cardId];
      if (typeof s === "number" && s > 0) return "owned";
      return s === "owned" || s === "want" ? s : "none";
    }
    function getCardCount(cardId) {
      const s = (userData.myCards || {})[cardId];
      if (typeof s === "number") return Math.max(0, Math.floor(s));
      if (s === "owned") return 1;
      return 0;
    }
    function encodeOwnedCount(n) {
      const c = Math.max(0, Math.floor(Number(n) || 0));
      if (c <= 0) return null;
      if (c === 1) return "owned";
      return c;
    }
    function getAlbumCards(albumId) {
      const album = ILLIT_CARD_ALBUMS.find(a => a.id === albumId);
      if (!album) return [];
      const base = album.cards.slice();
      const statics = staticPackCards.filter(c => c.albumId === albumId);
      const adminCards = catalogCardsCache.filter(c => c.albumId === albumId);
      const customs = (userData.customCards || []).filter(c => c.albumId === albumId);
      // 同じIDは1件だけ（優先: 定義 → 静的パック → 管理者登録 → カスタム）
      const byId = new Map();
      base.concat(statics).concat(adminCards).concat(customs).forEach(c => {
        if (!c || !c.id) return;
        if (!byId.has(c.id)) byId.set(c.id, c);
      });
      return Array.from(byId.values());
    }
    function findCardById(cardId) {
      for (const a of ILLIT_CARD_ALBUMS) {
        const hit = getAlbumCards(a.id).find(c => c.id === cardId);
        if (hit) return { card: hit, album: a };
      }
      return null;
    }
            async function openMyCardsPage() {
            // autoSwitchOwnedAlbum: 現在のアルバムに所持0件で他に所持があれば自動切替
            try {
                const ownedIds = Object.keys(userData.myCards || {}).filter(id => userData.myCards[id] === "owned");
                if (ownedIds.length > 0 && typeof findCardById === "function") {
                    const curCards = typeof getAlbumCards === "function" ? getAlbumCards(myCardsAlbum) : [];
                    const hasCurOwned = curCards.some(c => userData.myCards[c.id] === "owned");
                    if (!hasCurOwned) {
                        const found = findCardById(ownedIds[ownedIds.length - 1]);
                        if (found && found.card && found.card.albumId) myCardsAlbum = found.card.albumId;
                    }
                }
            } catch (_) {}
      if (!currentUser) return;
      myCardsTab = "own";
      setMyCardsTab("own");

      renderMyCardsAlbumTabs();
      renderMyCardsMemberTabs();
      renderMyCardsList();

      try {
        await Promise.all([ensureCardPhotosLoaded(myCardsAlbum), ensureCatalogCardsLoaded()]);
      } catch (e) { console.warn("mycards load:", e); }

      renderMyCardsAlbumTabs();
      renderMyCardsMemberTabs();
      renderMyCardsList();
      const pub = document.getElementById("mycards-public");
      if (pub) pub.checked = !!userData.collectionPublic;
      renderMyCardsShareStats();
    }

    window.openMyCardsModal = function() { switchTab('mycards'); };
    window.closeMyCardsModal = function() { switchTab('home'); };
    function isMyCardsPageOpen() {
      const sec = document.getElementById("mycards-section");
      return sec && !sec.classList.contains("hidden");
    }
    window.setMyCardsTab = function(tab) {
      myCardsTab = tab;
      document.getElementById("mycards-own-panel").classList.toggle("hidden", tab !== "own");
      document.getElementById("mycards-share-panel").classList.toggle("hidden", tab !== "share");
      const active = "py-2 rounded-full text-[13px] font-medium bg-white text-gray-900 shadow-sm";
      const normal = "py-2 rounded-full text-[13px] font-medium text-gray-500";
      document.getElementById("mycards-tab-own").className = tab === "own" ? active : normal;
      document.getElementById("mycards-tab-share").className = tab === "share" ? active : normal;
      if (tab === "share") renderMyCardsShareStats();
    };
    window.toggleMyCardsPicker = function(which) {
      const album = document.getElementById("mycards-album-tabs");
      const member = document.getElementById("mycards-member-tabs");
      if (!album || !member) return;
      if (which === "album") {
        album.classList.toggle("hidden");
        member.classList.add("hidden");
      } else {
        member.classList.toggle("hidden");
        album.classList.add("hidden");
      }
    };
    function renderMyCardsOwnRate(owned, total) {
      const el = document.getElementById("mycards-own-rate");
      if (el) {
        const pct = total ? Math.round((owned / total) * 100) : 0;
        el.textContent = pct + "%";
      }
      renderMyCardsProgress(owned, total);
    }
    function renderMyCardsProgress(owned, total) {
      const el = document.getElementById("mycards-progress");
      if (!el) return;
      const album = ILLIT_CARD_ALBUMS.find(a => a.id === myCardsAlbum);
      const pct = total ? Math.round((owned / total) * 100) : 0;
      const title = (album ? album.name : "アルバム") + (myCardsMember !== "ALL" ? " / " + myCardsMember : "");
      const complete = total > 0 && owned >= total;
      el.innerHTML = `<div class="binder-progress-top">
          <div>
            <div class="binder-progress-title">${escapeHtml(title)}</div>
            <div class="binder-progress-meta">所持 ${owned} / ${total}枚（コンプ率 ${pct}%）</div>
          </div>
          ${complete ? `<span class="binder-complete-badge">✨ COMPLETE</span>` : `<span class="text-[11px] font-bold text-violet-600">${pct}%</span>`}
        </div>
        <div class="binder-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
    }
    function renderMyCardsAlbumTabs() {
      const chips = document.getElementById("mycards-album-tabs");
      const sel = document.getElementById("mycards-album-select");
      if (sel) {
        sel.innerHTML = ILLIT_CARD_ALBUMS.map(a =>
          `<option value="${a.id}" ${a.id === myCardsAlbum ? "selected" : ""}>${escapeHtml(a.name)}</option>`
        ).join("");
      }
      if (chips) {
        chips.innerHTML = ILLIT_CARD_ALBUMS.map(a =>
          `<button type="button" class="binder-chip ${a.id === myCardsAlbum ? "is-on" : ""}" onclick="setMyCardsAlbum('${escapeHtml(a.id)}')">${escapeHtml(a.name)}</button>`
        ).join("");
      }
    }
    function renderMyCardsMemberTabs() {
      const chips = document.getElementById("mycards-member-tabs");
      const sel = document.getElementById("mycards-member-select");
      const cards = getAlbumCards(myCardsAlbum);
      const order = ["ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"];
      const existing = new Set(cards.map(c => String(c.member || "").split(/[ (]/)[0]).filter(Boolean));
      const sorted = [...order];
      existing.forEach(m => { if (!sorted.includes(m)) sorted.push(m); });
      const tabsFinal = [{ key: "ALL", label: "全員" }, ...sorted.filter(m => existing.has(m)).map(m => ({ key: m, label: m }))];
      if (sel) {
        sel.innerHTML = tabsFinal.map(t =>
          `<option value="${escapeHtml(t.key)}" ${t.key === myCardsMember ? "selected" : ""}>${escapeHtml(t.label)}</option>`
        ).join("");
      }
      if (chips) {
        chips.innerHTML = tabsFinal.map(t =>
          `<button type="button" class="binder-chip ${t.key === myCardsMember ? "is-on" : ""}" onclick="setMyCardsMember('${escapeHtml(t.key)}')">${escapeHtml(t.label)}</button>`
        ).join("");
      }
    }
    window.toggleMyCardsFilter = function( whic ) {
      if (whic === "missingOnly") myCardsFilterMissingOnly = !myCardsFilterMissingOnly;
      if (whic === "listingOnly") myCardsFilterListingOnly = !myCardsFilterListingOnly;
      const miss = document.getElementById("mycards-filter-missing");
      const list = document.getElementById("mycards-filter-listing");
      if (miss) miss.classList.toggle("is-on", !!myCardsFilterMissingOnly);
      if (list) list.classList.toggle("is-on", !!myCardsFilterListingOnly);
      renderMyCardsList();
    };
    window.setMyCardsAlbum = async function(id) {
      myCardsAlbum = id;
      myCardsMember = "ALL";
      renderMyCardsAlbumTabs();
      renderMyCardsMemberTabs();
      const el = document.getElementById("mycards-list");
      if (el) el.innerHTML = `<div class="binder-sheet"><p class="text-xs text-gray-500 text-center py-8">読み込み中...</p></div>`;
      await ensureCatalogCardsLoaded();
      await ensureCardPhotosLoaded(id);
      renderMyCardsMemberTabs();
      renderMyCardsList();
    };
    window.setMyCardsMember = function(member) {
      myCardsMember = member;
      renderMyCardsMemberTabs();
      renderMyCardsList();
    };


      
    function renderMyCardsList() {
      const el = document.getElementById("mycards-list");
      if (!el) return;
      const allAlbumCards = getAlbumCards(myCardsAlbum);
      const norm = s => String(s || "").split(/[ (]/)[0];
      const rateCards = myCardsMember === "ALL"
        ? allAlbumCards
        : allAlbumCards.filter(c => norm(c.member) === myCardsMember);
      const rateOwned = rateCards.filter(c => getCardStatus(c.id) === "owned").length;
      renderMyCardsOwnRate(rateOwned, rateCards.length);

      let cards = rateCards.slice();
      if (myCardsImageFilterIds) cards = cards.filter(c => myCardsImageFilterIds.has(c.id));
      const listingCardIds = getMyListingCardIds();
      if (myCardsFilterMissingOnly) cards = cards.filter(c => getCardStatus(c.id) !== "owned");
      if (myCardsFilterListingOnly) cards = cards.filter(c => listingCardIds.has(c.id));

      const missBtn = document.getElementById("mycards-filter-missing");
      const listBtn = document.getElementById("mycards-filter-listing");
      if (missBtn) missBtn.classList.toggle("is-on", !!myCardsFilterMissingOnly);
      if (listBtn) listBtn.classList.toggle("is-on", !!myCardsFilterListingOnly);

      if (cards.length === 0) {
        el.innerHTML = `<div class="binder-sheet"><p class="text-xs text-gray-500 text-center py-8">該当するカードがありません。<br>フィルタを外すか、下からカスタム追加できます。</p></div>`;
        return;
      }

      el.innerHTML = `<div class="binder-sheet">
        <div class="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-2 px-0.5">
          <span>9ポケット風バインダー · ${cards.length}枠</span>
          <span class="text-[10px] font-normal text-gray-500">タップで拡大</span>
        </div>
        <div class="binder-grid">
          ${cards.map(c => {
            const st = getCardStatus(c.id);
            const count = getCardCount(c.id);
            const isOwned = st === "owned";
            const isWant = st === "want";
            const photo = getCardPhoto(c.id);
            const watching = !!(userData.cardWatch || {})[c.id];
            const isListing = listingCardIds.has(c.id);
            const nameLabel = String(c.member || "").split(/[ (]/)[0] || "";
            const pocketClass = isOwned ? "is-owned" : (isWant ? "is-want" : "is-missing");
            const imgHtml = photo
              ? `<img src="${escapeHtml(photo)}" loading="lazy" decoding="async" alt="${escapeHtml(c.name)}" width="110" height="170" style="filter:none;-webkit-filter:none;opacity:1">`
              : `<div class="binder-fallback"><span>🃏</span><span>${escapeHtml(nameLabel || c.name || "")}</span></div>`;
            const countPill = isOwned && count >= 2
              ? `<span class="binder-count-pill">×${count}</span>`
              : (isOwned ? `<span class="binder-count-pill" style="background:rgba(16,185,129,.9)">✓</span>` : (isWant ? `<span class="binder-count-pill" style="background:rgba(236,72,153,.9)">欲</span>` : `<span class="binder-count-pill" style="background:rgba(0,0,0,.4)">未</span>`));
            return `<button type="button" data-card-id="${escapeHtml(c.id)}" onclick="openCardDetailModal('${escapeHtml(c.id)}')" class="binder-pocket ${pocketClass}" aria-label="${escapeHtml(c.name)}">
              ${isListing ? `<span class="binder-listing-tag">出品中</span>` : ""}
              ${imgHtml}
              ${countPill}
              ${watching ? `<span class="binder-watch-dot">🔔</span>` : ""}
              ${nameLabel ? `<span class="binder-member-chip">${escapeHtml(nameLabel)}</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </div>`;
    }

    window.openCardDetailModal = function(cardId) {
      detailCardId = cardId;
      renderCardDetailModal();
      const modal = document.getElementById("card-detail-modal");
      if (modal) modal.classList.remove("hidden");
    };

    window.closeCardDetailModal = function() {
      detailCardId = null;
      const modal = document.getElementById("card-detail-modal");
      if (modal) modal.classList.add("hidden");
    
      if (typeof renderMyCardsPieCharts === "function") renderMyCardsPieCharts();
    };

    function renderCardDetailModal() {
      if (!detailCardId) return;
      const found = findCardById(detailCardId);
      const bodyEl = document.getElementById("card-detail-body");
      if (!found || !bodyEl) return;

      const { card, album } = found;
      const st = getCardStatus(card.id);
      const count = getCardCount(card.id);
      const isCustom = !!card.custom;
      const photo = getCardPhoto(card.id);
      const watching = !!(userData.cardWatch || {})[card.id];

      const bigImg = photo
        ? `<div class="binder-holo w-48 mx-auto aspect-[55/85] rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-white" id="binder-holo-card">
             <img src="${escapeHtml(photo)}" alt="${escapeHtml(card.name)}" loading="eager" decoding="async">
             <span class="binder-holo-sheen" aria-hidden="true"></span>
           </div>`
        : `<div class="w-48 mx-auto aspect-[55/85] rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-white shadow-inner flex flex-col items-center justify-center text-purple-300">
             <span class="text-4xl mb-1">🃏</span>
             <span class="text-xs text-gray-400">画像未登録</span>
           </div>`;

      const statusBtn = (key, label, activeStyle) => {
        const active = st === key;
        return `<button type="button" onclick="setCardStatusFromDetail('${escapeHtml(card.id)}', '${key}')" class="flex-1 py-2.5 rounded-xl font-bold text-xs transition border ${
          active
            ? activeStyle + " shadow-sm"
            : "bg-white/70 text-gray-500 border-gray-200 hover:bg-white"
        }">${label}</button>`;
      };

      bodyEl.innerHTML = `
        <div class="pt-1 space-y-3">
          ${bigImg}
          <div class="text-center space-y-0.5">
            <div class="text-[12px] text-gray-600">${escapeHtml(album.name || "")}${card.member ? "　" + escapeHtml(String(card.member).split(/[ (]/)[0]) : ""}</div>
            <h3 class="text-base font-bold text-gray-900">${escapeHtml(card.name)}</h3>
            <div class="pt-0.5"><button type="button" onclick="navigator.clipboard?.writeText('${escapeHtml(card.id)}');this.textContent='ID: ${escapeHtml(card.id)} (コピー済)'" class="inline-block text-[11px] font-mono text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md border border-gray-200">ID: ${escapeHtml(card.id)}</button></div>
          </div>

          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-gray-600 px-0.5">所持ステータス</div>
            <div class="flex gap-1.5">
              ${statusBtn("none", "未所持", "bg-gray-600 text-white border-gray-600")}
              ${statusBtn("owned", "✓ 所持", "bg-emerald-500 text-white border-emerald-500")}
              ${statusBtn("want", "♥ 欲しい", "bg-pink-500 text-white border-pink-500")}
            </div>
          </div>

          <div class="space-y-1.5 ${st === "owned" ? "" : "opacity-50 pointer-events-none"}">
            <div class="text-[11px] font-bold text-gray-600 px-0.5">所持枚数</div>
            <div class="binder-qty">
              <button type="button" onclick="adjustCardCount('${escapeHtml(card.id)}', -1)" aria-label="減らす">−</button>
              <div class="binder-qty-val">${Math.max(st === "owned" ? count : 0, 0)}</div>
              <button type="button" onclick="adjustCardCount('${escapeHtml(card.id)}', 1)" aria-label="増やす">＋</button>
            </div>
          </div>

          <button type="button" onclick="toggleCardWatch('${escapeHtml(card.id)}')" class="w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 border ${
            watching
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "bg-white/80 text-gray-600 border-gray-200 hover:bg-white"
          }">
            <span>${watching ? "🔔 出品通知 ON（出品されたら通知）" : "🔕 出品されたら通知を受け取る"}</span>
          </button>

          <button type="button" onclick="searchCardInListings('${escapeHtml(card.name)}')" class="w-full py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 font-bold text-xs hover:bg-teal-100 transition">
            🔍 このトレカの現在の出品を探す
          </button>
          <button type="button" onclick="sellThisCard('${escapeHtml(card.id)}')" class="w-full py-2.5 rounded-xl bg-[#ff4d4f] text-white font-bold text-xs">
            このトレカを出品する
          </button>

          ${isCustom ? `<button type="button" onclick="removeCustomCardFromDetail('${escapeHtml(card.id)}')" class="w-full py-1.5 text-[11px] text-red-500 underline">このカスタムカードを削除</button>` : ""}
        </div>`;
      if (typeof window.bindBinderHolo === "function") window.bindBinderHolo();
    }

    window.adjustCardCount = async function(cardId, delta) {
      if (!currentUser || !cardId) return;
      const st = getCardStatus(cardId);
      let next = getCardCount(cardId) + (Number(delta) || 0);
      if (st !== "owned" && next > 0) {
        /* promote to owned */
      } else if (st === "want" && next <= 0) {
        return;
      }
      next = Math.max(0, Math.min(99, next));
      const map = { ...(userData.myCards || {}) };
      const enc = encodeOwnedCount(next);
      if (enc == null) {
        if (st === "want") map[cardId] = "want";
        else delete map[cardId];
      } else {
        map[cardId] = enc;
      }
      userData.myCards = map;
      renderCardDetailModal();
      renderMyCardsList();
      renderMyCardsShareStats();
      try { await saveUserData({ myCards: map }); } catch (e) { showToast("保存に失敗しました", "error"); }
    };

    window.sellThisCard = async function(cardId) {
      if (typeof closeCardDetailModal === "function") closeCardDetailModal();
      if (typeof openPostModal !== "function") return;
      await openPostModal("card_sell");
      if (typeof selectPostCard === "function") selectPostCard(cardId);
    };
    window.setCardStatusFromDetail = async function(cardId, nextStatus) {
      if (!currentUser) return;
      const map = { ...(userData.myCards || {}) };
      if (nextStatus === "none") delete map[cardId];
      else if (nextStatus === "owned") {
        const cur = getCardCount(cardId);
        map[cardId] = encodeOwnedCount(Math.max(1, cur || 1));
      } else map[cardId] = nextStatus;
      userData.myCards = map;
      renderCardDetailModal();
      renderMyCardsList();
      renderMyCardsShareStats();
      try { await saveUserData({ myCards: map }); } catch (e) { showToast("保存に失敗しました", "error"); }
    };

    window.closeBinderShareModal = function() {
      const m = document.getElementById("binder-share-modal");
      if (m) m.classList.add("hidden");
    };
    window.generateTradeWantShareImage = async function() {
      try {
        const dataUrl = await buildTradeWantShareCanvas();
        if (!dataUrl) { showToast("生成できるカードがありません", "info"); return; }
        _binderShareDataUrl = dataUrl;
        const img = document.getElementById("binder-share-preview");
        const dl = document.getElementById("binder-share-download");
        if (img) img.src = dataUrl;
        if (dl) dl.href = dataUrl;
        document.getElementById("binder-share-modal")?.classList.remove("hidden");
      } catch (e) {
        console.warn(e);
        showToast("画像の生成に失敗しました", "error");
      }
    };
    window.shareBinderTradeWantImage = async function() {
      if (!_binderShareDataUrl) return;
      try {
        const blob = await (await fetch(_binderShareDataUrl)).blob();
        const file = new File([blob], "illit-trade-want-give.png", { type: "image/png" });
        const text = "ILLIT Trade 譲・求リスト #ILLIT #トレカ交換";
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text, title: "ILLIT Trade 譲・求" });
          return;
        }
      } catch (_) {}
      const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent("ILLIT Trade 譲・求リスト #ILLIT #トレカ交換\nhttps://kpop-trade.jp/");
      window.open(url, "_blank", "noopener");
      showToast("画像を保存してからXに添付してください", "info");
    };
    async function buildTradeWantShareCanvas() {
      const wants = [];
      const gives = [];
      const albums = ILLIT_CARD_ALBUMS || [];
      albums.forEach(a => {
        getAlbumCards(a.id).forEach(c => {
          const st = getCardStatus(c.id);
          const cnt = getCardCount(c.id);
          const photo = getCardPhoto(c.id);
          if (st !== "owned") wants.push({ card: c, album: a, photo });
          else if (cnt >= 2) gives.push({ card: c, album: a, photo, count: cnt });
        });
      });
      const maxRows = 12;
      const wantSlice = wants.slice(0, maxRows);
      const giveSlice = gives.slice(0, maxRows);
      if (!wantSlice.length && !giveSlice.length) return null;

      const W = 1080, H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#fff7fb");
      grad.addColorStop(1, "#f3e8ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#111827";
      ctx.font = "800 54px Quicksand, sans-serif";
      ctx.fillText("ILLIT Trade", 56, 90);
      ctx.font = "700 28px sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("譲・求リスト", 56, 132);
      ctx.font = "600 22px sans-serif";
      ctx.fillText("求 = 未所持　／　譲 = 2枚以上", 56, 168);

      async function drawCol(title, items, x0, color) {
        ctx.fillStyle = color;
        ctx.font = "800 32px sans-serif";
        ctx.fillText(title + "（" + items.length + "）", x0, 230);
        let y = 260;
        for (const it of items) {
          const boxW = 440, boxH = 78;
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          roundRect(ctx, x0, y, boxW, boxH, 16);
          ctx.fill();
          if (it.photo) {
            try {
              const im = await loadImg(it.photo);
              ctx.save();
              roundRect(ctx, x0 + 10, y + 8, 46, 62, 8);
              ctx.clip();
              ctx.drawImage(im, x0 + 10, y + 8, 46, 62);
              ctx.restore();
            } catch (_) {}
          }
          ctx.fillStyle = "#111";
          ctx.font = "700 22px sans-serif";
          const label = (it.card.member ? String(it.card.member).split(/[ (]/)[0] + " " : "") + (it.card.name || "");
          ctx.fillText(truncate(ctx, label, 320), x0 + 68, y + 34);
          ctx.fillStyle = "#6b7280";
          ctx.font = "600 18px sans-serif";
          ctx.fillText((it.album && it.album.name ? it.album.name : "") + (it.count ? "  ×" + it.count : ""), x0 + 68, y + 58);
          y += 88;
        }
      }
      function truncate(c, text, maxW) {
        if (c.measureText(text).width <= maxW) return text;
        let t = text;
        while (t.length > 1 && c.measureText(t + "…").width > maxW) t = t.slice(0, -1);
        return t + "…";
      }
      function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
      }
      function loadImg(src) {
        return new Promise((resolve, reject) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = src;
        });
      }
      await drawCol("求", wantSlice, 56, "#db2777");
      await drawCol("譲", giveSlice, 560, "#059669");
      ctx.fillStyle = "rgba(17,24,39,0.45)";
      ctx.font = "600 20px sans-serif";
      ctx.fillText("kpop-trade.jp  ·  非公式ファンサービス", 56, H - 40);
      return canvas.toDataURL("image/png");
    }

    window.removeCustomCardFromDetail = async function(cardId) {
      closeCardDetailModal();
      await removeCustomCard(cardId);
    };

    window.searchCardInListings = function(cardName) {
      closeCardDetailModal();
      switchTab("home");
      const searchEl = document.getElementById("search-input");
      if (searchEl) searchEl.value = cardName;
      setSearch(cardName);
      showToast(`「${cardName}」で絞り込みました`, "info");
    };

    window.toggleCardWatch = async function(cardId) {
      if (!currentUser || !cardId) return;
      const map = { ...(userData.cardWatch || {}) };
      const on = !!map[cardId];
      try {
        if (on) {
          delete map[cardId];
          await deleteDoc(doc(db, "cardWatchers", cardId, "users", currentUser.uid));
        } else {
          map[cardId] = true;
          await setDoc(doc(db, "cardWatchers", cardId, "users", currentUser.uid), {
            uid: currentUser.uid,
            createdAt: serverTimestamp()
          });
        }
        userData.cardWatch = map;
        await saveUserData({ cardWatch: map });
        renderMyCardsList();
        if (detailCardId === cardId) renderCardDetailModal();
        showToast(on ? "出品通知をオフにしました" : "出品されたら通知します", on ? "info" : "success");
      } catch (e) {
        console.error(e);
        showToast("通知設定に失敗しました", "error");
      }
    };
    window.cycleCardStatus = async function(cardId) {
      if (!currentUser) return;
      const order = ["none", "owned", "want"];
      const cur = getCardStatus(cardId);
      const next = order[(order.indexOf(cur) + 1) % order.length];
      const map = { ...(userData.myCards || {}) };
      if (next === "none") delete map[cardId];
      else map[cardId] = next;
      userData.myCards = map;
      renderMyCardsList();
      renderMyCardsShareStats();
      try { await saveUserData({ myCards: map }); } catch (e) { showToast("保存に失敗しました", "error"); }
    };
    window.openAddCustomCard = function() {
      const sel = document.getElementById("add-card-album");
      sel.innerHTML = ILLIT_CARD_ALBUMS.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
      sel.value = myCardsAlbum || "other";
      document.getElementById("add-card-name").value = "";
      document.getElementById("add-card-member").value = "";
      document.getElementById("add-card-modal").classList.remove("hidden");
    };
    window.closeAddCustomCard = function() { document.getElementById("add-card-modal").classList.add("hidden"); };
    window.submitAddCustomCard = async function() {
      const albumId = document.getElementById("add-card-album").value;
      const name = document.getElementById("add-card-name").value.trim();
      const member = document.getElementById("add-card-member").value;
      if (!name) return /* alert hidden */ console.log("カード名を入力してください。");
      const id = "custom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const list = [...(userData.customCards || [])];
      list.push({ id, name, member, albumId, custom: true });
      userData.customCards = list;
      userData.myCards = { ...(userData.myCards || {}), [id]: "owned" };
      closeAddCustomCard();
      myCardsAlbum = albumId;
      renderMyCardsAlbumTabs();
      renderMyCardsList();
      try { await saveUserData({ customCards: list, myCards: userData.myCards }); showToast("追加しました", "success"); }
      catch (e) { showToast("保存に失敗しました", "error"); }
    };
    window.removeCustomCard = async function(cardId) {
      if (!(await appConfirm("このカスタムカードを削除しますか？", "削除する", true))) return;
      userData.customCards = (userData.customCards || []).filter(c => c.id !== cardId);
      const map = { ...(userData.myCards || {}) };
      delete map[cardId];
      userData.myCards = map;
      renderMyCardsList();
      try { await saveUserData({ customCards: userData.customCards, myCards: map }); } catch (e) {}
    };
    
    // ===== 全体＆アルバム別コンプ率ドーナツ円グラフ =====
    window.renderMyCardsPieCharts = function() {
      if (!Array.isArray(ILLIT_CARD_ALBUMS)) return;

      const anchorEl =
        document.getElementById("mycards-share-stats") ||
        document.getElementById("mycards-member-tabs") ||
        document.getElementById("mycards-list");
      if (!anchorEl || !anchorEl.parentNode) return;

      let container = document.getElementById("my-cards-pie-dashboard");
      if (!container) {
        container = document.createElement("div");
        container.id = "my-cards-pie-dashboard";
        container.className = "mb-3 space-y-2.5";
        anchorEl.parentNode.insertBefore(container, anchorEl);
      }

      let totalAll = 0;
      let totalOwned = 0;
      let totalWant = 0;
      const albumStats = [];

      ILLIT_CARD_ALBUMS.forEach(alb => {
        const cards = getAlbumCards(alb.id) || [];
        const total = cards.length;
        if (total === 0) return;
        let owned = 0;
        let want = 0;
        cards.forEach(c => {
          const st = getCardStatus(c.id);
          if (st === "owned") owned++;
          else if (st === "want") want++;
        });
        totalAll += total;
        totalOwned += owned;
        totalWant += want;
        const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
        const wantPct = total > 0 ? Math.round((want / total) * 100) : 0;
        albumStats.push({ id: alb.id, name: alb.name, total, owned, want, pct, wantPct });
      });

      if (totalAll === 0) {
        container.innerHTML = "";
        return;
      }

      const overallPct = Math.round((totalOwned / totalAll) * 100);
      const overallWantPct = Math.round((totalWant / totalAll) * 100);
      const ownedDeg = Math.round((totalOwned / totalAll) * 360);
      const wantDeg = Math.min(360, ownedDeg + Math.round((totalWant / totalAll) * 360));
      const remainTotal = Math.max(0, totalAll - totalOwned);

      const overallRingStyle =
        "background: conic-gradient(#ec4899 0deg " + ownedDeg + "deg, #60a5fa " + ownedDeg + "deg " + wantDeg + "deg, #e5e7eb " + wantDeg + "deg 360deg);";

      const albumCardsHtml = albumStats.map(st => {
        const aOwnedDeg = Math.round((st.owned / st.total) * 360);
        const aWantDeg = Math.min(360, aOwnedDeg + Math.round((st.want / st.total) * 360));
        const isComp = st.owned === st.total && st.total > 0;
        const ringColor = isComp ? "#f59e0b" : "#ec4899";
        const ringBg =
          "background: conic-gradient(" + ringColor + " 0deg " + aOwnedDeg + "deg, #93c5fd " + aOwnedDeg + "deg " + aWantDeg + "deg, #f3f4f6 " + aWantDeg + "deg 360deg);";
        const safeName = String(st.name || "").replace(/</g, "&lt;");
        const safeId = String(st.id || "").replace(/"/g, "&quot;");
        return (
          '<button type="button" data-pie-album="' + safeId + '" onclick="selectAlbumFromPieChart(this.dataset.pieAlbum)" ' +
          'class="text-left bg-white/95 hover:bg-white border ' + (isComp ? 'border-amber-300 ring-1 ring-amber-200' : 'border-pink-100') + ' rounded-2xl p-2 flex items-center gap-2 shadow-xs transition active:scale-95">' +
            '<img src="albums/' + safeId + '.jpg" alt="" class="w-11 h-11 rounded-xl object-cover shrink-0 border border-pink-100 shadow-xs" onerror="this.style.display=\'none\'">' + '<img src="albums/' + safeId + '.jpg" alt="" class="w-11 h-11 rounded-xl object-cover shrink-0 border border-pink-100 shadow-xs" onerror="this.style.display=\'none\'">' + '<div class="relative w-11 h-11 rounded-full shrink-0 flex items-center justify-center" style="' + ringBg + '">' +
              '<div class="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[9px] font-extrabold ' + (isComp ? 'text-amber-600' : 'text-gray-800') + '">' +
                st.pct + '%' +
              '</div>' +
            '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<div class="text-[11px] font-bold text-gray-800 truncate">' + safeName + '</div>' +
              '<div class="text-[10px] text-gray-500"><span class="font-bold text-pink-600">' + st.owned + '</span> / ' + st.total + '枚</div>' +
              (isComp ? '<div class="text-[9px] font-extrabold text-amber-600">👑 COMPLETE!</div>' : '<div class="text-[9px] text-gray-400">あと' + (st.total - st.owned) + '枚</div>') +
            '</div>' +
          '</button>'
        );
      }).join("");

      container.innerHTML =
        '<div class="liquid-glass-card rounded-2xl p-3 border border-pink-200/80 shadow-sm space-y-2.5">' +
          '<div class="flex items-center justify-between">' +
            '<div class="text-xs font-extrabold text-pink-800">📊 コレクション達成率</div>' +
            '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">' +
              (remainTotal === 0 ? '👑 全種コンプリート！' : 'あと ' + remainTotal + ' 枚でコンプ') +
            '</span>' +
          '</div>' +
          '<div class="flex items-center gap-3.5 bg-white/90 rounded-xl p-2.5 border border-pink-100">' +
            '<div class="relative rounded-full shrink-0 flex items-center justify-center shadow-inner" style="' + overallRingStyle + '; width:72px; height:72px;">' +
              '<div class="w-12 h-12 rounded-full bg-white flex flex-col items-center justify-center leading-tight">' +
                '<span class="text-[8px] font-bold text-gray-400">TOTAL</span>' +
                '<span class="text-sm font-black text-pink-600">' + overallPct + '%</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex-1 space-y-1 text-xs">' +
              '<div class="flex items-center justify-between">' +
                '<span class="flex items-center gap-1.5 text-gray-700 font-bold"><span class="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>所持</span>' +
                '<span class="font-extrabold text-gray-900">' + totalOwned + ' <span class="text-[10px] font-normal text-gray-500">/ ' + totalAll + '枚</span></span>' +
              '</div>' +
              '<div class="flex items-center justify-between">' +
                '<span class="flex items-center gap-1.5 text-gray-700 font-bold"><span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>求 (Want)</span>' +
                '<span class="font-bold text-blue-600">' + totalWant + '枚 <span class="text-[10px] font-normal text-gray-400">(' + overallWantPct + '%)</span></span>' +
              '</div>' +
              '<div class="flex items-center justify-between">' +
                '<span class="flex items-center gap-1.5 text-gray-500"><span class="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block"></span>未所持</span>' +
                '<span class="text-gray-600 font-semibold">' + Math.max(0, totalAll - totalOwned - totalWant) + '枚</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="text-[10px] font-bold text-gray-600 mb-1">💿 アルバム別コンプ率（タップで表示）</div>' +
            '<div class="grid grid-cols-2 gap-1.5">' + albumCardsHtml + '</div>' +
          '</div>' +
        '</div>';
    };

    window.selectAlbumFromPieChart = function(albumId) {
      try {
        if (typeof setMyCardsTab === "function") setMyCardsTab("own");
        if (typeof setMyCardsAlbum === "function") setMyCardsAlbum(albumId);
      } catch (_) {}
    };

    setInterval(() => {
      if (typeof window.renderMyCardsPieCharts === "function") {
        const d = document.getElementById("my-cards-pie-dashboard");
        if (!d || !d.innerHTML) window.renderMyCardsPieCharts();
      }
    }, 800);

    
    // ===== 全体＆アルバム別コンプ率ドーナツ円グラフ =====
    function renderMyCardsShareStats() {
      try { if (typeof window.renderMyCardsPieCharts === "function") window.renderMyCardsPieCharts(); } catch (e) { console.error(e); }
      const el = document.getElementById("mycards-share-stats");
      if (!el) return;
      const map = userData.myCards || {};
      let owned = 0, want = 0;
      Object.values(map).forEach(v => { if (v === "owned") owned++; else if (v === "want") want++; });
      const totalDefined = ILLIT_CARD_ALBUMS.reduce((s, a) => s + a.cards.length, 0) + staticPackCards.length + catalogCardsCache.length + (userData.customCards || []).length;
      el.innerHTML = `<div class="liquid-glass-input rounded-xl p-3 space-y-1">
        <div>所持: <b class="text-emerald-700">${owned}</b> 枚</div>
        <div>欲しい: <b class="text-pink-600">${want}</b> 枚</div>
        <div class="text-[10px] text-gray-500">登録カード種（定義＋カスタム）: ${totalDefined}</div>
      </div>`;
    
      try {
        if (typeof renderMyCardsPieCharts === "function") renderMyCardsPieCharts();
      } catch (e) {
        console.warn("renderMyCardsPieCharts error:", e);
      }
    
      try {
        if (typeof renderMyCardsPieCharts === "function") renderMyCardsPieCharts();
      } catch (e) {
        console.warn("renderMyCardsPieCharts error:", e);
      }
    }

    // ===== 全体＆アルバムごとのコンプ率ドーナツ円グラフ描画 =====
window.renderMyCardsPieCharts = function() {
  const container = document.getElementById("mycards-pie-charts");
  if (!container) return;

  const map = (typeof userData !== "undefined" && userData && userData.myCards) ? userData.myCards : {};
  const albums = window.ILLIT_CARD_ALBUMS || [];
  let totalAll = 0, totalOwned = 0, totalWant = 0;
  const albumStats = [];

  albums.forEach(alb => {
    const cards = (typeof getAlbumCards === "function") ? getAlbumCards(alb.id) : [];
    const total = cards.length;
    let owned = 0, want = 0;
    cards.forEach(c => {
      const st = map[c.id];
      if (st === "owned") owned++;
      else if (st === "want") want++;
    });
    totalAll += total;
    totalOwned += owned;
    totalWant += want;
    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
    const wantPct = total > 0 ? Math.round((want / total) * 100) : 0;
    albumStats.push({ id: alb.id, name: alb.name, total, owned, want, pct, wantPct });
  });

  if (totalAll === 0) {
    container.innerHTML = "";
    return;
  }

  const overallPct = Math.round((totalOwned / totalAll) * 100);
  const overallWantPct = Math.round((totalWant / totalAll) * 100);
  const ownedDeg = Math.round((totalOwned / totalAll) * 360);
  const wantDeg = Math.min(360, ownedDeg + Math.round((totalWant / totalAll) * 360));
  const overallRingStyle = "background: conic-gradient(#ec4899 0deg " + ownedDeg + "deg, #60a5fa " + ownedDeg + "deg " + wantDeg + "deg, #e5e7eb " + wantDeg + "deg 360deg);";

  const albumCardsHtml = albumStats.map(st => {
    const aOwnedDeg = st.total > 0 ? Math.round((st.owned / st.total) * 360) : 0;
    const aWantDeg = st.total > 0 ? Math.min(360, aOwnedDeg + Math.round((st.want / st.total) * 360)) : 0;
    const isComp = st.owned === st.total && st.total > 0;
    const ringColor = isComp ? "#f59e0b" : "#ec4899";
    const ringBg = "background: conic-gradient(" + ringColor + " 0deg " + aOwnedDeg + "deg, #93c5fd " + aOwnedDeg + "deg " + aWantDeg + "deg, #f3f4f6 " + aWantDeg + "deg 360deg);";
    const safeName = String(st.name || "").replace(/</g, "&lt;");
    const safeId = String(st.id || "").replace(/"/g, "&quot;");
    return (
      '<button type="button" data-pie-album="' + safeId + '" onclick="if(typeof selectAlbumFromPieChart===\'function\'){selectAlbumFromPieChart(this.dataset.pieAlbum)}else if(typeof setMyCardsAlbum===\'function\'){setMyCardsAlbum(this.dataset.pieAlbum)}" ' +
      'class="text-left bg-white/95 hover:bg-white border ' + (isComp ? 'border-amber-300 ring-1 ring-amber-200' : 'border-pink-100') + ' rounded-2xl p-2 flex items-center gap-2 shadow-xs transition active:scale-95">' +
        '<img src="albums/' + safeId + '.jpg" alt="" class="w-11 h-11 rounded-xl object-cover shrink-0 border border-pink-100 shadow-xs" onerror="this.style.display=\'none\'">' +
        '<div class="relative w-11 h-11 rounded-full shrink-0 flex items-center justify-center" style="' + ringBg + '">' +
          '<div class="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[9px] font-extrabold ' + (isComp ? 'text-amber-600' : 'text-gray-800') + '">' +
            st.pct + '%' +
          '</div>' +
        '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="text-[11px] font-bold text-gray-800 truncate">' + safeName + '</div>' +
          '<div class="text-[10px] text-gray-500"><span class="font-bold text-pink-600">' + st.owned + '</span> / ' + st.total + '枚</div>' +
          (isComp ? '<div class="text-[9px] font-extrabold text-amber-600">🎉 COMPLETE!</div>' : '<div class="text-[9px] text-gray-400">あと' + (st.total - st.owned) + '枚</div>') +
        '</div>' +
      '</button>'
    );
  }).join("");

  container.innerHTML =
    '<div class="liquid-glass-card rounded-2xl p-3 border border-pink-200/80 shadow-sm space-y-2.5">' +
      '<div class="flex items-center justify-between">' +
        '<div class="text-xs font-extrabold text-pink-800">📊 コレクション達成率</div>' +
        '<div class="text-[10px] font-bold text-pink-600">' + overallPct + '% 達成</div>' +
      '</div>' +
      '<div class="flex items-center gap-3.5 bg-white/90 rounded-xl p-2.5 border border-pink-100">' +
        '<div class="relative rounded-full shrink-0 flex items-center justify-center shadow-inner" style="' + overallRingStyle + ' width:72px; height:72px;">' +
          '<div class="w-12 h-12 rounded-full bg-white flex flex-col items-center justify-center leading-tight">' +
            '<span class="text-[8px] font-bold text-gray-400">TOTAL</span>' +
            '<span class="text-sm font-black text-pink-600">' + overallPct + '%</span>' +
          '</div>' +
        '</div>' +
        '<div class="flex-1 space-y-1 text-xs">' +
          '<div class="flex items-center justify-between">' +
            '<span class="flex items-center gap-1.5 text-gray-700 font-bold"><span class="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>所持</span>' +
            '<span class="font-extrabold text-gray-900">' + totalOwned + ' <span class="text-[10px] font-normal text-gray-500">/ ' + totalAll + '枚</span></span>' +
          '</div>' +
          '<div class="flex items-center justify-between">' +
            '<span class="flex items-center gap-1.5 text-gray-700 font-bold"><span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>求 (Want)</span>' +
            '<span class="font-bold text-blue-600">' + totalWant + '枚 <span class="text-[10px] font-normal text-gray-400">(' + overallWantPct + '%)</span></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2">' + albumCardsHtml + '</div>' +
    '</div>';
};
