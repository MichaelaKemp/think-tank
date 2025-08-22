import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BubbleButton, Card, OceanBackground, ocean } from "../components/ui";
import "../firebase";

export default function SignupScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [busy, setBusy] = useState(false);

  const onSignup = async () => {
    if (busy) return;
    if (password.length < 6) return Alert.alert("Weak password", "Use at least 6 characters.");
    if (password !== confirm) return Alert.alert("Mismatch", "Passwords do not match.");

    const auth = getAuth();
    try {
      setBusy(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Auth state will navigate you into the app
    } catch (e: any) {
      Alert.alert("Signup failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OceanBackground>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 120, paddingBottom: 24, justifyContent: "center" }}>
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <Image source={require("../assets/images/logo.png")} style={{ width: 200, height: 200, resizeMode: "contain" }} />
              <Text style={{ color: "#EAF6FF", marginTop: 4 }}>Create your account</Text>
            </View>

            <Card style={{ padding: 16 }}>
              <View style={{ gap: 12 }}>
                <View style={styles.inputRow}>
                  <Ionicons name="mail" size={18} color="#789" style={{ marginRight: 8 }} />
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
                  <Ionicons name="lock-closed" size={18} color="#789" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={secure}
                    value={password}
                    onChangeText={setPassword}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={() => setSecure((s) => !s)} accessibilityRole="button" accessibilityLabel={secure ? "Show password" : "Hide password"}>
                    <Ionicons name={secure ? "eye" : "eye-off"} size={18} color="#789" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed" size={18} color="#789" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={secure2}
                    value={confirm}
                    onChangeText={setConfirm}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={() => setSecure2((s) => !s)} accessibilityRole="button" accessibilityLabel={secure2 ? "Show password" : "Hide password"}>
                    <Ionicons name={secure2 ? "eye" : "eye-off"} size={18} color="#789" />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity disabled={busy} activeOpacity={0.9} onPress={onSignup}>
                    {busy ? (
                      <View style={styles.loadingBtn}> 
                        <ActivityIndicator />
                      </View>
                    ) : (
                      <BubbleButton title="Sign Up" onPress={onSignup} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={{ textAlign: "center", color: ocean.textDark }}>Have an account? <Text style={{ color: ocean.primary, fontWeight: "800" }}>Log in</Text></Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OceanBackground>
  );
}

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
