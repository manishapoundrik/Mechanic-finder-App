import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface Props {
  customerLat: number;
  customerLng: number;
  mechanicLat?: number | null;
  mechanicLng?: number | null;
  mechanicName?: string;
  eta?: number | null;
}

export default function TrackingMap({ mechanicLat, mechanicLng, mechanicName, eta }: Props) {
  const hasLocation = mechanicLat != null && mechanicLng != null;

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={40} color={Colors.dark.textMuted} />
        <Text style={styles.placeholderText}>
          {hasLocation ? `${mechanicName || 'Mechanic'} is on the way` : 'Waiting for mechanic location...'}
        </Text>
        {eta != null && (
          <View style={styles.etaBadge}>
            <Ionicons name="time-outline" size={15} color={Colors.dark.accent} />
            <Text style={styles.etaText}>{eta} min away</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 200 },
  placeholder: {
    flex: 1, backgroundColor: Colors.dark.surface, justifyContent: 'center', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderColor: Colors.dark.border,
  },
  placeholderText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.dark.textSecondary },
  etaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  etaText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.dark.accent },
});
