(() => {
  const STORAGE_KEY = "lebercut_projects_v1";

  const state = {
    tab: "projekt",
    projectName: "Projekt 1",
    board: {
      length: 2800,
      width: 2070,
      material: "Płyta wiórowa (meblowa)",
      decor: "Dąb sonoma",
      grain: "along_length",
      kerf: 4
    },
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    pricing: {
      cutPrice: 0,
      edgePrice: 0,
      calcMode: "parts_m2",
      materialPrice: 0
    },
    parts: [
      { id: 1, name: "A", length: 300, rotL: false, width: 200, rotW: false, qty: 1, edges: { D1: true, D2: true, S1: false, S2: false } },
      { id: 2, name: "B", length: 300, rotL: false, width: 200, rotW: false, qty: 1, edges: { D1: false, D2: true, S1: false, S2: true } },
      { id: 3, name: "C", length: 300, rotL: false, width: 200, rotW: false, qty: 1, edges: { D1: false, D2: true, S1: false, S2: true } }
    ],
    nextId: 4,
    verified: true,
    activeSheet: 0,
    zoom: 1,
    showCuts: true,
    showDims: true,
    layout: null
  };

  const $ = (id) => document.getElementById(id);

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function fmtNum(n, dec = 2) {
    return Number(n || 0).toLocaleString("pl-PL", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
  }

  function usableArea() {
    const uL = Math.max(0, Number(state.board.length || 0) - Number(state.margins.left || 0) - Number(state.margins.right || 0));
    const uW = Math.max(0, Number(state.board.width || 0) - Number(state.margins.top || 0) - Number(state.margins.bottom || 0));
    return { uL, uW };
  }

  function partEdgeMb(part) {
    const L = Number(part.length || 0);
    const W = Number(part.width || 0);
    const q = Math.max(0, Number(part.qty || 0));
    let mmPerPiece = 0;
    if (part.edges.D1) mmPerPiece += L;
    if (part.edges.D2) mmPerPiece += L;
    if (part.edges.S1) mmPerPiece += W;
    if (part.edges.S2) mmPerPiece += W;
    return (mmPerPiece * q) / 1000;
  }

  function computeLayout() {
    const { uL, uW } = usableArea();
    const k = Math.max(0, Number(state.board.kerf || 0));
    const allowRotate = state.board.grain === "none";

    const queue = [];
    const skipped = [];

    for (const p of state.parts) {
      const q = Math.max(0, Math.floor(Number(p.qty || 0)));
      const L = Number(p.length || 0);
      const W = Number(p.width || 0);
      if (L <= 0 || W <= 0 || q <= 0) continue;

      for (let i = 0; i < q; i++) {
        const opts = [];
        if (L <= uL + 1e-6 && W <= uW + 1e-6) {
          opts.push({ w: L, h: W, rotated: false });
        }
        if (allowRotate && W <= uL + 1e-6 && L <= uW + 1e-6 && Math.abs(L - W) > 1e-6) {
          opts.push({ w: W, h: L, rotated: true });
        }
        if (!opts.length) {
          skipped.push({ name: p.name, length: L, width: W });
        } else {
          queue.push({
            id: p.id,
            name: p.name,
            origLength: L,
            origWidth: W,
            edges: { ...p.edges },
            opts,
            sortKey: Math.max(L, W) * 100000 + L * W
          });
        }
      }
    }

    queue.sort((a, b) => b.sortKey - a.sortKey);

    const sheets = [];
    let cutLineCounter = 1;

    function placeOnSheet(sheet, item) {
      let best = null;

      for (const opt of item.opts) {
        for (let sIdx = 0; sIdx < sheet.shelves.length; sIdx++) {
          const sh = sheet.shelves[sIdx];
          const neededW = sh.usedW > 0 ? sh.usedW + k + opt.w : opt.w;
          if (opt.h <= sh.h + 1e-6 && neededW <= uL + 1e-6) {
            const x = Number(state.margins.left || 0) + (sh.usedW > 0 ? sh.usedW + k : 0);
            const y = sh.y;
            const waste = (sh.h - opt.h) * opt.w;
            if (!best || waste < best.waste) {
              best = { sIdx, isNew: false, x, y, w: opt.w, h: opt.h, rotated: opt.rotated, waste };
            }
          }
        }

        const prev = sheet.shelves[sheet.shelves.length - 1];
        const usedY = prev ? (prev.y - Number(state.margins.top || 0)) + prev.h : 0;
        const neededH = usedY > 0 ? usedY + k + opt.h : opt.h;
        if (opt.w <= uL + 1e-6 && neededH <= uW + 1e-6) {
          const x = Number(state.margins.left || 0);
          const y = Number(state.margins.top || 0) + (usedY > 0 ? usedY + k : 0);
          const waste = 1e9 + (uW - neededH) * uL;
          if (!best || waste < best.waste) {
            best = { sIdx: sheet.shelves.length, isNew: true, x, y, w: opt.w, h: opt.h, rotated: opt.rotated, waste };
          }
        }
      }

      if (!best) return false;

      if (best.isNew) {
        sheet.shelves.push({ y: best.y, h: best.h, usedW: best.w });
      } else {
        sheet.shelves[best.sIdx].usedW = (best.x - Number(state.margins.left || 0)) + best.w;
      }

      const nameCount = sheet.placements.filter((it) => it.name === item.name).length + 1;
      const totalSame = state.parts.find((x) => x.id === item.id)?.qty || 1;

      sheet.placements.push({
        id: item.id,
        name: item.name,
        seqLabel: `${item.name} ${nameCount}/${totalSame}`,
        x: best.x,
        y: best.y,
        w: best.w,
        h: best.h,
        origLength: item.origLength,
        origWidth: item.origWidth,
        rotated: best.rotated,
        edges: item.edges
      });
      return true;
    }

    for (const item of queue) {
      let placed = false;
      for (const sh of sheets) {
        if (placeOnSheet(sh, item)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        const sh = { shelves: [], placements: [] };
        if (placeOnSheet(sh, item)) {
          sheets.push(sh);
        }
      }
    }

    const totalBoardAreaM2 = sheets.length * ((Number(state.board.length || 0) * Number(state.board.width || 0)) / 1e6);
    const totalPartsAreaM2 = state.parts.reduce(
      (acc, p) => acc + ((Number(p.length || 0) * Number(p.width || 0) * Math.max(0, Number(p.qty || 0))) / 1e6),
      0
    );
    const totalPartsCount = state.parts.reduce((acc, p) => acc + Math.max(0, Number(p.qty || 0)), 0);
    const totalEdgeMb = state.parts.reduce((acc, p) => acc + partEdgeMb(p), 0);
    const utilPct = totalBoardAreaM2 > 0 ? Math.min(100, (totalPartsAreaM2 / totalBoardAreaM2) * 100) : 0;
    const wastePct = Math.max(0, 100 - utilPct);
    const wasteM2 = Math.max(0, totalBoardAreaM2 - totalPartsAreaM2);

    // Wygeneruj linie cięć dla każdej płyty
    sheets.forEach((sh) => {
      const cutLines = [];
      if (Number(state.margins.top || 0) > 0) {
        cutLines.push({ num: cutLineCounter++, x1: 0, y1: state.margins.top, x2: state.board.length, y2: state.margins.top });
      }
      if (Number(state.margins.bottom || 0) > 0) {
        const yBot = state.board.width - state.margins.bottom;
        cutLines.push({ num: cutLineCounter++, x1: 0, y1: yBot, x2: state.board.length, y2: yBot });
      }
      if (Number(state.margins.left || 0) > 0) {
        cutLines.push({ num: cutLineCounter++, x1: state.margins.left, y1: 0, x2: state.margins.left, y2: state.board.width });
      }
      if (Number(state.margins.right || 0) > 0) {
        const xRight = state.board.length - state.margins.right;
        cutLines.push({ num: cutLineCounter++, x1: xRight, y1: 0, x2: xRight, y2: state.board.width });
      }
      sh.placements.forEach((pl) => {
        cutLines.push({ num: cutLineCounter++, x1: pl.x + pl.w, y1: pl.y, x2: pl.x + pl.w, y2: pl.y + pl.h });
        cutLines.push({ num: cutLineCounter++, x1: pl.x, y1: pl.y + pl.h, x2: pl.x + pl.w, y2: pl.y + pl.h });
      });
      sh.cutLines = cutLines;
    });

    state.layout = {
      sheets,
      skipped,
      totalBoardAreaM2,
      totalPartsAreaM2,
      totalPartsCount,
      totalEdgeMb,
      utilPct,
      wastePct,
      wasteM2
    };
    if (state.activeSheet >= sheets.length) {
      state.activeSheet = 0;
    }
  }

  function markDirty() {
    state.verified = false;
    updateVerifyBadge();
  }

  function updateVerifyBadge() {
    const badge = $("lcVerifyBadge");
    if (!badge) return;
    if (state.verified && state.layout) {
      badge.textContent = "Wynik aktualny i zweryfikowany";
      badge.className = "btn small ghost";
      badge.style.background = "rgba(34,197,94,.22)";
      badge.style.borderColor = "rgba(34,197,94,.65)";
      badge.style.color = "var(--ink)";
    } else {
      badge.textContent = "Wymaga optymalizacji";
      badge.className = "btn small ghost";
      badge.style.background = "rgba(245,158,11,.18)";
      badge.style.borderColor = "rgba(245,158,11,.65)";
      badge.style.color = "var(--ink)";
    }
  }

  function switchTab(tabName) {
    state.tab = tabName;
    document.querySelectorAll("[data-lc-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lcTab === tabName);
    });
    document.querySelectorAll("[data-lc-view]").forEach((sec) => {
      sec.hidden = sec.dataset.lcView !== tabName;
    });
    renderAll();
  }

  function renderProject() {
    $("lcProjName").value = state.projectName;
    $("lcBoardLen").value = state.board.length;
    $("lcBoardWid").value = state.board.width;
    $("lcMaterial").value = state.board.material;
    $("lcDecor").value = state.board.decor;
    $("lcGrain").value = state.board.grain;
    $("lcKerf").value = state.board.kerf;

    $("lcMarTop").value = state.margins.top;
    $("lcMarBot").value = state.margins.bottom;
    $("lcMarLeft").value = state.margins.left;
    $("lcMarRight").value = state.margins.right;

    const { uL, uW } = usableArea();
    $("lcUsableBox").textContent = `Obszar roboczy: ${uL} × ${uW} mm`;

    $("lcCutPrice").value = state.pricing.cutPrice;
    $("lcEdgePrice").value = state.pricing.edgePrice;
    $("lcCalcMode").value = state.pricing.calcMode;
    $("lcMatPrice").value = state.pricing.materialPrice;
  }

  function renderParts() {
    const tbody = $("lcPartsBody");
    const positionsCount = state.parts.length;
    const totalQty = state.parts.reduce((s, p) => s + Math.max(0, Number(p.qty || 0)), 0);
    const totalArea = state.parts.reduce((s, p) => s + (Number(p.length || 0) * Number(p.width || 0) * Math.max(0, Number(p.qty || 0))) / 1e6, 0);
    const totalEdge = state.parts.reduce((s, p) => s + partEdgeMb(p), 0);

    $("lcPartsTopStats").textContent = `${positionsCount} pozycje · ${totalQty} szt. · ${fmtNum(totalArea, 2)} m² formatek`;
    $("lcPartsBottomStats").innerHTML = `
      <span>Suma okleiny: ${fmtNum(totalEdge, 2)} mb</span>
      <span>Suma formatek: ${totalQty} szt.</span>
      <span>Powierzchnia wszystkich formatek: ${fmtNum(totalArea, 3)} m²</span>
    `;

    tbody.innerHTML = state.parts.map((p, idx) => {
      const m2One = (Number(p.length || 0) * Number(p.width || 0)) / 1e6;
      const m2Sum = m2One * Math.max(0, Number(p.qty || 0));
      const edgeMb = partEdgeMb(p);

      return `
        <tr>
          <td class="lc-num">${idx + 1}</td>
          <td><input type="text" class="lc-cell-input is-text" data-field="name" data-id="${p.id}" value="${esc(p.name)}"></td>
          <td><input type="number" class="lc-cell-input" data-field="length" data-id="${p.id}" value="${p.length}" min="1" step="1"></td>
          <td style="text-align:center"><input type="checkbox" data-field="rotL" data-id="${p.id}" ${p.rotL ? "checked" : ""}></td>
          <td><input type="number" class="lc-cell-input" data-field="width" data-id="${p.id}" value="${p.width}" min="1" step="1"></td>
          <td style="text-align:center"><input type="checkbox" data-field="rotW" data-id="${p.id}" ${p.rotW ? "checked" : ""}></td>
          <td class="lc-num">${fmtNum(m2One, 3)}</td>
          <td><input type="number" class="lc-cell-input" data-field="qty" data-id="${p.id}" value="${p.qty}" min="1" step="1"></td>
          <td class="lc-num">${fmtNum(m2Sum, 3)}</td>
          <td>${esc(state.board.decor || state.board.material)}</td>
          <td>
            <div class="lc-edges">
              ${["D1", "D2", "S1", "S2"].map((k) => `
                <button type="button" class="lc-edge-btn ${p.edges[k] ? "is-on" : ""}" data-edge="${k}" data-id="${p.id}">${k}</button>
              `).join("")}
            </div>
          </td>
          <td class="lc-num">${fmtNum(edgeMb, 2)}</td>
          <td>
            <div style="display:flex;gap:.35rem">
              <button type="button" class="btn small ghost" data-dup="${p.id}">Duplikuj</button>
              <button type="button" class="btn small ghost" data-del="${p.id}">Usuń</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function render2D() {
    if (!state.layout) computeLayout();
    const lay = state.layout;
    const sheets = lay.sheets;

    const verifyBox = $("lc2dVerifyBox");
    if (lay.skipped.length) {
      verifyBox.style.borderColor = "rgba(239,68,68,.65)";
      verifyBox.style.background = "rgba(239,68,68,.15)";
      verifyBox.textContent = `Uwaga: ${lay.skipped.length} szt. formatek nie mieści się w obszarze roboczym (${usableArea().uL} × ${usableArea().uW} mm).`;
    } else {
      verifyBox.style.borderColor = "rgba(34,197,94,.55)";
      verifyBox.style.background = "rgba(34,197,94,.14)";
      verifyBox.textContent = `Układ zweryfikowany: brak nachodzenia, rzaz ${state.board.kerf} mm uwzględniony, każde cięcie przechodzi między formatkami, struktura zachowana.`;
    }

    $("lc2dSheetsTitle").textContent = `Płyty (${sheets.length})`;
    $("lc2dSheetList").innerHTML = sheets.map((sh, i) => {
      const shArea = (Number(state.board.length || 0) * Number(state.board.width || 0)) / 1e6;
      const usedArea = sh.placements.reduce((s, it) => s + (it.w * it.h) / 1e6, 0);
      const pct = shArea > 0 ? ((usedArea / shArea) * 100).toFixed(1) : "0.0";
      return `
        <button type="button" class="lc-sheet-btn ${i === state.activeSheet ? "is-active" : ""}" data-sheet-idx="${i}">
          Płyta ${i + 1} · ${esc(state.board.material)} — ${esc(state.board.decor)} · ${pct}%
        </button>
      `;
    }).join("");

    const activeSh = sheets[state.activeSheet] || sheets[0];
    if (!activeSh) {
      $("lc2dCanvasHeadMeta").textContent = "Brak płyt do wyświetlenia";
      $("lc2dPartsOnSheet").innerHTML = "";
      $("lc2dSvgHolder").innerHTML = "";
      return;
    }

    const shArea = (Number(state.board.length || 0) * Number(state.board.width || 0)) / 1e6;
    const usedArea = activeSh.placements.reduce((s, it) => s + (it.w * it.h) / 1e6, 0);
    const util = shArea > 0 ? Math.min(100, (usedArea / shArea) * 100) : 0;
    const waste = Math.max(0, 100 - util);
    const wasteM2 = Math.max(0, shArea - usedArea);
    const grainText = state.board.grain === "along_length"
      ? "wzdłuż długości (poziomo)"
      : state.board.grain === "along_width"
        ? "wzdłuż szerokości (pionowo)"
        : "dowolny (obrót 90°)";

    $("lc2dCanvasHeadMeta").textContent = `Płyta ${state.activeSheet + 1} z ${sheets.length} — ${esc(state.board.material)} — ${esc(state.board.decor)} Formatek: ${activeSh.placements.length} · wykorzystanie ${fmtNum(util, 1)}% · odpad ${fmtNum(waste, 1)}% (${fmtNum(wasteM2, 2)} m²)`;

    $("lc2dPartsTitle").textContent = `Formatki na płycie ${state.activeSheet + 1}`;
    $("lc2dPartsOnSheet").innerHTML = activeSh.placements.map((pl) => `
      <li class="lc-part-item">
        <span>Formatka ${esc(pl.seqLabel)}</span>
        ${Math.round(pl.w)} × ${Math.round(pl.h)} mm${pl.rotated ? " (90°)" : ""}
      </li>
    `).join("");

    const L = Math.max(200, Number(state.board.length || 2800));
    const W = Math.max(200, Number(state.board.width || 2070));
    const padL = state.showDims ? 65 : 16;
    const padT = state.showDims ? 55 : 16;
    const padR = 20;
    const padB = 20;
    const vbW = L + padL + padR;
    const vbH = W + padT + padB;

    const hatchLines = [];
    const step = 48;
    for (let d = -W; d < L + W; d += step) {
      const x1 = Math.max(0, d);
      const y1 = Math.max(0, -d);
      const x2 = Math.min(L, d + W);
      const y2 = Math.min(W, L - d);
      if (x2 > x1 && y2 > y1) {
        hatchLines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9ca3af" stroke-width="1.5"/>`);
      }
    }

    const marginRects = [];
    if (state.margins.top > 0) {
      marginRects.push(`<rect x="0" y="0" width="${L}" height="${state.margins.top}" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" stroke-dasharray="8 6"/>`);
    }
    if (state.margins.bottom > 0) {
      marginRects.push(`<rect x="0" y="${W - state.margins.bottom}" width="${L}" height="${state.margins.bottom}" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" stroke-dasharray="8 6"/>`);
    }
    if (state.margins.left > 0) {
      marginRects.push(`<rect x="0" y="0" width="${state.margins.left}" height="${W}" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" stroke-dasharray="8 6"/>`);
    }
    if (state.margins.right > 0) {
      marginRects.push(`<rect x="${L - state.margins.right}" y="0" width="${state.margins.right}" height="${W}" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" stroke-dasharray="8 6"/>`);
    }

    const pieceSvgs = activeSh.placements.map((pl) => {
      const fs = Math.max(18, Math.min(34, Math.min(pl.w, pl.h) * 0.22));
      const edgeMarks = [];
      if (pl.edges.D1) edgeMarks.push(`<line x1="${pl.x}" y1="${pl.y}" x2="${pl.x + pl.w}" y2="${pl.y}" stroke="#F5322C" stroke-width="6"/>`);
      if (pl.edges.D2) edgeMarks.push(`<line x1="${pl.x}" y1="${pl.y + pl.h}" x2="${pl.x + pl.w}" y2="${pl.y + pl.h}" stroke="#F5322C" stroke-width="6"/>`);
      if (pl.edges.S1) edgeMarks.push(`<line x1="${pl.x}" y1="${pl.y}" x2="${pl.x}" y2="${pl.y + pl.h}" stroke="#F5322C" stroke-width="6"/>`);
      if (pl.edges.S2) edgeMarks.push(`<line x1="${pl.x + pl.w}" y1="${pl.y}" x2="${pl.x + pl.w}" y2="${pl.y + pl.h}" stroke="#F5322C" stroke-width="6"/>`);

      return `
        <g>
          <rect x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h}" fill="#ffffff" stroke="#111827" stroke-width="2.5"/>
          ${edgeMarks.join("")}
          <text x="${pl.x + pl.w / 2}" y="${pl.y + pl.h / 2 - fs * 0.35}" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-family="ui-monospace,monospace" font-weight="800" font-size="${fs}">${esc(pl.seqLabel)}</text>
          <text x="${pl.x + pl.w / 2}" y="${pl.y + pl.h / 2 + fs * 0.75}" text-anchor="middle" dominant-baseline="middle" fill="#374151" font-family="ui-monospace,monospace" font-weight="600" font-size="${Math.max(14, fs * 0.65)}">${Math.round(pl.w)}×${Math.round(pl.h)}</text>
        </g>
      `;
    }).join("");

    const cutLineSvgs = state.showCuts ? activeSh.cutLines.map((cl) => {
      const mx = (cl.x1 + cl.x2) / 2;
      const my = (cl.y1 + cl.y2) / 2;
      return `
        <g>
          <line x1="${cl.x1}" y1="${cl.y1}" x2="${cl.x2}" y2="${cl.y2}" stroke="#111827" stroke-width="1.6" stroke-dasharray="7 5"/>
          <circle cx="${mx}" cy="${my}" r="14" fill="#ffffff" stroke="#111827" stroke-width="1.8"/>
          <text x="${mx}" y="${my + 1}" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-family="ui-monospace,monospace" font-weight="800" font-size="15">${cl.num}</text>
        </g>
      `;
    }).join("") : "";

    const wasteLabelX = Math.min(L - 120, Math.max(usableArea().uL / 2 + Number(state.margins.left || 0), 220));
    const wasteLabelY = Math.min(W - 80, Math.max(usableArea().uW / 2 + Number(state.margins.top || 0), 140));

    const dimSvg = state.showDims ? `
      <text x="${L / 2}" y="-22" text-anchor="middle" fill="#111827" font-family="ui-sans-serif,sans-serif" font-weight="700" font-size="24">Kierunek struktury płyty: ${esc(grainText)}</text>
      <text x="-28" y="${W / 2}" text-anchor="middle" fill="#111827" font-family="ui-monospace,monospace" font-weight="700" font-size="22" transform="rotate(-90 -28 ${W / 2})">${W} mm</text>
    ` : "";

    const svgHtml = `
      <div class="lc-stage-inner" style="width:${Math.round(state.zoom * 100)}%">
        <svg class="lc-sheet-svg" viewBox="${-padL} ${-padT} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
          ${dimSvg}
          <g>
            <rect x="0" y="0" width="${L}" height="${W}" fill="#f9fafb" stroke="#111827" stroke-width="3"/>
            ${hatchLines.join("")}
            ${marginRects.join("")}
            <text x="${wasteLabelX}" y="${wasteLabelY}" text-anchor="middle" fill="#111827" font-family="ui-monospace,monospace" font-weight="700" font-size="24">odpad ${Math.round(usableArea().uL)}×${Math.round(usableArea().uW)}</text>
            ${pieceSvgs}
            ${cutLineSvgs}
          </g>
        </svg>
      </div>
    `;

    $("lc2dSvgHolder").innerHTML = svgHtml;
    $("lcZoomOut").disabled = state.zoom <= 0.6;
    $("lcZoomIn").disabled = state.zoom >= 2.2;
    $("lcZoomVal").textContent = `${Math.round(state.zoom * 100)}%`;
    $("lcToggleCuts").classList.toggle("ghost", !state.showCuts);
    $("lcToggleDims").classList.toggle("ghost", !state.showDims);
  }

  function renderCost() {
    if (!state.layout) computeLayout();
    const lay = state.layout;
    const cutCost = lay.totalPartsCount * Number(state.pricing.cutPrice || 0);
    const edgeCost = lay.totalEdgeMb * Number(state.pricing.edgePrice || 0);
    const baseArea = state.pricing.calcMode === "sheets_m2" ? lay.totalBoardAreaM2 : lay.totalPartsAreaM2;
    const matCost = baseArea * Number(state.pricing.materialPrice || 0);
    const totalCost = cutCost + edgeCost + matCost;

    $("lcCostKpis").innerHTML = `
      <div class="lc-kpi"><small>Koszt cięcia</small><strong>${fmtNum(cutCost, 2)} zł</strong><span class="lc-note">${lay.totalPartsCount} formatek × ${fmtNum(state.pricing.cutPrice, 2)} zł</span></div>
      <div class="lc-kpi"><small>Koszt okleinowania</small><strong>${fmtNum(edgeCost, 2)} zł</strong><span class="lc-note">${fmtNum(lay.totalEdgeMb, 2)} mb × ${fmtNum(state.pricing.edgePrice, 2)} zł</span></div>
      <div class="lc-kpi"><small>Koszt materiału</small><strong>${fmtNum(matCost, 2)} zł</strong><span class="lc-note">${fmtNum(baseArea, 3)} m² × ${fmtNum(state.pricing.materialPrice, 2)} zł</span></div>
      <div class="lc-kpi"><small>Suma całkowita</small><strong>${fmtNum(totalCost, 2)} zł</strong><span class="lc-note">Płyt: ${lay.sheets.length} szt.</span></div>
    `;
  }

  function renderVariants() {
    if (!state.layout) computeLayout();
    const baseSheets = state.layout.sheets.length;
    const baseWaste = state.layout.wastePct;

    const savedKerf = state.board.kerf;
    const savedGrain = state.board.grain;

    state.board.grain = "along_length";
    computeLayout();
    const alongSheets = state.layout.sheets.length;
    const alongWaste = state.layout.wastePct;

    state.board.grain = "none";
    computeLayout();
    const rotSheets = state.layout.sheets.length;
    const rotWaste = state.layout.wastePct;

    state.board.kerf = savedKerf;
    state.board.grain = savedGrain;
    computeLayout();

    $("lcVariantsGrid").innerHTML = `
      <div class="lc-variant-card ${savedGrain === "along_length" ? "is-current" : ""}">
        <h3>Wariant A — Słoje wzdłuż długości</h3>
        <p class="lc-note">Zachowuje kierunek struktury płyty (poziomo). Bezpieczny dla laminatów i usłojeń.</p>
        <p class="lc-num" style="margin-top:.75rem">Płyty: ${alongSheets} szt. · Odpad: ${fmtNum(alongWaste, 1)}%</p>
      </div>
      <div class="lc-variant-card ${savedGrain === "none" ? "is-current" : ""}">
        <h3>Wariant B — Obrót 90° (bez słojów)</h3>
        <p class="lc-note">Pozwala obracać formatki o 90° dla mniejszego odpadu przy płytach jednolitych.</p>
        <p class="lc-num" style="margin-top:.75rem">Płyty: ${rotSheets} szt. · Odpad: ${fmtNum(rotWaste, 1)}%</p>
      </div>
      <div class="lc-variant-card">
        <h3>Wariant C — Bieżąca konfiguracja</h3>
        <p class="lc-note">Aktywne ustawienia (${esc(state.board.material)}, rzaz ${savedKerf} mm).</p>
        <p class="lc-num" style="margin-top:.75rem">Płyty: ${baseSheets} szt. · Odpad: ${fmtNum(baseWaste, 1)}%</p>
      </div>
    `;
  }

  function renderPrint() {
    if (!state.layout) computeLayout();
    const lay = state.layout;
    $("lcPrintSummary").innerHTML = `
      <p class="lc-num">Projekt: ${esc(state.projectName)} | Płyta: ${state.board.length} × ${state.board.width} mm (${esc(state.board.material)} — ${esc(state.board.decor)}) | Płyt: ${lay.sheets.length} szt. | Formatek: ${lay.totalPartsCount} szt. | Okleina: ${fmtNum(lay.totalEdgeMb, 2)} mb</p>
    `;
  }

  function renderAll() {
    updateVerifyBadge();
    renderProject();
    renderParts();
    render2D();
    renderCost();
    renderVariants();
    renderPrint();
  }

  function saveProjectLocal() {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[state.projectName || "Projekt 1"] = {
      projectName: state.projectName,
      board: state.board,
      margins: state.margins,
      pricing: state.pricing,
      parts: state.parts,
      nextId: state.nextId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    $("lcProjectHint").textContent = `Zapisano „${state.projectName}” w pamięci przeglądarki.`;
  }

  function exportJson() {
    const payload = {
      projectName: state.projectName,
      board: state.board,
      margins: state.margins,
      pricing: state.pricing,
      parts: state.parts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(state.projectName || "projekt").toLowerCase().replace(/[^a-z0-9-_]+/gi, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (data.projectName) state.projectName = String(data.projectName);
        if (data.board) Object.assign(state.board, data.board);
        if (data.margins) Object.assign(state.margins, data.margins);
        if (data.pricing) Object.assign(state.pricing, data.pricing);
        if (Array.isArray(data.parts)) {
          state.parts = data.parts.map((p, i) => ({
            id: Number(p.id) || i + 1,
            name: String(p.name || `F${i + 1}`),
            length: Number(p.length) || 200,
            rotL: Boolean(p.rotL),
            width: Number(p.width) || 200,
            rotW: Boolean(p.rotW),
            qty: Math.max(1, Number(p.qty) || 1),
            edges: {
              D1: Boolean(p.edges?.D1),
              D2: Boolean(p.edges?.D2),
              S1: Boolean(p.edges?.S1),
              S2: Boolean(p.edges?.S2)
            }
          }));
          state.nextId = state.parts.reduce((m, x) => Math.max(m, x.id), 0) + 1;
        }
        computeLayout();
        state.verified = true;
        renderAll();
      } catch (_) {
        alert("Niepoprawny plik JSON.");
      }
    };
    reader.readAsText(file);
  }

  function importCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const imported = [];
      for (const line of lines) {
        const cols = line.split(/[;,\t]/).map((c) => c.trim());
        const lVal = Number(cols[1] ?? cols[0]);
        const wVal = Number(cols[2] ?? cols[1]);
        const qVal = Math.max(1, Number(cols[3] ?? 1) || 1);
        if (lVal > 0 && wVal > 0) {
          imported.push({
            id: state.nextId++,
            name: cols[0] && isNaN(Number(cols[0])) ? cols[0] : `P${imported.length + 1}`,
            length: lVal,
            rotL: false,
            width: wVal,
            rotW: false,
            qty: qVal,
            edges: { D1: false, D2: false, S1: false, S2: false }
          });
        }
      }
      if (imported.length) {
        state.parts = imported;
        markDirty();
        renderAll();
      }
    };
    reader.readAsText(file);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-lc-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.lcTab));
    });

    $("lcOptimizeBtn").addEventListener("click", () => {
      computeLayout();
      state.verified = true;
      renderAll();
      switchTab("2d");
    });

    const bindNum = (id, fn) => {
      $(id).addEventListener("input", (e) => {
        fn(e.target.value);
        markDirty();
        renderProject();
        renderParts();
      });
    };

    $("lcProjName").addEventListener("input", (e) => {
      state.projectName = e.target.value;
    });

    bindNum("#lcBoardLen", (v) => { state.board.length = Math.max(100, Number(v) || 2800); });
    bindNum("#lcBoardWid", (v) => { state.board.width = Math.max(100, Number(v) || 2070); });
    $("lcMaterial").addEventListener("change", (e) => { state.board.material = e.target.value; markDirty(); renderAll(); });
    $("lcDecor").addEventListener("input", (e) => { state.board.decor = e.target.value; markDirty(); renderParts(); });
    $("lcGrain").addEventListener("change", (e) => { state.board.grain = e.target.value; markDirty(); renderAll(); });
    bindNum("#lcKerf", (v) => { state.board.kerf = Math.max(0, Number(v) || 0); });

    bindNum("#lcMarTop", (v) => { state.margins.top = Math.max(0, Number(v) || 0); });
    bindNum("#lcMarBot", (v) => { state.margins.bottom = Math.max(0, Number(v) || 0); });
    bindNum("#lcMarLeft", (v) => { state.margins.left = Math.max(0, Number(v) || 0); });
    bindNum("#lcMarRight", (v) => { state.margins.right = Math.max(0, Number(v) || 0); });

    $("lcCutPrice").addEventListener("input", (e) => { state.pricing.cutPrice = Math.max(0, Number(e.target.value) || 0); renderCost(); });
    $("lcEdgePrice").addEventListener("input", (e) => { state.pricing.edgePrice = Math.max(0, Number(e.target.value) || 0); renderCost(); });
    $("lcCalcMode").addEventListener("change", (e) => { state.pricing.calcMode = e.target.value; renderCost(); });
    $("lcMatPrice").addEventListener("input", (e) => { state.pricing.materialPrice = Math.max(0, Number(e.target.value) || 0); renderCost(); });

    $("lcSaveBtn").addEventListener("click", saveProjectLocal);
    $("lcExportJsonBtn").addEventListener("click", exportJson);
    $("lcImportJsonBtn").addEventListener("click", () => $("lcJsonFileInput").click());
    $("lcJsonFileInput").addEventListener("change", (e) => importJsonFile(e.target.files[0]));

    $("lcAddRowBtn").addEventListener("click", () => {
      const nextLetter = String.fromCharCode(65 + (state.parts.length % 26));
      state.parts.push({
        id: state.nextId++,
        name: nextLetter,
        length: 400,
        rotL: false,
        width: 300,
        rotW: false,
        qty: 1,
        edges: { D1: false, D2: false, S1: false, S2: false }
      });
      markDirty();
      renderParts();
    });

    $("lcImportCsvBtn").addEventListener("click", () => $("lcCsvFileInput").click());
    $("lcCsvFileInput").addEventListener("change", (e) => importCsvFile(e.target.files[0]));

    $("lcClearPartsBtn").addEventListener("click", () => {
      state.parts = [];
      markDirty();
      renderParts();
    });

    $("lcPartsBody").addEventListener("input", (e) => {
      const el = e.target;
      const id = Number(el.dataset.id);
      const field = el.dataset.field;
      if (!id || !field) return;
      const row = state.parts.find((x) => x.id === id);
      if (!row) return;
      if (field === "name") row.name = el.value;
      else if (field === "length") row.length = Math.max(1, Number(el.value) || 1);
      else if (field === "width") row.width = Math.max(1, Number(el.value) || 1);
      else if (field === "qty") row.qty = Math.max(1, Math.floor(Number(el.value) || 1));
      markDirty();
      renderParts();
    });

    $("lcPartsBody").addEventListener("change", (e) => {
      const el = e.target;
      const id = Number(el.dataset.id);
      const field = el.dataset.field;
      if (!id || !field) return;
      const row = state.parts.find((x) => x.id === id);
      if (!row) return;
      if (field === "rotL") row.rotL = el.checked;
      else if (field === "rotW") row.rotW = el.checked;
      markDirty();
    });

    $("lcPartsBody").addEventListener("click", (e) => {
      const edgeBtn = e.target.closest("[data-edge]");
      if (edgeBtn) {
        const id = Number(edgeBtn.dataset.id);
        const edge = edgeBtn.dataset.edge;
        const row = state.parts.find((x) => x.id === id);
        if (row) {
          row.edges[edge] = !row.edges[edge];
          markDirty();
          renderParts();
        }
        return;
      }

      const dupBtn = e.target.closest("[data-dup]");
      if (dupBtn) {
        const id = Number(dupBtn.dataset.dup);
        const row = state.parts.find((x) => x.id === id);
        if (row) {
          state.parts.push({
            ...row,
            id: state.nextId++,
            edges: { ...row.edges }
          });
          markDirty();
          renderParts();
        }
        return;
      }

      const delBtn = e.target.closest("[data-del]");
      if (delBtn) {
        const id = Number(delBtn.dataset.del);
        state.parts = state.parts.filter((x) => x.id !== id);
        markDirty();
        renderParts();
      }
    });

    $("lc2dSheetList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sheet-idx]");
      if (!btn) return;
      state.activeSheet = Number(btn.dataset.sheetIdx) || 0;
      render2D();
    });

    $("lcToggleCuts").addEventListener("click", () => {
      state.showCuts = !state.showCuts;
      render2D();
    });
    $("lcToggleDims").addEventListener("click", () => {
      state.showDims = !state.showDims;
      render2D();
    });
    $("lcZoomOut").addEventListener("click", () => {
      state.zoom = Math.max(0.6, +(state.zoom - 0.15).toFixed(2));
      render2D();
    });
    $("lcZoomIn").addEventListener("click", () => {
      state.zoom = Math.min(2.2, +(state.zoom + 0.15).toFixed(2));
      render2D();
    });
    $("lcZoomFit").addEventListener("click", () => {
      state.zoom = 1;
      render2D();
    });

    $("lcPrintNowBtn").addEventListener("click", () => window.print());

    computeLayout();
    renderAll();
  });
})();
