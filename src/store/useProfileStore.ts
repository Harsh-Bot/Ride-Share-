import { create } from 'zustand';

export type GenderOption = 'male' | 'female' | 'na';

type ProfileState = {
  nickname: string;
  gender: GenderOption;
  setNickname: (nickname: string) => void;
  setGender: (gender: GenderOption) => void;
  reset: () => void;
};

const defaultState: Omit<ProfileState, 'setNickname' | 'setGender' | 'reset'> = {
  nickname: '',
  gender: 'na'
};

export const useProfileStore = create<ProfileState>((set) => ({
  ...defaultState,
  setNickname: (nickname) => set({ nickname }),
  setGender: (gender) => set({ gender }),
  reset: () => set({ ...defaultState })
}));

// TODO: Persist profile with AsyncStorage once backend integration is ready.
