import { useQuery } from '@tanstack/react-query';

export const useLiveRideFeed = () => {
  return useQuery({
    queryKey: ['live-rides'],
    queryFn: async () => {
      // TODO: Replace with Firestore/Functions powered live ride feed
      return [] as Array<unknown>;
    }
  });
};
