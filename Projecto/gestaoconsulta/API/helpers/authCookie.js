import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
  JWT_EXPIRES_IN,
} from '../config/auth.js';

function durationToMilliseconds(duration) {
  const match = String(duration).match(/^(\d+)([smhdy])$/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: AUTH_COOKIE_SAME_SITE,
    secure: AUTH_COOKIE_SECURE,
    maxAge: durationToMilliseconds(JWT_EXPIRES_IN),
  });
}
