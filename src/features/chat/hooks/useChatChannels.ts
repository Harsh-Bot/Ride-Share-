import { useQuery } from '@tanstack/react-query';

export const useChatChannels = () => {
  return useQuery({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      // TODO: Integrate with Firestore/third-party chat SDK for ride-specific conversations
      return [] as Array<unknown>;
    }
  });
};
