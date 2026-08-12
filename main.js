// Update this file if adding extra user interface functionality

import { categories } from './categories.js';
import { createMap, createVectorLayer, spamSource, boundaryBaseLayer } from './map.js';
import { productionStyleFn, recalculateRange, updateLegend } from './layerstyle.js';
import {
  getSelectedItems,
  setItemSelected,
  setCategorySelected,
  setAllItems,
  categoryCheckState,
} from './state.js';

window.addEventListener('DOMContentLoaded', () => {
  const map = createMap();

  const productionLayer = createVectorLayer(productionStyleFn(getSelectedItems()));
  map.setLayers([boundaryBaseLayer, productionLayer]);

  const container = document.getElementById('crop-checkboxes');
  const categoryCheckboxes = new Map(); // category.id -> checkbox element
  const itemCheckboxes = new Map(); // item.id -> checkbox element

  categories.forEach((category) => {
    const section = document.createElement('div');
    section.className = 'category';

    const header = document.createElement('label');
    header.className = 'category-header';
    const categoryInput = document.createElement('input');
    categoryInput.type = 'checkbox';
    if (category.items.length === 0) {
      categoryInput.disabled = true;
    }
    categoryInput.addEventListener('change', () => {
      setCategorySelected(category, categoryInput.checked);
      syncCheckboxes();
      refresh();
    });
    header.appendChild(categoryInput);
    header.append(` ${category.label}`);
    if (category.items.length === 0) {
      const note = document.createElement('span');
      note.className = 'category-note';
      note.textContent = ' (dataset pending)';
      header.appendChild(note);
    }
    section.appendChild(header);
    categoryCheckboxes.set(category.id, categoryInput);

    if (category.items.length > 0) {
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'category-items';
      category.items.forEach((item) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.addEventListener('change', () => {
          setItemSelected(item.id, input.checked);
          syncCheckboxes();
          refresh();
        });
        label.appendChild(input);
        label.append(` ${item.name}`);
        itemsDiv.appendChild(label);
        itemCheckboxes.set(item.id, input);
      });
      section.appendChild(itemsDiv);
    }

    container.appendChild(section);
  });

  function syncCheckboxes() {
    const selected = getSelectedItems();
    itemCheckboxes.forEach((input, id) => {
      input.checked = selected.has(id);
    });
    categories.forEach((category) => {
      const input = categoryCheckboxes.get(category.id);
      if (category.items.length === 0) return;
      const state = categoryCheckState(category);
      input.checked = state === 'checked';
      input.indeterminate = state === 'indeterminate';
    });
  }

  document.getElementById('select-all-crops').addEventListener('click', () => {
    setAllItems(true);
    syncCheckboxes();
    refresh();
  });

  document.getElementById('select-no-crops').addEventListener('click', () => {
    setAllItems(false);
    syncCheckboxes();
    refresh();
  });

  function refresh() {
    const selected = getSelectedItems();
    recalculateRange(spamSource, selected);
    productionLayer.setStyle(productionStyleFn(selected));
    updateLegend(selected);
  }

  syncCheckboxes();
  spamSource.on('featuresloadend', refresh);
});
