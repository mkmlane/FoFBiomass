# Data scripts

The map data (`public/data/SPAM2020_production.geojson`, `crop_production_totals.csv`)
and the siting test case (`public/data/siting_test_case.json`) are generated in the
FoF_Spiros repository, so the app and the FoF model use the same SPAM 2020 V2r0 data
and the same dynamic RPR:

- `scripts/process_spam.py`: map data and global totals
- `scripts/run_siting.py`: biorefinery siting test case

Set `FOFBIOMASS_DIR` in FoF_Spiros's `local_paths.txt` to this folder and the scripts
write their output here.
