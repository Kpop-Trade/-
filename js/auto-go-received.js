window.markReceived = async function(poolId) {
  if (!confirm("商品の受取を完了しますか？")) return;
  try {
    const db = window.firebase.firestore();
    const uid = window.firebase.auth().currentUser.uid;
    const docRef = db.collection("auto_go_pools").doc(poolId);
    const snap = await docRef.get();
    if (!snap.exists) return;
    const data = snap.data();
    let rec = data.received || {};
    let isOwner = data.ownerId === uid;
    if (isOwner) rec[data.ownerId] = true;
    else rec[data.applicantId] = true;
    let isCompleted = rec[data.ownerId] && rec[data.applicantId];
    await docRef.update({
      received: rec,
      status: isCompleted ? "completed" : (data.status || "shipped")
    });
    alert("受取を完了しました！");
    location.reload();
  } catch(e) {
    console.error(e);
    alert("エラー: " + e.message);
  }
};

function openAgGuide() {
  const existing = document.getElementById("ag-guide-modal");
  if (existing) {
    existing.classList.remove("hidden");
    return;
  }

  const guideText = `～取引の流れ～
❶ 運営がプールと呼ばれる共同購入を応募します。最初はメンバー1人あたり5枠or4枠が設定され、最低20人集まると自動で共同購入が確定します。全て埋まり次第、メンバーあたり3枠ずつ追加されます。（ここではお支払いは発生しません。）
❷ 募集期間終了までに最低20人が集まると、自動でアルバムのURLがプッシュ通知で送信されます。お客様自身でアルバムを購入した後、購入画面で支払い日時とアルバムが写るようにスクリーンショットを撮り、購入したことをアプリに登録します。（URLが届いてから10時間以内に登録しないと、自動でキャンセルとなり、ペナルティが課されます）
❸ トレカが到着次第、開封結果を登録します。自引きした場合も同様に、必ず登録してください。（5人以上が到着してから4日程度まで猶予があります。遅延理由も登録せずキャンセルになった場合、同様のペナルティ）
❹ 登録期間が終了した時、登録された情報からシステムが最適な送付先を決定し、お客様に送付先の住所が送られます。送付する時は、必ず伝票の住所が写るように写真を撮り、アプリに登録します。
❺ 到着次第、受け取り完了ボタンを押して完了となります。

～具体的な第一希望の推し獲得確率～
全体20人：約82.5%
全体50人：約88%
リアルタイムで、参加人数に対する確率がアプリ内に表示されます！
したがって、最低人数が集まった時点で、約82.5%の確率で推しのトレカが獲得できます！

⚠️ Auto-GO ご参加前の注意点・ルール ⚠️
① 1人あたりメンバー1つまで
同じ企画につき、お一人様1メンバー（1枠）までのお申し込みとなります。
② メンバー枠は完全先着順
人気メンバーの枠は申し込み順に埋まり、上限に達したメンバーから受付終了となります。募集開始2日程度前から、アプリからのプッシュ通知と公式Xで日時を予告します。
③ 成立後のキャンセル不可
枠が埋まりマッチング・購入が確定した後の自己都合キャンセルはできません（確定前であればキャンセル・希望変更が可能です）。
※ルールは変更となる場合があります。

！シェアで成立率アップ！
人数が多ければ多いほど、推し獲得の確率は高くなります。他のメンバー希望者が集まるほど全体枠が早く埋まります。「Xでシェアして枠を埋める」ボタンから募集を広げられます！`;

  const overlay = document.createElement("div");
  overlay.id = "ag-guide-modal";
  overlay.className = "fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const panel = document.createElement("div");
  panel.className = "flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-950 dark:text-gray-100";
  panel.addEventListener("click", (event) => event.stopPropagation());

  const banner = document.createElement("div");
  banner.className = "shrink-0 bg-red-600 px-4 py-3 text-center text-sm font-black text-white";
  banner.textContent = "⚠️ 参加前に必ず読んでください";

  const content = document.createElement("div");
  content.className = "overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed";
  content.textContent = guideText;

  const footer = document.createElement("div");
  footer.className = "shrink-0 border-t border-gray-200 p-3 dark:border-gray-700";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white";
  closeButton.textContent = "読みました";
  closeButton.addEventListener("click", () => overlay.classList.add("hidden"));

  footer.appendChild(closeButton);
  panel.append(banner, content, footer);
  overlay.appendChild(panel);
  overlay.addEventListener("click", () => overlay.classList.add("hidden"));
  document.body.appendChild(overlay);
}
