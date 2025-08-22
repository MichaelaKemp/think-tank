import { getAuth } from 'firebase/auth';
import {
    doc,
    getDoc,
    getFirestore,
    onSnapshot, serverTimestamp,
    setDoc
} from 'firebase/firestore';
import '../firebase';

export type TankConfig = {
  name?: string;
  sizeLiters?: number;
  fish?: any[];                 // shape = whatever you use in state
  plants?: any[];
  settings?: Record<string, any>;
  previewUri?: string;
  updatedAt?: any;
};

const db = getFirestore();

export async function saveCurrentTank(partial: Partial<TankConfig>) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await setDoc(
    doc(db, 'users', uid, 'tanks', 'current'),
    { ...partial, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getCurrentTank(): Promise<TankConfig | null> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'tanks', 'current'));
  return snap.exists() ? (snap.data() as TankConfig) : null;
}

export function watchCurrentTank(cb: (t: TankConfig | null) => void) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return () => {};
  const ref = doc(db, 'users', uid, 'tanks', 'current');
  return onSnapshot(ref, (s) => cb(s.exists() ? (s.data() as TankConfig) : null));
}