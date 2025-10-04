import { View, Text, StyleSheet } from 'react-native';

const ParkingEligibilityBadge = () => (
  <View style={styles.badge}>
    <Text style={styles.label}>Eligible for discounted parking</Text>
    <Text style={styles.caption}>TODO: Reflect real-time eligibility from completed rides.</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    borderWidth: 1,
    borderColor: '#F9A8D4'
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4
  },
  caption: {
    fontSize: 12,
    color: '#9D174D'
  }
});

export default ParkingEligibilityBadge;
