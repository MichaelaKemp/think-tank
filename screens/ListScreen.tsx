import { Ionicons, MaterialCommunityIcons as MCI } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View, } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BubbleButton, Card, ocean, OceanBackground, Pill } from "../components/ui";
import { auth } from "../firebase.js";
import { getSpecies } from "../services/DbService";

const getListKey = () => {
  const user = auth.currentUser;
  return user ? `thinktank:listDone:${user.uid}` : null;
};

type Kind = "all" | "fish" | "plant";

export default function ListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const key = getListKey();
      if (!key) return;

      const done = await AsyncStorage.getItem(key);
      if (done === "true") return;

      // Check if navigation passed onboarding=true
      const params: any = navigation.getState().routes.find(
        (r: any) => r.name === "List"
      )?.params;

      if (params?.onboarding && active) {
        setShowTour(true);
      }
    })();

    return () => { active = false };
  }, []);

  const finishTour = async () => {
    const key = getListKey();
    if (key) await AsyncStorage.setItem(key, "true");
    setShowTour(false);
  };

  const skipTour = async () => {
    const key = getListKey();
    if (key) await AsyncStorage.setItem(key, "true");
    setShowTour(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getSpecies(kind);
        if (!cancelled) setSpeciesList(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return speciesList;
    return speciesList.filter((s) => {
      const n = (s.name || "").toLowerCase();
      const sci = (s.scientificName || "").toLowerCase();
      return n.includes(q) || sci.includes(q);
    });
  }, [speciesList, search]);

  return (
    <OceanBackground>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: isLandscape ? 70 : 120,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {isLandscape && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 16,
              right: insets.right + 40,
              zIndex: 10,
              marginTop: 16,
            }}
          >
            <BubbleButton
              title="Back to Home"
              onPress={() => {
                const rootNav = navigation.getParent() ?? navigation;
                rootNav.reset({
                  index: 0,
                  routes: [{ name: "Home" }],
                });
              }}
            />
          </View>
        )}

        <Text style={styles.title}>Species</Text>

        {!isLandscape && (
          <Card style={{ padding: 12, marginBottom: 12 }}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#789" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search by name or scientific name…"
                placeholderTextColor="#6b7280"
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, paddingVertical: 8 }}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pill active={kind === "all"} onPress={() => setKind("all")}>
                All
              </Pill>
              <Pill active={kind === "fish"} onPress={() => setKind("fish")}>
                Fish
              </Pill>
              <Pill active={kind === "plant"} onPress={() => setKind("plant")}>
                Plants
              </Pill>
            </View>
          </Card>
        )}

        <Text style={styles.resultCount}>
          {loading ? "Loading…" : `${visible.length} result${visible.length === 1 ? "" : "s"}`}
        </Text>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: 60,
            minHeight: height * 0.7,
            maxWidth: isLandscape ? 700 : "100%",
          }}
          showsVerticalScrollIndicator={false}
        >
          {visible.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => navigation.navigate("Details", { species: s })}
              activeOpacity={0.9}
              style={{ marginBottom: 10 }}
            >
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image source={{ uri: s.imageURL }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    {!!s.scientificName && (
                      <Text style={styles.cardSubtitle}>{s.scientificName}</Text>
                    )}
                    {!!s.kind && (
                      <View style={styles.kindPill}>
                        <MCI
                          name="tag-outline"
                          size={14}
                          color="#0369a1"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={{ color: "#0369a1", fontWeight: "800" }}>
                          {s.kind}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9fb3c8" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {!loading && visible.length === 0 && (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <Text style={{ color: "#EAF6FF" }}>No species match your search.</Text>
            </View>
          )}
        </ScrollView>

        {!isLandscape && (
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <View style={{ width: 220 }}>
              <BubbleButton
                title="Back to Home"
                onPress={() => {
                  const rootNav = navigation.getParent() ?? navigation;
                  rootNav.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                  });
                }}
              />
            </View>
          </View>
        )}
      </View>

      {showTour && (
        <View style={styles.tourOverlay} pointerEvents="box-none">
          <View style={styles.tourBubble}>
            <Text style={styles.tourTitle}>Browse & filter species</Text>
            <Text style={styles.tourText}>
              {isLandscape
                ? "In landscape view, the species list is simplified for easier browsing. Tap a species to learn more about it."
                : "Use search to find species by name, and use the filter buttons to switch between all species, fish, or plants."
              }
            </Text>

            <View style={styles.tourButtonsRow}>
              <TouchableOpacity
                onPress={skipTour}
                style={styles.tourButtonSecondary}
              >
                <Text style={styles.tourButtonSecondaryText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={finishTour}
                style={styles.tourButtonPrimary}
              >
                <Text style={styles.tourButtonPrimaryText}>Finish</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      )}
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 10, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 6 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F7FBFF", borderRadius: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: "#E5F2FF" },
  resultCount: { color: "#EAF6FF", marginBottom: 8 },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 12, backgroundColor: "#E6F4FF" },
  cardTitle: { fontSize: 18, fontWeight: "900", color: ocean.textDark },
  cardSubtitle: { color: "#6b7280" },
  kindPill: { marginTop: 8, flexDirection: "row", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#e0f2fe" },
  tourOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,12,24,0.65)", justifyContent: "flex-end", alignItems: "center", paddingBottom: 40, zIndex: 999 },
  tourBubble: { backgroundColor: "rgba(15,42,70,0.97)", borderRadius: 16, padding: 16, width: "92%", maxWidth: 360, borderWidth: 1, borderColor: "#38bdf8", marginBottom: 20 },
  tourTitle: { color: "#E0F2FE", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  tourText: { color: "#EAF6FF", marginBottom: 12, fontSize: 14, lineHeight: 18 },
  tourButtonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  tourButtonSecondary: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#64748b" },
  tourButtonSecondaryText: { color: "#E2E8F0", fontWeight: "600" },
  tourButtonPrimary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#0ea5e9" },
  tourButtonPrimaryText: { color: "#0B1D2F", fontWeight: "800" },
});