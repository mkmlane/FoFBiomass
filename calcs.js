import { allItems } from './categories.js';

// Sum values (metric tons) across the given set of selected item ids for
// one feature. Each item (crop or derived residue) knows how to compute
// its own value from the feature.
export function getSelectedTotal(feature, selectedItemIds) {
  let total = 0;
  for (const id of selectedItemIds) {
    const item = allItems.find((i) => i.id === id);
    if (item) total += item.getValue(feature);
  }
  return total;
}

// Max total across all features for the current selection. Used to scale
// the legend/color ramp to the active selection instead of a fixed range,
// since totals vary a lot depending on what's checked.
export function getMaxSelectedTotal(source, selectedItemIds) {
  let max = 0;
  for (const feature of source.getFeatures()) {
    const value = getSelectedTotal(feature, selectedItemIds);
    if (value > max) max = value;
  }
  return max;
}

export function clamp(value, low, high) {
  return Math.max(low, Math.min(value, high));
}

export function getColor(value, min, max, ramp) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (max <= min) {
    return ramp[0];
  }
  const f = Math.pow(clamp((value - min) / (max - min), 0, 1), 1 / 2);
  const index = Math.round(f * (ramp.length - 1));
  return ramp[index];
}
