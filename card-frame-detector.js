/**
 * リアルタイム・トレカ枠自動検出エンジン v2
 * - RGB/近似Lab色差 + Sobelエッジの複合検出
 * - 縦横比 1.40〜1.68 / 面積フィルタでノイズ除外
 * - 4頂点リアルタイム追従 + 射影変換（台形補正）切り抜き
 * - 安定フレーム + ラプラシアン分散（ピント）でオートシャッター
 */
(function () {
  let rafId = null;
  let overlayCanvas = null;
  let workCanvas = null;
  let frameSkip = 0;
  let smoothBox = null;
  let smoothCorners = null; // 正規化 0..1 の4点 [TL,TR,BR,BL]
  let stableFrames = 0;
  let autoCaptured = false;
  let autoCaptureEnabled = true;
  let lastFocusScore = 0;

  const CARD_ASPECT = 1.545;
  const ASPECT_MIN = 1.40;
  const ASPECT_MAX = 1.68;
  const STABLE_NEED = 4; // 連続安定フレーム
  const MOVE_EPS = 0.028;
  const FOCUS_MIN = 18; // ラプラシアン分散の下限（ぼやけ除外）
  const ANALYZE_MAX = 220; // 解析解像度（スマホ向け軽量）

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
    if (!workCanvas) workCanvas = document.createElement("canvas");
    return overlayCanvas;
  }

  /** sRGB → 簡易 Lab（L*,a*,b*）— 完全一致でなく色差分離用 */
  function rgbToLab(r, g, b) {
    let R = r / 255, G = g / 255, B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
    let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    X = f(X); Y = f(Y); Z = f(Z);
    return { L: 116 * Y - 16, a: 500 * (X - Y), b: 200 * (Y - Z) };
  }

  function deltaE(lab1, lab2) {
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  function laplacianVariance(gray, w, h, x0, y0, x1, y1) {
    let sum = 0, sum2 = 0, n = 0;
    const step = 2;
    for (let y = y0 + 1; y < y1 - 1; y += step) {
      for (let x = x0 + 1; x < x1 - 1; x += step) {
        const i = y * w + x;
        const lap = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
        sum += lap;
        sum2 += lap * lap;
        n++;
      }
    }
    if (!n) return 0;
    const mean = sum / n;
    return sum2 / n - mean * mean;
  }

  /** 線分交点 */
  function lineIntersect(p1, p2, p3, p4) {
    const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(den) < 1e-6) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

  /** 点列から最小二乗で直線 ax+by+c=0 近似 → 2点表現 */
  function fitLine(points) {
    if (!points.length) return null;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    const n = points.length;
    for (const p of points) {
      sx += p.x; sy += p.y; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y;
    }
    const vx = sxx - (sx * sx) / n;
    const vy = syy - (sy * sy) / n;
    const vxy = sxy - (sx * sy) / n;
    const mx = sx / n, my = sy / n;
    // 主成分方向
    const theta = 0.5 * Math.atan2(2 * vxy, vx - vy);
    const dx = Math.cos(theta), dy = Math.sin(theta);
    return {
      p1: { x: mx - dx * 50, y: my - dy * 50 },
      p2: { x: mx + dx * 50, y: my + dy * 50 }
    };
  }

  /**
   * ガイド枠内のトレカを検出し、AABB + 4頂点（正規化）を返す
   */
  function detectCardQuad(vid, guideNorm) {
    const vw = vid.videoWidth;
    const vh = vid.videoHeight;
    if (!vw || !vh) return null;

    const scale = ANALYZE_MAX / Math.max(vw, vh);
    const w = Math.max(48, Math.round(vw * scale));
    const h = Math.max(48, Math.round(vh * scale));
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(vid, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const gx0 = Math.max(2, Math.floor(guideNorm.x * w));
    const gy0 = Math.max(2, Math.floor(guideNorm.y * h));
    const gx1 = Math.min(w - 3, Math.ceil((guideNorm.x + guideNorm.w) * w));
    const gy1 = Math.min(h - 3, Math.ceil((guideNorm.y + guideNorm.h) * h));
    const guideArea = Math.max(1, (gx1 - gx0) * (gy1 - gy0));

    // ガイド枠の外側帯から背景色（机）を推定
    const bgSamples = [];
    const pushBg = (x, y) => {
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return;
      const i = (y * w + x) * 4;
      bgSamples.push([data[i], data[i + 1], data[i + 2]]);
    };
    for (let x = Math.max(1, gx0 - 8); x <= Math.min(w - 2, gx1 + 8); x += 3) {
      pushBg(x, Math.max(1, gy0 - 6));
      pushBg(x, Math.min(h - 2, gy1 + 6));
    }
    for (let y = Math.max(1, gy0 - 8); y <= Math.min(h - 2, gy1 + 8); y += 3) {
      pushBg(Math.max(1, gx0 - 6), y);
      pushBg(Math.min(w - 2, gx1 + 6), y);
    }
    if (bgSamples.length < 8) return null;
    bgSamples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const mid = bgSamples[Math.floor(bgSamples.length / 2)];
    const bgLab = rgbToLab(mid[0], mid[1], mid[2]);

    const padX = Math.round((gx1 - gx0) * 0.14);
    const padY = Math.round((gy1 - gy0) * 0.14);
    const rx0 = Math.max(2, gx0 - padX);
    const ry0 = Math.max(2, gy0 - padY);
    const rx1 = Math.min(w - 3, gx1 + padX);
    const ry1 = Math.min(h - 3, gy1 + padY);
    const rw = rx1 - rx0;
    const rh = ry1 - ry0;
    if (rw < 24 || rh < 24) return null;

    const gray = new Float32Array(w * h);
    const mask = new Uint8Array(w * h);
    const sobel = new Float32Array(w * h);

    // 輝度 + Sobel（探索領域のみ）
    for (let y = ry0; y < ry1; y++) {
      for (let x = rx0; x < rx1; x++) {
        const i = (y * w + x) * 4;
        gray[y * w + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
    }
    for (let y = ry0 + 1; y < ry1 - 1; y++) {
      for (let x = rx0 + 1; x < rx1 - 1; x++) {
        const i = y * w + x;
        const gx =
          -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
           gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        const gy =
          -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
           gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        sobel[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // 色差 + エッジの複合マスク
    const rowScores = new Float32Array(rh);
    const colScores = new Float32Array(rw);
    for (let y = ry0; y < ry1; y++) {
      let rSum = 0;
      for (let x = rx0; x < rx1; x++) {
        const i = (y * w + x) * 4;
        const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
        const dE = deltaE(lab, bgLab);
        const edge = sobel[y * w + x];
        // 白い机でもカード面は色差・エッジのどちらかで拾う
        const hit = (dE > 12 && edge > 18) || dE > 22 || edge > 42;
        if (hit) {
          mask[y * w + x] = 1;
          rSum += 1;
          colScores[x - rx0] += 1;
        }
      }
      rowScores[y - ry0] = rSum / rw;
    }
    for (let x = 0; x < rw; x++) colScores[x] /= rh;

    // 密度投影で AABB
    const densThr = 0.22;
    let top = -1, bottom = -1, left = -1, right = -1;
    for (let y = 0; y < rh; y++) if (rowScores[y] > densThr) { top = y; break; }
    for (let y = rh - 1; y >= 0; y--) if (rowScores[y] > densThr) { bottom = y; break; }
    for (let x = 0; x < rw; x++) if (colScores[x] > densThr) { left = x; break; }
    for (let x = rw - 1; x >= 0; x--) if (colScores[x] > densThr) { right = x; break; }
    if (top < 0 || bottom <= top + 8 || left < 0 || right <= left + 8) return null;

    const boxW = right - left + 1;
    const boxH = bottom - top + 1;
    const aspect = boxH / Math.max(1, boxW);
    if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return null;

    const absX0 = rx0 + left;
    const absY0 = ry0 + top;
    const absX1 = rx0 + right;
    const absY1 = ry0 + bottom;
    const areaRatio = (boxW * boxH) / guideArea;
    // ガイド枠に対して小さすぎ／大きすぎるノイズを除外
    if (areaRatio < 0.28 || areaRatio > 1.35) return null;
    if (boxW < (gx1 - gx0) * 0.48 || boxH < (gy1 - gy0) * 0.48) return null;

    // 4辺の境界点から直線フィット → 四隅
    const leftPts = [], rightPts = [], topPts = [], bottomPts = [];
    const scanPad = 3;
    for (let y = absY0; y <= absY1; y += 2) {
      for (let x = Math.max(rx0, absX0 - scanPad); x <= Math.min(rx1 - 1, absX0 + boxW * 0.35); x++) {
        if (mask[y * w + x] && sobel[y * w + x] > 16) { leftPts.push({ x, y }); break; }
      }
      for (let x = Math.min(rx1 - 1, absX1 + scanPad); x >= Math.max(rx0, absX1 - boxW * 0.35); x--) {
        if (mask[y * w + x] && sobel[y * w + x] > 16) { rightPts.push({ x, y }); break; }
      }
    }
    for (let x = absX0; x <= absX1; x += 2) {
      for (let y = Math.max(ry0, absY0 - scanPad); y <= Math.min(ry1 - 1, absY0 + boxH * 0.35); y++) {
        if (mask[y * w + x] && sobel[y * w + x] > 16) { topPts.push({ x, y }); break; }
      }
      for (let y = Math.min(ry1 - 1, absY1 + scanPad); y >= Math.max(ry0, absY1 - boxH * 0.35); y--) {
        if (mask[y * w + x] && sobel[y * w + x] > 16) { bottomPts.push({ x, y }); break; }
      }
    }

    const L = fitLine(leftPts.length >= 4 ? leftPts : [{ x: absX0, y: absY0 }, { x: absX0, y: absY1 }]);
    const R = fitLine(rightPts.length >= 4 ? rightPts : [{ x: absX1, y: absY0 }, { x: absX1, y: absY1 }]);
    const T = fitLine(topPts.length >= 4 ? topPts : [{ x: absX0, y: absY0 }, { x: absX1, y: absY0 }]);
    const B = fitLine(bottomPts.length >= 4 ? bottomPts : [{ x: absX0, y: absY1 }, { x: absX1, y: absY1 }]);

    let tl = lineIntersect(L.p1, L.p2, T.p1, T.p2);
    let tr = lineIntersect(R.p1, R.p2, T.p1, T.p2);
    let br = lineIntersect(R.p1, R.p2, B.p1, B.p2);
    let bl = lineIntersect(L.p1, L.p2, B.p1, B.p2);

    // 交点が壊れたら AABB コーナーにフォールバック
    const fallback = [
      { x: absX0, y: absY0 },
      { x: absX1, y: absY0 },
      { x: absX1, y: absY1 },
      { x: absX0, y: absY1 }
    ];
    if (!tl || !tr || !br || !bl) {
      [tl, tr, br, bl] = fallback;
    } else {
      // 探索領域内にクランプ
      const clamp = (p) => ({
        x: Math.max(rx0, Math.min(rx1, p.x)),
        y: Math.max(ry0, Math.min(ry1, p.y))
      });
      tl = clamp(tl); tr = clamp(tr); br = clamp(br); bl = clamp(bl);
      // 歪みすぎ（辺の交差）チェック
      const qw = ((tr.x + br.x) - (tl.x + bl.x)) / 2;
      const qh = ((bl.y + br.y) - (tl.y + tr.y)) / 2;
      if (qw < 8 || qh < 8 || qh / qw < ASPECT_MIN * 0.92 || qh / qw > ASPECT_MAX * 1.08) {
        [tl, tr, br, bl] = fallback;
      }
    }

    const focus = laplacianVariance(gray, w, h, absX0, absY0, absX1 + 1, absY1 + 1);
    lastFocusScore = focus;

    return {
      box: {
        x: absX0 / w,
        y: absY0 / h,
        w: boxW / w,
        h: boxH / h
      },
      corners: [
        { x: tl.x / w, y: tl.y / h },
        { x: tr.x / w, y: tr.y / h },
        { x: br.x / w, y: br.y / h },
        { x: bl.x / w, y: bl.y / h }
      ],
      focus,
      aspect: boxH / boxW
    };
  }

  function drawOverlay(cv, box, corners, progress, focused) {
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cv.width = Math.round(rect.width * devicePixelRatio);
    cv.height = Math.round(rect.height * devicePixelRatio);
    const ctx = cv.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!box && !corners) return;

    const isLocked = progress >= 0.55 && focused;
    const color = isLocked ? "#10b981" : progress >= 0.35 ? "#34d399" : "#a855f7";

    if (corners && corners.length === 4) {
      const pts = corners.map((c) => ({
        x: c.x * rect.width,
        y: c.y * rect.height
      }));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = isLocked ? "rgba(16, 185, 129, 0.14)" : "rgba(168, 85, 247, 0.08)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // 四隅ドット
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
      const topY = Math.min(pts[0].y, pts[1].y, pts[2].y, pts[3].y);
      const label = isLocked
        ? `✨ ロック ${Math.min(100, Math.round(progress * 100))}%`
        : focused
          ? `検出中 ${Math.min(100, Math.round(progress * 100))}%`
          : "ピントを合わせてください";
      ctx.font = "bold 11px sans-serif";
      const tw = ctx.measureText(label).width + 16;
      const bx = cx - tw / 2;
      const by = Math.max(8, topY - 26);
      ctx.fillStyle = isLocked ? "rgba(16, 185, 129, 0.92)" : "rgba(17, 24, 39, 0.78)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, 20, 10);
        ctx.fill();
      } else {
        ctx.fillRect(bx, by, tw, 20);
      }
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(label, cx, by + 14);
      return;
    }

    // AABB フォールバック描画
    const x = box.x * rect.width;
    const y = box.y * rect.height;
    const bw = box.w * rect.width;
    const bh = box.h * rect.height;
    ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, bw, bh);
  }

  /** 4点射影変換行列（src→dst）を解く */
  function getPerspectiveMatrix(src, dst) {
    // src/dst: 4 points {x,y}
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const s = src[i], d = dst[i];
      A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
      b.push(d.x);
      A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
      b.push(d.y);
    }
    // Gaussian elimination 8x8
    const m = A.map((row, i) => row.concat([b[i]]));
    const n = 8;
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
      }
      if (Math.abs(m[pivot][col]) < 1e-8) return null;
      if (pivot !== col) { const tmp = m[col]; m[col] = m[pivot]; m[pivot] = tmp; }
      const div = m[col][col];
      for (let c = col; c <= n; c++) m[col][c] /= div;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = m[r][col];
        for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
      }
    }
    const h = m.map((row) => row[n]);
    h.push(1);
    return h; // h0..h8
  }

  function applyHomography(h, x, y) {
    const w = h[6] * x + h[7] * y + h[8];
    return {
      x: (h[0] * x + h[1] * y + h[2]) / w,
      y: (h[3] * x + h[4] * y + h[5]) / w
    };
  }

  /**
   * ビデオ座標の4隅から真っ直ぐなトレカ画像を生成
   * cornersNorm: 正規化 [TL,TR,BR,BL]
   */
  function warpCardFromVideo(vid, cornersNorm, brightness) {
    const vw = vid.videoWidth;
    const vh = vid.videoHeight;
    if (!vw || !vh || !cornersNorm || cornersNorm.length !== 4) return null;

    const src = cornersNorm.map((c) => ({ x: c.x * vw, y: c.y * vh }));
    // 出力サイズ（トレカ比）
    const outW = 330;
    const outH = Math.round(outW * CARD_ASPECT);
    const dst = [
      { x: 0, y: 0 },
      { x: outW - 1, y: 0 },
      { x: outW - 1, y: outH - 1 },
      { x: 0, y: outH - 1 }
    ];
    // 逆変換: dst→src
    const h = getPerspectiveMatrix(dst, src);
    if (!h) return null;

    const full = document.createElement("canvas");
    full.width = vw;
    full.height = vh;
    const fctx = full.getContext("2d", { willReadFrequently: true });
    if (brightness) fctx.filter = "brightness(" + brightness + "%) contrast(104%)";
    fctx.drawImage(vid, 0, 0);
    const srcData = fctx.getImageData(0, 0, vw, vh).data;

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const octx = out.getContext("2d");
    const outImg = octx.createImageData(outW, outH);
    const od = outImg.data;

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const p = applyHomography(h, x + 0.5, y + 0.5);
        const sx = p.x, sy = p.y;
        if (sx < 0 || sy < 0 || sx >= vw - 1 || sy >= vh - 1) continue;
        // バイリニア
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const fx = sx - x0, fy = sy - y0;
        const x1 = x0 + 1, y1 = y0 + 1;
        const i00 = (y0 * vw + x0) * 4;
        const i10 = (y0 * vw + x1) * 4;
        const i01 = (y1 * vw + x0) * 4;
        const i11 = (y1 * vw + x1) * 4;
        const o = (y * outW + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v =
            srcData[i00 + c] * (1 - fx) * (1 - fy) +
            srcData[i10 + c] * fx * (1 - fy) +
            srcData[i01 + c] * (1 - fx) * fy +
            srcData[i11 + c] * fx * fy;
          od[o + c] = v;
        }
        od[o + 3] = 255;
      }
    }
    octx.putImageData(outImg, 0, 0);
    return out;
  }

  function startLoop() {
    stopLoop();
    smoothBox = null;
    smoothCorners = null;
    stableFrames = 0;
    autoCaptured = false;
    frameSkip = 0;

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
        // 描画は毎フレーム、検出は1フレームおき
        frameSkip ^= 1;
        const vRect = vid.getBoundingClientRect();
        const fRect = frame.getBoundingClientRect();

        if (vRect.width > 0 && fRect.width > 0) {
          const guideNorm = {
            x: Math.max(0, (fRect.left - vRect.left) / vRect.width),
            y: Math.max(0, (fRect.top - vRect.top) / vRect.height),
            w: Math.min(1, fRect.width / vRect.width),
            h: Math.min(1, fRect.height / vRect.height)
          };

          if (frameSkip === 0) {
            const detected = detectCardQuad(vid, guideNorm);
            if (detected) {
              if (!smoothBox) {
                smoothBox = { ...detected.box };
                smoothCorners = detected.corners.map((c) => ({ ...c }));
                stableFrames = 1;
              } else {
                const delta =
                  Math.abs(detected.box.x - smoothBox.x) +
                  Math.abs(detected.box.y - smoothBox.y) +
                  Math.abs(detected.box.w - smoothBox.w) +
                  Math.abs(detected.box.h - smoothBox.h);

                const alpha = 0.38;
                smoothBox.x = smoothBox.x * (1 - alpha) + detected.box.x * alpha;
                smoothBox.y = smoothBox.y * (1 - alpha) + detected.box.y * alpha;
                smoothBox.w = smoothBox.w * (1 - alpha) + detected.box.w * alpha;
                smoothBox.h = smoothBox.h * (1 - alpha) + detected.box.h * alpha;
                for (let i = 0; i < 4; i++) {
                  smoothCorners[i].x = smoothCorners[i].x * (1 - alpha) + detected.corners[i].x * alpha;
                  smoothCorners[i].y = smoothCorners[i].y * (1 - alpha) + detected.corners[i].y * alpha;
                }

                const focused = detected.focus >= FOCUS_MIN;
                if (delta < MOVE_EPS && focused) {
                  stableFrames++;
                } else if (delta < MOVE_EPS) {
                  // 検出は安定だがピンボケ → 進捗を抑える
                  stableFrames = Math.max(0, stableFrames - 1);
                } else {
                  stableFrames = Math.max(0, stableFrames - 2);
                }
              }

              window.__detectedCardNormBox = { ...smoothBox };
              window.__detectedCardCorners = smoothCorners.map((c) => ({ ...c }));
              window.__detectedCardFocus = lastFocusScore;
            } else {
              stableFrames = Math.max(0, stableFrames - 1);
              if (stableFrames === 0) {
                smoothBox = null;
                smoothCorners = null;
                window.__detectedCardNormBox = null;
                window.__detectedCardCorners = null;
              }
            }
          }

          const progress = stableFrames / STABLE_NEED;
          const focused = lastFocusScore >= FOCUS_MIN;
          if (cv) drawOverlay(cv, smoothBox, smoothCorners, progress, focused);

          if (
            autoCaptureEnabled &&
            !autoCaptured &&
            stableFrames >= STABLE_NEED &&
            focused &&
            smoothCorners
          ) {
            autoCaptured = true;
            window.__detectedCardNormBox = { ...smoothBox };
            window.__detectedCardCorners = smoothCorners.map((c) => ({ ...c }));
            if (typeof window.snapSingleGuideCam === "function") {
              window.snapSingleGuideCam();
            }
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
    smoothCorners = null;
    stableFrames = 0;
  }

  window.__warpCardFromVideo = warpCardFromVideo;
  window.__cardFrameDetector = {
    detectCardQuad,
    warpCardFromVideo,
    startLoop,
    stopLoop
  };

  window.addEventListener("DOMContentLoaded", () => {
    const origOpen = window.openSingleGuideCam;
    if (typeof origOpen === "function") {
      window.openSingleGuideCam = function (...args) {
        window.__detectedCardNormBox = null;
        window.__detectedCardCorners = null;
        const res = origOpen.apply(this, args);
        setTimeout(startLoop, 120);
        return res;
      };
    }

    const origClose = window.closeSingleGuideCam;
    if (typeof origClose === "function") {
      window.closeSingleGuideCam = function (...args) {
        stopLoop();
        window.__detectedCardNormBox = null;
        window.__detectedCardCorners = null;
        return origClose.apply(this, args);
      };
    }

    // snap 本体（index.html）が __detectedCardCorners / __warpCardFromVideo を使って台形補正する。
    // ここでは最新の検出結果を渡し、頂点が無いときだけ AABB でガイド枠を上書きする。
    const origSnap = window.snapSingleGuideCam;
    if (typeof origSnap === "function") {
      window.snapSingleGuideCam = function (...args) {
        if (!window.__detectedCardCorners && smoothCorners) {
          window.__detectedCardCorners = smoothCorners.map((c) => ({ ...c }));
        }
        if (!window.__detectedCardNormBox && smoothBox) {
          window.__detectedCardNormBox = { ...smoothBox };
        }

        // 4頂点あり → index.html 側で射影変換
        if (window.__detectedCardCorners && window.__detectedCardCorners.length === 4) {
          try {
            return origSnap.apply(this, args);
          } finally {
            window.__detectedCardNormBox = null;
            window.__detectedCardCorners = null;
          }
        }

        // 頂点なし・AABBのみ → ガイド枠の見た目座標を検出枠に合わせて切り抜き
        const vid = document.getElementById("single-guide-vid");
        const frame = document.getElementById("single-guide-frame");
        const box = window.__detectedCardNormBox;
        if (vid && frame && box) {
          const vRect = vid.getBoundingClientRect();
          const origGetRect = frame.getBoundingClientRect.bind(frame);
          frame.getBoundingClientRect = () => ({
            left: vRect.left + box.x * vRect.width,
            top: vRect.top + box.y * vRect.height,
            width: box.w * vRect.width,
            height: box.h * vRect.height,
            right: vRect.left + (box.x + box.w) * vRect.width,
            bottom: vRect.top + (box.y + box.h) * vRect.height,
            x: vRect.left + box.x * vRect.width,
            y: vRect.top + box.y * vRect.height
          });
          try {
            return origSnap.apply(this, args);
          } finally {
            frame.getBoundingClientRect = origGetRect;
            window.__detectedCardNormBox = null;
            window.__detectedCardCorners = null;
          }
        }
        return origSnap.apply(this, args);
      };
    }
  });
})();

