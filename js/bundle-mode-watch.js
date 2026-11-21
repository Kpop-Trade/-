(function() {
  let prevSrc = "";
  let prevCount = 0;

  function isBundleModeActive() {
    if (typeof window.isPostBundleMode === "function") return window.isPostBundleMode();
    if (window.exchangeStyle === "single") return false;
    if (window.exchangeStyle === "bundle") return true;
    const label = document.getElementById("photo-section-label");
    const box = document.getElementById("bundle-box");
    const hasBundleText = label && label.textContent && label.textContent.includes("まとめ写真");
    const boxVisible = box && !box.classList.contains("hidden");
    return !!(window.__isBulkMode || hasBundleText || boxVisible);
  }

  setInterval(() => {
    const active = isBundleModeActive();
    const box = document.getElementById("bundle-box");
    if (active && box && box.classList.contains("hidden")) {
      box.classList.remove("hidden");
    }
    if (!active && box && !box.classList.contains("hidden") && window.exchangeStyle === "single") {
      box.classList.add("hidden");
    }

    const previewImg = document.querySelector("#post-photo-preview img");
    const currentSrc = previewImg ? previewImg.src : "";
    const pLen = (typeof postPhotos !== "undefined" && Array.isArray(postPhotos)) ? postPhotos.length : (currentSrc ? 1 : 0);

    if (active && (currentSrc || pLen > 0) && (currentSrc !== prevSrc || pLen !== prevCount)) {
      prevSrc = currentSrc;
      prevCount = pLen;
      window.__isBulkMode = true;
      setTimeout(() => {
        if (typeof window.openBundleFrameEditor === "function") {
          window.openBundleFrameEditor();
        }
      }, 120);
    }

    if (!currentSrc && pLen === 0) {
      prevSrc = "";
      prevCount = 0;
    }
  }, 300);
})();
