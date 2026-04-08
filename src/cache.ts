export class LRUCache<K, V> {
  #cacheMap = new Map<K, V>();
  #maxSize: number;

  constructor(maxSize: number = 100) {
    this.#maxSize = maxSize;
  }

  set(key: K, value: V) {
    this.#cacheMap.set(key, value);
    if (this.#cacheMap.size > this.#maxSize) {
      const lru = this.#cacheMap.keys().next();
      if (!lru.done) {
        this.#cacheMap.delete(lru.value);
      }
    }
  }

  get(key: K) {
    const result = this.#cacheMap.get(key);
    if (!result) return;
    return result;
  }

  has(key: K) {
    return this.#cacheMap.has(key);
  }

  touch(key: K) {
    const result = this.#cacheMap.get(key);
    if (!result) return;
    this.#cacheMap.delete(key);
    this.#cacheMap.set(key, result);
  }

  del(key: K) {
    this.#cacheMap.delete(key);
  }

  clearAll() {
    this.#cacheMap = new Map<K, V>();
  }
}
