import { useQuery } from '@tanstack/react-query';

export const useScheduledRides = () => {
  return useQuery({
    queryKey: ['scheduled-rides'],
    queryFn: async () => {
      // TODO: Fetch scheduled rides and support filters (date, campus, driver rating)
      return [] as Array<unknown>;
    }
  });
};
