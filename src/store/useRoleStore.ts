import { create } from 'zustand';

type Role = 'driver' | 'rider';

type RoleState = {
  role: Role;
  setRole: (role: Role) => void;
};

export const useRoleStore = create<RoleState>((set) => ({
  role: 'rider',
  setRole: (role) => set({ role })
}));
