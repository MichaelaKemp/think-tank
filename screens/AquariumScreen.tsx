import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import { collection, getDocs } from 'firebase/firestore';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Dimensions, Easing, Image, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import FishTank from '../assets/images/Fish-Tank.jpeg';
import { db } from '../firebase.js';
import { getCurrentTank, saveCurrentTank } from '../services/tanks';

//Try to load a local image first . If not found, fall back to imageURL in the db, then a default picture.
const fishImages: Record<string, any> = {
  betta: require('../assets/images/Betta.png'),
  guppy: require('../assets/images/Guppy.png'),
  anubias: require('../assets/images/Anubias.png'),
  'java-fern': require('../assets/images/Java-Fern.png'),
  'neon-tetra': require('../assets/images/Neon-Tetra.png'),
  'amazon-sword': require('../assets/images/Amazon-Sword.png'),
  'banggai-cardinal': require('../assets/images/Banggai-Cardinalfish.png'),
  'bristlenose-pleco': require('../assets/images/Bristlenose-Pleco.png'),
  'caulerpa-prolifera': require('../assets/images/Caulerpa-Prolifera.png'),
  chaetomorpha: require('../assets/images/Chaetomorpha.png'),
  'crypt-wendtii': require('../assets/images/Cryptocoryne-Wendtii.png'),
  'firefish-goby': require('../assets/images/Firefish.png'),
  'harlequin-rasbora': require('../assets/images/Harlequin-Rasbora.png'),
  hornwort: require('../assets/images/Hornwort.png'),
  'kuhli-loach': require('../assets/images/Kuhli-Loach.png'),
  'ocellaris-clownfish': require('../assets/images/Ocellaris-Clownfish.png'),
  otocinclus: require('../assets/images/Otocinclus.png'),
  'corydoras-panda': require('../assets/images/Panda-Corydora.png'),
  'royal-gramma': require('../assets/images/Royal-Gramma.png'),
  'tailspot-blenny': require('../assets/images/Tailspot-Blenny.png'),
  'water-wisteria': require('../assets/images/Water-Wisteria.png'),
};
const defaultFishImage = require('../assets/images/Default-Fish.png');

// Left/right arrows will cycle this list.
const tankBackgrounds = [
  { key: 'default', src: FishTank, label: 'Default' },
  { key: 'reef', src: require('../assets/images/Fish-Tank-Reef.jpeg'), label: 'Reef' },
  { key: 'plants', src: require('../assets/images/Fish-Tank-Plants.jpeg'), label: 'Plants' },
  { key: 'rocks', src: require('../assets/images/Fish-Tank-Rocks.jpeg'), label: 'Rocks' },
];

type Range = { min: number; max: number } | [number, number];
type Oxygen = 'low' | 'medium' | 'high' | string;
type WaterType = 'freshwater' | 'saltwater';

type Species = {
  id: string;
  name: string;
  kind?: 'fish' | 'plant';
  type?: string; 
  ph?: Range | number;
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
  nickname?: string;  // personalized name shown in UI
  // Preserve original species id so multiple instances can persist
  speciesId?: string;
};

// Remove all `undefined` values so Firestore accepts the payload
function stripUndefinedDeep<T = any>(val: T): T {
  if (val === undefined) return undefined as any;
  if (Array.isArray(val)) {
    const arr = val
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined); // remove undefined array
    return arr as any;
  }
  if (val && typeof val === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(val)) {
      const cleaned = stripUndefinedDeep(v as any);
      if (cleaned !== undefined) out[k] = cleaned; // leaves out keys whose values are undefined
    }
    return out;
  }
  return val;
}

//Sizes, safe area, etc.
const LEFT_BAR_W = 96;
const MENU_W = 300;
const FISH_W = 160;
const FISH_H = 110;
const ANDROID_SAFE = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const BUBBLE_W = 220;
const BUBBLE_DEFAULT_H = 120; // fallback until measured
const RHYTHM = 12;
const UI_EDGE_GAP = 12;

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
//canonicalId picks one of those (prefer assetKey, else speciesId, else id, else name) and then runs it through
const canonicalId = (s: Species | TankItem) =>
  toSlug((s as any).assetKey || (s as any).speciesId || s.id || s.name || '');

//Some species we never allow duplicates of (e.g., bettas).
const SELF_AVOID = new Set<string>(['betta']);

type NameModalMode = 'create' | 'rename';
const defaultNicknameFor = (sp: Species) => (sp?.name ? `${sp.name}` : 'New Fish');

