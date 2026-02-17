// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBiGnGeMcAegfwVVgaBLJq8LHOzUbJwqEI",
  authDomain: "sitcad-capstone.firebaseapp.com",
  projectId: "sitcad-capstone",
  storageBucket: "sitcad-capstone.firebasestorage.app",
  messagingSenderId: "777589780638",
  appId: "1:777589780638:web:5da973753a34229b604b8f",
  measurementId: "G-GXYG3C8G5J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth=getAuth();
export const db=getFirestore(app);

export default {auth, app};