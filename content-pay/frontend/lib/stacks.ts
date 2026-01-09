import { AppConfig, UserSession } from '@stacks/connect';

export const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export const appDetails = {
    name: 'Content Pay',
    icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.ico' : '/favicon.ico',
};
