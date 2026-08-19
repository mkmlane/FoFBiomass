"""
Convert the raw SPAM2020 global production CSV (spam2020V2r2_global_P_TA.csv)
into a compact GeoJSON for the FoFBiomass map.

The raw CSV (~400MB+) is not committed to the repo. Download it from the
SPAM2020 Harvard Dataverse (https://doi.org/10.7910/DVN/SWPENT), file
"spam2020V2r2_global_P_TA.csv" (production, all technologies), and pass its
path with --input.

Also computes a yield-dependent ("dynamic RPR") residue tonnage for
RESIDUE_PARAMS crops, from per-pixel production plus per-pixel yield (the
companion "spam2020V2r2_global_Y_TA.csv" file, same Dataverse, --yield-input).
The result is written as a plain `{code}_res` property (metric tons,
pre-removal-rate) alongside each crop's production -- a summable value like
any other crop column, rather than yield itself, so the app's grid
resampling (aggregate.js, which just sums whatever crop columns you hand it
into coarser cells) works on it unmodified. Doing the per-pixel math here
instead of in the browser also avoids shipping the extra yield property
(and the exp() math) to the client.

Formula (see categories.js for the exact mirror used at the app's native 5
arc-min resolution -- there is none anymore now that it's precomputed here):
  Y = yield (t/ha) = yield_kg_per_ha / 1000
  threshold = 1 / b
  Y <= threshold:  residue = P * a * exp(-b*Y)
  Y >  threshold:  residue = (P / Y) * a / (b*e)      # P/Y recovers harvested area

Also merges in per-pixel harvested area (ha) for YIELD_HA_CROPS, from the
"spam2020V2r2_global_H_TA.csv" file (same Dataverse, --harvested-area-input),
written as `{code}_ha`. This is what lets categories.js's "Yields" map mode
compute yield (kg/ha = production / harvested_area * 1000) correctly at any
resampled grid resolution: production and harvested area both sum
correctly across pixels within a coarser cell, so
sum(production)/sum(harvested_area) is the production-weighted average
yield for that cell -- summing yield itself wouldn't be meaningful.

Output is written to public/data/SPAM2020_production.geojson. Per-pixel
crop values are omitted when zero (most pixels only grow a handful of the
46 crops), which keeps the file much smaller than a dense representation.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent

# a/b calibrated for yield in t/ha; b in ha/Mg. Crops with a yield-dependent
# residue ratio in categories.js (corn stover, wheat straw, rice straw,
# soybean residue) -- the rest of the crop list doesn't need this.
RESIDUE_PARAMS = {
    "maiz": {"a": 2.656, "b": 0.103},
    "whea": {"a": 2.183, "b": 0.127},
    "rice": {"a": 2.450, "b": 0.084},
    "soyb": {"a": 3.869, "b": 0.178},
}

# Every crop code backed by a checkbox item in categories.js (spamItem or
# dynamicResidueItem calls) -- i.e. every crop the "Yields" map mode needs
# to be able to compute. Keep in sync with categories.js's
# GLOBAL_PRODUCTION_TONS / DYNAMIC_RESIDUE_CROPS.
YIELD_HA_CROPS = ["whea", "rice", "maiz", "soyb", "sugc", "sugb", "sorg", "oilp", "rape"]


def load_crop_codes():
    with open(REPO_ROOT / "crops.json", encoding="utf-8") as f:
        return [c["code"] for c in json.load(f)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default=r"C:\Users\Mary Kate\Biomass data\spam2020V2r2_global_production\spam2020V2r2_global_P_TA.csv",
        help="Path to spam2020V2r2_global_P_TA.csv",
    )
    parser.add_argument(
        "--yield-input",
        default=r"C:\Users\Mary Kate\Biomass data\Global_CSV\spam2020V2r2_global_yield\spam2020V2r2_global_Y_TA.csv",
        help="Path to spam2020V2r2_global_Y_TA.csv (per-pixel yield, kg/ha)",
    )
    parser.add_argument(
        "--harvested-area-input",
        default=r"C:\Users\Mary Kate\Biomass data\Global_CSV\spam2020V2r2_global_harvested_area\spam2020V2r2_global_H_TA.csv",
        help="Path to spam2020V2r2_global_H_TA.csv (per-pixel harvested area, ha)",
    )
    parser.add_argument(
        "--output",
        default=str(REPO_ROOT / "public" / "data" / "SPAM2020_production.geojson"),
    )
    parser.add_argument(
        "--decimals",
        type=int,
        default=2,
        help="Round production/residue values (metric tons) to this many decimal places",
    )
    args = parser.parse_args()

    crops = load_crop_codes()
    residue_crops = list(RESIDUE_PARAMS.keys())
    admin_cols = ["ADM0_NAME", "ADM1_NAME", "ADM2_NAME"]
    print(f"Loading {args.input} ...")
    df = pd.read_csv(args.input, usecols=["grid_code", "x", "y"] + admin_cols + crops)
    print(f"Loaded {len(df)} rows")

    print(f"Loading {args.yield_input} ...")
    yield_df = pd.read_csv(args.yield_input, usecols=["grid_code"] + residue_crops)
    yield_cols = {c: f"{c}_yld" for c in residue_crops}
    yield_df = yield_df.rename(columns=yield_cols)
    # Row sets differ between the production and yield files (pixels with
    # zero harvested area for a crop may be omitted from one but not the
    # other), so merge explicitly on grid_code rather than assuming
    # positional alignment; unmatched production rows just get NaN yield.
    df = df.merge(yield_df, on="grid_code", how="left")
    print(f"Merged to {len(df)} rows")

    print(f"Loading {args.harvested_area_input} ...")
    ha_df = pd.read_csv(args.harvested_area_input, usecols=["grid_code"] + YIELD_HA_CROPS)
    ha_cols = {c: f"{c}_ha" for c in YIELD_HA_CROPS}
    ha_df = ha_df.rename(columns=ha_cols)
    df = df.merge(ha_df, on="grid_code", how="left")
    print(f"Merged to {len(df)} rows")

    print("Computing dynamic-RPR residue tons...")
    res_cols = {}
    for code, params in RESIDUE_PARAMS.items():
        a, b = params["a"], params["b"]
        threshold = 1.0 / b
        P = pd.to_numeric(df[code], errors="coerce").fillna(0.0).to_numpy()
        Y = pd.to_numeric(df[yield_cols[code]], errors="coerce").fillna(0.0).to_numpy() / 1000.0
        has_data = (P > 0) & (Y > 0)
        with np.errstate(divide="ignore", invalid="ignore"):
            below = np.where(has_data, Y <= threshold, True)
            residue = np.where(
                below,
                P * a * np.exp(-b * Y),
                np.where(has_data, (P / Y) * (a / (b * np.e)), 0.0),
            )
        residue = np.where(has_data, residue, 0.0)
        res_cols[code] = f"{code}_res"
        df[res_cols[code]] = residue

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    n_written = 0
    with open(out_path, "w", encoding="utf-8") as f:
        f.write('{"type":"FeatureCollection","name":"SPAM2020_production","features":[\n')
        first = True
        for row in df.itertuples(index=False):
            props = {}
            for code in crops:
                val = getattr(row, code)
                if val and val > 0:
                    props[code] = round(val, args.decimals)
            if not props:
                continue
            for code in residue_crops:
                if code not in props:
                    continue
                res = getattr(row, res_cols[code])
                if res and res > 0:
                    props[res_cols[code]] = round(res, args.decimals)
            for code in YIELD_HA_CROPS:
                if code not in props:
                    continue
                ha = getattr(row, ha_cols[code])
                if ha and ha > 0:
                    props[ha_cols[code]] = round(ha, 2)
            for col in admin_cols:
                val = getattr(row, col)
                if isinstance(val, str) and val:
                    props[col] = val
            feature = {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Point", "coordinates": [row.x, row.y]},
            }
            if not first:
                f.write(",\n")
            f.write(json.dumps(feature, separators=(",", ":")))
            first = False
            n_written += 1
        f.write("\n]}\n")

    print(f"Wrote {n_written} features to {out_path}")
    print(f"File size: {out_path.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
