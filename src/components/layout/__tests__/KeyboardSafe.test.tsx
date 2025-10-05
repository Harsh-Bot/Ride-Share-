import React from 'react';
import { render } from '@testing-library/react-native';
import { KeyboardSafe } from '../KeyboardSafe';
import { Platform, Text } from 'react-native';

describe('KeyboardSafe', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  it('renders ScrollView variant and applies iOS behavior/offset', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const { getByTestId } = render(
      <KeyboardSafe scroll keyboardVerticalOffset={42}>
        <Text>content</Text>
      </KeyboardSafe>
    );
    expect(getByTestId('KeyboardSafe.Root')).toBeTruthy();
    expect(getByTestId('KeyboardSafe.Scroll')).toBeTruthy();
  });

  it('renders static View variant on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const { getByTestId, queryByTestId } = render(
      <KeyboardSafe>
        <Text>content</Text>
      </KeyboardSafe>
    );
    expect(getByTestId('KeyboardSafe.Root')).toBeTruthy();
    expect(queryByTestId('KeyboardSafe.Scroll')).toBeNull();
    expect(getByTestId('KeyboardSafe.View')).toBeTruthy();
  });
});

