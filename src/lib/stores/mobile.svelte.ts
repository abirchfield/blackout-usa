import { ViewConfig } from '$lib/view/constants';

function createMobileState() {
  let isMobile = $state(false);

  if (typeof window !== 'undefined') {
    const check = () => { isMobile = window.innerWidth < ViewConfig.MOBILE_BREAKPOINT_PX; };
    check();
    window.addEventListener('resize', check);
  }

  return {
    get value() { return isMobile; },
  };
}

export const mobile = createMobileState();
