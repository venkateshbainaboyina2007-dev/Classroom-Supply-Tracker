import { verifyToken } from "../lib/auth";
/**
 * Middleware to authenticate requests via session cookie or Authorization header.
 */
export function authenticate(req, res, next) {
    let token;
    // 1. Try reading from cookie
    if (req.cookies && req.cookies.session_token) {
        token = req.cookies.session_token;
    }
    // 2. Try reading from Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    }
    if (!token) {
        res.status(401).json({ error: "Unauthorized: No session token provided" });
        return;
    }
    const payload = verifyToken(token);
    if (!payload || !payload.id || !payload.username || !payload.role) {
        res.status(401).json({ error: "Unauthorized: Invalid or expired session token" });
        return;
    }
    req.user = payload;
    next();
}
/**
 * Middleware to restrict endpoints to specific roles (e.g. ['admin']).
 */
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: `Forbidden: Requires one of these roles: ${roles.join(", ")}` });
            return;
        }
        next();
    };
}
