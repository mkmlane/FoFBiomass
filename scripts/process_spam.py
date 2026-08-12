"""
Convert the raw SPAM2020 global production CSV (spam2020V2r2_global_P_TA.csv)
into a compact GeoJSON for the FoFBiomass map.

The raw CSV (~400MB+) is not committed to the repo. Download it from the
SPAM2020 Harvard Dataverse (https://doi.org/10.7910/DVN/SWPENT), file
"spam2020V2r2_global_P_TA.csv" (production, all technologies), and pass its
path with --input.

Output is written to public/data/SPAM2020_production.geojson. Per-pixel
crop values are omitted when zero (most pixels only grow a handful of the
46 crops), which keeps the file much smaller than a dense representation.
"""

import argparse
import json
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent


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
        "--output",
        default=str(REPO_ROOT / "public" / "data" / "SPAM2020_production.geojson"),
    )
    parser.add_argument(
        "--decimals",
        type=int,
        default=2,
        help="Round production values (metric tons) to this many decimal places",
    )
    args = parser.parse_args()

    crops = load_crop_codes()
    admin_cols = ["ADM0_NAME", "ADM1_NAME", "ADM2_NAME"]
    print(f"Loading {args.input} ...")
    df = pd.read_csv(args.input, usecols=["x", "y"] + admin_cols + crops)
    print(f"Loaded {len(df)} rows")

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
