const isDemo = typeof window !== 'undefined' && window.location.hostname === 'demo.pulpo.cloud';

export const config = {
  demo: isDemo,
  defaultEmail: isDemo ? 'demo@pulpo.cloud' : '',
  defaultPassword: isDemo ? 'demo1234' : '',
};
