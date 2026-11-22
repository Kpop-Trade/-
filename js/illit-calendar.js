function dedupeCalendarEvents(list) {
  const score = (e) => (e.link && String(e.link).startsWith("http") ? 2 : 0) + (e.detail ? 1 : 0);
  const map = new Map();
  (list || []).forEach((e) => {
    if (!e || !e.date) return;
    const title = String(e.title || "").replace(/（Day.*?）/g, "").replace(/\s/g, "");
    const key = e.date + "|" + title.slice(0, 28);
    const prev = map.get(key);
    if (!prev || score(e) > score(prev)) map.set(key, e);
  });
  return Array.from(map.values());
}
let calendarEvents = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

window.openIllitCalendar = async function() {
  const modal = document.getElementById("illit-calendar-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  try {
    const res = await fetch("./illit_calendar.json?t=" + Date.now());
    if (!res.ok) throw new Error("Not found");
    calendarEvents = dedupeCalendarEvents(await res.json());
    renderCalendar();
  } catch (e) {
    document.getElementById("illit-calendar-detail").innerHTML = '<p class="text-center text-xs text-red-500">読み込めませんでした</p>';
  }
};

function renderCalendar() {
  const label = document.getElementById("calendar-month-label");
  const grid = document.getElementById("illit-calendar-grid");
  const detail = document.getElementById("illit-calendar-detail");
  label.textContent = `${currentYear}年${currentMonth + 1}月`;
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = ['日','月','火','水','木','金','土'];
  
  let html = days.map(d => `<div class="font-bold text-gray-500 py-1">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div></div>';
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEvent = calendarEvents.some(e => e.date === dateStr);
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    html += `<div onclick="showDayDetail('${dateStr}')" class="py-2 rounded-lg cursor-pointer ${hasEvent ? 'bg-indigo-100 font-bold text-indigo-700' : ''} ${isToday ? 'ring-2 ring-pink-400' : ''} hover:bg-gray-100">${d}</div>`;
  }
  grid.innerHTML = html;
  detail.innerHTML = '<p class="text-center text-xs text-gray-400">日付をタップして詳細を表示</p>';
}

window.changeMonth = function(delta) {
  currentMonth += delta;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
};

window.showDayDetail = function(dateStr) {
  const detail = document.getElementById("illit-calendar-detail");
  const events = calendarEvents.filter(e => e.date === dateStr);
  if (!events.length) {
    detail.innerHTML = '<p class="text-center text-xs text-gray-400">この日の予定はありません</p>';
    return;
  }
  detail.innerHTML = events.map(e => {
    const hasLink = e.link && e.link.trim().startsWith("http");
    const linkBadge = hasLink
      ? `<div class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">🔗 タップすると公式サイト・詳細ページへ移動します ↗</div>`
      : "";
    const tagOpen = hasLink ? `<a href="${e.link}" target="_blank" rel="noopener noreferrer" class="block p-2.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50/40 active:scale-[0.99] transition mb-2 shadow-sm">` : `<div class="p-2.5 rounded-lg border border-gray-200 bg-gray-50 mb-2">`;
    const tagClose = hasLink ? `</a>` : `</div>`;
    return `${tagOpen}<div class="text-xs font-bold text-indigo-700">${e.time || '終日'}</div><div class="text-sm font-bold text-gray-900">${e.title}</div><div class="text-xs text-gray-600 mt-0.5">${e.detail || ''}</div>${linkBadge}${tagClose}`;
  }).join('');
};

window.closeIllitCalendar = function() {
  document.getElementById("illit-calendar-modal").classList.add("hidden");
};
// ===== まとめ画像からのトレカ枠自動検出ロジック（複数画像＋アルバム・メンバー指定＋クリーン/透かし対応） =====

let multiSheetQueue = [];
let multiSheetIndex = 0;

window.handleMultipleSheetCrop = function(inputEl) {
  const files = Array.from(inputEl.files || []);
  inputEl.value = "";
  if (!files.length) return;
  multiSheetQueue = files;
  multiSheetIndex = 0;
  processNextSheet();
};

