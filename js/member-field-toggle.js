(function() {
  function toggleMemberFieldForBundle() {
    // 1. 「まとめ売り」が選択状態かどうかを判定（タブ・ラジオ・セレクト・activeクラス等を広く検知）
    let isBundle = false;
    document.querySelectorAll('button, [role="tab"], label, option, input[type="radio"]').forEach(el => {
      const txt = (el.textContent || el.value || '').trim();
      if (txt.includes('まとめ売り')) {
        if (el.checked || el.selected || el.getAttribute('aria-selected') === 'true' ||
            /active|selected|bg-indigo|bg-purple|bg-pink|bg-blue|text-white|border-indigo|border-pink/.test(el.className || '')) {
          isBundle = true;
        }
      }
    });
    const modeSelect = document.querySelector('select[id*="mode"], select[id*="type"], input[name*="mode"]:checked, input[name*="type"]:checked');
    if (modeSelect && /bundle|bulk|set|まとめ/i.test(modeSelect.value || '')) {
      isBundle = true;
    }

    // 2. メンバー選択欄（#add-card-member およびその親コンテナ）を切り替え
    const memberSelect = document.getElementById('add-card-member');
    if (memberSelect) {
      const wrapper = memberSelect.closest('div') || memberSelect;
      if (isBundle) {
        wrapper.style.display = 'none';
        memberSelect.value = '';
        memberSelect.removeAttribute('required');
      } else {
        wrapper.style.display = '';
      }
    }
  }

  document.addEventListener('click', () => setTimeout(toggleMemberFieldForBundle, 50), true);
  document.addEventListener('change', () => setTimeout(toggleMemberFieldForBundle, 50), true);
  setInterval(toggleMemberFieldForBundle, 500);
})();
