import { getDb } from './connection';

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});
