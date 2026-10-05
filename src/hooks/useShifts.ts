import { useLocalStorage } from './useLocalStorage';

export const DEFAULT_SHIFTS = [
  "A",
  "B",
  "C"
];

export function useShifts() {
  return useLocalStorage<string[]>('app_shifts', DEFAULT_SHIFTS);
}
