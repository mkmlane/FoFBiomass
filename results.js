// Mocked-up stepwise supply curve, styled after the Billion-Ton Report's
// (e.g. Figure ES-5) cumulative supply curves: feedstocks are grouped into
// price tiers, and within a tier each feedstock is a distinct colored
// segment along the cumulative-quantity axis, forming a step. We only have
// a single flat price assumption right now (no price-tiered cost data),
// so this renders as one wide step made of colored segments — the same
// structure the real chart uses within one tier, just with one tier
// instead of several. Swap in real tiered pricing later and this will
// naturally grow into a proper staircase.

import { itemName } from './categories.js';

function colorForIndex(index, total) {
  const hue = Math.round((index * 360) / Math.max(total, 1));
  return `hsl(${hue}, 65%, 50%)`;
}

export function renderSupplyCurve(container, totals, pricePerTon) {
  const entries = Object.entries(totals).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    container.innerHTML = '<p class="field-note">No biomass in the current selection/query yet. Run a calculation on the Test Case page first.</p>';
    return;
  }

  entries.sort((a, b) => b[1] - a[1]);
  const totalSupply = entries.reduce((sum, [, value]) => sum + value, 0);

  const width = 720;
  const height = 420;
  const marginLeft = 80;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 55;
  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;

  const xMax = totalSupply * 1.05;
  const yMax = Math.max(pricePerTon * 1.5, pricePerTon + 25);

  const xScale = (v) => marginLeft + (v / xMax) * chartWidth;
  const yScale = (v) => marginTop + chartHeight - (v / yMax) * chartHeight;

  let cumulative = 0;
  const segments = entries.map(([id, value], i) => {
    const x0 = cumulative;
    cumulative += value;
    return {
      id,
      value,
      x0,
      x1: cumulative,
      color: colorForIndex(i, entries.length),
    };
  });

  const yTicks = [];
  for (let v = 0; v <= yMax; v += Math.ceil(yMax / 6 / 10) * 10 || 10) {
    yTicks.push(v);
  }

  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => (xMax * i) / xTickCount);

  const rects = segments
    .map(
      (s) => `<rect x="${xScale(s.x0).toFixed(1)}" y="${yScale(pricePerTon).toFixed(1)}"
        width="${(xScale(s.x1) - xScale(s.x0)).toFixed(1)}" height="${(yScale(0) - yScale(pricePerTon)).toFixed(1)}"
        fill="${s.color}" stroke="#ffffff" stroke-width="1">
        <title>${itemName(s.id)}: ${Math.round(s.value).toLocaleString()} tons</title>
      </rect>`
    )
    .join('');

  const yGrid = yTicks
    .map(
      (v) => `
      <line x1="${marginLeft}" y1="${yScale(v).toFixed(1)}" x2="${width - marginRight}" y2="${yScale(v).toFixed(1)}" stroke="#eee" stroke-width="1" />
      <text x="${marginLeft - 8}" y="${yScale(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="#555">$${v}</text>
    `
    )
    .join('');

  const xGrid = xTicks
    .map(
      (v) => `
      <text x="${xScale(v).toFixed(1)}" y="${height - marginBottom + 18}" text-anchor="middle" font-size="11" fill="#555">${Math.round(v).toLocaleString()}</text>
    `
    )
    .join('');

  const legend = segments
    .map(
      (s) => `<div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
        <span style="width:10px; height:10px; background:${s.color}; display:inline-block; border-radius:2px;"></span>
        <span style="flex:1;">${itemName(s.id)}</span>
        <span style="color:#777;">${Math.round(s.value).toLocaleString()}</span>
      </div>`
    )
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;">
      ${yGrid}
      <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${height - marginBottom}" stroke="#333" stroke-width="1" />
      <line x1="${marginLeft}" y1="${height - marginBottom}" x2="${width - marginRight}" y2="${height - marginBottom}" stroke="#333" stroke-width="1" />
      ${xGrid}
      ${rects}
      <text x="${marginLeft - 55}" y="${marginTop + chartHeight / 2}" text-anchor="middle" font-size="12" fill="#333" transform="rotate(-90 ${marginLeft - 55} ${marginTop + chartHeight / 2})">Farm-gate price ($/dry ton)</text>
      <text x="${marginLeft + chartWidth / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#333">Cumulative supply (metric tons)</text>
    </svg>
    <div style="margin-top:8px; max-height:140px; overflow-y:auto; font-size:12px;">
      ${legend}
    </div>
  `;
}
