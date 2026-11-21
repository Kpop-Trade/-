(function(){
  let singleStream = null;
  let singleMode = "post";
  window.openSingleGuideCam = async function(mode){
    singleMode = mode || "post";
    window.__singleGuideMode = singleMode;
    // まとめガイド枠の残留を掃除（1枚カメラに複数枠が出ないように）
    window.__presetGuideBoxes = null;
    const bulkOv = document.getElementById("guide-cam-ov");
    if (bulkOv) bulkOv.innerHTML = "";
    const inlineCam = document.getElementById("inline-guide-cam-box");
    if (inlineCam && window.exchangeStyle === "single") inlineCam.style.display = "none";
    const singleFrame = document.getElementById("single-guide-frame");
    if (singleFrame) {
      // まとめ用の複数枠DOMが誤って差し込まれていた場合に1枚枠へ戻す
      singleFrame.querySelectorAll("[data-bulk-guide],[data-g]").forEach((el) => el.remove());
      if (!singleFrame.querySelector("span")) {
        singleFrame.innerHTML = '<span style="position:absolute;top:6px;left:8px;background:rgba(0,0,0,0.75);color:#22d3ee;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:6px;">枠内に合わせると自動撮影</span>';
      }
    }
    const modal = document.getElementById("single-guide-modal");
    const vid = document.getElementById("single-guide-vid");
    if(!modal || !vid) return;
    modal.classList.remove("hidden");
    try {
      singleStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      vid.srcObject = singleStream;
      await vid.play();
    } catch(e) {
      /* alert hidden */ console.log("カメラを起動できませんでした: " + e.message);
      closeSingleGuideCam();
    }
  };
  window.closeSingleGuideCam = function(){
    const modal = document.getElementById("single-guide-modal");
    if(modal) modal.classList.add("hidden");
    if(singleStream){
      singleStream.getTracks().forEach(t => t.stop());
      singleStream = null;
    }
  };
  function dispatchGuideShotFile(file){
    const dt = new DataTransfer();
    dt.items.add(file);
    closeSingleGuideCam();
    const mode = window.__singleGuideMode || singleMode || "post";
    if(mode === "mycards"){
      const inp = document.querySelector("input[onchange*='runMyCardsImageSearch']");
      if(inp){ window.__fromGuide=true; inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); }
    } else {
      const inp = document.getElementById("post-photo-input") || document.getElementById("post-camera-input");
      if(inp){ window.__fromGuide=true; inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  }
  window.__dispatchGuideShotFile = dispatchGuideShotFile;
  window.snapSingleGuideCam = function(){
    const vid = document.getElementById("single-guide-vid");
    const frame = document.getElementById("single-guide-frame");
    const br = document.getElementById("single-cam-bright");
    if(!vid || !vid.videoWidth) return;
    const brightness = br ? br.value : 110;

    // 自動検出の4頂点がある場合は射影変換（台形補正）して切り抜き
    const corners = window.__detectedCardCorners;
    if (corners && corners.length === 4 && typeof window.__warpCardFromVideo === "function") {
      try {
        const warped = window.__warpCardFromVideo(vid, corners, brightness);
        if (warped) {
          warped.toBlob(function(blob){
            if(!blob) return;
            dispatchGuideShotFile(new File([blob], "single_guide_card.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.92);
          return;
        }
      } catch (e) {
        console.warn("perspective warp failed, fallback crop:", e);
      }
    }

    const vRect = vid.getBoundingClientRect();
    const fRect = frame.getBoundingClientRect();
    const scaleX = vid.videoWidth / vRect.width;
    const scaleY = vid.videoHeight / vRect.height;
    const sx = Math.max(0, (fRect.left - vRect.left) * scaleX);
    const sy = Math.max(0, (fRect.top - vRect.top) * scaleY);
    const sw = Math.min(vid.videoWidth - sx, fRect.width * scaleX);
    const sh = Math.min(vid.videoHeight - sy, fRect.height * scaleY);
    const cv = document.createElement("canvas");
    cv.width = Math.round(sw);
    cv.height = Math.round(sh);
    const cx = cv.getContext("2d");
    cx.filter = "brightness(" + brightness + "%) contrast(104%)";
    cx.drawImage(vid, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    cv.toBlob(function(blob){
      if(!blob) return;
      dispatchGuideShotFile(new File([blob], "single_guide_card.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };
})();
