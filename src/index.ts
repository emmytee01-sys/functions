import express from "express";
import cors from "cors";
import { sendWhatsAppNotification } from "./whatsappService"; // adjust path if needed

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/notifications/whatsapp", async (req, res) => {
  try {
    const { phoneNumber, type, params } = req.body;
    if (!phoneNumber || !type || !params) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const result = await sendWhatsAppNotification(phoneNumber, type, params);
    return res.json({ success: true, whatsappResponse: result });
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
