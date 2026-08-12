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
// color ramp reflects the totals for whatever is currently checked.
export const productionRange = { min: 0, max: 1 };

// Snap the max up to the next power of 10 (1e6, 1e7, ...) instead of an
// arbitrary number like 1,004,430, so the legend reads cleanly and doesn't
// jitter by a few percent every time the selection changes slightly.
function nextPowerOfTen(value) {
  return Math.pow(10, Math.ceil(Math.log10(value) - 1e-9));
}

export function recalculateRange(source, selectedItemIds) {
  productionRange.min = 0;
  const rawMax = getMaxSelectedTotal(source, selectedItemIds) || 1;
  productionRange.max = nextPowerOfTen(rawMax);
}

// SPAM2020 pixels are 5 arc-minutes (~10km at the equator) on a side. Each
// point feature is the center of its pixel, so styling draws a box of that
// size around it instead of a dot, matching the true grid resolution.
// Feature coordinates are already reprojected to Web Mercator meters by
// OpenLayers on load, so the box has to be built in lon/lat degrees (where
// the cell size is uniform) and then reprojected corner-by-corner, rather
// than offsetting the projected coordinates directly.
const CELL_SIZE_DEG = 5 / 60;
const HALF_CELL = CELL_SIZE_DEG / 2;

// Building each box means round-tripping through lon/lat and reprojecting 5
// corners, which is too expensive to redo on every render frame (pan/zoom)
// across ~980k features. Cache the computed polygon per feature so that
// cost is paid once, not on every repaint.
const cellGeometryCache = new WeakMap();

function cellPolygon(feature) {
  let polygon = cellGeometryCache.get(feature);
  if (!polygon) {
    const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());
    const corners = [
      [lon - HALF_CELL, lat - HALF_CELL],
      [lon + HALF_CELL, lat - HALF_CELL],
      [lon + HALF_CELL, lat + HALF_CELL],
      [lon - HALF_CELL, lat + HALF_CELL],
      [lon - HALF_CELL, lat - HALF_CELL],
    ].map((corner) => fromLonLat(corner));
    polygon = new Polygon([corners]);
    cellGeometryCache.set(feature, polygon);
  }
  return polygon;
}

export function productionStyleFn(selectedItemIds) {
  return function (feature) {
    const value = getSelectedTotal(feature, selectedItemIds);
    if (value <= 0) return null;
    const color = getColor(value, productionRange.min, productionRange.max, productionRamp);
    if (!color) return null;
    return new Style({
      geometry: cellPolygon(feature),
      fill: new Fill({ color }),
    });
  };
}

export function updateLegend(selectedItemIds) {
  const names = [...selectedItemIds].map(itemName);
  let title;
  if (names.length === 0) {
    title = 'Nothing selected';
  } else if (names.length > 4) {
    title = `Total — ${names.length} Biomass Types (metric tons)`;
  } else {
    title = `Total — ${names.join(', ')} (metric tons)`;
  }

  document.getElementById('legend-title').textContent = title;
  document.getElementById('legend-min').textContent = productionRange.min.toLocaleString();
  document.getElementById('legend-max').textContent = productionRange.max.toLocaleString();

  const gradientDiv = document.getElementById('legend-gradient');
  gradientDiv.style.background = `linear-gradient(to right, ${productionRamp.join(',')})`;
}
