(function (global) {
  'use strict';

  const I18N = {
    zh: {
      modalTitle: '版本书志详情 · 十二种早期版本总谱',
      close: '关闭',
      originalSec: '一、原抄本 / 原刻本本体书志',
      localSec: '二、本库所据数字化影印底本（与本体区分著录）',
      fRepo: '现存藏馆',
      fDate: '推算年代',
      fBasis: '断代依据与争议',
      fExtant: '现存回数',
      fInterp: '配补与残损',
      fLineage: '版本系统与亲缘',
      fProv: '流传与递藏',
      fFormat: '版式与批语',
      fFacs: '常见权威影印本',
      fNotes: '学术注记与待核项',
      fLocalFile: '本地文件',
      fPureRange: '纯清代原叶区间',
      fTotalPages: (n) => `PDF 共 ${n.toLocaleString()} 页`,
      manifestLink: 'IIIF v3 Manifest ↗',
      statusSearchable: '可逐字检索',
      statusLocalOnly: '本地可阅原图',
      statusPending: '原刻待收集',
      statusPublic: '公开示范已接入',
      statusRefOnly: '书志参考（未公开）',
      briefSep: ' · ',
      noFacFile: '待收集（暂未入库原刻影印PDF）',
      briefPrefixRepo: '藏馆：',
      briefPrefixDate: '年代：',
      briefPrefixLine: '系统：',
    },
    ja: {
      modalTitle: '版本書誌詳細 ・ 早期十二種版本一覧',
      close: '閉じる',
      originalSec: '一、原鈔本・原刊本 本体の書誌',
      localSec: '二、本庫所拠デジタル影印底本（本体と区別して著録）',
      fRepo: '所蔵機関',
      fDate: '成立・書写年代',
      fBasis: '年代比定の根拠と議論',
      fExtant: '現存回次',
      fInterp: '補配・残欠状況',
      fLineage: '版本系統と親縁',
      fProv: '伝来・旧蔵',
      fFormat: '書誌・批語形態',
      fFacs: '代表的な影印本',
      fNotes: '考証注記・要確認事項',
      fLocalFile: 'ローカルPDF',
      fPureRange: '純清代原葉区間',
      fTotalPages: (n) => `PDF 全 ${n.toLocaleString()} 頁`,
      manifestLink: 'IIIF v3 Manifest ↗',
      statusSearchable: '全文単字検索可',
      statusLocalOnly: '原葉閲覧対応',
      statusPending: '原刻未収集',
      statusPublic: '公開パイロット収録',
      statusRefOnly: '書誌参照（非公開）',
      briefSep: ' ・ ',
      noFacFile: '未収集（原刻影印PDF未収録）',
      briefPrefixRepo: '所蔵：',
      briefPrefixDate: '年代：',
      briefPrefixLine: '系統：',
    }
  };

  let DATA = null;
  let BY_ED = {};
  let LANG = 'zh';
  let CUR_ED = null;
  let CUR_OPTS = {};
  let DLG = null;
  let STYLED = false;
  let initPromise = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function ensureStyle() {
    if (STYLED) return;
    STYLED = true;
    const st = document.createElement('style');
    st.textContent = `
      dialog.hlm-edinfo {
        border: none; border-radius: 8px; padding: 0; width: min(780px, calc(100vw - 24px));
        max-height: calc(100vh - 32px); background: #fcfbf8; color: #1c1917;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
        font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "PingFang SC", sans-serif;
      }
      dialog.hlm-edinfo::backdrop { background: rgba(15, 13, 11, 0.62); }
      .hlm-edinfo header {
        all: unset; display: flex; justify-content: space-between; align-items: center; gap: 10px;
        padding: 13px 18px; border-bottom: 1px solid rgba(42, 35, 29, 0.14);
        position: sticky; top: 0; background: #fcfbf8; z-index: 3;
      }
      .hlm-edinfo h2 {
        margin: 0; font-size: 16.5px; font-family: "Songti SC", "Hiragino Mincho ProN", serif;
        letter-spacing: 0.04em; color: #1c1917;
      }
      .hlm-edinfo .x {
        border: 1px solid rgba(42, 35, 29, 0.25); background: transparent; color: #4a433c;
        padding: 4px 11px; border-radius: 4px; font-size: 12.5px; cursor: pointer; font-family: inherit;
        white-space: nowrap; flex-shrink: 0;
      }
      .hlm-edinfo .x:hover { background: rgba(42, 35, 29, 0.06); color: #1c1917; }
      .hlm-edinfo-tabs {
        display: flex; flex-wrap: wrap; gap: 5px; padding: 10px 18px;
        background: #f4efe6; border-bottom: 1px solid rgba(42, 35, 29, 0.1);
      }
      .hlm-ed-tab {
        border: 1px solid rgba(42, 35, 29, 0.18); background: #fffcf7; color: #4a433c;
        border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer; font-family: inherit;
        display: inline-flex; align-items: center; gap: 4px; transition: all 0.12s;
      }
      .hlm-ed-tab:hover { border-color: #a83228; color: #1c1917; }
      .hlm-ed-tab.active { background: #a83228; border-color: #a83228; color: #fcf9f2; font-weight: 600; }
      .hlm-ed-tab .ed-num { opacity: 0.72; font-family: "SF Mono", Menlo, monospace; font-size: 10.5px; }
      .hlm-ed-tab.is-muted { opacity: 0.72; border-style: dashed; }
      .hlm-edinfo-body { padding: 14px 18px 20px; overflow-y: auto; max-height: calc(100vh - 150px); }
      .hlm-ed-head { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(42, 35, 29, 0.1); }
      .hlm-ed-canon {
        margin: 0 0 5px; font-size: 17px; font-weight: 700; color: #1c1917;
        font-family: "Songti SC", "Hiragino Mincho ProN", serif; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      }
      .hlm-ed-mid {
        font: 600 11px/1.2 "SF Mono", Menlo, monospace; background: #25211e; color: #f7f3eb;
        padding: 2px 7px; border-radius: 3px;
      }
      .hlm-ed-tag {
        font-size: 11px; padding: 1px 7px; border-radius: 999px; border: 1px solid rgba(168, 50, 40, 0.35);
        color: #a83228; background: rgba(168, 50, 40, 0.06); font-weight: 500;
      }
      .hlm-ed-tag.muted { border-color: rgba(42, 35, 29, 0.25); color: #6a6258; background: rgba(42, 35, 29, 0.05); }
      .hlm-ed-subnames { font-size: 12px; color: #6a6258; line-height: 1.5; }
      .hlm-ed-sec {
        margin: 14px 0 8px; font-size: 13px; font-weight: 700; color: #8c261d;
        letter-spacing: 0.03em; display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }
      .hlm-ed-dl {
        margin: 0; display: grid; grid-template-columns: 126px minmax(0, 1fr); gap: 7px 12px;
        font-size: 12.6px; line-height: 1.62;
      }
      .hlm-ed-dl dt { font-weight: 600; color: #544c43; }
      .hlm-ed-dl dd { margin: 0; color: #1c1917; word-break: break-word; }
      .hlm-ed-dl ul { margin: 0; padding-left: 1.2em; }
      .hlm-ed-dl li { margin: 1px 0; }
      .hlm-ed-localbox {
        background: #f2ede3; border-left: 3px solid #a83228; border-radius: 4px;
        padding: 11px 13px; font-size: 12.5px; line-height: 1.65; color: #3a332d;
      }
      .hlm-ed-localmeta {
        margin-top: 6px; font-size: 11.5px; color: #685e54; display: flex; flex-wrap: wrap; gap: 6px 14px;
        font-family: "SF Mono", Menlo, monospace;
      }
      .hlm-ed-localmeta a { color: #a83228; text-decoration: none; font-family: -apple-system, sans-serif; font-weight: 500; }
      .hlm-ed-localmeta a:hover { text-decoration: underline; }
      .hlm-ed-foot {
        margin: 14px 0 0; padding-top: 10px; border-top: 1px dashed rgba(42, 35, 29, 0.16);
        font-size: 11.5px; color: #786f64; line-height: 1.55;
      }
      @media (max-width: 600px) {
        .hlm-ed-dl { grid-template-columns: 1fr; gap: 2px; }
        .hlm-ed-dl dt { margin-top: 6px; font-size: 12px; }
        .hlm-edinfo-tabs { padding: 8px 12px; }
        .hlm-edinfo-body { padding: 12px; }
      }
    `;
    document.head.appendChild(st);
  }

  function init(url) {
    initPromise = fetch(url || './data/editions_metadata.json')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || !Array.isArray(d.editions)) return null;
        DATA = d;
        BY_ED = {};
        d.editions.forEach(item => {
          if (item.ed_id) BY_ED[item.ed_id] = item;
        });
        return d;
      })
      .catch(() => null);
    return initPromise;
  }

  function get(edId) {
    return BY_ED[edId] || null;
  }

  function all() {
    return (DATA && DATA.editions) || [];
  }

  function briefHtml(edId, lang) {
    const ed = BY_ED[edId];
    if (!ed) return '';
    const isJa = lang === 'ja';
    const t = I18N[isJa ? 'ja' : 'zh'];
    const repo = isJa ? (ed.repo_short_ja || ed.repository_ja) : (ed.repo_short_zh || ed.repository_zh);
    const dt = isJa ? (ed.date_short_ja || ed.dated_period_ja) : (ed.date_short_zh || ed.dated_period);
    const ln = isJa ? (ed.lineage_short_ja || ed.edition_lineage_ja) : (ed.lineage_short_zh || ed.edition_lineage);
    return `<div class="cat-bib">`
      + `<span>${esc(t.briefPrefixRepo + repo)}</span>`
      + `<span class="bib-sep">·</span><span>${esc(t.briefPrefixDate + dt)}</span>`
      + `<span class="bib-sep">·</span><span>${esc(t.briefPrefixLine + ln)}</span>`
      + `</div>`;
  }

  function statusTag(ed, t, mode) {
    if (mode === 'public') {
      return ed.in_public_demo
        ? `<span class="hlm-ed-tag">${esc(t.statusPublic)}</span>`
        : `<span class="hlm-ed-tag muted">${esc(t.statusRefOnly)}</span>`;
    }
    if (!ed.in_local_shelf) return `<span class="hlm-ed-tag muted">${esc(t.statusPending)}</span>`;
    if (['jiaxu', 'jimao', 'gengchen', 'shuxu', 'zheng', 'qixu', 'menggao'].includes(ed.ed_id)) {
      return `<span class="hlm-ed-tag">${esc(t.statusSearchable)}</span>`;
    }
    return `<span class="hlm-ed-tag muted">${esc(t.statusLocalOnly)}</span>`;
  }

  function renderModal() {
    if (!DATA || !DLG) return;
    const isJa = LANG === 'ja';
    const t = I18N[isJa ? 'ja' : 'zh'];
    const list = DATA.editions || [];
    const ed = BY_ED[CUR_ED] || list[0];
    if (!ed) return;
    CUR_ED = ed.ed_id;

    DLG.querySelector('[data-k="title"]').textContent = t.modalTitle;
    DLG.querySelector('[data-act="close"]').textContent = t.close;

    const mode = CUR_OPTS.mode || 'local';
    const tabsEl = DLG.querySelector('.hlm-edinfo-tabs');
    tabsEl.innerHTML = list.map(item => {
      const lbl = (isJa ? item.short_name_ja : item.short_name_zh).replace(/（.*?）/, '');
      const muted = mode === 'public' ? !item.in_public_demo : !item.in_local_shelf;
      return `<button type="button" class="hlm-ed-tab ${item.ed_id === ed.ed_id ? 'active' : ''} ${muted ? 'is-muted' : ''}" data-ed="${esc(item.ed_id)}">`
        + `<span class="ed-num">${esc(item.id)}</span><span>${esc(lbl)}</span>`
        + `</button>`;
    }).join('');
    tabsEl.querySelectorAll('.hlm-ed-tab').forEach(btn => {
      btn.onclick = () => {
        CUR_ED = btn.dataset.ed;
        if (CUR_OPTS.manifestByEd && CUR_OPTS.manifestByEd[CUR_ED]) {
          CUR_OPTS.manifestUrl = CUR_OPTS.manifestByEd[CUR_ED];
        } else if (CUR_OPTS.edId !== CUR_ED) {
          delete CUR_OPTS.manifestUrl;
        }
        renderModal();
      };
    });

    const repo = isJa ? ed.repository_ja : ed.repository_zh;
    const dt = isJa ? ed.dated_period_ja : ed.dated_period;
    const basis = isJa ? ed.dating_basis_ja : ed.dating_basis;
    const extant = isJa ? ed.chapters_extant_ja : ed.chapters_extant;
    const interp = isJa ? ed.interpolated_chapters_ja : ed.interpolated_chapters;
    const lineage = isJa ? ed.edition_lineage_ja : ed.edition_lineage;
    const prov = isJa ? ed.provenance_summary_ja : ed.provenance_summary;
    const fmt = isJa ? ed.physical_format_ja : ed.physical_format;
    const facs = (isJa ? ed.reference_facsimiles_ja : ed.reference_facsimiles) || [];
    const notes = isJa ? ed.scholarly_notes_ja : ed.scholarly_notes;
    const fac = ed.local_facsimile || {};
    const facNotes = (isJa ? fac.notes_ja : fac.notes_zh) || t.noFacFile;
    const manUrl = CUR_OPTS.manifestUrl || (CUR_OPTS.manifestByEd && CUR_OPTS.manifestByEd[ed.ed_id]) || '';

    const body = DLG.querySelector('.hlm-edinfo-body');
    body.innerHTML = `
      <div class="hlm-ed-head">
        <h3 class="hlm-ed-canon">
          <span>${esc(ed.canonical_title)}</span>
          <span class="hlm-ed-mid">${esc(ed.material_id)}</span>
          ${statusTag(ed, t, mode)}
        </h3>
        <div class="hlm-ed-subnames">
          中：${esc(ed.short_name_zh)} ｜ 日：${esc(ed.short_name_ja)} ｜ EN：${esc(ed.short_name_en)}
        </div>
      </div>
      <div class="hlm-ed-sec"><span>${esc(t.originalSec)}</span></div>
      <dl class="hlm-ed-dl">
        <dt>${esc(t.fRepo)}</dt><dd>${esc(repo)}${ed.repository_en ? ` <span style="color:#786f64">(${esc(ed.repository_en)})</span>` : ''}</dd>
        <dt>${esc(t.fDate)}</dt><dd>${esc(dt)}</dd>
        <dt>${esc(t.fBasis)}</dt><dd>${esc(basis)}</dd>
        <dt>${esc(t.fExtant)}</dt><dd>${esc(extant)}</dd>
        <dt>${esc(t.fInterp)}</dt><dd>${esc(interp)}</dd>
        <dt>${esc(t.fLineage)}</dt><dd>${esc(lineage)}</dd>
        <dt>${esc(t.fProv)}</dt><dd>${esc(prov)}</dd>
        <dt>${esc(t.fFormat)}</dt><dd>${esc(fmt)}</dd>
        <dt>${esc(t.fFacs)}</dt><dd><ul>${facs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd>
        <dt>${esc(t.fNotes)}</dt><dd>${esc(notes)}</dd>
      </dl>
      <div class="hlm-ed-sec"><span>${esc(t.localSec)}</span></div>
      <div class="hlm-ed-localbox">
        <div>${esc(facNotes)}</div>
        <div class="hlm-ed-localmeta">
          ${fac.total_pages ? `<span>${esc(t.fTotalPages(fac.total_pages))}</span>` : ''}
          ${fac.pure_range ? `<span>${esc(t.fPureRange)}: ${esc(fac.pure_range)}</span>` : ''}
          ${fac.file ? `<span>${esc(t.fLocalFile)}: ${esc(fac.file)}</span>` : ''}
          ${manUrl ? `<a href="${esc(manUrl)}" target="_blank" rel="noopener">${esc(t.manifestLink)}</a>` : ''}
        </div>
      </div>
      <p class="hlm-ed-foot">${esc(isJa ? DATA.editorial_note_ja : DATA.editorial_note_zh)}</p>
    `;
  }

  async function open(edId, lang, opts) {
    if (lang) LANG = lang === 'ja' ? 'ja' : 'zh';
    CUR_ED = edId || 'jiaxu';
    CUR_OPTS = Object.assign({ edId: CUR_ED }, opts || {});
    ensureStyle();
    if (!DATA && initPromise) await initPromise;
    if (!DATA) return;
    if (!DLG) {
      DLG = document.createElement('dialog');
      DLG.className = 'hlm-edinfo';
      DLG.innerHTML = `<header><h2 data-k="title"></h2><button type="button" class="x" data-act="close"></button></header><div class="hlm-edinfo-tabs"></div><div class="hlm-edinfo-body"></div>`;
      document.body.appendChild(DLG);
      DLG.addEventListener('click', (ev) => {
        if (ev.target === DLG || ev.target.closest('[data-act="close"]')) DLG.close();
      });
    }
    renderModal();
    if (DLG.showModal) DLG.showModal(); else DLG.setAttribute('open', '');
  }

  function setLang(lang) {
    LANG = lang === 'ja' ? 'ja' : 'zh';
    if (DLG && DLG.open) renderModal();
  }

  global.HLMEditionInfo = { init, get, all, briefHtml, open, setLang };
})(window);
