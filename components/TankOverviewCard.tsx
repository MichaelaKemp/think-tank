import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colours } from "../theme/colours";
import { resolveTankImage } from "../utils/imageUtils";
import { formatEnv, formatOxygenShort, formatTempShort } from "../utils/speciesUtils";
import { StatPill } from "../utils/statPill";

type Bg = number | string | { uri: string } | undefined | null;

type Props = {
  name?: string;
  snapshot: {
    speciesCount: number;
    env: "freshwater" | "saltwater";
    temp: number;
    oxy: number;
    avgPhText: string;
  } | null;
  onOpenTank: () => void;
  onExplore: () => void;
  background?: Bg;
};

export default function TankOverviewCard({
  name,
  snapshot,
  onOpenTank,
  onExplore,
  background,
}: Props) {
  const [useFallback, setUseFallback] = useState(false);

  const source = useMemo(
    () => resolveTankImage(background, useFallback),
    [background, useFallback]
  );

  return (
    <ImageBackground
      source={source}
      resizeMode="cover"
      style={styles.bg}
      imageStyle={{ borderRadius: 16 }}
      onError={() => setUseFallback(true)}
    >
      <LinearGradient
        colors={[colours.tankCardGradientStart, colours.tankCardGradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.title}>{name}</Text>

        {!snapshot && (
          <Text style={styles.subtitle}>No tank yet—let’s build your first habitat!</Text>
        )}

        {snapshot && (
          <View style={styles.rowWrap}>
            <StatPill label="Species" value={String(snapshot.speciesCount)} />
            <StatPill label="Env" value={formatEnv(snapshot.env)} />
            <StatPill label="Temp" value={formatTempShort(snapshot.temp)} />
            <StatPill label="O₂" value={formatOxygenShort(snapshot.oxy)} />
            <StatPill label="Avg pH" value={snapshot.avgPhText} />
          </View>
        )}

        <View style={styles.ctaRow}>
          <TouchableOpacity style={[styles.cta, styles.ctaPrimary]} onPress={onOpenTank}>
            <Text style={styles.ctaPrimaryText}>
              {snapshot ? "Open Tank" : "Start Building"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { width: "100%", minHeight: 180, borderRadius: 16, overflow: "hidden" },
  content: { padding: 16, gap: 12 },
  title: { color: colours.white, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colours.subtitleSoftBlue, fontSize: 14 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cta: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  ctaPrimary: { backgroundColor: colours.brandYellowAlt },
  ctaPrimaryText: { color: colours.textOnYellowDeep, fontWeight: "800" },
});