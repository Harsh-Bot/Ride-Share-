import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import illustration from '../../../../assets/images/welcome-illustration.png';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const WelcomeScreen = ({ navigation }: Props) => (
  <View style={styles.container}>
    <Text style={styles.title}>SFU Ride Share</Text>
    <Image source={illustration} style={styles.illustration} resizeMode="contain" />
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
    marginBottom: 16,
    textAlign: 'center'
  },
  illustration: {
    width: '100%',
    height: 240,
    marginBottom: 16
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center'
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
