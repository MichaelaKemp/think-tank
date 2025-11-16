import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase";

export const getOnboardingKey = () => {
  const currentUser = auth.currentUser;
  return currentUser ? `thinktank:onboardingDone:${currentUser.uid}` : null;
};

export const readOnboardingStatus = async (key: string | null) => {
  if (!key) return "true"; // default: already done
  return await AsyncStorage.getItem(key);
};

export const writeOnboardingStatus = async (key: string | null, value: "true" | "false") => {
  if (!key) return;
  await AsyncStorage.setItem(key, value);
};

export const shouldShowHomeTour = async (routeOnboarding: any) => {
  const fromSignup = routeOnboarding === true;
  if (!fromSignup) return false;

  const key = getOnboardingKey();
  const done = await readOnboardingStatus(key);
  return done !== "true";
};

export const getListKey = (uid?: string) => {
  return uid ? `thinktank:listDone:${uid}` : null;
};

export const readListTour = async (key: string | null) => {
  if (!key) return "true";
  return await AsyncStorage.getItem(key);
};

export const writeListTour = async (key: string | null, value: "true" | "false") => {
  if (key) await AsyncStorage.setItem(key, value);
};