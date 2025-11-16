import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveLocal = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.log("Save error:", e);
  }
};

export const loadLocal = async (key: string) => {
  try {
    const res = await AsyncStorage.getItem(key);
    return res ? JSON.parse(res) : null;
  } catch (e) {
    return null;
  }
};

export const clearLocal = async (keys: string[]) => {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    console.log("Clear error:", e);
  }
};