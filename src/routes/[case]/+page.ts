export const prerender = true;

import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { CASE_NAMES, UnknownCaseError, loadCase } from '$lib/cases/registry';

export function entries() {
  return CASE_NAMES.map(name => ({ case: name }));
}

export const load: PageLoad = async ({ params, url }) => {
  try {
    const gridCase = await loadCase(params.case);
    return {
      gridCase,
      tutorial: url.searchParams.get('tutorial') === 'true',
    };
  } catch (e) {
    if (e instanceof UnknownCaseError) {
      throw error(404, e.message);
    }
    throw e;
  }
};
