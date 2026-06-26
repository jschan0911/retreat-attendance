const SHEET_NAMES = {
  responses: '응답',
  summary: '현황',
};

const HEADERS = [
  'ID',
  '제출시각',
  '수정시각',
  '소속교회',
  '이름',
  '성별',
  '출생연도',
  '참석여부',
  '합류일',
  '합류시간대',
  '합류메모',
  '합류표시',
  '비고',
  '상태',
];

function doPost(event) {
  try {
    const payload = parsePayload_(event);
    if (payload.action !== 'create') {
      throw new Error('지원하지 않는 작업입니다.');
    }

    const row = appendResponse_(payload);
    return json_({ ok: true, row });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function setupWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const responses = getOrCreateSheet_(ss, SHEET_NAMES.responses);
  responses.clear();
  responses.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  responses.setFrozenRows(1);
  responses.getRange('A1:N1').setFontWeight('bold').setBackground('#e7f4f2');
  responses.getRange('B:C').setNumberFormat('yyyy-mm-dd hh:mm');
  responses.getRange('I:I').setNumberFormat('yyyy-mm-dd');
  responses.autoResizeColumns(1, HEADERS.length);

  const summary = getOrCreateSheet_(ss, SHEET_NAMES.summary);
  summary.clear();
  summary.getRange('A1').setValue('수련회 참석 현황');
  summary.getRange('A1').setFontWeight('bold').setFontSize(16);
  summary.getRange('A3').setValue('전체 응답');
  summary.getRange('B3').setFormula(`=COUNTA('${SHEET_NAMES.responses}'!A2:A)`);
  summary.getRange('A5:D5').setValues([['소속교회', '풀참', '부분참', '미정']]);
  summary.getRange('A6:A8').setValues([['은정교회'], ['은현교회'], ['의정부 좋은나무교회']]);
  summary.getRange('B6:D8').setFormulas([
    [`=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A6,'${SHEET_NAMES.responses}'!$H:$H,B$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A6,'${SHEET_NAMES.responses}'!$H:$H,C$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A6,'${SHEET_NAMES.responses}'!$H:$H,D$5)`],
    [`=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A7,'${SHEET_NAMES.responses}'!$H:$H,B$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A7,'${SHEET_NAMES.responses}'!$H:$H,C$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A7,'${SHEET_NAMES.responses}'!$H:$H,D$5)`],
    [`=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A8,'${SHEET_NAMES.responses}'!$H:$H,B$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A8,'${SHEET_NAMES.responses}'!$H:$H,C$5)`, `=COUNTIFS('${SHEET_NAMES.responses}'!$D:$D,$A8,'${SHEET_NAMES.responses}'!$H:$H,D$5)`],
  ]);
  summary.getRange('A11:C11').setValues([['성별', '풀참+부분참', '미정']]);
  summary.getRange('A12:A13').setValues([['남'], ['여']]);
  summary.getRange('B12:C13').setFormulas([
    [`=COUNTIFS('${SHEET_NAMES.responses}'!$F:$F,$A12,'${SHEET_NAMES.responses}'!$H:$H,"<>미정",'${SHEET_NAMES.responses}'!$H:$H,"<>")`, `=COUNTIFS('${SHEET_NAMES.responses}'!$F:$F,$A12,'${SHEET_NAMES.responses}'!$H:$H,"미정")`],
    [`=COUNTIFS('${SHEET_NAMES.responses}'!$F:$F,$A13,'${SHEET_NAMES.responses}'!$H:$H,"<>미정",'${SHEET_NAMES.responses}'!$H:$H,"<>")`, `=COUNTIFS('${SHEET_NAMES.responses}'!$F:$F,$A13,'${SHEET_NAMES.responses}'!$H:$H,"미정")`],
  ]);
  summary.getRange('A5:D5').setFontWeight('bold').setBackground('#e7f4f2');
  summary.getRange('A11:C11').setFontWeight('bold').setBackground('#e7f4f2');
  summary.autoResizeColumns(1, 4);
}

function appendResponse_(payload) {
  validatePayload_(payload);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.responses);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  const now = new Date();
  const id = Utilities.getUuid();
  const row = [
    id,
    payload.submittedAt ? new Date(payload.submittedAt) : now,
    now,
    payload.church,
    clean_(payload.name),
    payload.gender,
    clean_(payload.birthYear),
    payload.attendance,
    clean_(payload.joinDate),
    clean_(payload.joinPeriod),
    clean_(payload.joinNote),
    clean_(payload.joinLabel),
    clean_(payload.note),
    '접수',
  ];

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function validatePayload_(payload) {
  const churches = ['은정교회', '은현교회', '의정부 좋은나무교회'];
  const genders = ['남', '여'];
  const attendances = ['풀참', '부분참', '미정'];
  const joinPeriods = [
    '새벽 (00:00~06:00)',
    '아침 (06:00~09:00)',
    '오전 (09:00~12:00)',
    '점심 (12:00~14:00)',
    '오후 (14:00~18:00)',
    '저녁 (18:00~21:00)',
    '밤 (21:00~24:00)',
  ];

  if (!churches.includes(payload.church)) throw new Error('소속 교회를 선택해주세요.');
  if (!clean_(payload.name)) throw new Error('이름을 입력해주세요.');
  if (!genders.includes(payload.gender)) throw new Error('성별을 선택해주세요.');
  if (!attendances.includes(payload.attendance)) throw new Error('참석여부를 선택해주세요.');

  if (payload.birthYear) {
    const year = Number(payload.birthYear);
    if (!Number.isInteger(year) || year < 1970 || year > new Date().getFullYear()) {
      throw new Error('출생연도를 확인해주세요.');
    }
  }

  if (['부분참', '미정'].includes(payload.attendance)) {
    if (!payload.joinDate || !payload.joinPeriod) {
      throw new Error('합류일과 시간대를 입력해주세요.');
    }
    if (!joinPeriods.includes(payload.joinPeriod)) {
      throw new Error('합류 시간대를 확인해주세요.');
    }
  }
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) return {};
  return JSON.parse(event.postData.contents);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function clean_(value) {
  return String(value || '').trim();
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
