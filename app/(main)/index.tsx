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
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/query-client';

interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  rating: string;
  reviewCount: number;
  distance: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  isOpen: boolean;
  openHours: string;
  placeId?: string;
  businessStatus?: string;
}

function MechanicCard({ item, index }: { item: Mechanic; index: number }) {
  function handleCall() {
    if (!item.phone) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(`tel:${item.phone}`);
  }

  function handleDirections() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const encodedName = encodeURIComponent(item.name);
    const placeQuery = item.placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${item.placeId}`
      : `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
    const url = Platform.select({
      ios: placeQuery,
      android: placeQuery,
      default: placeQuery,
    });
    if (url) Linking.openURL(url);
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={cardStyles.iconBadge}>
            <MaterialCommunityIcons name="car-wrench" size={22} color={Colors.dark.accent} />
          </View>
          <View style={cardStyles.headerInfo}>
            <Text style={cardStyles.shopName} numberOfLines={1}>{item.name}</Text>
            <Text style={cardStyles.specialty}>{item.specialty}</Text>
          </View>
          <View style={[cardStyles.statusBadge, item.isOpen ? cardStyles.openBadge : cardStyles.closedBadge]}>
            <View style={[cardStyles.statusDot, { backgroundColor: item.isOpen ? Colors.dark.success : Colors.dark.error }]} />
            <Text style={[cardStyles.statusText, { color: item.isOpen ? Colors.dark.success : Colors.dark.error }]}>
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        <View style={cardStyles.details}>
          <View style={cardStyles.detailRow}>
            <Ionicons name="star" size={14} color={Colors.dark.accentLight} />
            <Text style={cardStyles.detailText}>{item.rating} ({item.reviewCount})</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={cardStyles.detailText}>{item.distance} km away</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={cardStyles.detailText}>{item.openHours}</Text>
          </View>
        </View>

        <View style={cardStyles.addressRow}>
          <Ionicons name="navigate-outline" size={14} color={Colors.dark.textMuted} />
          <Text style={cardStyles.addressText} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={cardStyles.actions}>
          {item.phone ? (
            <Pressable
              style={({ pressed }) => [cardStyles.actionBtn, cardStyles.callBtn, pressed && { opacity: 0.8 }]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={16} color={Colors.dark.success} />
              <Text style={[cardStyles.actionText, { color: Colors.dark.success }]}>Call</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [cardStyles.actionBtn, cardStyles.callBtn, pressed && { opacity: 0.8 }]}
              onPress={handleDirections}
            >
              <Ionicons name="map-outline" size={16} color={Colors.dark.success} />
              <Text style={[cardStyles.actionText, { color: Colors.dark.success }]}>View on Map</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [cardStyles.actionBtn, cardStyles.directionsBtn, pressed && { opacity: 0.8 }]}
            onPress={handleDirections}
          >
            <Ionicons name="navigate" size={16} color={Colors.dark.accent} />
            <Text style={[cardStyles.actionText, { color: Colors.dark.accent }]}>Directions</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [filteredMechanics, setFilteredMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'requesting'>('loading');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredMechanics(mechanics);
    } else {
      const q = search.toLowerCase();
      setFilteredMechanics(
        mechanics.filter(
          m => m.name.toLowerCase().includes(q) ||
               m.specialty.toLowerCase().includes(q) ||
               m.address.toLowerCase().includes(q)
        )
      );
    }
  }, [search, mechanics]);

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
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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

  function renderHeader() {
    return (
      <View style={[styles.headerSection, { paddingTop: insets.top + webTopInset + 16 }]}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.greeting}>Mechanic Finder</Text>
          <Text style={styles.subGreeting}>
            {locationStatus === 'granted' ? 'Showing mechanics near you' : 'Enable location to find shops'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color={Colors.dark.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mechanics, services..."
              placeholderTextColor={Colors.dark.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {locationStatus === 'denied' && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.permissionCard}>
            <Ionicons name="location-outline" size={28} color={Colors.dark.accent} />
            <Text style={styles.permissionTitle}>Location Access Needed</Text>
            <Text style={styles.permissionText}>
              Enable location services to find mechanics near your current location
            </Text>
            <Pressable
              style={({ pressed }) => [styles.permissionBtn, pressed && { opacity: 0.85 }]}
              onPress={requestLocation}
            >
              <Text style={styles.permissionBtnText}>Enable Location</Text>
            </Pressable>
          </Animated.View>
        )}

        {locationStatus === 'granted' && mechanics.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.resultCount}>
            <Text style={styles.resultText}>
              {filteredMechanics.length} mechanic{filteredMechanics.length !== 1 ? 's' : ''} found
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
          <Text style={styles.emptyText}>Finding mechanics near you...</Text>
        </View>
      );
    }
    if (locationStatus === 'denied') return null;
    if (filteredMechanics.length === 0 && search) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>Try a different search term</Text>
        </View>
      );
    }
    if (mechanics.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="car-wrench" size={48} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No Mechanics Found</Text>
          <Text style={styles.emptyText}>Pull down to refresh</Text>
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
        renderItem={({ item, index }) => <MechanicCard item={item} index={index} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  headerSection: {
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.dark.text,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    marginTop: 20,
    marginBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 4,
  },
  searchIcon: {
    marginLeft: 14,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.text,
  },
  clearBtn: {
    padding: 12,
  },
  permissionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  permissionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dark.text,
    marginTop: 4,
  },
  permissionText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 6,
  },
  permissionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  resultCount: {
    marginTop: 12,
  },
  resultText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dark.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shopName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dark.text,
  },
  specialty: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  closedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  details: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.dark.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  callBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  directionsBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
