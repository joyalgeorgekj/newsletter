import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { connectDB, db } from "./lib/db";
import { generateToken } from "./lib/jwt";
import { resend } from "./lib/resend";
import isEmail from "validator/lib/isEmail";
import { newsletterLimiter } from "./utils/rateLimit";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(
    ["/subscribe", "/subscribe/:token", "/unsubscribe", "/unsubscribe/:token"],
    newsletterLimiter,
);
app.use(
    express.json({
        limit: "10kb",
    })
);

connectDB();
const subscribers = db.collection("subscribers");

app.get("/health", (_, res) => {
    console.log("Health checking");

    return res.json({
        status: "ok",
        uptime: process.uptime(),
    });
});

app.post("/subscribe", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Email required",
            });
        }

        const existingUser = await subscribers.findOne({
            email,
        });

        const token = generateToken();

        if (!existingUser) {
            await subscribers.insertOne({
                email,
                verified: false,
                subscribe: true,
                token,
                lastNewsletterId: null,
            });
        } else {
            if (existingUser.verified && existingUser.subscribe) {
                return res.json({
                    success: true,
                    message: "User already subscribed",
                });
            }

            await subscribers.updateOne(
                {
                    email,
                },
                {
                    $set: {
                        subscribe: true,
                        verified: false,
                        token,
                    },
                },
            );
        }

        const verifyLink = `${process.env.BASE_URL}/subscribe/${token}`;

        const { error } = await resend.emails.send({
            from: process.env.MAIL_FROM!,
            to: email,
            subject: "Verify your newsletter subscription",
            html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>
                        Verify your subscription
                    </h2>

                    <p>
                        Click the button below to verify your newsletter subscription.
                    </p>

                    <a
                        href="${verifyLink}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background: black;
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                        ">
                        Verify Subscription
                    </a>
                </div>
            `,
        });

        if (error) {
            console.error({ error });
            return res.send({
                success: false,
                message: "Resend error",
            });
        }

        return res.json({
            success: true,
            message: "Verification email sent",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

app.get("/subscribe/:token", async (req, res) => {
    try {
        const token = req.params.token;

        const user = await subscribers.findOne({
            token,
        });

        if (!user) {
            return res.status(404).send(`
                <h1>
                    Invalid verification link
                </h1>
            `);
        }

        await subscribers.updateOne(
            {
                token,
            },
            {
                $set: {
                    verified: true,
                },
            },
        );

        return res.send(`
            <div style="font-family: sans-serif; padding: 20px;">
                <h1>
                    Subscription verified
                </h1>

                <p>
                    You will now receive newsletter updates.
                </p>
            </div>
        `);
    } catch (error) {
        console.log(error);

        return res.status(500).send(`
            <h1>
                Internal server error
            </h1>
        `);
    }
});

app.post("/unsubscribe", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Email required",
            });
        }

        const user = await subscribers.findOne({
            email,
        });

        if (!user) {
            return res.json({
                success: true,
                message: "User don't exist",
            });
        }

        const token = generateToken();

        await subscribers.updateOne(
            {
                email,
            },
            {
                $set: {
                    token,
                },
            },
        );

        const unsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe/${token}`;

        await resend.emails.send({
            from: process.env.MAIL_FROM!,
            to: email,
            subject: "Confirm newsletter unsubscribe",
            html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>
                        Confirm unsubscribe
                    </h2>

                    <p>
                        Click below to unsubscribe from the newsletter.
                    </p>

                    <a
                        href="${unsubscribeLink}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background: black;
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                        ">
                        Unsubscribe
                    </a>
                </div>
            `,
        });

        return res.json({
            success: true,
            message: "An unsubscribe link has been sent",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

app.get("/unsubscribe/:token", async (req, res) => {
    try {
        const token = req.params.token;

        const user = await subscribers.findOne({
            token,
        });

        if (!user) {
            return res.status(404).send(`
                <h1>
                    Invalid unsubscribe link
                </h1>
            `);
        }

        await subscribers.updateOne(
            {
                token,
            },
            {
                $set: {
                    subscribe: false,
                },
            },
        );

        return res.send(`
            <div style="font-family: sans-serif; padding: 20px;">
                <h1>
                    Successfully unsubscribed
                </h1>

                <p>
                    You will no longer receive newsletter updates.
                </p>
            </div>
        `);
    } catch (error) {
        console.log(error);

        return res.status(500).send(`
            <h1>
                Internal server error
            </h1>
        `);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
