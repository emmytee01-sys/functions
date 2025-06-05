import express from "express";
import cors from "cors";
import 'dotenv/config';
import admin from "firebase-admin";
import { sendWhatsAppNotification } from "./whatsappService";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors());
app.use(express.json());

// Replace this with your real DB lookup
async function getPhoneNumberForUser(userId: string): Promise<string | null> {
  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return data?.whatsappNumber || null;
    }
    return null;
  } catch (err) {
    console.error("Error fetching user:", err);
    return null;
  }
}

app.post("/api/notifications/whatsapp", async (req, res) => {
  try {
    const { userIds, type, params } = req.body;
    if (!userIds || !type || !params) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const results = [];
    for (const userId of userIds) {
      const phoneNumber = await getPhoneNumberForUser(userId);
      if (!phoneNumber) {
        console.warn(`No WhatsApp number found for userId: ${userId}`);
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
