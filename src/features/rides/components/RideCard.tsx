import { View, Text, StyleSheet } from 'react-native';

type RideCardProps = {
  title: string;
  subtitle: string;
  meta?: string;
};

const RideCard = ({ title, subtitle, meta }: RideCardProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {meta && <Text style={styles.meta}>{meta}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8
  }
});

export default RideCard;
