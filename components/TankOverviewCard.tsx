import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Bg = number | string | { uri: string } | undefined | null;

type Props = {
  snapshot: {
    speciesCount: number;
    env: 'freshwater' | 'saltwater';
    temp: number;
    oxy: number;
    avgPhText: string;
  } | null;
  onOpenTank: () => void;
  onExplore: () => void;
  background?: Bg; // require(...) | "file://..." | "https://..." | {uri}
};

// TODO: replace with your own local placeholder image:
const PLACEHOLDER: number = require('../assets/images/Fish-Tank.jpeg');

export default function TankOverviewCard({ snapshot, onOpenTank, onExplore, background }: Props) {
  const [useFallback, setUseFallback] = useState(false);

  const source = useMemo(() => {
    if (useFallback) return PLACEHOLDER;
    if (!background) return PLACEHOLDER;
    if (typeof background === 'number') return background;           // require(...)
    if (typeof background === 'string') return { uri: background };  // "file://..." or "https://..."
    if (typeof background === 'object' && 'uri' in background) return background as { uri: string };
    return PLACEHOLDER;
  }, [background, useFallback]);

  return (
    <ImageBackground
      source={source}
      resizeMode="cover"
      style={styles.bg}
      imageStyle={{ borderRadius: 16 }}
      onError={() => setUseFallback(true)}  // if the file vanished, show placeholder
    >
      <LinearGradient
        colors={['rgba(3,105,161,0.85)','rgba(30,64,175,0.85)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Your Tank</Text>

        {snapshot ? (
          <View style={styles.rowWrap}>
            <StatPill label="Species" value={String(snapshot.speciesCount)} />
            <StatPill label="Env" value={snapshot.env === 'freshwater' ? 'Fresh' : 'Salt'} />
            <StatPill label="Temp" value={`${snapshot.temp.toFixed(1)}°C`} />
            <StatPill label="O₂" value={`${Math.round(snapshot.oxy)}%`} />
            <StatPill label="Avg pH" value={snapshot.avgPhText} />
          </View>
        ) : (
          <Text style={styles.subtitle}>No tank yet—let’s build your first habitat!</Text>
        )}

        <View style={styles.ctaRow}>
          <TouchableOpacity style={[styles.cta, styles.ctaPrimary]} onPress={onOpenTank}>
            <Text style={styles.ctaPrimaryText}>{snapshot ? 'Open Tank' : 'Start Building'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={onExplore}>
            <Text style={styles.ctaGhostText}>Explore Species</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { width: '100%', minHeight: 180, borderRadius: 16, overflow: 'hidden' },
  content: { padding: 16, gap: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#E0E7FF', fontSize: 14 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillLabel: { color: '#C7D2FE', fontSize: 10, marginBottom: 2 },
  pillValue: { color: '#fff', fontWeight: '700', fontSize: 12 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cta: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  ctaPrimary: { backgroundColor: '#FACC15' },
  ctaPrimaryText: { color: '#1f2937', fontWeight: '800' },
  ctaGhost: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ctaGhostText: { color: '#fff', fontWeight: '700' },
});