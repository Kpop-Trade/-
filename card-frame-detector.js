/**
 * リアルタイム・トレカ枠自動検出エンジン
 * - 背景色差分 + Sobelエッジ検出による高精度矩形抽出
 * - トレカ縦横比 (1 : 1.54) フィルタリング
 * - EMAスムージング追従 & 安定ロックオン自動シャッター
 */
(function () {
  let rafId = null;
  let overlayCanvas = null;
  let workCanvas = null;
  let smoothBox = null;
  let stableFrames = 0;
  let autoCaptured = false;
  let autoCaptureEnabled = true;

  // トレカ標準比率 (85 / 55 = 1.545)
  const CARD_ASPECT = 1.545;
  const STABLE_THRESHOLD = 18; // 約0.6秒静止で自動撮影

  function ensureOverlay(vid) {
    const parent = vid.parentElement;
    if (!parent) return null;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    if (!overlayCanvas || !parent.contains(overlayCanvas)) {
      overlayCanvas = document.createElement("canvas");
      overlayCanvas.id = "card-auto-detect-overlay";
      overlayCanvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:25;";
      parent.appendChild(overlayCanvas);
    }
    if (!workCanvas) {
      workCanvas = document.createElement("canvas");
    }
    return overlayCanvas;
  }

  // フレーム内のトレカ矩形（正規化座標 0..1）を検出
  function detectCardRect(vid, guideNorm) {
    const vw = vid.videoWidth;
    const vh = vid.videoHeight;
    if (!vw || !vh) return null;

    // 高速処理のため長辺240pxに縮小解析
    const scale = 240 / Math.max(vw, vh);
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(vid, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h).data;

    // ガイド枠の外周4点から「背景（机）の平均RGB」を推定
    const gx0 = Math.max(2, Math.floor(guideNorm.x * w));
    const gy0 = Math.max(2, Math.floor(guideNorm.y * h));
    const gx1 = Math.min(w - 3, Math.ceil((guideNorm.x + guideNorm.w) * w));
    const gy1 = Math.min(h - 3, Math.ceil((guideNorm.y + guideNorm.h) * h));

    const samplePts = [
      [Math.max(1, gx0 - 4), Math.max(1, gy0 - 4)],
      [Math.min(w - 2, gx1 + 4), Math.max(1, gy0 - 4)],
      [Math.max(1, gx0 - 4), Math.min(h - 2, gy1 + 4)],
      [Math.min(w - 2, gx1 + 4), Math.min(h - 2, gy1 + 4)]
    ];
    let bgR = 0, bgG = 0, bgB = 0;
    for (const [sx, sy] of samplePts) {
      const idx = (sy * w + sx) * 4;
      bgR += imgData[idx];
      bgG += imgData[idx + 1];
      bgB += imgData[idx + 2];
    }
    bgR /= 4; bgG /= 4; bgB /= 4;

    // ガイド枠の少し外側までを探索領域にする
    const padX = Math.round((gx1 - gx0) * 0.18);
    const padY = Math.round((gy1 - gy0) * 0.18);
    const rx0 = Math.max(2, gx0 - padX);
    const ry0 = Math.max(2, gy0 - padY);
    const rx1 = Math.min(w - 3, gx1 + padX);
    const ry1 = Math.min(h - 3, gy1 + padY);

    const rw = rx1 - rx0;
    const rh = ry1 - ry0;
    if (rw < 20 || rh < 20) return null;

    // 各行・各列の「非背景＆高エッジ」スコアを投影（高速プロジェクション法）
    const rowScores = new Float32Array(rh);
    const colScores = new Float32Array(rw);

    for (let y = ry0; y < ry1; y++) {
      let rSum = 0;
      for (let x = rx0; x < rx1; x++) {
        const idx = (y * w + x) * 4;
        const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];

        // 背景色との色差
        const colorDiff = Math.hypot(r - bgR, g - bgG, b - bgB);

        // 隣接ピクセルとの輝度勾配（エッジ強度）
        const idxR = idx + 4;
        const idxD = idx + w * 4;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const lumR = 0.299 * imgData[idxR] + 0.587 * imgData[idxR + 1] + 0.114 * imgData[idxR + 2];
        const lumD = 0.299 * imgData[idxD] + 0.587 * imgData[idxD + 1] + 0.114 * imgData[idxD + 2];
        const edge = Math.abs(lum - lumR) + Math.abs(lum - lumD);

        const isCardPixel = (colorDiff > 28 || edge > 24) ? 1 : 0;
        if (isCardPixel) {
          rSum += 1;
          colScores[x - rx0] += 1;
        }
      }
      rowScores[y - ry0] = rSum / rw;
    }
    for (let x = 0; x < rw; x++) {
      colScores[x] /= rh;
    }

    // 有効密度が一定以上の範囲（カードの上下左右端）を抽出
    let top = -1, bottom = -1, left = -1, right = -1;
    for (let y = 0; y < rh; y++) {
      if (rowScores[y] > 0.28) { top = y; break; }
    }
    for (let y = rh - 1; y >= 0; y--) {
      if (rowScores[y] > 0.28) { bottom = y; break; }
    }
    for (let x = 0; x < rw; x++) {
      if (colScores[x] > 0.28) { left = x; break; }
    }
    for (let x = rw - 1; x >= 0; x--) {
      if (colScores[x] > 0.28) { right = x; break; }
    }

    if (top < 0 || bottom <= top || left < 0 || right <= left) return null;

    const boxW = right - left;
    const boxH = bottom - top;
    const aspect = boxH / boxW;

    // トレカの縦横比 (1.30 〜 1.80) と最小サイズチェック
    if (aspect < 1.28 || aspect > 1.82) return null;
    if (boxW < (gx1 - gx0) * 0.55 || boxH < (gy1 - gy0) * 0.55) return null;

    return {
      x: (rx0 + left) / w,
      y: (ry0 + top) / h,
      w: boxW / w,
      h: boxH / h
    };
  }

  function drawOverlay(cv, box, progress) {
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cv.width = Math.round(rect.width * devicePixelRatio);
    cv.height = Math.round(rect.height * devicePixelRatio);
    const ctx = cv.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!box) return;

    const x = box.x * rect.width;
    const y = box.y * rect.height;
    const w = box.w * rect.width;
    const h = box.h * rect.height;

    const isLocked = progress >= 0.4;
    const color = isLocked ? "#10b981" : "#a855f7"; // ロック中はエメラルドグリーン

    // 半透明ハイライト
    ctx.fillStyle = isLocked ? "rgba(16, 185, 129, 0.12)" : "rgba(168, 85, 247, 0.08)";
    ctx.fillRect(x, y, w, h);

    // 4隅の太めL字ブラケット描画
    const corner = Math.min(w, h) * 0.16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";

    ctx.beginPath();
    // 左上
    ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
    // 右上
    ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner);
    // 右下
    ctx.moveTo(x + w, y + h - corner); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - corner, y + h);
    // 左下
    ctx.moveTo(x + corner, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - corner);
    ctx.stroke();

    // ステータスバッジ表示
    const label = isLocked
      ? `✨ トレカ検出中 ${Math.min(100, Math.round(progress * 100))}%`
      : "枠内にトレカを合わせてください";
    ctx.font = "bold 11px sans-serif";
    const tw = ctx.measureText(label).width + 16;
    const bx = x + (w - tw) / 2;
    const by = Math.max(8, y - 26);

    ctx.fillStyle = isLocked ? "rgba(16, 185, 129, 0.92)" : "rgba(17, 24, 39, 0.78)";
    ctx.beginPath();
    ctx.roundRect(bx, by, tw, 20, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, by + 14);
  }

  function startLoop() {
    stopLoop();
    smoothBox = null;
    stableFrames = 0;
    autoCaptured = false;

    const tick = () => {
      const modal = document.getElementById("single-guide-modal");
      const vid = document.getElementById("single-guide-vid");
      const frame = document.getElementById("single-guide-frame");

      if (!modal || modal.classList.contains("hidden") || !vid || !frame) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (vid.videoWidth > 0 && vid.videoHeight > 0) {
        const cv = ensureOverlay(vid);
        const vRect = vid.getBoundingClientRect();
        const fRect = frame.getBoundingClientRect();

        if (vRect.width > 0 && fRect.width > 0) {
          const guideNorm = {
            x: Math.max(0, (fRect.left - vRect.left) / vRect.width),
            y: Math.max(0, (fRect.top - vRect.top) / vRect.height),
            w: Math.min(1, fRect.width / vRect.width),
            h: Math.min(1, fRect.height / vRect.height)
          };

          const detected = detectCardRect(vid, guideNorm);
          if (detected) {
            if (!smoothBox) {
              smoothBox = { ...detected };
              stableFrames = 1;
            } else {
              // 前フレームとの移動量をチェック
              const delta =
                Math.abs(detected.x - smoothBox.x) +
                Math.abs(detected.y - smoothBox.y) +
                Math.abs(detected.w - smoothBox.w) +
                Math.abs(detected.h - smoothBox.h);

              // EMAスムージング追従
              smoothBox.x = smoothBox.x * 0.65 + detected.x * 0.35;
              smoothBox.y = smoothBox.y * 0.65 + detected.y * 0.35;
              smoothBox.w = smoothBox.w * 0.65 + detected.w * 0.35;
              smoothBox.h = smoothBox.h * 0.65 + detected.h * 0.35;

              if (delta < 0.045) {
                stableFrames++;
              } else {
                stableFrames = Math.max(0, stableFrames - 2);
              }
            }

            const progress = stableFrames / STABLE_THRESHOLD;
            if (cv) drawOverlay(cv, smoothBox, progress);

            // 安定しきったら自動シャッター実行
            if (autoCaptureEnabled && !autoCaptured && stableFrames >= STABLE_THRESHOLD) {
              autoCaptured = true;
              window.__detectedCardNormBox = { ...smoothBox };
              if (typeof window.snapSingleGuideCam === "function") {
                window.snapSingleGuideCam();
              }
            }
          } else {
            stableFrames = Math.max(0, stableFrames - 1);
            if (stableFrames === 0) smoothBox = null;
            if (cv) drawOverlay(cv, smoothBox, stableFrames / STABLE_THRESHOLD);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    smoothBox = null;
    stableFrames = 0;
  }

  // 既存の openSingleGuideCam / closeSingleGuideCam / snapSingleGuideCam を拡張フック
  window.addEventListener("DOMContentLoaded", () => {
    const origOpen = window.openSingleGuideCam;
    if (typeof origOpen === "function") {
      window.openSingleGuideCam = function (...args) {
        window.__detectedCardNormBox = null;
        const res = origOpen.apply(this, args);
        startLoop();
        return res;
      };
    }

    const origClose = window.closeSingleGuideCam;
    if (typeof origClose === "function") {
      window.closeSingleGuideCam = function (...args) {
        stopLoop();
        return origClose.apply(this, args);
      };
    }

    // 手動シャッター時も検出中の枠があれば優先して切り抜く
    const origSnap = window.snapSingleGuideCam;
    if (typeof origSnap === "function") {
      window.snapSingleGuideCam = function (...args) {
        if (!window.__detectedCardNormBox && smoothBox) {
          window.__detectedCardNormBox = { ...smoothBox };
        }
        const vid = document.getElementById("single-guide-vid");
        const frame = document.getElementById("single-guide-frame");
        const box = window.__detectedCardNormBox;

        // 検出枠がある場合、一時的にフレームの切り抜き座標を自動検出枠に合わせる
        if (vid && frame && box) {
          const vRect = vid.getBoundingClientRect();
          const origGetRect = frame.getBoundingClientRect.bind(frame);
          frame.getBoundingClientRect = () => ({
            left: vRect.left + box.x * vRect.width,
            top: vRect.top + box.y * vRect.height,
            width: box.w * vRect.width,
            height: box.h * vRect.height,
            right: vRect.left + (box.x + box.w) * vRect.width,
            bottom: vRect.top + (box.y + box.h) * vRect.height
          });
          try {
            return origSnap.apply(this, args);
          } finally {
            frame.getBoundingClientRect = origGetRect;
            window.__detectedCardNormBox = null;
          }
        }
        return origSnap.apply(this, args);
      };
    }
  });
})();
