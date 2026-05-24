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