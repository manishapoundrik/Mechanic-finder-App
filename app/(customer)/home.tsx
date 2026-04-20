import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export interface MechanicItem {
  id: string;
  placeId: string | null;
  shopName: string;
  specialty: string;
  rating: string;
  totalJobs: number;
  distance: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  status: string;
  workingHours: string;
  photoReference: string | null;
  source?: string;
}

export default function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [search, setSearch] = useState('');
  const [mechanics, setMechanics] = useState<MechanicItem[]>([]);
  const [filteredMechanics, setFilteredMechanics] = useState<MechanicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'requesting'>('loading');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    requestLocation();
    checkActiveRequest();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('no_mechanics_available', () => {
      setActiveRequestId(null);
      Alert.alert('No Mechanics Available', 'No mechanics are available near you right now. Try again later.');
    });

    socket.on('request_timeout', () => {
      setActiveRequestId(null);
      Alert.alert('Request Timed Out', 'No mechanic accepted your request. Please try again.');
    });

    socket.on('request_accepted', () => {
      router.push('/(customer)/request');
    });

    return () => {
      socket.off('no_mechanics_available');
      socket.off('request_timeout');
      socket.off('request_accepted');
    };
  }, [socket]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredMechanics(mechanics);
    } else {
      const q = search.toLowerCase();
      setFilteredMechanics(
        mechanics.filter(
          m =>
            m.shopName.toLowerCase().includes(q) ||
            m.specialty.toLowerCase().includes(q) ||
            m.address.toLowerCase().includes(q)
        )
      );
    }
  }, [search, mechanics]);

  async function checkActiveRequest() {
    if (!token) return;
    try {
      const res = await apiRequest('GET', '/api/requests/active', undefined, token);
      const data = await res.json();
      if (data.request && data.request.status !== 'completed' && data.request.status !== 'cancelled') {
        setActiveRequestId(data.request.id);
      }
    } catch {}
  }

  async function requestLocation() {
    setLocationStatus('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setIsLoading(false);
        return;
      }
      setLocationStatus('granted');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      await fetchMechanics(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setLocationStatus('denied');
      setIsLoading(false);
    }
  }

  async function fetchMechanics(lat: number, lng: number) {
    try {
      const res = await apiRequest('GET', `/api/mechanics/nearby?latitude=${lat}&longitude=${lng}`, undefined, token || undefined);
      const data = await res.json();
      setMechanics(data.mechanics || []);
    } catch (e) {
      console.error('Failed to fetch mechanics', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const onRefresh = useCallback(async () => {
    if (!userLocation) return;
    setIsRefreshing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchMechanics(userLocation.lat, userLocation.lng);
  }, [userLocation, token]);

  function handleOpenShop(item: MechanicItem) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(customer)/shop/[id]',
      params: {
        id: item.id,
        placeId: item.placeId || '',
        name: item.shopName,
        rating: item.rating,
        address: item.address,
        distance: item.distance,
        phone: item.phone || '',
        lat: String(item.latitude),
        lng: String(item.longitude),
        status: item.status,
        specialty: item.specialty,
        workingHours: item.workingHours,
        photoRef: item.photoReference || '',
        source: item.source || 'seeded',
        userLat: String(userLocation?.lat || 0),
        userLng: String(userLocation?.lng || 0),
      },
    });
  }

  function renderHeader() {
    return (
      <View style={[styles.headerSection, { paddingTop: insets.top + webTopInset + 16 }]}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.greeting}>Mechanic Finder</Text>
          <Text style={styles.subGreeting}>
            {locationStatus === 'granted' ? 'Tap a shop to get started' : 'Enable location to find help'}
          </Text>
        </Animated.View>

        {activeRequestId && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Pressable style={styles.activeRequestBanner} onPress={() => router.push('/(customer)/request')}>
              <View style={styles.activeRequestDot} />
              <Text style={styles.activeRequestText}>Active request in progress</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.dark.accent} />
            </Pressable>
          </Animated.View>
        )}

        {/* <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.searchContainer}> */}
         <View style={styles.searchContainer}>
           <View style={styles.searchWrapper}>
           <Ionicons name="search" size={20} color={Colors.dark.textMuted} style={styles.searchIcon} />

    <TextInput
      style={styles.searchInput}
      placeholder="Search mechanics, services..."
      placeholderTextColor={Colors.dark.textMuted}
      value={search}
      onChangeText={setSearch}
    />

    {search !== '' && (
      <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
        <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
      </Pressable>
    )}
  </View>
          </View>
          <TouchableOpacity
  style={{
    backgroundColor: "#f59e0b",
    padding: 12,
    borderRadius: 10,
    margin: 10
  }}
onPress={() => router.push('/(customer)/chat' as any)}
>
  <Text style={{ color: "#fff", textAlign: "center" }}>
    🤖 Ask Mechanic AI
  </Text>
