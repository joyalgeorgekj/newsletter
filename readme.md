# Newsletter Server

## Folder Structure

```txt
newsletter-server/
├── src/
│   ├── db.ts
│   ├── index.ts
│   ├── resend.ts
│   ├── token.ts
│   └── types.ts
├── .env
├── package.json
└── tsconfig.json
```

---

# package.json

```json
{
    "name": "newsletter-server",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "pnpm tsx watch src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js"
    },
    "dependencies": {
        "cors": "^2.8.5",
        "dotenv": "^16.5.0",
        "express": "^5.1.0",
        "helmet": "^8.1.0",
        "mongodb": "^6.16.0",
        "resend": "^4.5.1"
    },
    "devDependencies": {
        "@types/cors": "^2.8.19",
        "@types/express": "^5.0.1",
        "@types/node": "^22.15.18",
        "tsx": "^4.19.4",
        "typescript": "^5.8.3"
    }
}
```

---

# tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true
    },
    "include": ["src"]
}
```

---

# .env

```env
PORT=3000

FRONTEND_URL=http://localhost:3001

MONGODB_URI=

RESEND_API_KEY=

MAIL_FROM=onboarding@resend.dev
```

---

# src/types.ts

```ts
export interface Subscriber {
    email: string;

    verified: boolean;

    subscribe: boolean;

    token: string;

    lastSentAt: Date | null;
}
```

---

# src/db.ts

```ts
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export const db = client.db("newsletter");

export async function connectDB() {
    try {
        await client.connect();

        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);

        process.exit(1);
    }
}
```

---

# src/token.ts

```ts
import crypto from "node:crypto";

export function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}
```

---

# src/resend.ts

```ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);
```

---

# src/index.ts

```ts
import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";

import { db, connectDB } from "./db";
import { resend } from "./resend";
import { generateToken } from "./token";

const app = express();

app.use(express.json());

app.use(cors());

app.use(helmet());

connectDB();

const subscribers = db.collection("subscribers");

app.get("/health", (_, res) => {
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

        if (!email) {
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

                lastSentAt: null,
            });
        } else {
            if (
                existingUser.verified &&
                existingUser.subscribe
            ) {
                return res.json({
                    success: true,

                    message:
                        "User already subscribed",
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
                }
            );
        }

        const verifyLink = `${process.env.FRONTEND_URL}/verify/${token}`;

        await resend.emails.send({
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

        return res.json({
            success: true,

            message:
                "Verification email sent",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,

            message: "Internal server error",
        });
    }
});

app.get("/verify/:token", async (req, res) => {
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
            }
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

app.post("/unsubscribe-request", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const user = await subscribers.findOne({
            email,
        });

        if (!user) {
            return res.json({
                success: true,

                message:
                    "If the email exists, an unsubscribe link has been sent",
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
            }
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

            message:
                "If the email exists, an unsubscribe link has been sent",
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
            }
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
```

---

# Install

```bash
pnpm install
```

---

# Development

```bash
pnpm dev
```

---

# Build

```bash
pnpm build
```

---

# Production

```bash
pnpm start
```

---

# Required Frontend Routes

```txt
/verify/[token]
/unsubscribe/[token]
```

These can simply show:

* loading state
* call backend endpoint
* show success/failure UI
