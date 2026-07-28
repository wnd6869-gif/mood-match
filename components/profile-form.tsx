"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton } from "@/components/action";
import AuthField from "@/components/auth-field";
import {
  GENDER_OPTIONS,
  PREFERRED_GENDER_OPTIONS,
  type Profile,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  initialProfile: Profile | null;
  initialLoadFailed?: boolean;
};

const SELECT_CLASSES =
  "mt-2 min-h-14 w-full cursor-pointer rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-900 outline-none transition-colors hover:border-neutral-300 focus:border-coral-400 focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed disabled:bg-neutral-100";

function isAtLeastFourteen(birthDate: string) {
  const parsed = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  const threshold = new Date(
    today.getFullYear() - 14,
    today.getMonth(),
    today.getDate(),
  );

  return parsed <= threshold;
}

export default function ProfileForm({
  initialProfile,
  initialLoadFailed = false,
}: ProfileFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialProfile?.nickname ?? "");
  const [birthDate, setBirthDate] = useState(
    initialProfile?.birth_date ?? "",
  );
  const [gender, setGender] = useState(initialProfile?.gender ?? "");
  const [preferredGender, setPreferredGender] = useState(
    initialProfile?.preferred_gender ?? "",
  );
  const [birthTime, setBirthTime] = useState(
    initialProfile?.birth_time?.slice(0, 5) ?? "",
  );
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(
    initialProfile?.birth_time_unknown ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialLoadFailed
      ? "기존 프로필을 불러오지 못했어요. profiles SQL이 실행되었는지 확인해주세요."
      : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);

    if (!nickname.trim() || !birthDate || !gender || !preferredGender) {
      setErrorMessage("필수 항목을 모두 입력해주세요.");
      return;
    }

    if (!isAtLeastFourteen(birthDate)) {
      setErrorMessage("만 14세 이상만 서비스를 이용할 수 있어요.");
      return;
    }

    if (nickname.trim().length > 30) {
      setErrorMessage("닉네임은 30자 이하로 입력해주세요.");
      return;
    }

    if (!birthTimeUnknown && !birthTime) {
      setErrorMessage("태어난 시간을 입력하거나 ‘태어난 시간 모름’을 선택해주세요.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSubmitting(false);
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        nickname: nickname.trim(),
        birth_date: birthDate,
        gender,
        preferred_gender: preferredGender,
        birth_time: birthTimeUnknown ? null : birthTime,
        birth_time_unknown: birthTimeUnknown,
      },
      { onConflict: "id" },
    );

    if (error) {
      if (error.code === "42P01") {
        setErrorMessage(
          "profiles 테이블이 아직 없어요. Supabase SQL Editor에서 profiles.sql을 먼저 실행해주세요.",
        );
      } else if (error.code === "42501") {
        setErrorMessage("프로필 저장 권한을 확인해주세요.");
      } else if (error.message.includes("minimum_age_required")) {
        setErrorMessage("만 14세 이상만 서비스를 이용할 수 있어요.");
      } else {
        setErrorMessage("프로필을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
      setIsSubmitting(false);
      return;
    }

    router.replace("/mypage");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-7 space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
    >
      <AuthField
        id="profile-nickname"
        label="가입 정보용 이름 (비공개)"
        type="text"
        autoComplete="nickname"
        maxLength={30}
        placeholder="본인 확인용 이름을 입력해주세요"
        value={nickname}
        disabled={isSubmitting}
        required
        onChange={(event) => setNickname(event.target.value)}
      />
      <p className="-mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
        이 이름은 생년월일 같은 기본 정보와 함께 비공개로 보관돼요. 다른
        사용자에게 보이는 기본 ID는 사진 분석 후 AI가 별도로 만들어요.
      </p>

      <AuthField
        id="profile-birth-date"
        label="생년월일"
        type="date"
        autoComplete="bday"
        value={birthDate}
        disabled={isSubmitting}
        required
        onChange={(event) => setBirthDate(event.target.value)}
      />

      <label htmlFor="profile-gender" className="block">
        <span className="text-sm font-semibold text-neutral-800">성별</span>
        <select
          id="profile-gender"
          className={SELECT_CLASSES}
          value={gender}
          disabled={isSubmitting}
          required
          onChange={(event) => setGender(event.target.value)}
        >
          <option value="" disabled>
            성별을 선택해주세요
          </option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="profile-preferred-gender" className="block">
        <span className="text-sm font-semibold text-neutral-800">
          만나고 싶은 성별
        </span>
        <select
          id="profile-preferred-gender"
          className={SELECT_CLASSES}
          value={preferredGender}
          disabled={isSubmitting}
          required
          onChange={(event) => setPreferredGender(event.target.value)}
        >
          <option value="" disabled>
            만나고 싶은 성별을 선택해주세요
          </option>
          {PREFERRED_GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div>
        <AuthField
          id="profile-birth-time"
          label="태어난 시간"
          type="time"
          autoComplete="off"
          value={birthTime}
          disabled={isSubmitting || birthTimeUnknown}
          required={!birthTimeUnknown}
          aria-describedby="birth-time-help"
          onChange={(event) => setBirthTime(event.target.value)}
        />
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-1 text-sm text-neutral-700 transition-colors hover:text-neutral-900">
          <input
            type="checkbox"
            className="size-5 cursor-pointer rounded border-neutral-300 accent-coral-500 disabled:cursor-not-allowed"
            checked={birthTimeUnknown}
            disabled={isSubmitting}
            onChange={(event) => setBirthTimeUnknown(event.target.checked)}
          />
          태어난 시간 모름
        </label>
        <p id="birth-time-help" className="mt-1 text-xs leading-5 text-neutral-500">
          시간을 모르면 체크박스를 선택해주세요.
        </p>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <ActionButton
        type="submit"
        disabled={isSubmitting}
        aria-label="입력한 프로필 저장하기"
      >
        {isSubmitting ? "저장 중..." : initialProfile ? "프로필 수정하기" : "프로필 저장하기"}
      </ActionButton>
    </form>
  );
}