</TouchableOpacity>
        {/* </Animated.View> */}

        {locationStatus === 'denied' && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.permissionCard}>
            <Ionicons name="location-outline" size={28} color={Colors.dark.accent} />
            <Text style={styles.permissionTitle}>Location Access Needed</Text>
            <Text style={styles.permissionText}>Enable location services to find mechanics near you</Text>
            <Pressable style={({ pressed }) => [styles.permissionBtn, pressed && { opacity: 0.85 }]} onPress={requestLocation}>
              <Text style={styles.permissionBtnText}>Enable Location</Text>
            </Pressable>
          </Animated.View>
        )}

        {locationStatus === 'granted' && mechanics.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.resultCount}>
            <Text style={styles.resultText}>
              {filteredMechanics.length} shop{filteredMechanics.length !== 1 ? 's' : ''} nearby
            </Text>
          </Animated.View>
        )}
      </View>
    );
  }

  function renderEmpty() {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <Text style={styles.emptyText}>Finding mechanic shops near you...</Text>
        </View>
      );
    }
    if (locationStatus === 'denied') return null;
    if (filteredMechanics.length === 0 && search) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>Try a different search</Text>
        </View>
      );
    }
    if (mechanics.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="car-wrench" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No Shops Found</Text>
          <Text style={styles.emptyText}>No mechanic shops within 5 km</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMechanics}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MechanicCard item={item} index={index} onPress={() => handleOpenShop(item)} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.accent}
            colors={[Colors.dark.accent]}
          />
        }
      />
    </View>
  );
}

function MechanicCard({ item, index, onPress }: { item: MechanicItem; index: number; onPress: () => void }) {
  const apiBase = getApiUrl().replace(/\/$/, '');
  const photoUri = item.photoReference
    ? `${apiBase}/api/mechanics/photo?ref=${encodeURIComponent(item.photoReference)}&maxwidth=80`
    : null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <Pressable
        style={({ pressed }) => [cardStyles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
        onPress={onPress}
        testID={`mechanic-card-${item.id}`}
      >
        <View style={cardStyles.cardHeader}>
          <View style={cardStyles.iconBadge}>
            <MaterialCommunityIcons name="car-wrench" size={22} color={Colors.dark.accent} />
          </View>
          <View style={cardStyles.headerInfo}>
            <Text style={cardStyles.shopName} numberOfLines={1}>{item.shopName}</Text>
            <Text style={cardStyles.specialty}>{item.specialty}</Text>
          </View>
          <View style={[cardStyles.statusBadge, item.status === 'available' ? cardStyles.openBadge : cardStyles.closedBadge]}>
            <View style={[cardStyles.statusDot, { backgroundColor: item.status === 'available' ? Colors.dark.success : item.status === 'busy' ? Colors.dark.accent : Colors.dark.textMuted }]} />
            <Text style={[cardStyles.statusText, { color: item.status === 'available' ? Colors.dark.success : item.status === 'busy' ? Colors.dark.accent : Colors.dark.textMuted }]}>
              {item.status === 'available' ? 'Open' : item.status === 'busy' ? 'Busy' : 'Closed'}
            </Text>
          </View>
        </View>

        <View style={cardStyles.details}>
          <View style={cardStyles.detailRow}>
            <Ionicons name="star" size={14} color={Colors.dark.accentLight} />
            <Text style={cardStyles.detailText}>{item.rating}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={cardStyles.detailText}>{item.distance} km</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={cardStyles.detailText}>{item.workingHours}</Text>
          </View>
        </View>

        <View style={cardStyles.footer}>
          <View style={cardStyles.addressRow}>
            <Ionicons name="navigate-outline" size={13} color={Colors.dark.textMuted} />
            <Text style={cardStyles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={cardStyles.viewDetail}>
            <Text style={cardStyles.viewDetailText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.dark.accent} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  listContent: { paddingHorizontal: 16 },
  headerSection: { paddingBottom: 8 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  subGreeting: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 4 },
  activeRequestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  activeRequestDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.accent },
  activeRequestText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.accent },
  searchContainer: { marginTop: 16, marginBottom: 8 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: 4,
  },
  searchIcon: { marginLeft: 14 },
  searchInput: { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.dark.text },
  clearBtn: { padding: 12 },
  permissionCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10, marginTop: 16, borderWidth: 1, borderColor: Colors.dark.border,
  },
  permissionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text, marginTop: 4 },
  permissionText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center', lineHeight: 20 },
  permissionBtn: { backgroundColor: Colors.dark.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 6 },
  permissionBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#000' },
  resultCount: { marginTop: 12, marginBottom: 4 },
  resultText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dark.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 12 },
  shopName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  specialty: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  openBadge: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  closedBadge: { backgroundColor: 'rgba(107, 107, 107, 0.1)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  details: { flexDirection: 'row', marginTop: 14, gap: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  addressText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, flex: 1 },
  viewDetail: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accent },
});
