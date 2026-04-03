import type { GridCase } from '$lib/types';

const MANIFEST_PATH = '../../../data/_out/manifest.json';

const bundles = import.meta.glob<{ default: Omit<GridCase, 'scenarios'> }>(
  '../../../data/_out/*/grid-data.json',
  { eager: false },
);
const scenarios = import.meta.glob<{ scenarios: GridCase['scenarios'] }>(
  './scenarios/*.ts',
  { eager: false },
);
const manifests = import.meta.glob<{ default: { cases: string[] } }>(
  '../../../data/_out/manifest.json',
  { eager: true },
);

const manifestCases = manifests[MANIFEST_PATH]?.default.cases ?? [];

export const CASE_NAMES = manifestCases;

if (CASE_NAMES.length === 0) {
  throw new Error(
    'No cases found. Expected manifest at data/_out/manifest.json with a non-empty "cases" array.',
  );
}

export const DEFAULT_CASE = CASE_NAMES[0];

/** Raised when a route requests a case slug not present in the generated manifest. */
export class UnknownCaseError extends Error {
  constructor(caseName: string, available: string[]) {
    super(`Unknown case: ${caseName}. Available: ${available.join(', ')}`);
    this.name = 'UnknownCaseError';
  }
}

export async function loadCase(caseName: string): Promise<GridCase> {
  if (!CASE_NAMES.includes(caseName)) {
    throw new UnknownCaseError(caseName, CASE_NAMES);
  }

  const loadBundle = bundles[`../../../data/_out/${caseName}/grid-data.json`];
  const loadScenario = scenarios[`./scenarios/${caseName}.ts`];

  if (!loadBundle || !loadScenario) {
    throw new Error(`Case asset mismatch for: ${caseName}. Re-run data generation and verify scenario module exists.`);
  }

  let bundle, scenario;
  try {
    [bundle, scenario] = await Promise.all([loadBundle(), loadScenario()]);
  } catch (err) {
    throw new Error(`Failed to load case "${caseName}": ${err instanceof Error ? err.message : err}`);
  }

  if (!scenario.scenarios || typeof scenario.scenarios !== 'object') {
    throw new Error(`Case "${caseName}" scenario module is missing a "scenarios" export.`);
  }

  return {
    ...bundle.default,
    scenarios: scenario.scenarios,
  };
}
