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
      // GET 액션의 POST 폴백 지원 (CORS 및 단순 페치 지원용)
      case 'getTrainings':
        result = getTrainings();
        break;
      case 'getForm':
        result = getForm(payload.id);
        break;
      case 'getResponses':
        result = getResponses(payload.id);
        break;
      // 기존 POST 액션
      case 'adminLogin':
        result = adminLogin(payload.id || 'admin', payload.password);
        break;
      case 'adminRegister':
        result = adminRegister(payload.id, payload.password, payload.orgName);
        break;
      case 'createTraining':
        result = createTraining(payload.title, payload.date, payload.location, payload.modules, payload.participants, payload.orgId, payload.orgName);
        break;
      case 'updateForm':
        result = updateForm(payload.id, payload.modules);
        break;
      case 'updateTraining':
        result = updateTraining(payload.id, payload.title, payload.date, payload.location, payload.participants, payload.orgId, payload.orgName);
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
  
  // 5-1. trainings 시트가 없을 경우 자동 생성 (ID, 연수명, 날짜, 장소, 모듈 스키마 JSON, 생성일, 사전참석자명단, 기관정보)
  let trSheet = ss.getSheetByName(SHEET_TRAININGS);
  if (!trSheet) {
    trSheet = ss.insertSheet(SHEET_TRAININGS);
    trSheet.appendRow(['id', 'title', 'date', 'location', 'modules', 'createdAt', 'participants', 'orgId', 'orgName']);
    trSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#eaeaea');
  } else {
    // 기존 시트에 participants, orgId, orgName 컬럼이 없으면 헤더에 추가
    let headers = trSheet.getRange(1, 1, 1, trSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('participants') === -1) {
      trSheet.getRange(1, trSheet.getLastColumn() + 1).setValue('participants');
      trSheet.getRange(1, trSheet.getLastColumn()).setFontWeight('bold').setBackground('#eaeaea');
      headers = trSheet.getRange(1, 1, 1, trSheet.getLastColumn()).getValues()[0];
    }
    if (headers.indexOf('orgId') === -1) {
      trSheet.getRange(1, trSheet.getLastColumn() + 1).setValue('orgId');
      trSheet.getRange(1, trSheet.getLastColumn()).setFontWeight('bold').setBackground('#eaeaea');
      headers = trSheet.getRange(1, 1, 1, trSheet.getLastColumn()).getValues()[0];
    }
    if (headers.indexOf('orgName') === -1) {
      trSheet.getRange(1, trSheet.getLastColumn() + 1).setValue('orgName');
      trSheet.getRange(1, trSheet.getLastColumn()).setFontWeight('bold').setBackground('#eaeaea');
    }
  }

  // 5-2. admins 시트가 없을 경우 자동 생성 및 기본 비번 '1234' 시딩
  let adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(SHEET_ADMINS);
    adminSheet.appendRow(['id', 'password', 'orgName']);
    adminSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#eaeaea');
    adminSheet.appendRow(['admin', '1234', '시스템 관리자']); // 기본 관리자 계정
  } else {
    const headers = adminSheet.getRange(1, 1, 1, adminSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('orgName') === -1) {
      adminSheet.getRange(1, adminSheet.getLastColumn() + 1).setValue('orgName');
      adminSheet.getRange(1, adminSheet.getLastColumn()).setFontWeight('bold').setBackground('#eaeaea');
      // 기존 admin 계정에 시스템 관리자 이름 부여
      const rows = adminSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'admin') {
          adminSheet.getRange(i + 1, adminSheet.getLastColumn()).setValue('시스템 관리자');
        }
      }
    }
  }
}

// -------------------------------------------------------------
// 6. 데이터베이스 쿼리 및 제어 함수군 (CRUD)
// -------------------------------------------------------------

// 6-1. 연수 리스트 조회
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
      if (h === 'modules' || h === 'participants') {
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
// 6-3. 관리자 로그인 확인
function adminLogin(id, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idCol = headers.indexOf('id');
  const pwCol = headers.indexOf('password');
  const nameCol = headers.indexOf('orgName');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[idCol]).trim() === String(id).trim() && String(row[pwCol]).trim() === String(password).trim()) {
      return {
        success: true,
        orgId: String(row[idCol]).trim(),
        orgName: nameCol !== -1 ? String(row[nameCol]).trim() : '기본 기관'
      };
    }
  }
  throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
}

// 6-3-2. 기관 회원가입 등록
function adminRegister(id, password, orgName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idCol = headers.indexOf('id');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]).trim() === String(id).trim()) {
      throw new Error('이미 존재하는 기관 아이디입니다.');
    }
  }

  const rowData = [];
  headers.forEach(h => {
    if (h === 'id') rowData.push(id.trim());
    else if (h === 'password') rowData.push(password.trim());
    else if (h === 'orgName') rowData.push(orgName.trim());
    else rowData.push('');
  });
  sheet.appendRow(rowData);
  return { success: true, orgId: id, orgName: orgName };
}

