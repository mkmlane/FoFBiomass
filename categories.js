// Defines the checkbox tree: top-level categories, each with selectable
// items. Every item knows how to read its own value off a feature, so the
// rest of the app can just sum getValue() across whatever's checked
// without caring whether an item is a raw crop or a derived residue.

import crops from './crops.json';

// Residue-per-production ratios, matching AgReUSE's calcs.js getStrawTotal:
// residue (metric tons) = crop production (metric tons) * RPR.
// This is the SPAM-only "total residue produced" number AgReUSE showed
// under its "Rice Straw" / "Wheat Straw" / "Corn Stover" crop selector with
// the "Total Production" visualization — it does not depend on the Smerald
// utilization data, which AgReUSE only used for the on-field/burned/animal/
// other-use breakdown and the WTE/pyrolysis potential views (not built here
// yet).
const RPR = { rice: 1.757, whea: 1.75, maiz: 1.0 };

export const categories = [
  {
    id: 'crops',
    label: 'Crops',
    items: crops.map((c) => ({
      id: c.code,
      name: c.name,
      getValue: (feature) => feature.get(c.code) || 0,
    })),
  },
  {
    id: 'ag-residues',
    label: 'Agricultural Residues',
    items: [
      {
        id: 'wheat-straw',
        name: 'Wheat Straw',
        getValue: (feature) => (feature.get('whea') || 0) * RPR.whea,
      },
      {
        id: 'rice-straw',
        name: 'Rice Straw',
        getValue: (feature) => (feature.get('rice') || 0) * RPR.rice,
      },
      {
        id: 'corn-stover',
        name: 'Corn Stover',
        getValue: (feature) => (feature.get('maiz') || 0) * RPR.maiz,
      },
    ],
  },
  {
    id: 'forest-residues',
    label: 'Forest Residues',
    items: [],
  },
];

export const allItems = categories.flatMap((c) => c.items);

export function itemName(id) {
  const item = allItems.find((i) => i.id === id);
  return item ? item.name : id;
}
