export type UserProfilePayload = {
  nickname: string;
  gender: 'male' | 'female' | 'na';
};

export const getMyProfile = async (): Promise<UserProfilePayload> => {
  throw new Error('TODO: implement backend API for fetching user profile');
};

export const updateMyProfile = async (_profile: UserProfilePayload): Promise<void> => {
  throw new Error('TODO: implement backend API for updating user profile');
};
