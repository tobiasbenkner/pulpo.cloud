import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.pulpo.agenda',
  appName: 'Pulpo Agenda',
  webDir: 'www',
  server: {
    url: 'https://agenda.pulpo.cloud',
    cleartext: false,
  },
};

export default config;
