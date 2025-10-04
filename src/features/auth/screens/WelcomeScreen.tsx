import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const WelcomeScreen = ({ navigation }: Props) => (
  <View style={styles.container}>
    <Text style={styles.title}>SFU Ride Share</Text>
    <Text style={styles.subtitle}>Student-first ride coordination between Burnaby and Surrey campuses.</Text>
    <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('SignIn')}>
      <Text style={styles.ctaText}>Continue with SFU email</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24
  },
  cta: {
    backgroundColor: '#D4145A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16
  }
});

export default WelcomeScreen;
