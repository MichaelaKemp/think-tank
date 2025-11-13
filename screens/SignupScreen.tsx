import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions, } from "react-native";
import { BubbleButton, Card, OceanBackground, ocean } from "../components/ui";
import "../firebase";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => {});
    }, [])
  );

  const onLogin = async () => {
    if (busy) return;

    const auth = getAuth();

    try {
      setBusy(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert("Login failed", e?.message ?? "Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OceanBackground>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              flexDirection: isLandscape ? "row" : "column",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: isLandscape ? 80 : 20,
              paddingTop: isLandscape ? 40 : 120,
              paddingBottom: 24,
              gap: isLandscape ? 60 : 18,
            }}
          >
            <View
              style={{
                alignItems: isLandscape ? "flex-start" : "center",
                flex: isLandscape ? 0.45 : undefined,
              }}
            >
              <Image
                source={require("../assets/images/logo.png")}
                style={{
                  width: isLandscape ? 140 : 200,
                  height: isLandscape ? 140 : 200,
                  marginTop: isLandscape ? 40 : undefined,
                  resizeMode: "contain",
                }}
              />

              <Text
                style={{
                  color: "#EAF6FF",
                  marginTop: 8,
                  fontSize: 16,
                  textAlign: "center",
                  flexWrap: "wrap",
                  maxWidth: isLandscape ? 160 : 320,
                  lineHeight: 22,
                }}
              >
                Welcome back to{" "}
                <Text style={{ fontWeight: "800" }}>Think Tank</Text>
              </Text>
            </View>

            <View
              style={{
                flex: isLandscape ? 0.55 : undefined,
                width: "100%",
              }}
            >
              <Card style={{ padding: 16, marginTop: isLandscape ? 50 : 0 }}>
                <View style={{ gap: 12 }}>
                  <View style={styles.inputRow}>
                    <Ionicons
                      name="mail"
                      size={18}
                      color="#789"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor="#6b7280"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color="#789"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#6b7280"
                      secureTextEntry={secure}
                      value={password}
                      onChangeText={setPassword}
                      style={[styles.input, { flex: 1 }]}
                    />
                    <TouchableOpacity onPress={() => setSecure((s) => !s)}>
                      <Ionicons
                        name={secure ? "eye" : "eye-off"}
                        size={18}
                        color="#789"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity
                      disabled={busy}
                      activeOpacity={0.9}
                      onPress={onLogin}
                    >
                      {busy ? (
                        <View style={styles.loadingBtn}>
                          <ActivityIndicator />
                        </View>
                      ) : (
                        <BubbleButton title="Log In" onPress={onLogin} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                    <Text style={{ textAlign: "center", color: ocean.textDark }}>
                      No account?{" "}
                      <Text style={{ color: ocean.primary, fontWeight: "800" }}>
                        Sign up
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OceanBackground>
  );
}

const styles = {
  inputRow: { flexDirection: "row" as const, alignItems: "center" as const, backgroundColor: "#F7FBFF", borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5F2FF" },
  input: { flex: 1, paddingVertical: 10 },
  loadingBtn: { paddingVertical: 14, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#FFE9A8" },
};