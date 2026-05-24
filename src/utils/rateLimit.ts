import rateLimit from "express-rate-limit";

export const newsletterLimiter = rateLimit({
    windowMs: 1000 * 60 * 60 * 24,

    max: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        message: "Too many requests. Try again tomorrow.",
    },
});
