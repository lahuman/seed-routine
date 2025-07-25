import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정 (실제 값으로 채워져야 함)
export const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
      apiKey: "AIzaSyAJwRp-LjGZrZsowSdht77Bwx1iOtqUS5Q",
  authDomain: "routine-6ab7c.firebaseapp.com",
  projectId: "routine-6ab7c",
  storageBucket: "routine-6ab7c.firebasestorage.app",
  messagingSenderId: "220002943117",
  appId: "1:220002943117:web:2b1c0584d53dd38c7ee2c4",
  measurementId: "G-QPCV71547T"
};

// 앱 ID (실제 값으로 채워져야 함)
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Firebase 초기화
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
