"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import ChoiceCard from "@/components/choice-card";
import StoredImagePreview from "@/components/stored-image-preview";
import type { PersonaAnalysisResult } from "@/lib/persona-analysis";
import {
  AGE_VISIBILITY_OPTIONS,
  getPublicNicknameError,
  PHOTO_VISIBILITY_OPTIONS,
  type AgeVisibility,
  type PhotoVisibility,
  type PublicChatProfile,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/client";

type PublicProfileFormProps = {
  userId: string;
  initialSettings: PublicChatProfile;
  persona: PersonaAnalysisResult | null;
  photoUrl: string | null;
  initialLoadFailed?: boolean;
};

const PHOTO_GUIDANCE: Record<PhotoVisibility, string> = {
  persona_only:
    "다른 사용자에게는 실제 사진 대신 페르소나 스타일 카드가 보여요.",
  mutual:
    "다른 사용자에게는 흐린 사진만 보이고, 서로 동의한 경우에만 실제 사진을 공개할 수 있어요.",
  public:
    "공개 프로필을 보는 로그인 사용자에게 실제 사진이 처음부터 보여요.",
};

export default function PublicProfileForm({
  userId,
  initialSettings,
  persona,
  photoUrl,
  initialLoadFailed = false,
}: PublicProfileFormProps) {
  const router = useRouter();
  const [publicNickname, setPublicNickname] = useState(
    initialSettings.public_nickname ?? "",
  );
  const [publicBio, setPublicBio] = useState(
    initialSettings.public_bio ?? "",
  );
  const [ageVisibility, setAgeVisibility] = useState<AgeVisibility>(
    initialSettings.age_visibility,
  );
  const [photoVisibility, setPhotoVisibility] =
    useState<PhotoVisibility>(initialSettings.photo_visibility);
  const [isPublic, setIsPublic] = useState(initialSettings.is_public);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialLoadFailed
      ? "공개 프로필 설정을 불러오지 못했어요. SQL 실행 여부를 확인해주세요."
      : null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedNickname = publicNickname.trim();
    const nicknameError = getPublicNicknameError(normalizedNickname);

    if (nicknameError) {
      setErrorMessage(nicknameError);
      return;
    }

    const normalizedBio = publicBio.trim();

    if (normalizedBio.length > 120) {
      setErrorMessage("한 줄 소개는 120자 이하로 입력해주세요.");
      return;
    }

    if (isPublic && !persona) {
      setErrorMessage("공개 프로필을 활성화하려면 AI 페르소나가 필요해요.");
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

    if (userError || !user || user.id !== userId) {
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        public_nickname: normalizedNickname,
        public_bio: normalizedBio || null,
        age_visibility: ageVisibility,
        photo_visibility: photoVisibility,
        is_public: isPublic,
      })
      .eq("id", userId);

    if (error) {
      if (error.code === "42703" || error.code === "42P01") {
        setErrorMessage(
          "공개 프로필 컬럼이 아직 없어요. public-chat-profile.sql을 먼저 실행해주세요.",
        );
      } else if (error.code === "23514") {
        setErrorMessage("입력값을 다시 확인해주세요.");
      } else if (error.code === "42501") {
        setErrorMessage("공개 프로필을 수정할 권한이 없어요.");
      } else {
        setErrorMessage(
          "공개 프로필을 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
      }
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(
      "공개 프로필을 저장했어요. 대화 분위기 설정으로 이동할게요.",
    );
    window.setTimeout(() => {
      router.replace("/profile/conversation-preferences");
      router.refresh();
    }, 650);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-coral-600">
              AI 페르소나 미리보기
            </p>
            <h2 className="mt-1.5 text-xl font-bold text-neutral-900">
              {persona?.personaTitle ?? "페르소나가 아직 없어요"}
            </h2>
          </div>
          {persona && (
            <span className="shrink-0 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
              분석 완료
            </span>
          )}
        </div>

        {persona ? (
          <>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {persona.personaDescription}
            </p>
            <StoredImagePreview
              src={photoUrl}
              className="mt-5 shadow-sm"
            />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {persona.animalTypes.slice(0, 3).map((animal) => (
                <div
                  key={animal.name}
                  className="rounded-2xl bg-neutral-50 px-2 py-3 text-center"
                >
                  <p className="truncate text-xs font-semibold text-neutral-700">
                    {animal.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-coral-600">
                    {animal.score}%
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {persona.moodKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-sm leading-6 text-neutral-600">
              사진 분석을 완료하면 페르소나와 추천 닉네임을 불러올 수 있어요.
            </p>
            <ActionLink
              href="/upload"
              variant="secondary"
              className="mt-4"
              ariaLabel="사진을 업로드하고 AI 페르소나 만들기"
            >
              AI 페르소나 만들기
            </ActionLink>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <label htmlFor="public-nickname" className="block">
          <span className="text-sm font-bold text-neutral-900">
            공개 닉네임
          </span>
          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            다른 사용자에게 보이는 캐릭터 이름이에요.
          </span>
          <input
            id="public-nickname"
            type="text"
            autoComplete="nickname"
            minLength={2}
            maxLength={20}
            required
            disabled={isSubmitting}
            value={publicNickname}
            onChange={(event) => setPublicNickname(event.target.value)}
            placeholder="2~20자로 입력해주세요"
            className="mt-3 min-h-14 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-coral-400 focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
          />
        </label>

        {persona?.nicknameCandidates.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-500">
              AI 추천 닉네임
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {persona.nicknameCandidates.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  disabled={isSubmitting}
                  aria-pressed={publicNickname === candidate}
                  onClick={() => setPublicNickname(candidate)}
                  className={`min-h-10 cursor-pointer rounded-full border px-3.5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                    publicNickname === candidate
                      ? "border-coral-400 bg-coral-50 text-coral-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label htmlFor="public-bio" className="mt-5 block">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-neutral-900">
              한 줄 소개
            </span>
            <span
              className={`text-xs font-medium ${
                publicBio.length > 120
                  ? "text-red-600"
                  : "text-neutral-400"
              }`}
            >
              {publicBio.length}/120
            </span>
          </span>
          <textarea
            id="public-bio"
            maxLength={120}
            rows={4}
            disabled={isSubmitting}
            value={publicBio}
            onChange={(event) => setPublicBio(event.target.value)}
            placeholder="함께 대화할 사람에게 나를 가볍게 소개해주세요"
            className="mt-3 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base leading-6 text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-coral-400 focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
          />
        </label>
      </section>

      <fieldset
        disabled={isSubmitting}
        className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
      >
        <legend className="px-1 text-sm font-bold text-neutral-900">
          나이 공개 범위
        </legend>
        <div className="mt-3 space-y-2.5">
          {AGE_VISIBILITY_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              label={option.label}
              selected={ageVisibility === option.value}
              disabled={isSubmitting}
              onClick={() => setAgeVisibility(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset
        disabled={isSubmitting}
        className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
      >
        <legend className="px-1 text-sm font-bold text-neutral-900">
          사진 공개 범위
        </legend>
        <div className="mt-3 space-y-2.5">
          {PHOTO_VISIBILITY_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={photoVisibility === option.value}
              disabled={isSubmitting}
              onClick={() => setPhotoVisibility(option.value)}
            />
          ))}
        </div>
        <p className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
          {PHOTO_GUIDANCE[photoVisibility]}
        </p>
      </fieldset>

      <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              공개 프로필 활성화
            </h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              비활성화하면 추천 목록과 향후 채팅방에서 제외돼요.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label="공개 프로필 활성화"
            disabled={isSubmitting || !persona}
            onClick={() => setIsPublic((current) => !current)}
            className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              isPublic ? "bg-coral-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-1 size-6 rounded-full bg-white shadow-sm transition-transform ${
                isPublic ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-xs leading-5 text-coral-800">
          저장 전 확인: 공개를 켜면 닉네임, 페르소나와 선택한 대화
          설정이 다른 로그인 사용자에게 보여요. 이메일과 생년월일 원본은
          공개되지 않아요. 대화 설정까지 완료한 뒤 공개 목록에 반영돼요.
        </p>
      </section>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
        >
          {successMessage}
        </p>
      )}

      <ActionButton
        type="submit"
        disabled={isSubmitting}
        aria-label="공개 캐릭터 프로필 저장하기"
      >
        {isSubmitting ? "저장 중..." : "공개 프로필 저장하기"}
      </ActionButton>
    </form>
  );
}
