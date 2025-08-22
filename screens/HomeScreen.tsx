import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FishTank from "../assets/images/Fish-Tank.jpeg";
import TankOverviewCard from "../components/TankOverviewCard";
import { Card, OceanBackground, ocean } from "../components/ui";
import { getCurrentTank } from "../services/tanks";

// Firebase Auth signOut
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

import Logo from "../assets/images/logo.png";

type TankSnapshot = {
  speciesCount: number;
  env: "freshwater" | "saltwater";
  temp: number;
  oxy: number;
  avgPhText: string;
  timestamp: number;
};

export default function HomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [tankPreviewUri, setTankPreviewUri] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TankSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Prefer Aquarium's parameters; else read from storage; also load tank snapshot
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        // Prefer the parameters from Aquarium (instant update on return)
        const fromRoute = route?.params?.tankPreviewUri as string | undefined;
        if (fromRoute && active) {
          setTankPreviewUri(fromRoute);
        } else {
          // Local AsyncStorage fallback
          const savedUri = await AsyncStorage.getItem("lastTankScreenshotUri");
          if (active && savedUri) setTankPreviewUri(savedUri);
          else {
            // Firestore fallback (if AsyncStorage was cleared)
            const tank = await getCurrentTank();
            if (active && tank?.previewUri) setTankPreviewUri(tank.previewUri);
          }
        }

        // load any cached snapshot
        const snapStr = await AsyncStorage.getItem("thinktank:snapshot");
        if (active && snapStr) {
          try {
            setSnapshot(JSON.parse(snapStr));
          } catch {}
        }
      })();

      return () => {
        active = false;
      };
    }, [route?.params?.tankPreviewUri])
  );

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      // No navigation.reset needed — App.tsx swaps to auth stack when user becomes null
    } catch (e) {
      console.warn("Logout failed", e);
    } finally {
      setLoggingOut(false);
    }
  };

  // Background prop so never pass null
  const backgroundProp = tankPreviewUri ? { uri: tankPreviewUri } : FishTank;

  return (
    <OceanBackground>
      <View
        style={{
          position: "absolute",
          top: insets.top + 16,
          right: 20,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={[styles.logoutBtn, loggingOut && { opacity: 0.7 }]}
          activeOpacity={0.9}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          {loggingOut ? (
            <ActivityIndicator />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="log-out-outline" size={16} color={ocean.primary} />
              <Text style={styles.logoutText}>Log out</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 120,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <Image source={Logo} style={styles.logoImg} />
          <Text style={styles.subtitle}>Plan your dream tank—no fish harmed.</Text>
        </View>

        <Card style={{ padding: 0 }}>
          <TankOverviewCard
            background={backgroundProp}
            snapshot={snapshot}
            onOpenTank={() => navigation.navigate("Aquarium")}
            onExplore={() => navigation.navigate("List")}
          />
        </Card>
      </View>
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  logoImg: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
  subtitle: {
    color: "#EAF6FF",
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: "#F7FBFF",
    borderWidth: 1,
    borderColor: "#E5F2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logoutText: {
    color: ocean.primary,
    fontWeight: "800",
  },
});