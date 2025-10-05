import { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useMap } from '../../hooks/useMap';

export type MapBootstrapStatusProps = {
  containerStyle?: StyleProp<ViewStyle>;
};

const MapBootstrapStatusComponent = ({ containerStyle }: MapBootstrapStatusProps) => {
  const { status, error } = useMap();

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.container, containerStyle]} testID="map-loader-placeholder">
        <Text style={styles.text}>Preparing map services…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, containerStyle]} testID="map-loader-error">
        <Text style={styles.text}>
          {error?.code === 'config-missing'
            ? 'Map services are not configured yet.'
            : 'We could not start map services. Please try again.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]} testID="map-loader-ready">
      <Text style={styles.text}>Map services ready.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  text: {
    fontSize: 14,
    color: '#1F2937'
  }
});

export const MapBootstrapStatus = memo(MapBootstrapStatusComponent);
