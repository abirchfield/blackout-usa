from esapp import PowerWorld
from esapp.components import *

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

CASE = r"C:\Users\wyatt\OneDrive - Texas A&M University\Research\Cases\Hawaii 37\Hawaii40_20231026.pwb"
pw = PowerWorld(CASE)

buses = pw[Bus,[
    "BusNum",
    "BusName",
    "Longitude:1",
    "Latitude:1"
]]

lines = pw[Branch,[
    "BusNum",   # FromNum
    "BusNum:1", # ToNum
    "LineX:2",    # 1/Z
    "LineLimMVA", # Pmax
    "LineCircuit" # Circuit number
]]

gens = pw[Gen,[
        "BusNum",
        "GenID",
        "GenMW",
        "GenFuelType:2",
        "GenMWMin",
        "GenMWMax"
]]

loads = pw[Load,[
        "BusNum",
        "LoadMW"
]]

# --- Config ---

CASE_NAME = "Hawaii"
CASE_DIR = Path(r"C:\Users\wyatt\Desktop\GitHub\blackout-usa\data\hawaii")

FUEL_MAP = {
    "Coal": "Coal-fired Steam", "Natural Gas": "Gas Combined Cycle",
    "Gas": "Gas Turbine", "Nuclear": "Nuclear Steam",
    "Wind": "Wind", "Solar": "Solar PV", "Oil": "Gas Turbine", "Hydro": "Gas Turbine",
}
# Category → (Pmin, Ramp, StartTime, FixedCost, FuelCost)
CAT = {
    "Gas Turbine":        (0, 25, 15,  800,  60),
    "Gas Combined Cycle": (0, 20, 60,  1200, 45),
    "Coal-fired Steam":   (0, 10, 360, 2000, 30),
    "Nuclear Steam":      (0, 5,  720, 5000, 10),
    "Wind":               (0, 50, 5,   100,  0),
    "Solar PV":           (0, 50, 5,   100,  0),
    "Load":               (0, 50, 5,   0,    200),
}

# --- Parse DataFrames ---

bus_info = {int(r["BusNum"]): (r["BusName"].strip(), float(r["Latitude:1"]), float(r["Longitude:1"]))
            for _, r in buses.iterrows()}

gens_by_bus = defaultdict(list)
for _, r in gens.iterrows():
    gens_by_bus[int(r["BusNum"])].append((abs(float(r["GenMW"])), r["GenFuelType:2"].strip()))

load_by_bus = defaultdict(float)
for _, r in loads.iterrows():
    load_by_bus[int(r["BusNum"])] += abs(float(r["LoadMW"]))

# Filter out zero-impedance branches (transformers)
line_list = [(int(r["BusNum"]), int(r["BusNum:1"]), round(1/float(r["LineX:2"]), 4), float(r["LineLimMVA"]))
             for _, r in lines.iterrows() if float(r["LineX:2"]) != 0]

# --- Generic helpers ---

def make_block(cat, unit_mws):
    pmin, ramp, start, fixed, fuel = CAT[cat]
    block = {"Pmin": pmin, "Ramp": ramp, "StartTime": start, "FixedCost": fixed, "FuelCost": fuel,
             "U": [{"Status": "IN", "P": mw} for mw in unit_mws]}
    if cat != "Load":
        block["Category"] = cat
    return block


# --- Hawaii-specific: co-located bus merging ---
# Hawaii's PW case has multiple buses per substation at different voltage levels
# (e.g. "ALOHA138", "ALOHA69"). This function groups them by (lat, lon), strips
# voltage suffixes to recover the substation name, and merges their gens/loads.

def build_hawaii_substations(bus_info, gens_by_bus, load_by_bus):
    loc_groups = defaultdict(list)
    for bn in sorted(bus_info):
        _, lat, lon = bus_info[bn]
        loc_groups[(lat, lon)].append(bn)

    bus_name_to_sub = {}
    subs = []
    for (lat, lon), bus_nums in sorted(loc_groups.items(), key=lambda kv: min(kv[1])):
        # Strip trailing voltage numbers and pick most common name
        names = [bus_info[bn][0] for bn in bus_nums]
        stripped = [re.sub(r'\d+$', '', n).strip() for n in names]
        sub_name = Counter(stripped).most_common(1)[0][0] or names[0]

        s = {"Name": sub_name, "Latitude": lat, "Longitude": lon}

        all_gens = [(mw, fuel) for bn in bus_nums for mw, fuel in gens_by_bus.get(bn, [])]
        total_load = sum(load_by_bus.get(bn, 0) for bn in bus_nums)

        if all_gens:
            cat_mw = defaultdict(float)
            for mw, fuel in all_gens:
                cat_mw[FUEL_MAP.get(fuel, "Gas Turbine")] += mw
            s["Gens"] = make_block(max(cat_mw, key=cat_mw.get), [mw for mw, _ in all_gens])

        if total_load > 0:
            s["Loads"] = make_block("Load", [total_load])

        subs.append(s)
        for bn in bus_nums:
            bus_name_to_sub[bus_info[bn][0]] = sub_name

    return subs, bus_name_to_sub


subs, bus_name_to_sub = build_hawaii_substations(bus_info, gens_by_bus, load_by_bus)

# --- Build branches (skip transformers: both endpoints → same substation) ---

branches = []
br_num = 0
for fr, to, z, pmax in sorted(line_list):
    fr_sub = bus_name_to_sub.get(bus_info[fr][0])
    to_sub = bus_name_to_sub.get(bus_info[to][0])
    if not fr_sub or not to_sub or fr_sub == to_sub:
        continue
    br_num += 1
    branches.append({"Number": br_num, "FromBus": fr_sub, "ToBus": to_sub, "Z": z, "Pmax": pmax})

# --- Build case.json ---

lats = [lat for _, lat, _ in bus_info.values()]
lons = [lon for _, _, lon in bus_info.values()]
pad = max(0.05, max(max(lons) - min(lons), max(lats) - min(lats)) * 0.15)

ref_bus = max((s for s in subs if "Gens" in s),
              key=lambda s: sum(u["P"] for u in s["Gens"]["U"]))["Name"]

case = {
    "name": CASE_NAME,
    "referenceBus": ref_bus,
    "mapConfig": {
        "bounds": {"xMin": min(lons) - pad, "xMax": max(lons) + pad,
                   "yMin": min(lats) - pad, "yMax": max(lats) + pad},
    },
}

# --- Write ---

CASE_DIR.mkdir(parents=True, exist_ok=True)
for fname, data in [("case.json", case), ("substations.json", subs), ("branches.json", branches)]:
    (CASE_DIR / fname).write_text(json.dumps(data, indent=2) + "\n")

n_xfmr = len(line_list) - len(branches)
print(f"Wrote {len(subs)} subs (from {len(bus_info)} buses), {len(branches)} branches ({n_xfmr} transformers dropped)")
