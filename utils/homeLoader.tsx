import { createDefaultTankIfNeeded, enrichTanksWithSnapshots } from "./tankUtils";

export const loadAllHomeTanks = async (fromSignup: boolean) => {
  const tanks = await createDefaultTankIfNeeded(fromSignup);
  return await enrichTanksWithSnapshots(tanks);
};