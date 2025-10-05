import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Linking from 'expo-linking';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';
import { showToast } from '../../../utils/toast';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

const VerifyEmailScreen = ({ route }: Props) => {
  const { completeSignIn, isCompletingLink, pendingEmail, error } = useAuth();
  const email = useMemo(() => route.params?.email ?? pendingEmail ?? '', [route.params?.email, pendingEmail]);

  const handleRefreshSession = useCallback(async () => {
    try {
      const latestUrl = (await Linking.getInitialURL()) ?? '';
      if (!latestUrl) {
        showToast('Open the magic link from your inbox to finish signing in.', 'error');
        return;
      }
      await completeSignIn(latestUrl);
    } catch (attemptError) {
      showToast((attemptError as Error)?.message ?? 'We could not refresh your session.', 'error');
    }
  }, [completeSignIn]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a magic link to {email ? <Text style={styles.emailText}>{email}</Text> : 'your email'}.
          {' '}Open it on this device to finish signing in. The link expires within 15 minutes for security.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.secondary, isCompletingLink ? styles.secondaryDisabled : null]}
          onPress={handleRefreshSession}
          disabled={isCompletingLink}
          accessibilityRole="button"
          accessibilityState={{ disabled: isCompletingLink }}
          testID="auth-refresh-session-button"
        >
          <Text style={styles.secondaryText}>
            {isCompletingLink ? 'Looking for your link…' : 'I already tapped the link'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
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
  emailText: {
    fontWeight: '600'
  },
  errorText: {
    color: '#C62828',
    marginBottom: 12
  },
  secondary: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  ctaDisabled: {
    opacity: 0.6
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  secondaryDisabled: {
    opacity: 0.6
  }
});

export default VerifyEmailScreen;
