import type { Metadata } from "next";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import { LegalList, LegalSection } from "@/components/legal-document";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_OPERATOR,
  TERMS_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "이용약관 | Mood Match",
  description: "Mood Match 베타 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <AppShell>
      <BackLink href="/" ariaLabel="서비스 메인으로 돌아가기" label="메인" />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">서비스 정책</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          이용약관
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          이 약관은 {LEGAL_OPERATOR.serviceName} 베타 서비스 이용에 필요한
          기본 사항을 안내합니다. 정식 공개 전 운영 형태에 맞춰 검토·보완될
          수 있으며, 개별 사안에 대한 법률 자문을 대신하지 않습니다.
        </p>
        <p className="mt-3 text-xs leading-5 text-neutral-400">
          버전 {TERMS_VERSION} · 시행일 {LEGAL_EFFECTIVE_DATE}
        </p>
      </header>

      <article className="mt-7 space-y-4">
        <LegalSection title="1. 서비스 목적">
          <p>
            서비스는 이용자가 사진에서 느껴지는 분위기를 AI 동물
            페르소나로 표현하고, 공개를 선택한 다른 이용자의 캐릭터를
            둘러보며 대화할 수 있도록 돕는 것을 목적으로 합니다.
          </p>
        </LegalSection>

        <LegalSection id="beta" title="2. 베타 서비스 안내">
          <p>
            현재 서비스는 시험 운영 중인 베타 버전입니다. 기능, 제공 범위,
            화면, 데이터 구조와 정책이 변경될 수 있고 오류나 일시 중단이
            발생할 수 있습니다. 중요한 정보의 유일한 보관 수단으로
            사용하지 마세요.
          </p>
        </LegalSection>

        <LegalSection title="3. 이용 연령 및 가입">
          <LegalList>
            <li>서비스는 만 14세 이상인 이용자만 가입할 수 있습니다.</li>
            <li>
              이용자는 정확한 이메일과 본인의 정보를 사용하고, 필수 약관
              동의를 완료해야 합니다.
            </li>
            <li>
              운영자는 연령 제한 위반이 확인되면 계정 이용을 제한하거나
              필요한 삭제 절차를 진행할 수 있습니다.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection title="4. 계정 관리 책임">
          <p>
            이용자는 비밀번호와 로그인 수단을 안전하게 관리해야 하며,
            계정의 무단 사용을 발견하면 즉시 문의처로 알려야 합니다.
            타인의 계정이나 정보를 허락 없이 사용할 수 없습니다.
          </p>
        </LegalSection>

        <LegalSection title="5. 금지행위">
          <LegalList>
            <li>타인의 권리, 개인정보, 명예 또는 안전을 침해하는 행위</li>
            <li>괴롭힘, 혐오, 성적 착취, 위협, 사기 또는 불법행위</li>
            <li>타인을 사칭하거나 허위·기만 정보를 게시하는 행위</li>
            <li>서비스를 역설계하거나 보안·접근 제한을 우회하는 행위</li>
            <li>자동화 수단으로 과도한 요청을 보내거나 운영을 방해하는 행위</li>
            <li>권리 없이 타인의 사진이나 콘텐츠를 업로드하는 행위</li>
          </LegalList>
        </LegalSection>

        <LegalSection title="6. AI 분석 결과">
          <p>
            AI 동물 페르소나는 사진에서 보이는 인상을 바탕으로 생성되는
            참고·오락 목적의 결과입니다. 실제 성격, 능력, 건강, 신원 또는
            관계 적합성을 판단하거나 보증하지 않으며 중요한 의사결정의
            근거로 사용해서는 안 됩니다. 생성형 AI 특성상 부정확하거나
            예상하지 못한 결과가 나올 수 있습니다.
          </p>
        </LegalSection>

        <LegalSection title="7. 신고, 차단 및 이용제한">
          <p>
            이용자는 부적절한 사용자나 메시지를 신고·차단할 수 있습니다.
            운영자는 신고 내용과 필요한 범위의 대화 기록을 검토하고 경고,
            공개 중단, 일시 정지 또는 영구 제한 조치를 할 수 있습니다.
            긴급한 위험이나 불법행위가 의심되는 경우 관계기관에 협조할 수
            있습니다.
          </p>
        </LegalSection>

        <LegalSection title="8. 게시물과 채팅 관리">
          <LegalList>
            <li>
              이용자는 자신이 입력한 소개, 요청 메시지와 채팅 내용에 대한
              책임을 집니다.
            </li>
            <li>
              서비스는 안전한 운영과 신고 처리를 위해 필요한 범위에서
              콘텐츠를 보관·검토하거나 노출을 제한할 수 있습니다.
            </li>
            <li>
              이용자가 권리를 보유한 콘텐츠의 권리는 이용자에게 유지되며,
              서비스 제공에 필요한 범위에서 처리됩니다.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection title="9. 서비스 변경 및 종료">
          <p>
            운영자는 베타 운영 결과, 기술·보안·정책상 필요에 따라 서비스
            일부 또는 전부를 변경·중단·종료할 수 있습니다. 이용자에게
            중대한 영향이 있는 경우 가능한 방법으로 미리 안내하며, 긴급한
            보안 대응 등 사전 안내가 어려운 사유가 있으면 사후 안내할 수
            있습니다.
          </p>
        </LegalSection>

        <LegalSection title="10. 책임 제한">
          <p>
            운영자는 고의 또는 중대한 과실이 없는 한 베타 서비스의
            일시적인 중단, 이용자 간 행위, 이용자가 제공한 정보, AI 결과의
            정확성이나 특정 목적 적합성을 보증하지 않습니다. 이 조항은
            관계 법령상 제한할 수 없는 이용자의 권리를 배제하지 않습니다.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="11. 운영자 및 문의처">
          <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2">
            <dt className="font-semibold text-neutral-800">운영 주체</dt>
            <dd>{LEGAL_OPERATOR.businessName}</dd>
            <dt className="font-semibold text-neutral-800">대표자</dt>
            <dd>{LEGAL_OPERATOR.representative}</dd>
            <dt className="font-semibold text-neutral-800">주소</dt>
            <dd>{LEGAL_OPERATOR.address}</dd>
            <dt className="font-semibold text-neutral-800">이메일</dt>
            <dd className="break-all">{LEGAL_OPERATOR.contactEmail}</dd>
          </dl>
        </LegalSection>

        <LegalSection title="12. 시행일">
          <p>이 약관은 {LEGAL_EFFECTIVE_DATE}부터 시행합니다.</p>
        </LegalSection>
      </article>
    </AppShell>
  );
}