export default function AquariumScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Live tank controls + drafts displayed while the drawer is open
  const [userTemp, setUserTemp] = useState(26);
  const [userOxy, setUserOxy] = useState(60);
  const [tempDraft, setTempDraft] = useState(userTemp);
  const [oxyDraft,  setOxyDraft]  = useState(userOxy);
  const [isSliding, setIsSliding] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const slide = React.useRef(new Animated.Value(0)).current;

  // Drag & drop state (can start from left palette or an existing tank item)
  const [dragging, setDragging] = useState(false);
  const [dragItem, setDragItem] = useState<Species | TankItem | null>(null); // accept both
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragSource, setDragSource] = useState<'left' | 'tank' | null>(null);
  const [dragExistingId, setDragExistingId] = useState<string | null>(null);
  const dragOrigRef = React.useRef<{ x: number; y: number } | null>(null);

  //Measure the tank’s position on screen, so when we drop something (using pageX/pageY)
  //we can convert to local x/y inside the tank and keep fish inside bounds.
  const tankRef = useRef<View>(null);
  const [tankRect, setTankRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [bgIndex, setBgIndex] = useState(0);
  const bgFade = useRef(new Animated.Value(1)).current;
  const setBgWithFade = (nextIndex: number) => {
    if (!tankBackgrounds.length) return;
    Animated.timing(bgFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setBgIndex((nextIndex + tankBackgrounds.length) % tankBackgrounds.length);
      Animated.timing(bgFade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  };

  const debounce = (fn: (v: any) => void, ms = 600) => {
    let t: any;
    return (v: any) => { clearTimeout(t); t = setTimeout(() => fn(v), ms); };
  };

  // Keep the payload small
  const serializeItems = (items: TankItem[]) =>
    items.map(({ instanceId, id, name, kind, type, x, y, nickname, assetKey, imageURL, speciesId }) => ({
      instanceId, id, name, kind, type, x, y, nickname, assetKey, imageURL, speciesId
    }));

  // To avoid array merge issues
  const itemsById = (items: TankItem[]) => {
    const out: Record<string, ReturnType<typeof serializeItems>[number]> = {};
    for (const it of serializeItems(items)) {
      out[it.instanceId] = it;
    }
    return out;
  };

  // To avoid spamming Firestore on every drag pixel
  const saveTankDebounced = React.useRef(
    debounce(async (payload: any) => {
      try {
        await saveCurrentTank(stripUndefinedDeep(payload));
      } catch (e) {
        console.warn('saveTankDebounced failed', e);
      }
    }, 600)
  ).current;


  const viewRef = useRef<any>(null);

  // Do not screenshot when navigating to Details etc.
  const skipScreenshotOnBlurRef = useRef(false);
  // To avoid overwriting local state on refocus from Details
  const hydratedOnceRef = useRef(false);

  // Save a screenshot when leaving the tank
  async function saveTankScreenshot() {
    try {
      const result = await viewRef.current?.capture?.({
        format: 'jpg',
        quality: 0.9,
        result: Platform.OS === 'web' ? 'base64' : 'tmpfile',
      });
      if (!result) return;

      let uri: string;

      if (Platform.OS === 'web') {
        uri = `data:image/jpeg;base64,${result}`;
        await AsyncStorage.setItem('lastTankScreenshotUri', uri);
      } else {
        const dest = FileSystem.documentDirectory + 'tank-preview.jpg';
        try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}
        await FileSystem.copyAsync({ from: result as string, to: dest });
        uri = dest;
        await AsyncStorage.setItem('lastTankScreenshotUri', uri);
      }

  // Keep Firestore in sync for Home reloads
  await saveCurrentTank(stripUndefinedDeep({ ...buildPayload(tankItems), previewUri: uri }));
    } catch (e) {
      console.warn('Failed to capture tank', e);
    }
  }

  const goPrevBg = () => setBgWithFade(bgIndex - 1);
  const goNextBg = () => setBgWithFade(bgIndex + 1);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const activeItem = useMemo(
    () => tankItems.find(i => i.instanceId === activeItemId) ?? null,
    [tankItems, activeItemId]
  );
  const [bubbleSize, setBubbleSize] = useState<{ w: number; h: number } | null>(null);

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<NameModalMode>('create');
  const [nameDraft, setNameDraft] = useState('');
  const [pendingNew, setPendingNew] = useState<{ base: Species; x: number; y: number; instanceId: string } | null>(null);

  const [waterEnv, setWaterEnv] = useState<WaterType>('freshwater');

  // reset bubble measurement when switching active item
  React.useEffect(() => { setBubbleSize(null); }, [activeItemId]);

  const openMenu = () => {
    // When opening, sync drafts to saved values so closing without sliding keeps state consistent.
    setMenuVisible(true);
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  const closeMenu = React.useCallback(() => {
    // commit the latest drafts
    setUserTemp(tempDraft);
    setUserOxy(oxyDraft);
    setIsSliding(false);

    // save immediately so settings persist even if app/backgrounds
    saveNow(tankItems).catch(() => {});

    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false
    }).start(() => setMenuVisible(false));
  }, [tempDraft, oxyDraft, slide, tankItems]);

  // Whenever the drawer becomes visible, refresh drafts from the committed values (So reopening shows the last saved settings.)
  React.useEffect(() => {
    if (menuVisible) {
      setTempDraft(userTemp);
      setOxyDraft(userOxy);
    }
  }, [menuVisible, userTemp, userOxy]);

  // save when anything important changes (local snapshot + Firestore)
  React.useEffect(() => {
    saveTankSnapshot(tankItems, waterEnv, userTemp, userOxy);

    // Firestore
    const payload = {
      settings: {
        env: waterEnv,
        temp: userTemp,
        oxy: userOxy,
        backgroundKey: tankBackgrounds[bgIndex]?.key,
      },
      fish: serializeItems(tankItems.filter(t => t.kind === 'fish')),
      plants: serializeItems(tankItems.filter(t => t.kind === 'plant')),
      // To avoid array-merge bugs
      items: itemsById(tankItems),
    };
    saveTankDebounced(payload);
  }, [tankItems, userTemp, userOxy, waterEnv, bgIndex]);

  // Build + immediate save to avoid losing updates
  const buildPayloadRaw = (items: TankItem[]) => ({
    settings: {
      env: waterEnv,
      temp: userTemp,
      oxy: userOxy,
      backgroundKey: tankBackgrounds[bgIndex]?.key,
  },
  fish: serializeItems(items.filter(t => t.kind === 'fish')),
  plants: serializeItems(items.filter(t => t.kind === 'plant')),
  // To avoid array-merge bugs
  items: itemsById(items),
});

const buildPayload = (items: TankItem[]) => stripUndefinedDeep(buildPayloadRaw(items));


  const saveNow = async (items: TankItem[]) => {
    try {
      await saveCurrentTank(buildPayload(items));
    } catch (e) {
      console.warn('saveNow failed', e);
    }
  };

  // Persist on app background/quit
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background' || state === 'inactive') {
        try {
          await saveNow(tankItems);
          await saveTankScreenshot();
        } catch {}
      }
    });
    return () => sub.remove();
  }, [tankItems, userTemp, userOxy, waterEnv, bgIndex]);

  useFocusEffect(
    React.useCallback(() => {
      // Saves on leaving this screen
      const onBeforeRemove = async () => {
        if (!skipScreenshotOnBlurRef.current) {
          try {
            await saveNow(tankItems);
            await saveTankScreenshot();
          } catch {}
        }
        skipScreenshotOnBlurRef.current = false; // reset
      };
      const unsub = navigation.addListener('beforeRemove', onBeforeRemove);

      return () => {
        unsub();
      };
    }, [navigation, tankItems])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'web') {
        // Web/desktop: do nothing (orientation lock not supported)
        return;
      }
      // Native (Android/iOS): lock to landscape
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});

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

  const getImageSource = (s: Species | TankItem) => {
    const key = toSlug(
      (s as any).assetKey ||
      (s as any).speciesId ||
      s.id ||
      s.name ||
      ''
    );
    const asset = fishImages[key];
    if (asset) return asset;
    const imageURL = (s as any).imageURL;
    if (imageURL) return { uri: imageURL };
    return defaultFishImage;  // fall back if no image found
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
    setActiveItemId(null); // close bubble while dragging
    setDragSource('tank');
    setDragItem(item);
    setDragExistingId(item.instanceId);
    dragOrigRef.current = { x: item.x, y: item.y }; // so we can snap back if dropped outside
    setTankItems(prev => prev.filter(t => t.instanceId !== item.instanceId)); // hide while moving (don't save yet)
    setDragX(pageX);
    setDragY(pageY);
    setDragging(true);
  };

  const nameOf = (x: Species | TankItem) => ('nickname' in x && x.nickname) ? x.nickname! : x.name;

  // switch environment with warning about affected items
  const switchEnv = (next: WaterType) => {
    if (next === waterEnv) return;
    const affected = tankItems.filter(
      it => ((it.type || 'freshwater').toLowerCase() as WaterType) !== next
    );
    if (affected.length) {
      Alert.alert(
        `Switch to ${next === 'freshwater' ? 'Freshwater' : 'Saltwater'}?`,
        `This action will affect ${affected.length} item(s):\n\n` +
          affected.map(it => `• ${nameOf(it)} (${it.name})`).join('\n'),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => setWaterEnv(next) },
        ]
      );
    } else {
      setWaterEnv(next);
    }
  };

  // left filtered by environment
  const visibleSpecies = useMemo(
    () => speciesList.filter(sp => (sp.type || 'freshwater').toLowerCase() === waterEnv),
    [speciesList, waterEnv]
  );

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

      if (dragSource === 'left') {
        const base = dragItem as Species;
        const instanceId = `${base.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Build conflicts (duplicates, explicit incompat, water mismatch)
        //Only use "hard NO" rules + a few self-avoid species. If any tank item is in your incompatible list (or vice versa), we show "Avoid".
        const conflicts = addConflicts(base, tankItems);
        const waterMismatch =
          ((base.type || 'freshwater').toLowerCase() as WaterType) !== waterEnv
            ? [`• ${base.name} — is ${(base.type || 'unknown')} while environment is ${waterEnv}`]
            : [];
        const allMsgs = [...conflicts, ...waterMismatch];

        const proceed = () => {
          if (base.kind === 'fish') {
            setPendingNew({ base, x: localX, y: localY, instanceId });
            setNameDraft('');
            setNameModalMode('create');
            setNameModalVisible(true);
          } else {
            // Classify non-fish as plant and save immediately
            setTankItems(prev => {
              const newItem: TankItem = {
                ...(base as Species),
                id: `${base.id}::${instanceId}`,
                speciesId: base.id,
                kind: base.kind ?? 'plant',
                instanceId,
                x: localX,
                y: localY
              };
              const next = [...prev, newItem];
              saveNow(next);
              return next;
            });
          }
        };

        if (allMsgs.length) {
          Alert.alert(
            'Heads up',
            `This action will affect:\n\n${allMsgs.join('\n')}\n\nProceed?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Proceed', style: 'destructive', onPress: proceed },
            ]
          );
        } else {
          proceed();
        }
      } else if (dragSource === 'tank' && dragExistingId) {
        const moving = dragItem as TankItem;
        setTankItems(prev => {
          const next = [
            ...prev,
            { ...(moving as Species), instanceId: dragExistingId, x: localX, y: localY, nickname: moving.nickname } as TankItem,
          ];
          saveNow(next);
          return next;
        });
      }
    } else if (dragSource === 'tank' && dragExistingId) {
      const orig = dragOrigRef.current;
      if (orig) {
        const moving = dragItem as TankItem;
        setTankItems(prev => {
          const next = [
            ...prev,
            { ...(moving as Species), instanceId: dragExistingId, x: orig.x, y: orig.y, nickname: moving.nickname } as TankItem,
          ];
          saveNow(next);
          return next;
        });
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

  function getBubblePositionOnScreen(
    item: TankItem,
    tank: { x: number; y: number; w: number; h: number },
    insetsVals: { top: number; right: number; bottom: number; left: number },
    bubble: { w: number; h: number } | null
  ) {
    const win = Dimensions.get('window');
    const w = bubble?.w ?? BUBBLE_W;
    const h = bubble?.h ?? BUBBLE_DEFAULT_H;

    const screenW = win.width  - insetsVals.left - insetsVals.right;
    const screenH = win.height - insetsVals.top  - insetsVals.bottom;

    const fishLeft = (tank.x - insetsVals.left) + item.x;
    const fishTop  = (tank.y - insetsVals.top)  + item.y;

    const spaceBelow = screenH - (fishTop + FISH_H);
    const placeBelow = spaceBelow >= h + 8;

    let top  = placeBelow ? (fishTop + FISH_H + 8) : (fishTop - h - 8);
    let left = fishLeft - 16;

    // Clamp & avoid left rail
    const leftMax = screenW - w - UI_EDGE_GAP;
    const desiredMinLeft = LEFT_BAR_W + UI_EDGE_GAP;
    const leftMin = Math.min(desiredMinLeft, leftMax);

    left = clamp(left, leftMin, leftMax);
    top  = clamp(top,  UI_EDGE_GAP, screenH - h - UI_EDGE_GAP);

    return { left, top, width: w };
  }

  const onTankItemPress = (item: TankItem) => {
    setActiveItemId(curr => (curr === item.instanceId ? null : item.instanceId));
  };

  const confirmCreateItem = () => {
    if (!pendingNew) return;
    const { base, x, y, instanceId } = pendingNew;
    // Ensure kind is set for fish, give each item unique id + speciesId, and save immediately
    const newItem: TankItem = {
      ...(base as Species),
      id: `${base.id}::${instanceId}`,
      speciesId: base.id, 
      kind: base.kind ?? 'fish',
      instanceId,
      x,
      y,
      nickname: nameDraft.trim() || defaultNicknameFor(base)
    };
    setTankItems(prev => {
      const next = [...prev, newItem];
      saveNow(next);
      return next;
    });
    setPendingNew(null);
    setNameModalVisible(false);
  };

  const startRename = (item: TankItem) => {
    setActiveItemId(item.instanceId);
    setNameDraft(item.nickname || '');
    setNameModalMode('rename');
    setNameModalVisible(true);
  };

  const confirmRename = () => {
    setTankItems(prev => {
      const next = prev.map(i =>
        i.instanceId === activeItemId
          ? { ...i, nickname: (nameDraft.trim() || i.nickname || defaultNicknameFor(i)) }
          : i
      );
      saveNow(next);
      return next;
    });
    setNameModalVisible(false);
  };

  const deleteItem = (id: string) => {
    Alert.alert('Delete', 'Remove this from your tank?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          setTankItems(prev => {
            const next = prev.filter(t => t.instanceId !== id);
            saveNow(next);
            return next;
          });
        }
      },
    ]);
  };

  const openDetails = async (item: TankItem) => {
    const baseId = item.speciesId || (item.id?.includes('::') ? item.id.split('::')[0] : item.id);
    const species = speciesList.find(s => s.id === baseId) || (item as Species);
    skipScreenshotOnBlurRef.current = true; // Don't run blur save from Details nav
    await saveNow(tankItems);              // Persist before leaving so refocus can't overwrite
    (navigation as any).navigate('Details', { species });
  };

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [MENU_W, 0] });
  const scrimOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  // Populate Aquarium state from Firestore on first focus only (prevents overwrite after Details)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        if (hydratedOnceRef.current) return;
        hydratedOnceRef.current = true;

        try {
          const tank = await getCurrentTank();
          if (!alive || !tank) return;

          // settings
          const env = (tank as any)?.settings?.env as WaterType | undefined;
          const temp = (tank as any)?.settings?.temp as number | undefined;
          const oxy  = (tank as any)?.settings?.oxy as number | undefined;
          const bgKey = (tank as any)?.settings?.backgroundKey as string | undefined;

          if (env) setWaterEnv(env);
          if (typeof temp === 'number') { setUserTemp(temp); setTempDraft(temp); }
          if (typeof oxy === 'number')  { setUserOxy(oxy);   setOxyDraft(oxy); }
          if (bgKey) {
            const idx = Math.max(0, tankBackgrounds.findIndex(b => b.key === bgKey));
            setBgIndex(idx === -1 ? 0 : idx);
          }

          // Prefer dictionary if available, else arrays
          const dict = (tank as any)?.items;
          let merged: Partial<TankItem>[] = [];
          if (dict && typeof dict === 'object' && Object.keys(dict).length) {
            merged = Object.values(dict) as Partial<TankItem>[];
          } else {
            const fish  = (tank as any)?.fish  ?? [];
            const plants = (tank as any)?.plants ?? [];
            const toArray = (v: any) =>
              Array.isArray(v) ? v : (v && typeof v === 'object') ? Object.values(v) : [];
            merged = [...toArray(fish), ...toArray(plants)];
          }

          const hydrated: TankItem[] = (merged as Partial<TankItem>[]).map((it, i) => {
            const rawId = it.id ?? `item-${i}`;
            const hasSep = typeof rawId === 'string' && rawId.includes('::');
            const speciesId = (it as any).speciesId || (hasSep ? rawId.split('::')[0] : rawId);
            const instanceId =
              it.instanceId ||
              (hasSep ? rawId.split('::')[1] : undefined) ||
              `${speciesId}-${i}-${Math.random().toString(36).slice(2,6)}`;

            return {
              id: rawId, // keep as is (may be unique id)
              speciesId,
              name: it.name ?? 'Unknown',
              kind: (it.kind as any) ?? 'fish',
              type: (it.type as any) ?? 'freshwater',
              assetKey: it.assetKey,
              imageURL: it.imageURL,
              instanceId,
              x: typeof it.x === 'number' ? it.x : 20 + (i * 10) % 120,
              y: typeof it.y === 'number' ? it.y : 20 + (i * 12) % 90,
              nickname: it.nickname,
            };
          });

          setTankItems(hydrated);
        } catch (e) {
          console.warn('Failed to load saved tank', e);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading tank…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#102B44' }} edges={['top', 'right']}>
      <TouchableOpacity
        onPress={async () => {
          skipScreenshotOnBlurRef.current = true; // Manually save here
          await saveNow(tankItems);
          await saveTankScreenshot();
          navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('Home');
        }}
        style={{ position: 'absolute', left: 12, top: Math.max(insets.top, ANDROID_SAFE) + 12, zIndex: 200, backgroundColor: 'rgba(11,29,47,0.85)', borderWidth: 1, borderColor: '#1E3A5F', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ color: '#E2E8F0', fontWeight: '700', fontSize: 16 }}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.root}>

        <View style={styles.leftRail}>
          <ScrollView
            style={styles.leftBar}
            contentContainerStyle={[styles.leftBarContent, { paddingTop: Math.max(insets.top, ANDROID_SAFE) + 8 }]}
            showsVerticalScrollIndicator
          >
            {visibleSpecies.map(sp => (
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

        <ViewShot ref={viewRef} style={{ flex: 1 }} options={{ format: 'jpg', quality: 0.9 }}>
          <View ref={tankRef} onLayout={onTankLayout} style={styles.tank}>
            <View style={styles.tankBgWrap} pointerEvents="none" accessible={false}>
              <Animated.Image
                source={tankBackgrounds[bgIndex]?.src}
                style={[styles.FishTank, { opacity: bgFade }]}
                resizeMode="cover"
              />
            </View>

          {tankBackgrounds.length > 1 && (
            <>
              <TouchableOpacity
                accessibilityLabel="Previous background"
                onPress={goPrevBg}
                style={[styles.carouselArrow, styles.carouselArrowLeft]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.carouselArrowText}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Next background"
                onPress={goNextBg}
                style={[styles.carouselArrow, styles.carouselArrowRight]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.carouselArrowText}>›</Text>
              </TouchableOpacity>
            </>
          )}

          {tankBackgrounds[bgIndex]?.label && (
            <View style={styles.bgCaption}>
              <Text style={styles.bgCaptionText}>{tankBackgrounds[bgIndex].label}</Text>
            </View>
          )}

          {tankItems.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>Long-press a fish/plant, drag, and drop it into the tank.</Text>
            </View>
          ) : (
            tankItems.map(item => {
              const isMismatch =
                ((item.type || 'freshwater').toLowerCase() as WaterType) !== waterEnv;
              return (
                <Pressable
                  key={item.instanceId}
                  onPress={() => onTankItemPress(item)}
                  onLongPress={e => startDragExisting(item, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                  delayLongPress={180}
                  style={[
                    styles.fishWrap,
                    { left: item.x, top: item.y, width: FISH_W, height: FISH_H },
                    isMismatch && styles.mismatchWrap,
                  ]}
                >
                  <Image source={getImageSource(item)} style={styles.fish} />
                  {(item.kind === 'fish') && (item.nickname || item.name) && (
                    <View style={styles.nameTag}>
                      <Text numberOfLines={1} style={styles.nameTagText}>
                        {item.nickname || item.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ViewShot>

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
              <Text style={styles.h1}>Environment</Text>
              <View style={styles.segment}>
                {(['freshwater','saltwater'] as WaterType[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => switchEnv(opt)}
                    style={[styles.segBtn, waterEnv === opt && styles.segBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: waterEnv === opt }}
                  >
                    <Text style={[styles.segBtnText, waterEnv === opt && styles.segBtnTextActive]}>
                      {opt === 'freshwater' ? 'Freshwater' : 'Saltwater'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

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
                 - While dragging: we show the draft value.
                 - When you close the drawer: we commit to userTemp.
              */}
              <Text style={styles.controlLabel}>Temperature: {tempDraft.toFixed(1)}°C</Text>
              <View style={styles.sliderWrap} pointerEvents="box-none">
                <Slider
                  value={tempDraft}
                  onSlidingStart={() => setIsSliding(true)}
                  onValueChange={setTempDraft}
                  onSlidingComplete={(v) => { setTempDraft(v); setIsSliding(false); }}
                  minimumValue={15}
                  maximumValue={35}
                  step={0.5}
                  style={styles.slider}
                />
              </View>
              {renderTempHint(tankItems, tempDraft)}

              {/* ------- Oxygen slider -------
                 Turn low/medium/high needs into % ranges:
                 low 30–55, medium 45–75, high 65–90.
                 These ranges overlap on purpose so you don't
                 see "wrong" all the time.
              */}
              <Text style={[styles.controlLabel, { marginTop: 16 }]}>
                Oxygen / Aeration: {Math.round(oxyDraft)}%
              </Text>
              <View style={styles.sliderWrap} pointerEvents="box-none">
                <Slider
                  value={oxyDraft}
                  onSlidingStart={() => setIsSliding(true)}
                  onValueChange={setOxyDraft}
                  onSlidingComplete={(v) => { setOxyDraft(v); setIsSliding(false); }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  style={styles.slider}
                />
              </View>
              {renderOxyHint(tankItems, oxyDraft)}
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

      {activeItem && tankRect && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { zIndex: 180 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveItemId(null)} />
          {(() => {
            const pos = getBubblePositionOnScreen(activeItem, tankRect, insets, bubbleSize);
            return (
              <View
                onStartShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                style={[styles.bubble, { left: pos.left, top: pos.top, width: pos.width, zIndex: 190, elevation: 12 }]}
                onLayout={e => setBubbleSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
              >
                <Text style={styles.bubbleTitle}>{activeItem.nickname || activeItem.name}</Text>

                <View style={styles.bubbleRow}>
                  <TouchableOpacity style={styles.bubbleBtn} onPress={() => startRename(activeItem)}>
                    <Text style={styles.bubbleBtnText}>Rename</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bubbleBtn} onPress={() => openDetails(activeItem)}>
                    <Text style={styles.bubbleBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.bubbleBtn, styles.deleteBtn]} onPress={() => deleteItem(activeItem.instanceId)}>
                  <Text style={styles.bubbleBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      )}

      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {nameModalMode === 'create' ? 'Name your fish/plant' : 'Rename'}
            </Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="e.g., Bubbles"
              placeholderTextColor="#94a3b8"
              autoFocus
              style={styles.modalInput}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => { setNameModalVisible(false); setPendingNew(null); }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={nameModalMode === 'create' ? confirmCreateItem : confirmRename}
              >
                <Text style={{ color: '#fff' }}>
                  {nameModalMode === 'create' ? 'Add to tank' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

// clean up each doc from Firestore: ranges + assetKey + incompatible list + normalized type
function normalizeSpecies(s: Species): Species {
  // Accept both "ph" and "pH" from Firestore, and handle array or number
  const rawPh = (s as any).ph ?? (s as any).pH ?? (s as any)['Ph'] ?? (s as any)['PH'];
  const ph = typeof rawPh === 'number' ? rawPh : asRange(rawPh);

  const temp = asRange(s.temp);

  // if assetKey is missing, make one from name/id
  const assetKey = s.assetKey && s.assetKey.length ? toSlug(s.assetKey) : toSlug(s.name || s.id || '');

  // incompatibleWith can be array/string/object – normalize to string[] 
  const rawIncompat = (s as any).incompatibleWith ?? [];
  let arr: string[] = [];
  if (Array.isArray(rawIncompat)) arr = rawIncompat;
  else if (typeof rawIncompat === 'string') arr = rawIncompat.split(/[,\n;]/);
  else if (rawIncompat && typeof rawIncompat === 'object') arr = Object.values(rawIncompat as Record<string, any>).map(String);
  const incompatibleWith = arr.map(v => toSlug(String(v))).filter(Boolean);

  // Normalize water "type" to 'freshwater' | 'saltwater'
  const rawType = ((s as any).type ?? 'freshwater').toString().toLowerCase().replace(/\s+/g, '');
  const type: WaterType =
    rawType.startsWith('salt') || rawType.startsWith('marine') ? 'saltwater' : 'freshwater';

  // keep kind if present (fish/plant)
  const kind = (s.kind as any) as ('fish' | 'plant' | undefined);

  return { ...s, ph, temp, assetKey, incompatibleWith, type, kind };
}

//Only use "hard NO" rules + a few self-avoid species. If any tank item is in your incompatible list (or vice versa), we show "Avoid".
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

// build conflicts (duplicates, explicit incompat, self-avoid like bettas)
function addConflicts(candidate: Species, tank: TankItem[]): string[] {
  const msgs: string[] = [];
  const candId = canonicalId(candidate);

  // avoid duplicate self-avoid species (e.g., betta vs betta)
  if (SELF_AVOID.has(candId)) {
    const clashes = tank.filter(t => canonicalId(t) === candId);
    for (const c of clashes) {
      msgs.push(
        `• ${c.nickname ? c.nickname : c.name} — another ${candidate.name} is already in the tank`
      );
    }
  }

  // explicit incompatibilities either direction
  for (const t of tank) {
    if (isExplicitlyIncompatible(candidate, t)) {
      msgs.push(
        `• ${t.nickname ? t.nickname : t.name} — incompatible with ${candidate.name}`
      );
    }
  }

  return msgs;
}

// These are just to give the user feedback.
function summarizeTank(items: (Species | TankItem)[]) {
  if (!items.length) return [];

  const temps = items
    .map(s => {
      const r = asRange((s as any).temp);
      return r ? (r.min + r.max) / 2 : null;
    })
    .filter((n): n is number => n !== null);

  const phMids = items
    .map(s => {
      const v = (s as any).ph;
      if (!v && v !== 0) return null;
      if (typeof v === 'number') return v;
      const r = asRange(v);
      return r ? (r.min + r.max) / 2 : null;
    })
    .filter((n): n is number => n !== null);

  const oxy = items.map(s => s.oxygenNeed).filter(Boolean) as Oxygen[];

  const tempAvg = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '—';
  const phAvg   = phMids.length ? (phMids.reduce((a, b) => a + b, 0) / phMids.length).toFixed(2) : 'No pH data';

  // rough oxygen summary
  let oxygenStatus: 'low' | 'medium' | 'high' | 'conflict' = 'medium';
  if (oxy.includes('high') && oxy.includes('low')) oxygenStatus = 'conflict';
  else if (oxy.includes('high')) oxygenStatus = 'high';
  else if (oxy.length && oxy.every(o => o === 'low')) oxygenStatus = 'low';

  return [
    { label: 'Species Count', value: String(items.length) },
    { label: 'Avg Temp (°C)', value: String(tempAvg) },
    { label: 'Avg pH', value: phAvg },
    { label: 'Oxygen Need', value: oxygenStatus },
  ];
}

type TankSnapshot = {
  speciesCount: number;
  env: WaterType;
  temp: number;
  oxy: number;
  avgPhText: string;
  backgroundKey?: string;
  timestamp: number;
};

async function saveTankSnapshot(
  items: (Species | TankItem)[],
  env: WaterType,
  temp: number,
  oxy: number
) {
  const stats = summarizeTank(items);
  const speciesCount = items.length;
  const avgPhText = (stats.find(s => s.label === 'Avg pH')?.value ?? '—') as string;

  const snap: TankSnapshot = {
    speciesCount,
    env,
    temp,
    oxy,
    avgPhText,
    timestamp: Date.now(),
  };
  try {
    await AsyncStorage.setItem('thinktank:snapshot', JSON.stringify(snap));
  } catch (e) {
    console.warn('Failed saving tank snapshot', e);
  }
}

// Find one range that works for ALL fish: min = biggest of everyone’s mins, max = smallest of everyone’s maxes.
// If min > max → impossible range → "Conflict".
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
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    backgroundColor: 'rgba(11,29,47,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  carouselArrowLeft: { left: 12 },
  carouselArrowRight: { right: 12 },
  carouselArrowText: { color: '#C7D2FE', fontSize: 22, fontWeight: '700' },
  bgCaption: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(11,29,47,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  bgCaptionText: { color: '#E2E8F0', fontSize: 12 },

  fishWrap: {
    position: 'absolute',
    alignItems: 'center'
  },
  fish: {
    width: FISH_W,
    height: FISH_H,
    resizeMode: 'contain'
  },
  nameTag: {
    position: 'absolute',
    bottom: -18,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  nameTagText: {
    fontSize: 12,
    color: '#E2E8F0',
    backgroundColor: 'rgba(16,43,68,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 140,
  },
  bubble: {
    position: 'absolute',
    width: 220,
    borderRadius: 12,
    backgroundColor: '#0B1D2F',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: RHYTHM,
    paddingTop: RHYTHM,
    paddingBottom: RHYTHM,
    zIndex: 20,
  },
  bubbleTitle: {
    fontWeight: '700',
    color: '#C7D2FE',
    marginBottom: RHYTHM / 1.5,
  },
  bubbleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: RHYTHM,
  },
  deleteBtn: {
    backgroundColor: '#2a1111',
    borderColor: '#5f1e1e',
    alignSelf: 'stretch',
    marginTop: 0,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bubbleBtnText: {
    color: '#E2E8F0',
    fontWeight: '600',
    textAlign: 'center',
  },
  bubbleBtn: {
    backgroundColor: '#0f2a46',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mismatchWrap: {
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 12,
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
  segment: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 8 
  },
  segBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0f2a46',
  },
  segBtnActive: { 
    backgroundColor: '#1a4b7a' 
  },
  segBtnText: { 
    color: '#C7D2FE', fontWeight: '600' 
  },
  segBtnTextActive: { 
    color: '#fff' 
  },
  modalBackdrop: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0B1D2F',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 10, 
    color: '#fff' 
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    color: '#E2E8F0',
    backgroundColor: '#0f2a46',
  },
  modalRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 8 
  },
  modalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f2a46',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  modalPrimary: { 
    backgroundColor: '#1a4b7a' 
  },
});