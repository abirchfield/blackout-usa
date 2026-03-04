"""Prebuild: JSON source -> _out/ (lookups.ts, grid-data.json bundle, manifest.json)."""

import json, math
from pathlib import Path

DATA_DIR = Path(__file__).parent
OUT_DIR = DATA_DIR / "_out"

PARAMS = ["Pmax", "Pmin", "Ramp", "StartTime", "FixedCost", "FuelCost"]
LOAD_CATS = ["Residential", "Commercial", "Industrial", "Datacenter"]
DEFAULT_LOAD_CATEGORY = "Commercial"


def discover_cases():
    preferred = ["texas"]
    found = sorted(c.name for c in DATA_DIR.iterdir() if c.is_dir() and (c / "case.json").exists())
    return [n for n in preferred if n in found] + [n for n in found if n not in preferred]


def key(name: str) -> str:
    return name.replace("'", "").replace(" ", "")


def require_fields(obj, fields, context: str):
    for f in fields:
        if f not in obj:
            raise ValueError(f"{context}: missing required field '{f}'")


def parse_load_category(unit, block_default: str):
    value = unit.get("LoadCategory", "").strip() or block_default or DEFAULT_LOAD_CATEGORY
    if value not in LOAD_CATS:
        raise ValueError(f"Invalid LoadCategory '{value}'. Expected one of: {', '.join(LOAD_CATS)}")
    return value


def expand_block(block, is_load, load_cat=""):
    if block is None:
        raise ValueError("Substation block is missing (expected 'Gens' or 'Loads').")
    if "U" not in block or not isinstance(block["U"], list):
        raise ValueError("Substation block must contain a list field 'U'.")

    cat = "Load" if is_load else block.get("Category", "Gas Turbine")
    units = []
    for e in block["U"]:
        require_fields(e, ["P"], "unit")
        p = float(e["P"])
        st = e.get("Status", "IN")
        u = {"Status": st, "Status0": st, "Pset": p, "P": p, "P0": p, "StatusCount": 0}
        for f in PARAMS:
            u[f] = float(block.get(f, p if f == "Pmax" else 0))
        if is_load:
            u["LoadCategory"] = parse_load_category(e, load_cat)
        units.append(u)
    return cat, units


def build_subs(rows):
    subs = {}
    for i, raw in enumerate(rows):
        require_fields(raw, ["Name", "Latitude", "Longitude"], f"substation[{i}]")
        num = str(raw.get("Number", i + 1))

        has_both = "Gens" in raw and "Loads" in raw
        if has_both:
            block, is_load = raw["Gens"], False
        else:
            block = raw.get("Gens") or raw.get("Loads")
            if block is None:
                raise ValueError(f"Substation '{raw['Name']}' missing both Gens and Loads blocks.")
            is_load = "Gens" not in raw

        lc = (block.get("LoadCategory") or raw.get("LoadCategory") or "").strip() if is_load else ""
        cat, units = expand_block(block, is_load, lc)
        n = len(units) or 1
        tpmax = sum(u["Pmax"] for u in units)
        tpmin = sum(u["Pmin"] for u in units)

        sub = {
            "Number": num,
            "Name": raw["Name"],
            "Latitude": float(raw["Latitude"]),
            "Longitude": float(raw["Longitude"]),
            "Category": cat,
            "Units": len(units),
            "U": units,
            "Pmax": tpmax,
            "Pmin": tpmin,
            "idx": int(num) - 1,
            "pmax": tpmax / n,
            "pmin": tpmin / n,
            "isLoad": cat == "Load",
            "isRenewable": cat in ("Wind", "Solar PV"),
        }
        for f in PARAMS[2:]:
            sub[f] = units[0][f] if units else 0

        if has_both:
            lc2 = (raw["Loads"].get("LoadCategory") or "").strip()
            _, lu = expand_block(raw["Loads"], True, lc2)
            sub["Loads"] = {
                "U": lu,
                "Units": len(lu),
                "Pmax": sum(u["Pmax"] for u in lu),
                "Pmin": sum(u["Pmin"] for u in lu),
            }

        subs[num] = sub
    return subs


