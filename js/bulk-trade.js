(function() {
  window.__isBulkMode = false;
  window.__bulkSlots = [];
  window.__selectedEditorSlotId = null;
  window.__bulkSelectTargetPost = null;
  window.__bulkSelectedSlotIds = new Set();

  window.openBulkPostModal = function() {
    window.__fromBulkBtn = true;
    setTimeout(() => { window.__fromBulkBtn = false; }, 100);
    window.__isBulkMode = true;
    window.isBulkMode = true;
    window.__bulkSlots = [];
    if (typeof openPostModal === "function") openPostModal("exchange");
    // openPostModal 内で __fromBulkBtn を見て bundle に揃えるが、念のため再同期
    if (typeof setExchangeStyle === "function") setExchangeStyle("bundle");
    window.__isBulkMode = true;
    window.isBulkMode = true;
    const titleEl = document.getElementById("post-modal-title");
    if (titleEl) titleEl.textContent = "📦 まとめて出品（枠設定）";
    const box = document.getElementById("bulk-slot-setup-box");
    if (box) box.classList.remove("hidden");
    updateBulkSlotBadge();
  };

  function updateBulkSlotBadge() {
    const b1 = document.getElementById("bulk-slot-count-badge");
    const b2 = document.getElementById("bulk-editor-total");
    if (b1) b1.textContent = window.__bulkSlots.length + "枠設定中";
    if (b2) b2.textContent = String(window.__bulkSlots.length);
  }

  function getUploadedPhotoSrc() {
    const previewImg = document.querySelector("#post-photo-preview img");
    return previewImg ? previewImg.src : "";
  }

  window.openBulkSlotEditor = function() {
    const src = getUploadedPhotoSrc();
    if (!src) return /* alert hidden */ console.log("先に「写真を追加」からトレカが写った写真を1枚選択してください！");
    document.getElementById("bulk-editor-img").src = src;
    if (window.__bulkSlots.length === 0) window.generateBulkGrid(2, 3);
    else renderBulkEditorOverlay();
    document.getElementById("bulk-slot-editor-modal").classList.remove("hidden");
  };

  window.closeBulkSlotEditor = function() { document.getElementById("bulk-slot-editor-modal").classList.add("hidden"); };
  window.saveBulkSlotsAndClose = function() {
    if (window.__bulkSlots.length === 0) return /* alert hidden */ console.log("少なくとも1つ以上の枠を設定してください。");
    updateBulkSlotBadge();
    closeBulkSlotEditor();
  };

  window.addBulkSlot = function() {
    const idx = window.__bulkSlots.length + 1;
    const id = "slot_" + Date.now().toString(36) + "_" + idx;
    window.__bulkSlots.push({ id, x: Math.min(70, 10 + (idx * 5) % 50), y: Math.min(70, 10 + (idx * 5) % 50), w: 24, h: 34, sold: false, tradeId: null });
    window.__selectedEditorSlotId = id;
    renderBulkEditorOverlay();
    updateBulkSlotBadge();
  };

  window.generateBulkGrid = function(cols, rows) {
    window.__bulkSlots = [];
    const padX = 4, padY = 4, gapX = 2, gapY = 2;
    const w = (100 - padX * 2 - gapX * (cols - 1)) / cols;
    const h = (100 - padY * 2 - gapY * (rows - 1)) / rows;
    let n = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        window.__bulkSlots.push({ id: "slot_" + n++, x: +(padX + c * (w + gapX)).toFixed(2), y: +(padY + r * (h + gapY)).toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2), sold: false, tradeId: null });
      }
    }
    window.__selectedEditorSlotId = window.__bulkSlots[0]?.id || null;
    renderBulkEditorOverlay();
    updateBulkSlotBadge();
  };

  window.removeSelectedBulkSlot = function() {
    if (!window.__selectedEditorSlotId) return;
    window.__bulkSlots = window.__bulkSlots.filter(s => s.id !== window.__selectedEditorSlotId);
    window.__selectedEditorSlotId = window.__bulkSlots[0]?.id || null;
    renderBulkEditorOverlay();
    updateBulkSlotBadge();
  };

  window.clearAllBulkSlots = function() {
    window.__bulkSlots = [];
    window.__selectedEditorSlotId = null;
    renderBulkEditorOverlay();
    updateBulkSlotBadge();
  };

  function renderBulkEditorOverlay() {
    const overlay = document.getElementById("bulk-editor-overlay");
    if (!overlay) return;
    overlay.innerHTML = "";
    window.__bulkSlots.forEach((slot, i) => {
      const isSel = slot.id === window.__selectedEditorSlotId;
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${slot.x}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%;border:2px solid ${isSel ? "#ec4899" : "#22d3ee"};background:${isSel ? "rgba(236,72,153,0.25)" : "rgba(34,211,238,0.18)"};border-radius:6px;box-sizing:border-box;touch-action:none;cursor:move;`;
      box.innerHTML = `<span style="position:absolute;top:2px;left:3px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;font-weight:bold;padding:0 4px;border-radius:4px;">#${i + 1}</span>
        <div data-resize="1" style="position:absolute;right:-4px;bottom:-4px;width:16px;height:16px;background:#ec4899;border:2px solid #fff;border-radius:50%;cursor:nwse-resize;"></div>`;
      let startX = 0, startY = 0, origX = slot.x, origY = slot.y, origW = slot.w, origH = slot.h, resizing = false;
      box.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        window.__selectedEditorSlotId = slot.id;
        resizing = e.target && e.target.getAttribute("data-resize") === "1";
        startX = e.clientX; startY = e.clientY;
        origX = slot.x; origY = slot.y; origW = slot.w; origH = slot.h;
        box.setPointerCapture(e.pointerId);
        renderBulkEditorOverlay();
      });
      box.addEventListener("pointermove", (e) => {
        if (!box.hasPointerCapture(e.pointerId)) return;
        const rect = overlay.getBoundingClientRect();
        const dx = ((e.clientX - startX) / rect.width) * 100;
        const dy = ((e.clientY - startY) / rect.height) * 100;
        if (resizing) {
          slot.w = Math.max(8, Math.min(100 - slot.x, +(origW + dx).toFixed(2)));
          slot.h = Math.max(8, Math.min(100 - slot.y, +(origH + dy).toFixed(2)));
        } else {
          slot.x = Math.max(0, Math.min(100 - slot.w, +(origX + dx).toFixed(2)));
          slot.y = Math.max(0, Math.min(100 - slot.h, +(origY + dy).toFixed(2)));
        }
        box.style.left = slot.x + "%"; box.style.top = slot.y + "%";
        box.style.width = slot.w + "%"; box.style.height = slot.h + "%";
      });
      overlay.appendChild(box);
    });
  }

  window.openBulkSelectModal = function(post) {
    window.__bulkSelectTargetPost = post;
    window.__bulkSelectedSlotIds = new Set();
    document.getElementById("bulk-select-img").src = (post.images && post.images[0]) || post.image || "";
    renderBulkSelectOverlay(post.bulkSlots || []);
    document.getElementById("bulk-selected-count").textContent = "0";
    document.getElementById("bulk-select-modal").classList.remove("hidden");
  };

  window.closeBulkSelectModal = function() { document.getElementById("bulk-select-modal").classList.add("hidden"); };

  function renderBulkSelectOverlay(slots) {
    const overlay = document.getElementById("bulk-select-overlay");
    overlay.innerHTML = "";
    slots.forEach((slot, i) => {
      const isSold = !!slot.sold;
      const isChecked = window.__bulkSelectedSlotIds.has(slot.id);
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${slot.x}%;top:${slot.y}%;width:${slot.w}%;height:${slot.h}%;border:2px solid ${isSold ? "#9ca3af" : isChecked ? "#ef4444" : "#38bdf8"};background:${isSold ? "rgba(31,41,55,0.68)" : isChecked ? "rgba(239,68,68,0.32)" : "rgba(56,189,248,0.12)"};border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:${isSold ? "not-allowed" : "pointer"};`;
      if (isSold) box.innerHTML = `<span style="color:#e5e7eb;font-weight:900;font-size:11px;background:rgba(0,0,0,0.65);padding:1px 5px;border-radius:4px;">成約済</span>`;
      else if (isChecked) box.innerHTML = `<span style="color:#ef4444;font-weight:900;font-size:28px;line-height:1;text-shadow:0 0 6px #fff,0 0 2px #000;">×</span>`;
      else box.innerHTML = `<span style="position:absolute;top:2px;left:3px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:0 4px;border-radius:4px;">#${i + 1}</span>`;
      if (!isSold) {
        box.onclick = () => {
          if (window.__bulkSelectedSlotIds.has(slot.id)) window.__bulkSelectedSlotIds.delete(slot.id);
          else window.__bulkSelectedSlotIds.add(slot.id);
          document.getElementById("bulk-selected-count").textContent = String(window.__bulkSelectedSlotIds.size);
          renderBulkSelectOverlay(slots);
        };
      }
      overlay.appendChild(box);
    });
  }

  window.confirmBulkSelectionAndApply = function() {
    if (window.__bulkSelectedSlotIds.size === 0) return /* alert hidden */ console.log("交換したいトレカの枠を1つ以上タップして「×」をつけてください。");
    window.__pendingBulkSlotIds = Array.from(window.__bulkSelectedSlotIds);
    closeBulkSelectModal();
    if (typeof window.__proceedOriginalTradeApply === "function") window.__proceedOriginalTradeApply();
  };
})();
