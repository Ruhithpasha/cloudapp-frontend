// API URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Local storage keys
export const LOCAL_STORAGE_IMAGE_KEY_PREFIX = 'cloud_image_';
export const LOCAL_BACKUP_IMAGE_KEY_PREFIX = 'backup_image_';

// Polling interval for checking missing images (30 seconds)
export const POLL_INTERVAL_MS = 30000; 