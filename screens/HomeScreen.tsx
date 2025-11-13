import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { signOut } from "firebase/auth";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FishTank from "../assets/images/Fish-Tank.jpeg";
import Logo from "../assets/images/logo.png";
import TankOverviewCard from "../components/TankOverviewCard";
import { Card, OceanBackground, ocean } from "../components/ui";
import { auth } from "../firebase";
import { getCurrentTank } from "../services/tanks";

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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [tankPreviewUri, setTankPreviewUri] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TankSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      ScreenOrientation.unlockAsync().catch(() => {});
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const fromRoute = route?.params?.tankPreviewUri as string | undefined;
        if (fromRoute && active) {
          setTankPreviewUri(fromRoute);
        } else {
          const savedUri = await AsyncStorage.getItem("lastTankScreenshotUri");
          if (active && savedUri) setTankPreviewUri(savedUri);
          else {
            const tank = await getCurrentTank();
            if (active && tank?.previewUri) setTankPreviewUri(tank.previewUri);
          }
        }

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
    } catch (e) {
      console.warn("Logout failed", e);
    } finally {
      setLoggingOut(false);
    }
  };

  const backgroundProp = tankPreviewUri ? { uri: tankPreviewUri } : FishTank;

  return (
    <OceanBackground>
      <View
        style={{
          position: "absolute",
          top: insets.top + (isLandscape ? 36 : 16),
          right: isLandscape ? 80 : 20,
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
          flexDirection: isLandscape ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: isLandscape ? 60 : 20,
          paddingTop: isLandscape ? 80 : 120,
          paddingBottom: insets.bottom + 24,
          gap: isLandscape ? 0 : 18,
        }}
      >
        <View
          style={{
            alignItems: isLandscape ? "flex-start" : "center",
            flex: isLandscape ? 0.4 : undefined,
          }}
        >
          <Image
            source={Logo}
            style={[
              styles.logoImg,
              {
                width: isLandscape ? 150 : 200,
                height: isLandscape ? 150 : 200,
                marginBottom: isLandscape ? 12 : 12,
              },
            ]}
          />
          <Text
            style={[
              styles.subtitle,
              {
                textAlign: isLandscape ? "center" : "center",
                maxWidth: isLandscape ? 160 : 320,
                flexWrap: "wrap",
                lineHeight: 22,
              },
            ]}
          >
            Plan your dream tank — no fish harmed.
          </Text>
        </View>

        <View
          style={{
            flex: isLandscape ? 0.6 : undefined,
            width: "100%",
                marginLeft: isLandscape ? 20 : 0,
                marginRight: isLandscape ? 100 : 0,
            marginTop: isLandscape ? 40 : 0,
          }}
        >
          <Card style={{ padding: 0 }}>
            <TankOverviewCard
              background={backgroundProp}
              snapshot={snapshot}
              onOpenTank={() => navigation.navigate("Aquarium")}
              onExplore={() => navigation.navigate("List")}
            />
          </Card>
        </View>
      </View>
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  logoImg: { width: 200, height: 200, resizeMode: "contain" },
  subtitle: { color: "#EAF6FF", marginTop: 4, fontSize: 16 },
  logoutBtn: { backgroundColor: "#F7FBFF", borderWidth: 1, borderColor: "#E5F2FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  logoutText: { color: ocean.primary, fontWeight: "800" },
});