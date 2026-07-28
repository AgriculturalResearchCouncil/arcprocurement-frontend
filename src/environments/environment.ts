/**
 * Development Environment Configuration
 * Used when running `ionic serve` or `ng serve`
 */
export const environment = {
  production: false,  // ← Change to false for development
  apiUrl: 'http://localhost:3001/api',  // ← Change to server IP
  appName: 'ARC Procurement Tracking System',
  version: '1.0.0',
  features: {
    enableNotifications: true,
    enableExport: true,
    enableImport: true
  }
};