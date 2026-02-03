"""
Compiles CSV data files (substations.csv, branches.csv) and borders.json
into a TypeScript module (grid.ts) for each case folder.

Usage: python data/compile.py texas
"""

import csv
import json
import sys
from pathlib import Path


def parse_csv(file_path: Path) -> list[dict[str, str]]:
    with open(file_path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build_subs(rows: list[dict]) -> dict:
    subs = {}
    for raw in rows:
        units = int(raw["Units"])
        sub = {
            "Number": raw["Number"],
            "Name": raw["Name"],
            "Category": raw["Category"],
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
        }
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


def build_branches(rows: list[dict]) -> dict:
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


SUB_FLOAT_KEYS = {"Latitude", "Longitude", "Pmax", "Pmin", "Ramp", "StartTime", "FixedCost", "FuelCost"}
UNIT_FLOAT_KEYS = {"Pset", "P", "P0"}
BRANCH_FLOAT_KEYS = {"Z", "Pmax"}


def format_num(value: float | int, as_float: bool) -> str:
    if as_float and isinstance(value, float) and value == int(value):
        return f"{value:.1f}"
    return str(value)


def format_obj(obj: dict, float_keys: set[str]) -> str:
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


def format_sub(key: str, sub: dict) -> str:
    return f"    {json.dumps(key)}: {format_obj(sub, SUB_FLOAT_KEYS)}"


def format_branch(key: str, branch: dict) -> str:
    return f"    {json.dumps(key)}: {format_obj(branch, BRANCH_FLOAT_KEYS)}"


def main():
    if len(sys.argv) < 2:
        print("Usage: python data/compile.py <case>", file=sys.stderr)
        print("Example: python data/compile.py texas", file=sys.stderr)
        sys.exit(1)

    case_name = sys.argv[1]
    data_dir = Path(__file__).parent / case_name
    output_file = data_dir / "grid.ts"

    subs = build_subs(parse_csv(data_dir / "substations.csv"))
    branches = build_branches(parse_csv(data_dir / "branches.csv"))
    nsubs = len(subs)

    sub_lines = ",\n".join(format_sub(k, v) for k, v in subs.items())
    branch_lines = ",\n".join(format_branch(k, v) for k, v in branches.items())

    output = f'''import borders from "./borders.json";

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


if __name__ == "__main__":
    main()
