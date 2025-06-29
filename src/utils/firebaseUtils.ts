import * as admin from 'firebase-admin';

import { Schema } from 'mongoose';
import { Notification } from '../modules/notification/notification.model';

// Initialize Firebase Admin SDK (ensure it's only done once)
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (!firebaseInitialized) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true; // Set flag to true to prevent re-initialization
  }
};

// This function can now be reused in your services or utils as needed
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  receiverId: Schema.Types.ObjectId | string // INFO : naki  userId hobe eita
): Promise<void> => {
  try {
    // Initialize Firebase Admin SDK only once
    initializeFirebase();

    const message = {
      notification: {
        title,
        // body: messageBody.toString(), // Ensure it's a string
      },
      token: fcmToken,
    };

    // Send the notification
    await admin.messaging().send(message);

    // Log the notification in the database
    await Notification.create({
      title,
      //  messageBody,
      receiverId, // INFO : naki  userId hobe eita
    });

    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Error sending notification');
  }
};
