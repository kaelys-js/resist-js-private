const inFlight = new Map<string, Promise<any>>();

export const dedupePlugin = () => (app: Elysia) =>
  app
    .onRequest(({ request, store }) => {
      const key = request.url;
      if (inFlight.has(key)) {
        store.dedupeResponse = inFlight.get(key);
      }
    })
    .onAfterHandle(({ request, response }) => {
      const key = request.url;
      inFlight.delete(key);
      return response;
    })
    .mapResponse(async ({ store, request }, handler) => {
      const key = request.url;

      if (store.dedupeResponse) {
        return store.dedupeResponse;
      }

      const responsePromise = handler();
      inFlight.set(key, responsePromise);
      return await responsePromise;
    });
