import { getAuth } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import '../firebase';

export type Progress = {
  step?: number;
  data?: Record<string, any>;
  updatedAt?: any;
};

const db = getFirestore();

export async function saveProgress(progress: Progress) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await setDoc(
    doc(db, 'users', uid, 'progress', 'current'),
    { ...progress, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function watchProgress(cb: (p: Progress | null) => void) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return () => {};
  const ref = doc(db, 'users', uid, 'progress', 'current');
  return onSnapshot(ref, (snap) => cb(snap.exists() ? (snap.data() as Progress) : null));
}