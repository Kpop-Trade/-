const { pipeline, env } = require("@xenova/transformers");
const fs = require("fs");
const path = require("path");

env.cacheDir = "/tmp/hf-cache";
const start = Number(process.argv[2]);

(async () => {
  const extractor = await pipeline("image-feature-extraction", "Xenova/dinov2-base");
  const files = fs.readdirSync("clean").filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith("._")).sort();
  const slice = files.slice(start, start + 500);
  const part = {};

  for (let i = 0; i < slice.length; i++) {
    const file = slice[i];
    const cardId = path.parse(file).name;
    const out = await extractor(path.join("clean", file), { pooling: "mean", normalize: true });
    part[cardId] = Array.from(out.data);
    if ((i + 1) % 250 === 0 || i === slice.length - 1) {
      console.log(`Batch ${start}: ${i + 1} / ${slice.length}`);
    }
  }
  fs.writeFileSync(`./_vec_part_${start}.json`, JSON.stringify(part));
})();
