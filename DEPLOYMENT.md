# Mood Match 베타 배포 체크리스트

## 1. GitHub에 올리기 전

프로젝트 루트에서 아래 순서로 확인합니다.

```bash
npm ci
npm run lint
npm run build
git status --short --ignored
git check-ignore .env.local
```

`.env.local`이 ignored로 표시되는지 확인하고, 스테이징 목록에 `.env`,
`.env.local`, `.env.production` 같은 환경변수 파일이 없는지 다시 확인합니다.

```bash
git add .
git diff --cached --name-only
git commit -m "Prepare beta deployment"
git branch -M main
git remote add origin <GitHub 저장소 URL>
git push -u origin main
```

이미 Git 저장소와 원격 저장소가 있다면 초기화·remote 추가 단계는 생략합니다.
환경변수 파일이 한 번이라도 커밋된 적이 있다면 단순 삭제로 끝내지 말고
아래의 비밀키 노출 대응 절차를 먼저 수행합니다.

## 2. Vercel 프로젝트 Import

1. Vercel에서 **Add New → Project**를 선택합니다.
2. 위 GitHub 저장소를 Import합니다.
3. Framework Preset이 **Next.js**인지 확인합니다.
4. GitHub 저장소 루트가 이 프로젝트 폴더라면 Root Directory는 `./`로
   둡니다. 상위 폴더까지 저장소에 포함했다면 Root Directory를
   `mood-match`로 지정합니다.
5. Build Command는 기본값인 `npm run build`를 사용합니다.
6. 아래 환경변수를 Preview와 Production 환경에 등록한 뒤 배포합니다.

## 3. Vercel 환경변수

필요한 환경변수는 아래 세 개뿐입니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
```

`OPENAI_API_KEY`에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 환경변수를
변경한 뒤에는 새 Deployment를 만들어야 변경값이 반영됩니다.

## 4. Supabase Auth URL 설정

Supabase Dashboard의 **Authentication → URL Configuration**에서 설정합니다.

```text
Site URL
https://<운영 도메인>

Redirect URLs
http://localhost:3000/auth/confirm
https://<운영 도메인>/auth/confirm
https://*-<Vercel team 또는 account slug>.vercel.app/**
```

운영 도메인은 Vercel의 고정 Production 도메인 또는 실제 Custom Domain을
사용합니다. 운영 콜백은 정확한 경로로 등록하고, 마지막 와일드카드는
Vercel Preview Deployment를 테스트할 때만 추가합니다.

현재 회원가입 코드는 브라우저의 요청 origin을 사용하므로 로컬에서는
`http://localhost:3000`, 배포 환경에서는 현재 Vercel 도메인으로 콜백을
생성합니다. 별도의 사이트 URL 환경변수는 사용하지 않습니다.

## 5. Supabase 사전 확인

- 현재 운영할 Supabase 프로젝트에 모든 SQL migration이 적용되어 있는지
  확인합니다.
- 새 Supabase 프로젝트라면 `profiles.sql` → `profile-photos.sql` →
  `personas.sql` → `visual-archetypes.sql` → `public-chat-profile.sql` →
  `conversation-requests.sql` → `direct-chat.sql` →
  `safety-moderation.sql` → `admin.sql` 순서로 SQL Editor에서 실행합니다.
- Storage의 `profile-photos` 버킷이 private인지 확인합니다.
- Realtime의 `public.messages` publication 등록 여부를 확인합니다.
  `direct-chat.sql`이 이 등록을 수행합니다.
- 최초 관리자는 `admin.sql` 상단의 주석 예시처럼 `admin_users`에 사용자
  UUID를 수동 등록합니다.
- 브라우저나 Vercel 환경변수에 service-role 또는 Supabase secret key를
  추가하지 않습니다.

## 6. 배포 후 테스트

1. 운영 URL의 랜딩·회원가입·로그인 화면을 모바일 크기로 확인합니다.
2. 첫 번째 테스트 계정 A를 가입하고 인증 이메일의 링크가 운영 도메인의
   `/auth/confirm`으로 돌아오는지 확인합니다.
3. A로 기본 프로필 작성, 사진 업로드, AI 분석, 결과 새로고침 후 DB 캐시
   재사용을 확인합니다.
4. A의 공개 캐릭터 프로필과 대화 설정을 완료해 공개합니다.
5. 별도 브라우저 또는 시크릿 창에서 두 번째 계정 B를 가입하고 같은 설정을
   완료합니다.
6. A가 B에게 대화를 신청하고 B가 수락한 뒤, 양쪽에서 메시지가 실시간으로
   보이는지 확인합니다.
7. B가 A를 신고·차단했을 때 탐색, 대화 신청, 기존 채팅 송신이 제한되는지
   확인합니다.
8. 관리자 계정으로 신고 목록과 사용자 조치가 보이고, 일반 계정은
   `/admin`에 접근할 수 없는지 확인합니다.
9. A에서 공개 프로필 비활성화와 프로필 사진 삭제를 확인합니다.
10. Vercel Function Logs에 API 키, 이미지 데이터, signed URL, Storage
    원본 경로가 기록되지 않는지 확인합니다.

## 7. 테스트 계정 삭제

베타 기간에는 Supabase Dashboard에서 운영자가 직접 처리합니다.

1. Storage의 `profile-photos/<테스트 사용자 UUID>/` 폴더 안 파일을 먼저
   삭제합니다.
2. **Authentication → Users**에서 해당 테스트 사용자를 삭제합니다.
3. 공개 탐색, 채팅 목록, 관리자 신고 화면에 불필요한 잔여 데이터가 없는지
   확인합니다.

사용자 소유 테이블 대부분은 `auth.users` 삭제에 cascade되지만 Storage
객체는 별도로 먼저 삭제합니다. 실제 공개 출시 전에는 사용자 본인 확인,
보존 의무, 신고 증거 보존 정책을 포함한 정식 계정 삭제 절차를 설계합니다.

## 8. 롤백

배포 후 문제가 생기면 Vercel 프로젝트 Overview 또는 Deployments에서
직전 정상 Production Deployment를 선택해 **Instant Rollback**을
수행합니다. Hobby 플랜은 바로 이전 Production Deployment로 롤백할 수
있습니다.

롤백은 애플리케이션 배포만 되돌립니다. Supabase SQL migration이나 데이터는
자동으로 되돌아가지 않으므로, 파괴적 migration은 별도의 복구 SQL과 백업을
준비한 뒤 실행합니다. 롤백 후 자동 Production 도메인 할당이 멈춘 경우
정상 Deployment를 다시 Promote해 자동 배포를 복구합니다.

## 9. 비밀키 노출 시

1. 노출된 키를 즉시 폐기·회전합니다. OpenAI 키는 OpenAI Dashboard에서
   새로 만들고 기존 키를 삭제합니다.
2. Vercel의 해당 환경변수를 새 값으로 교체하고 새 Deployment를 만듭니다.
3. Supabase secret/service-role 키가 노출됐다면 Supabase Dashboard에서
   관련 credential을 회전하고 영향을 받은 접근 로그를 검토합니다.
4. 키가 포함된 파일을 현재 커밋에서 제거하고 Git 기록에서도 제거한 뒤
   원격 저장소에 반영합니다. 기록 삭제만으로는 충분하지 않으므로 키 회전을
   반드시 먼저 수행합니다.
5. Vercel·Supabase·OpenAI 로그에서 비정상 호출과 비용 증가를 확인합니다.

