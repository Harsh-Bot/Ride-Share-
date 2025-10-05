import { ReactElement, Children } from 'react';
import { MainTabs } from '../MainTabs';

describe('MainTabs', () => {
  it('sets Home as the initial route and includes Home tab', () => {
    const element = MainTabs();
    expect(element.props.initialRouteName).toBe('Home');

    const children = Children.toArray(element.props.children) as ReactElement[];
    const screenNames = children.map((child) => (child.props as { name: string }).name);
    expect(screenNames).toContain('Home');
    expect(screenNames).not.toContain('Map');
  });
});