// 6-4. 새 연수 생성
function createTraining(title, date, location, modules, participants, orgId, orgName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  
  const newId = 'tr_' + new Date().getTime() + Math.floor(Math.random() * 10);
  const modulesJson = JSON.stringify(modules || []);
  const participantsJson = JSON.stringify(participants || []);
  const createdAt = new Date().toISOString();

  // 헤더 컬럼 목록 조회
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = [];
  headers.forEach(h => {
    if (h === 'id') rowData.push(newId);
    else if (h === 'title') rowData.push(title);
    else if (h === 'date') rowData.push(date);
    else if (h === 'location') rowData.push(location);
    else if (h === 'modules') rowData.push(modulesJson);
    else if (h === 'createdAt') rowData.push(createdAt);
    else if (h === 'participants') rowData.push(participantsJson);
    else if (h === 'orgId') rowData.push(orgId || 'admin');
    else if (h === 'orgName') rowData.push(orgName || '시스템 관리자');
    else rowData.push('');
  });
  sheet.appendRow(rowData);

  // 해당 연수를 위한 고유 응답 수집용 서브 시트 생성 (responses_{newId})
  const respSheetName = 'responses_' + newId;
  let respSheet = ss.getSheetByName(respSheetName);
  if (!respSheet) {
    respSheet = ss.insertSheet(respSheetName);
    // 기본 헤더 칼럼 구성 (제출일시, 이름, 직렬화된 응답 JSON)
    respSheet.appendRow(['timestamp', 'name', 'responses']);
    respSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#d1fae5');
  }

  return { id: newId, title, date, location, modules, createdAt, participants, orgId, orgName };
}

// 6-5. 연수 폼 스키마 수정
function updateForm(id, modules) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let foundRowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRowIdx = i + 1; // 1-based index 및 헤더 보정
      break;
    }
  }

  if (foundRowIdx === -1) throw new Error('양식을 변경하려는 연수를 찾지 못했습니다.');

  const modulesJson = JSON.stringify(modules || []);
  const colIdx = headers.indexOf('modules') + 1;
  if (colIdx > 0) {
    sheet.getRange(foundRowIdx, colIdx).setValue(modulesJson);
  } else {
    sheet.getRange(foundRowIdx, 5).setValue(modulesJson);
  }

  return { success: true };
}

// 6-5-2. 연수 정보 및 사전참가자 명단 수정
function updateTraining(id, title, date, location, participants, orgId, orgName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRAININGS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let foundRowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRowIdx = i + 1; // 1-based index
      break;
    }
  }

  if (foundRowIdx === -1) throw new Error('정보를 변경하려는 연수를 찾지 못했습니다.');

  const participantsJson = JSON.stringify(participants || []);

  headers.forEach((h, hIdx) => {
    const colIdx = hIdx + 1;
    if (h === 'title') sheet.getRange(foundRowIdx, colIdx).setValue(title);
    else if (h === 'date') sheet.getRange(foundRowIdx, colIdx).setValue(date);
    else if (h === 'location') sheet.getRange(foundRowIdx, colIdx).setValue(location);
    else if (h === 'participants') sheet.getRange(foundRowIdx, colIdx).setValue(participantsJson);
    else if (h === 'orgId') sheet.getRange(foundRowIdx, colIdx).setValue(orgId || 'admin');
    else if (h === 'orgName') sheet.getRange(foundRowIdx, colIdx).setValue(orgName || '시스템 관리자');
  });

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
  
  // 첨부파일 처리 (file_upload가 있을 때 드라이브에 저장하고 URL로 대체)
  const processedResponses = {};
  for (const key in responses) {
    const val = responses[key];
    if (val && typeof val === 'object' && val.base64 && val.filename) {
      try {
        const fileUrl = uploadFileToDrive(val.base64, val.filename);
        processedResponses[key] = fileUrl; // URL 링크로 대체 저장
      } catch (e) {
        processedResponses[key] = '[파일 저장 실패: ' + e.toString() + ']';
      }
    } else {
      processedResponses[key] = val;
    }
  }

  const responsesJson = JSON.stringify(processedResponses);

  // 응답 데이터 기록
  sheet.appendRow([timestamp, name, responsesJson]);

  return { success: true };
}

// 6-9. 첨부파일을 구글 드라이브에 업로드하고 다운로드 링크 반환
function uploadFileToDrive(base64Data, filename) {
  const folderName = "모두의연수등록부_첨부파일";
  let folder;
  
  // 폴더가 존재하는지 조회
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  // Base64 데이터 파싱 (예: "data:application/pdf;base64,JVBER...")
  const parts = base64Data.split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const rawData = parts[1];
  
  const decoded = Utilities.base64Decode(rawData);
  const blob = Utilities.newBlob(decoded, contentType, filename);
  const file = folder.createFile(blob);
  
  // 누구나 링크로 다운로드 가능하도록 보기 권한 부여
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
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
