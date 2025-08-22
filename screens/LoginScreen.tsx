import { Ionicons as Ion } from "@expo/vector-icons";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Image as Img, KeyboardAvoidingView as KAV, Alert as RNAlert, Platform as RNPlatform, ActivityIndicator as Spinner, ScrollView as SV, Text as T, TextInput as TI, TouchableOpacity as TO, View as V } from "react-native";
import { OceanBackground as BG, BubbleButton as Btn, Card as C, ocean as theme } from "../components/ui";
import "../firebase";

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    if (busy) return;
    const auth = getAuth();
    try {
      setBusy(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      RNAlert.alert("Login failed", e?.message ?? "Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BG>
      <KAV behavior={RNPlatform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <SV contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <V style={{ flex: 1, paddingHorizontal: 20, paddingTop: 120, paddingBottom: 24, justifyContent: "center" }}>
            <V style={{ alignItems: "center", marginBottom: 18 }}>
              <Img source={require("../assets/images/logo.png")} style={{ width: 200, height: 200, resizeMode: "contain" }} />
              <T style={{ color: "#EAF6FF", marginTop: 4 }}>Welcome back</T>
            </V>

            <C style={{ padding: 16 }}>
              <V style={{ gap: 12 }}>
                <V style={styles.inputRow}>
                  <Ion name="mail" size={18} color="#789" style={{ marginRight: 8 }} />
                  <TI
                    placeholder="Email"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                  />
                </V>

                <V style={styles.inputRow}>
                  <Ion name="lock-closed" size={18} color="#789" style={{ marginRight: 8 }} />
                  <TI
                    placeholder="Password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={secure}
                    value={password}
                    onChangeText={setPassword}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TO onPress={() => setSecure((s) => !s)} accessibilityRole="button" accessibilityLabel={secure ? "Show password" : "Hide password"}>
                    <Ion name={secure ? "eye" : "eye-off"} size={18} color="#789" />
                  </TO>
                </V>

                <V style={{ marginTop: 8 }}>
                  <TO disabled={busy} activeOpacity={0.9} onPress={onLogin}>
                    {busy ? (
                      <V style={styles.loadingBtn}>
                        <Spinner />
                      </V>
                    ) : (
                      <Btn title="Log In" onPress={onLogin} />
                    )}
                  </TO>
                </V>

                <TO onPress={() => navigation.navigate("Signup")}>
                  <T style={{ textAlign: "center", color: theme.textDark }}>No account? <T style={{ color: theme.primary, fontWeight: "800" }}>Sign up</T></T>
                </TO>
              </V>
            </C>
          </V>
        </SV>
      </KAV>
    </BG>
  );
}
export default LoginScreen;

const styles = {
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F7FBFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5F2FF",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  loadingBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#FFE9A8",
  },
};