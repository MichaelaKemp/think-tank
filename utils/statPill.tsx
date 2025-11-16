import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colours } from "../theme/colours";

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: colours.whiteOverlaySoft, borderColor: colours.whiteOverlayStrong, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  label: { color: colours.textSoftBlue, fontSize: 10, marginBottom: 2 },
  value: { color: colours.white, fontWeight: "700", fontSize: 12 },
});