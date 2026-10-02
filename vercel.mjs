import { createVercelConfig } from './deployment/vercelConfig.js';

// Evaluated at build time. Only the backend's public origin is needed here.
export const config = createVercelConfig(process.env.LOCALBIZ_API_ORIGIN);
