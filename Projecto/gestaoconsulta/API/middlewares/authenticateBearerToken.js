import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, JWT_SECRET } from '../config/auth.js';

function getAuthorizationToken(req) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);
  const normalizedScheme = scheme?.toLowerCase();
  const isSupportedScheme = normalizedScheme === 'bearer' || normalizedScheme === 'beiratoken';

  if (!isSupportedScheme || !token || extraParts.length > 0) {
    return {
      error: 'Formato esperado: Authorization: Bearer <token> ou BEIRATOKEN <token>.',
    };
  }

  return { token };
}

function getCookieToken(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const authCookie = cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!authCookie) {
    return null;
  }

  return {
    token: decodeURIComponent(authCookie.slice(AUTH_COOKIE_NAME.length + 1)),
  };
}

function getToken(req) {
  return getAuthorizationToken(req) || getCookieToken(req);
}

export function authenticateBearerToken(req, res, next) {
  const parsed = getToken(req);

  if (!parsed) {
    return res.status(401).json({ error: 'Token de autenticacao nao encontrado.' });
  }

  if (parsed.error) {
    return res.status(401).json({ error: parsed.error });
  }

  try {
    req.user = jwt.verify(parsed.token, JWT_SECRET);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faca login novamente.' });
    }

    return res.status(401).json({ error: 'Token invalido.' });
  }
}
