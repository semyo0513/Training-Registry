import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// 한글 폰트 캐싱용 변수
let cachedFontBase64 = null;

// 한글 폰트 다운로드용 신뢰할 수 있는 CDN 주소들 (순차적 폴백)
const FONT_URLS = [
  'https://fastly.jsdelivr.net/npm/@kfonts/nanum-gothic/fonts/NanumGothic-Regular.ttf',
  'https://fonts.gstatic.com/s/nanumgothic/v23/PNggR5S2yDku0h8awQq4zJ4rIKIP4A.ttf',
  'https://raw.githubusercontent.com/hangeulbyul/nanum-gothic/master/NanumGothic.ttf'
];

/**
 * TTF 폰트를 다운로드하여 Base64로 인코딩하는 헬퍼 함수
 */
async function loadFontAsBase64(onProgress) {
  if (cachedFontBase64) return cachedFontBase64;

  for (let i = 0; i < FONT_URLS.length; i++) {
    const url = FONT_URLS[i];
    try {
      if (onProgress) onProgress(`한글 폰트 다운로드 중... (${i + 1}/${FONT_URLS.length})`);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Font download failed');
      
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const raw = reader.result;
          const base64Data = raw.substring(raw.indexOf(',') + 1);
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      cachedFontBase64 = base64;
      return base64;
    } catch (err) {
      console.warn(`Font load failed from ${url}:`, err);
      // 다음 URL로 폴백
    }
  }
  throw new Error('한글 폰트를 로드할 수 없습니다. 네트워크 연결을 확인해주세요.');
}

/**
 * 연수등록부 결과 PDF 생성 및 다운로드 함수
 */
export const exportToPDF = async (training, responses, onProgress) => {
  try {
    if (onProgress) onProgress('PDF 생성 준비 중...');

    // 1. 한글 폰트 로드
    const fontBase64 = await loadFontAsBase64(onProgress);

    if (onProgress) onProgress('문서 템플릿 생성 중...');

    // 2. jsPDF 인스턴스 생성 (A4 규격, 세로 방향, 밀리미터 단위)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 3. VFS(가상 파일 시스템)에 한글 폰트 추가 및 등록
    doc.addFileToVFS('NanumGothic.ttf', fontBase64);
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');

    // 4. 표지 및 메타데이터 작성
    // 여백 정의
    const margin = 20;
    let currentY = 25;

    // 제목 렌더링
    doc.setFontSize(20);
    doc.setFont('NanumGothic', 'normal'); // 진하게 처리는 fontSize 및 간격 조절로 대응
    doc.text('연수·협의회 출석등록부', margin, currentY);
    currentY += 10;

    // 가로 구분선
    doc.setDrawColor(79, 70, 229); // Deep Indigo 컬러 매핑
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, 210 - margin, currentY);
    currentY += 12;

    // 메타데이터 테이블 (연수 정보)
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate gray

    doc.text(`연 수 명 :  ${training.title}`, margin, currentY);
    currentY += 7;
    doc.text(`일      시 :  ${training.date}`, margin, currentY);
    currentY += 7;
    doc.text(`장      소 :  ${training.location}`, margin, currentY);
    currentY += 7;
    doc.text(`등 록 인 원 :  총 ${responses.length}명`, margin, currentY);
    currentY += 12;

    // 5. 표에 들어갈 헤더와 바디 데이터 설계
    // 연수 폼 설계에서 입력 필드(구분선, 안내글 제외) 추출
    const activeModules = training.modules.filter(m => m.type !== 'divider' && m.type !== 'info_text');
    
    // 테이블 열 정의
    const columns = [
      { header: '번호', dataKey: 'index' },
      { header: '성명', dataKey: 'name' }
    ];

    // 서명 모듈이 아닌 일반 정보 필드들을 열로 추가
    const infoModules = activeModules.filter(m => m.type !== 'signature');
    infoModules.forEach(mod => {
      columns.push({ header: mod.label, dataKey: mod.id });
    });

    // 마지막 열은 항상 서명으로 구성
    const sigModule = activeModules.find(m => m.type === 'signature');
    const hasSignature = !!sigModule;
    if (hasSignature) {
      columns.push({ header: sigModule.label || '서명', dataKey: 'signature' });
    }

    // 테이블 데이터 매핑
    const rows = responses.map((resp, i) => {
      const row = {
        index: String(i + 1),
        name: resp.name
      };

      // 일반 정보 매핑
      infoModules.forEach(mod => {
        const val = resp.responses[mod.id];
        if (val === undefined || val === null) {
          row[mod.id] = '';
        } else if (Array.isArray(val)) {
          row[mod.id] = val.join(', ');
        } else {
          row[mod.id] = String(val);
        }
      });

      // 서명 매핑 (Base64 데이터를 그대로 셀 raw 값으로 전달)
      if (hasSignature) {
        row['signature'] = resp.responses[sigModule.id] || '';
      }

      return row;
    });

    // 6. jsPDF AutoTable을 사용한 렌더링
    doc.autoTable({
      columns: columns,
      body: rows,
      startY: currentY,
      margin: { left: margin, right: margin },
      styles: {
        font: 'NanumGothic',
        fontSize: 9,
        cellPadding: 4,
        valign: 'middle',
        lineColor: [226, 232, 240], // #e2e8f0
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [79, 70, 229], // #4f46e5 (Indigo)
        textColor: [255, 255, 255],
        fontStyle: 'normal',
        halign: 'center'
      },
      columnStyles: {
        index: { width: 12, halign: 'center' },
        name: { width: 22, halign: 'center' },
        signature: { width: 35, halign: 'center' }
      },
      // 셀이 그려질 때 호출되는 훅: 서명 이미지를 셀 내부에 그리기
      didDrawCell: function (data) {
        if (data.column.dataKey === 'signature' && data.cell.section === 'body') {
          const imgData = data.cell.raw;
          if (imgData && imgData.startsWith('data:image/')) {
            // 셀 영역 내에 크기 조절하여 그리기
            const cellW = data.cell.width;
            const cellH = data.cell.height;
            const padding = 2;
            
            // 이미지 비율 유지를 위해 최대 폭/높이 정의
            const targetW = cellW - padding * 2;
            const targetH = cellH - padding * 2;
            
            // 캔버스 이미지 그리기
            const x = data.cell.x + padding;
            const y = data.cell.y + padding;
            
            try {
              doc.addImage(imgData, 'PNG', x, y, targetW, targetH);
            } catch (e) {
              console.error('Failed to add image to PDF cell:', e);
            }
          }
        }
      },
      // 행 높이 제어 (서명 이미지가 들어갈 수 있게 높이 확보)
      willDrawCell: function (data) {
        if (data.column.dataKey === 'signature' && data.cell.section === 'body') {
          // 서명 열의 경우 행 높이를 14mm로 유지하도록 설정
          data.row.height = 14;
        }
      }
    });

    // 7. PDF 저장
    const sanitizedTitle = training.title.replace(/[\\/:*?"<>|]/g, '_');
    doc.save(`출석등록부_${sanitizedTitle}.pdf`);
    
    if (onProgress) onProgress(null); // 완료 처리
  } catch (err) {
    console.error('PDF generation error:', err);
    if (onProgress) onProgress(null);
    throw err;
  }
};
