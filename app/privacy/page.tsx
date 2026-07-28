import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import { LegalList, LegalSection } from "@/components/legal-document";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_OPERATOR,
  PRIVACY_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Mood Match",
  description: "Mood Match 베타 서비스 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <BackLink href="/" ariaLabel="서비스 메인으로 돌아가기" label="메인" />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">서비스 정책</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          개인정보처리방침
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {LEGAL_OPERATOR.serviceName} 베타 서비스가 현재 코드와 데이터
          구조에서 처리하는 정보를 기준으로 작성했습니다. 실제 운영 설정과
          계약을 확정한 뒤 법률 전문가의 검토를 권장하며, 이 문서는 법률
          자문을 대신하지 않습니다.
        </p>
        <p className="mt-3 text-xs leading-5 text-neutral-400">
          버전 {PRIVACY_VERSION} · 시행일 {LEGAL_EFFECTIVE_DATE}
        </p>
      </header>

      <article className="mt-7 space-y-4">
        <LegalSection title="1. 처리 목적">
          <LegalList>
            <li>회원가입, 이메일 인증, 로그인과 계정 관리</li>
            <li>기본·공개 프로필 및 대화 선호 설정 제공</li>
            <li>사진을 이용한 AI 동물 페르소나 생성과 결과 저장</li>
            <li>사용자 탐색, 대화 요청, 1:1·단체 채팅 제공</li>
            <li>신고·차단·제재, 서비스 안전과 부정 이용 방지</li>
            <li>오류 확인, 보안, 성능 개선과 고객 문의 대응</li>
            <li>별도 선택 동의가 있는 경우 서비스 소식·이벤트 안내</li>
          </LegalList>
        </LegalSection>

        <LegalSection title="2. 처리 항목과 필요성">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-separate border-spacing-0 text-left text-xs leading-5">
              <thead>
                <tr className="text-neutral-800">
                  <th className="border-b border-neutral-200 px-2 py-2">구분</th>
                  <th className="border-b border-neutral-200 px-2 py-2">항목</th>
                  <th className="border-b border-neutral-200 px-2 py-2">
                    근거 또는 처리 필요성
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-2.5 [&_td]:align-top">
                <tr>
                  <td>계정</td>
                  <td>이메일, 인증 식별자, 가입·동의 시각과 약관 버전</td>
                  <td>이용자 동의, 회원 식별과 서비스 계약 이행</td>
                </tr>
                <tr>
                  <td>기본 프로필</td>
                  <td>
                    닉네임, 생년월일, 출생시간 또는 모름 여부, 성별, 만나고
                    싶은 성별
                  </td>
                  <td>이용자 동의, 프로필·연령 표시 설정과 서비스 제공</td>
                </tr>
                <tr>
                  <td>사진·AI 분석</td>
                  <td>
                    프로필 사진, Storage 경로, AI 동물 유형·점수,
                    분위기 키워드, 페르소나 설명·제목, 추천 닉네임,
                    시각적 특성값, 모델·토큰 사용량
                  </td>
                  <td>이용자 요청에 따른 AI 분석과 결과 재조회</td>
                </tr>
                <tr>
                  <td>공개 프로필</td>
                  <td>
                    공개 닉네임·소개, 공개 여부, 연령·사진 공개 범위,
                    AI 캐릭터 결과
                  </td>
                  <td>이용자가 직접 활성화한 범위에서 다른 사용자에게 표시</td>
                </tr>
                <tr>
                  <td>대화 선호</td>
                  <td>
                    대화 목적·분위기·주제·속도, 선호 인원, 활동 시간대
                  </td>
                  <td>사용자 탐색, 대화 요청과 그룹 채팅 제공</td>
                </tr>
                <tr>
                  <td>대화</td>
                  <td>
                    대화 요청, 채팅방·참여자 정보, 채팅 메시지, 읽음·숨김·퇴장
                    시각
                  </td>
                  <td>채팅 기능 제공, 분쟁 및 안전 대응</td>
                </tr>
                <tr>
                  <td>안전</td>
                  <td>
                    신고 사유·상세·대상 메시지, 차단 내역, 제재 상태와 관리자
                    처리·감사 기록
                  </td>
                  <td>이용자 동의 및 안전한 서비스 운영을 위한 필요성</td>
                </tr>
                <tr>
                  <td>자동 생성 정보</td>
                  <td>
                    접속 시각, IP 주소, 브라우저·기기 정보, 요청·오류·보안
                    기록 등 호스팅 사업자가 생성하는 로그
                  </td>
                  <td>보안, 장애 대응과 서비스 품질 유지</td>
                </tr>
                <tr>
                  <td>선택 정보</td>
                  <td>마케팅 수신 동의 여부와 동의·철회 시각</td>
                  <td>별도 선택 동의가 있는 경우에만 소식·이벤트 안내</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            서비스는 AI 분석 과정에서 사진을 OpenAI API로 전송합니다.
            현재 코드는 API 요청의 저장 옵션을 끄지만, 제공자의 안전·남용
            방지 로그 정책은 별도로 적용될 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="3. 보유 및 이용 기간">
          <LegalList>
            <li>
              계정·프로필·AI 결과·동의 기록: 원칙적으로 회원 탈퇴 또는
              처리 목적 달성 시까지
            </li>
            <li>
              프로필 사진: 이용자가 사진을 삭제하거나 계정 삭제 요청이
              처리될 때까지
            </li>
            <li>
              채팅·신고·차단·관리 기록: 서비스 운영, 신고 처리와 분쟁
              대응에 필요한 기간
            </li>
            <li>
              접속·오류 기록: 보안과 장애 대응에 필요한 기간 및 각
              처리수탁자 설정에 따른 기간
            </li>
          </LegalList>
          {/* TODO(운영자): 채팅, 신고, 동의 증빙, 로그의 정확한 보유기간과
              관계 법령상 별도 보존 항목을 운영 정책·계약에 맞춰 확정하세요. */}
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
            채팅, 신고, 동의 증빙과 기술 로그의 구체적인 기간은 운영자가
            실제 분쟁 대응·백업·법정 보존 정책을 확정한 뒤 개정 고지해야
            합니다.
          </p>
        </LegalSection>

        <LegalSection title="4. 파기 절차와 방법">
          <p>
            처리 목적이 달성되거나 보유기간이 끝난 개인정보는 복구하기
            어렵도록 삭제합니다. 데이터베이스 레코드는 삭제 또는
            비식별화하고, 파일은 Storage에서 삭제합니다. 백업에 남은
            정보는 백업 보존주기가 끝난 뒤 삭제되며 다른 목적으로 이용하지
            않습니다. 법령에 따라 별도 보존해야 하는 정보는 다른 정보와
            분리해 해당 기간 동안 보관합니다.
          </p>
        </LegalSection>

        <LegalSection title="5. 제3자 제공">
          <p>
            현재 서비스는 이용자의 개인정보를 제3자의 독립적인 목적을
            위해 제공하지 않습니다. 다만 이용자가 별도로 동의하거나
            관계 법령에 근거가 있는 경우에는 제공받는 자, 목적, 항목과
            기간을 사전에 알립니다. 아래 클라우드·AI 사업자 이용은 서비스
            운영을 위한 처리업무 위탁 또는 국외 처리에 해당할 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="6. 개인정보 처리업무 위탁">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-xs leading-5">
              <thead>
                <tr className="[&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-2">
                  <th>수탁자</th>
                  <th>업무</th>
                  <th>주요 처리 정보</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-2.5 [&_td]:align-top">
                <tr>
                  <td>Supabase</td>
                  <td>인증, PostgreSQL DB, Storage, Realtime</td>
                  <td>계정, 프로필, 사진, AI 결과, 채팅·안전 기록</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>웹 호스팅, 서버 실행, 배포와 기술 로그</td>
                  <td>요청 데이터, 접속·오류·보안 기록</td>
                </tr>
                <tr>
                  <td>OpenAI</td>
                  <td>사진 기반 AI 동물 페르소나 분석</td>
                  <td>분석 사진, 프롬프트, 해시 처리된 안전 식별자, 생성 결과</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* TODO(운영자): 실제 요금제에 적용되는 DPA, 수탁 법인명,
              재수탁자, 보유기간과 연락처를 계약 체결 후 확정하세요. */}
        </LegalSection>

        <LegalSection title="7. 국외 처리 가능성">
          <p>
            위 사업자의 서버나 지원 조직이 국외에 있어 개인정보가 서비스
            이용 시 암호화된 네트워크를 통해 국외로 이전·처리될 수
            있습니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-xs leading-5">
              <thead>
                <tr className="[&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-2">
                  <th>이전받는 자</th>
                  <th>국가·지역</th>
                  <th>목적·항목</th>
                  <th>시점·방법·기간</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-2.5 [&_td]:align-top">
                <tr>
                  <td>Supabase</td>
                  <td>프로젝트 리전 및 재수탁 지역 — 운영자 확인 필요</td>
                  <td>인증·DB·사진·채팅 저장과 전송</td>
                  <td>서비스 이용 시 암호화 전송, 계약·설정에 따른 기간</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>미국 및 서비스·재수탁 운영 지역</td>
                  <td>호스팅, 요청 처리와 기술 로그</td>
                  <td>접속 시 암호화 전송, 계약·설정에 따른 기간</td>
                </tr>
                <tr>
                  <td>OpenAI</td>
                  <td>미국 등 API 처리 지역 — 운영자 계약 확인 필요</td>
                  <td>사진과 요청 내용을 이용한 AI 분석</td>
                  <td>
                    분석 요청 시 암호화 전송, 기본 남용 방지 로그는 제공자
                    정책상 최대 30일일 수 있음
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* TODO(운영자): Supabase 프로젝트 리전, Vercel 실행 리전,
              OpenAI 프로젝트의 데이터 보존·리전 설정, 각 국외 법인명과
              개인정보 보호법상 국외이전 근거·고지 방식을 확정하세요. */}
        </LegalSection>

        <LegalSection title="8. 이용자 권리와 행사 방법">
          <p>
            이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지 및 동의
            철회를 요청할 수 있습니다. 기본·공개 프로필은 서비스 화면에서
            수정할 수 있고, 공개 프로필은 언제든 비활성화할 수 있습니다.
            선택 마케팅 동의 철회와 그 밖의 권리 행사는 아래 문의처로
            요청할 수 있습니다. 본인 확인 후 관계 법령이 정한 범위에서
            처리 결과를 안내합니다.
          </p>
        </LegalSection>

        <LegalSection title="9. 사진 및 계정 삭제">
          <LegalList>
            <li>
              사진 삭제: 로그인 후{" "}
              <Link
                href="/upload"
                className="font-semibold text-coral-700 underline underline-offset-2"
              >
                사진 업로드 화면
              </Link>
              에서 &apos;저장된 사진 삭제&apos;를 선택할 수 있습니다.
            </li>
            <li>
              계정 삭제: 현재 베타에서는 아래 문의처로 계정 이메일과 삭제
              요청을 보내면 본인 확인 후 Auth, DB와 Storage의 관련 정보를
              삭제 처리합니다.
            </li>
            <li>
              신고 증거, 분쟁 대응 또는 법령상 보존이 필요한 정보는 해당
              목적과 기간에 한해 분리 보관될 수 있습니다.
            </li>
          </LegalList>
          {/* TODO(운영자): 정식 공개 전 앱 내 본인확인형 계정 삭제 기능과
              Storage 선삭제 절차, 처리 기한을 확정하세요. */}
        </LegalSection>

        <LegalSection title="10. 만 14세 미만 이용 제한">
          <p>
            서비스는 만 14세 미만 아동을 대상으로 하지 않으며 가입을
            허용하지 않습니다. 만 14세 미만 이용자의 정보가 처리된 사실을
            알게 되면 확인 후 계정 이용 제한과 삭제 등 필요한 조치를
            진행합니다.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="11. 개인정보 보호책임자 및 문의">
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2">
            <dt className="font-semibold text-neutral-800">운영 주체</dt>
            <dd>{LEGAL_OPERATOR.businessName}</dd>
            <dt className="font-semibold text-neutral-800">보호책임자</dt>
            <dd>{LEGAL_OPERATOR.privacyOfficer}</dd>
            <dt className="font-semibold text-neutral-800">대표자</dt>
            <dd>{LEGAL_OPERATOR.representative}</dd>
            <dt className="font-semibold text-neutral-800">주소</dt>
            <dd>{LEGAL_OPERATOR.address}</dd>
            <dt className="font-semibold text-neutral-800">문의 이메일</dt>
            <dd className="break-all">{LEGAL_OPERATOR.contactEmail}</dd>
          </dl>
        </LegalSection>

        <LegalSection title="12. 방침 변경 및 시행일">
          <p>
            이 방침은 {LEGAL_EFFECTIVE_DATE}부터 시행합니다. 처리 항목,
            목적, 수탁자 또는 이용자 권리에 중대한 변경이 있으면 시행 전에
            서비스 화면 등 적절한 방법으로 알립니다.
          </p>
        </LegalSection>
      </article>
    </AppShell>
  );
}
