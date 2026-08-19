// Defines the checkbox tree: two top-level groups ("Residues and Wastes",
// "Energy Crops"), each split into 4 minor categories, each with selectable
// items. Every item knows how to read its own value off a feature, so the
// rest of the app can just sum getValue() across whatever's checked without
// caring whether an item is a raw crop or a derived residue.
//
// Items backed by SPAM2020 report a globalAmountGt (the worldwide total for
// that item, in gigatons, computed from the same SPAM2020 V2r2 all-technology
// data as the map — see crop_production_totals.csv). Items with no SPAM (or
// derived) data yet are `pending: true` — their checkbox is disabled and the
// UI shows "DP" (dataset pending) instead of a total.

// Global production totals (metric tons), from crop_production_totals.csv
// (SPAM2020 V2r2, all technologies).
const GLOBAL_PRODUCTION_TONS = {
  maiz: 1168397153,
  rice: 769917234,
  whea: 763962321,
  oilp: 414645955,
  soyb: 354316074,
  sugb: 268971940,
  sugc: 1881854327,
  rape: 72421468,
  sorg: 58961902,
};

// Crops with a yield-dependent residue ratio ("dynamic RPR": RPR(Y) = a *
// exp(-b*Y), Y = yield in t/ha, capping out above the yield where that's
// fully decayed) instead of a flat per-crop ratio. The per-pixel math
// (production * yield -> residue tons) is precomputed in
// scripts/process_spam.py and shipped as a plain `{code}_res` property on
// each feature, alongside production — that keeps it summable like any
// other crop column, which matters because the app's grid-resampling
// (aggregate.js) works by summing whatever crop columns it's given into
// coarser cells; computing this from yield client-side wouldn't survive
// that resampling. See process_spam.py for the a/b parameters and formula.
const DYNAMIC_RESIDUE_CROPS = ['maiz', 'whea', 'rice', 'soyb'];
export const residueResultCodes = DYNAMIC_RESIDUE_CROPS.map((c) => `${c}_res`);

// Only a fraction of total residue produced is actually removable — the
// rest needs to stay on the field for soil health (erosion control,
// organic matter, nutrient cycling). 30% removal / 70% left on field.
const REMOVAL_RATE = 0.3;

// Global removable-residue totals (i.e. already * REMOVAL_RATE, matching
// what's actually shown/mapped), in gigatons — the sum of each `{code}_res`
// property across every pixel in the SPAM2020 grid, computed in
// scripts/process_spam.py.
const GLOBAL_DYNAMIC_RESIDUE_GT = {
  maiz: 0.4279,
  whea: 0.2891,
  rice: 0.3444,
  soyb: 0.2327,
};

// Format a metric-ton quantity as a gigaton string, e.g. 1168397153 -> "1.17".
function formatGt(tons) {
  const gt = tons / 1e9;
  return parseFloat(gt.toPrecision(3)).toString();
}

// Map "Yields" mode value (kg/ha) for a crop, from the production and
// harvested-area properties process_spam.py attaches to every feature
// (`code` and `{code}_ha`). Both sum correctly when the app resamples
// pixels into coarser cells, so production/harvestedArea there gives the
// production-weighted average yield for the cell — summing yield itself
// wouldn't be meaningful.
function yieldKgPerHa(feature, code) {
  const productionTons = feature.get(code) || 0;
  const harvestedHa = feature.get(`${code}_ha`) || 0;
  if (!productionTons || !harvestedHa) return 0;
  return (productionTons / harvestedHa) * 1000;
}

// An item backed by a SPAM2020 crop code, optionally scaled by a factor
// (e.g. a residue-per-production ratio times a removal rate).
function spamItem(id, name, code, { factor = 1, note } = {}) {
  const totalTons = GLOBAL_PRODUCTION_TONS[code];
  return {
    id,
    name,
    code,
    getValue: (feature) => (feature.get(code) || 0) * factor,
    getYieldValue: (feature) => yieldKgPerHa(feature, code),
    globalAmountGt: totalTons != null ? formatGt(totalTons * factor) : null,
    note,
  };
}

// A crop residue item using the yield-dependent dynamic RPR. The residue
// tonnage itself (production * yield -> tons, per pixel) is precomputed in
// scripts/process_spam.py and read straight off the feature's `{code}_res`
// property here.
function dynamicResidueItem(id, name, code) {
  return {
    id,
    name,
    code,
    getValue: (feature) => (feature.get(`${code}_res`) || 0) * REMOVAL_RATE,
    getYieldValue: (feature) => yieldKgPerHa(feature, code),
    globalAmountGt: formatGt(GLOBAL_DYNAMIC_RESIDUE_GT[code] * 1e9),
  };
}

