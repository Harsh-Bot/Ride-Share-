import { useQuery } from '@tanstack/react-query';

export const useDriverRatings = (driverId: string) => {
  return useQuery({
    queryKey: ['driver-ratings', driverId],
    queryFn: async () => {
      // TODO: Retrieve aggregated rating insights and recent feedback entries
      return {
        average: 0,
        count: 0
      };
    }
  });
};
