import React, { Children, ReactElement } from 'react';
import { MainTabs, TAB_ICONS } from '../MainTabs';

describe('MainTabs icons', () => {
  it('maps tabs to expected Material icon names', () => {
    expect(TAB_ICONS).toEqual(
      expect.objectContaining({
        Home: 'home',
        LiveRides: 'directions-car',
        ScheduledRides: 'query-builder',
        Chat: 'chat',
        Profile: 'account-box'
      })
    );
  });

  it('renders tabBarIcon functions for each tab', () => {
    const element = MainTabs();
    const screens = Children.toArray(element.props.children) as ReactElement[];
    screens.forEach((screen) => {
      const opts = (screen.props as { options?: { tabBarIcon?: (p: { color: string; size: number }) => ReactElement } }).options;
      if (opts?.tabBarIcon) {
        const iconEl = opts.tabBarIcon({ color: '#000', size: 24 });
        expect(iconEl).toBeTruthy();
      }
    });
  });
});
