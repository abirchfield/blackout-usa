export enum Solar {
    PHYSICAL = 'physical',     // Sun elevation angle (latitude-dependent)
}

const DEG2RAD = Math.PI / 180;
export const DEFAULT_DAY_OF_YEAR = 172; // June 21

/** Solar capacity fraction from sun elevation angle. Returns 0–1. */
export function solarFraction(latitude: number, dayOfYear: number, hour24: number): number {
    const latRad = latitude * DEG2RAD;
    // Solar declination: Earth's axial tilt toward sun
    const decl = -23.45 * DEG2RAD * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365);
    // Hour angle: 0 at solar noon (12:00), 15° per hour
    const ha = (hour24 - 12) * 15 * DEG2RAD;

    const sinElev = Math.sin(latRad) * Math.sin(decl)
                  + Math.cos(latRad) * Math.cos(decl) * Math.cos(ha);
    if (sinElev <= 0) return 0; // Sun below horizon

    // Normalize so that solar noon → 1.0
    const peakElev = Math.sin(latRad) * Math.sin(decl)
                   + Math.cos(latRad) * Math.cos(decl); // ha=0
    return sinElev / Math.max(peakElev, 0.01);
}
