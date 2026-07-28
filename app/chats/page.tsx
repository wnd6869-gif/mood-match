import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import MobileNav from "@/components/mobile-nav";
import {
  formatChatListTime,
  getChatListItemFromRecord,
  type ChatListItem,
} from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc(
    "get_my_direct_conversations",
  );
  const conversations = Array.isArray(data)
    ? data
        .map(getChatListItemFromRecord)
        .filter(
          (item): item is ChatListItem => item !== null,
        )
    : [];

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">
          1:1 채팅
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          이어서 이야기해요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          서로 인사를 받아 대화가 열린 채팅만 표시돼요.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          채팅 목록을 불러오지 못했어요. direct-chat.sql 실행 여부를
          확인해주세요.
        </p>
      )}

      {conversations.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-neutral-200/80 bg-white px-5 py-12 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral-50 text-2xl">
            ▢
          </span>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">
            아직 시작한 대화가 없어요.
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            마음이 맞는 캐릭터에게 대화를 신청해보세요.
          </p>
          <ActionLink
            href="/discover"
            className="mt-6"
            ariaLabel="대화할 캐릭터 둘러보기"
          >
            캐릭터 둘러보기
          </ActionLink>
        </section>
      ) : (
        <div className="mt-6 space-y-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.conversationId}
              href={`/chats/${conversation.conversationId}`}
              className="block cursor-pointer rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-50 to-neutral-100 text-lg text-coral-600">
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-neutral-900">
                        {conversation.otherPublicNickname}
                      </h2>
                      <p className="mt-0.5 truncate text-xs font-semibold text-coral-600">
                        {conversation.otherPersonaTitle}
                      </p>
                    </div>
                    <time
                      dateTime={
                        conversation.lastMessageAt ??
                        conversation.createdAt
                      }
                      className="shrink-0 text-xs text-neutral-400"
                    >
                      {formatChatListTime(
                        conversation.lastMessageAt ??
                          conversation.createdAt,
                      )}
                    </time>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <p
                      className={`min-w-0 flex-1 truncate text-sm ${
                        conversation.unreadCount > 0
                          ? "font-semibold text-neutral-800"
                          : "text-neutral-500"
                      }`}
                    >
                      {conversation.lastMessagePreview ??
                        "아직 메시지가 없어요. 먼저 인사해보세요."}
                    </p>
                    {conversation.isMuted && (
                      <span
                        aria-label="알림 꺼짐"
                        className="shrink-0 text-xs text-neutral-400"
                      >
                        🔕
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span
                        aria-label={`읽지 않은 메시지 ${conversation.unreadCount}개`}
                        className="flex min-w-6 shrink-0 items-center justify-center rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white"
                      >
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </div>

                  {conversation.otherMoodKeywords.length > 0 && (
                    <div className="mt-3 flex gap-1.5 overflow-hidden">
                      {conversation.otherMoodKeywords
                        .slice(0, 3)
                        .map((keyword) => (
                          <span
                            key={keyword}
                            className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[0.68rem] font-semibold text-neutral-500"
                          >
                            {keyword}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <MobileNav current="chats" />
    </AppShell>
  );
}
