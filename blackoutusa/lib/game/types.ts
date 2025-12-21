export interface Unit {
  Status: string;
  P: number;
  Pset: number;
  P0: number;
  Status0: string;
  StatusCount: number;
}

export interface Substation {
  Name: string;
  Latitude: number;
  Longitude: number;
  Units: number;
  Category: string;
  Pmax: number;
  Pmin: number;
  FixedCost: number;
  FuelCost: number;
  StartTime: number;
  Ramp: number;
  U: Unit[];
  Number: string;
  island?: number;
}

export interface Branch {
  FromNum: string;
  ToNum: string;
  Status1: string;
  Status2: string;
  P: number;
  Pmax: number;
  Circuits: number;
  Z: number;
  sub1: Substation;
  sub2: Substation;
  dist: number;
}

export interface DashboardStats {
  day: number;
  timeStr: string;
  frequency: number;
  loadServed: number;
  loadUnserved: number;
  reserves: number;
  windGen: number;
  solarGen: number;
  thermalGen: number;
  nuclearGen: number;
  avgCost: number;
  totalCost: number;
  currentOpCost: number;
  currentFuelCost: number;
  currentUnservedCost: number;
  totalOpCost: number;
  totalFuelCost: number;
  totalUnservedCost: number;
}