import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface UserPayload {
  id: string;
  username: string;
}

declare module "express-serve-static-core" {
  interface Request {
    userPayload?: UserPayload;
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Unauthorized" });
    return; // Ensure we return here to avoid proceeding further
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    console.log(decoded);
    
    req.userPayload = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    return; // Ensure we return here to avoid proceeding further
  }
};

export { authMiddleware };
