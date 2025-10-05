import { getMyProfile, updateMyProfile } from '../profile';

describe('profile API stubs', () => {
  it('getMyProfile throws TODO error', async () => {
    await expect(getMyProfile()).rejects.toThrow('TODO: implement backend API for fetching user profile');
  });

  it('updateMyProfile throws TODO error', async () => {
    await expect(updateMyProfile({ nickname: 'Test', gender: 'na' })).rejects.toThrow(
      'TODO: implement backend API for updating user profile'
    );
  });
});
