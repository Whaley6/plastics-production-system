import { useLocalStorage } from './useLocalStorage';

export const DEFAULT_JOB_TITLES = [
  "مسؤول الشفت",
  "مساعد مسؤول الشفت",
  "عامل نظافة",
  "صيانة",
  "مشغل",
  "موظف جودة",
  "موظف مواد الخام",
  "موظف طباعة",
  "عامل تعبئة و تغليف"
];

export function useJobTitles() {
  return useLocalStorage<string[]>('app_job_titles', DEFAULT_JOB_TITLES);
}
