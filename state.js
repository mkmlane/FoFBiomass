import { categories } from './categories.js';

// Selection is tracked by item id across all categories (crop codes for
// the Crops category, e.g. 'wheat-straw' for Agricultural Residues, etc.)
// so the map just sums whatever's checked regardless of which category it
// came from.
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
    setItemSelected(item.id, selected);
  }
}

export function setAllItems(selected) {
  const allIds = categories.flatMap((c) => c.items.map((i) => i.id));
  state.selectedItems = selected ? new Set(allIds) : new Set();
}

export function categoryCheckState(category) {
  if (category.items.length === 0) return 'disabled';
  const checkedCount = category.items.filter((i) => state.selectedItems.has(i.id)).length;
  if (checkedCount === 0) return 'unchecked';
  if (checkedCount === category.items.length) return 'checked';
  return 'indeterminate';
}
