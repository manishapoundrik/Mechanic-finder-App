import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { API_URL } from "@/lib/config";

fetch(`${API_URL}/api/auth/signup`, {
   method: "POST"
});

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [role, setRole] = useState<'customer' | 'mechanic'>('customer');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  async function handleSignup() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (role === 'mechanic' && (!shopName.trim() || !phone.trim() || !address.trim())) {
      setError('Mechanics must provide shop name, phone, and address');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        role,
        shopName: shopName.trim() || undefined,
        specialty: specialty.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (role === 'mechanic') {
        router.replace('/(mechanic)/dashboard');
      } else {
        router.replace('/(customer)/home');
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('409')) {
        setError('Email or username already taken');
      } else {
        setError('Something went wrong. Please try again.');
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Mechanic Finder platform</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.roleSection}>
            <Text style={styles.roleSectionLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[styles.roleCard, role === 'customer' && styles.roleCardActive]}
                onPress={() => setRole('customer')}
              >
                <Ionicons name="person" size={28} color={role === 'customer' ? Colors.dark.accent : Colors.dark.textMuted} />
                <Text style={[styles.roleCardTitle, role === 'customer' && styles.roleCardTitleActive]}>Customer</Text>
                <Text style={styles.roleCardSub}>Find mechanics</Text>
              </Pressable>
              <Pressable
                style={[styles.roleCard, role === 'mechanic' && styles.roleCardActive]}
                onPress={() => setRole('mechanic')}
              >
                <MaterialCommunityIcons name="car-wrench" size={28} color={role === 'mechanic' ? Colors.dark.accent : Colors.dark.textMuted} />
                <Text style={[styles.roleCardTitle, role === 'mechanic' && styles.roleCardTitleActive]}>Mechanic</Text>
                <Text style={styles.roleCardSub}>Offer services</Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.form}>
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.dark.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <InputField label="Full Name *" icon="person-outline" placeholder="Your full name"
              value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <InputField label="Username *" icon="at-outline" placeholder="Choose a username"
              value={username} onChangeText={setUsername} autoCapitalize="none" />
            <InputField label="Email *" icon="mail-outline" placeholder="your@email.com"
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <InputField label="Phone *" icon="call-outline" placeholder="Your phone number"
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            {role === 'mechanic' && (
              <>
                <InputField label="Shop Name *" icon="storefront-outline" placeholder="Your garage name"
                  value={shopName} onChangeText={setShopName} />
                <InputField label="Specialty" icon="construct-outline" placeholder="e.g. Engine Repair, Brakes"
                  value={specialty} onChangeText={setSpecialty} />
                <InputField label="Shop Address *" icon="location-outline" placeholder="Street, City"
                  value={address} onChangeText={setAddress} />
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textMuted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.signupBtn, pressed && styles.btnPressed, isLoading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.signupBtnText}>
                  {role === 'mechanic' ? 'Register as Mechanic' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {Platform.OS === 'web' && <View style={{ height: 34 }} />}
    </View>
  );
}

function InputField({
  label, icon, placeholder, value, onChangeText, autoCapitalize, keyboardType,
}: {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: any;
  keyboardType?: any;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon as any} size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  topBar: { paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 4 },
  roleSection: { marginBottom: 20 },
  roleSectionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1, backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 2, borderColor: Colors.dark.border,
  },
  roleCardActive: { borderColor: Colors.dark.accent, backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  roleCardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  roleCardTitleActive: { color: Colors.dark.accent },
  roleCardSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  form: { gap: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.error, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBackground,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.inputBorder,
  },
  inputIcon: { marginLeft: 16 },
  input: { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  eyeBtn: { padding: 16 },
  signupBtn: {
    backgroundColor: Colors.dark.accent, borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.7 },
  signupBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, paddingBottom: 16 },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  footerLink: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accent },
});
