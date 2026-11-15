// DINOv2 で card_vectors.json を再生成するスクリプト (Node.js)
//
// 使い方:
//   1. npm install @huggingface/transformers
//   2. カード画像を images/ フォルダに置く（ファイル名 = カードID、例: card_abc123.jpg）
//   3. node regenerate_vectors.js
//
// 出力: card_vectors.json （DINOv2用）

import { pipeline } from "@huggingface/transformers";
import fs from "fs";
import path from "path";

const IMAGES_DIR = process.argv[2] || "./images";
const OUTPUT = process.argv[3] || "./card_vectors.json";
const MODEL = "Xenova/dinov2-base";

async function main() {
  console.log("DINOv2 モデルを読み込み中...");
  const extractor = await pipeline("image-feature-extraction", MODEL, {
    dtype: "q8"
  });

  const files = fs.readdirSync(IMAGES_DIR).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  if (!files.length) {
    console.error("画像が見つかりません:", IMAGES_DIR);
    process.exit(1);
  }

  console.log(`${files.length} 枚の画像を処理します...`);
  const vectors = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const cardId = path.parse(file).name; // ファイル名（拡張子なし）をカードIDとする
    const filePath = path.join(IMAGES_DIR, file);

    try {
      const out = await extractor(filePath, { pooling: "mean", normalize: true });
      const vec = Array.from(out.data);
      vectors[cardId] = vec;
      console.log(`[${i + 1}/${files.length}] ${cardId} (${vec.length}次元)`);
    } catch (e) {
      console.warn(`スキップ: ${file}`, e.message);
    }
  }

  const result = { vectors, model: MODEL, generatedAt: new Date().toISOString() };
  fs.writeFileSync(OUTPUT, JSON.stringify(result));
  console.log(`\n完了: ${OUTPUT} に ${Object.keys(vectors).length} 件保存しました`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
