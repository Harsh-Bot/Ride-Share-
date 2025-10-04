import { ScrollView, Text, StyleSheet } from 'react-native';
import RideCard from '../components/RideCard';

const ScheduledRidesScreen = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Scheduled Rides</Text>
    <Text style={styles.body}>
      TODO: Provide filtering, booking, and management for future rides and schedule-based coordination.
    </Text>
    <RideCard title="Morning commute" subtitle="Home → Burnaby" meta="Departs: TBD" />
  </ScrollView>
);

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
