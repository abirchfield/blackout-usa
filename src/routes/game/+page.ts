export const ssr = false;
export const prerender = false;

import type { PageLoad } from './$types';
import { DEFAULT_CASE } from '$data/_out/registry';

export const load: PageLoad = ({ url }) => {
  return {
    caseName: url.searchParams.get('case') ?? DEFAULT_CASE,
    tutorial: url.searchParams.get('tutorial') === 'true',
  };
};
