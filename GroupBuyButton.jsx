import React, { useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
// ※ 以下のインポートパスは、自分のプロジェクトの firebase 初期化ファイルに合わせて変更してください
import { db, auth } from "./firebase"; 

export default function GroupBuyButton({ buyId }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleJoin = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("参加するにはログインが必要です。");
      return;
    }

    setIsProcessing(true);
    const groupBuyRef = doc(db, "groupBuys", buyId);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. 最新のデータを取得（他の人の割り込みを防ぐためにロック）
        const docSnapshot = await transaction.get(groupBuyRef);
        
        if (!docSnapshot.exists()) {
          throw new Error("指定された共同購入が見つかりません。");
        }

        const data = docSnapshot.data();

        // 2. バリデーション（ステータス・重複・定員チェック）
        if (data.status !== "recruiting") {
          throw new Error("この共同購入は現在募集していません。");
        }
        if (data.currentParticipants.includes(user.uid)) {
          throw new Error("すでにこの共同購入に参加しています。");
        }
        if (data.currentParticipants.length >= data.maxParticipants) {
          throw new Error("申し訳ありません。すでに定員に達しています。");
        }

        // 3. 更新データの準備
        const newParticipants = [...data.currentParticipants, user.uid];
        const updateData = {
          currentParticipants: newParticipants,
          updatedAt: serverTimestamp(),
        };

        // 定員に達したら自動でステータスを閉じる
        if (newParticipants.length === data.maxParticipants) {
          updateData.status = "closed";
        }

        // 4. データ更新を実行
        transaction.update(groupBuyRef, updateData);
      });

      alert("共同購入への参加が完了しました！");
      
    } catch (error) {
      console.error("参加エラー:", error);
      alert(error.message); // 「定員に達しています」などのエラー理由をユーザーに表示
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button 
      onClick={handleJoin} 
      disabled={isProcessing}
      // manifest.jsonのテーマカラー(#b794f4)に合わせたスタイル例
      style={{
        padding: "12px 24px",
        backgroundColor: isProcessing ? "#cbd5e1" : "#b794f4",
        color: "#ffffff",
        fontWeight: "bold",
        borderRadius: "8px",
        border: "none",
        cursor: isProcessing ? "not-allowed" : "pointer",
        width: "100%"
      }}
    >
      {isProcessing ? "処理中..." : "共同購入に参加する"}
    </button>
  );
}

