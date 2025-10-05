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
import { useProfileStore, GenderOption } from '../../../store/useProfileStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({ navigation }: Props) => {
  const { initiateSignIn, isSendingLink, resetError, authError, pendingEmail } = useAuth();
  const { setNickname, setGender } = useProfileStore((state) => ({
    setNickname: state.setNickname,
    setGender: state.setGender
  }));
  const [email, setEmail] = useState(pendingEmail ?? pendingEmail ?? '');
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
  const [nickname, setNicknameLocal] = useState('');
  const [gender, setGenderLocal] = useState<GenderOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError('Enter your SFU email address');
      return;
    }

    try {
      const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setNicknameError('Nickname must be between 2 and 20 characters.');
      return;
    }

    if (!gender) {
      setGenderError('Please select a gender or choose rather not say.');
      return;
    }

    try {
      setNicknameError(null);
      setGenderError(null);
      setNickname(trimmedNickname);
      setGender(gender);
      await initiateSignIn(trimmed);
        navigation.navigate('VerifyEmail', { email: trimmed });
    } catch (err) {
      setError((err as Error).message);
    }
    } catch (sendError) {
      // Errors are surfaced via toast; keep local state for inline messaging if needed.
      setLocalError((sendError as Error)?.message ?? null);
    }
  };

  const activeError = localError ?? error;

  const message = error ?? authError;

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
  formGroup: {
    marginBottom: 16
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
  segmentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 12
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentButtonActive: {
    borderColor: '#D4145A',
    backgroundColor: '#FCE7F3'
  },
  segmentButtonText: {
    fontSize: 14,
    color: '#111827'
  },
  segmentButtonTextActive: {
    fontWeight: '600',
    color: '#D4145A'
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
  },
  error: {
    color: '#B91C1C',
    marginBottom: 12
  }
});

export default SignInScreen;
