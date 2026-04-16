import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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

export default function TrackingMap({
  customerLat,
  customerLng,
  mechanicLat,
  mechanicLng,
  mechanicName,
  eta,
}: Props) {
  const region = {
    latitude: customerLat,
    longitude: customerLng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region} userInterfaceStyle="dark">
        <Marker
          coordinate={{ latitude: customerLat, longitude: customerLng }}
          title="Your Location"
          pinColor={Colors.dark.accent}
        />
        {mechanicLat != null && mechanicLng != null && (
          <Marker
            coordinate={{ latitude: mechanicLat, longitude: mechanicLng }}
            title={mechanicName || 'Mechanic'}
            pinColor="#3B82F6"
          />
        )}
      </MapView>
      {eta != null && (
        <View style={styles.etaOverlay}>
          <Ionicons name="time-outline" size={15} color={Colors.dark.accent} />
          <Text style={styles.etaText}>{eta} min away</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 260, position: 'relative' },
  map: { flex: 1 },
  etaOverlay: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  etaText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.dark.text },
});
