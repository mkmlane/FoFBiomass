// Lets the user re-bin the native 5 arc-min SPAM grid into coarser cells
// (entered as arc-minutes or km) by summing crop/residue values within
// each coarser cell — the same approach AgReUSE uses to resample SPAM onto
// Smerald's coarser grid (see spam_smer.groupby(...).sum() in its
// make_layers.ipynb), just with a user-chosen cell size instead of a fixed
// one.

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { NATIVE_CELL_SIZE_DEG } from './layerstyle.js';

export const MIN_ARC_MIN = 5; // native SPAM2020 resolution; can't go finer
export const MAX_KM = 100; // practical limit for shipping biomass to a biorefinery
const KM_PER_DEG_EQUATOR = 111.32; // equatorial approximation, not latitude-adjusted

export function degFromValue(value, unit) {
  return unit === 'km' ? value / KM_PER_DEG_EQUATOR : value / 60;
}

export function valueFromDeg(deg, unit) {
  return unit === 'km' ? deg * KM_PER_DEG_EQUATOR : deg * 60;
}

const MIN_DEG = MIN_ARC_MIN / 60;
const MAX_DEG = MAX_KM / KM_PER_DEG_EQUATOR;

export function clampResolutionDeg(deg) {
  return Math.min(Math.max(deg, MIN_DEG), MAX_DEG);
}

// Sums the given crop codes across all raw features that fall into each
// cellSizeDeg x cellSizeDeg bin, returning one synthetic ol/Feature per
// occupied bin (Point geometry at the bin center, plus a '_cellSizeDeg'
// property so the box-drawing style knows how big to draw it).
export function aggregateFeatures(rawFeatures, cellSizeDeg, cropCodes) {
  const bins = new Map();
  for (const feature of rawFeatures) {
    const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());
    const bx = Math.floor(lon / cellSizeDeg);
    const by = Math.floor(lat / cellSizeDeg);
    const key = bx + '_' + by;
    let bin = bins.get(key);
    if (!bin) {
      bin = { bx, by, sums: {} };
      bins.set(key, bin);
    }
    for (const code of cropCodes) {
      const value = feature.get(code);
      if (value) bin.sums[code] = (bin.sums[code] || 0) + value;
    }
  }

  const features = [];
  bins.forEach((bin) => {
    const centerLon = (bin.bx + 0.5) * cellSizeDeg;
    const centerLat = (bin.by + 0.5) * cellSizeDeg;
    const feature = new Feature({
      geometry: new Point(fromLonLat([centerLon, centerLat])),
      ...bin.sums,
    });
    feature.set('_cellSizeDeg', cellSizeDeg, true);
    features.push(feature);
  });
  return features;
}

export function isNativeResolution(cellSizeDeg) {
  return cellSizeDeg <= NATIVE_CELL_SIZE_DEG * 1.0001;
}
