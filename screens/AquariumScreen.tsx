import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { collection, getDocs } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FishTank from '../assets/images/Fish-Tank.jpeg';
import { db } from '../firebase.js';

//Try to load a local image first . If not found, fall back to imageURL in the db, then a default picture.
const fishImages: Record<string, any> = {
  betta: require('../assets/images/Betta.png'),
  guppy: require('../assets/images/Guppy.png'),
  anubias: require('../assets/images/Anubias.png'),
  'java-fern': require('../assets/images/Java-Fern.png'),
  'neon-tetra': require('../assets/images/Neon-Tetra.png'),
};
const defaultFishImage = require('../assets/images/Default-Fish.png');

type Range = { min: number; max: number } | [number, number];
type Oxygen = 'low' | 'medium' | 'high' | string;

type Species = {
  id: string;
  name: string;
  type?: string;
  ph?: Range;
  temp?: Range;
  oxygenNeed?: Oxygen;
  assetKey?: string;
  imageURL?: string;
  incompatibleWith?: string[];
  [k: string]: any;
};

type TankItem = Species & {
  instanceId: string; // unique per dropped item
  x: number;          // position inside the tank view
  y: number;
};

//Sizes, safe area, etc.
const LEFT_BAR_W = 96;
const MENU_W = 300;
const FISH_W = 160;
const FISH_H = 110;
const ANDROID_SAFE = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

// "slug" = safe, lowercase id (spaces -> dashes).
//Use this so names, ids, and asset keys match
const toSlug = (k: string) =>
  (k || '')
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

//Make a canonical id for species and tank items
//Examples: "Betta Fish", "betta", "BETTA", or an assetKey like "betta".
//canonicalId picks one of those (prefer assetKey, else id, else name) and then runs it through
const canonicalId = (s: Species | TankItem) => toSlug(s.assetKey || s.id || s.name || '');

//Some species we never allow duplicates of (e.g., bettas).
const SELF_AVOID = new Set<string>(['betta']);

