/**
   * 엑셀에서 깨짐 없이 열 수 있는 UTF-8 BOM이 추가된 CSV 다운로드 유틸리티
   */
export const exportToCSV = (filename, headers, rows) => {
  // headers: ['제출시간', '성명', '위원 구분', '서명 여부']
  // rows: [['2026-06-26 13:10', '홍길동', '교원위원', '서명 완료']]

  const escapeCSVField = (val) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    
    // 서명 Base64 데이터 등이 들어왔을 경우 파일 비대화 및 파싱 방지를 위해 텍스트 치환
    if (str.startsWith('data:image/')) {
      return '[서명 완료]';
    }
    
    // 따옴표가 있으면 이스케이프
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  const csvHeader = headers.map(escapeCSVField).join(',');
  const csvBody = rows
    .map(row => row.map(escapeCSVField).join(','))
    .join('\r\n');

  const csvContent = '\uFEFF' + csvHeader + '\r\n' + csvBody; // UTF-8 BOM 삽입

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
