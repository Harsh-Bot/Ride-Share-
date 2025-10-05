import { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import RideCard from '../components/RideCard';
import PostRideSheet from '../components/PostRideSheet';
import { useRoleStore } from '../../../store/useRoleStore';
import { useDriverStateStore } from '../../../store/useDriverStateStore';
import { shouldShowDriverPostCta } from '../utils/driverEligibility';
import { useCreateRidePost } from '../hooks/useCreateRidePost';
import type { PostRideSubmitPayload } from '../types/postRide';
import { useRideFeed } from '../hooks/useRideFeed';

const LiveRidesScreen = () => {
  const { role } = useRoleStore();
  const { hasActiveTrip, driverId } = useDriverStateStore();
  const [isSheetVisible, setSheetVisible] = useState(false);

  const { status, activePost, error, pendingCount, postRide, retryPending, clearError } = useCreateRidePost({
    driverId
  });

  const showPostRide = shouldShowDriverPostCta(role, hasActiveTrip);
  const feed = useRideFeed();

  useEffect(() => {
    if (error) {
      Alert.alert('Ride post error', error, [{ text: 'Dismiss', onPress: clearError }], {
        cancelable: true
      });
    }
  }, [error, clearError]);

  const handleSubmit = async (payload: PostRideSubmitPayload) => {
    await postRide(payload);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} />}>
        <Text style={styles.title}>Live Ride Exchange</Text>
        {feed.offline && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>Offline. Showing cached rides.</Text>
          </View>
        )}
        {feed.items.map((it) => (
          <RideCard key={it.id} title={`To ${it.destinationCampus}`} subtitle={`Seats left: ${it.seatsAvailable}`} meta={it.isStale ? 'Stale' : 'Live'} />
        ))}
      </ScrollView>
      {role === 'driver' && hasActiveTrip && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>Finish your ongoing trip before posting a new ride.</Text>
        </View>
      )}
      {status === 'queued' && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            Offline detected. {pendingCount} ride{pendingCount === 1 ? '' : 's'} queued. Retry when back online.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryPending} accessibilityRole="button">
            <Text style={styles.retryButtonText}>Retry now</Text>
          </TouchableOpacity>
        </View>
      )}
      {activePost && (
        <View style={styles.activePostCard}>
          <Text style={styles.activePostTitle}>Active ride post</Text>
          <Text style={styles.activePostMeta}>
            Status: {activePost.status} • Seats: {activePost.seatsAvailable}/{activePost.seatsTotal}
          </Text>
          <Text style={styles.activePostMeta}>
            Destination: {activePost.destinationCampus} • Origin: {activePost.originLabel}
          </Text>
        </View>
      )}
      {showPostRide && (
        <TouchableOpacity
          style={[styles.floatingButton, status === 'posting' && styles.floatingButtonDisabled]}
          onPress={() => setSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Post Ride Now"
          disabled={status === 'posting'}
        >
          <Text style={styles.floatingButtonText}>{status === 'posting' ? 'Posting…' : 'Post Ride Now'}</Text>
        </TouchableOpacity>
      )}
      <PostRideSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={async (payload) => {
          await handleSubmit(payload);
          setSheetVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    marginBottom: 16
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  floatingButtonDisabled: {
    opacity: 0.6
  },
  noticeBanner: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderColor: '#FCD34D'
  },
  noticeText: {
    color: '#92400E',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#92400E'
  },
  retryButtonText: {
    color: '#92400E',
    fontWeight: '600'
  },
  activePostCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  activePostTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1D4ED8'
  },
  activePostMeta: {
    fontSize: 14,
    color: '#1E3A8A'
  }
});

export default LiveRidesScreen;
