#!/usr/bin/env node
// public/assets/images 의 PNG/JPG 를 WebP 로 변환하고 너비를 적정 사이즈로 리사이즈.
// 원본 파일은 변환 성공 시 삭제한다.

import { readdir, stat, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = new URL('../public/assets/images/', import.meta.url).pathname;
const MAX_WIDTH = 1920;
const DEFAULT_QUALITY = 85;
const HIGH_QUALITY_PATTERNS = [/cutscene/i, /greenie_/i, /jumpscare/i];

const formatBytes = (n) => {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
};

const qualityFor = (filename) => (
  HIGH_QUALITY_PATTERNS.some((re) => re.test(filename)) ? 92 : DEFAULT_QUALITY
);

async function optimizeOne(filename) {
  const sourcePath = join(IMAGES_DIR, filename);
  const ext = extname(filename).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null;

  const outFilename = filename.replace(/\.(png|jpe?g)$/i, '.webp');
  const outPath = join(IMAGES_DIR, outFilename);
  const beforeBytes = (await stat(sourcePath)).size;

  const image = sharp(sourcePath);
  const meta = await image.metadata();
  const pipeline = meta.width > MAX_WIDTH
    ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true })
    : image;

  await pipeline.webp({ quality: qualityFor(filename) }).toFile(outPath);
  const afterBytes = (await stat(outPath)).size;
  await unlink(sourcePath);

  const ratio = (1 - afterBytes / beforeBytes) * 100;
  return { filename, outFilename, beforeBytes, afterBytes, ratio, resized: meta.width > MAX_WIDTH };
}

async function main() {
  const entries = await readdir(IMAGES_DIR);
  const targets = entries.filter((f) => /\.(png|jpe?g)$/i.test(f));

  if (targets.length === 0) {
    console.log('변환할 PNG/JPG 파일이 없습니다.');
    return;
  }

  console.log(`대상: ${targets.length}개\n`);
  let totalBefore = 0;
  let totalAfter = 0;

  for (const filename of targets) {
    try {
      const result = await optimizeOne(filename);
      if (!result) continue;
      totalBefore += result.beforeBytes;
      totalAfter += result.afterBytes;
      const resizeTag = result.resized ? ' (리사이즈)' : '';
      console.log(
        `  ${result.filename} → ${result.outFilename}: `
        + `${formatBytes(result.beforeBytes)} → ${formatBytes(result.afterBytes)} `
        + `(-${result.ratio.toFixed(1)}%)${resizeTag}`,
      );
    } catch (err) {
      console.error(`  ${filename}: 실패 — ${err.message}`);
    }
  }

  const totalRatio = (1 - totalAfter / totalBefore) * 100;
  console.log(`\n총합: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (-${totalRatio.toFixed(1)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
