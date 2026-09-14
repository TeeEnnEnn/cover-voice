

type SerializedDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export function serializeTimestamps<T extends Record<string, unknown>>(
  row: T
): SerializedDates<T> {
  const result = {} as SerializedDates<T>;
  for (const key in row) {
    const value = row[key];
    result[key] = (
      value instanceof Date ? value.toISOString() : value
    ) as SerializedDates<T>[typeof key];
  }
  return result;
}
