// Firebase configuratie
// Vervang deze waarden door je eigen Firebase project credentials
// Maak een Firebase project aan op: https://console.firebase.google.com/

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "foodalert-nl.firebaseapp.com",
  projectId: "foodalert-nl",
  storageBucket: "foodalert-nl.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Voor push notificaties via Firebase Cloud Messaging (FCM):
// 1. Ga naar Firebase Console → Project Settings → Cloud Messaging
// 2. Noteer de Server Key
// 3. Gebruik Expo's push notificatie service (easier dan raw FCM)
//    https://docs.expo.dev/push-notifications/push-notifications-setup/
