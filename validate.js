// 用法：node validate.js
// 檢查 papers.js：每關 7 頁、e1~e5 皆存在、每個 errorId 剛好出現一次、可點區塊數量統計
const fs = require('fs');
const vm = require('vm');
// 直接取用 index.html 內的 splitSentences，確保驗證與遊戲使用同一份切句邏輯
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const splitSrc = html.match(/\/\/ <splitSentences>([\s\S]*?)\/\/ <\/splitSentences>/)[1];
const splitSentences = new Function(splitSrc + '; return splitSentences;')();
const code = fs.readFileSync(__dirname + '/papers.js', 'utf8') + '\n;globalThis.__P = PAPERS_DATA;';
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
const P = ctx.__P;
let bad = 0;
const fail = (m) => { bad++; console.log('  ✗ ' + m); };
P.forEach((lv) => {
  const ids = ['e1','e2','e3','e4','e5'];
  const found = {};
  let clickable = 0, chars = 0;
  if (lv.pages.length !== 7) fail(`第${lv.id}關頁數 = ${lv.pages.length}（應為 7）`);
  lv.pages.forEach((pg) => pg.blocks.forEach((b) => {
    if (b.type === 'p' && lv.segmented) {
      const sents = splitSentences(b.text);
      clickable += sents.length;
      if (b.errorId) {
        const hits = sents.filter((s) => b.errorMatch && s.includes(b.errorMatch)).length;
        if (hits !== 1) fail(`第${lv.id}關 ${b.errorId} 的 errorMatch 命中 ${hits} 句（應為 1）`);
      }
      if (sents.length < 3 && !/^(Keywords|關鍵詞)/.test(b.text)) fail(`第${lv.id}關有過短段落（${sents.length} 句）：${b.text.slice(0, 20)}…`);
    } else if (b.type !== 'div-divider' && b.type !== 'meta') clickable++;
    chars += (b.text || '').length + (b.title || '').length;
    if (b.errorId) found[b.errorId] = (found[b.errorId] || 0) + 1;
  }));
  ids.forEach((e) => {
    if (!lv.errors[e]) fail(`第${lv.id}關 errors 缺少 ${e}`);
    if (found[e] !== 1) fail(`第${lv.id}關 ${e} 在內文出現 ${found[e] || 0} 次（應為 1）`);
  });
  Object.keys(found).forEach((e) => { if (!lv.errors[e]) fail(`第${lv.id}關內文有未定義的 ${e}`); });
  console.log(`第${String(lv.id).padStart(2)}關 [${lv.lang}] 頁數=${lv.pages.length} 可點單位=${clickable} 約字數=${chars} 錯誤=${Object.keys(found).length}/5`);
});
console.log(bad ? `\n發現 ${bad} 個問題` : '\n全部通過 ✓');
process.exit(bad ? 1 : 0);
