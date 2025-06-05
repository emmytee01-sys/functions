import admin from "firebase-admin";

/**
 * Fetch a user by their userId from Firestore.
 * Returns user object with whatsappNumber, email, etc., or null if not found.
 */
export async function getUserById(userId: string): Promise<{ whatsappNumber?: string; email?: string; id: string } | null> {
  const userDoc = await admin.firestore().collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  const user = userDoc.data();
  return {
    id: userId,
    whatsappNumber: user?.whatsappNumber,
    email: user?.email,
    ...user,
  };
}