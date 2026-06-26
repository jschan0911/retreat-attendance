# 수련회 인원 조사용 웹앱

GitHub Pages에 올릴 수 있는 정적 참석 조사 페이지와 Google Apps Script 백엔드입니다.

## 현재 기능

- 소속 교회: 은정교회, 은현교회, 의정부 좋은나무교회
- 필수 입력: 이름, 성별, 참석여부
- 선택 입력: 출생연도, 비고
- 참석여부: 풀참, 부분참, 미정
- 부분참/미정 선택 시 합류일, 시간대, 메모 입력
- 부분참/미정 선택 시 퇴소 예정일, 시간대, 메모 입력
- Google Sheet `응답` 시트에 즉시 행 추가
- Google Sheet `현황` 시트에 교회별/성별 요약 자동 생성
- `admin.html`에서 전체 응답 조회, 수정, 삭제
- 납부상태, 납부금액, 납부방식, 납부메모 관리
- GPT Actions용 스키마와 Builder 프롬프트 제공

## Google Apps Script 연결

1. Google 스프레드시트를 새로 만듭니다.
2. `확장 프로그램 > Apps Script`를 엽니다.
3. `apps-script/Code.gs` 내용을 붙여넣습니다.
4. Apps Script 편집기에서 `setupWorkbook` 함수를 한 번 실행하고 권한을 승인합니다.
5. `배포 > 새 배포 > 웹 앱`으로 배포합니다.
6. 실행 권한은 본인, 접근 권한은 링크가 있는 모든 사용자로 설정합니다.
7. 발급된 웹 앱 URL을 `config.js`의 `SCRIPT_URL`에 넣습니다.

기존 시트를 유지하면서 새 컬럼만 반영하려면 Apps Script에서 `migrateWorkbookSchema` 함수를 한 번 실행합니다. `setupWorkbook`은 기존 응답을 초기화하므로 다시 실행하지 마세요.

## GitHub Pages

`index.html`, `styles.css`, `app.js`, `config.js`를 저장소 루트에 둔 상태로 GitHub Pages를 켜면 됩니다.

운영 페이지는 `admin.html`입니다. 임시 내부용 페이지라 링크를 아는 사람이 전체 응답을 조회, 수정, 삭제할 수 있습니다.

## GPT Actions

- Action schema: `docs/gpt-action-schema.yaml`
- GPT Builder prompt: `docs/gpt-builder-prompt.md`
