/* 多版本引用工具（本地检索台与公开站共用）。
   用法：HLMCite.init('cite_config.json 的地址')；HLMCite.open(results, 'zh' | 'ja')
   results 为检索结果数组：[{ query, by_edition: { ed_id: [hit, ...] } }]
   hit 需有 ed_id、page_no、region_xywh、matched_text、hit_type，可有 char_start。 */
(function () {
  const T = {
    zh: {
      title: '生成引用', eds: '要引用的底本', fmt: '格式', copy: '复制', copied: '已复制', close: '关闭',
      f_note: '脚注文本', f_md: 'Markdown', f_bib: 'BibTeX', f_key: '仅引用键',
      none: '当前检索结果里，所选底本没有可引用的命中。',
      hint: '引用键 = 资料ID + 影印本页序，同一页始终是同一个键。链接打开后会在原页上框出所引位置；影像未公开的页只给引用键和页码。「推定对应」是按上下文推定的位置，「近似匹配」是字句只有部分相同的命中，引用前请对照原图。',
      ch: n => `第${n}回`, pg: n => `第${n}页`, sep: '，', aligned: '（推定对应）', approx: '（近似匹配，请核对）', noimg: '（影像未公开）',
      site: '红楼梦诸本对校 · IIIF 善本影像检索',
    },
    ja: {
      title: '引用を作成', eds: '引用する底本', fmt: '形式', copy: 'コピー', copied: 'コピーしました', close: '閉じる',
      f_note: '脚注テキスト', f_md: 'Markdown', f_bib: 'BibTeX', f_key: '引用キーのみ',
      none: '現在の検索結果には、選択した底本の引用できる箇所がありません。',
      hint: '引用キー＝資料ID＋影印本の頁順で、同じ葉は常に同じキーになります。リンクを開くと原葉上に該当箇所が枠で示されます。画像未公開の葉はキーと葉番号のみです。「対応推定」は前後文からの推定位置、「近似一致」は語句の一部のみが一致した箇所ですので、引用前に原本画像をご確認ください。',
      ch: n => `第${n}回`, pg: n => `第${n}葉`, sep: '、', aligned: '（対応推定）', approx: '（近似一致・要確認）', noimg: '（画像未公開）',
      site: '紅樓夢諸本對校 · IIIF 善本画像検索',
    },
  };
  let CFG = null, cfgPromise = null, lang = 'zh', results = [], dlg = null;
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let fmt = store('hlmCiteFmt') || 'note';
  let off = new Set((store('hlmCiteOff') || '').split(',').filter(Boolean));   // 关掉的底本

  function init(url) {
    cfgPromise = fetch(url).then(r => r.json()).then(c => { CFG = c; return c; });
    return cfgPromise;
  }

  function chapterOf(ed, page, charStart) {
    let found = null;
    for (const [n, sp, sc, ep] of (CFG.editions[ed] || {}).chapters || []) {
      if ((sp < page || (sp === page && sc <= (charStart || 0))) && page <= ep) found = n;
    }
    return found;
  }

  function entryOf(hit, query) {
    const ed = CFG.editions[hit.ed_id];
    if (!ed || !hit.region_xywh) return null;
    const t = T[lang];
    const [x, y, w, h] = hit.region_xywh.map(Math.round);
    const isPublic = ed.public_pages.includes(hit.page_no);
    const ch = chapterOf(hit.ed_id, hit.page_no, hit.char_start);
    return {
      ed: hit.ed_id, name: ed[lang] || ed.zh, page: hit.page_no, ch, query,
      key: `${ed.mid}-p${String(hit.page_no).padStart(4, '0')}`,
      text: hit.matched_text || '', aligned: hit.hit_type === 'aligned',
      approx: hit.hit_type !== 'aligned' && typeof hit.score === 'number' && hit.score < 0.8,
      url: isPublic ? `${CFG.public_site}?at=${hit.ed_id}:${hit.page_no}:${x},${y},${w},${h}&lang=${lang}` : '',
      where: [ch ? t.ch(ch) : '', t.pg(hit.page_no)].filter(Boolean),
    };
  }

  function collect() {
    const groups = [];
    results.forEach(item => {
      const list = [];
      Object.keys(CFG.editions).forEach(edId => {
        const arr = (item.by_edition || {})[edId];
        if (!arr || !arr.length || off.has(edId)) return;
        const e = entryOf(arr[0], item.query);
        if (e) list.push(e);
      });
      if (list.length) groups.push({ query: item.query, list });
    });
    return groups;
  }

  function render(groups) {
    const t = T[lang];
    const quote = e => `「${e.text}」${e.aligned ? t.aligned : (e.approx ? t.approx : '')}`;
    if (fmt === 'key') return groups.map(g => g.list.map(e => e.key).join('; ')).join('\n');
    if (fmt === 'md') {
      return groups.map(g => g.list.map(e => {
        const label = `${e.name} ${e.where.join(' ')}`;
        return `- ${e.url ? `[${label}](${e.url})` : label + t.noimg}（${e.key}）：${quote(e)}`;
      }).join('\n')).join('\n\n');
    }
    if (fmt === 'bib') {
      const byKey = new Map();
      groups.forEach(g => g.list.forEach(e => {
        const k = e.key.replace('-', '');
        if (!byKey.has(k)) byKey.set(k, { e, quotes: [] });
        const q = quote(e);
        if (!byKey.get(k).quotes.includes(q)) byKey.get(k).quotes.push(q);
      }));
      const today = new Date().toISOString().slice(0, 10);
      const esc = s => s.replace(/[{}\\%&#_]/g, c => '\\' + c);
      const items = [...byKey].map(([k, { e, quotes }]) => [
        `@misc{${k},`,
        `  title = {${esc(`${e.name} ${e.where.join(' ')}`)}},`,
        `  note = {${esc(quotes.join('；'))}},`,
        `  howpublished = {${esc(t.site)}},`,
        e.url ? `  url = {${e.url}},\n  urldate = {${today}},` : null,
        `}`,
      ].filter(Boolean).join('\n'));
      return `% \\cite{${[...byKey.keys()].join(',')}}\n\n` + items.join('\n\n');
    }
    return groups.map(g => g.list.map(e =>
      `${e.name}${e.where.join(t.sep)}（${e.key}）：${quote(e)}${e.url ? ' ' + e.url : t.noimg}`
    ).join('\n')).join('\n\n');
  }

  function build() {
    if (dlg) return;
    const style = document.createElement('style');
    style.textContent = `
      dialog.hlm-cite { border: none; border-radius: 8px; padding: 0; width: min(680px, calc(100vw - 28px)); max-height: calc(100vh - 40px);
        background: #fcfbf8; color: #1c1917; box-shadow: 0 24px 70px rgba(0,0,0,.45); font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "PingFang SC", sans-serif; }
      dialog.hlm-cite::backdrop { background: rgba(15,13,11,.6); }
      .hlm-cite header { all: unset; display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(42,35,29,.12); }
      .hlm-cite h2 { margin: 0; font-size: 17px; font-family: "Songti SC", "Hiragino Mincho ProN", serif; letter-spacing: .06em; }
      .hlm-cite .body { padding: 14px 20px 18px; font-size: 13px; }
      .hlm-cite .lab { font-size: 12px; font-weight: 600; color: #4a433c; margin: 0 0 6px; }
      .hlm-cite .row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 13px; }
      .hlm-cite .tg { border: 1px solid rgba(42,35,29,.22); background: transparent; color: #6f665c; padding: 4px 11px; border-radius: 3px; font-size: 13px; cursor: pointer; font-family: inherit; }
      .hlm-cite .tg.on { background: #25211e; border-color: #25211e; color: #f7f3eb; }
      .hlm-cite .tg:disabled { opacity: .4; cursor: default; }
      .hlm-cite textarea { display: block; width: 100%; height: 230px; box-sizing: border-box; resize: vertical; padding: 10px 12px; border: 1px solid rgba(42,35,29,.22); border-radius: 4px;
        background: #f7f4ee; color: #1c1917; font: 12.5px/1.65 "SF Mono", Menlo, "PingFang SC", monospace; }
      .hlm-cite .foot { display: flex; align-items: flex-start; gap: 14px; margin-top: 12px; }
      .hlm-cite .hint { flex: 1; margin: 0; font-size: 12px; line-height: 1.65; color: #6f665c; }
      .hlm-cite .go { background: #a83228; color: #fcf9f2; border: none; padding: 9px 22px; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; }
      .hlm-cite .x { border: 1px solid rgba(42,35,29,.25); background: transparent; color: #4a433c; padding: 6px 12px; border-radius: 4px; font-size: 12.5px; cursor: pointer; font-family: inherit; }`;
    document.head.appendChild(style);
    dlg = document.createElement('dialog');
    dlg.className = 'hlm-cite';
    dlg.innerHTML = `<header><h2 data-k="title"></h2><button class="x" data-k="close" data-act="close"></button></header>
      <div class="body">
        <p class="lab" data-k="eds"></p><div class="row" data-box="eds"></div>
        <p class="lab" data-k="fmt"></p><div class="row" data-box="fmt"></div>
        <textarea readonly spellcheck="false"></textarea>
        <div class="foot"><p class="hint" data-k="hint"></p><button class="go" data-act="copy"></button></div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (ev.target === dlg || (b && b.dataset.act === 'close')) return dlg.close();
      if (!b) return;
      if (b.dataset.ed) { off.has(b.dataset.ed) ? off.delete(b.dataset.ed) : off.add(b.dataset.ed); store('hlmCiteOff', [...off].join(',')); refresh(); }
      if (b.dataset.fmt) { fmt = b.dataset.fmt; store('hlmCiteFmt', fmt); refresh(); }
      if (b.dataset.act === 'copy') copy(b);
    });
  }

  function copy(btn) {
    const ta = dlg.querySelector('textarea');
    const done = () => { btn.textContent = T[lang].copied; setTimeout(() => { btn.textContent = T[lang].copy; }, 1400); };
    const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
    else fallback();
  }

  function refresh() {
    const t = T[lang];
    dlg.querySelectorAll('[data-k]').forEach(el => { el.textContent = t[el.dataset.k]; });
    dlg.querySelector('[data-act=copy]').textContent = t.copy;
    const hasHit = edId => results.some(r => ((r.by_edition || {})[edId] || []).length);
    dlg.querySelector('[data-box=eds]').innerHTML = Object.entries(CFG.editions).map(([edId, ed]) =>
      `<button class="tg ${!off.has(edId) && hasHit(edId) ? 'on' : ''}" data-ed="${edId}" role="switch" aria-checked="${!off.has(edId)}" ${hasHit(edId) ? '' : 'disabled'}>${ed[lang] || ed.zh}</button>`).join('');
    dlg.querySelector('[data-box=fmt]').innerHTML = ['note', 'md', 'bib', 'key'].map(f =>
      `<button class="tg ${f === fmt ? 'on' : ''}" data-fmt="${f}">${t['f_' + f]}</button>`).join('');
    const groups = collect();
    dlg.querySelector('textarea').value = groups.length ? render(groups) : t.none;
  }

  async function open(res, lng) {
    if (!cfgPromise) throw new Error('HLMCite.init(url) 尚未调用');
    await cfgPromise;
    results = res || [];
    lang = lng === 'ja' ? 'ja' : 'zh';
    build();
    refresh();
    if (!dlg.open) dlg.showModal();
  }

  // 解析引用链接里的 at=版本:页:x,y,w,h
  function parseAt(search) {
    const m = /^([a-z]+):(\d+):(\d+),(\d+),(\d+),(\d+)$/.exec(new URLSearchParams(search).get('at') || '');
    return m ? { ed: m[1], page: +m[2], xywh: [+m[3], +m[4], +m[5], +m[6]] } : null;
  }

  window.HLMCite = { init, open, parseAt, _render: (res, lng, f) => { results = res; lang = lng; fmt = f; return render(collect()); } };
})();
