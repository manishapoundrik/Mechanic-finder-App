import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { apiRequest } from '@/lib/query-client';
import TrackingMap from '@/components/TrackingMap';

type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | null;

interface ActiveRequest {
  id: string;
  status: RequestStatus;
  vehicleType: string | null;
  shopName: string | null;
  customerLatitude: string;
  customerLongitude: string;
  mechanicId: string | null;
  mechanicLatitude: string | null;
  mechanicLongitude: string | null;
  createdAt: string;
}

interface MechanicInfo {
  id: string;
  shopName: string;
  phone: string;
  rating: string;
  specialty: string;
}

const webTopInset = Platform.OS === 'web' ? 67 : 0;

export default function RequestScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { socket } = useSocket();

  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [mechanic, setMechanic] = useState<MechanicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [mechanicLive, setMechanicLive] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const customerLat = request ? parseFloat(request.customerLatitude) : 0;
  const customerLng = request ? parseFloat(request.customerLongitude) : 0;

  useEffect(() => {
    fetchActiveRequest();
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('request_accepted', ({ requestId, mechanicLat, mechanicLng }: any) => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMechanicLive({ lat: mechanicLat, lng: mechanicLng });
      fetchActiveRequest();
    });

    socket.on('mechanic_location_update', ({ lat, lng }: { lat: number; lng: number }) => {
      setMechanicLive({ lat, lng });
    });

    socket.on('request_completed', () => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRequest((prev) => prev ? { ...prev, status: 'completed' } : null);
      setShowRating(true);
      stopPolling();
    });

    socket.on('request_cancelled_by_customer', () => {
      setRequest((prev) => prev ? { ...prev, status: 'cancelled' } : null);
      stopPolling();
    });

    return () => {
      socket.off('request_accepted');
      socket.off('mechanic_location_update');
      socket.off('request_completed');
      socket.off('request_cancelled_by_customer');
    };
  }, [socket, user]);

  useEffect(() => {
    if (request?.status === 'accepted' || request?.status === 'in_progress') {
      startPolling(request.id);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [request?.status, request?.id]);

  function startPolling(requestId: string) {
    stopPolling();
    pollRef.current = setInterval(() => pollStatus(requestId), 5000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollStatus(requestId: string) {
    if (!token) return;
    try {
      const res = await apiRequest('GET', `/api/requests/${requestId}/status`, undefined, token);
      const data = await res.json();
      if (data.mechanicLocation) {
        setMechanicLive(data.mechanicLocation);
      }
      if (data.estimatedArrivalMinutes) {
        setEta(data.estimatedArrivalMinutes);
      }
      if (data.status === 'completed') {
        setRequest((prev) => prev ? { ...prev, status: 'completed' } : null);
        setShowRating(true);
        stopPolling();
      }
    } catch {}
  }

  const fetchActiveRequest = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('GET', '/api/requests/active', undefined, token);
      const data = await res.json();
      setRequest(data.request);
      setMechanic(data.mechanic);
      if (data.request?.status === 'completed') setShowRating(true);
      if (data.request?.mechanicLatitude && data.request?.mechanicLongitude) {
        setMechanicLive({
          lat: parseFloat(data.request.mechanicLatitude),
          lng: parseFloat(data.request.mechanicLongitude),
        });
      }
    } catch {}
    finally {
      setIsLoading(false);
    }
  }, [token]);

  async function handleCancel() {
    if (!request || !token || !socket || !user) return;
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(true);
          stopPolling();
          try {
            await apiRequest('DELETE', `/api/requests/${request.id}`, undefined, token);
            socket.emit('cancel_request', { requestId: request.id, customerId: user.id });
            router.replace('/(customer)/home');
          } catch {
            setIsCancelling(false);
          }
        },
      },
    ]);
  }

  async function submitRating(stars: number) {
    if (!request || !token) return;
    setRating(stars);
    try {
      await apiRequest('POST', '/api/requests/rate', { requestId: request.id, rating: stars }, token);
      setRatingSubmitted(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  function handleCallMechanic() {
    if (!mechanic?.phone) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${mechanic.phone}`);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!request || request.status === 'cancelled') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <MaterialCommunityIcons name="car-off" size={64} color={Colors.dark.textMuted} />
        <Text style={styles.noRequestTitle}>No Active Request</Text>
        <Text style={styles.noRequestSub}>You don't have any active service request.</Text>
        <Pressable style={styles.goBackBtn} onPress={() => router.replace('/(customer)/home')}>
          <Text style={styles.goBackText}>Find a Mechanic</Text>
        </Pressable>
      </View>
    );
  }

  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted' || request.status === 'in_progress';
  const isCompleted = request.status === 'completed';

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isPending ? 'Finding Mechanic' : isAccepted ? 'On the Way' : 'Completed'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {isAccepted && customerLat !== 0 && (
        <Animated.View entering={FadeIn.duration(600)}>
          <TrackingMap
            customerLat={customerLat}
            customerLng={customerLng}
            mechanicLat={mechanicLive?.lat}
            mechanicLng={mechanicLive?.lng}
            mechanicName={mechanic?.shopName}
            eta={eta}
          />
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {isPending && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.pendingSection}>
            <Animated.View entering={ZoomIn.duration(600)} style={styles.pulseContainer}>
              <MaterialCommunityIcons name="car-wrench" size={56} color={Colors.dark.accent} />
            </Animated.View>
            <Text style={styles.pendingTitle}>Finding your mechanic...</Text>
            <Text style={styles.pendingSubtitle}>
              {request.shopName
                ? `Contacting ${request.shopName}`
                : 'Notifying nearby mechanics'}
              {'\n'}This may take up to 30 seconds.
            </Text>
            <ActivityIndicator color={Colors.dark.accent} size="small" style={{ marginTop: 8 }} />
            {request.vehicleType && (
              <View style={styles.vehicleBadge}>
                <MaterialCommunityIcons
                  name={request.vehicleType === 'bike' ? 'motorbike' : 'car'}
                  size={16}
                  color={Colors.dark.textSecondary}
                />
                <Text style={styles.vehicleBadgeText}>
                  {request.vehicleType === 'bike' ? 'Bike' : 'Car'} repair
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {isAccepted && mechanic && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.mechanicCard}>
            <View style={styles.mechanicCardHeader}>
              <View style={styles.mechanicIcon}>
                <MaterialCommunityIcons name="car-wrench" size={32} color={Colors.dark.accent} />
              </View>
              <View style={styles.mechanicInfo}>
                <Text style={styles.mechanicName}>{mechanic.shopName}</Text>
                <Text style={styles.mechanicSpecialty}>{mechanic.specialty}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={Colors.dark.accent} />
                  <Text style={styles.ratingText}>{mechanic.rating}</Text>
                </View>
              </View>
              <View style={styles.acceptedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.dark.success} />
                <Text style={styles.acceptedText}>On the way</Text>
              </View>
            </View>

            {(eta || mechanicLive) && (
              <View style={styles.tripInfo}>
                {eta !== null && (
                  <View style={styles.tripRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.dark.textMuted} />
                    <Text style={styles.tripText}>ETA: <Text style={styles.tripValue}>{eta} min</Text></Text>
                  </View>
                )}
                {mechanicLive && (
                  <View style={styles.tripRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.dark.textMuted} />
                    <Text style={styles.tripText}>Mechanic location updating</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.mechanicActions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, styles.callBtn, pressed && { opacity: 0.8 }]}
                onPress={handleCallMechanic}
                disabled={!mechanic.phone}
              >
                <Ionicons name="call" size={20} color={Colors.dark.success} />
                <Text style={[styles.actionBtnText, { color: Colors.dark.success }]}>Call</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {isCompleted && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.completedSection}>
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.dark.success} />
            </View>
            <Text style={styles.completedTitle}>Service Complete!</Text>
            <Text style={styles.completedSub}>
              Your {request.vehicleType === 'bike' ? 'bike' : 'vehicle'} has been serviced by {mechanic?.shopName || request.shopName || 'your mechanic'}.
            </Text>

            {!ratingSubmitted && (
              <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.ratingSection}>
                <Text style={styles.ratingTitle}>Rate your experience</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => submitRating(star)}>
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? Colors.dark.accent : Colors.dark.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {ratingSubmitted && (
              <View style={styles.ratingThanks}>
                <Ionicons name="heart" size={20} color={Colors.dark.accent} />
                <Text style={styles.ratingThanksText}>Thanks for your feedback!</Text>
              </View>
            )}

            <Pressable style={styles.doneBtn} onPress={() => router.replace('/(customer)/home')}>
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.statusTimeline}>
          {[
            { label: 'Request Sent', done: true, icon: 'paper-plane-outline' as const },
            { label: 'Mechanic Found', done: isAccepted || isCompleted, icon: 'person-outline' as const },
            { label: 'On the Way', done: isAccepted || isCompleted, icon: 'car-outline' as const },
            { label: 'Completed', done: isCompleted, icon: 'checkmark-circle-outline' as const },
          ].map((step, i) => (
            <View key={i} style={styles.timelineStep}>
              <View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>
                <Ionicons name={step.icon} size={14} color={step.done ? '#000' : Colors.dark.textMuted} />
              </View>
              <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>{step.label}</Text>
            </View>
          ))}
        </View>

        {isPending && (
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }, isCancelling && { opacity: 0.6 }]}
            onPress={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={Colors.dark.error} size="small" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={Colors.dark.error} />
                <Text style={styles.cancelBtnText}>Cancel Request</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  mapContainer: { height: 260, borderRadius: 0, overflow: 'hidden', position: 'relative' },
  map: { flex: 1 },
  etaOverlay: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  etaText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  pendingSection: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  pulseContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' },
  pendingTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  pendingSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center', lineHeight: 22 },
  vehicleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dark.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginTop: 4, borderWidth: 1, borderColor: Colors.dark.border,
  },
  vehicleBadgeText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.dark.textSecondary },
  mechanicCard: { backgroundColor: Colors.dark.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.dark.border },
  mechanicCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  mechanicIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center' },
  mechanicInfo: { flex: 1 },
  mechanicName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  mechanicSpecialty: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.dark.accent },
  acceptedBadge: { alignItems: 'center', gap: 4 },
  acceptedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.dark.success },
  tripInfo: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.dark.border, gap: 8 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  tripValue: { fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  mechanicActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  callBtn: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  actionBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  completedSection: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  completedIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center' },
  completedTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  completedSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center' },
  ratingSection: { alignItems: 'center', gap: 10, marginTop: 8 },
  ratingTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  starsRow: { flexDirection: 'row', gap: 8 },
  ratingThanks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingThanksText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.dark.accent },
  doneBtn: { backgroundColor: Colors.dark.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  doneBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
  statusTimeline: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  timelineStep: { alignItems: 'center', gap: 6, flex: 1 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surface, borderWidth: 2, borderColor: Colors.dark.border, justifyContent: 'center', alignItems: 'center' },
  timelineDotDone: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  timelineLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: Colors.dark.textMuted, textAlign: 'center' },
  timelineLabelDone: { color: Colors.dark.accent },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.error },
  noRequestTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  noRequestSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, textAlign: 'center' },
  goBackBtn: { backgroundColor: Colors.dark.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  goBackText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#000' },
});
