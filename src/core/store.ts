import { useEffect, useState } from "preact/hooks";

export class Store<T> {
  #key: string;
  #data: T;
  #serialize: (v: T) => string;
  #deserialize: (v: string) => T;
  #listeners: Set<(v: T) => void>;

  constructor(
    key: string,
    initial: () => T,
    serialize: (v: T) => string = JSON.stringify,
    deserialize: (v: string) => T = JSON.parse
  ) {
    this.#key = key;
    this.#serialize = serialize;
    this.#deserialize = deserialize;
    this.#listeners = new Set();
    if (localStorage[key]) {
      this.#data = this.#deserialize(localStorage[key]);
    } else {
      this.#data = initial();
      localStorage[this.#key] = this.#serialize(this.#data);
    }
  }

  set(data: T) {
    this.#data = data;
    localStorage[this.#key] = this.#serialize(data);
    this.#listeners.forEach((f) => f(data));
  }

  get(): T {
    return this.#data;
  }

  update(mutator: (v: T) => T) {
    const value = this.get();
    this.set(mutator(value));
  }

  subscribe(listener: (v: T) => void) {
    this.#listeners.add(listener);
    listener(this.#data);
  }

  unsubscribe(listener: (v: T) => void) {
    this.#listeners.delete(listener);
  }

  /** Remove the key from localStorage. Does not update the value. */
  private unsave() {
    localStorage.removeItem(this.#key);
  }
}

export function useStore<T>(store: Store<T>): T {
  const [state, setState] = useState<T>(() => store.get());
  useEffect(() => {
    const cb = (v: T) => setState(v);
    store.subscribe(cb);
    return () => store.unsubscribe(cb);
  }, [store]);
  return state;
}
