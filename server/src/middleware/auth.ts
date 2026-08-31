import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'pipelineiq-dev-secret';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies JWT from Authorization: Bearer <token> header.
 * Returns 401 if missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 * Returns 403 if user doesn't have the required role.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Generates a JWT token for a user.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Returns ownership filter for database queries.
 * - Managers: no filter (sees all records)
 * - Reps: filters by assigned_to = current user id
 * 
 * This is the core authorization mechanism — every query
 * for leads/opportunities/customers goes through this.
 */
export function getOwnershipFilter(user: JwtPayload): { assignedTo?: string } {
  if (user.role === Role.SALES_MANAGER) {
    return {}; // No filter — managers see everything
  }
  return { assignedTo: user.userId }; // Reps only see their own
}
