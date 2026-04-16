import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/query-client';

interface Job {
  id: string;
  status: string;
  customerLatitude: string;
  customerLongitude: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function MechanicJobsScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const completed = jobs.filter((j) => j.status === 'completed').length;
  const earnings = completed * 45;

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    if (!token) return;
    try {
      const res = await apiRequest('GET', '/api/requests/mechanic/history', undefined, token);
      const data = await res.json();
      setJobs(
        (data.history || []).sort(
          (a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch {}
    finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function renderHeader() {
    return (
      <>
        <Text style={styles.title}>Job History</Text>
        <View style={styles.earningsCard}>
          <View style={styles.earningsItem}>
            <MaterialCommunityIcons name="cash" size={24} color={Colors.dark.success} />
            <Text style={styles.earningsValue}>${earnings}</Text>
            <Text style={styles.earningsLabel}>Est. Earnings</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Ionicons name="briefcase" size={24} color={Colors.dark.accent} />
            <Text style={styles.earningsValue}>{completed}</Text>
            <Text style={styles.earningsLabel}>Completed</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Ionicons name="star" size={24} color={Colors.dark.accentLight} />
            <Text style={styles.earningsValue}>{user?.mechanic?.rating || '5.0'}</Text>
            <Text style={styles.earningsLabel}>Rating</Text>
          </View>
        </View>
      </>
    );
  }

  function renderJob({ item, index }: { item: Job; index: number }) {
    const color = STATUS_COLORS[item.status] || Colors.dark.textMuted;
    const label = STATUS_LABELS[item.status] || item.status;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
        <View style={styles.jobCard}>
          <View style={styles.jobTop}>
            <View style={[styles.jobIcon, { backgroundColor: `${color}18` }]}>
              <MaterialCommunityIcons
                name={item.status === 'completed' ? 'check-circle' : item.status === 'cancelled' ? 'close-circle' : 'car-wrench'}
                size={22}
                color={color}
              />
            </View>
            <View style={styles.jobMain}>
              <Text style={styles.jobTitle}>Job #{item.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.jobDate}>{formatDate(item.createdAt)} · {formatTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.jobStatusPill, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.jobStatusText, { color }]}>{label}</Text>
            </View>
          </View>

          <View style={styles.jobFooter}>
            <View style={styles.jobDetailRow}>
              <Ionicons name="location-outline" size={13} color={Colors.dark.textMuted} />
              <Text style={styles.jobDetailText}>
                {parseFloat(item.customerLatitude).toFixed(3)}, {parseFloat(item.customerLongitude).toFixed(3)}
              </Text>
            </View>
            {item.status === 'completed' && (
              <View style={styles.earningsPill}>
                <Text style={styles.earningsPillText}>+$45</Text>
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
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.dark.accent} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={56} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>No Jobs Yet</Text>
              <Text style={styles.emptyText}>Your completed jobs will appear here.</Text>
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
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.dark.text, marginBottom: 16 },
  earningsCard: {
    flexDirection: 'row', backgroundColor: Colors.dark.surface, borderRadius: 18,
    padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  earningsItem: { flex: 1, alignItems: 'center', gap: 4 },
  earningsValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
  earningsLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  earningsDivider: { width: 1, height: 50, backgroundColor: Colors.dark.border },
  jobCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.dark.border },
  jobTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  jobMain: { flex: 1 },
  jobTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  jobDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted, marginTop: 2 },
  jobStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  jobStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  jobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  jobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobDetailText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.dark.textMuted },
  earningsPill: { backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  earningsPillText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.dark.success },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.dark.text },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
});
