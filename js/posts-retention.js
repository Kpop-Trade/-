(function() {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  function getPostMillis(p) {
    const t = p.soldAt || p.updatedAt || p.createdAt;
    if (!t) return 0;
    if (typeof t.toMillis === "function") return t.toMillis();
    if (typeof t.seconds === "number") return t.seconds * 1000;
    if (typeof t === "number") return t;
    const parsed = Date.parse(t);
    return isNaN(parsed) ? 0 : parsed;
  }

  // renderPosts 実行前に30日経過した売却済み(traded)投稿を除外し、出品者本人の場合はDBからも削除
  const origRenderPosts = window.renderPosts;
  if (typeof origRenderPosts === "function") {
    window.renderPosts = function() {
      if (Array.isArray(window.allPosts)) {
        const now = Date.now();
        window.allPosts = window.allPosts.filter((p) => {
          if (p && p.status === "traded") {
            const ms = getPostMillis(p);
            if (ms > 0 && (now - ms) >= THIRTY_DAYS_MS) {
              if (window.currentUser && p.userId === window.currentUser.uid && typeof deleteDoc === "function" && typeof doc === "function") {
                deleteDoc(doc(db, "posts", p.id)).catch(() => {});
              }
              return false;
            }
          }
          return true;
        });
      }
      return origRenderPosts.apply(this, arguments);
    };
  }
})();
