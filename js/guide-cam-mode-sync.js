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
      const hasActiveStream = Boolean(vid && vid.srcObject && vid.srcObject.active);
      const isSingleCamOpen = camBox.dataset.singleCamActive === "1" || (camBox.style.display && camBox.style.display !== "none" && hasActiveStream);
      if (isSingleCamOpen) return;
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


(function() {
  function markSingleCamActive(active) {
    const camBox = document.getElementById("inline-guide-cam-box");
    if (!camBox) return;
    if (active) {
      camBox.dataset.singleCamActive = "1";
      camBox.style.display = "";
    } else {
      delete camBox.dataset.singleCamActive;
    }
  }

  document.addEventListener("click", function(e) {
    const btn = e.target.closest('[onclick*="openSingleGuideCam"], [data-open-single-guide-cam]');
    if (btn) {
      markSingleCamActive(true);
      setTimeout(() => {
        const camBox = document.getElementById("inline-guide-cam-box");
        if (camBox && camBox.dataset.singleCamActive === "1" && camBox.style.display === "none") {
          camBox.style.display = "";
        }
      }, 100);
    }
    const closeBtn = e.target.closest('[onclick*="closeSingleGuideCam"], [id*="close-guide-cam"], [id*="cam-close"]');
    if (closeBtn) {
      markSingleCamActive(false);
    }
  }, true);
})();
