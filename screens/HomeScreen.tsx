import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { signOut } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
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

  const [showHomeTour, setShowHomeTour] = useState(false);
  const [homeTourStep, setHomeTourStep] = useState<1 | 2>(1);

  const getOnboardingKey = () => {
    const currentUser = auth.currentUser;
    return currentUser ? `thinktank:onboardingDone:${currentUser.uid}` : null;
  };

  // Start tour only if not done before
  useEffect(() => {
    const checkOnboarding = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const ONBOARDING_KEY = getOnboardingKey();

      const fromSignup = route?.params?.onboarding === true;
      if (!fromSignup) return;

      if (!ONBOARDING_KEY) return;

      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (done === "true") return;

      setShowHomeTour(true);
    };

    checkOnboarding();
  }, [route?.params?.onboarding]);

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

  const handleSkipHomeTour = async () => {
    const key = getOnboardingKey();
    if (!key) return;

    await AsyncStorage.setItem(key, "true");
    setShowHomeTour(false);
  };

  const handleNextFromHome = async () => {
    const key = getOnboardingKey();
    if (!key) return;

    await AsyncStorage.setItem(key, "true");
    setShowHomeTour(false);
    navigation.navigate("Aquarium", { onboarding: true });
  };

  return (
    <OceanBackground>
      <View
        style={{
          position: "absolute",
          top: insets.top + (isLandscape ? 36 : 16),
          right: isLandscape ? 80 : 20,
          zIndex: 20,
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
                marginBottom: 12,
              },
            ]}
          />
          <Text
            style={[
              styles.subtitle,
              {
                textAlign: "center",
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
            marginTop: isLandscape ? 20 : 0,
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

      {showHomeTour && (
        <>
          <View style={styles.tourOverlay} pointerEvents="box-none" />

          {homeTourStep === 1 && (
            <View
              style={[
                styles.tourBubbleHome,
                {
                  position: "absolute",
                  top: isLandscape ? 60 : insets.top + 220,
                  left: "50%",
                  transform: [{ translateX: -170 }],
                  zIndex: 1000,
                },
              ]}
            >
              <Text style={styles.tourTitle}>Welcome to Think Tank</Text>

              <Text style={styles.tourText}>
                This card shows your current tank.{"\n"}
                Tap the "Open Tank" button to open and start building your aquarium.
              </Text>

              <View style={styles.tourButtonsRow}>
                <TouchableOpacity
                  onPress={handleSkipHomeTour}
                  style={styles.tourButtonSecondary}
                >
                  <Text style={styles.tourButtonSecondaryText}>Skip tour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setHomeTourStep(2)}
                  style={styles.tourButtonPrimary}
                >
                  <Text style={styles.tourButtonPrimaryText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {homeTourStep === 2 && (
            <View
              style={[
                styles.tourBubbleHome,
                {
                  position: "absolute",
                  top: isLandscape ? 100 : insets.top + 260, 
                  left: "50%",
                  transform: [{ translateX: -170 }],
                  zIndex: 1000,
                },
              ]}
            >
              <Text style={styles.tourTitle}>Create Multiple Tanks</Text>

              <Text style={styles.tourText}>
                You’re not limited to just one aquarium.{"\n"}
                Tap “Add Tank” to create new tanks. Each one can have its own design, species, and settings.
              </Text>

              <View style={styles.tourButtonsRow}>
                <TouchableOpacity
                  onPress={handleSkipHomeTour}
                  style={styles.tourButtonSecondary}
                >
                  <Text style={styles.tourButtonSecondaryText}>Skip tour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextFromHome}
                  style={styles.tourButtonPrimary}
                >
                  <Text style={styles.tourButtonPrimaryText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  logoImg: { width: 200, height: 200, resizeMode: "contain" },
  subtitle: { color: "#EAF6FF", marginTop: 4, fontSize: 16 },
  logoutBtn: { backgroundColor: "#F7FBFF", borderWidth: 1, borderColor: "#E5F2FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  logoutText: { color: ocean.primary, fontWeight: "800" },
  tourOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 12, 24, 0.65)", justifyContent: "flex-end", alignItems: "center", paddingBottom: 60, zIndex: 999 },
  tourBubbleHome: { maxWidth: 340, width: "90%", backgroundColor: "rgba(15,42,70,0.95)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#38bdf8", alignItems: "flex-start", position: "relative" },
  tourTitle: { color: "#E0F2FE", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  tourText: { color: "#EAF6FF", fontSize: 14, marginBottom: 12 },
  tourButtonsRow: { flexDirection: "row", justifyContent: "flex-end", width: "100%", gap: 8 },
  tourButtonSecondary: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#64748b" },
  tourButtonSecondaryText: { color: "#E2E8F0", fontWeight: "600" },
  tourButtonPrimary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#0ea5e9" },
  tourButtonPrimaryText: { color: "#0B1D2F", fontWeight: "800" },
});