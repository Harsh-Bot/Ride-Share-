import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoleStore } from '../../../store/useRoleStore';
import { useDriverStateStore } from '../../../store/useDriverStateStore';

type Props = NativeStackScreenProps<RootStackParamList, 'RideDetails'>;

const RideDetailsScreen = () => {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Props['navigation']>();
  const { role, setRole } = useRoleStore();
  const { hasActiveTrip } = useDriverStateStore();
  const rideId = route.params?.rideId ?? 'unknown';

  const [showRolePrompt, setShowRolePrompt] = useState(false);

  useEffect(() => {
    if (role !== 'rider') setShowRolePrompt(true);
  }, [role]);

  const canRequest = useMemo(() => role === 'rider' && !hasActiveTrip, [role, hasActiveTrip]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ride Details</Text>
      <Text style={styles.meta}>Post ID: {rideId}</Text>
      {!canRequest && (
        <Text style={styles.blockedText}>
          {hasActiveTrip ? 'You have an active trip. Finish it before requesting.' : 'Switch to Rider to request.'}
        </Text>
      )}
      <TouchableOpacity style={[styles.requestButton, !canRequest && styles.requestButtonDisabled]} disabled={!canRequest}>
        <Text style={styles.requestLabel}>{canRequest ? 'Request Ride' : 'Request Blocked'}</Text>
      </TouchableOpacity>

      <Modal visible={showRolePrompt} transparent animationType="fade" onRequestClose={() => setShowRolePrompt(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Switch to Rider?</Text>
            <Text style={styles.modalBody}>To request this ride, switch your active role to Rider.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => { setShowRolePrompt(false); navigation.goBack(); }}>
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setRole('rider');
                  setShowRolePrompt(false);
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  meta: { color: '#374151', marginBottom: 16 },
  blockedText: { color: '#DC2626', marginBottom: 12 },
  requestButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  requestButtonDisabled: { backgroundColor: '#93C5FD' },
  requestLabel: { color: '#FFFFFF', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, width: '84%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalBody: { color: '#374151', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButtonPrimary: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalButtonTextPrimary: { color: '#FFF', fontWeight: '700' },
  modalButtonSecondary: { paddingHorizontal: 16, paddingVertical: 10 },
  modalButtonTextSecondary: { color: '#374151', fontWeight: '600' }
});

export default RideDetailsScreen;