// An item with no dataset connected yet.
function pendingItem(id, name, note) {
  return {
    id,
    name,
    getValue: () => 0,
    getYieldValue: () => 0,
    globalAmountGt: null,
    pending: true,
    note,
  };
}

export const categories = [
  // --- Residues and Wastes ---------------------------------------------
  {
    id: 'crop-residues',
    group: 'Residues and Wastes',
    label: 'Crop Residues (30% removed)',
    items: [
      dynamicResidueItem('corn-stover', 'Corn Stover', 'maiz'),
      dynamicResidueItem('wheat-straw', 'Wheat Straw', 'whea'),
      dynamicResidueItem('rice-straw', 'Rice Straw', 'rice'),
      dynamicResidueItem('soybean-residue', 'Soybean Residue', 'soyb'),
    ],
  },
  {
    id: 'forest-residues',
    group: 'Residues and Wastes',
    label: 'Forest Residues',
    items: [
      pendingItem('harvest-residues', 'Harvest Residues'),
      pendingItem('forest-thinning', 'Forest Thinning'),
      pendingItem('mill-byproducts', 'Mill Byproducts'),
    ],
  },
  {
    id: 'processing-byproducts',
    group: 'Residues and Wastes',
    label: 'Processing By-products',
    items: [
      pendingItem('sugarcane-bagasse', 'Sugar Cane Bagasse', 'SPAM has sugarcane production but no bagasse-per-production ratio yet'),
      pendingItem('oilseed-palm-processing-waste', 'Oilseed and Palm Oil Processing Waste', 'SPAM has oilseed/palm production but no processing-waste ratio yet'),
    ],
  },
  {
    id: 'wastes',
    group: 'Residues and Wastes',
    label: 'Wastes',
    items: [
      pendingItem('used-cooking-oil', 'Used Cooking Oil'),
      pendingItem('msw', 'MSW'),
      pendingItem('wastewater', 'Wastewater'),
    ],
  },

  // --- Energy Crops ------------------------------------------------------
  {
    id: 'woody',
    group: 'Energy Crops',
    label: 'Woody',
    items: [
      pendingItem('poplar', 'Poplar'),
      pendingItem('willow', 'Willow'),
      pendingItem('pine', 'Pine'),
    ],
  },
  {
    id: 'herbaceous',
    group: 'Energy Crops',
    label: 'Herbaceous',
    items: [
      pendingItem('switchgrass', 'Switchgrass'),
      pendingItem('miscanthus', 'Miscanthus'),
    ],
  },
  {
    id: 'sugar-starch',
    group: 'Energy Crops',
    label: 'Sugar & Starch',
    items: [
      spamItem('sugarcane', 'Sugarcane', 'sugc'),
      spamItem('sugar-beet', 'Sugar Beet', 'sugb'),
      spamItem('sweet-sorghum', 'Sweet Sorghum', 'sorg', {
        note: 'SPAM reports sorghum production generally; not broken out by sweet sorghum specifically',
      }),
      spamItem('corn', 'Corn', 'maiz'),
      spamItem('wheat', 'Wheat', 'whea'),
    ],
  },
  {
    id: 'oilseeds',
    group: 'Energy Crops',
    label: 'Oilseeds and Oil Fruits',
    items: [
      spamItem('sustainable-palm-oil', 'Sustainable Palm Oil', 'oilp', {
        note: 'SPAM reports all oil palm production; does not distinguish certified-sustainable volumes',
      }),
      spamItem('soybean', 'Soybean', 'soyb'),
      spamItem('rapeseed-canola', 'Rapeseed/Canola', 'rape'),
      pendingItem('jatropha', 'Jatropha'),
      pendingItem('camelina-winter', 'Camelina (Winter)'),
      pendingItem('carinata-winter', 'Carinata (Winter)'),
    ],
  },
];

export const allItems = categories.flatMap((c) => c.items);

// `{code}_ha` (harvested area) for every crop backed by a checkbox item —
// needed alongside residueResultCodes so the grid-resampling step
// (aggregate.js) sums these into coarser cells too, not just production.
export const yieldHaCodes = [...new Set(allItems.filter((i) => i.code).map((i) => `${i.code}_ha`))];

export function itemName(id) {
  const item = allItems.find((i) => i.id === id);
  return item ? item.name : id;
}
