// AI画像検索モジュール (CLIP-ViT-B-32 + card_vectors.json) 修正版
// 「AIモデルの準備が完了しました！」の後に結果が表示されない問題を修正

let _aiCardVectorsPromise = null;
let _aiClipExtractorPromise = null;

export async function getAiCardVectors() {
  if (!_aiCardVectorsPromise) {
    _aiCardVectorsPromise = fetch("./card_vectors.json", { cache: "force-cache" })
      .then(r => {
        if (!r.ok) throw new Error("card_vectors.json の読み込みに失敗しました");
        return r.json();
      })
      .then(d => (d && d.vectors) ? d.vectors : d)
      .catch(err => {
        _aiCardVectorsPromise = null;
        throw err;
      });
  }
  return _aiCardVectorsPromise;
}

export async function getAiClipExtractor(progressCb) {
  if (!_aiClipExtractorPromise) {
    _aiClipExtractorPromise = (async () => {
      const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      let lastProgressTime = Date.now();
      const modelPromise = pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
        dtype: "q8",
        progress_callback: (p) => {
          lastProgressTime = Date.now();
          if (progressCb) progressCb(p);
        }
      });
      const timeoutPromise = new Promise((_, rej) => {
        const timer = setInterval(() => {
          if (Date.now() - lastProgressTime > 35000) {
            clearInterval(timer);
            rej(new Error("AIモデルのダウンロードがタイムアウトしました"));
          }
        }, 1000);
        modelPromise.finally(() => clearInterval(timer));
      });
      return await Promise.race([modelPromise, timeoutPromise]);
    })().catch(err => {
      _aiClipExtractorPromise = null;
      throw err;
    });
  }
  return _aiClipExtractorPromise;
}

function shrinkForClip(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 224;
      c.height = 224;
      c.getContext("2d").drawImage(img, 0, 0, 224, 224);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function findSimilarCardsWithAI(uploadedDataUrl, progressCb) {
  if (typeof window.ensureCatalogCardsLoaded === "function") {
    await window.ensureCatalogCardsLoaded();
  }
  const smallUrl = await shrinkForClip(uploadedDataUrl);
  const vecMap = await getAiCardVectors();
  if (!vecMap || !Object.keys(vecMap).length) return [];

  const extractor = await getAiClipExtractor(progressCb);
  if (progressCb) progressCb({ status: "トレカ画像をAI解析中" });
  const out = await extractor(smallUrl, { pooling: "mean", normalize: true });
  const qVec = out.data;
  if (!qVec || !qVec.length) return [];

  const allCards = [];
  const seen = new Set();
  const albums = window.ILLIT_CARD_ALBUMS || [];
  albums.forEach(a => {
    const list = typeof window.getAlbumCards === "function" ? window.getAlbumCards(a.id) : [];
    list.forEach(c => {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        allCards.push(c);
      }
    });
  });

  const scored = [];
  for (const c of allCards) {
    const v = vecMap[c.id];
    if (!v || v.length !== qVec.length) continue;
    let dot = 0;
    for (let i = 0; i < qVec.length; i++) dot += qVec[i] * v[i];
    if (dot >= 0.25) {
      scored.push({
        card: c,
        score: Math.max(10, Math.min(99, Math.round(((dot - 0.25) / 0.65) * 100))),
        raw: dot
      });
    }
  }
  scored.sort((a, b) => b.raw - a.raw);
  return scored.slice(0, 6);
}

export async function runCardImageRecognition(uploadedDataUrl) {
  const container = document.getElementById("similar-cards-suggest");
  const updateStatus = (msg) => {
    ["similar-cards-suggest", "mycards-image-search-result"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("hidden");
        el.textContent = msg;
      }
    });
  };
  const esc = window.escapeHtml || ((s) => String(s || "").replace(/[&<>"']/g, m => ({"&":"&","<":"<",">":">","\"":""","'":"&#39;"}[m])));

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI画像解析がタイムアウトしました")), 120000)
  );

  try {
    updateStatus("🤖 AIモデルを準備中...");
    const matches = await Promise.race([
      findSimilarCardsWithAI(uploadedDataUrl, (p) => {
        if (p && typeof p.progress === "number") {
          updateStatus(`🤖 AIモデル準備中... ${Math.round(p.progress)}%`);
        } else if (p && p.status) {
          updateStatus(`⚡ ${p.status}...`);
        }
      }),
      timeoutPromise
    ]);

    if (!container) return matches;
    if (!matches || matches.length === 0) {
      container.classList.remove("hidden");
      container.innerHTML = `<div class="text-[11px] text-gray-400 py-1.5 text-center">一致する候補が見つかりませんでした（手動で選択してください）</div>`;
      return [];
    }

    const top = matches.slice(0, 6);
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="text-[11px] font-bold text-purple-700 mb-1.5 flex items-center justify-between">
        <span>✨ AI候補（タップで自動入力）</span>
        <span class="text-[10px] text-gray-400">${top.length}件</span>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        ${top.map(m => {
          const c = m.card || {};
          const img = (typeof window.getCardPhoto === "function" && window.getCardPhoto(c.id)) || c.img || "";
          return `<button type="button" onclick="applyRecognizedCard('${esc(c.id)}')" class="bg-white border border-purple-200 hover:border-purple-500 rounded-xl p-1 text-left shadow-sm transition active:scale-95">
            <div class="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-1">
              ${img ? `<img src="${esc(img)}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Img</div>`}
              <span class="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1 rounded">${m.score}%</span>
            </div>
            <div class="text-[10px] font-bold text-gray-800 truncate">${esc(c.member || "")}</div>
            <div class="text-[9px] text-gray-500 truncate">${esc(c.name || "")}</div>
          </button>`;
        }).join("")}
      </div>
    `;
    return matches;
  } catch (e) {
    console.error("AI Recognition Error:", e);
    updateStatus("⚠️ 解析エラー: " + (e.message || e));
    if (container) {
      container.classList.remove("hidden");
      container.innerHTML = `<div class="text-[11px] text-red-500 py-1.5 text-center">解析エラー: ${e.message || e}</div>`;
    }
    return [];
  }
}
