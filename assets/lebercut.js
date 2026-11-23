/* LEBERCUT - logika rozkroju, oklejania, wyceny i równych cięć */
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
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));

  const state = {
    parts: [
      { id: 1, w: 800, h: 400, qty: 4, label: "Formatka A", edges: { top: true, bottom: true, left: false, right: false } },
      { id: 2, w: 600, h: 400, qty: 2, label: "Półka B", edges: { top: true, bottom: false, left: false, right: false } }
    ],
    nextId: 3
  };

  function getStockConfig() {
    const sw = Math.max(10, +$("#sw").value || 2800);
    const sh = Math.max(10, +$("#sh").value || 2070);
    const tL = Math.max(0, +$("#tL").value || 0);
    const tR = Math.max(0, +$("#tR").value || 0);
    const tT = Math.max(0, +$("#tT").value || 0);
    const tB = Math.max(0, +$("#tB").value || 0);
    const kerf = Math.max(0, +$("#kerf").value || 3.2);
    const grain = $("#grain").value;
    const pricePerPart = Math.max(0, +$("#pricePerPart").value || 5);
    const uw = Math.max(0, sw - tL - tR);
    const uh = Math.max(0, sh - tT - tB);
    return { sw, sh, tL, tR, tT, tB, kerf, grain, pricePerPart, uw, uh };
  }

  function getEdgeStats(part) {
    const names = [];
    let mm = 0;
    if (part.edges.top) { names.push("Góra"); mm += part.w; }
    if (part.edges.bottom) { names.push("Dół"); mm += part.w; }
    if (part.edges.left) { names.push("Lewo"); mm += part.h; }
    if (part.edges.right) { names.push("Prawo"); mm += part.h; }
    return {
      text: names.length ? names.join(", ") : "brak",
      mbTotal: (mm * part.qty) / 1000
    };
  }

  function renderParts() {
    const price = Math.max(0, +$("#pricePerPart").value || 5);
    const list = $("#partsList");
    if (!state.parts.length) {
      list.innerHTML = `<div class="part-meta" style="text-align:center;padding:1rem">Brak formatek. Dodaj formatkę powyżej.</div>`;
      return;
    }

    list.innerHTML = state.parts.map((p) => {
      const ed = getEdgeStats(p);
      return `
        <div class="part-row">
          <div>
            <div class="part-dim">${p.w} × ${p.h} mm · ${p.qty} szt. ${p.label ? `· <span style="color:var(--muted)">${esc(p.label)}</span>` : ""}</div>
            <div class="part-meta">Okleina: ${esc(ed.text)} (${ed.mbTotal.toFixed(2)} mb) · Cięcia: ${p.qty} (${(p.qty * price).toFixed(0)} zł)</div>
          </div>
          <div style="display:flex;gap:0.35rem">
            <button type="button" class="btn btn-ghost btn-sm" data-dec="${p.id}">-</button>
            <button type="button" class="btn btn-ghost btn-sm" data-inc="${p.id}">+</button>
            <button type="button" class="btn btn-danger btn-sm" data-del="${p.id}">×</button>
          </div>
        </div>
      `;
    }).join("");

    $$("[data-del]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.parts = state.parts.filter((x) => x.id !== +btn.dataset.del);
        renderAll();
      });
    });
    $$("[data-inc]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = state.parts.find((x) => x.id === +btn.dataset.inc);
        if (item) { item.qty += 1; renderAll(); }
      });
    });
    $$("[data-dec]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = state.parts.find((x) => x.id === +btn.dataset.dec);
        if (item && item.qty > 1) { item.qty -= 1; renderAll(); }
      });
    });
  }

  function packSheets(cfg, alerts) {
    const items = [];
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
          alerts.push(`Formatka ${p.w}×${p.h} mm nie mieści się w polu ${cfg.uw}×${cfg.uh} mm.`);
        } else {
          items.push({ ...p, opts, mainDim: Math.max(p.w, p.h) });
        }
      }
    });

    items.sort((a, b) => b.mainDim - a.mainDim || (b.w * b.h) - (a.w * a.h));

    const sheets = [];
    const newSheet = () => ({ shelves: [], placements: [] });

    items.forEach((item) => {
      let placed = false;
      for (const sh of sheets) {
        if (tryPlace(sh, item, cfg)) { placed = true; break; }
      }
      if (!placed) {
        const sh = newSheet();
        if (tryPlace(sh, item, cfg)) sheets.push(sh);
      }
    });

    return { sheets };
  }

  function tryPlace(sh, item, cfg) {
    let best = null;
    const k = cfg.kerf;
    for (const opt of item.opts) {
      for (let i = 0; i < sh.shelves.length; i += 1) {
        const s = sh.shelves[i];
        const addW = s.usedW > 0 ? k + opt.w : opt.w;
        if (opt.h <= s.h && s.usedW + addW <= cfg.uw + 1e-6) {
          const x = cfg.tL + (s.usedW > 0 ? s.usedW + k : 0);
          const waste = (s.h - opt.h) * opt.w;
          if (!best || waste < best.waste) {
            best = { shelfIdx: i, isNew: false, x, y: s.y, w: opt.w, h: opt.h, rot: opt.rot, waste };
          }
        }
      }
      const prev = sh.shelves[sh.shelves.length - 1];
      const usedY = prev ? (prev.y - cfg.tT) + prev.h : 0;
      const addH = usedY > 0 ? k + opt.h : opt.h;
      if (opt.w <= cfg.uw + 1e-6 && usedY + addH <= cfg.uh + 1e-6) {
        const y = cfg.tT + (usedY > 0 ? usedY + k : 0);
        const waste = 1e6 + (cfg.uh - (usedY + addH)) * cfg.uw;
        if (!best || waste < best.waste) {
          best = { shelfIdx: sh.shelves.length, isNew: true, x: cfg.tL, y, w: opt.w, h: opt.h, rot: opt.rot, waste };
        }
      }
    }

    if (!best) return false;

    if (best.isNew) {
      sh.shelves.push({ y: best.y, h: best.h, usedW: best.w });
    } else {
      sh.shelves[best.shelfIdx].usedW = (best.x - cfg.tL) + best.w;
    }

    sh.placements.push({
      x: best.x, y: best.y, w: best.w, h: best.h,
      origW: item.w, origH: item.h, label: item.label, edges: item.edges, rot: best.rot
    });
    return true;
  }

  function renderSheetSvg(sh, idx, cfg) {
    const pad = 65;
    const vbW = cfg.sw + pad * 2;
    const vbH = cfg.sh + pad * 2;
    const sw = Math.max(2.5, cfg.sw / 360);
    const dash = `${sw * 4} ${sw * 3}`;

    const trimSvg = [];
    if (cfg.tT > 0) trimSvg.push(`<rect x="0" y="0" width="${cfg.sw}" height="${cfg.tT}" fill="rgba(239,68,68,0.16)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tB > 0) trimSvg.push(`<rect x="0" y="${cfg.sh - cfg.tB}" width="${cfg.sw}" height="${cfg.tB}" fill="rgba(239,68,68,0.16)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tL > 0) trimSvg.push(`<rect x="0" y="${cfg.tT}" width="${cfg.tL}" height="${cfg.uh}" fill="rgba(239,68,68,0.16)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);
    if (cfg.tR > 0) trimSvg.push(`<rect x="${cfg.sw - cfg.tR}" y="${cfg.tT}" width="${cfg.tR}" height="${cfg.uh}" fill="rgba(239,68,68,0.16)" stroke="#ef4444" stroke-width="${sw}" stroke-dasharray="${dash}"/>`);

    const wasteSvg = [];
    let maxBot = cfg.tT;
    sh.shelves.forEach((s) => {
      if (s.y + s.h > maxBot) maxBot = s.y + s.h;
      const rx = cfg.tL + s.usedW;
      const rw = (cfg.tL + cfg.uw) - rx;
      if (rw > 1) {
        wasteSvg.push(`<rect x="${rx}" y="${s.y}" width="${rw}" height="${s.h}" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" stroke-width="${sw * 0.9}" stroke-dasharray="${dash}"/>`);
      }
    });
    const botWasteH = (cfg.tT + cfg.uh) - maxBot;
    if (botWasteH > 1) {
      wasteSvg.push(`<rect x="${cfg.tL}" y="${maxBot}" width="${cfg.uw}" height="${botWasteH}" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" stroke-width="${sw * 0.9}" stroke-dasharray="${dash}"/>`);
    }

    const piecesSvg = sh.placements.map((p, n) => {
      const fs = Math.max(20, Math.min(44, Math.min(p.w, p.h) * 0.16));
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const ew = sw * 2.8;

      const eT = p.rot ? p.edges.left : p.edges.top;
      const eB = p.rot ? p.edges.right : p.edges.bottom;
      const eL = p.rot ? p.edges.bottom : p.edges.left;
      const eR = p.rot ? p.edges.top : p.edges.right;

      const lines = [];
      if (eT) lines.push(`<line x1="${p.x}" y1="${p.y}" x2="${p.x + p.w}" y2="${p.y}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eB) lines.push(`<line x1="${p.x}" y1="${p.y + p.h}" x2="${p.x + p.w}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eL) lines.push(`<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);
      if (eR) lines.push(`<line x1="${p.x + p.w}" y1="${p.y}" x2="${p.x + p.w}" y2="${p.y + p.h}" stroke="#f59e0b" stroke-width="${ew}"/>`);

      return `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="rgba(37,137,232,0.28)" stroke="#38bdf8" stroke-width="${sw}"/>
        ${lines.join("")}
        <text x="${cx}" y="${cy - fs * 0.2}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="monospace" font-weight="800" font-size="${fs}">${p.origW}×${p.origH}</text>
        <text x="${cx}" y="${cy + fs * 0.95}" text-anchor="middle" dominant-baseline="middle" fill="#bae6fd" font-family="sans-serif" font-size="${fs * 0.64}">#${n + 1} ${esc(p.label)}${p.rot ? " [90°]" : ""}</text>
      `;
    }).join("");

    return `
      <div class="sheet-card">
        <div class="sheet-top">
          <strong>Płyta #${idx + 1} (${cfg.sw}×${cfg.sh} mm)</strong>
          <span>Formatek: ${sh.placements.length} · Odjęcie: ${cfg.tL}/${cfg.tR}/${cfg.tT}/${cfg.tB} mm · Rzaz: ${cfg.kerf} mm</span>
        </div>
        <div class="svg-box">
          <svg viewBox="${-pad} ${-pad} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${cfg.sw}" height="${cfg.sh}" fill="#0f1626" stroke="#2589e8" stroke-width="${sw * 1.2}"/>
            ${trimSvg.join("")}
            ${wasteSvg.join("")}
            ${piecesSvg}
            <text x="${cfg.sw / 2}" y="-20" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="32">${cfg.sw} mm</text>
            <text x="-20" y="${cfg.sh / 2}" text-anchor="middle" fill="#cbd5e1" font-family="monospace" font-size="32" transform="rotate(-90 -20 ${cfg.sh / 2})">${cfg.sh} mm</text>
          </svg>
        </div>
        <div class="legend">
          <span><i style="background:#38bdf8"></i>Formatka</span>
          <span><i style="background:#f59e0b"></i>Bok oklejany</span>
          <span><i style="background:rgba(239,68,68,0.35);border:1px dashed #ef4444"></i>Odjęcie krawędzi</span>
          <span><i style="background:rgba(148,163,184,0.25);border:1px dashed #94a3b8"></i>Odpad kreskowany</span>
        </div>
      </div>
    `;
  }

  function renderAll() {
    const cfg = getStockConfig();
    $("#usableInfo").textContent = `Pole robocze: ${cfg.uw} × ${cfg.uh} mm`;
    renderParts();

    const alerts = [];
    if (cfg.uw <= 0 || cfg.uh <= 0) {
      alerts.push("Odjęcie krawędzi jest za duże — brak pola roboczego na płycie.");
    }

    const { sheets } = packSheets(cfg, alerts);
    const totalParts = state.parts.reduce((acc, p) => acc + p.qty, 0);
    const totalCutCost = totalParts * cfg.pricePerPart;
    const totalEdgeMb = state.parts.reduce((acc, p) => acc + getEdgeStats(p).mbTotal, 0);

    $("#alerts").innerHTML = alerts.map((a) => `<div class="alert">${esc(a)}</div>`).join("");

    const grainTxt = cfg.grain === "h" ? "poziomo" : cfg.grain === "v" ? "pionowo" : "brak (90°)";
    $("#kpis").innerHTML = `
      <div class="kpi"><small>Płyty bazowe</small><strong>${sheets.length} szt.</strong><span>${cfg.sw}×${cfg.sh} mm</span></div>
      <div class="kpi"><small>Cięcia (1 form.=1)</small><strong>${totalParts} szt.</strong><span>${totalCutCost.toFixed(0)} zł</span></div>
      <div class="kpi"><small>Okleina</small><strong>${totalEdgeMb.toFixed(2)} mb</strong><span>suma boków</span></div>
      <div class="kpi"><small>Rzaz / słoje</small><strong>${cfg.kerf} mm</strong><span>${grainTxt}</span></div>
    `;

    $("#printMeta").textContent = `LEBERCUT | Płyta: ${cfg.sw}×${cfg.sh} mm | Odjęcie: L=${cfg.tL} P=${cfg.tR} G=${cfg.tT} D=${cfg.tB} mm | Rzaz: ${cfg.kerf} mm | Cięcia: ${totalParts} (${totalCutCost.toFixed(0)} zł) | Okleina: ${totalEdgeMb.toFixed(2)} mb`;

    $("#sheetsOut").innerHTML = sheets.length
      ? sheets.map((sh, i) => renderSheetSvg(sh, i, cfg)).join("")
      : `<div class="part-meta" style="text-align:center;padding:1.5rem">Dodaj formatki, aby wygenerować plan płyty.</div>`;

    $("#summaryTable").innerHTML = `
      <table>
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
            const ed = getEdgeStats(p);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${p.w} × ${p.h}</strong> ${p.label ? `(${esc(p.label)})` : ""}</td>
                <td>${p.qty} szt.</td>
                <td>${esc(ed.text)}</td>
                <td>${ed.mbTotal.toFixed(2)} mb</td>
                <td>${p.qty} (${(p.qty * cfg.pricePerPart).toFixed(0)} zł)</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <td colspan="2"><strong>RAZEM</strong></td>
            <td><strong>${totalParts} szt.</strong></td>
            <td>—</td>
            <td><strong>${totalEdgeMb.toFixed(2)} mb</strong></td>
            <td><strong>${totalParts} (${totalCutCost.toFixed(0)} zł)</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function calcEqual() {
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
      $("#eqResult").innerHTML = `<div class="alert">Za mało materiału po odjęciu rzazów (${loss.toFixed(1)} mm) i odcięcia (${trim} mm).</div>`;
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
    if (trim > 0) segs.push(`<div class="bar-t" style="width:${(trim / len) * 100}%">odpad</div>`);
    for (let i = 0; i < n; i += 1) {
      segs.push(`<div class="bar-p" style="width:${(piece / len) * 100}%">${piece.toFixed(1)}</div>`);
      if (i < cuts) segs.push(`<div class="bar-k" style="width:${Math.max(2, (kerf / len) * 100)}%"></div>`);
    }

    $("#eqResult").innerHTML = `
      <div class="eq-card">
        <div class="part-meta">Długość 1 równego kawałka</div>
        <div class="eq-big">${piece.toFixed(2)} mm</div>
        <div class="part-meta" style="margin-top:0.35rem">${n} części · ${cuts} cięć · strata rzazów: ${loss.toFixed(1)} mm (${kerf} mm/rzaz)</div>
        <div class="bar">${segs.join("")}</div>
      </div>
      <div class="grid-3" style="margin-top:0.8rem;font-family:var(--mono);font-size:0.82rem">
        ${marks.map((m) => `<div class="part-row">${m}</div>`).join("")}
      </div>
    `;
  }

  onReady(() => {
    $$(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isCut = btn.dataset.mode === "cut";
        $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        $("#mode-cut").hidden = !isCut;
        $("#mode-equal").hidden = isCut;
        if (!isCut) calcEqual();
      });
    });

    $("#presetMat").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v === "meblowa") {
        $("#sw").value = 2800; $("#sh").value = 2070;
        $("#tL").value = 20; $("#tR").value = 20; $("#tT").value = 20; $("#tB").value = 20;
        $("#grain").value = "h";
      } else if (v === "osb") {
        $("#sw").value = 2500; $("#sh").value = 1250;
        $("#tL").value = 0; $("#tR").value = 0; $("#tT").value = 0; $("#tB").value = 0;
        $("#grain").value = "none";
      }
      renderAll();
    });

    $("#addPartBtn").addEventListener("click", () => {
      const w = +$("#pW").value;
      const h = +$("#pH").value;
      const qty = Math.max(1, +$("#pQty").value || 1);
      if (!(w > 0 && h > 0)) return;
      state.parts.push({
        id: state.nextId++,
        w, h, qty,
        label: $("#pLabel").value.trim(),
        edges: {
          top: $("#eTop").checked,
          bottom: $("#eBot").checked,
          left: $("#eLeft").checked,
          right: $("#eRight").checked
        }
      });
      $("#pLabel").value = "";
      renderAll();
    });

    $("#sampleBtn").addEventListener("click", () => {
      $("#presetMat").value = "meblowa";
      $("#presetMat").dispatchEvent(new Event("change"));
      state.parts = [
        { id: state.nextId++, w: 720, h: 450, qty: 4, label: "Front", edges: { top: true, bottom: true, left: true, right: true } },
        { id: state.nextId++, w: 560, h: 400, qty: 3, label: "Półka", edges: { top: true, bottom: false, left: false, right: false } }
      ];
      renderAll();
    });

    $("#clearBtn").addEventListener("click", () => {
      state.parts = [];
      renderAll();
    });

    $("#printMode").addEventListener("change", (e) => {
      $("#sheetsOut").hidden = (e.target.value === "table");
    });

    $("#printBtn").addEventListener("click", () => window.print());

    ["sw", "sh", "tL", "tR", "tT", "tB", "kerf", "grain", "pricePerPart"].forEach((id) => {
      $("#" + id).addEventListener("input", renderAll);
      $("#" + id).addEventListener("change", renderAll);
    });

    ["eqLen", "eqN", "eqKerf", "eqTrim"].forEach((id) => {
      $("#" + id).addEventListener("input", calcEqual);
      $("#" + id).addEventListener("change", calcEqual);
    });

    renderAll();
    calcEqual();
  });
})();
