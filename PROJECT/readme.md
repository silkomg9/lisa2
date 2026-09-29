# 고객노트 — 정적 웹 MVP

`index.html`을 브라우저에서 열면 바로 사용할 수 있습니다. 설치나 빌드가 필요 없습니다.

## 파일 안내

- `index.html`: 고객 검색 / 최근 조회 고객
- `detail.html`: 고객 상세 / 구매·상담 이력 / 상담 메모 입력
- `new-customer.html`: 신규 고객 등록
- `memo-review.html`: 메모 분류 수정 / 다음 응대 메모 / 공개 범위
- `css/style.css`: 모든 화면의 색상, 글자 크기, 레이아웃, 모바일 스타일
- `js/mock-data.js`: 샘플 고객과 구매 기록
- `js/app.js`: 검색, 화면 표시, 등록, 메모 분류 및 저장

## 사용 흐름

고객 이름(예: 김서연)이나 전화번호 끝자리(예: 1201)를 검색하고 고객을 선택합니다. 두 항목을 입력하면 모두 일치하는 고객을 찾습니다. 상담 메모 작성 후 분류 결과를 수정하고 저장합니다. 신규 고객은 등록 후 바로 상세 화면으로 이동합니다.

서비스명이 정해져 있지 않아 화면에는 임시로 ‘고객노트’를 사용했습니다.

## 데이터와 수정

Supabase 클라이언트 연결 설정을 추가했습니다. 이메일 회원가입·로그인·로그아웃은 Supabase Auth로 연결했습니다. 고객 데이터의 DB 조회·저장 전환과 외부 AI API는 아직 구현하지 않았습니다. 자동 분류는 JavaScript 키워드 기반 Mock이며 직접 수정할 수 있습니다. 공개 범위는 저장되는 표시 값으로, 실제 보안 또는 권한 제어가 아닙니다.

고객과 메모는 현재 브라우저의 localStorage에, 작성 중인 메모는 sessionStorage에 저장합니다. 다른 브라우저·기기와 공유되지 않으며 브라우저 데이터를 삭제하면 사라집니다. 일부 브라우저는 파일 직접 열기에서 저장을 제한할 수 있습니다. 그 경우 정적 호스팅에서 이용하세요. 데이터 저장에 실패하면 안내를 표시하고 저장 완료 화면으로 넘어가지 않습니다.

샘플 수정 후 기존 저장 데이터가 남아 있으면 수정된 샘플 대신 저장 데이터가 표시됩니다. 개발자 도구 → Application/Storage에서 `customer-note-data-v1` 키를 삭제하면 새 샘플을 불러옵니다. 이 작업은 해당 브라우저에서 추가한 고객과 메모도 삭제합니다.

## Vercel 배포

저장소 전체를 연결했다면 Vercel의 Root Directory는 저장소 최상위(기본값)로 둡니다. 최상위 `vercel.json`이 `PROJECT` 폴더를 배포 대상으로 지정합니다. 이미 Root Directory를 `PROJECT`로 설정했다면 그대로 사용해도 됩니다. 이 경우 `PROJECT/vercel.json`이 현재 폴더(`.`)를 배포합니다.

두 설정 모두 Framework는 Other이며 설치·빌드 명령 없이 HTML/CSS/JavaScript를 배포합니다. 파일 변경 후 GitHub 등 연결된 저장소에 커밋·푸시해야 새 설정이 적용됩니다. Vercel의 Deployments에서 최신 커밋으로 생성된 배포가 Ready인지 확인하고 해당 배포의 Visit 주소를 여세요. 이전 커밋을 재배포하면 새 설정이 반영되지 않습니다.

404가 계속되면 Root Directory가 실제 존재하는 경로인지, 최신 배포의 출력에 `index.html`이 포함됐는지 확인합니다. Root Directory는 대소문자를 구분하며 하위 폴더를 지정할 경우 `PROJECT`입니다. 브라우저 새로고침만으로 배포 설정이 변경되지는 않습니다.

## 추가 기능 진행 상태

- 고객 상세에서 구매 내용, 총 금액, 구매 일시, 메모를 입력할 수 있습니다. 구매 기록은 시간순 이력과 최근 구매에 반영됩니다. 과거 구매 입력은 마지막 방문일을 과거로 바꾸지 않습니다.
- 현재 고객·구매·상담 저장 방식은 기존 브라우저 저장소입니다. 실제 DB 연결은 아직 완료하지 않았습니다.
- `database/schema.sql`은 Supabase용 고객·구매·상담 테이블 초안입니다. 실제 프로젝트에는 적용하지 않았으며, 고객 정보 접근 방식을 확정한 다음 RLS 정책과 데이터 연결 코드를 추가해야 합니다.
- 카카오톡 자동 연동은 미구현입니다. 개인 채팅 내용을 읽는 공식 API는 제공되지 않습니다. 개인 채팅은 내보낸 텍스트를 가져오는 방식, 채널 상담은 상담톡 제공업체 API 연동 방식 중 실제 사용 환경에 맞춰 결정해야 합니다.
- 카카오톡 연동에는 개인 채팅/채널 상담 구분과 실제 연동 방식 결정이 필요합니다.

