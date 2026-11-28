(function (global) {
  'use strict';

  const SEEN_KEY = 'hlmSeenVer';
  const I18N = {
    zh: {
      newTag: '新上线',
      viewBtn: '查看更新',
      okBtn: '知道了',
      modalTitle: '更新日志 · 版本进度',
      close: '关闭',
      badgeTip: (v) => `当前版本 ${v} · 点击查看更新日志`,
      meta: (s) => s ? `当前收录：${s.editions} 部古籍抄本 · 本地索引 ${s.local_leaves.toLocaleString()} 叶 · 公开示范 ${s.public_leaves.toLocaleString()} 叶 · ${s.chapters} 回边界` : '',
      currentBadge: '当前版本',
      policyFoot: '版本规范：v0.x.0 仅用于阶段里程碑，日常功能增强与修复递增末位修订号 v0.x.y。'
    },
    ja: {
      newTag: '新着',
      viewBtn: '更新履歴を見る',
      okBtn: '閉じる',
      modalTitle: '更新履歴・バージョン情報',
      close: '閉じる',
      badgeTip: (v) => `現在のバージョン ${v} · クリックで更新履歴を表示`,
      meta: (s) => s ? `収録状況：古鈔本 ${s.editions} 種 ・ ローカル索引 ${s.local_leaves.toLocaleString()} 葉 ・ 公開版 ${s.public_leaves.toLocaleString()} 葉 ・ ${s.chapters} 回境界` : '',
      currentBadge: '現在',
      policyFoot: 'バージョン規約：v0.x.0 は主要マイルストーン時のみ更新し、日常の改善・修正は末尾番号 v0.x.y で管理します。'
    }
  };

  let DATA = null;
  let LANG = 'zh';
  let BADGE = null;
  let TIP = null;
  let DLG = null;
  let STYLED = false;

  function getSeen() {
    try { return global.localStorage ? global.localStorage.getItem(SEEN_KEY) : null; } catch (e) { return null; }
  }
  function setSeen(v) {
    try { if (global.localStorage && v) global.localStorage.setItem(SEEN_KEY, v); } catch (e) {}
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function ensureStyle() {
    if (STYLED) return;
    STYLED = true;
    const st = document.createElement('style');
    st.textContent = `
      .ver-pill {
        position: relative; display: inline-flex; align-items: center; gap: 5px;
        border: 1px solid rgba(216, 195, 158, 0.34); background: rgba(216, 195, 158, 0.09);
        color: #dfd0b4; padding: 3px 9px; border-radius: 999px; font-size: 11.5px;
        font-family: "SF Mono", Menlo, monospace; cursor: pointer; white-space: nowrap; flex-shrink: 0;
        transition: all 0.15s;
      }
      .ver-pill:hover { border-color: rgba(224, 90, 78, 0.72); color: #fff; background: rgba(168, 50, 40, 0.22); }
      .ver-pill .ver-dot {
        width: 6px; height: 6px; border-radius: 50%; background: #e05a4e;
        box-shadow: 0 0 0 2px rgba(224, 90, 78, 0.25); flex-shrink: 0;
      }
      .hlm-tip {
        position: fixed; right: 18px; bottom: 18px; z-index: 950; width: min(372px, calc(100vw - 24px));
        background: #fcfbf8; color: #1c1917; border: 1px solid rgba(42, 35, 29, 0.2);
        border-top: 3px solid #a83228; border-radius: 6px; padding: 12px 14px;
        box-shadow: 0 14px 36px rgba(15, 13, 11, 0.26);
        font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "PingFang SC", sans-serif;
        box-sizing: border-box;
      }
      .hlm-tip-head { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
      .hlm-tip-ver {
        font: 600 11px/1.2 "SF Mono", Menlo, monospace; background: #a83228; color: #fcf9f2;
        padding: 2px 6px; border-radius: 3px; white-space: nowrap;
      }
      .hlm-tip-title {
        font-size: 13.5px; font-weight: 600; color: #1c1917; flex: 1; min-width: 0;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .hlm-tip-x {
        border: none; background: transparent; color: #786f64; font-size: 16px; line-height: 1;
        padding: 2px 4px; cursor: pointer;
      }
      .hlm-tip-x:hover { color: #1c1917; }
      .hlm-tip-sum { margin: 0 0 10px; font-size: 12.5px; line-height: 1.6; color: #4a433c; }
      .hlm-tip-act { display: flex; justify-content: flex-end; gap: 8px; }
      .hlm-tip-btn {
        border: 1px solid rgba(42, 35, 29, 0.22); background: transparent; color: #4a433c;
        padding: 4px 11px; border-radius: 4px; font-size: 12px; cursor: pointer; font-family: inherit;
      }
      .hlm-tip-btn:hover { background: rgba(42, 35, 29, 0.06); color: #1c1917; }
      .hlm-tip-btn.pri { background: #a83228; border-color: #a83228; color: #fcf9f2; font-weight: 500; }
      .hlm-tip-btn.pri:hover { background: #8f2820; }
      @media (max-width: 820px) {
        .hlm-tip { left: 12px; right: 12px; width: auto; bottom: 58px; }
        .ver-pill { padding: 3px 7px; font-size: 11px; }
      }
      dialog.hlm-chg {
        border: none; border-radius: 8px; padding: 0; width: min(680px, calc(100vw - 24px));
        max-height: calc(100vh - 36px); background: #fcfbf8; color: #1c1917;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
        font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "PingFang SC", sans-serif;
      }
      dialog.hlm-chg::backdrop { background: rgba(15, 13, 11, 0.6); }
      .hlm-chg header {
        all: unset; display: flex; justify-content: space-between; align-items: center; gap: 10px;
        padding: 14px 20px; border-bottom: 1px solid rgba(42, 35, 29, 0.12);
        position: sticky; top: 0; background: #fcfbf8; z-index: 2;
      }
      .hlm-chg h2 { margin: 0; font-size: 17px; font-family: "Songti SC", "Hiragino Mincho ProN", serif; letter-spacing: 0.05em; }
      .hlm-chg .x {
        border: 1px solid rgba(42, 35, 29, 0.25); background: transparent; color: #4a433c;
        padding: 5px 12px; border-radius: 4px; font-size: 12.5px; cursor: pointer; font-family: inherit;
      }
      .hlm-chg .chg-body { padding: 12px 20px 20px; overflow-y: auto; max-height: calc(100vh - 110px); }
      .hlm-chg .chg-stats {
        margin: 0 0 14px; padding: 8px 11px; border-radius: 4px; background: #f2ede3;
        border-left: 3px solid #a83228; font-size: 12px; color: #4a433c; line-height: 1.55;
      }
      .hlm-chg .chg-item { padding: 11px 0 12px; border-bottom: 1px solid rgba(42, 35, 29, 0.1); }
      .hlm-chg .chg-item:last-child { border-bottom: none; padding-bottom: 2px; }
      .hlm-chg .chg-top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 5px; }
      .hlm-chg .chg-ver {
        font: 600 12px/1.2 "SF Mono", Menlo, monospace; padding: 2px 7px; border-radius: 3px;
        background: #25211e; color: #f7f3eb;
      }
      .hlm-chg .chg-ver.cur { background: #a83228; }
      .hlm-chg .chg-cur {
        font-size: 11px; color: #a83228; border: 1px solid rgba(168, 50, 40, 0.35);
        padding: 1px 6px; border-radius: 999px;
      }
      .hlm-chg .chg-date { font-size: 12px; color: #786f64; font-family: "SF Mono", Menlo, monospace; }
      .hlm-chg .chg-title { font-size: 14.5px; font-weight: 600; color: #1c1917; margin: 2px 0 6px; }
      .hlm-chg ul { margin: 0; padding-left: 1.25em; font-size: 12.8px; line-height: 1.72; color: #4a433c; }
      .hlm-chg li { margin: 4px 0; }
      .hlm-chg .chg-cat {
        display: inline-block; font-size: 11.5px; font-weight: 600; color: #8c261d;
        background: rgba(168, 50, 40, 0.09); border: 1px solid rgba(168, 50, 40, 0.22);
        border-radius: 3px; padding: 0 5px; margin-right: 5px; vertical-align: 1px;
      }
      .hlm-chg .chg-foot {
        margin: 12px 0 0; padding-top: 10px; border-top: 1px dashed rgba(42, 35, 29, 0.16);
        font-size: 11.5px; color: #786f64; line-height: 1.5;
      }
    `;
    document.head.appendChild(st);
  }

  function renderBadge() {
    if (!BADGE || !DATA) return;
    const t = I18N[LANG] || I18N.zh;
    const unseen = getSeen() !== DATA.current;
    BADGE.hidden = false;
    BADGE.title = t.badgeTip(DATA.current);
    BADGE.setAttribute('aria-label', t.badgeTip(DATA.current));
    BADGE.innerHTML = `<span>${esc(DATA.current)}</span>${unseen ? '<i class="ver-dot" aria-hidden="true"></i>' : ''}`;
  }

  function showTip() {
    if (!DATA || !DATA.releases || !DATA.releases.length) return;
    const latest = DATA.releases[0];
    const t = I18N[LANG] || I18N.zh;
    const loc = latest[LANG] || latest.zh;
    if (!TIP) {
      TIP = document.createElement('div');
      TIP.className = 'hlm-tip';
      TIP.setAttribute('role', 'status');
      document.body.appendChild(TIP);
    }
    TIP.hidden = false;
    TIP.innerHTML = `
      <div class="hlm-tip-head">
        <span class="hlm-tip-ver">${esc(latest.version)} ${esc(t.newTag)}</span>
        <span class="hlm-tip-title" title="${esc(loc.title)}">${esc(loc.title)}</span>
        <button type="button" class="hlm-tip-x" aria-label="${esc(t.okBtn)}" data-act="dismiss">×</button>
      </div>
      <p class="hlm-tip-sum">${esc(loc.summary)}</p>
      <div class="hlm-tip-act">
        <button type="button" class="hlm-tip-btn" data-act="dismiss">${esc(t.okBtn)}</button>
        <button type="button" class="hlm-tip-btn pri" data-act="open">${esc(t.viewBtn)}</button>
      </div>`;
    TIP.querySelectorAll('[data-act="dismiss"]').forEach(el => el.onclick = dismiss);
    TIP.querySelector('[data-act="open"]').onclick = () => open(LANG);
  }

  function dismiss() {
    if (DATA) setSeen(DATA.current);
    if (TIP) TIP.hidden = true;
    renderBadge();
  }

  function fmtItem(text) {
    const m = String(text || '').match(/^【([^】]+)】(.*)$/);
    if (m) return `<span class="chg-cat">${esc(m[1])}</span>${esc(m[2].trim())}`;
    return esc(text);
  }

  function renderModal() {
    if (!DATA) return;
    if (!DLG) {
      DLG = document.createElement('dialog');
      DLG.className = 'hlm-chg';
      DLG.innerHTML = `<header><h2 data-k="title"></h2><button type="button" class="x" data-act="close"></button></header><div class="chg-body"></div>`;
      document.body.appendChild(DLG);
      DLG.addEventListener('click', (ev) => {
        if (ev.target === DLG || ev.target.closest('[data-act="close"]')) DLG.close();
      });
    }
    const t = I18N[LANG] || I18N.zh;
    DLG.querySelector('[data-k="title"]').textContent = t.modalTitle;
    DLG.querySelector('[data-act="close"]').textContent = t.close;
    const statsText = t.meta(DATA.stats);
    const itemsHtml = (DATA.releases || []).map((rel, idx) => {
      const loc = rel[LANG] || rel.zh;
      const isCur = idx === 0 || rel.version === DATA.current;
      const li = (loc.items || []).map(x => `<li>${fmtItem(x)}</li>`).join('');
      return `<section class="chg-item">
        <div class="chg-top">
          <span class="chg-ver ${isCur ? 'cur' : ''}">${esc(rel.version)}</span>
          ${isCur ? `<span class="chg-cur">${esc(t.currentBadge)}</span>` : ''}
          <span class="chg-date">${esc(rel.date)}</span>
        </div>
        <div class="chg-title">${esc(loc.title)}</div>
        <ul>${li}</ul>
      </section>`;
    }).join('');
    DLG.querySelector('.chg-body').innerHTML = `${statsText ? `<p class="chg-stats">${esc(statsText)}</p>` : ''}${itemsHtml}<p class="chg-foot">${esc(t.policyFoot)}</p>`;
  }

  function open(lang) {
    if (lang) LANG = lang;
    ensureStyle();
    if (!DATA) return;
    setSeen(DATA.current);
    if (TIP) TIP.hidden = true;
    renderBadge();
    renderModal();
    if (DLG.showModal) DLG.showModal(); else DLG.setAttribute('open', '');
  }

  function setLang(lang) {
    LANG = lang === 'ja' ? 'ja' : 'zh';
    if (!DATA) return;
    renderBadge();
    if (TIP && !TIP.hidden) showTip();
    if (DLG && DLG.open) renderModal();
  }

  async function init(opts) {
    const o = opts || {};
    LANG = o.lang === 'ja' ? 'ja' : 'zh';
    BADGE = o.badgeEl || null;
    ensureStyle();
    try {
      const res = await fetch(o.url || './data/releases.json');
      if (!res.ok) return;
      DATA = await res.json();
    } catch (e) {
      return;
    }
    renderBadge();
    if (!o.isDeepLink && getSeen() !== DATA.current) {
      showTip();
    }
  }

  global.HLMChangelog = { init, open, setLang, dismiss };
})(window);