function processNextSheet() {
  if (multiSheetIndex >= multiSheetQueue.length) {
    showToast(multiSheetQueue.length + "枚のまとめ画像を処理しました", "success");
    const area = document.getElementById("sheet-crop-area");
    if (area) area.classList.add("hidden");
    return;
  }
  const file = multiSheetQueue[multiSheetIndex];
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      sheetCropState.img = img;
      sheetCropState.fileName = file.name;
      sheetCropState.boxes = [];
      const area = document.getElementById("sheet-crop-area");
      if (area) area.classList.remove("hidden");
      showAlbumMemberSelector();
      if (typeof rerunSheetAutoDetect === "function") rerunSheetAutoDetect();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function showAlbumMemberSelector() {
  const area = document.getElementById("sheet-crop-area");
  if (!area) return;
  let selector = document.getElementById("sheet-album-member-selector");
  if (!selector) {
    selector = document.createElement("div");
    selector.id = "sheet-album-member-selector";
    selector.className = "space-y-2 bg-indigo-50 px-2 py-2 rounded-lg mb-2";
    const albums = (window.ILLIT_CARD_ALBUMS || []).map(a => 
      '<option value="' + a.id + '">' + a.name + '</option>'
    ).join("");
    const members = ["", "ウォニ", "ミンジュ", "イロハ", "モカ", "ユナ", "OT5"].map(m =>
      '<option value="' + m + '">' + (m || "（メンバーなし）") + '</option>'
    ).join("");
    selector.innerHTML = 
      '<div class="flex items-center gap-2 text-xs">' +
        '<span class="font-bold text-indigo-800 w-16">アルバム:</span>' +
        '<select id="sheet-current-album" class="flex-1 liquid-glass-input rounded px-2 py-1 text-xs">' + albums + '</select>' +
      '</div>' +
      '<div class="flex items-center gap-2 text-xs">' +
        '<span class="font-bold text-indigo-800 w-16">メンバー:</span>' +
        '<select id="sheet-current-member" class="flex-1 liquid-glass-input rounded px-2 py-1 text-xs">' + members + '</select>' +
      '</div>';
    area.insertBefore(selector, area.firstChild);
  }
}

window.confirmAndNextSheet = function() {
  if (typeof commitSheetAutoCropsToZip === "function") {
    commitSheetAutoCropsToZip();
  }
  multiSheetIndex++;
  processNextSheet();
};

window.closeSheetCropArea = function() {
  const area = document.getElementById("sheet-crop-area");
  if (area && area.dataset.mode === "bundle") return;
  sheetCropState.img = null;
  sheetCropState.boxes = [];
  if (area) area.classList.add("hidden");
  const selector = document.getElementById("sheet-album-member-selector");
  if (selector) selector.remove();
};

window.commitSheetAutoCropsToZip = async function() {
  try {
    const img = sheetCropState && sheetCropState.img;
    const allBoxes = (sheetCropState && sheetCropState.boxes) ? sheetCropState.boxes : [];
    const boxes = allBoxes.filter(b => b && b.active !== false);
    if (!img || !boxes.length) {
      /* alert hidden */ console.log("有効な枠がありません。");
      return;
    }
    const btn = document.getElementById("sheet-crop-confirm-btn");
    if (btn) { btn.disabled = true; btn.textContent = "切り抜き中..."; }

    const albumSel = document.getElementById("sheet-current-album");
    const memberSel = document.getElementById("sheet-current-member");
    const currentAlbum = albumSel ? albumSel.value : (document.getElementById("admin-zip-album")?.value || adminCardsAlbum || "");
    const currentMember = memberSel ? memberSel.value : "";
    const baseStem = ((sheetCropState.fileName || "sheet").replace(/\.[^.]+$/, "") || "sheet");
    let added = 0;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (btn) btn.textContent = "切り抜き中... (" + (i + 1) + "/" + boxes.length + ")";
      await new Promise(r => setTimeout(r, 20));
      try {
        const sx = Math.max(0, Math.round(Number(b.x) || 0));
        const sy = Math.max(0, Math.round(Number(b.y) || 0));
        const cropW = Math.max(1, Math.min(img.naturalWidth || img.width, Math.round(Number(b.w) || 1)));
        const cropH = Math.max(1, Math.min(img.naturalHeight || img.height, Math.round(Number(b.h) || 1)));
        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cropW, cropH);
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
        
        // クリーン画像（判定用）
        const cleanBlob = await new Promise(resolve => canvas.toBlob(b => resolve(b), "image/jpeg", 0.95));
        
        // 透かし入り画像（公開用）
        let watermarkBlob = null;
        if (typeof compressCardWithWatermark === "function") {
          const tempFile = new File([cleanBlob], "temp.jpg", { type: "image/jpeg" });
          const wmDataUrl = await compressCardWithWatermark(tempFile, PHOTO_THUMB);
          if (wmDataUrl) {
            const resp = await fetch(wmDataUrl);
            watermarkBlob = await resp.blob();
          }
        }
        
        canvas.width = 0; canvas.height = 0;
        if (!cleanBlob) continue;
        
        const member = currentMember || (b.member || "").trim();
        const cardId = "crop_" + Date.now().toString(36) + "_" + i;
        const fileName = (member ? member + "_" : "") + baseStem + "_" + String(i + 1).padStart(2, "0") + ".jpg";
        
        // クリーン画像を保存（判定用）
        const cleanFile = new File([cleanBlob], "clean_" + fileName, { type: "image/jpeg" });
        // 透かし画像を保存（公開用）
        const wmFile = watermarkBlob ? new File([watermarkBlob], fileName, { type: "image/jpeg" }) : cleanFile;
        
        adminZipPackFiles.push({
          file: wmFile,
          cleanFile: cleanFile,
          relPath: fileName,
          albumId: currentAlbum,
          member: member || (typeof guessMemberFromFileName === "function" ? guessMemberFromFileName(fileName) : ""),
          cardId: cardId
        });
        added++;
      } catch (e) { console.error(e); }
    }
    if (typeof updateAdminZipPackUI === "function") updateAdminZipPackUI();
    if (added > 0) showToast(added + "枚を追加しました", "success");
    if (btn) { btn.disabled = false; btn.textContent = "✂️ 切り抜いて次へ"; }
  } catch (e) {
    console.error(e);
    /* alert hidden */ console.log("エラー: " + (e.message || e));
  }
};

// HTML変更箇所:
/*
<label class="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[11px] font-bold py-2.5 px-3 rounded-full cursor-pointer text-center hover:opacity-95 shadow-sm block">
  ✂️ まとめ画像から自動切り抜き（複数可）
  <input type="file" accept="image/*" multiple class="hidden" onchange="handleMultipleSheetCrop(this)">
</label>

<button id="sheet-crop-confirm-btn" onclick="confirmAndNextSheet()" class="flex-[2] bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold py-2 rounded-full shadow">
  ✂️ 切り抜いて次へ
</button>
*/
