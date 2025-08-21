import { Ionicons, MaterialCommunityIcons as MCI } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BubbleButton, Card, ocean, OceanBackground, Pill } from "../components/ui";
import { getSpecies } from "../services/DbService";

type Kind = "all" | "fish" | "plant";

export default function ListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    return () => { cancelled = true; };
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
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 120, paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.title}>Species</Text>

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
            <Pill active={kind === "all"} onPress={() => setKind("all")}>All</Pill>
            <Pill active={kind === "fish"} onPress={() => setKind("fish")}>Fish</Pill>
            <Pill active={kind === "plant"} onPress={() => setKind("plant")}>Plants</Pill>
          </View>
        </Card>

        <Text style={styles.resultCount}>
          {loading ? "Loading…" : `${visible.length} result${visible.length === 1 ? "" : "s"}`}
        </Text>

        <ScrollView>
          {visible.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => navigation.navigate("Details", { species: s })} activeOpacity={0.9} style={{ marginBottom: 10 }}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image source={{ uri: s.imageURL }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    {!!s.scientificName && <Text style={styles.cardSubtitle}>{s.scientificName}</Text>}
                    {!!s.kind && (
                      <View style={styles.kindPill}>
                        <MCI name="tag-outline" size={14} color="#0369a1" style={{ marginRight: 6 }} />
                        <Text style={{ color: "#0369a1", fontWeight: "800" }}>{s.kind}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9fb3c8" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {!loading && visible.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: "#EAF6FF" }}>No species match your search.</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <BubbleButton title="Back to Home" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#fff", 
    marginBottom: 10, 
    textShadowColor: "rgba(0,0,0,0.25)", 
    textShadowRadius: 6 
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FBFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5F2FF",
  },
  resultCount: { 
    color: "#EAF6FF", 
    marginBottom: 8 
  },
  thumb: { 
    width: 64, 
    height: 64, 
    borderRadius: 12, 
    marginRight: 12, 
    backgroundColor: "#E6F4FF" 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "900", 
    color: ocean.textDark 
  },
  cardSubtitle: { 
    color: "#6b7280" 
  },
  kindPill: {
    marginTop: 8,
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },
});