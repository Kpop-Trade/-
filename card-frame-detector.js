/**
 * リアルタイム・トレカ枠自動検出エンジン v3
 * - 適応的色差（背景統計）+ Sobel + 勾配ピークで枠推定
 * - マスク形態学クリーンアップ / RANSAC 直線フィット
 * - 四隅サブピクセル補正 + 射影変換切り抜き（内側インセット）
 * - 複数フレーム一致 + ピント + 周縁エッジ強度でオートシャッター
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
  let lastEdgeScore = 0;
  let lastConfidence = 0;
  let cornerHistory = []; // 直近コーナー履歴（一致判定）

  const CARD_ASPECT = 1.545;
  const ASPECT_MIN = 1.38;
  const ASPECT_MAX = 1.72;
  const STABLE_NEED = 5; // 連続安定フレーム
  const MOVE_EPS = 0.018;
  const FOCUS_MIN = 22; // ラプラシアン分散の下限（ぼやけ除外）
  const EDGE_MIN = 28; // 周縁エッジ平均の下限
  const CONF_MIN = 0.55;
  const ANALYZE_MAX = 320; // 解析解像度（精度↑ / スマホでも許容）
  const HISTORY_NEED = 3;
  const CORNER_AGREE = 0.022; // 正規化座標の一致許容
  const WARP_INSET = 0.012; // 切り抜き時の内側マージン（机の混入防止）

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

  /** sRGB → 簡易 Lab（L*,a*,b*）— 色差分離用 */
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
    // カード中央寄り（枠ノイズ除外）
    const mx0 = x0 + Math.floor((x1 - x0) * 0.18);
    const mx1 = x1 - Math.floor((x1 - x0) * 0.18);
    const my0 = y0 + Math.floor((y1 - y0) * 0.18);
    const my1 = y1 - Math.floor((y1 - y0) * 0.18);
    for (let y = my0 + 1; y < my1 - 1; y += step) {
      for (let x = mx0 + 1; x < mx1 - 1; x += step) {
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

  /** 最小二乗直線フィット */
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
    const theta = 0.5 * Math.atan2(2 * vxy, vx - vy);
    const dx = Math.cos(theta), dy = Math.sin(theta);
    return {
      p1: { x: mx - dx * 80, y: my - dy * 80 },
      p2: { x: mx + dx * 80, y: my + dy * 80 },
      mx, my, dx, dy, n
    };
  }

  /** 点→直線距離（fitLine結果） */
  function distToLine(line, p) {
    // 法線: (-dy, dx)
    const nx = -line.dy, ny = line.dx;
    return Math.abs((p.x - line.mx) * nx + (p.y - line.my) * ny);
  }

  /**
   * RANSAC + 最小二乗で外れ値に強い直線フィット
   */
  function fitLineRansac(points, iters, thresh) {
    if (!points || points.length < 4) return fitLine(points || []);
    const n = points.length;
    const maxIters = Math.min(iters || 28, n * 4);
    const t = thresh || 1.8;
    let bestInliers = null;
    let bestCount = 0;

    for (let k = 0; k < maxIters; k++) {
      const i1 = (Math.random() * n) | 0;
      let i2 = (Math.random() * n) | 0;
      if (i2 === i1) i2 = (i1 + 1) % n;
      const a = points[i1], b = points[i2];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 4) continue;
      const inv = 1 / len;
      const nx = -dy * inv, ny = dx * inv;
      const inliers = [];
      for (let i = 0; i < n; i++) {
        const p = points[i];
        const d = Math.abs((p.x - a.x) * nx + (p.y - a.y) * ny);
        if (d <= t) inliers.push(p);
      }
      if (inliers.length > bestCount) {
        bestCount = inliers.length;
        bestInliers = inliers;
        if (bestCount > n * 0.85) break;
      }
    }

    if (!bestInliers || bestInliers.length < 4) return fitLine(points);
    const refined = fitLine(bestInliers);
    // 再集約
    const tight = [];
    for (const p of points) {
      if (distToLine(refined, p) <= t * 1.15) tight.push(p);
    }
    return fitLine(tight.length >= 4 ? tight : bestInliers);
  }

  /** 1D投影の勾配ピーク（境界）を探す */
  function findProjectionBounds(scores, densThr) {
    const n = scores.length;
    if (n < 8) return null;

    // 平滑化
    const sm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = scores[Math.max(0, i - 1)];
      const b = scores[i];
      const c = scores[Math.min(n - 1, i + 1)];
      sm[i] = (a + 2 * b + c) / 4;
    }

    let peak = 0;
    for (let i = 0; i < n; i++) if (sm[i] > peak) peak = sm[i];
    const thr = Math.max(densThr, peak * 0.28);
    if (peak < densThr * 0.85) return null;

    let left = -1, right = -1;
    for (let i = 0; i < n; i++) if (sm[i] > thr) { left = i; break; }
    for (let i = n - 1; i >= 0; i--) if (sm[i] > thr) { right = i; break; }
    if (left < 0 || right <= left + 6) return null;

    // 勾配ピークで端を微調整（立ち上がり / 立ち下がり）
    let bestRise = left, riseVal = -1e9;
    const riseEnd = Math.min(n - 2, left + Math.max(4, ((right - left) * 0.22) | 0));
    for (let i = Math.max(1, left - 4); i <= riseEnd; i++) {
      const g = sm[i] - sm[i - 1];
      if (g > riseVal) { riseVal = g; bestRise = i; }
    }
    let bestFall = right, fallVal = -1e9;
    const fallStart = Math.max(1, right - Math.max(4, ((right - left) * 0.22) | 0));
    for (let i = fallStart; i < Math.min(n, right + 4); i++) {
      const g = sm[i - 1] - sm[i];
      if (g > fallVal) { fallVal = g; bestFall = i - 1; }
    }
    if (bestFall <= bestRise + 6) return { lo: left, hi: right, peak };
    return { lo: bestRise, hi: bestFall, peak };
  }

  /** マスクの簡易クロージング（穴埋め）→ オープニング（ノイズ除去） */
  function morphClean(mask, w, h, x0, y0, x1, y1) {
    const tmp = new Uint8Array(w * h);
    const dilate = (src, dst) => {
      for (let y = y0 + 1; y < y1 - 1; y++) {
        for (let x = x0 + 1; x < x1 - 1; x++) {
          const i = y * w + x;
          dst[i] =
            src[i] |
            src[i - 1] | src[i + 1] |
            src[i - w] | src[i + w] |
            src[i - w - 1] | src[i - w + 1] |
            src[i + w - 1] | src[i + w + 1];
        }
      }
    };
    const erode = (src, dst) => {
      for (let y = y0 + 1; y < y1 - 1; y++) {
        for (let x = x0 + 1; x < x1 - 1; x++) {
          const i = y * w + x;
          dst[i] =
            src[i] &
            src[i - 1] & src[i + 1] &
            src[i - w] & src[i + w] ? 1 : 0;
        }
      }
    };
    dilate(mask, tmp);
    erode(tmp, mask);
    erode(mask, tmp);
    dilate(tmp, mask);
  }

  /** 四隅を勾配最大方向へサブピクセル微調整 */
  function refineCorner(gray, sobel, w, h, corner, inward) {
    let best = { x: corner.x, y: corner.y };
    let bestScore = -1;
    const cx = (inward.x - corner.x);
    const cy = (inward.y - corner.y);
    const len = Math.hypot(cx, cy) || 1;
    const ix = cx / len, iy = cy / len;
    // 角から内側へ、および直交方向に探索
    for (let t = -3; t <= 6; t++) {
      for (let s = -3; s <= 3; s++) {
        const x = Math.round(corner.x + ix * t + (-iy) * s);
        const y = Math.round(corner.y + iy * t + ix * s);
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        const e = sobel[y * w + x];
        // 内側へ少し寄る方向を優先（机を巻き込みにくく）
        const score = e - Math.max(0, -t) * 1.2;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    if (bestScore < 8) return corner;
    // サブピクセル: 近傍勾配の加重平均
    let sx = 0, sy = 0, swt = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = best.x + dx, y = best.y + dy;
        const wt = sobel[y * w + x];
        sx += x * wt;
        sy += y * wt;
        swt += wt;
      }
    }
    if (swt > 1) return { x: sx / swt, y: sy / swt };
    return best;
  }

  function perimeterEdgeScore(sobel, w, corners) {
    // 4辺に沿ったエッジ強度の平均
    let sum = 0, n = 0;
    for (let e = 0; e < 4; e++) {
      const a = corners[e];
      const b = corners[(e + 1) % 4];
      const steps = Math.max(8, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(a.x + (b.x - a.x) * t);
        const y = Math.round(a.y + (b.y - a.y) * t);
        if (x < 1 || y < 1 || x >= w - 1 || y >= sobel.length / w - 1) continue;
        sum += sobel[y * w + x];
        n++;
      }
    }
    return n ? sum / n : 0;
  }

  function insetCorners(corners, amount) {
    const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
    return corners.map((c) => ({
      x: c.x + (cx - c.x) * amount,
      y: c.y + (cy - c.y) * amount
    }));
  }

  function cornersAgree(a, b, eps) {
    if (!a || !b || a.length !== 4 || b.length !== 4) return false;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(a[i].x - b[i].x) > eps || Math.abs(a[i].y - b[i].y) > eps) return false;
    }
    return true;
  }

  /**
   * ガイド枠内のトレカを検出し、AABB + 4頂点（正規化）を返す
   */
  function detectCardQuad(vid, guideNorm) {
    const vw = vid.videoWidth || vid.width || 0;
    const vh = vid.videoHeight || vid.height || 0;
    if (!vw || !vh) return null;

    const scale = ANALYZE_MAX / Math.max(vw, vh);
    const w = Math.max(64, Math.round(vw * scale));
    const h = Math.max(64, Math.round(vh * scale));
    if (!workCanvas) workCanvas = document.createElement("canvas");
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

    // ガイド枠の外側帯から背景色（机）を推定 — 複数サンプルの平均/分散
    const bgLabs = [];
    const pushBg = (x, y) => {
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return;
      const i = (y * w + x) * 4;
      // 極端なハイライト/影は除外
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 18 || lum > 245) return;
      bgLabs.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
    };
    for (let x = Math.max(1, gx0 - 10); x <= Math.min(w - 2, gx1 + 10); x += 2) {
      pushBg(x, Math.max(1, gy0 - 8));
      pushBg(x, Math.min(h - 2, gy1 + 8));
    }
    for (let y = Math.max(1, gy0 - 10); y <= Math.min(h - 2, gy1 + 8); y += 2) {
      pushBg(Math.max(1, gx0 - 8), y);
      pushBg(Math.min(w - 2, gx1 + 8), y);
    }
    if (bgLabs.length < 10) return null;

    let meanL = 0, meanA = 0, meanB = 0;
    for (const lab of bgLabs) {
      meanL += lab.L; meanA += lab.a; meanB += lab.b;
    }
    meanL /= bgLabs.length; meanA /= bgLabs.length; meanB /= bgLabs.length;
    let varE = 0;
    for (const lab of bgLabs) {
      const d = deltaE(lab, { L: meanL, a: meanA, b: meanB });
      varE += d * d;
    }
    const bgStd = Math.sqrt(varE / bgLabs.length);
    const bgLab = { L: meanL, a: meanA, b: meanB };
    // 背景が均一なほど色差閾値を下げ、ばらつくほど上げる
    const dEThrSoft = Math.max(9, Math.min(18, 8 + bgStd * 0.85));
    const dEThrHard = Math.max(16, Math.min(32, 14 + bgStd * 1.1));

    const padX = Math.round((gx1 - gx0) * 0.12);
    const padY = Math.round((gy1 - gy0) * 0.12);
    const rx0 = Math.max(2, gx0 - padX);
    const ry0 = Math.max(2, gy0 - padY);
    const rx1 = Math.min(w - 3, gx1 + padX);
    const ry1 = Math.min(h - 3, gy1 + padY);
    const rw = rx1 - rx0;
    const rh = ry1 - ry0;
    if (rw < 28 || rh < 28) return null;

    const gray = new Float32Array(w * h);
    const mask = new Uint8Array(w * h);
    const sobel = new Float32Array(w * h);

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

    // 探索領域のエッジ分布から適応閾値
    let edgeSum = 0, edgeN = 0, edgeMax = 0;
    for (let y = ry0 + 2; y < ry1 - 2; y += 2) {
      for (let x = rx0 + 2; x < rx1 - 2; x += 2) {
        const e = sobel[y * w + x];
        edgeSum += e;
        edgeN++;
        if (e > edgeMax) edgeMax = e;
      }
    }
    const edgeMean = edgeN ? edgeSum / edgeN : 0;
    const edgeThrSoft = Math.max(12, Math.min(28, edgeMean * 1.35 + 6));
    const edgeThrHard = Math.max(28, Math.min(55, edgeMean * 2.2 + 14));

    const rowScores = new Float32Array(rh);
    const colScores = new Float32Array(rw);
    for (let y = ry0; y < ry1; y++) {
      let rSum = 0;
      for (let x = rx0; x < rx1; x++) {
        const pi = (y * w + x) * 4;
        const lab = rgbToLab(data[pi], data[pi + 1], data[pi + 2]);
        const dE = deltaE(lab, bgLab);
        const edge = sobel[y * w + x];
        const lum = gray[y * w + x];
        // 強いスペキュラはエッジ誤認しやすいので色差必須
        const isGlare = lum > 245 && dE < dEThrHard;
        const hit =
          !isGlare && (
            (dE > dEThrSoft && edge > edgeThrSoft) ||
            dE > dEThrHard ||
            (edge > edgeThrHard && dE > dEThrSoft * 0.55)
          );
        if (hit) {
          mask[y * w + x] = 1;
          rSum += 1;
          colScores[x - rx0] += 1;
        }
      }
      rowScores[y - ry0] = rSum / rw;
    }
    for (let x = 0; x < rw; x++) colScores[x] /= rh;

    morphClean(mask, w, h, rx0, ry0, rx1, ry1);

    // クリーン後に投影を再集計
    rowScores.fill(0);
    colScores.fill(0);
    for (let y = ry0; y < ry1; y++) {
      let rSum = 0;
      for (let x = rx0; x < rx1; x++) {
        if (mask[y * w + x]) {
          rSum++;
          colScores[x - rx0]++;
        }
      }
      rowScores[y - ry0] = rSum / rw;
    }
    for (let x = 0; x < rw; x++) colScores[x] /= rh;

    const densThr = 0.18;
    const yBound = findProjectionBounds(rowScores, densThr);
    const xBound = findProjectionBounds(colScores, densThr);
    if (!yBound || !xBound) return null;

    const top = yBound.lo, bottom = yBound.hi, left = xBound.lo, right = xBound.hi;
    const boxW = right - left + 1;
    const boxH = bottom - top + 1;
    const aspect = boxH / Math.max(1, boxW);
    if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return null;

    const absX0 = rx0 + left;
    const absY0 = ry0 + top;
    const absX1 = rx0 + right;
    const absY1 = ry0 + bottom;
    const areaRatio = (boxW * boxH) / guideArea;
    if (areaRatio < 0.30 || areaRatio > 1.28) return null;
    if (boxW < (gx1 - gx0) * 0.50 || boxH < (gy1 - gy0) * 0.50) return null;

    // 4辺の境界点（マスク + 強いエッジ）
    const leftPts = [], rightPts = [], topPts = [], bottomPts = [];
    const scanPad = 4;
    const edgePick = Math.max(10, edgeThrSoft * 0.85);
    for (let y = absY0; y <= absY1; y += 1) {
      for (let x = Math.max(rx0, absX0 - scanPad); x <= Math.min(rx1 - 1, absX0 + boxW * 0.38); x++) {
        if (mask[y * w + x] && sobel[y * w + x] > edgePick) { leftPts.push({ x, y }); break; }
      }
      for (let x = Math.min(rx1 - 1, absX1 + scanPad); x >= Math.max(rx0, absX1 - boxW * 0.38); x--) {
        if (mask[y * w + x] && sobel[y * w + x] > edgePick) { rightPts.push({ x, y }); break; }
      }
    }
    for (let x = absX0; x <= absX1; x += 1) {
      for (let y = Math.max(ry0, absY0 - scanPad); y <= Math.min(ry1 - 1, absY0 + boxH * 0.38); y++) {
        if (mask[y * w + x] && sobel[y * w + x] > edgePick) { topPts.push({ x, y }); break; }
      }
      for (let y = Math.min(ry1 - 1, absY1 + scanPad); y >= Math.max(ry0, absY1 - boxH * 0.38); y--) {
        if (mask[y * w + x] && sobel[y * w + x] > edgePick) { bottomPts.push({ x, y }); break; }
      }
    }

    const L = fitLineRansac(leftPts.length >= 5 ? leftPts : [{ x: absX0, y: absY0 }, { x: absX0, y: absY1 }], 24, 1.6);
    const R = fitLineRansac(rightPts.length >= 5 ? rightPts : [{ x: absX1, y: absY0 }, { x: absX1, y: absY1 }], 24, 1.6);
    const T = fitLineRansac(topPts.length >= 5 ? topPts : [{ x: absX0, y: absY0 }, { x: absX1, y: absY0 }], 24, 1.6);
    const B = fitLineRansac(bottomPts.length >= 5 ? bottomPts : [{ x: absX0, y: absY1 }, { x: absX1, y: absY1 }], 24, 1.6);

    let tl = lineIntersect(L.p1, L.p2, T.p1, T.p2);
    let tr = lineIntersect(R.p1, R.p2, T.p1, T.p2);
    let br = lineIntersect(R.p1, R.p2, B.p1, B.p2);
    let bl = lineIntersect(L.p1, L.p2, B.p1, B.p2);

    const fallback = [
      { x: absX0, y: absY0 },
      { x: absX1, y: absY0 },
      { x: absX1, y: absY1 },
      { x: absX0, y: absY1 }
    ];
    if (!tl || !tr || !br || !bl) {
      [tl, tr, br, bl] = fallback;
    } else {
      const clamp = (p) => ({
        x: Math.max(rx0, Math.min(rx1, p.x)),
        y: Math.max(ry0, Math.min(ry1, p.y))
      });
      tl = clamp(tl); tr = clamp(tr); br = clamp(br); bl = clamp(bl);
      const qw = ((tr.x + br.x) - (tl.x + bl.x)) / 2;
      const qh = ((bl.y + br.y) - (tl.y + tr.y)) / 2;
      if (qw < 10 || qh < 10 || qh / qw < ASPECT_MIN * 0.90 || qh / qw > ASPECT_MAX * 1.10) {
        [tl, tr, br, bl] = fallback;
      }
    }

    const center = {
      x: (tl.x + tr.x + br.x + bl.x) / 4,
      y: (tl.y + tr.y + br.y + bl.y) / 4
    };
    tl = refineCorner(gray, sobel, w, h, tl, center);
    tr = refineCorner(gray, sobel, w, h, tr, center);
    br = refineCorner(gray, sobel, w, h, br, center);
    bl = refineCorner(gray, sobel, w, h, bl, center);

    const cornersPx = [tl, tr, br, bl];
    const focus = laplacianVariance(gray, w, h, absX0, absY0, absX1 + 1, absY1 + 1);
    const edgeScore = perimeterEdgeScore(sobel, w, cornersPx);
    lastFocusScore = focus;
    lastEdgeScore = edgeScore;

    // 面積・アスペクト・エッジ・ピントから信頼度
    const aspectScore = 1 - Math.min(1, Math.abs(aspect - CARD_ASPECT) / 0.28);
    const areaScore = areaRatio >= 0.45 && areaRatio <= 1.05 ? 1 : areaRatio >= 0.30 && areaRatio <= 1.28 ? 0.65 : 0.3;
    const focusScoreN = Math.max(0, Math.min(1, focus / 40));
    const edgeScoreN = Math.max(0, Math.min(1, edgeScore / 55));
    const confidence =
      aspectScore * 0.22 +
      areaScore * 0.18 +
      focusScoreN * 0.28 +
      edgeScoreN * 0.32;
    lastConfidence = confidence;

    if (edgeScore < EDGE_MIN * 0.72 || confidence < 0.38) return null;

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
      edgeScore,
      confidence,
      aspect
    };
  }

  function drawOverlay(cv, box, corners, progress, focused, confident) {
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cv.width = Math.round(rect.width * devicePixelRatio);
    cv.height = Math.round(rect.height * devicePixelRatio);
    const ctx = cv.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!box && !corners) return;

    const isLocked = progress >= 0.55 && focused && confident;
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
        : !focused
          ? "ピントを合わせてください"
          : !confident
            ? "枠をガイドに合わせてください"
            : `検出中 ${Math.min(100, Math.round(progress * 100))}%`;
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
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const s = src[i], d = dst[i];
      A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
      b.push(d.x);
      A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
      b.push(d.y);
    }
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
    return h;
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
    const vw = vid.videoWidth || vid.width || 0;
    const vh = vid.videoHeight || vid.height || 0;
    if (!vw || !vh || !cornersNorm || cornersNorm.length !== 4) return null;

    const inset = insetCorners(cornersNorm, WARP_INSET);
    const src = inset.map((c) => ({ x: c.x * vw, y: c.y * vh }));
    const outW = 360;
    const outH = Math.round(outW * CARD_ASPECT);
    const dst = [
      { x: 0, y: 0 },
      { x: outW - 1, y: 0 },
      { x: outW - 1, y: outH - 1 },
      { x: 0, y: outH - 1 }
    ];
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

  function historyAgrees(corners) {
    if (cornerHistory.length < HISTORY_NEED) return false;
    for (let i = 0; i < cornerHistory.length; i++) {
      if (!cornersAgree(corners, cornerHistory[i], CORNER_AGREE)) return false;
    }
    return true;
  }

  function pushHistory(corners) {
    cornerHistory.push(corners.map((c) => ({ ...c })));
    if (cornerHistory.length > HISTORY_NEED) cornerHistory.shift();
  }

  function startLoop() {
    stopLoop();
    smoothBox = null;
    smoothCorners = null;
    stableFrames = 0;
    autoCaptured = false;
    frameSkip = 0;
    cornerHistory = [];
    lastFocusScore = 0;
    lastEdgeScore = 0;
    lastConfidence = 0;

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
                cornerHistory = [detected.corners.map((c) => ({ ...c }))];
              } else {
                const delta =
                  Math.abs(detected.box.x - smoothBox.x) +
                  Math.abs(detected.box.y - smoothBox.y) +
                  Math.abs(detected.box.w - smoothBox.w) +
                  Math.abs(detected.box.h - smoothBox.h);

                // 大きく動いたときは追従を速く、安定時は滑らかに
                const alpha = delta > 0.06 ? 0.55 : 0.32;
                smoothBox.x = smoothBox.x * (1 - alpha) + detected.box.x * alpha;
                smoothBox.y = smoothBox.y * (1 - alpha) + detected.box.y * alpha;
                smoothBox.w = smoothBox.w * (1 - alpha) + detected.box.w * alpha;
                smoothBox.h = smoothBox.h * (1 - alpha) + detected.box.h * alpha;
                for (let i = 0; i < 4; i++) {
                  smoothCorners[i].x = smoothCorners[i].x * (1 - alpha) + detected.corners[i].x * alpha;
                  smoothCorners[i].y = smoothCorners[i].y * (1 - alpha) + detected.corners[i].y * alpha;
                }

                const focused = detected.focus >= FOCUS_MIN;
                const edged = detected.edgeScore >= EDGE_MIN;
                const confident = detected.confidence >= CONF_MIN;
                pushHistory(detected.corners);

                if (delta < MOVE_EPS && focused && edged && confident) {
                  stableFrames++;
                } else if (delta < MOVE_EPS && focused) {
                  stableFrames = Math.max(0, stableFrames - 1);
                } else if (delta < MOVE_EPS) {
                  stableFrames = Math.max(0, stableFrames - 2);
                } else {
                  stableFrames = Math.max(0, stableFrames - 3);
                }
              }

              window.__detectedCardNormBox = { ...smoothBox };
              window.__detectedCardCorners = smoothCorners.map((c) => ({ ...c }));
              window.__detectedCardFocus = lastFocusScore;
              window.__detectedCardConfidence = lastConfidence;
            } else {
              stableFrames = Math.max(0, stableFrames - 2);
              cornerHistory = [];
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
          const confident = lastConfidence >= CONF_MIN && lastEdgeScore >= EDGE_MIN;
          if (cv) drawOverlay(cv, smoothBox, smoothCorners, progress, focused, confident);

          const historyOk = historyAgrees(smoothCorners);
          if (
            autoCaptureEnabled &&
            !autoCaptured &&
            stableFrames >= STABLE_NEED &&
            focused &&
            confident &&
            historyOk &&
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
    cornerHistory = [];
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

    const origSnap = window.snapSingleGuideCam;
    if (typeof origSnap === "function") {
      window.snapSingleGuideCam = function (...args) {
        if (!window.__detectedCardCorners && smoothCorners) {
          window.__detectedCardCorners = smoothCorners.map((c) => ({ ...c }));
        }
        if (!window.__detectedCardNormBox && smoothBox) {
          window.__detectedCardNormBox = { ...smoothBox };
        }

        if (window.__detectedCardCorners && window.__detectedCardCorners.length === 4) {
          try {
            return origSnap.apply(this, args);
          } finally {
            window.__detectedCardNormBox = null;
            window.__detectedCardCorners = null;
            // 連続撮影に備え、安定カウントだけリセット
            autoCaptured = true;
            setTimeout(() => { autoCaptured = false; stableFrames = 0; cornerHistory = []; }, 900);
          }
        }

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
            autoCaptured = true;
            setTimeout(() => { autoCaptured = false; stableFrames = 0; cornerHistory = []; }, 900);
          }
        }
        return origSnap.apply(this, args);
      };
    }
  });
})();
