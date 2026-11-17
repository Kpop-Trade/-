const GRID_SIZE = 3;
const HASH_W = 9;
const HASH_H = 8;
const CROP_MARGIN = 0.08;

export function computeGridDHash(source) {
  const srcW = source.videoWidth || source.naturalWidth || source.width;
  const srcH = source.videoHeight || source.naturalHeight || source.height;

  const sx = Math.round(srcW * CROP_MARGIN);
  const sy = Math.round(srcH * CROP_MARGIN);
  const sw = Math.round(srcW * (1 - CROP_MARGIN * 2));
  const sh = Math.round(srcH * (1 - CROP_MARGIN * 2));

  const targetW = HASH_W * GRID_SIZE;
  const targetH = HASH_H * GRID_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const { data } = ctx.getImageData(0, 0, targetW, targetH);
  const totalPixels = targetW * targetH;
  const gray = new Float32Array(totalPixels);

  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    gray[i] = lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum || 1;
  for (let i = 0; i < totalPixels; i++) {
    gray[i] = ((gray[i] - minLum) / range) * 255;
  }

  const hashes = new Uint32Array(GRID_SIZE * GRID_SIZE * 2);
  let outIdx = 0;

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      let hi = 0;
      let lo = 0;
      const startX = gx * HASH_W;
      const startY = gy * HASH_H;

      for (let y = 0; y < HASH_H; y++) {
        const rowOffset = (startY + y) * targetW + startX;
        for (let x = 0; x < 8; x++) {
          const bit = gray[rowOffset + x] < gray[rowOffset + x + 1] ? 1 : 0;
          if (y < 4) {
            hi = (hi << 1) | bit;
          } else {
            lo = (lo << 1) | bit;
          }
        }
      }
      hashes[outIdx++] = hi >>> 0;
      hashes[outIdx++] = lo >>> 0;
    }
  }
  return hashes;
}

function popcount32(n) {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function calcGridSimilarity(hashA, hashB) {
  let diffBits = 0;
  for (let i = 0; i < 18; i++) {
    diffBits += popcount32(hashA[i] ^ hashB[i]);
  }
  return 1 - diffBits / 576;
}

export function findTopMatches(queryImage, catalogList, topK = 3) {
  const queryHash = computeGridDHash(queryImage);
  const results = [];

  for (let i = 0; i < catalogList.length; i++) {
    const item = catalogList[i];
    if (!item.dhash) continue;
    const score = calcGridSimilarity(queryHash, item.dhash);
    results.push({
      card: item,
      score,
      percent: Math.round(score * 1000) / 10
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
