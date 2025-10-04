import { View, Text, StyleSheet } from 'react-native';
import ParkingEligibilityBadge from '../features/incentives/components/ParkingEligibilityBadge';
import DriverRatingSummary from '../features/ratings/components/DriverRatingSummary';

const DashboardScreen = () => (
  <View style={styles.container}>
    <Text style={styles.heading}>Dashboard</Text>
    <Text style={styles.body}>TODO: Surface personalized ride suggestions, incentives, and alerts.</Text>
    <View style={styles.section}>
      <ParkingEligibilityBadge />
    </View>
    <View style={styles.section}>
      <DriverRatingSummary averageRating={4.6} ratingCount={35} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start'
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    marginBottom: 24
  },
  section: {
    marginTop: 12
  }
});

export default DashboardScreen;
