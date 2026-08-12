// Update this file if adding extra user interface functionality

import VectorSource from 'ol/source/Vector.js';
import crops from './crops.json';
import { categories } from './categories.js';
import { createMap, createVectorLayer, spamSource, boundaryBaseLayer, stateProvinceLayer } from './map.js';
import { productionStyleFn, recalculateRange, updateLegend, updateSimpleLegend, setUserMax, resetAutoMax } from './layerstyle.js';
import {
  getSelectedItems,
  setItemSelected,
  setCategorySelected,
  setAllItems,
  categoryCheckState,
} from './state.js';
import { degFromValue, valueFromDeg, clampResolutionDeg, aggregateFeatures, isNativeResolution } from './aggregate.js';
import { createTestCaseMap, totalWithinRadius, renderResults, renderFuelProduction, locationLabel } from './testcase.js';
import { renderSupplyCurve } from './results.js';
import { renderWaterfallChart, dummyLcaStages, dummyEconStages } from './waterfall.js';

const cropCodes = crops.map((c) => c.code);

window.addEventListener('DOMContentLoaded', () => {
  const map = createMap();

  const productionLayer = createVectorLayer(productionStyleFn(getSelectedItems()));
  map.setLayers([boundaryBaseLayer, stateProvinceLayer, productionLayer]);

  let currentSource = spamSource;
  let testCase = null; // lazily created once the Test Case page is first shown

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

  const resolutionValueInput = document.getElementById('resolution-value');
  const resolutionUnitSelect = document.getElementById('resolution-unit');

  function applyResolution() {
    if (spamSource.getFeatures().length === 0) return; // native data not loaded yet

    const rawValue = parseFloat(resolutionValueInput.value);
    if (!Number.isFinite(rawValue)) return;

    const unit = resolutionUnitSelect.value;
    const requestedDeg = degFromValue(rawValue, unit);
    const clampedDeg = clampResolutionDeg(requestedDeg);
    resolutionValueInput.value = Math.round(valueFromDeg(clampedDeg, unit) * 100) / 100;

    if (isNativeResolution(clampedDeg)) {
      currentSource = spamSource;
    } else {
      const aggregated = aggregateFeatures(spamSource.getFeatures(), clampedDeg, cropCodes);
      currentSource = new VectorSource({ features: aggregated });
    }
    productionLayer.setSource(currentSource);
    if (testCase) testCase.updateProductionLayer(currentSource, productionStyleFn(getSelectedItems()));
  }

  document.getElementById('apply-resolution').addEventListener('click', () => {
    applyResolution();
    refresh();
  });

  function refresh() {
    const selected = getSelectedItems();
    recalculateRange(currentSource, selected);
    productionLayer.setStyle(productionStyleFn(selected));
    updateLegend(selected);
    updateSimpleLegend('testcase-legend', selected);
    if (testCase) testCase.updateProductionLayer(currentSource, productionStyleFn(selected));
  }

  document.getElementById('legend-max-input').addEventListener('change', (e) => {
    setUserMax(parseFloat(e.target.value));
    refresh();
  });

  document.getElementById('legend-max-reset').addEventListener('click', () => {
    resetAutoMax();
    refresh();
  });

  syncCheckboxes();
  spamSource.on('featuresloadend', () => {
    applyResolution();
    setUserMax(1000000);
    refresh();
  });

  // Sidebar page navigation
  const pages = {
    map: document.getElementById('map-page'),
    testcase: document.getElementById('testcase-page'),
    waterfall: document.getElementById('waterfall-page'),
    results: document.getElementById('results-page'),
  };
  const navButtons = {
    map: document.getElementById('nav-map'),
    testcase: document.getElementById('nav-testcase'),
    waterfall: document.getElementById('nav-waterfall'),
    results: document.getElementById('nav-results'),
  };

  const latInput = document.getElementById('testcase-lat');
  const lonInput = document.getElementById('testcase-lon');
  const radiusInput = document.getElementById('testcase-radius');
  const resultsContainer = document.getElementById('testcase-results');
  const fuelProductionContainer = document.getElementById('testcase-fuel-production');
  const locationContainer = document.getElementById('testcase-location');
  const supplyCurveContainer = document.getElementById('supply-curve-container');
  const resultsPriceInput = document.getElementById('results-price');

  let lastTestCaseTotals = null; // feeds the Results page's supply curve

  function runTestCaseCalculation() {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    const radiusKm = parseFloat(radiusInput.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusKm)) return;
    if (spamSource.getFeatures().length === 0) {
      resultsContainer.innerHTML = '<p>Data still loading, try again in a moment.</p>';
      return;
    }

    testCase.setMarker(lon, lat);
    testCase.setRadiusCircle(lon, lat, radiusKm);

    const { totals, pointCount, nearestFeature } = totalWithinRadius(
      spamSource.getFeatures(),
      lon,
      lat,
      radiusKm,
      getSelectedItems()
    );
    const label = locationLabel(nearestFeature);
    locationContainer.textContent = label ? `\u{1F4CD} ${label}` : '';
    renderResults(resultsContainer, totals, pointCount, radiusKm);
    renderFuelProduction(fuelProductionContainer);
    lastTestCaseTotals = totals;
  }

  function renderResultsPage() {
    const price = parseFloat(resultsPriceInput.value);
    if (!lastTestCaseTotals) {
      supplyCurveContainer.innerHTML = '<p class="field-note">No Test Case calculation yet. Go to the Test Case page, pick a location and radius, and hit Calculate.</p>';
      return;
    }
    renderSupplyCurve(supplyCurveContainer, lastTestCaseTotals, Number.isFinite(price) ? price : 100);
  }

  function showPage(page) {
    Object.entries(pages).forEach(([key, el]) => el.classList.toggle('hidden', key !== page));
    Object.entries(navButtons).forEach(([key, btn]) => btn.classList.toggle('active', key === page));

    if (page === 'testcase') {
      if (!testCase) {
        testCase = createTestCaseMap(
          (lon, lat) => {
            latInput.value = lat.toFixed(4);
            lonInput.value = lon.toFixed(4);
            runTestCaseCalculation();
          },
          currentSource,
          productionStyleFn(getSelectedItems())
        );
      } else {
        testCase.map.updateSize();
      }
    } else if (page === 'map') {
      map.updateSize();
    } else if (page === 'waterfall') {
      renderWaterfallChart(document.getElementById('lca-waterfall-container'), dummyLcaStages, 'kg CO2e / dry ton');
      renderWaterfallChart(document.getElementById('econ-waterfall-container'), dummyEconStages, '$ / dry ton');
    } else if (page === 'results') {
      renderResultsPage();
    }
  }

  navButtons.map.addEventListener('click', () => showPage('map'));
  navButtons.testcase.addEventListener('click', () => showPage('testcase'));
  navButtons.waterfall.addEventListener('click', () => showPage('waterfall'));
  navButtons.results.addEventListener('click', () => showPage('results'));
  document.getElementById('testcase-calculate').addEventListener('click', runTestCaseCalculation);
  resultsPriceInput.addEventListener('change', renderResultsPage);

  document.getElementById('nav-about').addEventListener('click', () => {
    document.getElementById('about-panel').classList.toggle('hidden');
  });
});
