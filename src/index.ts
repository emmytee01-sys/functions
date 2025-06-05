import express from "express";
import cors from "cors";
import 'dotenv/config';
import admin from "firebase-admin";
import { sendWhatsAppNotification } from "./whatsappService";
import { getUserById } from "./userService"; // <-- Import the service

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT, // Optional, if needed
  });
}

const app = express();
app.use(cors({
  origin: "*", // or use "*" for all origins (not recommended for production)
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.post("/api/notifications/whatsapp", async (req, res) => {
  try {
    const { userIds, type, params } = req.body;
    if (!userIds || !type || !params) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const results = [];
    for (const userId of userIds) {
      const user = await getUserById(userId);
      const phoneNumber = user?.whatsappNumber;
      if (!phoneNumber) {
        console.warn(`No WhatsApp number found for userId: ${userId}`);
        results.push({ userId, status: "error", error: "No WhatsApp number found" });
        continue;
      }
      try {
        const result = await sendWhatsAppNotification(phoneNumber, type, params);
        results.push({ userId, status: "sent", result });
      } catch (err: any) {
        results.push({ userId, status: "error", error: err.message || err });
      }
    }
    return res.json({ success: true, results });
  } catch (err: any) {
    console.error("WhatsApp send error:", err.message || err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

export default app;

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
