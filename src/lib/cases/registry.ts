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

export async function loadCase(caseName: string): Promise<GridCase> {
  if (!CASE_NAMES.includes(caseName)) {
    throw new Error(`Unknown case: ${caseName}. Available: ${CASE_NAMES.join(', ')}`);
  }

  const loadBundle = bundles[`../../../data/_out/${caseName}/grid-data.json`];
  const loadScenario = scenarios[`./scenarios/${caseName}.ts`];

  if (!loadBundle || !loadScenario) {
    throw new Error(`Case asset mismatch for: ${caseName}. Re-run data generation and verify scenario module exists.`);
  }

  const [bundle, scenario] = await Promise.all([loadBundle(), loadScenario()]);

  return {
    ...bundle.default,
    scenarios: scenario.scenarios,
  };
}
