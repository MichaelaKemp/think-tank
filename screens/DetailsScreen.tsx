import { MaterialCommunityIcons as MCI } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import React from "react";
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View, } from "react-native";
import { BubbleButton, Card, ocean, OceanBackground } from "../components/ui";

export default function SpeciesDetailScreen({ route, navigation }: any) {
  const { species } = route.params;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === "web") return;
      ScreenOrientation.unlockAsync().catch(() => {});
    }, [])
  );

  if (!isLandscape) {
    return (
      <OceanBackground>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingTop: 120,
            paddingBottom: 24,
          }}
        >
          <Card style={{ alignItems: "center", width: "85%" }}>
            <Image source={{ uri: species.imageURL }} style={styles.hero} />
            <Text style={styles.name}>{species.name}</Text>
            {!!species.scientificName && (
              <Text style={styles.sciName}>{species.scientificName}</Text>
            )}

            <View style={styles.stats}>
              <Stat icon="water" label={`pH ${species.pH?.[0]}–${species.pH?.[1]}`} />
              <Stat
                icon="thermometer"
                label={`Temp ${species.temp?.[0]}–${species.temp?.[1]}°C`}
              />
              <Stat icon="ruler" label={`Size ${species.size} cm`} />
              <Stat icon="leaf" label={`O₂ ${species.oxygenNeed}`} />
            </View>

            {!!species.funFact && (
              <Text style={styles.fact}>“{species.funFact}”</Text>
            )}

            <BubbleButton title="Close" onPress={() => navigation.goBack()} />
          </Card>
        </View>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 60,
          paddingTop: 40,
          paddingBottom: 24,
        }}
      >
        <Card
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            width: "85%",
            maxWidth: 900,
            paddingVertical: 24,
            paddingHorizontal: 32,
            gap: 28,
            marginTop: 40,
          }}
        >
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              flex: 0.4,
              alignSelf: "stretch",
            }}
          >
            <Image
              source={{ uri: species.imageURL }}
              style={[styles.hero, { width: 200, height: 140, marginBottom: 10 }]}
            />
            <BubbleButton title="Close" onPress={() => navigation.goBack()} />
          </View>

          <View
            style={{
              flex: 0.6,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <Text style={[styles.name, { fontSize: 20 }]}>{species.name}</Text>

            {!!species.scientificName && (
              <Text style={styles.sciName}>{species.scientificName}</Text>
            )}

            <View
              style={[
                styles.stats,
                { justifyContent: "flex-start", marginTop: 10 },
              ]}
            >
              <Stat icon="water" label={`pH ${species.pH?.[0]}–${species.pH?.[1]}`} />
              <Stat
                icon="thermometer"
                label={`Temp ${species.temp?.[0]}–${species.temp?.[1]}°C`}
              />
              <Stat icon="ruler" label={`Size ${species.size} cm`} />
              <Stat icon="leaf" label={`O₂ ${species.oxygenNeed}`} />
            </View>

            {!!species.funFact && (
              <Text
                style={[
                  styles.fact,
                  { marginTop: 16, maxWidth: 340, textAlign: "left" },
                ]}
              >
                “{species.funFact}”
              </Text>
            )}
          </View>
        </Card>
      </View>
    </OceanBackground>
  );
}

const Stat = ({
  icon,
  label,
}: {
  icon: "water" | "thermometer" | "ruler" | "leaf";
  label: string;
}) => (
  <View style={styles.statPill}>
    <MCI name={icon} size={16} color={ocean.primary} style={{ marginRight: 6 }} />
    <Text style={{ fontWeight: "800", color: ocean.textDark }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  hero: { width: 140, height: 140, borderRadius: 24, backgroundColor: "#E7F4FF", marginTop: 4 },
  name: { marginTop: 12, fontSize: 22, fontWeight: "900", color: ocean.textDark },
  sciName: { fontStyle: "italic", color: "#6b7280", marginTop: 2 },
  stats: { marginTop: 12, alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  statPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2FAFF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  fact: { marginTop: 12, fontStyle: "italic", textAlign: "center", color: "#607B96" },
});