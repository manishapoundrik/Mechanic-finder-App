import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/query-client';

interface ServiceRecord {
  id: string;
  status: string;
  customerLatitude: string;
  customerLongitude: string;
  mechanicId: string | null;
  description: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: Colors.dark.success,
  cancelled: Colors.dark.error,
  pending: Colors.dark.accent,
  accepted: '#60A5FA',
  in_progress: Colors.dark.accent,
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
};

const webTopInset = Platform.OS === 'web' ? 67 : 0;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await apiRequest('GET', '/api/requests/history', undefined, token || undefined);
      const data = await res.json();
      setHistory((data.history || []).sort((a: ServiceRecord, b: ServiceRecord) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {}
    finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function renderItem({ item, index }: { item: ServiceRecord; index: number }) {
    const color = STATUS_COLORS[item.status] || Colors.dark.textMuted;
    const label = STATUS_LABELS[item.status] || item.status;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBadge, { backgroundColor: `${color}18` }]}>
              <MaterialCommunityIcons
                name={item.status === 'completed' ? 'check-circle' : item.status === 'cancelled' ? 'close-circle' : 'car-wrench'}
                size={22}
                color={color}
              />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>Service Request</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)} · {formatTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.statusText, { color }]}>{label}</Text>
            </View>
          </View>

          {item.description && (
            <View style={styles.descRow}>
              <Ionicons name="document-text-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          <View style={styles.cardBottom}>
            <View style={styles.detailPair}>
              <Ionicons name="location-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.detailText}>
                {parseFloat(item.customerLatitude).toFixed(4)}, {parseFloat(item.customerLongitude).toFixed(4)}
              </Text>
            </View>
            {item.mechanicId && (
              <View style={styles.detailPair}>
                <MaterialCommunityIcons name="account-wrench" size={14} color={Colors.dark.textMuted} />
                <Text style={styles.detailText}>Mechanic assigned</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.title}>Service History</Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.dark.accent} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={56} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptyText}>Your service requests will appear here.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  listContent: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text, marginBottom: 20 },
  card: { backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  cardDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  descText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary, flex: 1 },
  cardBottom: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  detailPair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
});
