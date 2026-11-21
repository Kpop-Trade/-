(function() {
  let lastPreviewSrc = "";
  setInterval(() => {
    const bundleBox = document.getElementById("bundle-box");
    const styleIsBundle = window.exchangeStyle === "bundle" ||
      (window.exchangeStyle !== "single" && !!(window.__isBulkMode || window.isBulkMode));
    const isBundleActive = styleIsBundle && bundleBox && !bundleBox.classList.contains("hidden");
    const previewImg = document.querySelector("#post-photo-preview img");
    const currentSrc = previewImg ? previewImg.src : "";

    if (isBundleActive && currentSrc && currentSrc !== lastPreviewSrc) {
      lastPreviewSrc = currentSrc;
      window.__isBulkMode = true;
      if (typeof window.openBundleFrameEditor === "function") {
        window.openBundleFrameEditor();
      }
    }
    if (!currentSrc) {
      lastPreviewSrc = "";
    }

    // 既存の sheetCropState.boxes（感度・自動枠検出・枠追加の結果）を常に __bulkSlots へ同期
    if (isBundleActive && typeof sheetCropState !== "undefined" && Array.isArray(sheetCropState.boxes) && sheetCropState.img) {
      const iw = sheetCropState.img.naturalWidth || sheetCropState.img.width || 1;
      const ih = sheetCropState.img.naturalHeight || sheetCropState.img.height || 1;
      window.__isBulkMode = true;
      window.__bulkSlots = sheetCropState.boxes.map((b, idx) => {
        // すでに0~100の割合か、ピクセル座標かを自動判定して正規化
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
    }
  }, 400);
})();
