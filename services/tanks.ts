import { getAuth } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, serverTimestamp, setDoc, } from "firebase/firestore";
import "../firebase";

export type TankConfig = {
  name?: string;
  sizeLiters?: number;
  fish?: any[];
  plants?: any[];
  settings?: Record<string, any>;
  previewUri?: string;
  updatedAt?: any;
  createdAt?: any;
};

const db = getFirestore();

export async function createTank(name: string = "My Tank") {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const tankId = `tank_${Date.now()}`;

  await setDoc(doc(db, "users", uid, "tanks", tankId), {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    fish: [],
    plants: [],
    settings: {
      env: "freshwater",
      temp: 26,
      oxy: 60,
      backgroundKey: "default",
    },
    previewUri: null,
  });

  return tankId;
}

export async function saveTank(tankId: string, partial: Partial<TankConfig>) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  await setDoc(
    doc(db, "users", uid, "tanks", tankId),
    { ...partial, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getTank(tankId: string): Promise<TankConfig | null> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid, "tanks", tankId));
  return snap.exists() ? (snap.data() as TankConfig) : null;
}

export function watchTank(tankId: string, cb: (t: TankConfig | null) => void) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return () => {};

  const ref = doc(db, "users", uid, "tanks", tankId);

  return onSnapshot(ref, (s) =>
    cb(s.exists() ? (s.data() as TankConfig) : null)
  );
}

export async function getAllTanks() {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return [];

  const c = collection(db, "users", uid, "tanks");
  const snap = await getDocs(c);

  return snap.docs.map((d) => ({ tankId: d.id, ...d.data() }));
}

export async function deleteTank(tankId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  await deleteDoc(doc(db, "users", uid, "tanks", tankId));
}