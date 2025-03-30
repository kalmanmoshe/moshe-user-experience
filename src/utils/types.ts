export function objArrayToMap<T>(objArray: Record<string, T>[]): Map<string, T> {
    const entries: [string, T][] = objArray.flatMap(obj => Object.entries(obj) as [string, T][]);
    return arrayToMap(entries);
  }

export function arrayToMap<T,V>(arr: [T,V][]): Map<T,V> {return new Map<T,V>(arr);}
export function mapToArray<T, V>(map: Map<T, V>): [T, V][] {
    return Array.from(map.entries())
}

export function mapToJson<T, V>(map: Map<T, V>): { key: T; value: V }[] {
    return mapToArray(map).map(([key, value]) => ({
        key,
        value,
    }));
}
