(function() {
  const PRESET_4 = ["ウォンヒ (Wonhee)", "ミンジュ (Minju)", "モカ (Moka)", "ユナ (Yuna)"];
  const PRESET_5 = ["ウォンヒ (Wonhee)", "ミンジュ (Minju)", "モカ (Moka)", "イロハ (Iroha)", "ユナ (Yuna)"];

  let activePoolId = new URLSearchParams(location.search).get("pool") || "";
  let allPools = [];
  let currentPoolData = null;
  let currentEntryData = null;
  let currentEntries = [];
  let unsubPoolsList = null;
  let unsubPool = null;
  let unsubEntry = null;
  let unsubEntries = null;
  let subscribedPoolId = "";
  let poolsListenerReady = false;
  let selectPoolSeq = 0;

  function getActiveMembers() {
    return (currentPoolData && Array.isArray(currentPoolData.members) && currentPoolData.members.length)
      ? currentPoolData.members
      : PRESET_4;
  }

  function escapeAutoGoHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getAutoGoXId(profile) {
    return String(profile?.xId || profile?.twitter || profile?.xUsername || "").trim().replace(/^@/, "");
  }

  function agTimeMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }
  function agFormatTime(value) {
    const ms = agTimeMs(value);
    if (!ms) return "未登録";
    const date = new Date(ms);
    const month = String(date.getMonth() + 1);
    const day = String(date.getDate());
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return month + "/" + day + " " + hour + ":" + minute;
  }
  function agFirstChoicePercent(count, memberCount) {
    const members = Math.max(1, Number(memberCount) || 1);
    const baseline = 100 / members;
    const total = Math.max(0, Number(count) || 0);
    let probability;
    if (total <= 20) {
      probability = baseline + (82.5 - baseline) * (total / 20);
    } else if (total <= 50) {
      probability = 82.5 + (88 - 82.5) * ((total - 20) / 30);
    } else {
      probability = Math.min(99, 88 + (12 * (total - 50) / 65));
    }
    return Math.round(probability * 10) / 10;
  }
  function drawFirstChoiceChart(total, memberCount, targetCount, minThreshold) {
    const svg = document.getElementById("ag-prob-svg");
    const big = document.getElementById("ag-prob-big");
    const nowPercent = agFirstChoicePercent(total, memberCount);
    if (big) big.textContent = nowPercent.toFixed(1);
    if (!svg) return;
    const width = 340;
    const height = 196;
    const left = 38;
    const right = 14;
    const top = 28;
    const bottom = 42;
    const establishAt = Math.max(1, Number(minThreshold) || 20);
    const maxCount = Math.max(50, Number(total) || 0, Number(targetCount) || 0, establishAt);
    const yOf = (percent) => top + (1 - Math.max(0, Math.min(100, percent)) / 100) * (height - top - bottom);
    const xOf = (count) => left + (Math.max(0, Math.min(count, maxCount)) / maxCount) * (width - left - right);
    const steps = 48;
    const coords = [];
    for (let i = 0; i <= steps; i++) {
      const count = (maxCount * i) / steps;
      coords.push([xOf(count), yOf(agFirstChoicePercent(count, memberCount))]);
    }
    const line = coords.map((pt) => pt[0].toFixed(1) + "," + pt[1].toFixed(1)).join(" ");
    const baseY = (height - bottom).toFixed(1);
    const area = line + " " + xOf(maxCount).toFixed(1) + "," + baseY + " " + xOf(0).toFixed(1) + "," + baseY;
    let grid = "";
    [0, 25, 50, 75, 100].forEach((tick) => {
      const y = yOf(tick);
      grid += '<line x1="' + left + '" y1="' + y.toFixed(1) + '" x2="' + (width - right) + '" y2="' + y.toFixed(1) + '" stroke="#f3e8ff" stroke-width="1"></line>';
      grid += '<text x="' + (left - 5) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#9ca3af">' + tick + '%</text>';
    });
    const clamped = Math.max(0, Math.min(Number(total) || 0, maxCount));
    const establishX = xOf(establishAt);
    const zoneWidth = Math.max(0, xOf(maxCount) - establishX);
    let establishFill = "";
    let establishMarker = "";
    if (zoneWidth > 0.5) {
      establishFill =
        '<rect x="' + establishX.toFixed(1) + '" y="' + top + '" width="' + zoneWidth.toFixed(1) + '" height="' + (height - top - bottom).toFixed(1) + '" fill="#6ee7b7" fill-opacity="0.35"></rect>';
      establishMarker =
        '<line x1="' + establishX.toFixed(1) + '" y1="' + top + '" x2="' + establishX.toFixed(1) + '" y2="' + (height - bottom) + '" stroke="#059669" stroke-dasharray="4 3" stroke-width="1.6"></line>';
      // 成立人数が左側に寄る場合でもラベルが軸に食い込まないよう、常に帯の内側（右寄り）に置く
      const labelW = 92;
      const labelPad = 6;
      const minLabelX = left + 2;
      const maxLabelX = width - right - labelW - 2;
      let labelLeft = establishX + labelPad;
      if (labelLeft < minLabelX) labelLeft = minLabelX;
      if (labelLeft > maxLabelX) labelLeft = Math.max(minLabelX, maxLabelX);
      // 成立線が左端付近のときは帯の開始直後に固定して「場所がおかしい」見え方を防ぐ
      if (establishX - left < 28) labelLeft = Math.min(Math.max(establishX + 4, minLabelX), maxLabelX);
      const establishLabelX = labelLeft + 4;
      establishMarker +=
        '<rect x="' + labelLeft.toFixed(1) + '" y="' + (top - 2) + '" width="' + labelW + '" height="14" rx="3" fill="#059669"></rect>' +
        '<text x="' + establishLabelX.toFixed(1) + '" y="' + (top + 9) + '" text-anchor="start" font-size="9" font-weight="700" fill="#ffffff">ここから企画成立</text>';
    }
    let guides = "";
    [50].forEach((count) => {
      if (count <= 0 || count > maxCount || Math.abs(count - establishAt) < 0.5) return;
      const x = xOf(count);
      const percent = agFirstChoicePercent(count, memberCount);
      const y = yOf(percent);
      const nearNow = Math.abs(count - clamped) < 3;
      guides += '<line x1="' + x.toFixed(1) + '" y1="' + top + '" x2="' + x.toFixed(1) + '" y2="' + (height - bottom) + '" stroke="#fbcfe8" stroke-dasharray="2 3" stroke-width="1"></line>';
      if (!nearNow) {
        guides += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4" fill="#f9a8d4" stroke="#ffffff" stroke-width="1"></circle>';
        let pctX = x + 10;
        let pctAnchor = "start";
        if (x > width * 0.7) { pctX = x - 10; pctAnchor = "end"; }
        guides += '<text x="' + pctX.toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="' + pctAnchor + '" font-size="8" font-weight="700" fill="#9d174d">' + percent.toFixed(1) + '%</text>';
      }
    });
    const establishPercent = agFirstChoicePercent(establishAt, memberCount);
    const establishY = yOf(establishPercent);
    if (Math.abs(establishAt - clamped) >= 3) {
      guides += '<circle cx="' + establishX.toFixed(1) + '" cy="' + establishY.toFixed(1) + '" r="2.8" fill="#059669" stroke="#ffffff" stroke-width="1.5"></circle>';
      // 折れ線の下側にピルを置き、線との重なりを避ける
      const pctText = establishPercent.toFixed(1) + "%";
      const pillW = 44;
      const pillH = 16;
      let pillY = establishY + 10;
      if (pillY + pillH > height - bottom - 2) pillY = establishY - 28;
      const pillX = Math.max(left + 2, Math.min(establishX - pillW / 2, width - right - pillW));
      guides += '<rect x="' + pillX.toFixed(1) + '" y="' + pillY.toFixed(1) + '" width="' + pillW + '" height="' + pillH + '" rx="8" fill="#ffffff" stroke="#059669" stroke-width="1.2"></rect>';
      guides += '<text x="' + (pillX + pillW / 2).toFixed(1) + '" y="' + (pillY + 11.5).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="800" fill="#047857">' + pctText + '</text>';
    }
    let xLabels = "";
    // 0人・成立人数・最大人数が近接すると「02人」のように潰れるため、ピクセル距離で間引き
    const xTickCandidates = [0, establishAt, Math.round(maxCount)];
    const placedTicks = [];
    const minTickGapPx = 36;
    xTickCandidates.forEach((count) => {
      if (count < 0 || count > maxCount + 0.01) return;
      const x = xOf(count);
      const isEstablish = Math.abs(count - establishAt) < 0.5;
      const conflict = placedTicks.some((tick) => Math.abs(tick.x - x) < minTickGapPx);
      if (conflict) {
        // 成立マーカーを優先。0人側と重なるときは0人ラベルを落とす
        if (isEstablish) {
          for (let i = placedTicks.length - 1; i >= 0; i--) {
            if (Math.abs(placedTicks[i].x - x) < minTickGapPx && !placedTicks[i].isEstablish) {
              placedTicks.splice(i, 1);
            }
          }
          placedTicks.push({ count, x, isEstablish: true });
        }
        return;
      }
      placedTicks.push({ count, x, isEstablish });
    });
    placedTicks.forEach((tick) => {
      let anchor = "middle";
      let labelX = tick.x;
      if (tick.count <= 0) { anchor = "start"; labelX = left; }
      else if (tick.count >= maxCount - 0.5) { anchor = "end"; labelX = width - right; }
      else if (tick.isEstablish && tick.x - left < 40) {
        // 成立人数が左端付近のとき、ラベルを右へずらして重なりを回避
        anchor = "start";
        labelX = Math.min(tick.x + 4, width - right - 8);
      }
      xLabels += '<text x="' + labelX.toFixed(1) + '" y="' + (height - 18) + '" text-anchor="' + anchor + '" font-size="9" font-weight="' + (tick.isEstablish ? "700" : "400") + '" fill="' + (tick.isEstablish ? "#047857" : "#6b7280") + '">' + tick.count + "人</text>";
      if (tick.isEstablish) {
        xLabels += '<text x="' + labelX.toFixed(1) + '" y="' + (height - 6) + '" text-anchor="' + anchor + '" font-size="8" font-weight="700" fill="#059669">企画成立〜</text>';
      }
    });
    const nowX = xOf(clamped);
    const nowY = yOf(nowPercent);
    let labelX = nowX + 8;
    let anchor = "start";
    if (nowX > width - 78) { labelX = nowX - 8; anchor = "end"; }
    let labelY = nowY - 10;
    if (labelY < top + 20) labelY = nowY + 16;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = grid
      + '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + (height - bottom) + '" stroke="#e5e7eb" stroke-width="1"></line>'
      + '<line x1="' + left + '" y1="' + (height - bottom) + '" x2="' + (width - right) + '" y2="' + (height - bottom) + '" stroke="#e5e7eb" stroke-width="1"></line>'
      + '<polygon points="' + area + '" fill="#fce7f3" fill-opacity="0.75"></polygon>'
      + establishFill
      + guides
      + '<polyline fill="none" stroke="#db2777" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + line + '"></polyline>'
      + establishMarker
      + '<line x1="' + nowX.toFixed(1) + '" y1="' + top + '" x2="' + nowX.toFixed(1) + '" y2="' + (height - bottom) + '" stroke="#7c3aed" stroke-dasharray="3 3" stroke-width="1.4"></line>'
      + '<circle cx="' + nowX.toFixed(1) + '" cy="' + nowY.toFixed(1) + '" r="5" fill="#db2777" stroke="#ffffff" stroke-width="2"></circle>'
      + '<text x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" font-weight="700" fill="#be185d">' + nowPercent.toFixed(1) + "%</text>"
      + xLabels;
  }
  function agPurchaseDeadline(entry) {
    return agTimeMs(entry && entry.purchaseDeadlineAt);
  }
  function agShipDeadline(entry) {
    const own = agTimeMs(entry && (entry.shipDeadlineAt || entry.shippingDeadlineAt));
    if (own) return own;
    const matched = agTimeMs(entry && entry.matchedAt);
    if (matched) return matched + 72 * 60 * 60 * 1000;
    return 0;
  }
  function agPurchaseLate(entry) {
    if (!entry || entry.status !== "confirmed") return false;
    const deadline = agPurchaseDeadline(entry);
    if (!deadline) return false;
    return Date.now() > deadline;
  }
  function agShipLate(entry) {
    if (!entry) return false;
    if (entry.status === "unshipped_penalty") return true;
    if (entry.shippedAt || entry.shippedDone) return false;
    if (entry.status !== "matched" || entry.noMatchResult || !entry.shipToAddress) return false;
    const deadline = agShipDeadline(entry);
    if (!deadline) return false;
    return Date.now() > deadline;
  }
  function agPushImage(list, value) {
    if (typeof value === "string" && (value.indexOf("data:image") === 0 || value.indexOf("https://") === 0 || value.indexOf("http://") === 0)) {
      list.push(value);
    }
  }
  function agImageList(entry) {
    const purchase = [];
    const shipping = [];
    if (!entry) return { purchase: purchase, shipping: shipping };
    agPushImage(purchase, entry.purchaseProofUrl);
    agPushImage(purchase, entry.purchasePhoto);
    agPushImage(purchase, entry.purchaseImage);
    agPushImage(shipping, entry.shippingProofUrl);
    agPushImage(shipping, entry.shipPhoto);
    agPushImage(shipping, entry.shippingPhoto);
    return { purchase: purchase, shipping: shipping };
  }
  function agRenderImages(title, urls) {
    if (!urls || !urls.length) {
      return '<div class="rounded-xl border border-gray-200 p-2"><div class="font-bold mb-1">' + escapeAutoGoHtml(title) + '</div><p class="text-gray-500">写真はまだ登録されていません。</p></div>';
    }
    let html = '<div class="rounded-xl border border-gray-200 p-2"><div class="font-bold mb-1">' + escapeAutoGoHtml(title) + '</div><div class="grid grid-cols-2 gap-2">';
    for (let i = 0; i < urls.length; i++) {
      html += '<img src="' + urls[i] + '" alt="" class="w-full rounded-lg border border-gray-100 bg-gray-50">';
    }
    html += "</div></div>";
    return html;
  }
  function agPersonButton(poolId, entry, profile, pool) {
    const latePurchase = agPurchaseLate(entry);
    const lateShip = agShipLate(entry);
    const late = latePurchase || lateShip;
    const name = (profile && profile.nickname) || entry.userName || entry.displayName || "参加者";
    const photo = profile && profile.photo ? profile.photo : "";
    let face = '<div class="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-black">' + escapeAutoGoHtml(String(name).slice(0, 1)) + "</div>";
    if (typeof photo === "string" && photo.indexOf("data:image") === 0) {
      face = '<img src="' + photo + '" alt="" class="w-10 h-10 rounded-full object-cover border border-white">';
    }
    let lateLabel = "";
    if (latePurchase && lateShip) lateLabel = "購入・発送期限超過";
    else if (latePurchase) lateLabel = "購入期限超過";
    else if (lateShip) lateLabel = "発送期限超過";
    const cls = late ? "ag-person-late border-2" : "bg-white border border-gray-200 text-gray-900";
    return '<button type="button" data-ag-act="person" data-pool-id="' + escapeAutoGoHtml(poolId) + '" data-uid="' + escapeAutoGoHtml(entry.uid) + '" onclick="window.openAutoGoPerson(this.getAttribute(\'data-pool-id\'), this.getAttribute(\'data-uid\'))" class="' + cls + ' rounded-2xl px-2 py-2 min-h-[44px] w-[108px] shrink-0 text-left" style="position:relative;z-index:6;touch-action:manipulation;">'
      + face
      + '<div class="text-[11px] font-black truncate mt-1">' + escapeAutoGoHtml(name) + "</div>"
      + '<div class="text-[9px] truncate">希望 ' + escapeAutoGoHtml(entry.wantedMember || "-") + "</div>"
      + (lateLabel ? '<div class="text-[9px] font-black leading-tight">' + lateLabel + "</div>" : '<div class="text-[9px] text-gray-500 truncate">' + escapeAutoGoHtml(entry.status || "参加中") + "</div>")
      + "</button>";
  }
  function agOrderCycle(list) {
    if (!list.length) return [];
    const byId = {};
    for (let i = 0; i < list.length; i++) byId[list[i].uid] = list[i];
    const ordered = [list[0]];
    const seen = {};
    seen[list[0].uid] = true;
    let cursor = list[0];
    for (let step = 0; step < list.length + 1; step++) {
      const nextId = cursor.sendToUid;
      if (!nextId || !byId[nextId] || seen[nextId]) break;
      ordered.push(byId[nextId]);
      seen[nextId] = true;
      cursor = byId[nextId];
    }
    for (let i = 0; i < list.length; i++) {
      if (!seen[list[i].uid]) ordered.push(list[i]);
    }
    return ordered;
  }
  function agStatusShort(entry) {
    if (!entry) return "―";
    if (entry.receivedDone) return "完";
    if (entry.shippedDone || entry.shippedAt) return "済";
    if (entry.status === "matched" && entry.shipToAddress) return "送";
    if (entry.status === "matched" && entry.noMatchResult) return "外";
    if (entry.status === "waiting_match") return "開";
    if (entry.status === "arrived") return "着";
    if (entry.status === "purchased") return "購";
    if (entry.status === "confirmed") return "確";
    if (entry.status === "reserved") return "予";
    if (entry.status === "cancelled") return "消";
    if (entry.status === "unshipped_penalty") return "罰";
    return String(entry.status || "―").slice(0, 1);
  }
  function agStatusFull(entry) {
    if (!entry) return "不明";
    if (entry.receivedDone) return "受取完了";
    if (entry.shippedDone || entry.shippedAt) return "発送済み";
    if (entry.status === "matched" && entry.noMatchResult) return "対象外";
    if (entry.status === "matched" && entry.shipToAddress) return "発送待ち";
    if (entry.status === "waiting_match") return "マッチング待ち";
    if (entry.status === "arrived") return "到着済み";
    if (entry.status === "purchased") return "購入済み";
    if (entry.status === "confirmed") return "購入待ち";
    if (entry.status === "reserved") return "仮予約";
    if (entry.status === "cancelled") return "キャンセル";
    if (entry.status === "unshipped_penalty") return "発送期限超過";
    if (entry.status === "delayed") return "遅延報告";
    if (entry.status === "self_pulled") return "自引き";
    return String(entry.status || "参加中");
  }
  function agMatchDiagram(pool) {
    const entries = (pool.entries || []).filter(function(e) { return e && e.status !== "cancelled"; });
    const users = pool.userDocs || {};
    if (!entries.length) {
      return '<div class="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3">まだ参加者はいません。</div>';
    }
    const rooms = {};
    const loose = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.matchRoomId && entry.sendToUid) {
        if (!rooms[entry.matchRoomId]) rooms[entry.matchRoomId] = [];
        rooms[entry.matchRoomId].push(entry);
      } else {
        loose.push(entry);
      }
    }
    const roomIds = Object.keys(rooms);
    function personCard(entry, showArrow) {
      const profile = (users[entry.uid] && users[entry.uid].profile) || {};
      const name = profile.nickname || entry.userName || entry.displayName || "参加者";
      const late = agPurchaseLate(entry) || agShipLate(entry);
      const status = agStatusFull(entry);
      const want = entry.wantedMember || "-";
      const pulled = entry.pulledMember || entry.openedCard || "";
      const sendTo = entry.sendToName || "";
      return (
        (showArrow ? '<div class="flex justify-center py-0.5 text-purple-600 font-black text-lg leading-none" aria-hidden="true">↓ 発送</div>' : "") +
        '<button type="button" data-ag-act="person" data-pool-id="' + escapeAutoGoHtml(pool.id) + '" data-uid="' + escapeAutoGoHtml(entry.uid) + '" onclick="window.openAutoGoPerson(this.getAttribute(\'data-pool-id\'), this.getAttribute(\'data-uid\'))" class="w-full text-left rounded-2xl border px-3 py-3 min-h-[64px] ' + (late ? "ag-person-late border-red-400 bg-red-50" : "border-purple-100 bg-white") + '" style="position:relative;z-index:6;touch-action:manipulation;">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-11 h-11 rounded-full ' + (late ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-800") + ' flex items-center justify-center text-sm font-black shrink-0">' + escapeAutoGoHtml(String(name).slice(0, 1)) + '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<span class="text-[13px] font-black text-gray-900 truncate">' + escapeAutoGoHtml(name) + '</span>' +
                '<span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ' + (late ? "bg-red-600 text-white" : "bg-purple-100 text-purple-800") + '">' + escapeAutoGoHtml(status) + '</span>' +
              '</div>' +
              '<div class="mt-0.5 text-[11px] text-gray-600 truncate">希望: ' + escapeAutoGoHtml(want) + (pulled ? " · 開封: " + escapeAutoGoHtml(pulled) : "") + '</div>' +
              (sendTo ? '<div class="mt-0.5 text-[10px] text-purple-700 font-medium truncate">発送先 → ' + escapeAutoGoHtml(sendTo) + '</div>' : "") +
              (late ? '<div class="mt-0.5 text-[10px] font-bold text-red-700">期限超過</div>' : "") +
            '</div>' +
            '<span class="text-gray-300 text-lg shrink-0">›</span>' +
          '</div>' +
        '</button>'
      );
    }

    let html = '<div class="space-y-3 rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/70 to-white p-3">';
    html += '<div><div class="text-[12px] font-black text-gray-900">取引一覧（タップで詳細）</div>';
    html += '<p class="text-[10px] text-gray-500 mt-0.5">矢印は発送方向です。赤い枠は購入または発送の期限超過です。</p></div>';

    if (!roomIds.length) {
      html += '<p class="text-[11px] text-gray-500 bg-white/80 rounded-xl px-3 py-2 border border-gray-100">まだ発送先が決まったサイクルはありません。</p>';
    }
    for (let r = 0; r < roomIds.length; r++) {
      const ordered = agOrderCycle(rooms[roomIds[r]]);
      html += '<div class="rounded-2xl border border-white bg-white/95 shadow-sm overflow-hidden">';
      html += '<div class="px-3 py-2 text-[11px] font-black text-purple-800 bg-purple-50 border-b border-purple-100">サイクル ' + (r + 1) + ' · ' + ordered.length + '人</div>';
      html += '<div class="p-2 space-y-0">';
      for (let i = 0; i < ordered.length; i++) {
        html += personCard(ordered[i], i > 0);
      }
      if (ordered.length > 1 && ordered[ordered.length - 1].sendToUid === ordered[0].uid) {
        html += '<div class="text-center text-[10px] font-bold text-purple-600 py-1.5">↩ 先頭へ戻る（循環）</div>';
      }
      html += '</div></div>';
    }
    if (loose.length) {
      html += '<div class="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-2 space-y-2">';
      html += '<div class="text-[11px] font-black text-gray-700 px-1">未マッチング / 発送先未確定 · ' + loose.length + '人</div>';
      for (let i = 0; i < loose.length; i++) {
        html += personCard(loose[i], false);
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }
  window.openAutoGoPerson = function(poolId, uid) {
    const modal = document.getElementById("ag-person-modal");
    const body = document.getElementById("ag-person-body");
    if (!modal || !body) return;
    const cache = window.__agAdminCache && window.__agAdminCache[poolId];
    if (!cache) {
      body.innerHTML = "<p>参加者情報を読み込めませんでした。Auto-GOパネルを開き直してください。</p>";
      modal.classList.remove("hidden");
      modal.style.display = "flex";
      return;
    }
    let entry = null;
    for (let i = 0; i < cache.entries.length; i++) {
      if (cache.entries[i].uid === uid) entry = cache.entries[i];
    }
    if (!entry) {
      body.innerHTML = "<p>この参加者の記録が見つかりません。</p>";
      modal.classList.remove("hidden");
      modal.style.display = "flex";
      return;
    }
    const user = cache.users[uid] || {};
    const profile = user.profile || {};
    const name = profile.nickname || entry.userName || entry.displayName || "参加者";
    const photo = profile.photo || "";
    let face = '<div class="w-14 h-14 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xl font-black">' + escapeAutoGoHtml(String(name).slice(0, 1)) + "</div>";
    if (typeof photo === "string" && photo.indexOf("data:image") === 0) {
      face = '<img src="' + photo + '" alt="" class="w-14 h-14 rounded-full object-cover border">';
    }
    const addressLines = [];
    if (profile.name) addressLines.push("氏名: " + profile.name);
    if (profile.zip) addressLines.push("郵便番号: 〒" + profile.zip);
    if (profile.address1) addressLines.push("住所: " + profile.address1);
    if (profile.address2) addressLines.push(profile.address2);
    if (profile.phone) addressLines.push("電話: " + profile.phone);
    const addressHtml = addressLines.length
      ? addressLines.map(function(line) { return "<div>" + escapeAutoGoHtml(line) + "</div>"; }).join("")
      : "<p class=\"text-gray-500\">住所はまだ登録されていません。</p>";
    const shipLines = [];
    if (entry.shipToName) shipLines.push("宛名: " + entry.shipToName);
    if (entry.shipToZip) shipLines.push("郵便番号: 〒" + entry.shipToZip);
    if (entry.shipToAddress) shipLines.push("住所: " + entry.shipToAddress);
    if (entry.sendToName) shipLines.push("送り先の表示名: " + entry.sendToName);
    const shipHtml = shipLines.length
      ? shipLines.map(function(line) { return "<div>" + escapeAutoGoHtml(line) + "</div>"; }).join("")
      : "<p class=\"text-gray-500\">発送先はまだ決まっていません。</p>";
    const images = agImageList(entry);
    const latePurchase = agPurchaseLate(entry);
    const lateShip = agShipLate(entry);
    let warn = "";
    if (latePurchase) warn += '<div class="rounded-xl bg-red-50 border border-red-300 text-red-700 font-bold p-2">購入登録期限を過ぎています（期限 ' + escapeAutoGoHtml(agFormatTime(agPurchaseDeadline(entry))) + "）</div>";
    if (lateShip) warn += '<div class="rounded-xl bg-red-50 border border-red-300 text-red-700 font-bold p-2">発送期限を過ぎています（期限 ' + escapeAutoGoHtml(agFormatTime(agShipDeadline(entry))) + "）</div>";
    body.innerHTML = '<div class="flex items-center gap-3">' + face + '<div><div class="text-sm font-black">' + escapeAutoGoHtml(name) + "</div><div class=\"text-[11px] text-gray-500\">" + escapeAutoGoHtml(entry.status || "") + "</div></div></div>"
      + warn
      + '<div class="rounded-xl border border-gray-200 p-2 space-y-1"><div class="font-bold">希望と開封</div><div>第1希望: ' + escapeAutoGoHtml(entry.wantedMember || "未登録") + "</div><div>引いたメンバー: " + escapeAutoGoHtml(entry.pulledMember || entry.openedCard || "未登録") + "</div><div>発送相手: " + escapeAutoGoHtml(entry.sendToName || "未確定") + "</div><div>受取相手: " + escapeAutoGoHtml(entry.receiveFromName || "未確定") + "</div></div>"
      + '<div class="rounded-xl border border-gray-200 p-2 space-y-1"><div class="font-bold">購入登録</div><div>注文メモ: ' + escapeAutoGoHtml(entry.orderNote || "未登録") + "</div><div>購入報告: " + escapeAutoGoHtml(agFormatTime(entry.purchasedAt)) + "</div><div>購入期限: " + escapeAutoGoHtml(agFormatTime(agPurchaseDeadline(entry))) + "</div></div>"
      + agRenderImages("購入登録の写真", images.purchase)
      + '<div class="rounded-xl border border-gray-200 p-2 space-y-1"><div class="font-bold">発送登録</div><div>追跡番号: ' + escapeAutoGoHtml(entry.trackingNumber || "未登録") + "</div><div>発送報告: " + (entry.shippedDone || entry.shippedAt ? "済み " + escapeAutoGoHtml(agFormatTime(entry.shippedAt)) : "まだ") + "</div><div>発送期限: " + escapeAutoGoHtml(agFormatTime(agShipDeadline(entry))) + "</div></div>"
      + agRenderImages("発送の写真", images.shipping)
      + '<div class="rounded-xl border border-gray-200 p-2 space-y-1"><div class="font-bold">この人の住所</div>' + addressHtml + "</div>"
      + '<div class="rounded-xl border border-gray-200 p-2 space-y-1"><div class="font-bold">この人が送る宛先</div>' + shipHtml + "</div>";
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  };
  window.closeAutoGoPerson = function() {
    const modal = document.getElementById("ag-person-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.display = "none";
  };

  window.toggleAutoGoAdminForm = function() {
    const form = document.getElementById("ag-admin-form");
    if (form) form.classList.toggle("hidden");
  };

  // 画像を軽量リサイズ（Base64 JPEG）してFirestoreへ直接保存できるように変換
  function compressPoolImage(file) {
    return new Promise((resolve) => {
      if (!file) { resolve(""); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 720;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = () => resolve("");
        img.src = e.target.result;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  // 管理者による新規Auto-GOプール作成
  window.createNewAutoGoPool = async function() {
    const { db, auth, doc, setDoc, serverTimestamp } = window.__autoGoRefs;
    const user = auth.currentUser;
    if (!user) { alert("先にログインしてください"); return; }

    const title = document.getElementById("ag-new-title").value.trim();
    if (!title) { alert("タイトルを入力してください"); return; }

    const desc = document.getElementById("ag-new-desc").value.trim();
    const preset = document.getElementById("ag-new-preset").value;
    const purchaseUrl = document.getElementById("ag-new-url").value.trim() || "https://weverseshop.io/";
    const fileInput = document.getElementById("ag-new-photo");
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    const btn = document.getElementById("ag-create-btn");
    btn.disabled = true;
    btn.textContent = "作成中...";

    try {
      const imageUrl = await compressPoolImage(file);
      const members = preset === "5" ? PRESET_5 : PRESET_4;
      const initialCapPerMember = members.length === 5 ? 4 : (members.length === 4 ? 5 : Math.max(1, Math.ceil(20 / members.length)));
    const minP = initialCapPerMember * members.length;
    const targetParticipants = minP;
    const memberCaps = {};
    const memberCounts = {};
    members.forEach(m => { memberCaps[m] = initialCapPerMember; memberCounts[m] = 0; });

      const newId = "pool_" + Date.now();
      await setDoc(doc(db, "auto_go_pools", newId), {
        title,
        description: desc,
        imageUrl,
        purchaseUrl,
        members,
        memberCaps,
        memberCounts,
        minParticipants: minP,
        minThreshold: minP,
        targetParticipants,
        totalCount: 0,
        status: "recruiting",
        isTest: false,
        entryLocked: false,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      document.getElementById("ag-new-title").value = "";
      document.getElementById("ag-new-desc").value = "";
      if (fileInput) fileInput.value = "";
      document.getElementById("ag-admin-form").classList.add("hidden");

      await selectAutoGoPool(newId);
      const shareUrl = `${location.origin}/?pool=${newId}`;
      navigator.clipboard?.writeText(shareUrl);
      showToast("Auto-GOプールを公開しました！", "success");
    } catch (e) {
      alert("作成に失敗しました: " + (e.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = "この内容でプールを公開＆招待URL発行";
    }
  };

  
  // 運営ダッシュボード用 Auto-GO プール作成・一覧・削除パネル
      window.createAdminAutoGoPool = async function() {
        let btn = null;
        try {
          if (typeof window.__isAutoGoAdmin !== "function") throw new Error("管理者権限の確認を初期化できません");
          if (!window.__isAutoGoAdmin()) {
            showToast("管理者権限が必要です", "error");
            return;
          }

          const refs = window.__autoGoRefs;
          if (!refs?.db || !refs?.collection || !refs?.serverTimestamp || typeof window.addDoc !== "function") {
            throw new Error("Firestoreの初期化が完了していません");
          }
          btn = document.getElementById("adm-ag-submit-btn");
          if (btn) { btn.disabled = true; btn.textContent = "公開処理中..."; }

          const title = (document.getElementById("adm-ag-title")?.value || "").trim();
          const desc = (document.getElementById("adm-ag-desc")?.value || "").trim();
          const fileInput = document.getElementById("adm-ag-photo");
          if (!title) { showToast("タイトルを入力してください", "error"); return; }

          const minThreshold = Number(document.getElementById("adm-ag-min-threshold")?.value);
          const minCompletedTrades = Number(document.getElementById("adm-ag-min-completed-trades")?.value);
          if (!Number.isInteger(minThreshold) || minThreshold < 2 || minThreshold > 100) {
            showToast("最低成立人数は2〜100の整数で入力してください", "error");
            return;
          }
          if (!Number.isInteger(minCompletedTrades) || minCompletedTrades < 0) {
            showToast("参加に必要な完了評価数は0以上の整数で入力してください", "error");
            return;
          }

          const rawMembers = (document.getElementById("adm-ag-members")?.value || "").trim();
          const memberNames = Array.from(new Set(rawMembers.split(/[,、，\n\r]+/).map(name => name.trim()).filter(Boolean)));
          if (memberNames.length < 2) {
            showToast("メンバーは2名以上入力してください", "error");
            return;
          }

          const recruitEndRaw = (document.getElementById("adm-ag-recruit-end")?.value || "").trim();
          const recruitEndAt = recruitEndRaw ? new Date(recruitEndRaw).getTime() : 0;
          if (!recruitEndAt || recruitEndAt <= Date.now()) {
            showToast("募集終了日時は現在より後の日時を指定してください", "error");
            return;
          }
          const purchaseUrl = (document.getElementById("adm-ag-url")?.value || "").trim();
          if (!/^https:\/\//i.test(purchaseUrl)) {
            showToast("有効なアルバム購入URL（https://）を入力してください", "error");
            return;
          }
          const albumPriceRaw = document.getElementById("adm-ag-album-price")?.value;
          const albumPrice = albumPriceRaw === "" || albumPriceRaw == null ? 0 : Number(albumPriceRaw);
          if (Number.isNaN(albumPrice) || albumPrice < 0 || albumPrice > 100000) {
            showToast("アルバム金額は0〜100000の数字で入力してください", "error");
            return;
          }

          let imageUrl = "";
          if (fileInput?.files?.[0]) {
            const reader = new FileReader();
            imageUrl = await new Promise((resolve, reject) => {
              reader.onload = () => {
                const image = new Image();
                image.onload = () => {
                  const canvas = document.createElement("canvas");
                  const scale = Math.min(1, 720 / image.width);
                  canvas.width = image.width * scale;
                  canvas.height = image.height * scale;
                  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                image.onerror = reject;
                image.src = reader.result;
              };
              reader.onerror = reject;
              reader.readAsDataURL(fileInput.files[0]);
            });
          }

          const initialCapPerMember = Math.max(1, Math.ceil(20 / memberNames.length));
          const minParticipants = initialCapPerMember * memberNames.length;
          const memberCounts = {};
          const memberCaps = {};
          memberNames.forEach(member => {
            memberCounts[member] = 0;
            memberCaps[member] = initialCapPerMember;
          });
          const user = refs.auth?.currentUser || window.currentUser;
          if (!user?.uid) throw new Error("ログイン状態を確認できません");

          const isTestPool = !!(document.getElementById("adm-ag-is-test")?.checked);
          const finalTitle = isTestPool && !/^\[TEST\]/i.test(title) ? `[TEST] ${title}` : title;
          await window.addDoc(refs.collection(refs.db, "auto_go_pools"), {
            title: finalTitle,
            description: desc,
            purchaseUrl,
            albumPrice: albumPrice > 0 ? albumPrice : null,
            imageUrl,
            memberCountType: memberNames.length,
            memberNames,
            members: memberNames,
            memberCounts,
            memberCaps,
            minParticipants,
            minThreshold,
            minCompletedTrades,
            targetParticipants: minParticipants,
            recruitEndAt,
            slotPerMember: initialCapPerMember,
            totalCount: 0,
            status: "recruiting",
            isTest: isTestPool,
            testTag: isTestPool ? "[TEST]" : null,
            entryLocked: false,
            createdBy: user.uid,
            createdAt: refs.serverTimestamp()
          });

          showToast(isTestPool ? "テスト用 Auto-GO プールを作成しました（一般非表示）" : "Auto-GO プールを公開しました！", "success");
          await window.renderAdminAutoGoPanel();
        } catch (error) {
          console.error("createAdminAutoGoPool error:", error);
          const reason = error?.code || error?.message || String(error || "失敗しました");
          try {
            if (typeof window.showToast === "function") showToast("作成エラー: " + reason, "error");
          } catch (toastError) {
            console.error("createAdminAutoGoPool toast error:", toastError);
          }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = "＋ この内容で Auto-GO プールを公開する"; }
        }
      };

  window.renderAdminAutoGoPanel = async function(container) {
    if (!container) container = document.getElementById("admin-content");
    if (!container) return;
    const pools = [];
    let permWarn = "";
    try {
      const snap = await getDocs(collection(db, "auto_go_pools"));
      snap.forEach(d => pools.push({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("auto_go_pools read warn:", err);
      permWarn = `<div class="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-xl p-2.5">⚠️ Firestoreルールに auto_go_pools の許可を追加してください（現在のUID: ${window.currentUser?.uid || "未ログイン"}）（${err?.code || "error"}: ${err?.message || ""}）</div>`;
    }
    pools.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    await Promise.all(pools.map(async (pool) => {
      try {
        const entriesSnap = await getDocs(collection(db, "auto_go_pools", pool.id, "entries"));
        pool.entries = entriesSnap.docs.map(entry => ({ uid: entry.id, ...entry.data() }));
      } catch (error) {
        console.warn("Auto-GO participant list read warn:", pool.id, error);
        pool.entries = [];
      }
      pool.userDocs = {};
      const pending = pool.entries.slice(0, 80);
      for (let start = 0; start < pending.length; start += 10) {
        const slice = pending.slice(start, start + 10);
        await Promise.all(slice.map(async function(entry) {
          try {
            const [userSnap, shipSnap] = await Promise.all([
              getDoc(doc(db, "users", entry.uid)),
              getDoc(doc(db, "users", entry.uid, "private", "shipping"))
            ]);
            const data = userSnap.exists() ? userSnap.data() : {};
            const shipping = shipSnap.exists() ? (shipSnap.data() || {}) : {};
            // 管理画面表示用に非公開配送先を profile へ重ねる（公開ドキュメント自体は変更しない）
            const shipOverlay = {};
            ["name", "zip", "address1", "address2", "phone"].forEach((key) => {
              if (shipping[key] != null && String(shipping[key]).length) shipOverlay[key] = String(shipping[key]);
            });
            data.profile = { ...(data.profile || {}), ...shipOverlay };
            data._privateShipping = shipping;
            pool.userDocs[entry.uid] = data;
          } catch (error) {
            pool.userDocs[entry.uid] = {};
          }
        }));
      }
      if (!window.__agAdminCache) window.__agAdminCache = {};
      window.__agAdminCache[pool.id] = { entries: pool.entries, users: pool.userDocs, pool: pool };
    }));

    const poolRows = pools.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-6 bg-white/60 rounded-2xl border border-white">登録済みのAuto-GOプールはまだありません</p>'
      : pools.map(p => {
          const members = p.memberNames || p.members || [];
          const counts = p.memberCounts || {};
          const caps = p.memberCaps || {};
          const breakdown = members.map(m => `${m}: ${counts[m] || 0}/${caps[m] || p.slotPerMember || 0}`).join(" / ");
          const participants = (p.entries || []).map(entry => {
            const xId = getAutoGoXId(entry);
            const canRemove = !["unshipped_penalty", "cancelled"].includes(entry.status);
            const late = agPurchaseLate(entry) || agShipLate(entry);
            return `<div class="flex items-center justify-between gap-2 text-[10px] border-t border-gray-100 py-1 ${late ? "ag-person-late rounded-lg px-1" : ""}">
              <button type="button" data-ag-act="person" data-pool-id="${escapeAutoGoHtml(p.id)}" data-uid="${escapeAutoGoHtml(entry.uid)}" onclick="window.openAutoGoPerson(this.getAttribute('data-pool-id'), this.getAttribute('data-uid'))" class="truncate text-left font-bold ${late ? "text-red-700" : "text-gray-800"}" style="position:relative;z-index:6;touch-action:manipulation;">${escapeAutoGoHtml(entry.userName || "参加者")} · ${escapeAutoGoHtml(entry.wantedMember || "")} · ${escapeAutoGoHtml(entry.status || "")}${late ? " · 期限超過" : ""}</button>
                ${xId ? `<a href="https://x.com/${encodeURIComponent(xId)}" target="_blank" rel="noopener" class="ml-1 text-blue-600 underline">@${escapeAutoGoHtml(xId)}</a>` : ""}
              ${canRemove ? `<button type="button" data-pool="${escapeAutoGoHtml(p.id)}" data-uid="${escapeAutoGoHtml(entry.uid)}" onclick="window.adminRemoveAutoGoEntry(this.dataset.pool,this.dataset.uid)" class="shrink-0 text-red-600 underline">除外</button>` : ""}
            </div>`;
          }).join("");
          const isTest = p.isTest === true;
          const locked = p.entryLocked === true;
          return `
            <div class="bg-white/85 rounded-2xl p-3.5 border ${isTest ? "border-amber-300 ring-1 ring-amber-200" : "border-white"} shadow-sm space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100">` : '<div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-lg shrink-0">⚡</div>'}
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${isTest ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">[TEST]</span>' : ""}
                      ${locked ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">ENTRY LOCK</span>' : ""}
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'recruiting' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}">${p.status === 'recruiting' ? '募集中' : p.status}</span>
                      <span class="text-[11px] font-bold text-gray-500">${p.totalCount || 0} / ${p.targetParticipants || 20}人 · 成立${p.minThreshold || p.minParticipants || 20}</span>
                    </div>
                    <p class="text-sm font-black text-gray-900 truncate mt-0.5">${escapeAutoGoHtml(p.title || "無題プール")}</p>
                  </div>
                </div>
                ${p.status === "active" ? `<span class="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">✅ 成立済</span>` : `<span class="shrink-0 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">${p.status === "cancelled" || p.recruitmentClosedAt ? "募集終了" : "自動成立待ち"}</span>`}
              </div>
              <div class="flex flex-wrap gap-2">
                ${(p.status === "cancelled" || p.recruitmentClosedAt) ? `<button type="button" disabled class="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 min-h-[40px]">募集終了済み</button>` : `<button type="button" data-ag-act="close" data-pool-id="${escapeAutoGoHtml(p.id)}" onclick="window.closeAdminAutoGoRecruit(this.getAttribute('data-pool-id'))" class="text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-2 rounded-xl border border-amber-300 min-h-[40px]" style="position:relative;z-index:6;touch-action:manipulation;">募集終了</button>`}
                <button type="button" data-ag-act="delete" data-pool-id="${escapeAutoGoHtml(p.id)}" onclick="window.deleteAdminAutoGoPool(this.getAttribute('data-pool-id'))" class="text-[11px] font-bold text-white bg-red-500 px-3 py-2 rounded-xl min-h-[40px]" style="position:relative;z-index:6;touch-action:manipulation;">削除</button>
              </div>
              <p class="text-[11px] text-gray-600 line-clamp-2">${escapeAutoGoHtml(p.description || "")}</p>
              <div class="text-[10px] font-bold text-purple-700 bg-purple-50/80 px-2.5 py-1.5 rounded-xl">${breakdown}</div>
              ${agMatchDiagram(p)}
              <div class="rounded-xl border border-gray-100 px-2.5 py-1.5">
                <p class="text-[10px] font-bold text-gray-600">参加者 ${p.entries?.length || 0}人</p>
                ${participants || '<p class="text-[10px] text-gray-400 py-1">参加者はいません</p>'}
              </div>
              ${typeof window.__agAdminOpsHtml === "function" ? window.__agAdminOpsHtml(p) : ""}
            </div>
          `;
        }).join("");

    container.innerHTML = `
      <div class="space-y-4">
        ${permWarn}
        <button onclick="openAgGuide()" class="w-full py-3 rounded-2xl bg-red-500 text-white font-black text-sm shadow-sm min-h-[48px]">📖 仕組み（必ずお読みください）</button>

        <div class="bg-amber-50 rounded-2xl p-4 border-2 border-dashed border-amber-300 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-black text-amber-950">🧪 テストモード（ドライラン）</h3>
            <span class="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">一般非表示</span>
          </div>
          <p class="text-[11px] text-amber-900 leading-relaxed">ワンタップで [TEST] プールを作成し、ダミー投入で自動成立・割り当てを何度でも検証できます。本番データには影響しません。</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button type="button" onclick="window.createAdminAutoGoTestPool(5)" class="min-h-[48px] rounded-xl bg-amber-600 text-white text-[11px] font-black active:scale-[0.99]">テスト作成 5人</button>
            <button type="button" onclick="window.createAdminAutoGoTestPool(10)" class="min-h-[48px] rounded-xl bg-amber-600 text-white text-[11px] font-black">テスト作成 10人</button>
            <button type="button" onclick="window.createAdminAutoGoTestPool(15)" class="min-h-[48px] rounded-xl bg-amber-600 text-white text-[11px] font-black">テスト作成 15人</button>
            <button type="button" onclick="window.createAdminAutoGoTestPool(20)" class="min-h-[48px] rounded-xl bg-amber-700 text-white text-[11px] font-black">テスト作成 20人</button>
          </div>
        </div>

        <div class="bg-white/90 rounded-2xl p-4 border border-white shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-gray-900">⚡ 新規 Auto-GO プール作成</h3>
            <span class="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">管理者専用</span>
          </div>

          <label class="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
            <input id="adm-ag-is-test" type="checkbox" class="rounded accent-amber-600 w-5 h-5">
            <span class="text-[12px] font-bold text-amber-950">[TEST] テスト用として作成（一般一覧・通知に出さない）</span>
          </label>

          <div>
            <label class="block text-[11px] font-bold text-gray-700 mb-1">イベント・アルバムタイトル</label>
            <input id="adm-ag-title" type="text" placeholder="例: ILLIT 3rd Mini Album [bomb] 共同購入" class="w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-gray-700 mb-1">アルバム購入URL</label>
            <input id="adm-ag-url" type="url" required placeholder="https://..." class="w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <label class="block text-[11px] font-bold text-gray-700">アルバム金額の目安（円）
              <input id="adm-ag-album-price" type="number" min="0" max="100000" value="" placeholder="例: 3500" class="mt-1 w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900">
              <span class="text-[9px] text-gray-400 font-medium">予約確認時に「後で自身で購入」と表示</span>
            </label>
            <label class="block text-[11px] font-bold text-gray-700">最低成立人数
              <input id="adm-ag-min-threshold" type="number" min="2" max="100" value="20" class="mt-1 w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900">
            </label>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-700">参加に必要な完了評価数
              <input id="adm-ag-min-completed-trades" type="number" min="0" value="0" class="mt-1 w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900">
            </label>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-gray-700 mb-1">特典・商品サムネイル画像</label>
            <input id="adm-ag-photo" type="file" accept="image/*" class="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-gray-700 mb-1">募集要項・説明文</label>
            <textarea id="adm-ag-desc" rows="3" placeholder="例: Weverse Shop Global 予約特典トレカ共同購入です。20人到達で自動成立します。" class="w-full liquid-glass-input rounded-xl p-2.5 text-xs text-gray-900"></textarea>
          </div>

          <div>
                  <label class="block text-[11px] font-bold text-gray-700 mb-1">メンバー名（カンマ・読点・改行区切りで登録）</label>
                  <textarea id="adm-ag-members" rows="2" placeholder="例：ユナ, ミンジュ, モカ, ウォンヒ, イロハ" class="w-full liquid-glass-input px-3 py-2 text-xs">ユナ, ミンジュ, モカ, ウォンヒ, イロハ</textarea>
                  <p class="text-[10px] text-gray-400 mt-0.5">※ 入力した人数に合わせて自動的に枠数・メンバー選択肢が生成されます</p>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-700 mb-1">募集終了日時（締め切り）</label>
                  <input id="adm-ag-recruit-end" type="datetime-local" required class="w-full liquid-glass-input px-3 py-2 text-xs">
                  <p class="text-[10px] text-gray-400 mt-0.5">※ 指定日時を過ぎると自動的に新規参加の受付を終了します</p>
                </div>
                <button id="adm-ag-submit-btn" type="button" onclick="window.createAdminAutoGoPool()" class="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-xs py-3 rounded-xl shadow-md active:scale-[0.99] transition">
            ＋ この内容で Auto-GO プールを公開する
          </button>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-black text-gray-800 px-1">📋 公開中の Auto-GO プール一覧（${pools.length}件）</h4>
          ${poolRows}
        </div>
      </div>
    `;
  };

  window.deleteAdminAutoGoPool = async function(poolId) {
    if (typeof window.__isAutoGoAdmin !== "function" || window.__isAutoGoAdmin() !== true) {
      if (typeof showToast === "function") showToast("管理者だけが削除できます", "error");
      return;
    }
    let agreed = false;
    if (typeof window.appConfirm === "function") {
      agreed = await window.appConfirm("この Auto-GO プールを削除しますか？参加データも消えます。", "削除する", true);
    } else {
      agreed = window.confirm("この Auto-GO プールを削除しますか？参加データも消えます。");
    }
    if (!agreed) return;
    const refs = window.__autoGoRefs || {};
    const deleteFn = refs.deleteDoc || window.deleteDoc;
    const docFn = refs.doc || window.doc;
    const getDocsFn = refs.getDocs || window.getDocs;
    const collectionFn = refs.collection || window.collection;
    const database = refs.db || window.db;
    if (typeof deleteFn !== "function" || typeof docFn !== "function" || typeof getDocsFn !== "function" || typeof collectionFn !== "function" || !database) {
      if (typeof showToast === "function") showToast("削除機能の準備中です。数秒後にもう一度押してください", "error");
      return;
    }
    try {
      const entrySnap = await getDocsFn(collectionFn(database, "auto_go_pools", poolId, "entries"));
      for (let i = 0; i < entrySnap.docs.length; i++) {
        await deleteFn(entrySnap.docs[i].ref);
      }
      await deleteFn(docFn(database, "auto_go_pools", poolId));
      if (typeof showToast === "function") showToast("プールを削除しました", "info");
      await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      const message = error && error.message ? error.message : "失敗しました";
      if (typeof showToast === "function") showToast("削除エラー: " + message, "error");
    }
  };
  window.closeAdminAutoGoRecruit = async function(poolId) {
    if (typeof window.__isAutoGoAdmin !== "function" || window.__isAutoGoAdmin() !== true) {
      if (typeof showToast === "function") showToast("管理者だけが募集を終了できます", "error");
      return;
    }
    let agreed = false;
    if (typeof window.appConfirm === "function") {
      agreed = await window.appConfirm("このプールの新規募集を終了しますか？今いる参加者の購入・発送情報は残します。", "募集を終了する", true);
    } else {
      agreed = window.confirm("このプールの新規募集を終了しますか？今いる参加者の購入・発送情報は残します。");
    }
    if (!agreed) return;
    const refs = window.__autoGoRefs || {};
    if (!refs.db || typeof refs.doc !== "function" || typeof refs.updateDoc !== "function") {
      if (typeof showToast === "function") showToast("募集終了の準備中です。数秒後にもう一度押してください", "error");
      return;
    }
    try {
      await refs.updateDoc(refs.doc(refs.db, "auto_go_pools", poolId), {
        recruitmentClosedAt: refs.serverTimestamp ? refs.serverTimestamp() : new Date()
      });
      if (typeof showToast === "function") showToast("新規の募集を終了しました", "success");
      await window.renderAdminAutoGoPanel();
    } catch (error) {
      console.error(error);
      const message = error && error.message ? error.message : "失敗しました";
      if (typeof showToast === "function") showToast("募集終了に失敗しました: " + message, "error");
    }
  };
  window.__selectAutoGoPool = function(poolId) {
    if (typeof selectAutoGoPool === "function") {
      return selectAutoGoPool(poolId);
    }
  };
  window.__renderAutoGoCached = function() {
    if (currentPoolData) {
      try { renderAutoGoUI(); } catch (e) {}
      return true;
    }
    return false;
  };
  window.__loadAutoGoPools = initPoolsListListener;
  // ホーム表示中に先読みして、開いた瞬間すぐ出るようにする
  setTimeout(function() {
    try { initPoolsListListener({ prefetch: true }); } catch (e) {}
  }, 0);

  async function initPoolsListListener(opts) {
    const options = opts || {};
    const titleEl = document.getElementById("ag-pool-title");
    const descEl = document.getElementById("ag-pool-desc");
    const gridEl = document.getElementById("ag-member-grid");
    if (window.__pendingAutoGoPoolId) {
      activePoolId = window.__pendingAutoGoPoolId;
      window.__pendingAutoGoPoolId = "";
    }
    if (!window.__autoGoRefs) {
      if (!options.prefetch) {
        if (titleEl) titleEl.textContent = "Auto-GOを準備しています";
        if (descEl) descEl.textContent = "通信の準備が終わるまで自動で再試行します…";
      }
      // 準備完了まで短間隔でリトライ（ユーザーに「数秒後にもう一度」させない）
      if (!window.__agPoolsRetryTimer) {
        let tries = 0;
        window.__agPoolsRetryTimer = setInterval(function() {
          tries += 1;
          if (window.__autoGoRefs || tries > 50) {
            clearInterval(window.__agPoolsRetryTimer);
            window.__agPoolsRetryTimer = null;
            if (window.__autoGoRefs) initPoolsListListener(options);
          }
        }, 120);
      }
      return;
    }
    const refs = window.__autoGoRefs;
    if (!refs.db || typeof refs.collection !== "function" || typeof refs.query !== "function" || typeof refs.orderBy !== "function" || typeof refs.limit !== "function" || typeof refs.onSnapshot !== "function") {
      if (titleEl) titleEl.textContent = "Auto-GOを開けませんでした";
      if (descEl) descEl.textContent = "必要な機能が読み込まれていません。ページを再読み込みしてください。";
      if (typeof showToast === "function") {
        showToast("Auto-GOの機能を読み込めませんでした。ページを再読み込みしてください", "error");
      }
      return;
    }

    // すでに購読中なら、必要なら対象プールだけ切替して終了（毎回張り直ししない）
    if (poolsListenerReady && unsubPoolsList && !options.force) {
      if (allPools.length && currentPoolData) {
        renderPoolTabs();
        renderAutoGoUI();
      }
      const wantId = activePoolId || (allPools[0] && allPools[0].id) || "";
      if (wantId && wantId !== subscribedPoolId) {
        await selectAutoGoPool(wantId);
      }
      return;
    }

    if (unsubPoolsList) {
      unsubPoolsList();
      unsubPoolsList = null;
      poolsListenerReady = false;
    }

    // limit を多めに取り、[TEST] をクライアント除外しても本番プールが埋もれないようにする
    const poolsQuery = refs.query(refs.collection(refs.db, "auto_go_pools"), refs.orderBy("createdAt", "desc"), refs.limit(50));

    // 先に getDocs で一発描画 → その後 onSnapshot で追従（初回待ちを短縮）
    try {
      const firstSnap = await refs.getDocs(poolsQuery);
      allPools = firstSnap.docs.map(function(poolDoc) {
        const row = poolDoc.data();
        row.id = poolDoc.id;
        return row;
      }).filter(function(row) {
        // [TEST] プールは管理者以外の一覧に出さない
        if (row.isTest === true) {
          return typeof window.__isAutoGoAdmin === "function" && window.__isAutoGoAdmin() === true;
        }
        return true;
      });
      renderPoolTabs();
      if (typeof window.__renderAutoGoHomeHero === "function") {
        try { window.__renderAutoGoHomeHero(allPools); } catch (heroErr) { console.warn(heroErr); }
      }
      const stillVisible = allPools.some(function(p) { return p.id === activePoolId; });
      if (!activePoolId || !stillVisible) {
        if (allPools.length > 0) await selectAutoGoPool(allPools[0].id);
        else {
          if (titleEl) titleEl.textContent = "まだ開催中のプールがありません";
          if (descEl) descEl.textContent = "管理者が公開すると、ここに参加できます。";
          if (gridEl) gridEl.innerHTML = "";
        }
      } else {
        await selectAutoGoPool(activePoolId);
      }
    } catch (bootErr) {
      console.warn("Auto-GO pools getDocs:", bootErr);
    }

    unsubPoolsList = refs.onSnapshot(poolsQuery, async function(snap) {
      allPools = snap.docs.map(function(poolDoc) {
        const row = poolDoc.data();
        row.id = poolDoc.id;
        return row;
      }).filter(function(row) {
        if (row.isTest === true) {
          return typeof window.__isAutoGoAdmin === "function" && window.__isAutoGoAdmin() === true;
        }
        return true;
      });
      poolsListenerReady = true;
      renderPoolTabs();
      if (typeof window.__renderAutoGoHomeHero === "function") {
        try { window.__renderAutoGoHomeHero(allPools); } catch (heroErr) { console.warn(heroErr); }
      }
      const stillVisible = allPools.some(function(pool) { return pool.id === activePoolId; });
      if (!activePoolId || (!stillVisible && allPools.length > 0)) {
        if (allPools.length > 0) {
          // 未選択時だけ切替。毎回 select し直さない
          if (subscribedPoolId !== allPools[0].id) await selectAutoGoPool(allPools[0].id);
        } else {
          if (titleEl) titleEl.textContent = "まだ開催中のプールがありません";
          if (descEl) descEl.textContent = "管理者が公開すると、ここに参加できます。";
          if (gridEl) gridEl.innerHTML = "";
        }
      } else if (activePoolId && subscribedPoolId !== activePoolId) {
        await selectAutoGoPool(activePoolId);
      } else if (activePoolId && currentPoolData) {
        // 一覧の人数表示だけ更新
        renderPoolTabs();
      }
    }, function(error) {
      console.error(error);
      const message = error && error.message ? error.message : "取得に失敗しました";
      if (titleEl) titleEl.textContent = "プールを読み込めませんでした";
      if (descEl) descEl.textContent = message;
      if (typeof showToast === "function") {
        showToast("Auto-GOの一覧を取得できませんでした: " + message, "error");
      }
    });
  }

  function renderPoolTabs() {
    const tabsEl = document.getElementById("ag-pool-tabs");
    if (!tabsEl) return;
    if (!allPools.length) {
      tabsEl.innerHTML = "";
      return;
    }
    tabsEl.innerHTML = allPools.map(p => {
      const isSelected = p.id === activePoolId;
      const testBadge = p.isTest === true ? "[TEST] " : "";
      return `<button onclick="selectAutoGoPool('${p.id}')" class="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : (p.isTest ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50')}">
        ${testBadge}${escapeAutoGoHtml(p.title)} (${p.totalCount || 0}/${p.targetParticipants || 20})
      </button>`;
    }).join("");
  }

  window.selectAutoGoPool = async function(poolId) {
    if (!poolId || !window.__autoGoRefs) return;
    // 同じプールを再購読し直すと購入報告画面が一瞬消えて待ちが発生するためスキップ
    if (poolId === subscribedPoolId && currentPoolData && (unsubPool || unsubEntry)) {
      activePoolId = poolId;
      window.__agActivePoolId = poolId;
      renderPoolTabs();
      renderAutoGoUI();
      return;
    }

    const seq = ++selectPoolSeq;
    activePoolId = poolId;
    window.__agActivePoolId = poolId;
    renderPoolTabs();

    const refs = window.__autoGoRefs;
    const { db, auth, doc, getDoc, onSnapshot, collection } = refs;
    const user = auth.currentUser;

    if (unsubPool) { unsubPool(); unsubPool = null; }
    if (unsubEntry) { unsubEntry(); unsubEntry = null; }
    if (unsubEntries) { unsubEntries(); unsubEntries = null; }
    // 切替中だけクリア（同プール再入時は上で return 済み）
    currentPoolData = null;
    currentEntryData = null;
    window.__agCurrentEntryData = null;
    currentEntries = [];
    subscribedPoolId = poolId;

    // getDoc で即描画 → onSnapshot で追従
    try {
      const reads = [getDoc(doc(db, "auto_go_pools", poolId))];
      if (user) reads.push(getDoc(doc(db, "auto_go_pools", poolId, "entries", user.uid)));
      const snaps = await Promise.all(reads);
      if (seq !== selectPoolSeq || activePoolId !== poolId) return;
      if (snaps[0].exists()) {
        currentPoolData = snaps[0].data();
      }
      if (user && snaps[1]) {
        currentEntryData = snaps[1].exists() ? snaps[1].data() : null;
        window.__agCurrentEntryData = currentEntryData;
      }
      if (currentPoolData) renderAutoGoUI();
    } catch (e) {
      console.warn("Auto-GO select getDoc:", e);
    }

    unsubPool = onSnapshot(doc(db, "auto_go_pools", poolId), (snap) => {
      if (activePoolId !== poolId) return;
      if (!snap.exists()) return;
      currentPoolData = snap.data();
      renderAutoGoUI();
    });

    if (user) {
      unsubEntry = onSnapshot(doc(db, "auto_go_pools", poolId, "entries", user.uid), (snap) => {
        if (activePoolId !== poolId) return;
        currentEntryData = snap.exists() ? snap.data() : null;
        window.__agCurrentEntryData = currentEntryData;
        renderAutoGoUI();
      });
    }

    // 通常の企画画面には参加者一覧を出さない（管理者向けも管理パネルのみ）
    currentEntries = [];
  };

  function renderAutoGoParticipants() {
    // 通常企画UIからは参加者を載せない
    const list = document.getElementById("ag-participant-list");
    if (list) {
      list.innerHTML = "";
      list.classList.add("hidden");
    }
  }

  function renderAutoGoUI() {
    if (!currentPoolData) return;
    window.__agActivePoolId = activePoolId;
    window.__agCurrentEntryData = currentEntryData;
    const total = currentPoolData.totalCount || 0;
    const minP = currentPoolData.minThreshold || currentPoolData.minParticipants || 20;
    const targetP = currentPoolData.targetParticipants || 20;
    const pct = Math.min(100, Math.round((total / targetP) * 100));
    const recruitEndMs = currentPoolData.recruitEndAt?.toMillis
      ? currentPoolData.recruitEndAt.toMillis()
      : Number(currentPoolData.recruitEndAt);
    const recruitmentClosed = currentPoolData.status === "cancelled" || !!currentPoolData.recruitmentClosedAt ||
      (recruitEndMs > 0 && Date.now() >= recruitEndMs);
    const memberCnt = Math.max(1, getActiveMembers().length);
    const probability = agFirstChoicePercent(total, memberCnt);
    const prob = probability.toFixed(1) + "%（参考値）";

  const rawTitle = (currentPoolData.title || "Auto-GO").replace(/全体プール/g, "").trim();
  document.getElementById("ag-pool-title").textContent = rawTitle || "Auto-GO";
  document.getElementById("ag-pool-desc").textContent = currentPoolData.description || "";
  const imgEl = document.getElementById("ag-pool-image");
  const imgWrap = document.getElementById("ag-pool-image-wrap");
  if (currentPoolData.imageUrl) {
    imgEl.src = currentPoolData.imageUrl;
    imgEl.alt = (currentPoolData.title || "Auto-GO") + " アルバム";
    if (imgWrap) imgWrap.classList.remove("hidden");
    else imgEl.classList.remove("hidden");
  } else {
    imgEl.removeAttribute("src");
    if (imgWrap) imgWrap.classList.add("hidden");
    else imgEl.classList.add("hidden");
  }

  document.getElementById("ag-total-count").textContent = total;
    document.getElementById("ag-target-count").textContent = targetP;
    document.getElementById("ag-min-count").textContent = minP;
    document.getElementById("ag-progress-bar").style.width = pct + "%";
    document.getElementById("ag-prob-text").textContent = prob;
    document.getElementById("ag-prob-text").title = "20人で82.5%、50人で88%となるよう補間した参考値です。獲得を保証するものではありません。";
    const agProbNote = document.querySelector("#ag-prob-svg + p");
    if (agProbNote) {
      agProbNote.innerHTML = "縦軸は確率（%）、横軸は参加人数です。緑の帯は" + minP + "人以降の<strong class=\"font-bold text-emerald-700\">ここから企画成立</strong>ゾーン。紫の点線がいまの人数。20人で82.5%、50人で88%の参考値で、獲得を保証するものではありません。";
    }
    drawFirstChoiceChart(total, memberCnt, targetP, minP);
    // 参加者一覧は通常企画画面に出さない
    renderAutoGoParticipants();

    const badge = document.getElementById("ag-status-badge");
    const isTestPool = currentPoolData.isTest === true;
    const entryLocked = currentPoolData.entryLocked === true;
    const isAdminViewer = typeof window.__isAutoGoAdmin === "function" && window.__isAutoGoAdmin() === true;
    if (currentPoolData.status === "cancelled") {
      badge.textContent = "募集終了";
      badge.className = "font-medium text-gray-700 lg-badge";
    } else if (entryLocked) {
      badge.textContent = "エントリー停止中";
      badge.className = "font-medium text-rose-700 lg-badge";
    } else if (isTestPool) {
      badge.textContent = "[TEST]";
      badge.className = "font-medium text-amber-800 lg-badge";
    } else if (total >= targetP) {
      badge.textContent = "満員";
      badge.className = "font-medium text-gray-700 lg-badge";
    } else if (total >= minP) {
      badge.textContent = "開催確定";
      badge.className = "font-medium text-gray-700 lg-badge";
    } else {
      badge.textContent = "募集中";
      badge.className = "font-medium text-gray-700 lg-badge";
    }
    if (isTestPool) {
      const tEl = document.getElementById("ag-pool-title");
      if (tEl && !/^\[TEST\]/i.test(tEl.textContent || "")) {
        tEl.textContent = "[TEST] " + (tEl.textContent || "Auto-GO");
      }
    }

    const statusBox = document.getElementById("ag-my-status-box");
    const entrySec = document.getElementById("ag-entry-section");

    // テストプールは管理者以外参加不可。緊急ロック中も新規エントリー不可。
    if (!currentEntryData && ((isTestPool && !isAdminViewer) || entryLocked)) {
      entrySec.classList.add("hidden");
      statusBox.classList.remove("hidden");
      statusBox.innerHTML = entryLocked
        ? `<p class="text-sm text-rose-700 font-bold">運営により新規エントリーが一時停止されています。</p>`
        : `<p class="text-sm text-amber-800 font-bold">このプールは管理者専用のテスト環境です。</p>`;
      const gridLocked = document.getElementById("ag-member-grid");
      if (gridLocked) gridLocked.innerHTML = "";
      return;
    }

    if (currentEntryData) {
      entrySec.classList.add("hidden");
      statusBox.classList.remove("hidden");
        const isActivated = currentPoolData.status === "active";
      let html = `<p class="text-sm text-gray-700">希望メンバー：${currentEntryData.wantedMember}</p>`;

      if (currentEntryData.status === "cancelled") {
        html += `<p class="text-sm text-gray-700">予約はキャンセル済み${currentEntryData.penalty ? "（ペナルティ記録済み）" : ""}</p>`;
      } else if (currentEntryData.status === "unshipped_penalty") {
        html += `<p class="text-sm text-red-700">発送期限切れによりAuto-GOへの参加が停止されています。</p>`;
      } else if (!isActivated && currentEntryData.status === "reserved") {
        html += `<p class="text-sm text-gray-700">仮予約済み</p><button onclick="cancelAutoGoEntry()" class="w-full border border-gray-300 bg-white py-2 text-sm text-gray-900">仮予約をキャンセル</button>`;
      } else if (currentEntryData.status === "waitlist") {
          html += `<p class="text-sm text-gray-700">キャンセル待ち · ${currentEntryData.slotOrder || "-"}番目</p>`;
        } else if (currentEntryData.status === "reserved") {
          html += `<p class="text-sm text-gray-700">開催成立待ち</p>`;
        } else if (currentEntryData.status === "confirmed") {
        html += `<div class="space-y-2">
          <p class="text-sm text-gray-700">専用購入URLが発行されました</p>
          <div id="ag-purchase-deadline-box" class="py-2 text-center">
                <p class="text-xs text-gray-600">購入期限</p>
                <p id="ag-purchase-countdown" class="text-sm font-black text-rose-600 tracking-wider mt-0.5">計算中...</p>
              </div>
              <div id="ag-purchase-active-actions" class="space-y-3">
                <a href="${currentPoolData.purchaseUrl || '#'}" target="_blank" rel="noopener" class="block border border-gray-300 text-center text-sm text-gray-900 py-2.5 rounded-xl font-bold">公式ショップで購入</a>
                <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-950 space-y-1 leading-relaxed">
                  <p class="font-black text-amber-900">購入証明に必要なもの</p>
                  <p>・購入日時が画面に写っていること</p>
                  <p>・アルバム名（商品名）が確認できること</p>
                  <p>・注文完了／購入履歴など、自分の注文だと分かる画面</p>
                </div>
                <div class="space-y-1.5">
                  <p class="text-sm font-bold text-gray-800">購入証明の画像</p>
                  <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center justify-center min-h-[44px] rounded-xl border border-gray-300 bg-white text-[12px] font-bold text-gray-800 active:scale-[0.99]">
                      📁 アルバムから選ぶ
                      <input id="ag-purchase-proof" type="file" accept="image/*" onchange="previewAutoGoPurchaseProof(this)" class="hidden">
                    </label>
                    <label class="flex items-center justify-center min-h-[44px] rounded-xl border border-purple-200 bg-purple-50 text-[12px] font-bold text-purple-800 active:scale-[0.99]">
                      📷 写真を撮る
                      <input id="ag-purchase-proof-camera" type="file" accept="image/*" capture="environment" onchange="previewAutoGoPurchaseProof(this)" class="hidden">
                    </label>
                  </div>
                  <p class="text-[10px] text-gray-500">スクショは「アルバムから選ぶ」がおすすめです</p>
                </div>
                <div id="ag-purchase-proof-preview-wrap" class="${window.__agPurchaseProofPreview ? "" : "hidden"} rounded-2xl border border-pink-100 bg-gray-50 overflow-hidden">
                  <img id="ag-purchase-proof-preview" src="${window.__agPurchaseProofPreview || ""}" alt="購入証明プレビュー" class="w-full max-h-[70vh] object-contain bg-black/5">
                  <p class="text-[10px] text-center text-gray-500 py-1.5">選択中の写真プレビュー</p>
                </div>
                <label class="block text-[12px] text-gray-700">注文番号（任意）
                  <input id="ag-purchase-order-note" type="text" maxlength="120" placeholder="例: 注文番号・受付番号" value="${escapeAutoGoHtml(window.__agPurchaseOrderNote || "")}" oninput="window.__agPurchaseOrderNote=this.value" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900">
                </label>
                <button type="button" onclick="markAutoGoPurchased()" class="w-full min-h-[48px] rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-black shadow-md active:scale-[0.99]">購入を報告</button>
              </div>
              <div id="ag-purchase-expired-msg" class="hidden py-2 text-center">
                <p class="text-sm text-gray-700">購入期限切れ</p>
              </div>
        </div>`;
      } else if (currentEntryData.status === "purchased") {
        html += `<div class="space-y-2">
          <p class="text-sm text-gray-700">アルバム到着を報告してください</p>
          <button onclick="markAutoGoAlbumArrived()" class="w-full border border-gray-300 text-sm text-gray-900 py-2">到着を報告</button>
          <button onclick="reportAutoGoDelay()" class="w-full text-sm text-gray-600 py-2">遅延を報告</button>
        </div>`;
      } else if (currentEntryData.status === "arrived") {
        html += `<div class="space-y-2">
          <p class="text-sm text-gray-700">開封結果を登録してください</p>
          <select id="ag-pulled-select" class="w-full border border-gray-300 rounded-lg p-2 text-xs">
            <option value="">実際に引いたメンバーを選択...</option>
            ${getActiveMembers().map(m => `<option value="${m}">${m}</option>`).join("")}
          </select>
          <button onclick="submitAutoGoReveal()" class="w-full border border-gray-300 text-sm text-gray-900 py-2">開封結果を登録</button>
          <button onclick="reportAutoGoDelay()" class="w-full text-sm text-gray-600 py-2">遅延を報告</button>
        </div>`;
      } else if (currentEntryData.status === "delayed") {
        html += `<p class="text-sm text-gray-700">遅延を報告済み</p>`;
      } else if (currentEntryData.status === "self_pulled") {
        html += `<p class="text-sm text-gray-700">開封結果を登録済み（自引き）</p>`;
      } else if (currentEntryData.status === "waiting_match") {
        html += `<p class="text-sm text-gray-700">開封結果を登録済み · マッチング待ち</p>`;
      } else if (currentEntryData.status === "matched") {
        // 取引進捗ステップ判定（1:申込済, 2:開封登録済, 3:発送指令済, 4:発送/受取完了）
          const stageText = currentEntryData.receivedDone ? "取引完了"
            : currentEntryData.shippedDone ? "発送済み・受取報告待ち"
            : currentEntryData.shipToAddress ? "発送してください"
            : currentEntryData.noMatchResult ? "マッチング対象外"
            : currentEntryData.openedCard ? "開封結果登録済み"
            : "開封結果を登録してください";
          html += `<p class="text-sm text-gray-700">${stageText}</p>`;
          if (!currentEntryData.noMatchResult) {
            html += currentEntryData.shippedAt
              ? `<p class="text-sm text-gray-700">受取元：${escapeAutoGoHtml(currentEntryData.receiveFromName || "参加者")} · ${escapeAutoGoHtml(currentEntryData.receivingCard || "トレカ")}</p>`
              : `<p class="text-xs text-gray-500">※あなたの発送伝票を登録すると表示されます</p>`;
          }
          const receiveTrackingNumber = String(
            currentEntryData.incomingTrackingNumber || ""
          ).replace(/\D/g, "");
          if (currentEntryData.shippedAt && receiveTrackingNumber.length >= 10) {
            html += `<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-gray-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-gray-100">
              <div class="mb-1 font-bold">相手の追跡番号：${escapeAutoGoHtml(receiveTrackingNumber)}</div>
              <a href="https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${encodeURIComponent(receiveTrackingNumber)}&locale=ja" target="_blank" rel="noopener" class="inline-block rounded-lg bg-blue-700 px-3 py-2 font-bold text-white">📦 追跡状況を確認する（日本郵便）</a>
            </div>`;
          }

          if (currentEntryData.shipToAddress) {
            html += `<div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-900">発送先</span>
              </div>
              <div class="border border-gray-200 p-2.5 text-xs text-gray-800 space-y-0.5 select-all">
                <div class="font-bold text-gray-900">${escapeAutoGoHtml(currentEntryData.shipToName || "受取人")} 様</div>
                <div class="text-[11px] text-gray-600">〒${escapeAutoGoHtml(currentEntryData.shipToZip)}</div>
                <div class="text-[11px] font-medium">${escapeAutoGoHtml(currentEntryData.shipToAddress)}</div>
              </div>
              <button type="button" onclick="copyAutoGoDestination()" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900">📋 宛先をコピー</button>
              <div class="grid grid-cols-2 gap-1.5 pt-1">
                ${currentEntryData.shippedDone
                  ? `<div class="text-center text-[11px] text-gray-600 py-2">発送完了</div>`
                  : `<div class="col-span-2 space-y-1"><label class="block text-[10px] text-gray-700">追跡番号（必須・ハイフンなし半角数字）
                      <input id="ag-shipping-tracking" type="text" inputmode="numeric" pattern="[0-9]{10,}" minlength="10" maxlength="30" required autocomplete="off" placeholder="例: 12345678901" class="block w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900">
                    </label>                    <div class="space-y-1">
                      <p class="text-[10px] font-bold text-gray-700">発送写真</p>
                      <div class="grid grid-cols-2 gap-1.5">
                        <label class="flex items-center justify-center min-h-[40px] rounded-lg border border-gray-300 bg-white text-[11px] font-bold text-gray-800">
                          📁 アルバム
                          <input id="ag-shipping-proof" type="file" accept="image/*" class="hidden">
                        </label>
                        <label class="flex items-center justify-center min-h-[40px] rounded-lg border border-purple-200 bg-purple-50 text-[11px] font-bold text-purple-800">
                          📷 撮影
                          <input id="ag-shipping-proof-camera" type="file" accept="image/*" capture="environment" class="hidden">
                        </label>
                      </div>
                    </div><button type="button" onclick="markAutoGoShipped()" class="w-full border border-gray-300 text-gray-900 text-[11px] font-medium py-2">写真を登録して発送完了</button></div>`
                }
                ${currentEntryData.receivedDone
                  ? `<div class="text-center text-[11px] text-gray-600 py-2">受取完了</div>`
                  : `<button type="button" onclick="markAutoGoReceived()" class="${currentEntryData.shippedDone ? "" : "hidden"} border border-gray-300 text-gray-900 text-[11px] font-medium py-2">受取を報告</button>`
                }
              </div>
            </div>`;
          } else if (currentEntryData.noMatchResult) {
            html += `<p class="text-sm text-gray-700">割り当て対象外：${currentEntryData.openedCard || "トレカ"}</p>`;
          } else {
            const membersOpt = (typeof getActiveMembers === "function" ? getActiveMembers() : ["ミンジュ","ウォンヒ","モカ","イロハ","ユナ"])
              .map(m => `<option value="${m}" ${currentEntryData.openedCard === m ? "selected" : ""}>${m}</option>`).join("");
            html += `<div class="space-y-2">
              <div class="flex gap-1.5">
                <select id="ag-opened-select" class="flex-1 text-xs border border-gray-300 px-2 py-1.5 bg-white">
                  <option value="">出たメンバーを選択...</option>
                  ${membersOpt}
                </select>
                <button type="button" onclick="saveAutoGoOpenedCard()" class="border border-gray-300 text-gray-900 text-xs px-3 py-1.5 whitespace-nowrap">登録</button>
              </div>
              ${currentEntryData.openedCard ? `<div class="text-[10px] text-gray-600">登録済み：${currentEntryData.openedCard}</div>` : ""}
            </div>`;
          }
      }
      statusBox.innerHTML = html;
    } else {
      statusBox.classList.add("hidden");
      entrySec.classList.remove("hidden");
    }

    const grid = document.getElementById("ag-member-grid");
    const caps = currentPoolData.memberCaps || {};
    const counts = currentPoolData.memberCounts || {};
    const rulesAgreed = document.getElementById("ag-rules-consent")?.checked === true;
    const shipAgreed = document.getElementById("ag-auto-ship-consent")?.checked === true;
    const consentsOk = rulesAgreed && shipAgreed;
    const albumPrice = Number(currentPoolData.albumPrice || currentPoolData.purchasePrice || 0);
    const priceHint = albumPrice > 0
      ? `成立後に各自購入 · 目安 ¥${albumPrice.toLocaleString()}`
      : "成立後に各自でショップ購入";
    grid.innerHTML = getActiveMembers().map(m => {
      const cap = caps[m] ?? Math.max(1, Math.ceil((currentPoolData.targetParticipants || 20) / Math.max(1, getActiveMembers().length)));
      const cnt = counts[m] ?? 0;
      const rem = Math.max(0, cap - cnt);
      const isFull = rem === 0;
      const unavailable = isFull || recruitmentClosed || entryLocked || (isTestPool && !isAdminViewer);
      // 同意未チェックでもボタンは押せる（クリック時に同意へ誘導）。満枠・受付終了のみ disabled。
      const pct = cap > 0 ? Math.min(100, Math.round((cnt / cap) * 100)) : 0;
      const safeName = String(m).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      return `<div class="rounded-2xl border ${unavailable ? "border-gray-200 bg-gray-50" : "border-pink-100 bg-white"} p-3 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[15px] font-black text-gray-900 truncate">${escapeAutoGoHtml(m)}</p>
            <p class="text-[11px] text-gray-500 mt-0.5">残り <span class="font-bold text-gray-800">${rem}</span> / ${cap} 枠 · ${escapeAutoGoHtml(priceHint)}</p>
          </div>
          <button type="button" onclick="reserveAutoGoMember('${safeName}')" data-unavailable="${unavailable}" ${unavailable ? "disabled" : ""}
            class="shrink-0 min-h-[44px] px-4 py-2.5 rounded-full text-[13px] font-black transition touch-manipulation ${
              unavailable
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md active:scale-[0.98]"
            }" style="position:relative;z-index:6;touch-action:manipulation;">
            ${isFull ? "満枠" : (recruitmentClosed ? "受付終了" : "このメンバーで予約")}
          </button>
        </div>
        <div class="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-full rounded-full ${isFull ? "bg-gray-400" : "bg-pink-400"}" style="width:${pct}%"></div>
        </div>
        ${!unavailable ? `<p data-ag-need-consent class="text-[10px] text-amber-700 mt-1.5 font-medium ${consentsOk ? "hidden" : ""}">上の同意チェックを両方入れると予約できます</p>` : ""}
      </div>`;
    }).join("");
  }

  window.focusAutoGoConsent = function(message) {
    const box = document.getElementById("ag-consent-box");
    if (box) {
      box.classList.add("ring-2", "ring-rose-400", "ring-offset-2");
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => box.classList.remove("ring-2", "ring-rose-400", "ring-offset-2"), 2200);
    }
    if (message) {
      if (typeof showToast === "function") showToast(message, "error");
      else alert(message);
    }
  };

  window.toggleAutoGoRulesConsent = function() {
    const rulesAgreed = document.getElementById("ag-rules-consent")?.checked === true;
    const shipAgreed = document.getElementById("ag-auto-ship-consent")?.checked === true;
    const consentsOk = rulesAgreed && shipAgreed;
    document.querySelectorAll("#ag-member-grid [data-ag-need-consent]").forEach(hint => {
      hint.classList.toggle("hidden", consentsOk);
    });
  };

  window.reserveAutoGoMember = async function(memberName) {
    const rulesOk = document.getElementById("ag-rules-consent")?.checked === true;
    const shipOk = document.getElementById("ag-auto-ship-consent")?.checked === true;
    if (!rulesOk || !shipOk) {
      window.focusAutoGoConsent(
        !shipOk && !rulesOk
          ? "先に上の同意チェックを2つ入れてください"
          : (!shipOk ? "発送同意のチェックを入れてください" : "仕組み・ルール同意のチェックを入れてください")
      );
      return;
    }
    if (!activePoolId) return;
    // サイト利用規約の「同意して利用する」ボタン必須（その後アプリ登録案内）
    if (typeof window.requireTermsAgreement === "function" &&
        !window.requireTermsAgreement({
          resume: function() { window.reserveAutoGoMember(memberName); }
        })) {
      return;
    }
    const refs = window.__autoGoRefs;
    const user = refs.auth.currentUser;
    if (!user) {
      // 未ログイン：参加意思を保存してログインへ。完了後に同じプール詳細へ戻す
      if (typeof window.__agRememberPoolForLogin === "function") {
        window.__agRememberPoolForLogin(activePoolId);
      }
      if (typeof showToast === "function") {
        showToast("参加にはログインが必要です。ログイン後、このプールに戻ります", "info");
      }
      if (typeof window.loginWithGoogle === "function") {
        window.loginWithGoogle();
      } else {
        alert("先にログインしてください");
      }
      return;
    }
    try {
      const userSnap = await refs.getDoc(refs.doc(refs.db, "users", user.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      if (userData.autoGoBanned === true) {
        showToast("このアカウントはAuto-GOに参加できません", "error");
        return;
      }
      const profile = userData.profile || {};
      let shipping = {};
      try {
        const shipSnap = await refs.getDoc(refs.doc(refs.db, "users", user.uid, "private", "shipping"));
        shipping = shipSnap.exists() ? (shipSnap.data() || {}) : {};
      } catch (e) {
        console.warn("Auto-GO private shipping:", e?.code || e);
      }
      const shipName = String(shipping.name || profile.name || "").trim();
      const shipZip = String(shipping.zip || profile.zip || "").trim();
      const shipAddr = String(shipping.address1 || profile.address1 || "").trim();
      if (!shipName || !shipZip || !shipAddr || !getAutoGoXId(profile)) {
        showToast("Auto-GOへの参加には配送先住所とXアカウントの登録が必要です", "error");
        window.closeAutoGoModal?.();
        window.openProfileModal?.("address");
        return;
      }
      // 通知ON済みでもトークン未保存のことがあるため、拒否せず再取得を試みる
      const pushReady = typeof window.ensureAutoGoPushReady === "function"
        ? await window.ensureAutoGoPushReady()
        : (typeof Notification !== "undefined" && Notification.permission === "granted");
      if (!pushReady) {
        const pushBox = document.getElementById("ag-push-req-box");
        const pushMessage = document.getElementById("ag-push-required-message");
        if (pushMessage) pushMessage.textContent = "企画成立後の購入URL通知や発送期限のお知らせを受け取るため、プッシュ通知をオンにしてから申し込んでください";
        window.syncAutoGoPushBanner?.();
        pushBox?.scrollIntoView({ behavior: "smooth", block: "center" });
        showToast("先に通知をオンにしてください", "error");
        return;
      }
      const minCompletedTrades = Number(currentPoolData?.minCompletedTrades) || 0;
      if (minCompletedTrades > 0) {
        const tradesSnap = await refs.getDocs(refs.query(
          refs.collection(refs.db, "trades"),
          refs.where("participants", "array-contains", user.uid)
        ));
        const completedTrades = tradesSnap.docs.filter(trade =>
          ["completed", "done"].includes(trade.data().status)
        ).length;
        if (completedTrades < minCompletedTrades) {
          showToast(`参加には完了取引が${minCompletedTrades}件以上必要です（現在${completedTrades}件）`, "error");
          return;
        }
      }
      const albumPrice = Number(currentPoolData?.albumPrice || currentPoolData?.purchasePrice || 0);
      const priceLine = albumPrice > 0
        ? `金額の目安：¥${albumPrice.toLocaleString()}（後で自身で購入）`
        : "金額：ショップ掲載価格（後で自身で購入）";
      const poolTitle = (currentPoolData?.title || "Auto-GO").replace(/全体プール/g, "").trim() || "Auto-GO";
      const confirmMsg = `予約を確定しますか？\n\n企画：${poolTitle}\n希望メンバー：${memberName}\n${priceLine}\n\n※今はお支払いは発生しません。企画成立後に各自でCDを購入します。`;
      const agreed = typeof window.appConfirm === "function"
        ? await window.appConfirm(confirmMsg, "予約を確定する", false)
        : window.confirm(confirmMsg);
      if (!agreed) return;

      await refs.reserveAutoGoEntry({
        poolId: activePoolId,
        wantedMember: memberName,
        consent: true
      });
      showToast("予約完了！希望メンバー「" + memberName + "」で仮予約しました", "success");
      try {
        const overlay = document.createElement("div");
        overlay.id = "ag-reserve-done-modal";
        overlay.className = "fixed inset-0 z-[12000] bg-black/50 flex items-center justify-center p-4";
        overlay.style.zIndex = "12000";
        overlay.innerHTML = `<div class="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-center">
          <div class="text-3xl">✅</div>
          <h3 class="text-base font-black text-gray-900">予約完了</h3>
          <p class="text-sm text-gray-700">希望メンバー：<strong>${escapeAutoGoHtml(memberName)}</strong></p>
          <p class="text-xs text-gray-600">${escapeAutoGoHtml(priceLine)}</p>
          <p class="text-[11px] text-gray-500">予約内容をプッシュ通知でもお送りしました。最低人数に達すると企画が成立します。</p>
          <button type="button" class="w-full py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold" onclick="document.getElementById('ag-reserve-done-modal')?.remove()">閉じる</button>
        </div>`;
        overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
      } catch (modalErr) {
        console.warn("reserve done modal", modalErr);
      }
    } catch (error) {
      console.error("reserveAutoGoMember error:", error);
      const code = error?.code || "";
      const msg = error?.message || String(error);
      if (/push notification|failed-precondition/i.test(code + " " + msg)) {
        window.syncAutoGoPushBanner?.();
        showToast("通知の登録が完了していません。もう一度「通知をONにする」を押してから予約してください", "error");
      } else {
        showToast("予約に失敗しました: " + msg, "error");
      }
    }
  };

  window.adminRemoveAutoGoEntry = async function(poolId, uid) {
    if (!window.__isAutoGoAdmin?.()) {
      showToast("管理者権限が必要です", "error");
      return;
    }
    if (!(await appConfirm("この参加者をAuto-GOから除外しますか？", "除外する", true))) return;
    try {
      await window.__autoGoRefs.adminRemoveAutoGoEntry({ poolId, uid });
      showToast("参加者を除外しました", "success");
    } catch (error) {
      console.error("adminRemoveAutoGoEntry error:", error);
      showToast("除外に失敗しました: " + (error?.message || error), "error");
    }
  };

  window.cancelAutoGoEntry = async function() {
    if (!activePoolId || !(await appConfirm("成立前の仮予約をキャンセルしますか？"))) return;
    try {
      await window.__autoGoRefs.cancelAutoGoEntry({ poolId: activePoolId });
      showToast("仮予約をキャンセルしました。別のメンバー枠を選べます。", "success");
    } catch (error) {
      console.error("cancelAutoGoEntry error:", error);
      showToast("キャンセルできませんでした: " + (error?.message || error), "error");
    }
  };

  function readAutoGoEvidence(file) {
    if (!file) {
      return Promise.reject(new Error("画像ファイルを選択してください"));
    }
    const type = String(file.type || "");
    if (type && !type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "")) {
      return Promise.reject(new Error("画像ファイルを選択してください"));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("画像を読み込めませんでした"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("この画像形式を開けませんでした。JPG/PNGのスクリーンショットで再試行してください"));
        image.onload = () => {
          // Callable/Storage障害時のFirestoreStoreフォールバック用に、長辺1024・概ね650KB未満へ圧縮
          let maxSide = 1024;
          let quality = 0.68;
          let dataUrl = "";
          const encode = (side, q) => {
            const scale = Math.min(1, side / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", q);
          };
          dataUrl = encode(maxSide, quality);
          while (dataUrl.length > 900_000 && (quality > 0.42 || maxSide > 720)) {
            if (quality > 0.42) quality -= 0.08;
            else maxSide = Math.max(720, Math.round(maxSide * 0.85));
            dataUrl = encode(maxSide, quality);
          }
          if (!/^data:image\/jpeg;base64,/.test(dataUrl)) {
            reject(new Error("画像の変換に失敗しました"));
            return;
          }
          resolve(dataUrl);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function formatAutoGoCallableError(error) {
    const code = String(error?.code || "");
    const msg = String(error?.message || error || "");
    const blob = (code + " " + msg).toLowerCase();
    if (/unauthenticated|login required/.test(blob)) return "ログインの有効期限が切れています。再ログインしてください";
    if (/deadline-exceeded|deadline has passed/.test(blob)) return "購入登録の期限が過ぎています";
    if (/purchase evidence is not expected|failed-precondition.*purchase/.test(blob)) return "いまのステータスでは購入報告できません（専用URL発行後のみ）";
    if (/upload the purchase screenshot first/.test(blob)) return "購入証明画像のアップロードが完了していません。もう一度お試しください";
    if (/unsupported image/.test(blob)) return "対応していない画像形式です。JPG/PNGのスクリーンショットを選んでください";
    if (/resource-exhausted|too large for fallback/.test(blob)) return "画像が大きすぎて保存できません。画面の一部だけ写した小さめのスクショでもう一度お願いします";
    if (/4 mb or smaller|too large|413|payload/.test(blob)) return "画像が大きすぎます。別のスクリーンショットで再試行してください";
    if (/failed to save purchase image/.test(blob)) {
      const detail = msg.replace(/^.*failed to save purchase image[:\s]*/i, "").trim();
      return detail
        ? `画像の保存に失敗しました（${detail}）。小さめのスクショで再試行してください`
        : "画像の保存に失敗しました。小さめのスクショで再試行してください";
    }
    if (/storage|internal/.test(blob) && /image|upload|evidence|purchase/.test(blob)) {
      return "画像の保存に失敗しました。通信環境を確認し、小さめのスクショで再試行してください";
    }
    if (/not-found|entry not found/.test(blob)) return "予約データが見つかりません。画面を閉じて開き直してください";
    if (/prepar|準備中/.test(blob)) return msg;
    return msg || "不明なエラーです";
  }

  window.previewAutoGoPurchaseProof = function(input) {
    const file = input?.files?.[0] || null;
    window.__agPurchaseProofFile = file;
    const wrap = document.getElementById("ag-purchase-proof-preview-wrap");
    const img = document.getElementById("ag-purchase-proof-preview");
    if (window.__agPurchaseProofObjectUrl) {
      try { URL.revokeObjectURL(window.__agPurchaseProofObjectUrl); } catch (e) {}
      window.__agPurchaseProofObjectUrl = "";
    }
    if (!file) {
      window.__agPurchaseProofPreview = "";
      if (wrap) wrap.classList.add("hidden");
      if (img) img.removeAttribute("src");
      return;
    }
    const url = URL.createObjectURL(file);
    window.__agPurchaseProofObjectUrl = url;
    window.__agPurchaseProofPreview = url;
    if (img) img.src = url;
    if (wrap) wrap.classList.remove("hidden");
  };

  window.markAutoGoPurchased = async function() {
    const input = document.getElementById("ag-purchase-proof");
    const cameraInput = document.getElementById("ag-purchase-proof-camera");
    const file = input?.files?.[0] || cameraInput?.files?.[0] || window.__agPurchaseProofFile;
    if (!file) {
      showToast("購入日時とアルバムが見えるスクリーンショットを選択してください", "error");
      return;
    }
    const orderNote = String(
      document.getElementById("ag-purchase-order-note")?.value ||
      window.__agPurchaseOrderNote ||
      ""
    ).trim();
    const confirmMsg =
      "購入報告の確認\n\n" +
      "□ 購入日時が写真に写っていますか？\n" +
      "□ アルバム名（商品名）が確認できますか？\n" +
      "□ 自分の注文完了／購入履歴画面ですか？\n" +
      (orderNote ? `□ 注文番号: ${orderNote}\n` : "□ 注文番号: （未入力・任意）\n") +
      "\n内容に問題なければ「報告する」を押してください。";
    const agreed = typeof window.appConfirm === "function"
      ? await window.appConfirm(confirmMsg, "報告する", false)
      : window.confirm(confirmMsg);
    if (!agreed) return;

    const btn = document.querySelector("#ag-purchase-active-actions button[onclick*=\"markAutoGoPurchased\"]");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "送信中...";
    }
    try {
      const refs = window.__autoGoRefs;
      if (!refs?.uploadAutoGoEvidence || !refs?.registerAutoGoPurchase) {
        throw new Error("Auto-GOの準備中です。数秒後にもう一度お試しください。");
      }
      if (!activePoolId) throw new Error("企画が選択されていません。画面を開き直してください。");
      const dataUrl = await readAutoGoEvidence(file);
      await refs.uploadAutoGoEvidence({ poolId: activePoolId, kind: "purchase", dataUrl });
      await refs.registerAutoGoPurchase({ poolId: activePoolId, orderNote });
      window.__agPurchaseProofFile = null;
      window.__agPurchaseProofPreview = "";
      window.__agPurchaseOrderNote = "";
      if (window.__agPurchaseProofObjectUrl) {
        try { URL.revokeObjectURL(window.__agPurchaseProofObjectUrl); } catch (e) {}
        window.__agPurchaseProofObjectUrl = "";
      }
      showToast("購入スクリーンショットを登録しました", "success");
      window.openAutoGoModal(activePoolId);
    } catch (error) {
      console.error("markAutoGoPurchased error:", error);
      const friendly = formatAutoGoCallableError(error);
      showToast("購入報告エラー: " + friendly, "error");
      alert("購入報告エラー: " + friendly);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "購入を報告";
      }
    }
  };

  window.submitAutoGoReveal = async function() {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      if (typeof showToast === "function") {
        showToast("Auto-GOへの申し込みにはプッシュ通知のONが必須です", "error");
      }
      if (typeof window.requestAutoGoPushPermission === "function") {
        await window.requestAutoGoPushPermission();
      }
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
    }
    if (!activePoolId) return;
    const pulled = document.getElementById("ag-pulled-select")?.value;
    if (!pulled) { alert("引いたメンバーを選択してください"); return; }
    try {
      const refs = window.__autoGoRefs;
      if (!refs?.registerAutoGoReveal) throw new Error("Auto-GOの準備中です。");
      await refs.registerAutoGoReveal({ poolId: activePoolId, pulledMember: pulled });
      showToast("開封結果を登録しました。登録期間の終了後に自動マッチングされます。", "success");
    } catch (error) {
      console.error("submitAutoGoReveal error:", error);
      alert("開封結果の登録に失敗しました: " + (error?.message || error));
    }
};

window.saveAutoGoOpenedCard = window.submitAutoGoReveal;

window.markAutoGoAlbumArrived = async function() {
  try {
    await window.__autoGoRefs.registerAutoGoArrival({ poolId: activePoolId });
    showToast("アルバム到着を登録しました", "success");
    window.openAutoGoModal(activePoolId);
  } catch (error) {
    console.error("markAutoGoAlbumArrived error:", error);
    alert("到着報告に失敗しました: " + (error?.message || error));
  }
};

window.reportAutoGoDelay = async function() {
  const reason = prompt("到着または開封が遅れている理由を入力してください:", "");
  if (reason === null) return;
  if (!reason.trim()) { alert("遅延理由を入力してください。"); return; }
  try {
    await window.__autoGoRefs.registerAutoGoDelay({ poolId: activePoolId, reason: reason.trim() });
    showToast("遅延理由を登録しました。運営からの案内をお待ちください。", "success");
    window.openAutoGoModal(activePoolId);
  } catch (error) {
    console.error("reportAutoGoDelay error:", error);
    alert("遅延理由の登録に失敗しました: " + (error?.message || error));
  }
};

window.markAutoGoShipped = async function() {
  const trackingInput = document.getElementById("ag-shipping-tracking");
  const trackingNumber = String(trackingInput?.value || "").replace(/\D/g, "");
  if (trackingInput) trackingInput.value = trackingNumber;
  if (trackingNumber.length < 10) {
    alert("追跡番号は半角数字10桁以上で入力してください。");
    return;
  }
  const file = document.getElementById("ag-shipping-proof")?.files?.[0]
    || document.getElementById("ag-shipping-proof-camera")?.files?.[0];
  if (!file) { alert("伝票の住所が見える写真を選択してください。"); return; }
  try {
    const refs = window.__autoGoRefs;
    const dataUrl = await readAutoGoEvidence(file);
    await refs.uploadAutoGoEvidence({ poolId: activePoolId, kind: "shipping", dataUrl });
    await refs.registerAutoGoShipment({ poolId: activePoolId, trackingNumber });
    showToast("発送写真を登録しました", "success");
    window.openAutoGoModal(activePoolId);
  } catch (error) {
    console.error("markAutoGoShipped error:", error);
    alert("発送報告に失敗しました: " + (error?.message || error));
  }
};

window.copyAutoGoDestination = async function() {
  if (!currentEntryData?.shipToAddress) return;
  const destination = [
    `〒${currentEntryData.shipToZip || ""}`,
    currentEntryData.shipToAddress,
    currentEntryData.shipToName || ""
  ].join("\n");
  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
    await navigator.clipboard.writeText(destination);
    showToast("宛先をコピーしました", "success");
  } catch (error) {
    console.error("copyAutoGoDestination error:", error);
    alert("宛先をコピーできませんでした。");
  }
};

window.markAutoGoReceived = async function() {
  if (!(await appConfirm("トレカを受け取ったことを報告しますか？"))) return;
  try {
    await window.__autoGoRefs.registerAutoGoReceipt({ poolId: activePoolId });
    showToast("受取完了を登録しました", "success");
    window.openAutoGoModal(activePoolId);
  } catch (error) {
    console.error("markAutoGoReceived error:", error);
    alert("受取報告に失敗しました: " + (error?.message || error));
  }
};

window.copyAutoGoInviteUrl = function() {
    if (!activePoolId) return;
    const url = `${location.origin}/?pool=${activePoolId}`;
    navigator.clipboard?.writeText(url);
    const toastEl = document.getElementById("toast");
    if (toastEl) {
      toastEl.innerHTML = `招待URLをコピーしました：<a href="${url}" class="underline font-black ml-1 break-all" target="_blank" rel="noopener">${url}</a>`;
      toastEl.classList.remove("hidden", "opacity-0");
      setTimeout(() => toastEl.classList.add("hidden"), 6000);
    } else {
      showToast("招待URLをコピーしました: " + url, "success");
    }
  };

  
  window.linkifyAutoGoUrl = function(containerId, url) {
    const box = document.getElementById(containerId);
    if (!box || !url) return;
    box.innerHTML = `<a href="${url}" target="_blank" rel="noopener" class="text-purple-700 underline font-bold break-all">${url}</a>`;
  };

  window.shareAutoGoToX = function() {
    if (!activePoolId || !currentPoolData) return;
    const total = currentPoolData.totalCount || 0;
    const minP = currentPoolData.minParticipants || 20;
    const rem = Math.max(0, minP - total);
    const text = encodeURIComponent(
      `【抱き合わせゼロ・定価共同購入】
${currentPoolData.title}
現在${total}人参加（${rem > 0 ? `あと${rem}人で発動！` : "開催確定・参加者募集中！"}）
#ILLIT #トレカ交換 #共同購入
`
    );
    const url = encodeURIComponent(`${location.origin}/?pool=${activePoolId}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  // ディープリンク（?pool= / ?tab=autogo）は auto-go-home-hero.js 側で処理
  drawFirstChoiceChart(0, 5, 20, 20);
})();
