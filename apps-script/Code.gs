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

const CHURCHES = ['은정교회', '은현교회', '의정부 좋은나무교회'];
const GENDERS = ['남', '여'];
const ATTENDANCES = ['풀참', '부분참', '미정'];
const JOIN_PERIODS = [
  '새벽 (00:00~06:00)',
  '아침 (06:00~09:00)',
  '오전 (09:00~12:00)',
  '점심 (12:00~14:00)',
  '오후 (14:00~18:00)',
  '저녁 (18:00~21:00)',
  '밤 (21:00~24:00)',
];
const STATUSES = ['접수', '확인', '취소'];

function doGet(event) {
  try {
    const payload = parseQueryPayload_(event);
    const result = handleAction_(payload);
    return jsonp_(result, event);
  } catch (error) {
    return jsonp_({ ok: false, message: error.message }, event);
  }
}

function doPost(event) {
  try {
    const payload = parsePayload_(event);
    return json_(handleAction_(payload));
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

function handleAction_(payload) {
  if (payload.action === 'create') {
    return { ok: true, row: appendResponse_(payload), rows: listResponses_() };
  }
  if (payload.action === 'list') {
    return { ok: true, rows: listResponses_() };
  }
  if (payload.action === 'update') {
    updateResponse_(payload);
    return { ok: true, rows: listResponses_() };
  }
  if (payload.action === 'delete') {
    deleteResponse_(payload.id);
    return { ok: true, rows: listResponses_() };
  }

  throw new Error('지원하지 않는 관리자 작업입니다.');
}

function listResponses_() {
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.responses);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter((row) => row[0])
    .map((row) => ({
      id: row[0],
      submittedAt: formatDateTime_(row[1]),
      updatedAt: formatDateTime_(row[2]),
      church: row[3],
      name: row[4],
      gender: row[5],
      birthYear: row[6],
      attendance: row[7],
      joinDate: formatDate_(row[8]),
      joinPeriod: row[9],
      joinNote: row[10],
      joinLabel: row[11],
      note: row[12],
      status: row[13],
    }));
}

function updateResponse_(payload) {
  validatePayload_(payload);
  if (!STATUSES.includes(payload.status)) throw new Error('상태를 확인해주세요.');

  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.responses);
  const rowNumber = findRowById_(sheet, payload.id);
  const current = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const row = [
    current[0],
    current[1],
    new Date(),
    payload.church,
    clean_(payload.name),
    payload.gender,
    clean_(payload.birthYear),
    payload.attendance,
    clean_(payload.joinDate),
    clean_(payload.joinPeriod),
    clean_(payload.joinNote),
    buildJoinLabel_(payload),
    clean_(payload.note),
    payload.status,
  ];

  sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
}

function deleteResponse_(id) {
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.responses);
  sheet.deleteRow(findRowById_(sheet, id));
}

function findRowById_(sheet, id) {
  const cleanId = clean_(id);
  if (!cleanId) throw new Error('ID가 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('응답이 없습니다.');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const index = ids.findIndex((row) => row[0] === cleanId);
  if (index === -1) throw new Error('대상을 찾을 수 없습니다.');
  return index + 2;
}

function validatePayload_(payload) {
  if (!CHURCHES.includes(payload.church)) throw new Error('소속 교회를 선택해주세요.');
  if (!clean_(payload.name)) throw new Error('이름을 입력해주세요.');
  if (!GENDERS.includes(payload.gender)) throw new Error('성별을 선택해주세요.');
  if (!ATTENDANCES.includes(payload.attendance)) throw new Error('참석여부를 선택해주세요.');

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
    if (!JOIN_PERIODS.includes(payload.joinPeriod)) {
      throw new Error('합류 시간대를 확인해주세요.');
    }
  }
}

function buildJoinLabel_(payload) {
  return [payload.joinDate, payload.joinPeriod, payload.joinNote].filter(Boolean).join(' / ');
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) return {};
  return JSON.parse(event.postData.contents);
}

function parseQueryPayload_(event) {
  if (!event || !event.parameter) return {};
  if (event.parameter.payload) return JSON.parse(event.parameter.payload);
  return event.parameter;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function clean_(value) {
  return String(value || '').trim();
}

function formatDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return clean_(value);
}

function formatDateTime_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  return clean_(value);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(data, event) {
  const callback = event && event.parameter && event.parameter.callback;
  const body = callback
    ? `${callback}(${JSON.stringify(data)});`
    : JSON.stringify(data);

  return ContentService
    .createTextOutput(body)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
