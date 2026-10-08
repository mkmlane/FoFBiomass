# FoFBiomass

- **Data source:** the only dataset connected is SPAM2020 V2r2 (IFPRI) https://www.mapspam.info/data/, "all technologies" (irrigated and rainfed combined). It is a modeled allocation of crop statistics onto a grid
- **Grid:** 5 arc-minute cells
- **File:** `public/data/SPAM2020_production.geojson` (307 MB, Git LFS)
- **Coverage:** cells are kept if any of the 16 crops in `crops.json` is grown there, spanning 46.6°S to 70.0°N. I paired down this list down from the 56 crops in the SPAM database.
- **Data processing:** `scripts/process_spam.py` merges three SPAM CSVs (production, yield, harvested area) on `grid_code`
- **Residue:** from residue-to-product ratio equation, RPR = a·exp(−b·Y), with Y in t/ha. Above Y = 1/b, residue per hectare is held constant.
- **Removal rate:** 30% everywhere (evolving assumption)

## Plotting data

- **Library:** OpenLayers in Web Mercator, over Natural Earth country and state outlines
- **Cells:** each point is drawn as a square the size of its cell, built in lon/lat and then reprojected
- **Value shown:** the sum of all checked items in that cell, in tons per cell
- **Resolution:** the map opens at 30 arc-min, but `aggregate.js` sums into coarser bins from 5 arc-min
- **Yield mode:** shows summed production divided by summed harvested area, in kg/ha
