import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({ navigation }: Props) => {
  const { initiateSignIn, isSendingLink, pendingEmail, error, resetError } = useAuth();
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, [pendingEmail]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setLocalError(null);
    if (error) {
      resetError();
    }
  };

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError('Enter your SFU email address');
      return;
    }

    try {
      await initiateSignIn(trimmed);
      navigation.navigate('VerifyEmail', { email: trimmed });
    } catch (sendError) {
      // Errors are surfaced via toast; keep local state for inline messaging if needed.
      setLocalError((sendError as Error)?.message ?? null);
    }
  };

  const activeError = localError ?? error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Verify your SFU email</Text>
        <Text style={styles.description}>Enter your @sfu.ca email to receive a passwordless sign-in link.</Text>
        <TextInput
          style={styles.input}
          placeholder="name@sfu.ca"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          importantForAutofill="yes"
          textContentType="emailAddress"
          testID="auth-email-input"
        />
        {activeError ? <Text style={styles.errorText}>{activeError}</Text> : null}
        <TouchableOpacity
          style={[styles.cta, isSendingLink ? styles.ctaDisabled : null]}
          onPress={handleContinue}
          disabled={isSendingLink}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSendingLink }}
          testID="auth-send-link-button"
        >
          <Text style={styles.ctaText}>{isSendingLink ? 'Sending link…' : 'Send magic link'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flexGrow: 1,
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
  errorText: {
    color: '#C62828',
    marginBottom: 12
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
  },
  ctaDisabled: {
    opacity: 0.6
  }
});

export default SignInScreen;
