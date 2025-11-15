import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { signOut } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FishTank from "../assets/images/Fish-Tank.jpeg";
import Logo from "../assets/images/logo.png";
import TankOverviewCard from "../components/TankOverviewCard";
import { Card, OceanBackground, ocean } from "../components/ui";
import { auth } from "../firebase";
import { createTank, getAllTanks } from "../services/tanks";

export default function HomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [loggingOut, setLoggingOut] = useState(false);

  const [allTanks, setAllTanks] = useState<any[]>([]);
  const [loadingTanks, setLoadingTanks] = useState(true);

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [tankNameDraft, setTankNameDraft] = useState("");

  const [showHomeTour, setShowHomeTour] = useState(false);
  const [homeTourStep, setHomeTourStep] = useState<1 | 2>(1);

  const getOnboardingKey = () => {
    const currentUser = auth.currentUser;
    return currentUser ? `thinktank:onboardingDone:${currentUser.uid}` : null;
  };

  useEffect(() => {
    const checkOnboarding = async () => {
      const key = getOnboardingKey();
      if (!key) return;

      const fromSignup = route?.params?.onboarding === true;
      if (!fromSignup) return;

      const done = await AsyncStorage.getItem(key);
      if (done === "true") return;

      setHomeTourStep(1);
      setShowHomeTour(true);
    };

    checkOnboarding();
  }, [route?.params?.onboarding]);

  const handleSkipHomeTour = async () => {
    const key = getOnboardingKey();
    if (key) await AsyncStorage.setItem(key, "true");
    setShowHomeTour(false);
  };

  const handleNextFromHome = async () => {
    const key = getOnboardingKey();
    if (key) await AsyncStorage.setItem(key, "true");
    setShowHomeTour(false);
    navigation.navigate("Aquarium", { onboarding: true });
  };

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        setLoadingTanks(true);

        let tanks = await getAllTanks();

        const fromSignup = route?.params?.onboarding === true;

        if (!fromSignup && tanks.length === 0) {
          await createTank("Default Tank");
          tanks = await getAllTanks();
        }

        const enriched = [];

        for (const t of tanks) {
          const key = `thinktank:snapshot:${t.tankId}`;
          const raw = await AsyncStorage.getItem(key);

          let stats = null;
          if (raw) {
            try {
              stats = JSON.parse(raw);
            } catch (e) {
              console.warn("Failed to parse snapshot", e);
            }
          }

          enriched.push({ ...t, stats });
        }

        if (alive) {
          setAllTanks(enriched);
          setLoadingTanks(false);
        }
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web") {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    }, [])
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

  const handleCreateTank = async () => {
    setNameModalVisible(false);
    const id = await createTank(tankNameDraft.trim() || "My Tank");
    setTankNameDraft("");

    const tanks = await getAllTanks();
    setAllTanks(tanks);

    navigation.navigate("Aquarium", { tankId: id });
  };

  const topTank = allTanks[0];
  const otherTanks = allTanks.slice(1);

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

      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: isLandscape ? 80 : 120,
          paddingHorizontal: isLandscape ? 60 : 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Image
            source={Logo}
            style={[
              styles.logoImg,
              {
                width: isLandscape ? 150 : 200,
                height: isLandscape ? 150 : 200,
              },
            ]}
          />

          <Text style={[styles.subtitle, { textAlign: "center", maxWidth: 320 }]}>
            Plan your dream tank — no fish harmed.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => setNameModalVisible(true)}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Tank</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("List")}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreText}>Explore Species</Text>
            </TouchableOpacity>
          </View>
        </View>

        {allTanks.length > 0 && (
          <Text style={[styles.sectionHeader, { marginBottom: 16 }]}>
            Your Tanks
          </Text>
        )}

        {topTank ? (
          <Card style={{ padding: 0, width: "100%", maxWidth: 420 }}>
            <TankOverviewCard
              name={topTank.name}
              background={topTank.previewUri ? { uri: topTank.previewUri } : FishTank}
              snapshot={topTank.stats ?? null}
              onOpenTank={() =>
                navigation.navigate("Aquarium", { tankId: topTank.tankId })
              }
              onExplore={() => navigation.navigate("List")}
            />
          </Card>
        ) : (
          <Text style={{ color: "#94a3b8", marginTop: 20 }}>
            No tanks yet — add your first one!
          </Text>
        )}

        <View style={{ width: "100%", marginTop: 32 }}>
          {loadingTanks ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            otherTanks.map((t) => (
              <Card
                key={t.tankId}
                style={{
                  padding: 0,
                  marginTop: 16,
                  width: "100%",
                  maxWidth: 420,
                }}
              >
                <TankOverviewCard
                  name={t.name}
                  background={t.previewUri ? { uri: t.previewUri } : FishTank}
                  snapshot={t.stats ?? null}
                  onOpenTank={() =>
                    navigation.navigate("Aquarium", { tankId: t.tankId })
                  }
                  onExplore={() => navigation.navigate("List")}
                />
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Name your tank</Text>
            <TextInput
              value={tankNameDraft}
              onChangeText={setTankNameDraft}
              placeholder="e.g., Freshwater Paradise"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
            />

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setNameModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={handleCreateTank}
              >
                <Text style={{ color: "#fff" }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


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
                  top: isLandscape ? 110 : insets.top + 260,
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
  logoImg: { resizeMode: "contain" },
  subtitle: { color: "#EAF6FF", marginTop: 4, fontSize: 16 },
  addBtn: {  flexDirection: "row", backgroundColor: "#1A73E8", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,  alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#ffffff66", shadowColor: "#1A73E8", shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  exploreBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: "#FDDD1C", borderWidth: 1, borderColor: "#D9B800", shadowColor: "#FDDD1C", shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  exploreText: { color: "#0B1D2F", fontWeight: "800", fontSize: 16 },
  logoutBtn: { backgroundColor: "#F7FBFF", borderWidth: 1, borderColor: "#E5F2FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  logoutText: { color: ocean.primary, fontWeight: "800" },
  sectionHeader: { color: "#EAF6FF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#0B1D2F", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1E3A5F" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: "#1E3A5F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: "#E2E8F0", backgroundColor: "#0f2a46", marginBottom: 12 },
  modalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#0f2a46", borderWidth: 1, borderColor: "#1E3A5F" },
  modalPrimary: { backgroundColor: "#1a4b7a" },
  tourOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 12, 24, 0.65)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  tourBubbleHome: { maxWidth: 340, width: "90%", backgroundColor: "rgba(15,42,70,0.95)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#38bdf8", alignItems: "flex-start" },
  tourTitle: { color: "#E0F2FE", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  tourText: { color: "#EAF6FF", fontSize: 14, marginBottom: 12 },
  tourButtonsRow: { flexDirection: "row", justifyContent: "flex-end", width: "100%", gap: 8 },
  tourButtonSecondary: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#64748b" },
  tourButtonSecondaryText: { color: "#E2E8F0", fontWeight: "600" },
  tourButtonPrimary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#0ea5e9" },
  tourButtonPrimaryText: { color: "#0B1D2F", fontWeight: "800" },
});