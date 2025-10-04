import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({ navigation }: Props) => {
  const { initiateSignIn } = useAuth();
  const [email, setEmail] = useState('');

  const handleContinue = async () => {
    await initiateSignIn(email);
    navigation.navigate('VerifyEmail', { email });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your SFU email</Text>
      <Text style={styles.description}>Enter your @sfu.ca email to receive a sign-in link.</Text>
      <TextInput
        style={styles.input}
        placeholder="name@sfu.ca"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.cta} onPress={handleContinue}>
        <Text style={styles.ctaText}>Send magic link</Text>
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
  description: {
    fontSize: 16,
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  cta: {
    backgroundColor: '#D4145A',
    padding: 16,
    alignItems: 'center',
    borderRadius: 12
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default SignInScreen;
