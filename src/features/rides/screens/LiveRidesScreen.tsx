import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import RideCard from '../components/RideCard';
import type { MainTabParamList } from '../../../navigation/types';

type LiveRideRoute = RouteProp<MainTabParamList, 'LiveRides'>;

const LiveRidesScreen = () => {
  const route = useRoute<LiveRideRoute>();
  const role = route.params?.role ?? 'rider';
  const origin = route.params?.origin ?? 'Unknown origin';
  const destination = route.params?.destination?.label ?? 'Destination';

  const roleLabel = role === 'driver' ? 'Driver' : 'Rider';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Live Ride Exchange</Text>
      <Text style={styles.body}>{`${roleLabel} view • ${origin} → ${destination}`}</Text>
      <Text style={styles.body}>
        TODO: List active drivers, nearby matches, and allow real-time ride requests.
      </Text>
      <RideCard title="Sample ride" subtitle="Driver name • Burnaby → Surrey" meta="Seats left: TBD" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    marginBottom: 16
  }
});

export default LiveRidesScreen;
