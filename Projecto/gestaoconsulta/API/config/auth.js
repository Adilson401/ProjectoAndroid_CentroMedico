export const JWT_SECRET = process.env.JWT_SECRET || 'famor2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '19y';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'famor_token';
export const AUTH_COOKIE_SAME_SITE = process.env.AUTH_COOKIE_SAME_SITE || 'lax';
export const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === 'true';
