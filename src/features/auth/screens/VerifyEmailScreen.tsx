import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

const VerifyEmailScreen = ({ route }: Props) => {
  const { completeSignIn } = useAuth();
  const email = route.params?.email ?? '';

  const handleRefreshSession = async () => {
    // TODO: Use inbound dynamic link or OTP entry to complete auth
    await completeSignIn('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.body}>We sent a magic link to {email || 'your email'}. Tap it on this device to continue.</Text>
      <TouchableOpacity style={styles.secondary} onPress={handleRefreshSession}>
        <Text style={styles.secondaryText}>I already clicked the link</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    marginBottom: 24
  },
  secondary: {
    padding: 16,
    alignItems: 'center'
  },
  secondaryText: {
    color: '#D4145A',
    fontWeight: '600'
  }
});

export default VerifyEmailScreen;
