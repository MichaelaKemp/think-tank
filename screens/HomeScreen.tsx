import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FishTank from "../assets/images/Fish-Tank.jpeg";
import TankOverviewCard from "../components/TankOverviewCard";
import { Card, OceanBackground } from "../components/ui";

type TankSnapshot = {
  speciesCount: number;
  env: "freshwater" | "saltwater";
  temp: number;
  oxy: number;
  avgPhText: string;
  timestamp: number;
};

export default function HomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [tankPreviewUri, setTankPreviewUri] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TankSnapshot | null>(null);

  // Prefer Aquarium's param; else read from storage; also load tank snapshot
  useEffect(() => {
    let mounted = true;
    (async () => {
      const fromRoute = route?.params?.tankPreviewUri as string | undefined;
      if (fromRoute) {
        setTankPreviewUri(fromRoute);
      } else {
        const savedUri = await AsyncStorage.getItem("lastTankScreenshotUri");
        if (mounted && savedUri) setTankPreviewUri(savedUri);
      }

      const snapStr = await AsyncStorage.getItem("thinktank:snapshot");
      if (mounted && snapStr) {
        try { setSnapshot(JSON.parse(snapStr)); } catch {}
      }
    })();
    return () => { mounted = false; };
  }, [route?.params?.tankPreviewUri]);

  // Background prop so we never pass null
  const backgroundProp = tankPreviewUri
    ? { uri: tankPreviewUri } // works for file://, https://, and data: URIs
    : FishTank;               // local image fallback

  return (
    <OceanBackground>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 120, paddingBottom: insets.bottom + 24 }}>
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <Text style={styles.logo}>Think Tank</Text>
          <Text style={styles.subtitle}>Plan your dream tank—no fish harmed.</Text>
        </View>

        <Card style={{ padding: 0 }}>
          <TankOverviewCard
            background={backgroundProp}
            snapshot={snapshot}
            onOpenTank={() => navigation.navigate("Aquarium")}
            onExplore={() => navigation.navigate("List")}
          />
        </Card>
      </View>
    </OceanBackground>
  );
}

const styles = StyleSheet.create({
  logo: { 
    fontSize: 40, 
    fontWeight: "900", 
    letterSpacing: 4, 
    color: "#fff", 
    textShadowColor: "rgba(0,0,0,0.2)", 
    textShadowRadius: 6 
  },
  subtitle: { 
    color: "#EAF6FF", 
    marginTop: 4 
  },
});