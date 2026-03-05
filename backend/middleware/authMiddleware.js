import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.appJwtSecret);
    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Not enough permissions' });
  }

  return next();
};
