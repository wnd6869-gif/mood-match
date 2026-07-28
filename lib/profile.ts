export const GENDER_OPTIONS = [
  "여성",
  "남성",
  "논바이너리",
  "공개하지 않음",
] as const;

export const PREFERRED_GENDER_OPTIONS = [
  "여성",
  "남성",
  "성별 무관",
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number];
export type PreferredGender = (typeof PREFERRED_GENDER_OPTIONS)[number];

export type Profile = {
  id: string;
  nickname: string;
  birth_date: string;
  gender: string;
  preferred_gender: string;
  birth_time: string | null;
  birth_time_unknown: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileFormValues = Pick<
  Profile,
  | "nickname"
  | "birth_date"
  | "gender"
  | "preferred_gender"
  | "birth_time"
  | "birth_time_unknown"
>;

export const PROFILE_SELECT_COLUMNS =
  "id, nickname, birth_date, gender, preferred_gender, birth_time, birth_time_unknown, created_at, updated_at";

export function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function formatBirthTime(
  value: string | null,
  isUnknown: boolean,
) {
  if (isUnknown || !value) {
    return "모름";
  }

  return value.slice(0, 5);
}
