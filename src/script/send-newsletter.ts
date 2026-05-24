import "dotenv/config";

import { resend } from "../lib/resend";
import { connectDB, db } from "../lib/db";
import { template } from "../utils/template";

const DAILY_LIMIT = 50;
const NEWSLETTER_ID = "building-a-portfolio-that-can-grow-with-me";
const SUBJECT = "New article published";

async function sendNewsletter() {
    try {
        await connectDB();
        const subscribers = db.collection("subscribers");

        const users = await subscribers
            .find({
                verified: true,
                subscribe: true,
                $or: [
                    {
                        lastNewsletterId: {
                            $ne: NEWSLETTER_ID,
                        },
                    },
                    {
                        lastNewsletterId: null,
                    },
                ],
            })
            .limit(DAILY_LIMIT)
            .toArray();

        if (!users.length) {
            console.log("No eligible subscribers");
            process.exit(0);
        }

        console.log(`Sending to ${users.length} subscribers`);

        for (const user of users) {
            try {
                const { data, error } = await resend.emails.send({
                    from: process.env.MAIL_FROM!,
                    to: user.email,
                    subject: SUBJECT,
                    html: template(user.token),
                });

                if (data) {
                    await subscribers.updateOne(
                        {
                            _id: user._id,
                        },
                        {
                            $set: {
                                lastNewsletterId: NEWSLETTER_ID,
                            },
                        },
                    );

                    console.log(`Sent to ${user.email}`);
                } else {
                    console.log("error", error);
                    throw new Error(error.message);
                }
            } catch (error) {
                console.log(`Failed ${user.email}`);
                console.log(error);
            }
        }

        console.log("Newsletter sending complete");
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

sendNewsletter();
