export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => number | string,
  descending: boolean = false
): T[] {
  const sorted = [...array].sort((left, right) => {
    const leftKey = keyFn(left);
    const rightKey = keyFn(right);

    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return 0;
  });

  return descending ? sorted.reverse() : sorted;
}
