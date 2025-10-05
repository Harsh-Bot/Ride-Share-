import { act } from '@testing-library/react-native';
import { useProfileStore } from '../useProfileStore';

type ResettableStore = typeof useProfileStore & {
  resetAll?: () => void;
};

const storeWithReset = useProfileStore as ResettableStore;

describe('useProfileStore', () => {
  afterEach(() => {
    if (typeof storeWithReset.resetAll === 'function') {
      storeWithReset.resetAll();
    } else {
      useProfileStore.getState().reset();
    }
  });

  it('updates nickname when setNickname is called', () => {
    act(() => {
      useProfileStore.getState().setNickname('Harmeet');
    });

    expect(useProfileStore.getState().nickname).toBe('Harmeet');
  });

  it('updates gender when setGender is called', () => {
    act(() => {
      useProfileStore.getState().setGender('female');
    });

    expect(useProfileStore.getState().gender).toBe('female');
  });

  it('resets to defaults when reset is called', () => {
    act(() => {
      useProfileStore.getState().setNickname('Harmeet');
      useProfileStore.getState().setGender('male');
      useProfileStore.getState().reset();
    });

    expect(useProfileStore.getState()).toEqual({
      nickname: '',
      gender: 'na',
      setNickname: expect.any(Function),
      setGender: expect.any(Function),
      reset: expect.any(Function)
    });
  });
});
