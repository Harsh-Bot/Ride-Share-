import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import RideCard from '../components/RideCard';
import type { MainTabParamList } from '../../../navigation/types';

type ScheduledRoute = RouteProp<MainTabParamList, 'ScheduledRides'>;

const ScheduledRidesScreen = () => {
  const route = useRoute<ScheduledRoute>();
  const role = route.params?.role ?? 'rider';
  const origin = route.params?.origin ?? 'Unknown origin';
  const destination = route.params?.destination.label ?? 'Destination';
  const roleLabel = role === 'driver' ? 'Driver' : 'Rider';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scheduled Rides</Text>
      <Text style={styles.body}>{`${roleLabel} view • ${origin} → ${destination}`}</Text>
      <Text style={styles.body}>
        TODO: Provide filtering, booking, and management for future rides and schedule-based coordination.
      </Text>
      <RideCard title="Morning commute" subtitle="Home → Burnaby" meta="Departs: TBD" />
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

export default ScheduledRidesScreen;
