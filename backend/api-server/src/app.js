import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
const app = express();
app.use(pinoHttp({
    logger,
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
}));
const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = corsOrigin ? corsOrigin.split(",").map(o => o.trim()) : [];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
            return callback(null, true);
        }
        if (origin.endsWith(".vercel.app")) {
            return callback(null, true);
        }
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
export default app;
