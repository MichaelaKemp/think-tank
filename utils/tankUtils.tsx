import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTank, getAllTanks } from "../services/tanks";

export type TankSnapshot = {
  speciesCount: number;
  env: string;
  temp: number;
  oxy: number;
  avgPhText: string;
  backgroundKey?: string;
  timestamp: number;
};

export const getTankSnapshotKey = (tankId: string) =>
  `thinktank:snapshot:${tankId}`;

export const parseSnapshot = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const persistTankSnapshot = async (
  tankId: string,
  snapshot: TankSnapshot
) => {
  try {
    await AsyncStorage.setItem(
      getTankSnapshotKey(tankId),
      JSON.stringify(snapshot)
    );
  } catch {}
};

export const enrichTanksWithSnapshots = async (tanks: any[]) => {
  const enriched = [];
  for (const t of tanks) {
    const key = getTankSnapshotKey(t.tankId);
    const raw = await AsyncStorage.getItem(key);
    const stats = parseSnapshot(raw);
    enriched.push({ ...t, stats });
  }
  return enriched;
};

export const createDefaultTankIfNeeded = async (fromSignup: boolean) => {
  let tanks = await getAllTanks();
  if (!fromSignup && tanks.length === 0) {
    await createTank("Default Tank");
    tanks = await getAllTanks();
  }
  return tanks;
};

export function sanitizeTankName(name: string): string {
  if (!name) return "My Tank";

  return name
    .trim()                     // remove leading/trailing spaces
    .replace(/\s+/g, " ")       // collapse multiple spaces
    .replace(/[^\w\s-]/g, "")   // remove weird characters
    .replace(/_/g, " ")         // replace underscores with spaces
    .replace(/\s+/g, "-")       // turn spaces to hyphens for safety
    .substring(0, 40);          // sensible limit, avoids storage issues
}
