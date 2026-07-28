/**
 * Production Environment Configuration
 * Used when running on ARCGeoServer01
 */
export const environment = {
  production: true,
  apiUrl: 'http://ARCGeoServer01.arc.local:3001/api',  // ← Use localhost since frontend and backend are on same server
  appName: 'ARC Procurement Tracking System',
  version: '1.0.0',
  features: {
    enableNotifications: true,
    enableExport: true,
    enableImport: true
  }
};