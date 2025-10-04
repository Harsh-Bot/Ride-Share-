// TODO: Configure REST/GraphQL client for backend integration
export const apiClient = {
  get: async (_path: string) => {
    throw new Error('apiClient.get not implemented');
  },
  post: async (_path: string, _body: unknown) => {
    throw new Error('apiClient.post not implemented');
  }
};
