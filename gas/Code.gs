/**
 * 📋 모두의 연수등록부 - Google Apps Script (Code.gs)
 * 
 * 이 스크립트는 Google Sheets를 데이터베이스로 활용하여
 * 연수 목록 관리, 커스텀 폼 스키마 저장, 참석자 응답 및 서명 데이터를 수집하는 백엔드 API 서비스입니다.
 */

// 1. 전역 시트 명 정의
const SHEET_TRAININGS = 'trainings';
const SHEET_ADMINS = 'admins';

// -------------------------------------------------------------
// 2. 진입점: GET 요청 (doGet)
// -------------------------------------------------------------
function doGet(e) {
  try {
    initSheets(); // 시트 및 초기 설정 자동화

    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getTrainings':
        result = getTrainings();
        break;
      case 'getForm':
        result = getForm(e.parameter.id);
        break;
      case 'getResponses':
        result = getResponses(e.parameter.id);
        break;
      default:
        return errorResponse('정의되지 않은 GET 액션입니다: ' + action);
    }
    return successResponse(result);
  } catch (err) {
    return errorResponse(err.toString());
  }
}

// -------------------------------------------------------------
// 3. 진입점: POST 요청 (doPost)
// -------------------------------------------------------------
function doPost(e) {
  try {
    initSheets(); // 시트 및 초기 설정 자동화

    if (!e.postData || !e.postData.contents) {
      return errorResponse('요청 본문(Body) 데이터가 비어 있습니다.');
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result;

    switch (action) {
      case 'adminLogin':
        result = adminLogin(payload.password);
        break;
      case 'createTraining':
        result = createTraining(payload.title, payload.date, payload.location, payload.modules);
        break;
      case 'updateForm':
        result = updateForm(payload.id, payload.modules);
        break;
      case 'deleteTraining':
        result = deleteTraining(payload.id);
        break;
      case 'submitResponse':
        result = submitResponse(payload.trainingId, payload.name, payload.responses);
        break;
      default:
        return errorResponse('정의되지 않은 POST 액션입니다: ' + action);
    }
    return successResponse(result);
  } catch (err) {
    return errorResponse(err.toString());
  }
}

// -------------------------------------------------------------
// 4. 공통 JSON 응답 포맷터 (CORS 지원)
// -------------------------------------------------------------
function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// 5. 핵심 DB 시트 초기화 (자동 테이블 생성)
// -------------------------------------------------------------
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 5-1. trainings 시트가 없을 경우 자동 생성 (ID, 연수명, 날짜, 장소, 모듈 스키마 JSON, 생성일)
  let trSheet = ss.getSheetByName(SHEET_TRAININGS);
  if (!trSheet) {
    trSheet = ss.insertSheet(SHEET_TRAININGS);
    trSheet.appendRow(['id', 'title', 'date', 'location', 'modules', 'createdAt']);
    trSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#eaeaea');
  }

  // 5-2. admins 시트가 없을 경우 자동 생성 및 기본 비번 '1234' 시딩
  let adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(SHEET_ADMINS);
    adminSheet.appendRow(['id', 'password']);
    adminSheet.getRange('A1:B1').setFontWeight('bold').setBackground('#eaeaea');
    adminSheet.appendRow(['admin', '1234']); // 기본 관리자 계정
  }
}

// -------------------------------------------------------------
// 6. 데이터베이스 쿼리 및 제어 함수군 (CRUD)
// -------------------------------------------------------------

// 6-1. 연수 리스트 조회
function getTrainings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  const rows = sheet.getDataRange().getValues();
  
  const headers = rows[0];
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = {};
    headers.forEach((h, hIdx) => {
      if (h === 'modules') {
        try {
          item[h] = JSON.parse(row[hIdx]);
        } catch (e) {
          item[h] = [];
        }
      } else {
        item[h] = row[hIdx];
      }
    });
    list.push(item);
  }
  
  // 생성일 기준 최신순 정렬
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

// 6-2. 특정 연수 양식 가져오기
function getForm(id) {
  const list = getTrainings();
  const tr = list.find(item => item.id === id);
  if (!tr) throw new Error('해당 연수를 찾을 수 없습니다: ' + id);
  return tr;
}

// 6-3. 관리자 로그인 확인
function adminLogin(password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    // 문자열 비교 (간단비교)
    if (String(rows[i][1]) === String(password)) {
      return { success: true };
    }
  }
  throw new Error('비밀번호가 일치하지 않습니다.');
}

// 6-4. 새 연수 생성
function createTraining(title, date, location, modules) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  
  const newId = 'tr_' + new Date().getTime() + Math.floor(Math.random() * 10);
  const modulesJson = JSON.stringify(modules || []);
  const createdAt = new Date().toISOString();

  // trainings 테이블에 삽입
  sheet.appendRow([newId, title, date, location, modulesJson, createdAt]);

  // 해당 연수를 위한 고유 응답 수집용 서브 시트 생성 (responses_{newId})
  const respSheetName = 'responses_' + newId;
  let respSheet = ss.getSheetByName(respSheetName);
  if (!respSheet) {
    respSheet = ss.insertSheet(respSheetName);
    // 기본 헤더 칼럼 구성 (제출일시, 이름, 직렬화된 응답 JSON)
    respSheet.appendRow(['timestamp', 'name', 'responses']);
    respSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#d1fae5');
  }

  return { id: newId, title, date, location, modules, createdAt };
}

// 6-5. 연수 폼 스키마 수정
function updateForm(id, modules) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  const rows = sheet.getDataRange().getValues();
  
  let foundRowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRowIdx = i + 1; // 1-based index 및 헤더 보정
      break;
    }
  }

  if (foundRowIdx === -1) throw new Error('양식을 변경하려는 연수를 찾지 못했습니다.');

  const modulesJson = JSON.stringify(modules || []);
  sheet.getRange(foundRowIdx, 5).setValue(modulesJson); // modules 칼럼은 E열(5번째)

  return { success: true };
}

// 6-6. 연수 삭제
function deleteTraining(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  const rows = sheet.getDataRange().getValues();

  let foundRowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRowIdx = i + 1;
      break;
    }
  }

  if (foundRowIdx !== -1) {
    sheet.deleteRow(foundRowIdx);
  }

  // 연결된 응답 시트도 함께 완전히 삭제
  const respSheetName = 'responses_' + id;
  const respSheet = ss.getSheetByName(respSheetName);
  if (respSheet) {
    ss.deleteSheet(respSheet);
  }

  return { success: true };
}

// 6-7. 참가자 출석 정보 응답 제출
function submitResponse(trainingId, name, responses) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respSheetName = 'responses_' + trainingId;
  const sheet = ss.getSheetByName(respSheetName);

  if (!sheet) throw new Error('응답을 수집할 출석 시트가 존재하지 않습니다.');

  const timestamp = new Date().toISOString();
  const responsesJson = JSON.stringify(responses || {});

  // 응답 데이터 기록
  sheet.appendRow([timestamp, name, responsesJson]);

  return { success: true };
}

// 6-8. 특정 연수 응답 결과 리스트 가져오기
function getResponses(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respSheetName = 'responses_' + id;
  const sheet = ss.getSheetByName(respSheetName);

  if (!sheet) return []; // 응답 시트가 아직 없을 경우 빈 배열 반환

  const rows = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let respData = {};
    try {
      respData = JSON.parse(row[2]); // C열에 저장된 JSON 응답 데이터 파싱
    } catch (e) {
      respData = {};
    }

    list.push({
      timestamp: row[0],
      name: row[1],
      responses: respData
    });
  }

  return list;
}