## Supabase 클라이언트 연결

로그인·회원가입을 포함한 여섯 HTML 화면에서 `@supabase/supabase-js@2`를 jsDelivr CDN으로 먼저 불러오고, `js/supabase-client.js`에서 제공받은 프로젝트 URL과 공개 Publishable Key로 클라이언트를 생성합니다. 모두 `defer`로 순서대로 실행합니다.

- CDN 라이브러리: `window.supabase`
- 앱에서 사용할 클라이언트: `window.customerDb`
- `js/auth.js`가 세션 확인과 상태 변경을 처리합니다. 세션 유지, 자동 갱신, 이메일 인증 URL 감지를 사용합니다.
- Secret Key 사용 없음.
- CDN 또는 초기화 실패 시 `window.customerDb`는 `null`이며 콘솔에 안내를 남깁니다. 로그인 확인 화면에서 재시도를 안내하며 고객 화면을 공개하지 않습니다.
- 클라이언트 생성만으로 DB 테이블이 만들어지거나 고객이 DB에 저장되지는 않습니다. 현재 저장은 기존 localStorage 방식입니다. 테이블 및 접근 정책을 준비한 뒤 별도로 조회·저장 코드를 연결해야 합니다.

공식 문서: https://supabase.com/docs/reference/javascript/installing

## 이메일 인증 사용 및 배포 설정

- `signup.html`: 이메일과 비밀번호 회원가입. 이메일 확인이 활성화된 프로젝트에서는 확인 메일 안내를 표시합니다. 인증 없이 세션이 발급되면 바로 메인으로 이동합니다.
- `login.html`: 이메일과 비밀번호 로그인. 성공하면 `index.html`로 이동합니다.
- 고객 관리 네 화면은 세션 확인이 끝난 뒤 표시합니다. 비로그인 방문은 로그인 화면으로 이동합니다. 상단에 이메일과 로그아웃 버튼이 표시되며, 로그아웃은 현재 브라우저 세션을 종료합니다.
- 새로고침 시 `getSession`, 인증 변경 시 `onAuthStateChange`로 화면을 갱신합니다. CDN/네트워크 오류는 재시도 화면에 표시합니다.
- Supabase Dashboard → Authentication → Providers의 Email 공급자가 활성화되어 있어야 합니다. Authentication → URL Configuration에서 Site URL을 실제 서비스 주소로, Redirect URLs에 `https://passenger-amber.vercel.app/login.html`을 등록하세요. 하위 경로로 서비스한다면 실제 `/PROJECT/login.html` 주소를 등록합니다.
- 확인 메일의 발송 가능 여부와 속도 제한은 Supabase의 메일 설정에 따릅니다. 이 작업에서는 관리자 설정을 변경하거나 테스트 가입 메일을 발송하지 않았습니다.
- 고객 데이터는 계속 브라우저 localStorage에 저장되며 계정별로 분리되지 않습니다. 로그인 기능을 추가한 것이며, 고객 데이터 DB 저장·RLS 접근 제한은 아직 구현하지 않았습니다.

## 비밀번호 재설정

로그인·회원가입 화면의 비밀번호 재설정 링크 → `reset-password.html`에서 가입 이메일 입력 → 받은 메일의 링크에서 새 비밀번호와 확인값 입력 → 저장 순서입니다. Supabase `resetPasswordForEmail`과 `updateUser`를 사용합니다. 이미 유효한 로그인 세션이 있으면 새 비밀번호 입력 화면을 표시합니다.

Supabase Authentication → URL Configuration에서 Site URL을 `https://passenger-amber.vercel.app`로 변경하고 Redirect URLs에 `https://passenger-amber.vercel.app/reset-password.html`도 등록해야 합니다. `/PROJECT/` 경로로 서비스한다면 실제 하위 경로의 재설정 주소를 등록합니다. 기존 localhost 설정이 남으면 인증 메일이 올바른 화면으로 돌아오지 못할 수 있습니다. 이번 코드 작업에서는 Supabase 관리자 설정을 변경하지 않았습니다.

중복 가입 오류는 로그인·재설정으로 안내합니다. Supabase가 가입 여부를 숨기는 응답을 보낼 때는 가입 여부를 단정하지 않습니다. 고객노트 사용자 계정의 비밀번호 재설정이며 Supabase 관리자 계정의 비밀번호를 바꾸는 기능은 아닙니다.
