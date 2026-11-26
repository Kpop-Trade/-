  window.currentUser = typeof currentUser !== "undefined" ? currentUser : null; window.currentUser = currentUser;
  window.currentUserProfile = typeof currentUserProfile !== "undefined" ? currentUserProfile : null; window.currentUserProfile = currentUserProfile;
  if (typeof db !== "undefined") window.db = db;
  if (typeof collection !== "undefined") window.collection = collection;
  if (typeof addDoc !== "undefined") window.addDoc = addDoc;
  if (typeof serverTimestamp !== "undefined") window.serverTimestamp = serverTimestamp;
  if (typeof openTrade === "function") window.openTrade = openTrade;
  if (typeof showToast === "function") window.showToast = showToast;

  window.currentUser = typeof currentUser !== "undefined" ? currentUser : null;
  window.currentUserProfile = typeof currentUserProfile !== "undefined" ? currentUserProfile : null;
  if (typeof db !== "undefined") window.db = db;
  if (typeof collection !== "undefined") window.collection = collection;
  if (typeof addDoc !== "undefined") window.addDoc = addDoc;
  if (typeof serverTimestamp !== "undefined") window.serverTimestamp = serverTimestamp;
  if (typeof openTrade === "function") window.openTrade = openTrade;
  if (typeof showToast === "function") window.showToast = showToast;
