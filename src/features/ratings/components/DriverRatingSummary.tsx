import { View, Text, StyleSheet } from 'react-native';

type DriverRatingSummaryProps = {
  averageRating?: number;
  ratingCount?: number;
};

const DriverRatingSummary = ({ averageRating = 0, ratingCount = 0 }: DriverRatingSummaryProps) => (
  <View style={styles.container}>
    <Text style={styles.score}>{averageRating.toFixed(1)}/5</Text>
    <Text style={styles.caption}>Based on {ratingCount} rides</Text>
    <Text style={styles.placeholder}>TODO: Render granular feedback and moderation state.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6'
  },
  score: {
    fontSize: 24,
    fontWeight: '700'
  },
  caption: {
    fontSize: 12,
    color: '#6B7280'
  },
  placeholder: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8
  }
});

export default DriverRatingSummary;
