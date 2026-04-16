import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/query-client';
import { router } from 'expo-router';

const webTopInset = Platform.OS === 'web' ? 67 : 0;

export default function MechanicProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateProfile, refreshProfile, logout } = useAuth();

  const mechanic = user?.mechanic;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [shopName, setShopName] = useState(mechanic?.shopName || '');
  const [specialty, setSpecialty] = useState(mechanic?.specialty || '');
  const [phone, setPhone] = useState(mechanic?.phone || '');
  const [workingHours, setWorkingHours] = useState(mechanic?.workingHours || '');
  const [address, setAddress] = useState(mechanic?.address || '');

  function startEdit() {
    setFullName(user?.fullName || '');
    setShopName(mechanic?.shopName || '');
    setSpecialty(mechanic?.specialty || '');
    setPhone(mechanic?.phone || '');
    setWorkingHours(mechanic?.workingHours || '');
    setAddress(mechanic?.address || '');
    setIsEditing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function saveProfile() {
    if (!token) return;
    setIsSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim() });
      await apiRequest('PUT', '/api/mechanics/profile', {
        shopName: shopName.trim(),
        specialty: specialty.trim(),
        phone: phone.trim(),
        workingHours: workingHours.trim(),
        address: address.trim(),
      }, token);
      await refreshProfile();
      setIsEditing(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Profile</Text>

      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.avatarName}>{user?.fullName}</Text>
            <Text style={styles.shopNameLabel}>{mechanic?.shopName}</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="car-wrench" size={12} color={Colors.dark.accent} />
              <Text style={styles.roleText}>Mechanic</Text>
            </View>
          </View>
          {!isEditing && (
            <Pressable style={styles.editIconBtn} onPress={startEdit}>
              <Ionicons name="pencil" size={18} color={Colors.dark.accent} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.ratingBanner}>
        <Ionicons name="star" size={18} color={Colors.dark.accent} />
        <Text style={styles.ratingBannerText}>{mechanic?.rating || '5.0'} rating</Text>
        <Text style={styles.ratingBannerSub}>·  {mechanic?.totalJobs || 0} jobs completed</Text>
      </Animated.View>

      {isEditing ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Edit Profile</Text>
          <View style={styles.editForm}>
            {[
              { label: 'Full Name', value: fullName, setter: setFullName, icon: 'person-outline', capitalize: 'words' as const },
              { label: 'Shop Name', value: shopName, setter: setShopName, icon: 'storefront-outline', capitalize: 'words' as const },
              { label: 'Specialty', value: specialty, setter: setSpecialty, icon: 'construct-outline', capitalize: 'words' as const },
              { label: 'Phone', value: phone, setter: setPhone, icon: 'call-outline', capitalize: 'none' as const, keyboard: 'phone-pad' as const },
              { label: 'Working Hours', value: workingHours, setter: setWorkingHours, icon: 'time-outline', capitalize: 'none' as const },
              { label: 'Address', value: address, setter: setAddress, icon: 'location-outline', capitalize: 'words' as const },
            ].map((field) => (
              <View key={field.label} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name={field.icon as any} size={18} color={Colors.dark.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={field.setter}
                    autoCapitalize={field.capitalize}
                    keyboardType={field.keyboard}
                    placeholderTextColor={Colors.dark.textMuted}
                  />
                </View>
              </View>
            ))}

            <View style={styles.editActions}>
              <Pressable style={({ pressed }) => [styles.cancelEditBtn, pressed && { opacity: 0.8 }]} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }, isSaving && { opacity: 0.7 }]}
                onPress={saveProfile}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.card}>
            <Text style={styles.cardTitle}>Personal Info</Text>
            <View style={styles.infoSection}>
              {[
                { icon: 'person-outline', label: 'Full Name', value: user?.fullName },
                { icon: 'at-outline', label: 'Username', value: `@${user?.username}` },
                { icon: 'mail-outline', label: 'Email', value: user?.email },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon as any} size={18} color={Colors.dark.textMuted} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(250)} style={styles.card}>
            <Text style={styles.cardTitle}>Shop Info</Text>
            <View style={styles.infoSection}>
              {[
                { icon: 'storefront-outline', label: 'Shop Name', value: mechanic?.shopName },
                { icon: 'construct-outline', label: 'Specialty', value: mechanic?.specialty },
                { icon: 'call-outline', label: 'Phone', value: mechanic?.phone },
                { icon: 'time-outline', label: 'Working Hours', value: mechanic?.workingHours },
                { icon: 'location-outline', label: 'Address', value: mechanic?.address },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Ionicons name={row.icon as any} size={18} color={Colors.dark.textMuted} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value || '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </>
      )}

      <Animated.View entering={FadeInDown.duration(500).delay(350)}>
        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dark.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text, marginBottom: 24 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(245,158,11,0.3)' },
  avatarText: { fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.dark.accent },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  shopNameLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  roleText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.accent },
  editIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center' },
  ratingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  ratingBannerText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.dark.accent },
  ratingBannerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  card: { backgroundColor: Colors.dark.surface, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.border },
  cardTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  infoSection: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  infoValue: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.text, marginTop: 2 },
  editForm: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.inputBorder },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, height: 48, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelEditBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  cancelEditText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  saveBtn: { flex: 1, backgroundColor: Colors.dark.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#000' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.error },
});
