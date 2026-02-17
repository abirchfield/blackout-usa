export const prerender = true;

import type { PageLoad } from './$types';
import { CASE_NAMES, loadCase } from '$data/_out/registry';

export function entries() {
  return CASE_NAMES.map(name => ({ case: name }));
}

export const load: PageLoad = async ({ params, url }) => {
  const gridCase = await loadCase(params.case);
  return {
    gridCase,
    tutorial: url.searchParams.get('tutorial') === 'true',
  };
};
