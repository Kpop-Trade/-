(function() {
  function syncInputMemberVisibility() {
    const isBulkBundle = (typeof window.isPostBundleMode === "function")
      ? window.isPostBundleMode()
      : (window.exchangeStyle === "bundle" || (window.exchangeStyle !== "single" && !!window.__isBulkMode));
    const inputMember = document.getElementById("input-member");
    if (inputMember) {
      const box = inputMember.closest("div") || inputMember;
      if (isBulkBundle) {
        box.style.display = "none";
        inputMember.value = "指定なし";
      } else {
        box.style.display = "";
      }
    }
  }
  document.addEventListener("click", () => setTimeout(syncInputMemberVisibility, 30), true);
  setInterval(syncInputMemberVisibility, 300);
})();
