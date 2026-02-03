"""
Compiles CSV data files (substations.csv, branches.csv) and borders.json
into a TypeScript module (grid.ts) for each case folder.

Run directly: python data/compile.py
"""

import csv
import json
from pathlib import Path

CASES = ["texas"]
DATA_DIR = Path(__file__).parent

SUB_FLOAT_KEYS = {"Latitude", "Longitude", "Pmax", "Pmin", "Ramp", "StartTime", "FixedCost", "FuelCost"}
UNIT_FLOAT_KEYS = {"Pset", "P", "P0"}
BRANCH_FLOAT_KEYS = {"Z", "Pmax"}


def parse_csv(file_path):
    with open(file_path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build_subs(rows):
    subs = {}
    for raw in rows:
        units = int(raw["Units"])
        sub = {
            "Number": raw["Number"],
            "Name": raw["Name"],
            "Category": raw["Category"],
        }
        load_cat = raw.get("LoadCategory", "").strip()
        if load_cat:
            sub["LoadCategory"] = load_cat
        sub.update({
            "Units": units,
            "Latitude": float(raw["Latitude"]),
            "Longitude": float(raw["Longitude"]),
            "Pmax": float(raw["Pmax"]),
            "Pmin": float(raw["Pmin"]),
            "Ramp": float(raw["Ramp"]),
            "StartTime": float(raw["StartTime"]),
            "FixedCost": float(raw["FixedCost"]),
            "FuelCost": float(raw["FuelCost"]),
            "U": [],
        })
        for i in range(units):
            status = raw[f"UState{i}"]
            pset = float(raw[f"UPset{i}"])
            p = float(raw[f"UP{i}"])
            sub["U"].append({
                "Status": status,
                "Status0": status,
                "Pset": pset,
                "P": p,
                "P0": p,
                "StatusCount": 0,
            })
        subs[raw["Number"]] = sub
    return subs


def build_branches(rows):
    branches = {}
    for raw in rows:
        branches[raw["Number"]] = {
            "Number": raw["Number"],
            "FromSub": raw["FromSub"],
            "ToSub": raw["ToSub"],
            "Circuits": int(raw["Circuits"]),
            "FromNum": raw["FromNum"],
            "ToNum": raw["ToNum"],
            "Z": float(raw["Z"]),
            "Pmax": float(raw["Pmax"]),
            "P": int(raw["P"]),
            "Status1": raw["Status1"],
            "Status2": raw["Status2"],
        }
    return branches


def format_num(value, as_float):
    if as_float and isinstance(value, float) and value == int(value):
        return f"{value:.1f}"
    return str(value)


def format_obj(obj, float_keys):
    entries = []
    for k, v in obj.items():
        if isinstance(v, (int, float)):
            formatted = format_num(v, k in float_keys)
        elif isinstance(v, str):
            formatted = json.dumps(v)
        elif isinstance(v, list):
            items = ", ".join(format_obj(item, UNIT_FLOAT_KEYS) for item in v)
            formatted = f"[{items}]"
        else:
            formatted = str(v)
        entries.append(f"{json.dumps(k)}: {formatted}")
    return "{ " + ", ".join(entries) + " }"


def compile_case(case_name):
    case_dir = DATA_DIR / case_name
    output_file = case_dir / "grid.ts"

    source_dir = case_dir / "source"
    subs = build_subs(parse_csv(source_dir / "substations.csv"))
    branches = build_branches(parse_csv(source_dir / "branches.csv"))
    nsubs = len(subs)

    sub_lines = ",\n".join(
        f"    {json.dumps(k)}: {format_obj(v, SUB_FLOAT_KEYS)}" for k, v in subs.items()
    )
    branch_lines = ",\n".join(
        f"    {json.dumps(k)}: {format_obj(v, BRANCH_FLOAT_KEYS)}" for k, v in branches.items()
    )

    output = f'''import borders from "./source/borders.json";

export const scenario_data = {{
  "subs": {{
{sub_lines}
  }},
  "branches": {{
{branch_lines}
  }},
  borders,
  "nsubs": {nsubs}
}};
'''

    with open(output_file, "w", encoding="utf-8", newline="\n") as f:
        f.write(output)
    print(f"Generated {output_file} ({nsubs} substations, {len(branches)} branches)")


for case in CASES:
    compile_case(case)
