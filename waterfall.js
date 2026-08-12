// Generic waterfall chart renderer (plain SVG, no new dependency) plus
// dummy LCA/economic datasets. Real per-stage values (from actual LCA and
// techno-economic models) can replace the dummy data later without
// touching the rendering code.

function colorFor(stage) {
  if (stage.isTotal) return '#4a6fa5';
  return stage.value >= 0 ? '#c0392b' : '#2e8b57';
}

export function renderWaterfallChart(container, stages, unitLabel) {
  const width = 640;
  const height = 360;
  const marginLeft = 70;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 70;
  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;

  let cumulative = 0;
  const bars = stages.map((stage) => {
    let from;
    let to;
    if (stage.isTotal) {
      from = 0;
      to = cumulative;
    } else {
      from = cumulative;
      cumulative += stage.value;
      to = cumulative;
    }
    return { ...stage, from, to };
  });

  const allValues = bars.flatMap((b) => [b.from, b.to]);
  const yMin = Math.min(0, ...allValues);
  const yMax = Math.max(0, ...allValues);
  const yPad = (yMax - yMin) * 0.1 || 1;
  const yScaleMin = yMin - yPad;
  const yScaleMax = yMax + yPad;

  const yScale = (v) => marginTop + chartHeight - ((v - yScaleMin) / (yScaleMax - yScaleMin)) * chartHeight;
  const bandWidth = chartWidth / bars.length;
  const barWidth = bandWidth * 0.6;

  const zeroY = yScale(0).toFixed(1);

  const yTicks = 5;
  const yGrid = Array.from({ length: yTicks + 1 }, (_, i) => yScaleMin + ((yScaleMax - yScaleMin) * i) / yTicks)
    .map(
      (v) => `
      <line x1="${marginLeft}" y1="${yScale(v).toFixed(1)}" x2="${width - marginRight}" y2="${yScale(v).toFixed(1)}" stroke="#eee" stroke-width="1" />
      <text x="${marginLeft - 8}" y="${yScale(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#555">${Math.round(v).toLocaleString()}</text>
    `
    )
    .join('');

  const barsSvg = bars
    .map((b, i) => {
      const x = marginLeft + i * bandWidth + (bandWidth - barWidth) / 2;
      const yTop = yScale(Math.max(b.from, b.to)).toFixed(1);
      const yBottom = yScale(Math.min(b.from, b.to)).toFixed(1);
      const rectHeight = Math.max(1, yBottom - yTop);
      const labelY = yTop - 6;
      const valueText = b.isTotal ? Math.round(b.to).toLocaleString() : (b.value >= 0 ? '+' : '') + Math.round(b.value).toLocaleString();

      let connector = '';
      if (i > 0) {
        const prevX = marginLeft + (i - 1) * bandWidth + (bandWidth - barWidth) / 2 + barWidth;
        const connectY = yScale(b.from).toFixed(1);
        connector = `<line x1="${prevX}" y1="${connectY}" x2="${x}" y2="${connectY}" stroke="#999" stroke-width="1" stroke-dasharray="3,3" />`;
      }

      return `
        ${connector}
        <rect x="${x.toFixed(1)}" y="${yTop}" width="${barWidth.toFixed(1)}" height="${rectHeight.toFixed(1)}" fill="${colorFor(b)}" />
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="11" fill="#333">${valueText}</text>
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${height - marginBottom + 14}" text-anchor="end" font-size="11" fill="#333" transform="rotate(-30 ${(x + barWidth / 2).toFixed(1)} ${height - marginBottom + 14})">${b.label}</text>
      `;
    })
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;">
      ${yGrid}
      <line x1="${marginLeft}" y1="${zeroY}" x2="${width - marginRight}" y2="${zeroY}" stroke="#333" stroke-width="1" />
      <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${height - marginBottom}" stroke="#333" stroke-width="1" />
      ${barsSvg}
      <text x="${marginLeft - 55}" y="${marginTop + chartHeight / 2}" text-anchor="middle" font-size="12" fill="#333" transform="rotate(-90 ${marginLeft - 55} ${marginTop + chartHeight / 2})">${unitLabel}</text>
    </svg>
  `;
}

export const dummyLcaStages = [
  { label: 'Feedstock Production', value: 50 },
  { label: 'Transport', value: 15 },
  { label: 'Processing', value: 80 },
  { label: 'Avoided Emissions', value: -120 },
  { label: 'Carbon Sequestration', value: -200 },
  { label: 'Net GHG Emissions', value: 0, isTotal: true },
];

export const dummyEconStages = [
  { label: 'Feedstock Cost', value: -40 },
  { label: 'Transport Cost', value: -12 },
  { label: 'Processing Cost', value: -35 },
  { label: 'Operating Cost', value: -20 },
  { label: 'Product Revenue', value: 150 },
  { label: 'Net Margin', value: 0, isTotal: true },
];
