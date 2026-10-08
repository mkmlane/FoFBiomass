# FoFBiomass

A browser map of global crop production and crop-residue availability, built on the SPAM2020 gridded crop dataset.

## What the data are

- **Source:** the only dataset connected is [SPAM2020 V2r2](https://www.mapspam.info/data/) (IFPRI), "all technologies" (irrigated and rainfed combined). It is a modeled allocation of crop statistics onto a grid, not field observation.
- **Grid:** 5 arc-minute cells, about 9 km on a side at the equator.
- **File:** `public/data/SPAM2020_production.geojson` (307 MB, Git LFS) holds 923,150 point features. Each point is the center of one cell and carries only non-zero values.
- **Coverage:** cells are kept if any of the 16 crops in `crops.json` is grown there, spanning 46.6°S to 70.0°N.

| Property | Meaning | Unit |
|---|---|---|
| `maiz`, `whea`, `rice`, … (16 codes) | Annual crop production in the cell | metric tons, as reported by SPAM |
| `{code}_ha` (9 crops) | Harvested area | ha |
| `{code}_res` (corn, wheat, rice, soy) | Total residue generated, before any removal limit | metric tons |
| `ADM0_NAME`, `ADM1_NAME`, `ADM2_NAME` | Country, state/province, district | text |

The 16 crop codes are `whea`, `rice`, `maiz`, `barl`, `sorg`, `ocer`, `cass`, `soyb`, `grou`, `cnut`, `oilp`, `sunf`, `rape`, `ooil`, `sugc` and `sugb`. Harvested area is included for the nine crops that have a checkbox in the app: `whea`, `rice`, `maiz`, `soyb`, `sugc`, `sugb`, `sorg`, `oilp` and `rape`.

Everything else in the checkbox tree is a disabled placeholder with no dataset yet: forest residues, bagasse, wastes, woody and herbaceous energy crops, jatropha, camelina and carinata.

## How the data are processed

All preprocessing is in `scripts/process_spam.py`, which merges three SPAM CSVs (production, yield and harvested area) on `grid_code` and writes the GeoJSON. The raw CSVs are not in the repo; download them from the [SPAM2020 Harvard Dataverse](https://doi.org/10.7910/DVN/SWPENT).

- **Residue:** computed per cell with a yield-dependent residue-to-product ratio, RPR = a·exp(−b·Y), where Y is yield in t/ha. Residue is production × RPR. Above Y = 1/b, residue per hectare is held constant at a/(b·e).
- **Removal rate:** the app multiplies residue by a flat 30% everywhere (`REMOVAL_RATE` in `categories.js`); the other 70% is assumed to stay on the field.

| Crop | a | b (ha/t) |
|---|---|---|
| Corn | 2.656 | 0.103 |
| Wheat | 2.183 | 0.127 |
| Rice | 2.450 | 0.084 |
| Soybean | 3.869 | 0.178 |

Global totals, summed over every cell in the file:

| Crop | Production (Gt) | Total residue (Gt) | Removable at 30% (Gt) |
|---|---|---|---|
| Corn | 1.168 | 1.426 | 0.428 |
| Wheat | 0.764 | 0.964 | 0.289 |
| Rice | 0.770 | 1.148 | 0.344 |
| Soybean | 0.354 | 0.776 | 0.233 |

## How it is plotted

- **Library:** OpenLayers in Web Mercator, over Natural Earth country and state/province outlines.
- **Cells:** each point is drawn as a square the size of its cell, built in lon/lat and then reprojected (`layerstyle.js`).
- **Value shown:** the sum of all checked items in that cell, in metric tons per cell. It is not a density (t/km²).
- **Color:** a "jet" ramp with a square-root stretch, from 0 to a maximum that is set to 1,000,000 t on load and is user-editable.
- **Resolution:** the map opens at 30 arc-min, not native. `aggregate.js` sums native cells into coarser bins, from 5 arc-min up to 100 km.
- **Yield mode:** shows summed production divided by summed harvested area, in kg/ha.
