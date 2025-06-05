import * as admin from "firebase-admin";
import axios from "axios";
import express from "express";
import cors from "cors";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// Use environment variables for secrets
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

/**
 * Send WhatsApp notification using template or custom message
 */
export async function sendWhatsAppNotification(phoneNumber: string, type: string, params: any) {
  try {
    const cleanNumber = phoneNumber.replace(/[+\s]/g, "");
    const { templateName, parameters } = getTemplateConfig(type, params);

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: cleanNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text })),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("WhatsApp response:", response.data);
    return response.data;
  } catch (err: any) {
    console.error("WhatsApp API error:", err.response?.data || err);
    throw err;
  }
}

function getTemplateConfig(type: string, params: any) {
  let templateName = "generic_notification";
  let parameters: string[] = [
    params.message || "You have a new notification",
    params.appUrl,
  ];

  switch (type) {
    case "task_assigned":
      templateName = "task_alert";
      parameters = [
        params.taskTitle,
        params.projectName,
        params.dueDate || "No due date",
        params.appUrl,
      ];
      break;
    case "project_created":
      templateName = "company_added";
      parameters = [
        params.projectName,
        params.startDate,
        params.endDate,
        params.appUrl,
      ];
      break;
    case "added_to_project":
      templateName = "project_addede";
      parameters = [
        params.userName,
        params.projectName,
        params.managerName || "Your manager",
        params.appUrl,
      ];
      break;
    case "new_employee":
      templateName = "new_user";
      parameters = [
        params.employeeName,
        params.companyName,
        params.tempPassword || "Set by admin",
        params.appUrl,
      ];
      break;
    case "task_comment":
      templateName = "task_comment";
      parameters = [
        params.userName,
        params.taskTitle,
        params.commentPreview || "New comment",
        params.appUrl,
      ];
      break;
    case "task_status_update":
      templateName = "task_status_update";
      parameters = [
        params.taskTitle,
        params.oldStatus || "Previous status",
        params.newStatus,
        params.appUrl,
      ];
      break;
    case "project_status_update":
      templateName = "project_status_update";
      parameters = [
        params.projectName,
        params.oldStatus || "Previous status",
        params.newStatus,
        params.appUrl,
      ];
      break;
  }

  return {
    templateName,
    parameters,
    previewMessage: parameters.join(" | "),
  };
}

/**
 * Cloud Function endpoint for sending notifications
 */
app.post("/whatsappNotification", async (req, res) => {
  try {
    const { userIds, type, params } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds required" });
    }
    if (!type) {
      return res.status(400).json({ error: "Notification type required" });
    }

    const appUrl = params?.appUrl || "https://dev-workrate.web.app/";
    const usersSnap = await admin
      .firestore()
      .collection("employees")
      .where(admin.firestore.FieldPath.documentId(), "in", userIds)
      .get();

    const notifications = [];

    for (const doc of usersSnap.docs) {
      const user = doc.data();
      if (user.whatsappNumber) {
        try {
          const config = getTemplateConfig(type, { ...params, appUrl });
          const result = await sendWhatsAppNotification(
            user.whatsappNumber,
            type,
            { ...params, appUrl }
          );

          notifications.push({
            userId: doc.id,
            status: "success",
            messageId: result.messages?.[0]?.id,
            phoneNumber: user.whatsappNumber,
            templateName: config.templateName,
            parameters: config.parameters,
            previewMessage: config.previewMessage,
          });
        } catch (error: any) {
          notifications.push({
            userId: doc.id,
            status: "failed",
            phoneNumber: user.whatsappNumber,
            error: error.message || String(error),
          });
        }
      }
    }

    return res.json({ success: true, notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send notifications" });
  }
});

/**
 * Helper function to send notification to single user
 */
export async function notifyUser(userId: string, type: string, params: any) {
  const userDoc = await admin.firestore().collection("employees").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error("User not found");
  }

  const user = userDoc.data();
  if (!user?.whatsappNumber) {
    throw new Error("User has no WhatsApp number");
  }

  return sendWhatsAppNotification(user.whatsappNumber, type, params);
}

// Export the app for use in server.js
export default app;
