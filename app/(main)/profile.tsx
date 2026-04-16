import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  function startEdit() {
    setEditName(user?.fullName || '');
    setEditPhone(user?.phone || '');
    setEditUsername(user?.username || '');
    setIsEditing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function saveEdit() {
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
        username: editUsername.trim(),
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/(auth)/login');
  }

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.headerRow}>
          <Text style={styles.pageTitle}>Profile</Text>
          {!isEditing ? (
            <Pressable onPress={startEdit} style={styles.editIconBtn}>
              <Ionicons name="create-outline" size={22} color={Colors.dark.accent} />
            </Pressable>
          ) : (
            <View style={styles.editActions}>
              <Pressable onPress={cancelEdit} style={styles.cancelIconBtn}>
                <Ionicons name="close" size={22} color={Colors.dark.textMuted} />
              </Pressable>
              <Pressable onPress={saveEdit} disabled={isSaving} style={styles.saveIconBtn}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.dark.accent} />
                ) : (
                  <Ionicons name="checkmark" size={22} color={Colors.dark.accent} />
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Ionicons name="person-outline" size={18} color={Colors.dark.accent} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.dark.textMuted}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{user.fullName}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Ionicons name="at-outline" size={18} color={Colors.dark.accent} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Username</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Your username"
                    placeholderTextColor={Colors.dark.textMuted}
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.fieldValue}>@{user.username}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Ionicons name="mail-outline" size={18} color={Colors.dark.accent} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Ionicons name="call-outline" size={18} color={Colors.dark.accent} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Phone</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Add phone number"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.fieldValue}>{user.phone || 'Not set'}</Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
              onPress={handleLogout}
            >
              <View style={[styles.fieldIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="log-out-outline" size={18} color={Colors.dark.error} />
              </View>
              <Text style={[styles.menuText, { color: Colors.dark.error }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
      {Platform.OS === 'web' && <View style={{ height: 34 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
  },
  editIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
  },
  cancelIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.accent,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContent: {
    flex: 1,
    marginLeft: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.text,
    marginTop: 2,
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.text,
    marginTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.accent,
    paddingBottom: 4,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 66,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 14,
  },
});
