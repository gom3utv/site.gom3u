// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQ55bgnc-4tBgJWvembsRuFK09xt6pdNQ",
  authDomain: "gom3uhub-35a9a.firebaseapp.com",
  projectId: "gom3uhub-35a9a",
  storageBucket: "gom3uhub-35a9a.firebasestorage.app",
  messagingSenderId: "902152871",
  appId: "1:902152871:web:856c00451883c0d8fdd182",
  measurementId: "G-0JM3ZGE33G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
