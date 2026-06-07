export const COOKIE_NAME = 'finlo_refresh';

const isProd = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh',
};
