// URL base del backend (sin /api). Se define en frontend/.env.local o en docker-compose.
export const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
