const defaultApiBase = 'http://localhost:8000';

const normalizeBase = (value: string) => value.replace(/\/+$/, '');

export const API_BASE = normalizeBase(
  import.meta.env.VITE_API_BASE_URL || defaultApiBase,
);

export const WS_BASE = normalizeBase(
  import.meta.env.VITE_WS_BASE_URL ||
    API_BASE.replace(/^http/i, 'ws'),
);
