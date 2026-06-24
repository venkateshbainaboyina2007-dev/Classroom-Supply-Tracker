import crypto from "crypto";
const JWT_SECRET = process.env.JWT_SECRET || "default-dev-secret-key-1234567890-do-not-use-in-production";
/**
 * Hash a password using Node's native crypto.scrypt
 */
export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}
/**
 * Verify a password against a hash
 */
export function verifyPassword(password, hashWithSalt) {
    const parts = hashWithSalt.split(":");
    if (parts.length !== 2)
        return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"));
}
/**
 * Custom lightweight JWT signing function
 */
export function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${header}.${payloadBase64}`)
        .digest("base64url");
    return `${header}.${payloadBase64}.${signature}`;
}
/**
 * Custom lightweight JWT verifying function
 */
export function verifyToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url");
    if (signature !== expectedSignature)
        return null;
    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    }
    catch {
        return null;
    }
}
