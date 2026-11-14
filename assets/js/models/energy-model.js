/**
 * Hourly solar + storage + grid dispatch model.
 *
 * An independent teaching demonstration, NOT an operational grid model.
 * Units: power in MW, energy in MWh, one-hour timesteps (so 1 MW for 1 h = 1 MWh).
 *
 * Dispatch rule (greedy, in priority order each hour):
 *   1. Solar serves demand.
 *   2. Surplus solar charges the battery (limited by power rating and headroom); the rest is curtailed.
 *   3. Deficit is met by battery discharge (limited by power rating and usable energy),
 *      then by grid import (limited by the import cap, and zero during outage hours).
 *   4. Anything still missing is unserved energy.
 */
import { mulberry32, gaussian, clamp } from '../lib/rng.js';

export const DEFAULT_ENERGY = {
  solarMW: 60,          // nameplate PV capacity
  cloudiness: 20,       // % reduction of clear-sky output
  peakDemandMW: 50,     // daily peak demand
  fluctuation: 6,       // % standard deviation of hourly demand noise
  batteryMWh: 80,       // usable energy capacity
  batteryMW: 20,        // charge/discharge power rating
  initialSoC: 50,       // % at 00:00
  efficiency: 90,       // round-trip efficiency %
  minSoC: 10,           // % reserve floor
  gridCapMW: 45,        // maximum grid import
  outageStart: 18,      // first hour of a grid outage (−1 for none)
  outageHours: 0,       // outage length in hours
  seed: 11,
};

/** Normalised clear-sky PV shape: half-sine between 06:00 and 19:00. */
export function solarShape(hour) {
  const t = hour + 0.5;
  if (t < 6 || t > 19) return 0;
  return Math.sin(Math.PI * (t - 6) / 13);
}

/** Normalised daily demand shape with morning and evening peaks (peak = 1). */
export function demandShape(hour) {
  const t = hour + 0.5;
  const base = 0.55;
  const morning = 0.25 * Math.exp(-((t - 8) ** 2) / 4);
  const evening = 0.45 * Math.exp(-((t - 19) ** 2) / 6);
  const midday = 0.12 * Math.exp(-((t - 14) ** 2) / 10);
  return base + morning + evening + midday;
}
const DEMAND_PEAK = Math.max(...Array.from({ length: 24 }, (_, h) => demandShape(h)));

export function simulate(input) {
  const p = { ...DEFAULT_ENERGY, ...input };
  const rand = mulberry32(p.seed);
  const eta = Math.sqrt(p.efficiency / 100); // split round-trip losses evenly between charge and discharge
  const minE = (p.minSoC / 100) * p.batteryMWh;
  let energy = clamp((p.initialSoC / 100) * p.batteryMWh, 0, p.batteryMWh);
  const hours = [];
  const totals = { demand: 0, solar: 0, solarUsed: 0, curtailed: 0, charge: 0, discharge: 0, grid: 0, unserved: 0, unservedHours: 0, peakGrid: 0 };

  for (let h = 0; h < 24; h++) {
    const solar = p.solarMW * solarShape(h) * (1 - p.cloudiness / 100);
    const noise = 1 + (p.fluctuation / 100) * gaussian(rand);
    const demand = Math.max(0, p.peakDemandMW * (demandShape(h) / DEMAND_PEAK) * noise);
    const outage = p.outageHours > 0 && h >= p.outageStart && h < p.outageStart + p.outageHours;

    const solarToLoad = Math.min(solar, demand);
    let surplus = solar - solarToLoad;
    let deficit = demand - solarToLoad;

    // Charge from surplus solar
    const chargeIn = Math.min(surplus, p.batteryMW, (p.batteryMWh - energy) / eta);
    energy += chargeIn * eta;
    surplus -= chargeIn;
    const curtailed = surplus;

    // Discharge to cover deficit
    const discharge = Math.min(deficit, p.batteryMW, Math.max(0, (energy - minE) * eta));
    energy -= discharge / eta;
    deficit -= discharge;

    const gridCap = outage ? 0 : p.gridCapMW;
    const grid = Math.min(deficit, gridCap);
    deficit -= grid;
    const unserved = deficit;

    hours.push({
      hour: h, demand, solar, solarToLoad, charge: chargeIn, discharge, grid, unserved, curtailed, outage,
      soc: (energy / p.batteryMWh) * 100,
    });
    totals.demand += demand; totals.solar += solar; totals.solarUsed += solarToLoad;
    totals.curtailed += curtailed; totals.charge += chargeIn; totals.discharge += discharge;
    totals.grid += grid; totals.unserved += unserved; totals.peakGrid = Math.max(totals.peakGrid, grid);
    if (unserved > 1e-6) totals.unservedHours++;
  }

  const metrics = {
    servedShare: 1 - totals.unserved / totals.demand,
    localShare: (totals.solarUsed + totals.discharge) / totals.demand, // share of demand met without the grid
    curtailedShare: totals.solar > 0 ? totals.curtailed / totals.solar : 0,
    cycles: p.batteryMWh > 0 ? totals.discharge / p.batteryMWh : 0,
    endSoC: hours[23].soc,
    ...totals,
  };
  return { params: p, hours, metrics };
}

/** Reliability label from unserved energy. Thresholds are illustrative. */
export function reliabilityLabel(m) {
  if (m.unserved < 0.01) return { level: 'good', label: 'All demand served' };
  if (m.servedShare > 0.98) return { level: 'warn', label: 'Minor shortfall' };
  return { level: 'bad', label: 'Significant unserved energy' };
}
