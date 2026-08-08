// ===============================
// FIREBASE INITIALIZATION
// ===============================
// Every other file that needs Firestore/Auth/Storage imports from here
// instead of calling initializeApp() again. This keeps one single
// connection to your Firebase project.
//
// WHAT TO EDIT: nothing, unless you're changing SDK version.
// WHAT NOT TO EDIT: don't duplicate initializeApp() elsewhere.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import firebaseConfig from "../config/firebase-config.js";

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
