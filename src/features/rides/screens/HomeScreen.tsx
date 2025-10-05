import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import KeyboardSafe from '../../../components/layout/KeyboardSafe';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RideTabParams } from '../../../navigation/types';
import { useProfileStore } from '../../../store/useProfileStore';
import { useRoleStore } from '../../../store/useRoleStore';
import { navigationTheme } from '../../../theme/navigationTheme';
// TODO: Integrate Google Places Autocomplete via `resolveCampus` API.
// import { resolveCampus } from '../../../services/api/maps';
import headerImage from '../../../../assets/images/homepage.png';

const CAMPUS_OPTIONS = [
  { id: 'burnaby', label: 'SFU Burnaby' },
  { id: 'surrey', label: 'SFU Surrey' }
] as const;

const CTA_BUTTONS = [
  { id: 'LiveRides' as const, label: 'LiveRide' },
  { id: 'ScheduledRides' as const, label: 'ScheduledRides' }
];

type Navigation = BottomTabNavigationProp<MainTabParamList, 'Home'>;

type CampusOptionId = (typeof CAMPUS_OPTIONS)[number]['id'];

const ROLE_OPTIONS = [
  { id: 'driver' as const, label: 'Driver' },
  { id: 'rider' as const, label: 'Rider' }
];

const HomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const nickname = useProfileStore((state) => state.nickname);
  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<CampusOptionId>('surrey');

  const trimmedOrigin = useMemo(() => origin.trim(), [origin]);
  const destinationInfo = useMemo(
    () => CAMPUS_OPTIONS.find((option) => option.id === destination) ?? CAMPUS_OPTIONS[0],
    [destination]
  );

  const isActionDisabled = useMemo(() => trimmedOrigin.length === 0, [trimmedOrigin]);

  const greeting = nickname ? `Hey, ${nickname}!` : 'Hey there!';

  const handleNavigate = (screen: 'LiveRides' | 'ScheduledRides') => {
    if (isActionDisabled) {
      return;
    }

    const params: RideTabParams = {
      role,
      origin: trimmedOrigin,
      destination: destinationInfo
    };

    if (screen === 'LiveRides') {
      navigation.navigate('LiveRides', params);
    } else {
      navigation.navigate('ScheduledRides', params);
    }

    // TODO: Pass role-based params for driver/rider specific flows integrated with backend.
  };

  return (
    <KeyboardSafe scroll contentContainerStyle={styles.container} testID="KeyboardSafe.Home">
      <Image source={headerImage} style={styles.headerImage} accessibilityRole="image" />
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subheading}>Plan your ride between campuses</Text>

      <View style={styles.segmentGroup} accessible accessibilityLabel="Select primary role">
        <Text style={styles.segmentLabel}>I am a</Text>
        <View style={styles.segmentRow}>
          {ROLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={`role-${option.id}`}
              style={[styles.segmentButton, role === option.id && styles.segmentButtonActive]}
              onPress={() => setRole(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: role === option.id }}
              accessibilityLabel={`Role ${option.label}`}
            >
              <Text
                style={[styles.segmentButtonText, role === option.id && styles.segmentButtonTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.segmentLabel}>Origin</Text>
        <Text style={styles.helperText}>Enter a pick-up address</Text>
        <TextInput
          style={styles.originInput}
          value={origin}
          onChangeText={setOrigin}
          placeholder="123 Main Street, Burnaby, BC"
          accessibilityLabel="Enter origin address"
        />
      </View>

      <View style={styles.segmentGroup} accessible accessibilityLabel="Select destination campus">
        <Text style={styles.segmentLabel}>Destination</Text>
        <View style={styles.segmentRow}>
          {CAMPUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={`destination-${option.id}`}
              style={[styles.segmentButton, destination === option.id && styles.segmentButtonActive]}
              onPress={() => setDestination(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: destination === option.id }}
              accessibilityLabel={`Destination ${option.label}`}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  destination === option.id && styles.segmentButtonTextActive
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isActionDisabled ? (
        <Text style={styles.validationMessage}>
          Origin address is required before continuing.
        </Text>
      ) : null}

      <View style={styles.ctaContainer}>
        {CTA_BUTTONS.map((cta) => (
          <TouchableOpacity
            key={cta.id}
            style={[styles.ctaButton, isActionDisabled && styles.ctaButtonDisabled]}
            onPress={() => handleNavigate(cta.id)}
            disabled={isActionDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isActionDisabled }}
            accessibilityLabel={`Navigate to ${cta.label}`}
          >
            <Text style={styles.ctaButtonText}>{cta.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardSafe>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24
  },
  headerImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 24
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8
  },
  subheading: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24
  },
  segmentGroup: {
    marginBottom: 24
  },
  formGroup: {
    marginBottom: 24
  },
  segmentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8
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
    borderColor: navigationTheme.colors.primary,
    backgroundColor: '#FDE9F2'
  },
  segmentButtonText: {
    fontSize: 14,
    color: '#111827'
  },
  segmentButtonTextActive: {
    fontWeight: '600',
    color: navigationTheme.colors.primary
  },
  originInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16
  },
  validationMessage: {
    color: '#B91C1C',
    marginBottom: 16
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 12
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: navigationTheme.colors.primary
  },
  ctaButtonDisabled: {
    backgroundColor: '#E5E7EB'
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
  }
});

export default HomeScreen;
