  // エラーを赤い文字で画面に大きく表示する
  window.onerror = function(message, source, lineno, colno, error) {
    const errorDiv = document.createElement('div');
    if (!location.search.includes("debug=1")) return;
      errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff0000;
      color: white;
      padding: 16px;
      font-size: 15px;
      font-weight: bold;
      z-index: 999999;
      white-space: pre-wrap;
      font-family: monospace;
      line-height: 1.4;
    `;
    errorDiv.innerText = `【エラー発生】\n${message}\n\nファイル: ${source}\n行: ${lineno}  列: ${colno}`;
    document.body.prepend(errorDiv);
    return false;
  };

  window.addEventListener('unhandledrejection', function(event) {
    const errorDiv = document.createElement('div');
    if (!location.search.includes("debug=1")) return;
      errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #cc0000;
      color: white;
      padding: 16px;
      font-size: 15px;
      font-weight: bold;
      z-index: 999999;
      white-space: pre-wrap;
      font-family: monospace;
    `;
    errorDiv.innerText = `【Promiseエラー】\n${event.reason}`;
    document.body.prepend(errorDiv);
  });

  window.openAutoGoModal = function(poolId) {
    var modal = document.getElementById("autogo-modal");
    if (!modal) {
      if (typeof showToast === "function") {
        showToast("Auto-GOの画面が見つかりませんでした", "error");
      }
      return;
    }
    var rulesConsent = document.getElementById("ag-rules-consent");
    var shipConsent = document.getElementById("ag-auto-ship-consent");
    if (rulesConsent) rulesConsent.checked = false;
    if (shipConsent) shipConsent.checked = false;
    window.toggleAutoGoRulesConsent?.();
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.classList.remove("hidden");
    modal.classList.add("is-open");
    modal.style.setProperty("display", "flex", "important");
    modal.style.setProperty("visibility", "visible", "important");
    modal.style.setProperty("opacity", "1", "important");
    modal.style.setProperty("pointer-events", "auto", "important");
    modal.style.setProperty("position", "fixed", "important");
    modal.style.setProperty("inset", "0px", "important");
    modal.style.setProperty("z-index", "10000", "important");
    document.body.style.overflow = "hidden";
    if (poolId) window.__pendingAutoGoPoolId = poolId;

    // キャッシュ済みなら即描画（待ち時間を短縮）
    if (typeof window.__renderAutoGoCached === "function") {
      try { window.__renderAutoGoCached(); } catch (e) {}
    } else {
      var title = document.getElementById("ag-pool-title");
      var desc = document.getElementById("ag-pool-desc");
      if (title && (!title.textContent || title.textContent === "Auto-GO")) {
        title.textContent = "読み込み中...";
      }
      if (desc) desc.textContent = "プール情報を取得しています";
    }

    var attempts = 0;
    var loadPools = function() {
      attempts += 1;
      if (typeof window.__loadAutoGoPools === "function") {
        Promise.resolve(window.__loadAutoGoPools({ force: !!poolId })).catch(function(error) {
          var message = error && error.message ? error.message : "読み込めませんでした";
          var titleEl = document.getElementById("ag-pool-title");
          var descEl = document.getElementById("ag-pool-desc");
          if (titleEl) titleEl.textContent = "Auto-GOを開けませんでした";
          if (descEl) descEl.textContent = message;
          if (typeof showToast === "function") {
            showToast("Auto-GOの読み込みに失敗しました: " + message, "error");
          }
        });
        return;
      }
      if (attempts < 40) {
        setTimeout(loadPools, 100);
      } else if (typeof showToast === "function") {
        showToast("Auto-GOの準備に時間がかかっています。再読み込みしてください", "error");
      }
    };
    loadPools();
  };
  window.closeAutoGoModal = function() {
    var modal = document.getElementById("autogo-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("is-open");
    modal.style.setProperty("display", "none", "important");
    document.body.style.overflow = "";
  };
  document.addEventListener("DOMContentLoaded", function() {
    var banner = document.getElementById("autogo-home-banner");
    if (!banner) return;
    banner.addEventListener("click", function(event) {
      if (event) event.preventDefault();
      window.openAutoGoModal();
    });
  });
