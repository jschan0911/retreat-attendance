# 수련회 인원 조사용 웹앱

GitHub Pages에 올릴 수 있는 정적 참석 조사 페이지와 Google Apps Script 백엔드입니다.

## 현재 기능

- 소속 교회: 은정교회, 은현교회, 의정부 좋은나무교회
- 필수 입력: 이름, 성별, 참석여부
- 선택 입력: 출생연도, 비고
- 참석여부: 풀참, 부분참, 미정
- 부분참/미정 선택 시 합류일, 시간대, 메모 입력
- Google Sheet `응답` 시트에 즉시 행 추가
- Google Sheet `현황` 시트에 교회별/성별 요약 자동 생성
- `admin.html`에서 관리자 키 기반 조회, 수정, 삭제

## Google Apps Script 연결

1. Google 스프레드시트를 새로 만듭니다.
2. `확장 프로그램 > Apps Script`를 엽니다.
3. `apps-script/Code.gs` 내용을 붙여넣습니다.
4. Apps Script 편집기에서 `setupWorkbook` 함수를 한 번 실행하고 권한을 승인합니다.
5. `프로젝트 설정 > 스크립트 속성`에 `ADMIN_KEY`를 추가하고 관리자 키 값을 넣습니다.
6. `배포 > 새 배포 > 웹 앱`으로 배포합니다.
7. 실행 권한은 본인, 접근 권한은 링크가 있는 모든 사용자로 설정합니다.
8. 발급된 웹 앱 URL을 `config.js`의 `SCRIPT_URL`에 넣습니다.

## GitHub Pages

`index.html`, `styles.css`, `app.js`, `config.js`를 저장소 루트에 둔 상태로 GitHub Pages를 켜면 됩니다.

관리자 페이지는 `admin.html`입니다. 관리자 키는 저장소에 넣지 말고 Apps Script의 `ADMIN_KEY` 스크립트 속성에만 둡니다.
