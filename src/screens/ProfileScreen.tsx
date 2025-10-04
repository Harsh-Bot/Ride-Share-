import { View, Text, StyleSheet } from 'react-native';

const ProfileScreen = () => (
  <View style={styles.container}>
    <Text style={styles.heading}>Profile</Text>
    <Text style={styles.body}>TODO: Show account details, verification status, and settings.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12
  },
  body: {
    fontSize: 16
  }
});

export default ProfileScreen;
