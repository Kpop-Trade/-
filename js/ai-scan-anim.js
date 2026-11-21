(function(){
  function setScanEffect(active) {
    // AI検索モーダル・プレビュー・myトレカ検索内の画像コンテナを対象にする
    const selectors = [
      "#ai-search-preview-wrap",
      "#ai-search-modal img",
      "#mycard-ai-preview",
      "#post-ai-preview",
      "[id*=\"ai-search\"] img",
      "[id*=\"search-preview\"]"
    ];
    const targets = new Set();
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.offsetParent) return;
        const wrap = el.tagName === "IMG" ? el.parentElement : el;
        if (wrap && wrap.offsetWidth >= 60 && wrap.offsetHeight >= 60) {
          targets.add(wrap);
        }
      });
    });

    targets.forEach(wrap => {
      if (active) {
        wrap.classList.add("ai-scanning-wrap");
        if (!wrap.querySelector(".ai-scan-badge")) {
          const b = document.createElement("div");
          b.className = "ai-scan-badge";
          b.textContent = "✨ AI SCANNING...";
          wrap.appendChild(b);
        }
      } else {
        wrap.classList.remove("ai-scanning-wrap");
        const b = wrap.querySelector(".ai-scan-badge");
        if (b) b.remove();
      }
    });
  }

  window.setAiScanEffect = setScanEffect;

  // 画面上の「AI検索中」「解析中」「認識中」「照合中」テキストやローディング状態を自動検知してスキャンON/OFF
  setInterval(() => {
    const bodyText = document.body ? document.body.innerText : "";
    const isBusy = /(AI検索中|AI解析中|AI認識中|画像解析中|照合中|スキャン中|Searching|Analyzing)/i.test(bodyText);
    setScanEffect(isBusy);
  }, 200);
})();

  
