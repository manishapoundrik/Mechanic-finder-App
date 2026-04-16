import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { apiRequest, getApiUrl } from '@/lib/query-client';

type VehicleType = 'car' | 'bike';

export default function ShopDetailScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const params = useLocalSearchParams<{
    id: string;
    placeId: string;
    name: string;
    rating: string;
    address: string;
    distance: string;
    phone: string;
    lat: string;
    lng: string;
    status: string;
    specialty: string;
    workingHours: string;
    photoRef: string;
    source: string;
    userLat: string;
    userLng: string;
  }>();

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const apiBase = getApiUrl().replace(/\/$/, '');

  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [phone, setPhone] = useState(params.phone || '');
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const photoUri = params.photoRef && !imageError
    ? `${apiBase}/api/mechanics/photo?ref=${encodeURIComponent(params.photoRef)}&maxwidth=600`
    : null;

  const isOpen = params.status === 'available' || params.status === 'busy';
  const rating = parseFloat(params.rating || '4.0');
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  useEffect(() => {
    if (params.source === 'google' && params.placeId && !phone) {
      fetchPhoneNumber();
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('request_accepted', () => {
      setIsRequesting(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(customer)/request');
    });

    socket.on('no_mechanics_available', () => {
      setIsRequesting(false);
      Alert.alert('No Mechanics Available', 'No mechanics are available near you right now. Try again later.');
    });

    socket.on('request_timeout', () => {
      setIsRequesting(false);
      Alert.alert('Request Timed Out', 'No mechanic accepted your request. Please try again.');
    });

    return () => {
      socket.off('request_accepted');
      socket.off('no_mechanics_available');
      socket.off('request_timeout');
    };
  }, [socket]);

  async function fetchPhoneNumber() {
    if (!params.placeId || !token) return;
    setIsLoadingPhone(true);
    try {
      const res = await apiRequest('GET', `/api/mechanics/details?placeId=${encodeURIComponent(params.placeId)}`, undefined, token);
      const data = await res.json();
      if (data.phone) setPhone(data.phone);
    } catch {}
    finally {
      setIsLoadingPhone(false);
    }
  }

  async function handleRequestMechanic() {
    if (!user || !token || !socket) return;
    const userLat = parseFloat(params.userLat || '0');
    const userLng = parseFloat(params.userLng || '0');

    if (!userLat || !userLng) {
      Alert.alert('Location Required', 'Your location is needed to request a mechanic.');
      return;
    }

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRequesting(true);

    try {
      const existing = await apiRequest('GET', '/api/requests/active', undefined, token);
      const existingData = await existing.json();
      if (existingData.request && existingData.request.status !== 'completed' && existingData.request.status !== 'cancelled') {
        router.replace('/(customer)/request');
        return;
      }

      const res = await apiRequest('POST', '/api/requests', {
        latitude: userLat,
        longitude: userLng,
        vehicleType,
        shopPlaceId: params.placeId || params.id,
        shopName: params.name,
        description: `${vehicleType === 'bike' ? 'Bike' : 'Car'} repair at ${params.name}`,
      }, token);

      const request = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          router.replace('/(customer)/request');
          return;
        }
        throw new Error(request.message || 'Failed to create request');
      }

      socket.emit('request_mechanic', {
        requestId: request.id,
        customerId: user.id,
        customerLat: userLat,
        customerLng: userLng,
      });
    } catch (e: any) {
      setIsRequesting(false);
      Alert.alert('Error', e.message || 'Could not send request. Please try again.');
    }
  }

  function handleCall() {
    if (!phone) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  }

  function handleDirections() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${params.lat},${params.lng}&destination_place_id=${params.placeId || ''}`;
    Linking.openURL(url);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{params.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.shopPhoto}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="car-wrench" size={52} color={Colors.dark.accent} />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.infoCard}>
          <View style={styles.shopTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{params.name}</Text>
              <Text style={styles.specialty}>{params.specialty || 'Auto Repair'}</Text>
            </View>
            <View style={[styles.statusPill, isOpen ? styles.statusOpen : styles.statusClosed]}>
              <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.dark.success : Colors.dark.textMuted }]} />
              <Text style={[styles.statusText, { color: isOpen ? Colors.dark.success : Colors.dark.textMuted }]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= fullStars ? 'star' : s === fullStars + 1 && hasHalfStar ? 'star-half' : 'star-outline'}
                  size={16}
                  color={Colors.dark.accent}
                />
              ))}
            </View>
            <Text style={styles.ratingValue}>{params.rating}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color={Colors.dark.accent} />
              <Text style={styles.detailText}>{params.address}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="navigate-outline" size={18} color={Colors.dark.textMuted} />
              <Text style={styles.detailText}>{params.distance} km away</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={18} color={Colors.dark.textMuted} />
              <Text style={styles.detailText}>{params.workingHours}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={18} color={Colors.dark.textMuted} />
              {isLoadingPhone ? (
                <ActivityIndicator size="small" color={Colors.dark.accent} style={{ marginLeft: 8 }} />
              ) : (
                <Text style={[styles.detailText, phone && styles.phoneText]}>{phone || 'Phone unavailable'}</Text>
              )}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.actionBtns}>
          {phone ? (
            <Pressable style={({ pressed }) => [styles.actionBtn, styles.callBtn, pressed && { opacity: 0.8 }]} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Colors.dark.success} />
              <Text style={[styles.actionBtnText, { color: Colors.dark.success }]}>Call</Text>
            </Pressable>
          ) : null}
          <Pressable style={({ pressed }) => [styles.actionBtn, styles.dirBtn, pressed && { opacity: 0.8 }]} onPress={handleDirections}>
            <Ionicons name="navigate" size={20} color={Colors.dark.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.dark.accent }]}>Directions</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.vehicleSection}>
          <Text style={styles.sectionLabel}>Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {(['car', 'bike'] as VehicleType[]).map((v) => (
              <Pressable
                key={v}
                style={({ pressed }) => [
                  styles.vehicleOption,
                  vehicleType === v && styles.vehicleSelected,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setVehicleType(v);
                }}
              >
                <MaterialCommunityIcons
                  name={v === 'car' ? 'car' : 'motorbike'}
                  size={28}
                  color={vehicleType === v ? '#000' : Colors.dark.textSecondary}
                />
                <Text style={[styles.vehicleLabel, vehicleType === v && styles.vehicleLabelSelected]}>
                  {v === 'car' ? 'Car' : 'Bike'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.duration(400).delay(400)}
        style={[styles.requestFooter, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16 }]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.requestBtn,
            pressed && { opacity: 0.9 },
            isRequesting && styles.requestBtnDisabled,
          ]}
          onPress={handleRequestMechanic}
          disabled={isRequesting}
          testID="request-mechanic-btn"
        >
          {isRequesting ? (
            <View style={styles.requestBtnInner}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.requestBtnText}>Finding mechanic...</Text>
            </View>
          ) : (
            <View style={styles.requestBtnInner}>
              <MaterialCommunityIcons name="car-wrench" size={20} color="#000" />
              <Text style={styles.requestBtnText}>Request Mechanic</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  shopPhoto: { width: '100%', height: 200, borderRadius: 16, backgroundColor: Colors.dark.surface },
  photoPlaceholder: {
    width: '100%', height: 180, borderRadius: 16,
    backgroundColor: Colors.dark.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20, padding: 20,
    marginTop: 16, borderWidth: 1, borderColor: Colors.dark.border,
  },
  shopTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  shopName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  specialty: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusOpen: { backgroundColor: 'rgba(34,197,94,0.1)' },
  statusClosed: { backgroundColor: 'rgba(107,107,107,0.1)' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accent },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: 16 },
  detailsList: { gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, lineHeight: 20 },
  phoneText: { color: Colors.dark.text, fontFamily: 'Inter_500Medium' },
  actionBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  callBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  dirBtn: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  vehicleSection: { marginTop: 20 },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, marginBottom: 12 },
  vehicleRow: { flexDirection: 'row', gap: 12 },
  vehicleOption: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 20, borderRadius: 16, backgroundColor: Colors.dark.surface,
    borderWidth: 2, borderColor: Colors.dark.border,
  },
  vehicleSelected: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  vehicleLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textSecondary },
  vehicleLabelSelected: { color: '#000' },
  requestFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  requestBtn: {
    backgroundColor: Colors.dark.accent, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
  },
  requestBtnDisabled: { opacity: 0.7 },
  requestBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
});
