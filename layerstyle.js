// If you want to change how the production map looks, go here
// Colormap guide: https://www.npmjs.com/package/colormap

import colormap from 'colormap';
import { Style, Fill } from 'ol/style';
import Polygon from 'ol/geom/Polygon.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { getSelectedTotal, getMaxSelectedTotal, getColor } from './calcs.js';
import { itemName } from './categories.js';

export const productionRamp = colormap({
  colormap: 'jet',
  nshades: 100,
  alpha: 0.6,
  format: 'rgbaString',
});

// Mutable range, recalculated whenever the crop selection changes so the
// color ramp reflects the totals for whatever is currently checked. When
// `auto` is true, max is recomputed from the data on every refresh; when
// the user sets a custom max (e.g. because the auto power-of-10 scale is
// too high to show contrast in their region of interest), `auto` flips to
// false and the manual value sticks until they reset it.
export const productionRange = { min: 0, max: 1, auto: true };

// Snap the max up to the next power of 10 (1e6, 1e7, ...) instead of an
// arbitrary number like 1,004,430, so the legend reads cleanly and doesn't
// jitter by a few percent every time the selection changes slightly.
function nextPowerOfTen(value) {
  return Math.pow(10, Math.ceil(Math.log10(value) - 1e-9));
}

export function recalculateRange(source, selectedItemIds, mode = 'production') {
  productionRange.min = 0;
  if (!productionRange.auto) return;
  const rawMax = getMaxSelectedTotal(source, selectedItemIds, mode) || 1;
  productionRange.max = nextPowerOfTen(rawMax);
}

export function setUserMax(value) {
  if (!Number.isFinite(value) || value <= 0) return;
  productionRange.max = value;
  productionRange.auto = false;
}

export function resetAutoMax() {
  productionRange.auto = true;
}

// SPAM2020 pixels are 5 arc-minutes (~10km at the equator) on a side. Each
// point feature is the center of its pixel, so styling draws a box of that
// size around it instead of a dot, matching the true grid resolution.
// Feature coordinates are already reprojected to Web Mercator meters by
// OpenLayers on load, so the box has to be built in lon/lat degrees (where
// the cell size is uniform) and then reprojected corner-by-corner, rather
// than offsetting the projected coordinates directly.
export const NATIVE_CELL_SIZE_DEG = 5 / 60;

// Aggregated (user-resolution) features carry their own cell size via the
// '_cellSizeDeg' property (see aggregate.js); native SPAM features don't
// have that property, so they fall back to the native pixel size.
function cellSizeDegOf(feature) {
  return feature.get('_cellSizeDeg') || NATIVE_CELL_SIZE_DEG;
}

// Building each box means round-tripping through lon/lat and reprojecting 5
// corners, which is too expensive to redo on every render frame (pan/zoom)
// across hundreds of thousands of features. Cache the computed polygon per
// feature so that cost is paid once, not on every repaint.
const cellGeometryCache = new WeakMap();

function cellPolygon(feature) {
  let polygon = cellGeometryCache.get(feature);
  if (!polygon) {
    const halfCell = cellSizeDegOf(feature) / 2;
    const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());
    const corners = [
      [lon - halfCell, lat - halfCell],
      [lon + halfCell, lat - halfCell],
      [lon + halfCell, lat + halfCell],
      [lon - halfCell, lat + halfCell],
      [lon - halfCell, lat - halfCell],
    ].map((corner) => fromLonLat(corner));
    polygon = new Polygon([corners]);
    cellGeometryCache.set(feature, polygon);
  }
  return polygon;
}

export function productionStyleFn(selectedItemIds, mode = 'production') {
  return function (feature) {
    const value = getSelectedTotal(feature, selectedItemIds, mode);
    if (value <= 0) return null;
    const color = getColor(value, productionRange.min, productionRange.max, productionRamp);
    if (!color) return null;
    return new Style({
      geometry: cellPolygon(feature),
      fill: new Fill({ color }),
    });
  };
}

function legendTitleText(selectedItemIds, mode = 'production') {
  const names = [...selectedItemIds].map(itemName);
  const label = mode === 'yield' ? 'Yields' : 'Production';
  const unit = mode === 'yield' ? 'kg/ha' : 'metric tons';
  if (names.length === 0) return 'Nothing selected';
  if (names.length > 4) return `${label} — ${names.length} Biomass Types (${unit})`;
  return `${label} — ${names.join(', ')} (${unit})`;
}

export function updateLegend(selectedItemIds, mode = 'production') {
  document.getElementById('legend-title').textContent = legendTitleText(selectedItemIds, mode);
  document.getElementById('legend-min').textContent = productionRange.min.toLocaleString();

  const maxInput = document.getElementById('legend-max-input');
  if (document.activeElement !== maxInput) {
    maxInput.value = productionRange.max;
  }

  const gradientDiv = document.getElementById('legend-gradient');
  gradientDiv.style.background = `linear-gradient(to right, ${productionRamp.join(',')})`;
}

// Read-only mirror of the main legend for secondary maps (e.g. the test
// case page), targeting elements named `${idPrefix}-title/min/max/gradient`.
export function updateSimpleLegend(idPrefix, selectedItemIds, mode = 'production') {
  const title = document.getElementById(`${idPrefix}-title`);
  const min = document.getElementById(`${idPrefix}-min`);
  const max = document.getElementById(`${idPrefix}-max`);
  const gradient = document.getElementById(`${idPrefix}-gradient`);
  if (!title || !min || !max || !gradient) return;

  title.textContent = legendTitleText(selectedItemIds, mode);
  min.textContent = productionRange.min.toLocaleString();
  max.textContent = productionRange.max.toLocaleString();
  gradient.style.background = `linear-gradient(to right, ${productionRamp.join(',')})`;
}
