import { allItems } from './categories.js';

// Sum values across the given set of selected item ids for one feature.
// mode 'production' sums each item's tonnage (getValue); mode 'yield' sums
// each item's underlying crop yield in kg/ha (getYieldValue) instead —
// meaningful for a single selected crop, and just an additive convention
// (matching how 'production' already combines unrelated feedstocks) when
// more than one item is checked at once.
export function getSelectedTotal(feature, selectedItemIds, mode = 'production') {
  let total = 0;
  for (const id of selectedItemIds) {
    const item = allItems.find((i) => i.id === id);
    if (!item) continue;
    total += mode === 'yield' ? item.getYieldValue(feature) : item.getValue(feature);
  }
  return total;
}

// Max total across all features for the current selection. Used to scale
// the legend/color ramp to the active selection instead of a fixed range,
// since totals vary a lot depending on what's checked.
export function getMaxSelectedTotal(source, selectedItemIds, mode = 'production') {
  let max = 0;
  for (const feature of source.getFeatures()) {
    const value = getSelectedTotal(feature, selectedItemIds, mode);
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
