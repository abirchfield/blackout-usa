import { MediaQuery } from 'svelte/reactivity';
import { ViewConfig } from '$lib/view/constants';

const mq = typeof window !== 'undefined'
  ? new MediaQuery(`(max-width: ${ViewConfig.MOBILE_BREAKPOINT_PX - 1}px)`)
  : null;

/** Reactive mobile breakpoint detector (true when viewport is below mobile breakpoint). */
export const mobile = {
  get value() { return mq?.current ?? false; },
};
