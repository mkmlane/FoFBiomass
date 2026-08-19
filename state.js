import { categories } from './categories.js';

// Selection is tracked by item id across all categories (e.g. 'wheat-straw'
// for Crop Residues, 'sugarcane' for Sugar & Starch, etc.) so the map just
// sums whatever's checked regardless of which category it came from.
// Items marked `pending` (no dataset connected yet) are never selectable.
const state = {
  selectedItems: new Set(['corn-stover']),
};

export function getSelectedItems() {
  return state.selectedItems;
}

export function setItemSelected(id, selected) {
  if (selected) {
    state.selectedItems.add(id);
  } else {
    state.selectedItems.delete(id);
  }
}

export function setCategorySelected(category, selected) {
  for (const item of category.items) {
    if (item.pending) continue;
    setItemSelected(item.id, selected);
  }
}

export function setAllItems(selected) {
  const allIds = categories.flatMap((c) => c.items.filter((i) => !i.pending).map((i) => i.id));
  state.selectedItems = selected ? new Set(allIds) : new Set();
}

export function categoryCheckState(category) {
  const selectableItems = category.items.filter((i) => !i.pending);
  if (selectableItems.length === 0) return 'disabled';
  const checkedCount = selectableItems.filter((i) => state.selectedItems.has(i.id)).length;
  if (checkedCount === 0) return 'unchecked';
  if (checkedCount === selectableItems.length) return 'checked';
  return 'indeterminate';
}
