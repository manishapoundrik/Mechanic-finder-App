import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      await fetchMechanics(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.log("Location error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanics = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://mechanic-finder-backend.onrender.com/api/mechanics/nearby?latitude=${lat}&longitude=${lng}`
      );

      const data = await res.json();
      setMechanics(data.mechanics || []);
    } catch (error) {
      console.log("Fetch error:", error);
    }
  };

  // 🔄 Loading state
  if (loading || !location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={{ color: "#fff", marginTop: 10 }}>
          Loading map...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* 👤 User Marker */}
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="You"
          pinColor="blue"
        />

        {/* 🔧 Mechanics Markers */}
        {mechanics.map((m) => {
          const lat = m.latitude || m.location?.coordinates?.[1];
          const lng = m.longitude || m.location?.coordinates?.[0];

          if (!lat || !lng) return null;

          return (
            <Marker
              key={m._id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={m.shopName}
              description={m.address}
              pinColor="#f59e0b"
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
});