export default function AquariumScreen() {
  const insets = useSafeAreaInsets();
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [userTemp, setUserTemp] = useState(26);
  const [userOxy, setUserOxy] = useState(60);
  const [tempLive, setTempLive] = useState<number | null>(null);
  const [oxyLive, setOxyLive] = useState<number | null>(null);
  const [isSliding, setIsSliding] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const slide = React.useRef(new Animated.Value(0)).current;

  const [dragging, setDragging] = useState(false);
  const [dragItem, setDragItem] = useState<Species | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragSource, setDragSource] = useState<'left' | 'tank' | null>(null);
  const [dragExistingId, setDragExistingId] = useState<string | null>(null);
  const dragOrigRef = React.useRef<{ x: number; y: number } | null>(null);

  //Measure the tank’s position on screen, so when we drop something (using pageX/pageY) we can convert to local x/y inside the tank and keep fish inside bounds.
  const tankRef = useRef<View>(null);
  const [tankRect, setTankRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  const closeMenu = () => {
    Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
      setMenuVisible(false);
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'web') {
        // Web/desktop: do nothing (orientation lock not supported)
        return;
      }
      // Native (Android/iOS): lock to landscape
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        .catch(() => {}); // safety

      return () => {
        ScreenOrientation.unlockAsync().catch(() => {});
      };
    }, [])
  );

  //Every time this screen is focused, pull fresh data from Firestore
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          const snap = await getDocs(collection(db, 'species'));
          const raw = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Species[];
          const normalized = raw.map(normalizeSpecies); // make sure ranges + ids are clean
          if (alive) setSpeciesList(normalized);
        } catch (e) {
          console.warn('Failed to refresh species', e);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  const getImageSource = (s: Species) => {
    const key = toSlug(s.assetKey || s.name || s.id || '');
    const asset = fishImages[key];
    if (asset) return asset;
    if (s.imageURL) return { uri: s.imageURL };
    return defaultFishImage; 
  };

  const onTankLayout = () => {
    requestAnimationFrame(() => {
      tankRef.current?.measureInWindow((px, py, w, h) => setTankRect({ x: px, y: py, w, h }));
    });
  };

  const startDrag = (item: Species, pageX: number, pageY: number) => {
    setDragSource('left');
    setDragItem(item);
    setDragX(pageX);
    setDragY(pageY);
    setDragging(true);
  };

  const startDragExisting = (item: TankItem, pageX: number, pageY: number) => {
    setDragSource('tank');
    setDragItem(item);
    setDragExistingId(item.instanceId);
    dragOrigRef.current = { x: item.x, y: item.y }; // so we can snap back if dropped outside
    setTankItems(prev => prev.filter(t => t.instanceId !== item.instanceId)); // hide while moving
    setDragX(pageX);
    setDragY(pageY);
    setDragging(true);
  };

  // If dropped inside the tank:
  //  - convert pageX/pageY to local x/y
  //  - clamp so image stays fully inside
  //  - add (or move) the fish
  // If dropped outside and it was an existing fish:
  //  - put it back where it was
  const handleDrop = (pageX: number, pageY: number) => {
    if (!tankRect || !dragItem) return cleanupDrag();

    const inside =
      pageX >= tankRect.x && pageX <= tankRect.x + tankRect.w &&
      pageY >= tankRect.y && pageY <= tankRect.y + tankRect.h;

    if (inside) {
      const localX = clamp(pageX - tankRect.x - FISH_W / 2, 0, tankRect.w - FISH_W);
      const localY = clamp(pageY - tankRect.y - FISH_H / 2, 0, tankRect.h - FISH_H);
      const instanceId =
        dragSource === 'tank' && dragExistingId
          ? dragExistingId
          : `${(dragItem as Species).id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      setTankItems(prev => [...prev, { ...(dragItem as Species), instanceId, x: localX, y: localY } as TankItem]);
    } else if (dragSource === 'tank' && dragExistingId) {
      const orig = dragOrigRef.current;
      if (orig) {
        setTankItems(prev => [...prev, { ...(dragItem as Species), instanceId: dragExistingId, x: orig.x, y: orig.y } as TankItem]);
      }
    }
    cleanupDrag();
  };

  const cleanupDrag = () => {
    setDragging(false);
    setDragItem(null);
    setDragExistingId(null);
    setDragSource(null);
    dragOrigRef.current = null;
  };

  const removeFromTank = (instanceId: string) => {
    setTankItems(prev => prev.filter(t => t.instanceId !== instanceId));
  };

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [MENU_W, 0] });
  const scrimOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading tank…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#102B44' }} edges={['top', 'right']}>
      <View style={styles.root}>

        <View style={styles.leftRail}>
          <ScrollView
            style={styles.leftBar}
            contentContainerStyle={[styles.leftBarContent, { paddingTop: Math.max(insets.top, ANDROID_SAFE) + 8 }]}
            showsVerticalScrollIndicator
          >
            {speciesList.map(sp => (
              <Pressable
                key={sp.id}
                style={styles.thumbWrap}
                onLongPress={e => startDrag(sp, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                delayLongPress={200}
              >
                <Image source={getImageSource(sp)} style={styles.thumb} />
                <Text numberOfLines={1} style={styles.thumbLabel}>{sp.name}</Text>

                <View style={styles.chipsRow}>
                  {(() => {
                    const comp = simpleCompatAgainstTank(sp, tankItems);
                    return (
                      <View style={[styles.compPill, { borderColor: comp.color }]}>
                        <Text style={[styles.compText, { color: comp.color }]}>Compat {comp.label}</Text>
                      </View>
                    );
                  })()}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View ref={tankRef} onLayout={onTankLayout} style={styles.tank}>
          <View style={styles.tankBgWrap} pointerEvents="none" accessible={false}>
            <Image source={FishTank} style={styles.FishTank} resizeMode="cover" />
          </View>

          {tankItems.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>Long-press a fish/plant, drag, and drop it into the tank.</Text>
            </View>
          ) : (
            tankItems.map(item => (
              <Pressable
                key={item.instanceId}
                onPress={() => removeFromTank(item.instanceId)}
                onLongPress={e => startDragExisting(item, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                delayLongPress={180}
                style={[styles.fishWrap, { left: item.x, top: item.y, width: FISH_W, height: FISH_H }]}
              >
                <Image source={getImageSource(item)} style={styles.fish} />
              </Pressable>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={openMenu}
          style={[styles.menuButton, { top: Math.max(insets.top, ANDROID_SAFE) + 12, right: Math.max(insets.right, 0) + 12 }]}
          accessibilityLabel="Open controls"
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Text style={styles.menuIcon}>☰</Text>
          <Text style={styles.menuText}>Controls</Text>
        </TouchableOpacity>

        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu} hardwareAccelerated>
          <Pressable onPress={closeMenu} style={styles.modalFill}>
            <Animated.View style={[styles.scrimBg, { opacity: scrimOpacity }]} />
          </Pressable>

          <Animated.View style={[styles.menu, { transform: [{ translateX }] }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Tank Controls</Text>
              <TouchableOpacity onPress={closeMenu} accessibilityLabel="Close controls">
                <Text style={{ color: '#C7D2FE', fontSize: 18, padding: 6 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} scrollEnabled={!isSliding}>
              <Text style={styles.h1}>Tank Stats</Text>
              {summarizeTank(tankItems).map(line => (
                <Text key={line.label} style={styles.stat}>
                  {line.label}: {line.value}
                </Text>
              ))}

              <View style={styles.divider} />

              {/* ------- Temperature slider -------
                 How it works:
                 - We find a "recommended" range from the fish in the tank.
                   (max of all mins, min of all maxes). If that range flips
                   (min > max), we show "Conflict".
                 - While dragging: we show tempLive.
                 - When you let go: we save to userTemp.
              */}
              <Text style={styles.controlLabel}>Temperature: {(tempLive ?? userTemp).toFixed(1)}°C</Text>
              <View style={styles.sliderWrap} pointerEvents="box-none">
                <Slider
                  value={tempLive ?? userTemp}
                  onSlidingStart={() => setIsSliding(true)}
                  onValueChange={(v) => setTempLive(v)}
                  onSlidingComplete={(v) => { setUserTemp(v); setTempLive(null); setIsSliding(false); }} // commit
                  minimumValue={15}
                  maximumValue={35}
                  step={0.5}
                  style={styles.slider}
                />
              </View>
              {renderTempHint(tankItems, tempLive ?? userTemp)}

              {/* ------- Oxygen slider -------
                 Turn low/medium/high needs into % ranges:
                 low 30–55, medium 45–75, high 65–90.
                 These ranges overlap on purpose so you don't
                 see "wrong" all the time.
              */}
              <Text style={[styles.controlLabel, { marginTop: 16 }]}>
                Oxygen / Aeration: {Math.round(oxyLive ?? userOxy)}%
              </Text>
              <View style={styles.sliderWrap} pointerEvents="box-none">
                <Slider
                  value={oxyLive ?? userOxy}
                  onSlidingStart={() => setIsSliding(true)}
                  onValueChange={(v) => setOxyLive(v)}
                  onSlidingComplete={(v) => { setUserOxy(v); setOxyLive(null); setIsSliding(false); }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  style={styles.slider}
                />
              </View>
              {renderOxyHint(tankItems, oxyLive ?? userOxy)}
            </ScrollView>
          </Animated.View>
        </Modal>

        {dragging && dragItem && (
          <View
            style={styles.dragOverlay}
            pointerEvents="auto"
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderMove={e => {
              setDragX(e.nativeEvent.pageX);
              setDragY(e.nativeEvent.pageY);
            }}
            onResponderRelease={e => handleDrop(e.nativeEvent.pageX, e.nativeEvent.pageY)}
          >
            <Image
              source={getImageSource(dragItem)}
              style={[styles.dragAvatar, { left: dragX - FISH_W / 2, top: dragY - FISH_H / 2, width: FISH_W, height: FISH_H }]}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// keep number inside [min,max]
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// convert [min,max] arrays into {min,max} objects
function asRange(r?: Range) {
  if (!r) return undefined;
  if (Array.isArray(r)) return { min: r[0], max: r[1] };
  return r;
}

// clean up each doc from Firestore: ranges + assetKey + incompatible list
function normalizeSpecies(s: Species): Species {
  const ph = asRange(s.ph);
  const temp = asRange(s.temp);

  // if assetKey is missing, make one from name/id
  const assetKey = s.assetKey && s.assetKey.length ? toSlug(s.assetKey) : toSlug(s.name || s.id || '');

  const raw =
    (s as any).incompatibleWith ??
    [];
  let arr: string[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') arr = raw.split(/[,\n;]/);
  else if (raw && typeof raw === 'object') arr = Object.values(raw as Record<string, any>).map(String);

  const incompatibleWith = arr.map(v => toSlug(String(v))).filter(Boolean);

  return { ...s, ph, temp, assetKey, incompatibleWith };
}

//Only use "hard NO" rules + a few self-avoid species. If any tank item is in your incompatible list (or vice versa), we show "Avoid". Otherwise "Good".
function isExplicitlyIncompatible(a: Species, b: Species) {
  const aId = canonicalId(a); 
  const bId = canonicalId(b);
  const A = a.incompatibleWith || [];
  const B = b.incompatibleWith || [];
  return A.includes(bId) || B.includes(aId);
}

function simpleCompatAgainstTank(candidate: Species, tank: (Species | TankItem)[]) {
  if (!tank || tank.length === 0) return { label: 'Good', color: '#86EFAC' };

  // e.g. betta + betta = no
  const candKey = canonicalId(candidate);
  if (SELF_AVOID.has(candKey) && tank.some(t => canonicalId(t) === candKey)) {
    return { label: 'Avoid', color: '#FCA5A5' };
  }

  // any hard NO vs anything already in the tank?
  for (const t of tank) if (isExplicitlyIncompatible(candidate, t)) {
    return { label: 'Avoid', color: '#FCA5A5' };
  }

  // otherwise fine
  return { label: 'Good', color: '#86EFAC' };
}

// These are just to give the user feedback.
function summarizeTank(items: Species[]) {
  if (!items.length) return [];
  // average of midpoints of temp ranges
  const temps = items.map(s => (s.temp ? [asRange(s.temp)!.min, asRange(s.temp)!.max] : null)).filter(Boolean) as [number, number][];
  const phs = items.map(s => (s.ph ? [asRange(s.ph)!.min, asRange(s.ph)!.max] : null)).filter(Boolean) as [number, number][];
  const oxy = items.map(s => s.oxygenNeed).filter(Boolean) as Oxygen[];

  const tempAvg = temps.length ? (temps.reduce((a, [lo, hi]) => a + (lo + hi) / 2, 0) / temps.length).toFixed(1) : '—';
  const phAvg = phs.length ? (phs.reduce((a, [lo, hi]) => a + (lo + hi) / 2, 0) / phs.length).toFixed(2) : '—';

  // rough oxygen summary
  let oxygenStatus: 'low' | 'medium' | 'high' | 'conflict' = 'medium';
  if (oxy.includes('high') && oxy.includes('low')) oxygenStatus = 'conflict';
  else if (oxy.includes('high')) oxygenStatus = 'high';
  else if (oxy.length && oxy.every(o => o === 'low')) oxygenStatus = 'low';

  return [
    { label: 'Species Count', value: String(items.length) },
    { label: 'Avg Temp (°C)', value: String(tempAvg) },
    { label: 'Avg pH', value: String(phAvg) },
    { label: 'Oxygen Need', value: oxygenStatus },
  ];
}

// Find one range that works for ALL fish: min = biggest of everyone’s mins, max = smallest of everyone’s maxes. If min > max → impossible range → "Conflict".
function getRecommendedTemp(items: (Species | any)[]) {
  const ranges = items
    .map((s: any) => (s?.temp && Array.isArray(s.temp) ? { min: s.temp[0], max: s.temp[1] } : s?.temp))
    .filter(Boolean) as { min: number; max: number }[];

  if (!ranges.length) return null;
  const recMin = Math.max(...ranges.map(r => r.min));
  const recMax = Math.min(...ranges.map(r => r.max));
  return { min: recMin, max: recMax, conflict: recMin > recMax };
}

function renderTempHint(items: (Species | any)[], temp: number) {
  const rec = getRecommendedTemp(items);
  if (!rec) return <Text style={styles.hint}>No temperature data.</Text>;
  if (rec.conflict) return <Text style={[styles.hint, styles.warn]}>Conflict: no single temperature fits all species.</Text>;

  const ok = temp >= rec.min && temp <= rec.max;
  return (
    <Text style={[styles.hint, ok ? styles.ok : styles.warn]}>
      Recommended: {rec.min.toFixed(1)}–{rec.max.toFixed(1)}°C — {ok ? 'OK' : temp < rec.min ? 'Too low' : 'Too high'}
    </Text>
  );
}

//We turn labels into overlapping % ranges: low: 30–55, medium: 45–75, high: 65–90. Overlap means fewer "wrong" warnings.
function getRecommendedOxygen(items: (Species | any)[]) {
  const needs = items.map((s: any) => (s?.oxygenNeed || '').toString().toLowerCase());
  let label: 'low' | 'medium' | 'high' | 'conflict' = 'medium';
  if (needs.includes('high') && needs.includes('low')) label = 'conflict';
  else if (needs.includes('high')) label = 'high';
  else if (needs.length && needs.every(n => n === 'low')) label = 'low';

  const ranges: Record<'low' | 'medium' | 'high', [number, number]> = {
    low: [30, 55],
    medium: [45, 75],
    high: [65, 90],
  };

  return label === 'conflict' ? { label, range: null } : { label, range: ranges[label] };
}

function renderOxyHint(items: (Species | any)[], oxy: number) {
  const rec = getRecommendedOxygen(items);
  if (!rec) return <Text style={styles.hint}>No oxygen data.</Text>;
  if (rec.label === 'conflict') return <Text style={[styles.hint, styles.warn]}>Conflict: species need different oxygen levels.</Text>;

  const [min, max] = rec.range!;
  const ok = oxy >= min && oxy <= max;
  return (
    <Text style={[styles.hint, ok ? styles.ok : styles.warn]}>
      Recommended: {min}–{max}% — {ok ? 'OK' : oxy < min ? 'Too low' : 'Too high'}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#102B44' },
  leftRail: {
    width: LEFT_BAR_W,
    backgroundColor: '#0B1D2F',
    borderRightWidth: 1,
    borderRightColor: '#1E3A5F',
  },
  leftBar: {
    flex: 0,
    flexGrow: 0
  },
  leftBarContent: {
    paddingVertical: 8,
    paddingHorizontal: 6
  },
  thumbWrap: {
    alignItems: 'center',
    marginBottom: 12
  },
  thumb: {
    width: LEFT_BAR_W - 16,
    height: 64,
    resizeMode: 'contain'
  },
  thumbLabel: {
    color: '#C7D2FE',
    fontSize: 10,
    marginTop: 4,
    width: LEFT_BAR_W - 16,
    textAlign: 'center'
  },
  tank: {
    flex: 1,
    position: 'relative',
    padding: 16,
    overflow: 'hidden'
  },
  tankBgWrap: {
    ...StyleSheet.absoluteFillObject
  },
  FishTank: {
    width: '100%',
    height: '100%'
  },
  fishWrap: {
    position: 'absolute',
    alignItems: 'center'
  },
  fish: {
    width: FISH_W,
    height: FISH_H,
    resizeMode: 'contain'
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100
  },
  dragAvatar: {
    position: 'absolute',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
    elevation: 8,
  },
    menuButton: {
    position: 'absolute',
    backgroundColor: '#0B1D2F',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    zIndex: 50,
    elevation: 8,
  },
  menuIcon: {
    color: 'white',
    fontSize: 16,
    marginRight: 8
   },
  menuText: {
    color: 'white',
    fontWeight: '600'
  },
  modalFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  },
  scrimBg: {
    flex: 1,
    backgroundColor: 'black'
  },
  menu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: MENU_W,
    backgroundColor: '#0B1D2F',
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#1E3A5F',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  menuTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700'
  },
  h1: {
    fontSize: 18,
    color: 'white',
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '700'
  },
  stat: {
    color: '#C7D2FE',
    marginBottom: 6
  },
  divider: {
    height: 1,
    backgroundColor: '#1E3A5F',
    marginVertical: 12
  },
  controlLabel: {
    color: 'white',
    marginBottom: 4,
    fontWeight: '600'
  },
  sliderWrap: {
    paddingVertical: 2
  },
  slider: {
    width: '100%',
    height: 40
  },
  hint: {
    color: '#C7D2FE',
    marginTop: 4
  },
  ok: {
    color: '#86EFAC'
  },
  warn: {
    color: '#FCA5A5'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  muted: {
    color: '#94A3B8'
  },
  chipsRow: {
    marginTop: 4,
    width: LEFT_BAR_W - 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center'
  },
  compPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  compText: {
    fontSize: 9,
    fontWeight: '600'
  },
});