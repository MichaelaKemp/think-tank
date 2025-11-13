import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

export const ocean = {
  skyTop: "#CFF1FF",
  skyMid: "#78CCFF",
  seaTop: "#2693FF",
  seaDeep: "#0B2E4E",
  card: "#FFFFFF",
  accent: "#FFD34D",
  primary: "#1BA9FF",
  chip: "#E8F6FF",
  textDark: "#08233A",
};

export const OceanBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const waveHeight = isLandscape ? 90 : 160;

  return (
    <View style={{ flex: 1, backgroundColor: ocean.seaDeep }}>
      <LinearGradient
        colors={[ocean.skyTop, ocean.skyMid, ocean.seaTop]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <Svg
        height={waveHeight}
        width={width}
        viewBox="0 0 375 160"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0 }}
      >
        <Path
          d="M0,70 C70,110 140,30 220,70 C300,110 360,50 375,80 L375,0 L0,0 Z"
          fill="#fff"
          opacity={0.95}
        />
        <Path
          d="M0,95 C70,135 140,55 220,95 C300,135 360,75 375,105 L375,0 L0,0 Z"
          fill="#fff"
          opacity={0.75}
        />
      </Svg>

      {children}
    </View>
  );
};

export const BubbleButton: React.FC<{ title: string; onPress: () => void }> = ({ title, onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ marginTop: 8 }}>
    <LinearGradient
      colors={[ocean.accent, "#FFC107"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.btn}
    >
      <Text style={styles.btnText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export const Pill: React.FC<{ active?: boolean; children: React.ReactNode; onPress?: () => void }> = ({
  active,
  children,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{children}</Text>
    </View>
  </TouchableOpacity>
);

export const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>
    <LinearGradient
      colors={["rgba(255,255,255,0.6)", "rgba(255,255,255,0)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
    />
    {children}
  </View>
);

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 18, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  btnText: { fontWeight: "800", fontSize: 16, textAlign: "center", color: "#3B2A00", letterSpacing: 0.5 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: ocean.chip, borderWidth: 1, borderColor: "#DAEEFF" },
  pillActive: { backgroundColor: ocean.primary, borderColor: ocean.primary },
  pillText: { color: ocean.textDark, fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  card: { backgroundColor: ocean.card, borderRadius: 20, padding: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2, overflow: "hidden" },
});