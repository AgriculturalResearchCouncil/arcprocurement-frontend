/**
 * Development Environment Configuration
 * Used when running `ionic serve` or `ng serve`
 */
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:3001/api',
  appName: 'ARC Procurement Tracking System',
  version: '1.0.0',
  features: {
    enableNotifications: true,
    enableExport: true,
    enableImport: true
  }
};