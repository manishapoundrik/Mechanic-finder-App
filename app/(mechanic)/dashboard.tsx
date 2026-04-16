import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
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
import * as Location from 'expo-location';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { apiRequest } from '@/lib/query-client';

type MechanicStatus = 'available' | 'busy' | 'offline';

interface IncomingRequest {
  requestId: string;
  customerId: string;
  customerLat: number;
  customerLng: number;
  distance: string;
}

const webTopInset = Platform.OS === 'web' ? 67 : 0;

const STATUS_CONFIG: Record<MechanicStatus, { label: string; color: string; icon: string }> = {
  available: { label: 'Available', color: Colors.dark.success, icon: 'checkmark-circle' },
  busy: { label: 'Busy', color: Colors.dark.accent, icon: 'time' },
  offline: { label: 'Offline', color: Colors.dark.textMuted, icon: 'moon' },
};

export default function MechanicDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token, refreshProfile } = useAuth();
  const { socket, isConnected } = useSocket();

  const mechanic = user?.mechanic;
  const [status, setStatus] = useState<MechanicStatus>((mechanic?.status as MechanicStatus) || 'offline');
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    fetchActiveRequest();
    startLocationTracking();
    return () => {
      locationWatchRef.current?.remove();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_request', (req: IncomingRequest) => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setIncomingRequest(req);
      setCountdown(30);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setIncomingRequest(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('request_confirmed', (data: any) => {
      setIncomingRequest(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      fetchActiveRequest();
    });

    socket.on('request_already_taken', () => {
      setIncomingRequest(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      Alert.alert('Request Taken', 'Another mechanic already accepted this request.');
    });

    socket.on('request_cancelled_by_customer', () => {
      setActiveRequest(null);
      Alert.alert('Request Cancelled', 'The customer cancelled this request.');
      updateStatus('available');
    });

    return () => {
      socket.off('new_request');
      socket.off('request_confirmed');
      socket.off('request_already_taken');
      socket.off('request_cancelled_by_customer');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !activeRequest || status !== 'busy') return;

    const interval = setInterval(() => {
      const loc = locationRef.current;
      if (loc && mechanic?.id) {
        socket.emit('update_mechanic_location', {
          requestId: activeRequest.id,
          mechanicId: mechanic.id,
          lat: loc.lat,
          lng: loc.lng,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [socket, activeRequest, mechanic?.id, status]);

  async function startLocationTracking() {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      locationRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };

      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          locationRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      );
    } catch {}
  }

  async function fetchActiveRequest() {
    if (!token) return;
    try {
      const res = await apiRequest('GET', '/api/requests/mechanic/active', undefined, token);
      const data = await res.json();
      if (data.request) {
        setActiveRequest(data.request);
        setStatus('busy');
      }
    } catch {}
  }

  async function updateStatus(newStatus: MechanicStatus) {
    if (!token || !mechanic?.id) return;
    setIsUpdatingStatus(true);
    try {
      const body: any = { status: newStatus };
      if (locationRef.current) {
        body.latitude = locationRef.current.lat;
        body.longitude = locationRef.current.lng;
      }
      await apiRequest('PUT', '/api/mechanics/status', body, token);
      setStatus(newStatus);
      await refreshProfile();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert('Error', 'Could not update status. Try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handleAccept() {
    if (!incomingRequest || !socket || !mechanic?.id) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (countdownRef.current) clearInterval(countdownRef.current);

    socket.emit('accept_request', {
      requestId: incomingRequest.requestId,
      mechanicId: mechanic.id,
      mechanicLat: locationRef.current?.lat ?? 0,
      mechanicLng: locationRef.current?.lng ?? 0,
    });
    setIncomingRequest(null);
  }

  function handleReject() {
    if (!incomingRequest || !socket || !mechanic?.id) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (countdownRef.current) clearInterval(countdownRef.current);
    socket.emit('reject_request', { requestId: incomingRequest.requestId, mechanicId: mechanic.id });
    setIncomingRequest(null);
  }

  async function handleCompleteJob() {
    if (!activeRequest || !socket || !mechanic?.id || !token) return;
    Alert.alert('Complete Job', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => {
          socket.emit('complete_request', { requestId: activeRequest.id, mechanicId: mechanic.id });
          setActiveRequest(null);
          updateStatus('available');
        },
      },
    ]);
  }

  const cfg = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hey, {user?.fullName?.split(' ')[0] || 'Mechanic'}</Text>
              <Text style={styles.shopName}>{mechanic?.shopName || 'Your Shop'}</Text>
            </View>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? Colors.dark.success : Colors.dark.error }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.statusCard}>
          <Text style={styles.cardTitle}>Your Status</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusCircle, { backgroundColor: `${cfg.color}20`, borderColor: cfg.color }]}>
              <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.currentStatus, { color: cfg.color }]}>{cfg.label}</Text>
              <Text style={styles.statusHint}>
                {status === 'available' ? 'You can receive new requests' :
                 status === 'busy' ? 'Currently on a job' : 'Not receiving requests'}
              </Text>
            </View>
          </View>

          {isUpdatingStatus ? (
            <ActivityIndicator color={Colors.dark.accent} style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.statusButtons}>
              {(['available', 'busy', 'offline'] as MechanicStatus[]).map((s) => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.statusBtn,
                    status === s && styles.statusBtnActive,
                    status === s && { borderColor: STATUS_CONFIG[s].color },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => updateStatus(s)}
                >
                  <Text style={[styles.statusBtnText, status === s && { color: STATUS_CONFIG[s].color }]}>
                    {STATUS_CONFIG[s].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>

        {activeRequest && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.activeJobCard}>
            <View style={styles.activeJobHeader}>
              <View style={styles.activeJobDot} />
              <Text style={styles.activeJobTitle}>Active Job</Text>
            </View>
            <View style={styles.activeJobDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color={Colors.dark.textMuted} />
                <Text style={styles.detailText}>
                  Customer at {parseFloat(activeRequest.customerLatitude).toFixed(4)},
                  {' '}{parseFloat(activeRequest.customerLongitude).toFixed(4)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time" size={16} color={Colors.dark.textMuted} />
                <Text style={styles.detailText}>
                  Started {new Date(activeRequest.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.completeBtn, pressed && { opacity: 0.85 }]}
              onPress={handleCompleteJob}
            >
              <Ionicons name="checkmark-circle" size={18} color="#000" />
              <Text style={styles.completeBtnText}>Mark as Completed</Text>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.statsGrid}>
          {[
            { label: 'Rating', value: mechanic?.rating || '5.0', icon: 'star', color: Colors.dark.accent },
            { label: 'Total Jobs', value: String(mechanic?.totalJobs || 0), icon: 'briefcase', color: Colors.dark.success },
            { label: 'Specialty', value: mechanic?.specialty || '—', icon: 'construct', color: '#60A5FA' },
            { label: 'Hours', value: mechanic?.workingHours?.split(' ')[0] || '8:00', icon: 'time', color: Colors.dark.textSecondary },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {incomingRequest && (
        <Animated.View entering={SlideInDown.duration(400)} exiting={SlideOutDown.duration(300)} style={styles.requestSheet}>
          <View style={styles.requestSheetHandle} />
          <View style={styles.requestSheetHeader}>
            <View style={styles.requestPulse}>
              <MaterialCommunityIcons name="car-emergency" size={32} color={Colors.dark.accent} />
            </View>
            <View style={styles.requestSheetInfo}>
              <Text style={styles.requestSheetTitle}>New Service Request</Text>
              <Text style={styles.requestSheetDist}>{incomingRequest.distance} km away</Text>
            </View>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          </View>

          <View style={styles.requestSheetBtns}>
            <Pressable style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]} onPress={handleReject}>
              <Ionicons name="close" size={22} color={Colors.dark.error} />
              <Text style={styles.rejectText}>Decline</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.8 }]} onPress={handleAccept}>
              <Ionicons name="checkmark" size={22} color="#000" />
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {Platform.OS === 'web' && <View style={{ height: 34 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { paddingHorizontal: 20, paddingBottom: 160, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  greeting: { fontSize: 26, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  shopName: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  connectionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  statusCard: { backgroundColor: Colors.dark.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.dark.border },
  cardTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  statusCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  statusText: { flex: 1 },
  currentStatus: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statusHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginTop: 2 },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  statusBtnActive: { backgroundColor: 'rgba(245,158,11,0.08)' },
  statusBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.dark.textMuted },
  activeJobCard: { backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  activeJobHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  activeJobDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.dark.accent },
  activeJobTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.dark.accent },
  activeJobDetails: { gap: 8, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.accent, borderRadius: 12, paddingVertical: 13 },
  completeBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#000' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.dark.border },
  statValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.dark.text, textAlign: 'center' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  requestSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  requestSheetHandle: { width: 40, height: 4, backgroundColor: Colors.dark.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  requestSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  requestPulse: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' },
  requestSheetInfo: { flex: 1 },
  requestSheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  requestSheetDist: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, marginTop: 2 },
  countdownCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Colors.dark.accent, justifyContent: 'center', alignItems: 'center' },
  countdownText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.accent },
  requestSheetBtns: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  rejectText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.dark.error },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.dark.accent },
  acceptText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#000' },
});
