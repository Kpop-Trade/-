(function(){
  setTimeout(function(){ window.syncGuideCamByMode = syncGuideCamByMode; },0);
  function isPostBundleMode() {
    // exchangeStyle を正とする（1枚選択時に __isBulkMode 残留でまとめガイドが出るのを防ぐ）
    if (window.exchangeStyle === "single") return false;
    if (window.exchangeStyle === "bundle") return true;
    return !!(window.__isBulkMode || window.isBulkMode ||
      (document.getElementById("bulk-mode-panel") && !document.getElementById("bulk-mode-panel").classList.contains("hidden")));
  }
  window.isPostBundleMode = isPostBundleMode;

  function syncGuideCamByMode() {
    const camBox = document.getElementById("inline-guide-cam-box");
    const gridBtns = document.getElementById("cam-grid-btns");
    if (!camBox) return;
    const isBulk = isPostBundleMode();
    document.querySelectorAll("[onclick*=\"openSingleGuideCam('post')\"]").forEach(b => b.style.display = isBulk ? "none" : "");
    const vid = camBox.querySelector("video");
    const vidWrap = vid ? vid.parentElement : null;

    if (gridBtns) {
      gridBtns.style.display = isBulk ? "flex" : "none";
    }

    if (!isBulk) {
      delete camBox.dataset.singleCamActive;
      camBox.style.display = "none";
      // まとめガイド枠オーバーレイも消す（1枚カメラへ残留しないように）
      const ov = document.getElementById("guide-cam-ov");
      if (ov) ov.innerHTML = "";
      return;
    }
    camBox.style.display = "";
    // まとめ売りモード：複数枚を並べて撮れる横ワイドカメラに戻す
    camBox.style.maxWidth = "";
    camBox.style.marginLeft = "";
    camBox.style.marginRight = "";
    if (vidWrap) {
      vidWrap.style.aspectRatio = "";
      vidWrap.style.height = "";
      vidWrap.style.maxHeight = "";
    }
    const btn1x1 = camBox.querySelector("[data-g=\"1x1\"]");
    if (btn1x1) delete btn1x1.dataset.forcedSingle;
  }
  setInterval(syncGuideCamByMode, 800);
})();