def build_branches(rows, subs):
    branches = {}
    for raw in rows:
        require_fields(raw, ["Number", "FromBus", "ToBus", "FromNum", "ToNum", "Z", "Pmax"], "branch")
        fn, tn = str(raw["FromNum"]), str(raw["ToNum"])
        bn = str(raw["Number"])
        if fn not in subs or tn not in subs:
            raise ValueError(f"Branch {bn} references unknown endpoints: {fn} -> {tn}")
        z = float(raw["Z"])
        if z == 0:
            raise ValueError(f"Branch {bn} has zero impedance (Z=0), which is invalid.")
        s1, s2 = subs.get(fn), subs.get(tn)
        dist = math.hypot(s1["Latitude"] - s2["Latitude"], s1["Longitude"] - s2["Longitude"]) if s1 and s2 else 0
        branches[bn] = {
            "Number": bn,
            "FromSub": raw["FromBus"],
            "ToSub": raw["ToBus"],
            "FromNum": fn,
            "ToNum": tn,
            "Z": z,
            "Pmax": float(raw["Pmax"]),
            "P": 0,
            "Status": "IN",
            "fromIdx": int(fn) - 1,
            "toIdx": int(tn) - 1,
            "ybr": -1.0 / z,
            "dist": dist,
        }

    pairs: dict[tuple, list] = {}
    for n, b in branches.items():
        pairs.setdefault((b["FromNum"], b["ToNum"]), []).append(n)
    for nums in pairs.values():
        if len(nums) == 2:
            branches[nums[0]]["sibling"] = nums[1]
            branches[nums[1]]["sibling"] = nums[0]

    return branches


# --- Code generators ---

def compile_lookups(case_name, subs, branches):
    sub_lines = "\n".join(f'    {key(r["Name"])}: "{r.get("Number", i + 1)}",' for i, r in enumerate(subs))

    seen: dict[str, int] = {}
    line_entries = []
    for r in branches:
        bk = f'{key(r["FromBus"])}_{key(r["ToBus"])}'
        c = seen.get(bk, 0)
        seen[bk] = c + 1
        line_entries.append(f'    {bk if c == 0 else f"{bk}_{c + 1}"}: "{r["Number"]}",')

    out = OUT_DIR / case_name
    out.mkdir(parents=True, exist_ok=True)
    (out / "lookups.ts").write_text(
        f"""// Auto-generated by runme.py - do not edit manually

export const SUB = {{
{sub_lines}
}} as const;

export const LINE = {{
{chr(10).join(line_entries)}
}} as const;
""",
        encoding="utf-8",
        newline="\n",
    )


def compile_grid_bundle(case_name, case_dir, subs_rows, branch_rows):
    case_cfg = json.load(open(case_dir / "case.json", encoding="utf-8"))
    bp = case_dir / "borders.json"
    borders = json.load(open(bp, encoding="utf-8")) if bp.exists() else []
    subs = build_subs(subs_rows)
    out = OUT_DIR / case_name
    out.mkdir(parents=True, exist_ok=True)

    bundle = {
        "name": case_cfg["name"],
        "referenceBus": case_cfg["referenceBus"],
        "mapConfig": case_cfg["mapConfig"],
        "timeConfig": case_cfg["timeConfig"],
        "gridData": {
            "subs": subs,
            "branches": build_branches(branch_rows, subs),
            "borders": borders,
            "nsubs": len(subs_rows),
        },
    }

    with open(out / "grid-data.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(bundle, f, separators=(",", ":"))

def compile_manifest(case_names):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"cases": case_names}
    with open(OUT_DIR / "manifest.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, separators=(",", ":"))


# --- Main ---

def main():
    cases = discover_cases()
    if not cases:
        print("[prebuild] No case folders found")
        return

    for name in cases:
        d = DATA_DIR / name
        subs = json.load(open(d / "substations.json", encoding="utf-8"))
        branches = json.load(open(d / "branches.json", encoding="utf-8"))

        num_by_name = {r["Name"]: str(r.get("Number", i + 1)) for i, r in enumerate(subs)}
        for br in branches:
            require_fields(br, ["FromBus", "ToBus"], f"branch[{br.get('Number', '?')}]")
            if br["FromBus"] not in num_by_name or br["ToBus"] not in num_by_name:
                raise ValueError(
                    f"Branch {br.get('Number', '?')} references unknown bus names: {br['FromBus']} -> {br['ToBus']}"
                )
            br["FromNum"] = int(num_by_name[br["FromBus"]])
            br["ToNum"] = int(num_by_name[br["ToBus"]])

        compile_lookups(name, subs, branches)
        compile_grid_bundle(name, d, subs, branches)
        print(f"[prebuild] {name}: {len(subs)} subs, {len(branches)} branches")

    compile_manifest(cases)
    print(f"[prebuild] done ({len(cases)} case(s))")


main()
