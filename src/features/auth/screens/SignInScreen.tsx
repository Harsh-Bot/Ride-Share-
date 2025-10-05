import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import KeyboardSafe from '../../../components/layout/KeyboardSafe';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileStore, GenderOption } from '../../../store/useProfileStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({ navigation }: Props) => {
  const { initiateSignIn, authError, pendingEmail } = useAuth();
  const { setNickname, setGender } = useProfileStore((state) => ({
    setNickname: state.setNickname,
    setGender: state.setGender
  }));
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [nickname, setNicknameLocal] = useState('');
  const [gender, setGenderLocal] = useState<GenderOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);

  const handleContinue = async () => {
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
      await initiateSignIn(email);
      navigation.navigate('VerifyEmail', { email });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const message = error ?? authError;

  return (
    <KeyboardSafe scroll contentContainerStyle={styles.container} testID="KeyboardSafe.SignIn">
      <Text style={styles.title}>Verify your SFU email</Text>
      <Text style={styles.description}>
        Share a nickname, pick a gender preference, and enter your @sfu.ca email to receive a sign-in code.
      </Text>
      <View style={styles.formGroup}>
        <TextInput
          style={styles.input}
          placeholder="Nickname"
          value={nickname}
          onChangeText={(value) => {
            setNicknameLocal(value);
            if (nicknameError) {
              setNicknameError(null);
            }
          }}
          maxLength={20}
          autoCapitalize="words"
          accessibilityLabel="Enter a nickname"
        />
        {nicknameError ? <Text style={styles.error}>{nicknameError}</Text> : null}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.segmentLabel}>Gender</Text>
        <View style={styles.segmentRow}>
          {(
            [
              { id: 'male', label: 'Male' },
              { id: 'female', label: 'Female' },
              { id: 'na', label: 'Rather not say' }
            ] as const
          ).map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.segmentButton, gender === option.id && styles.segmentButtonActive]}
              onPress={() => {
                setGenderLocal(option.id);
                if (genderError) {
                  setGenderError(null);
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: gender === option.id }}
              accessibilityLabel={`Gender ${option.label}`}
            >
              <Text
                style={[styles.segmentButtonText, gender === option.id && styles.segmentButtonTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {genderError ? <Text style={styles.error}>{genderError}</Text> : null}
      </View>
      <TextInput
        style={styles.input}
        placeholder="name@sfu.ca"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) {
            setError(null);
          }
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel="Enter your SFU email"
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <TouchableOpacity
        style={styles.cta}
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="Send sign-in code"
      >
        <Text style={styles.ctaText}>Send verification code</Text>
      </TouchableOpacity>
    </KeyboardSafe>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  error: {
    color: '#B91C1C',
    marginBottom: 12
  }
});

export default SignInScreen;
