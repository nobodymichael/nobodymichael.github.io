/* Rozkrój płyt — logika układu i obliczeń (w stylu site.js) */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  const state = {
    parts: [
      { id: 1, w: 800, h: 400, qty: 4, label: "Formatka A", edges: { top: true, bottom: true, left: false, right: false } },
      { id: 2, w: 600, h: 400, qty: 2, label: "Półka B", edges: { top: true, bottom: false, left: false, right: false } }
    ],
    nextId: 3
  };

  function readConfig() {
    const sw = Math.max(10, +$("#cutSw").value || 2800);
    const sh = Math.max(10, +$("#cutSh").value || 2070);
    const tL = Math.max(0, +$("#cutTL").value || 0);
    const tR = Math.max(0, +$("#cutTR").value || 0);
    const tT = Math.max(0, +$("#cutTT").value || 0);
    const tB = Math.max(0, +$("#cutTB").value || 0);
    const kerf = Math.max(0, +$("#cutKerf").value || 3.2);
    const grain = $("#cutGrain").value;
    const price = Math.max(0, +$("#cutPrice").value || 5);
    const uw = Math.max(0, sw - tL - tR);
    const uh = Math.max(0, sh - tT - tB);
    return { sw, sh, tL, tR, tT, tB, kerf, grain, price, uw, uh };
  }

  function edgeSummary(part) {
    const labels = [];
    let mm = 0;
    if (part.edges.top) { labels.push("Góra"); mm += part.w; }
    if (part.edges.bottom) { labels.push("Dół"); mm += part.w; }
    if (part.edges.left) { labels.push("Lewo"); mm += part.h; }
    if (part.edges.right) { labels.push("Prawo"); mm += part.h; }
    return {
      text: labels.length ? labels.join(", ") : "brak",
      mb: (mm * part.qty) / 1000
    };
  }

  function renderPartsList(price) {
    const box = $("#cutPartsList");
    if (!state.parts.length) {
      box.innerHTML = `<div class="cut-item-sub" style="text-align:center;padding:1rem">Brak formatek na liście.</div>`;
      return;
    }

    box.innerHTML = state.parts.map((p) => {
      const ed = edgeSummary(p);
      return `
        <div class="cut-item">
          <div>
            <div class="cut-item-main">${p.w} × ${p.h} mm · ${p.qty} szt.${p.label ? ` · ${esc(p.label)}` : ""}</div>
            <div class="cut-item-sub">Okleina: ${esc(ed.text)} (${ed.mb.toFixed(2)} mb) · Cięcia: ${p.qty} (${(p.qty * price).toFixed(0)} zł)</div>
          </div>
          <div style="display:flex;gap:0.35rem">
            <button type="button" class="btn btn-ghost btn-sm" data-cut-dec="${p.id}">-</button>
            <button type="button" class="btn btn-ghost btn-sm" data-cut-inc="${p.id}">+</button>
            <button type="button" class="btn btn-ghost btn-sm" data-cut-del="${p.id}">×</button>
          </div>
        </div>
      `;
    }).join("");

    $$("[data-cut-del]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.parts = state.parts.filter((x) => x.id !== +btn.dataset.cutDel);
        renderCut();
      });
    });

    $$("[data-cut-inc]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = state.parts.find((x) => x.id === +btn.dataset.cutInc);
        if (item) { item.qty += 1; renderCut(); }
      });
    });

    $$("[data-cut-dec]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = state.parts.find((x) => x.id === +btn.dataset.cutDec);
        if (item && item.qty > 1) { item.qty -= 1; renderCut(); }
      });
    });
  }

  function tryPlace(sheet, item, cfg) {
    let best = null;
    const k = cfg.kerf;

    for (const opt of item.opts) {
      for (let i = 0; i < sheet.shelves.length; i += 1) {
        const s = sheet.shelves[i];
        const addW = s.usedW > 0 ? k + opt.w : opt.w;
        if (opt.h <= s.h && s.usedW + addW <= cfg.uw + 1e-6) {
          const x = cfg.tL + (s.usedW > 0 ? s.usedW + k : 0);
          const waste = (s.h - opt.h) * opt.w;
          if (!best || waste < best.waste) {
            best = { shelfIdx: i, isNew: false, x, y: s.y, w: opt.w, h: opt.h, rot: opt.rot, waste };
          }
        }
      }

      const prev = sheet.shelves[sheet.shelves.length - 1];
      const usedY = prev ? (prev.y - cfg.tT) + prev.h : 0;
      const addH = usedY > 0 ? k + opt.h : opt.h;
      if (opt.w <= cfg.uw + 1e-6 && usedY + addH <= cfg.uh + 1e-6) {
        const y = cfg.tT + (usedY > 0 ? usedY + k : 0);
        const waste = 1e6 + (cfg.uh - (usedY + addH)) * cfg.uw;
        if (!best || waste < best.waste) {
          best = { shelfIdx: sheet.shelves.length, isNew: true, x: cfg.tL, y, w: opt.w, h: opt.h, rot: opt.rot, waste };
        }
      }
    }

    if (!best) return false;

    if (best.isNew) {
      sheet.shelves.push({ y: best.y, h: best.h, usedW: best.w });
    } else {
      sheet.shelves[best.shelfIdx].usedW = (best.x - cfg.tL) + best.w;
    }

    sheet.placements.push({
      x: best.x,
      y: best.y,
      w: best.w,
      h: best.h,
      origW: item.w,
      origH: item.h,
      label: item.label,
      edges: item.edges,
      rot: best.rot
    });
    return true;
  }

  function packSheets(cfg, alerts) {
    const queue = [];

    state.parts.forEach((p) => {
      for (let i = 0; i < p.qty; i += 1) {
        const opts = [];
        if (p.w <= cfg.uw && p.h <= cfg.uh) {
          opts.push({ w: p.w, h: p.h, rot: false });
        }
        if (cfg.grain === "none" && p.h <= cfg.uw && p.w <= cfg.uh && p.w !== p.h) {
          opts.push({ w: p.h, h: p.w, rot: true });
        }
        if (!opts.length) {
          alerts.push(`Formatka ${p.w}×${p.h} mm nie mieści się w polu roboczym ${cfg.uw}×${cfg.uh} mm.`);
        } else {
          queue.push({ ...p, opts, mainDim: Math.max(p.w, p.h) });
        }
      }
    });

    queue.sort((a, b) => b.mainDim - a.mainDim || (b.w * b.h) - (a.w * a.h));

    const sheets = [];
    queue.forEach((item) => {
      let placed = false;
      for (const sh of sheets) {
        if (tryPlace(sh, item, cfg)) { placed = true; break; }
      }
      if (!placed) {
        const sh = { shelves: [], placements: [] };
        if (tryPlace(sh, item, cfg)) sheets.push(sh);
      }
    });

    return sheets;
  }

  function renderSheetSvg(sh, idx, cfg) {
    const pad = 65;
    const vbW = cfg.sw + pad * 2;
    const vbH = cfg.sh + pad * 2;
    const sw = Math.max(2.5, cfg.sw / 360);
    const dash = `${sw * 4} ${sw * 3}`;

    const trimRects = [];
    if (cfg.tT > 0) trimRects.push(`<rect x="0" y="0" width="${cfg.sw}" height="${cfg.tT}" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tB > 0) trimRects.push(`<rect x="0" y="${cfg.sh - cfg.tB}" width="${cfg.sw}" height="${cfg.tB}" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tL > 0) trimRects.push(`<rect x="0" y="${cfg.tT}" width="${cfg.tL}" height="${cfg.uh}" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tR > 0) trimRects.push(`<rect x="${cfg.sw - cfg.tR}" y="${cfg.tT}" width="${cfg.tR}" height="${cfg.uh}" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);

    const wasteRects = [];
    let maxBot = cfg.tT;
    sh.shelves.forEach((s) => {
      if (s.y + s.h > maxBot) maxBot = s.y + s.h;
      const rx = cfg.tL + s.usedW;
      const rw = (cfg.tL + cfg.uw) - rx;
      if (rw > 1) {
        wasteRects.push(`<rect x="${rx}" y="${s.y}" width="${rw}" height="${s.h}" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" stroke-width="${sw * 0.9}" stroke-dasharray="${dash}"/>`);
      }
    });
    const botH = (cfg.tT + cfg.uh) - maxBot;
    if (botH > 1) {
      wasteRects.push(`<rect x="${cfg.tL}" y="${maxBot}" width="${cfg.uw}" height="${botH}" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" stroke-width="${sw * 0.9}" stroke-dasharray="${dash}"/>`);
    }

    const pieces = sh.placements.map((p, n) => {
      const fs = Math.max(20, Math.min(44, Math.min(p.w, p.h) * 0.16));
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const ew = sw * 2.8;

      const eT = p.rot ? p.edges.left : p.edges.top;
      const eB = p.rot ? p.edges.right : p.edges.bottom;
      const eL = p.rot ? p.edges.bottom : p.edges.left;
      const eR = p.rot ? p.edges.top : p.edges.right;

      const edgeLines = [];
      if (eT) edgeLines.push(`<line x1="${p.x}" y1="${p.y}" x2="${p.x + p.w}" y2="${p.y}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eB) edgeLines.push(`<line x1="${p.x}" y1="${p.y + p.h}" x2="${p.x + p.w}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eL) edgeLines.push(`<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eR) edgeLines.push(`<line x1="${p.x + p.w}" y1="${p.y}" x2="${p.x + p.w}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);

      return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="rgba(37,137,232,0.28)" stroke="#38bdf8" stroke-width="${sw}"/>
        ${edgeLines.join("")}
        <text x="${cx}" y="${cy - fs * 0.2}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="monospace" font-weight="800" font-size="${fs}">${p.origW}×${p.origH}</text>
        <text x="${cx}" y="${cy + fs * 0.95}" text-anchor="middle" dominant-baseline="middle" fill="#bae6fd" font-family="sans-serif" font-size="${fs * 0.64}">#${n + 1} ${esc(p.label)}${p.rot ? " [90°]" : ""}</text>
      `;
    }).join("");

    return `
      <div class="cut-sheet">
        <div class="cut-sheet-head">
          <strong>Płyta #${idx + 1} (${cfg.sw}×${cfg.sh} mm)</strong>
          <span>Formatek: ${sh.placements.length} · Odjęcie: ${cfg.tL}/${cfg.tR}/${cfg.tT}/${cfg.tB} mm · Rzaz: ${cfg.kerf} mm</span>
        </div>
        <div class="cut-svg-wrap">
          <svg viewBox="${-pad} ${-pad} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${cfg.sw}" height="${cfg.sh}" fill="rgba(15,23,42,0.75)" stroke="#2589e8" stroke-width="${sw * 1.2}"/>
            ${trimRects.join("")}
            ${wasteRects.join("")}
            ${pieces}
            <text x="${cfg.sw / 2}" y="-20" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="32">${cfg.sw} mm</text>
            <text x="-20" y="${cfg.sh / 2}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="32" transform="rotate(-90 -20 ${cfg.sh / 2})">${cfg.sh} mm</text>
          </svg>
        </div>
        <div class="cut-legend">
          <span><i style="background:#38bdf8"></i>Formatka</span>
          <span><i style="background:#f59e0b"></i>Bok oklejany</span>
          <span><i style="background:rgba(239,68,68,0.35);border:1px dashed #ef4444"></i>Odjęcie krawędzi</span>
          <span><i style="background:rgba(148,163,184,0.25);border:1px dashed #94a3b8"></i>Odpad kreskowany</span>
        </div>
      </div>
    `;
  }

  function renderCut() {
    const cfg = readConfig();
    $("#cutUsableInfo").textContent = `Pole robocze: ${cfg.uw} × ${cfg.uh} mm`;
    renderPartsList(cfg.price);

    const alerts = [];
    if (cfg.uw <= 0 || cfg.uh <= 0) {
      alerts.push("Odjęcie krawędzi przekracza wymiar płyty — brak pola roboczego.");
    }

    const sheets = packSheets(cfg, alerts);
    const totalParts = state.parts.reduce((acc, p) => acc + p.qty, 0);
    const totalCost = totalParts * cfg.price;
    const totalEdgeMb = state.parts.reduce((acc, p) => acc + edgeSummary(p).mb, 0);

    $("#cutAlerts").innerHTML = alerts.map((a) => `<div class="cut-alert">${esc(a)}</div>`).join("");

    const grainLabel = cfg.grain === "h" ? "poziomo" : cfg.grain === "v" ? "pionowo" : "brak (90°)";
    $("#cutKpis").innerHTML = `
      <div class="cut-kpi"><small>Płyty bazowe</small><strong>${sheets.length} szt.</strong><span>${cfg.sw}×${cfg.sh} mm</span></div>
      <div class="cut-kpi"><small>Cięcia (1 form.=1)</small><strong>${totalParts} szt.</strong><span>${totalCost.toFixed(0)} zł</span></div>
      <div class="cut-kpi"><small>Okleina</small><strong>${totalEdgeMb.toFixed(2)} mb</strong><span>suma boków</span></div>
      <div class="cut-kpi"><small>Rzaz / słoje</small><strong>${cfg.kerf} mm</strong><span>${grainLabel}</span></div>
    `;

    $("#cutPrintMeta").textContent = `LEBERCUT | Płyta: ${cfg.sw}×${cfg.sh} mm | Odjęcie: L=${cfg.tL} P=${cfg.tR} G=${cfg.tT} D=${cfg.tB} mm | Rzaz: ${cfg.kerf} mm | Cięcia: ${totalParts} (${totalCost.toFixed(0)} zł) | Okleina: ${totalEdgeMb.toFixed(2)} mb`;

    $("#cutSheetsOut").innerHTML = sheets.length
      ? sheets.map((sh, i) => renderSheetSvg(sh, i, cfg)).join("")
      : `<div class="cut-item-sub" style="text-align:center;padding:1.5rem">Dodaj formatki, aby zobaczyć plan płyty.</div>`;

    $("#cutSummaryTable").innerHTML = `
      <table class="cut-table">
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Formatka (mm)</th>
            <th>Ilość</th>
            <th>Oklejane boki</th>
            <th>Okleina</th>
            <th>Cięcia / zł</th>
          </tr>
        </thead>
        <tbody>
          ${state.parts.map((p, idx) => {
            const ed = edgeSummary(p);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${p.w} × ${p.h}</strong>${p.label ? ` (${esc(p.label)})` : ""}</td>
                <td>${p.qty} szt.</td>
                <td>${esc(ed.text)}</td>
                <td>${ed.mb.toFixed(2)} mb</td>
                <td>${p.qty} (${(p.qty * cfg.price).toFixed(0)} zł)</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <td colspan="2"><strong>RAZEM</strong></td>
            <td><strong>${totalParts} szt.</strong></td>
            <td>—</td>
            <td><strong>${totalEdgeMb.toFixed(2)} mb</strong></td>
            <td><strong>${totalParts} (${totalCost.toFixed(0)} zł)</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderEqual() {
    const len = Math.max(0, +$("#eqLen").value || 0);
    const n = Math.max(1, Math.floor(+$("#eqN").value || 1));
    const kerf = Math.max(0, +$("#eqKerf").value || 3.2);
    const trim = Math.max(0, +$("#eqTrim").value || 0);
    const cuts = Math.max(0, n - 1);
    const loss = cuts * kerf;
    const net = len - trim - loss;
    const piece = net / n;

    $("#eqCutsHint").textContent = `Liczba cięć przelotowych: ${cuts}`;

    if (len <= 0 || net <= 0) {
      $("#eqOut").innerHTML = `<div class="cut-alert">Za mało materiału po odjęciu rzazów (${loss.toFixed(1)} mm) i odcięcia (${trim} mm).</div>`;
      return;
    }

    const marks = [];
    let cur = trim;
    for (let i = 0; i < cuts; i += 1) {
      cur += piece;
      marks.push(`Cięcie #${i + 1}: <strong>${cur.toFixed(1)} mm</strong>`);
      cur += kerf;
    }

    const segs = [];
    if (trim > 0) segs.push(`<div class="cut-bar-trim" style="width:${(trim / len) * 100}%">odpad</div>`);
    for (let i = 0; i < n; i += 1) {
      segs.push(`<div class="cut-bar-part" style="width:${(piece / len) * 100}%">${piece.toFixed(1)}</div>`);
      if (i < cuts) segs.push(`<div class="cut-bar-kerf" style="width:${Math.max(2, (kerf / len) * 100)}%"></div>`);
    }

    $("#eqOut").innerHTML = `
      <div class="cut-eq-box">
        <div class="cut-item-sub">Długość 1 równego kawałka</div>
        <div class="cut-eq-val">${piece.toFixed(2)} mm</div>
        <div class="cut-item-sub" style="margin-top:0.35rem">${n} części · ${cuts} cięć · strata rzazów: ${loss.toFixed(1)} mm (${kerf} mm/rzaz)</div>
        <div class="cut-bar">${segs.join("")}</div>
      </div>
      <div class="cut-row-3" style="margin-top:0.8rem;font-family:var(--mono);font-size:0.82rem">
        ${marks.map((m) => `<div class="cut-item">${m}</div>`).join("")}
      </div>
    `;
  }

  onReady(() => {
    $$("[data-cut-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.cutTab;
        $$("[data-cut-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
        $("#cutView").hidden = (mode !== "cut");
        $("#eqView").hidden = (mode !== "equal");
        if (mode === "equal") renderEqual();
      });
    });

    $("#cutPreset").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v === "meblowa") {
        $("#cutSw").value = 2800; $("#cutSh").value = 2070;
        $("#cutTL").value = 20; $("#cutTR").value = 20; $("#cutTT").value = 20; $("#cutTB").value = 20;
        $("#cutGrain").value = "h";
      } else if (v === "osb") {
        $("#cutSw").value = 2500; $("#cutSh").value = 1250;
        $("#cutTL").value = 0; $("#cutTR").value = 0; $("#cutTT").value = 0; $("#cutTB").value = 0;
        $("#cutGrain").value = "none";
      }
      renderCut();
    });

    $("#cutAddBtn").addEventListener("click", () => {
      const w = +$("#cutPW").value;
      const h = +$("#cutPH").value;
      const qty = Math.max(1, +$("#cutPQty").value || 1);
      if (!(w > 0 && h > 0)) return;
      state.parts.push({
        id: state.nextId++,
        w, h, qty,
        label: $("#cutPLabel").value.trim(),
        edges: {
          top: $("#edgeTop").checked,
          bottom: $("#edgeBot").checked,
          left: $("#edgeLeft").checked,
          right: $("#edgeRight").checked
        }
      });
      $("#cutPLabel").value = "";
      renderCut();
    });

    $("#cutSampleBtn").addEventListener("click", () => {
      $("#cutPreset").value = "meblowa";
      $("#cutPreset").dispatchEvent(new Event("change"));
      state.parts = [
        { id: state.nextId++, w: 720, h: 450, qty: 4, label: "Front", edges: { top: true, bottom: true, left: true, right: true } },
        { id: state.nextId++, w: 560, h: 400, qty: 3, label: "Półka", edges: { top: true, bottom: false, left: false, right: false } }
      ];
      renderCut();
    });

    $("#cutClearBtn").addEventListener("click", () => {
      state.parts = [];
      renderCut();
    });

    $("#cutPrintMode").addEventListener("change", (e) => {
      $("#cutSheetsOut").hidden = (e.target.value === "table");
    });

    $("#cutPrintBtn").addEventListener("click", () => window.print());

    ["cutSw", "cutSh", "cutTL", "cutTR", "cutTT", "cutTB", "cutKerf", "cutGrain", "cutPrice"].forEach((id) => {
      $("#" + id).addEventListener("input", renderCut);
      $("#" + id).addEventListener("change", renderCut);
    });

    ["eqLen", "eqN", "eqKerf", "eqTrim"].forEach((id) => {
      $("#" + id).addEventListener("input", renderEqual);
      $("#" + id).addEventListener("change", renderEqual);
    });

    renderCut();
    renderEqual();
  });
})();
