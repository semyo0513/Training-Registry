import { api } from '../utils/api';
import { exportToCSV } from '../utils/csv';
import { exportToPDF } from '../utils/pdf';
import { showToast } from '../utils/toast';

export class ResponseView {
  constructor(container, options = {}) {
    this.container = container;
    this.trainingId = options.trainingId || null;
    
    this.training = null;
    this.responses = [];
    
    this.init();
  }

  async init() {
    if (!this.trainingId) {
      showToast('올바르지 않은 연수 식별코드입니다.', 'danger');
      window.location.hash = '#/admin';
      return;
    }

    this.container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
        <div style="color: var(--text-secondary); font-weight: 500;">응답 및 서명부 정보를 동기화하는 중...</div>
      </div>
    `;

    try {
      this.training = await api.getForm(this.trainingId);
      this.responses = await api.getResponses(this.trainingId);
      this.render();
    } catch (err) {
      showToast('응답 로드 실패: ' + err.message, 'danger');
      window.location.hash = '#/admin';
    }
  }

  render() {
    const isMock = localStorage.getItem('everyone_register_gas_url') ? false : true;
    const shareLink = this.getShareLink();

    // 폼 모듈 중에서 구분선과 안내글을 제외한 유효 응답 모듈 목록 추출
    const activeModules = (this.training.modules || []).filter(m => m.type !== 'divider' && m.type !== 'info_text');

    this.container.innerHTML = `
      <!-- 헤더 및 뒤로가기 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <span class="badge badge-success">참석 정보 대장</span>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
            ${this.training.title}
          </h2>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <a href="#/admin" class="btn btn-secondary">대시보드로</a>
          <button id="btn-copy-link" class="btn btn-outline">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            공유 링크 복사
          </button>
        </div>
      </div>

      <!-- 요약 정보 메타 -->
      <div class="card" style="margin-bottom: 2rem; padding: 1.25rem 1.5rem; background-color: var(--bg-secondary); border-left: 4px solid var(--color-success);">
        <div style="display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.9rem; color: var(--text-secondary);">
          <div>📅 <strong>일시:</strong> ${this.training.date}</div>
          <div>📍 <strong>장소:</strong> ${this.training.location}</div>
          <div>👥 <strong>참석 인원:</strong> 총 ${this.responses.length}명</div>
        </div>
        
        <!-- 공유 링크 확인창 -->
        <div style="margin-top: 1rem; padding: 0.5rem 0.75rem; background-color: var(--bg-primary); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.825rem; border: 1px solid var(--border-color);">
          <span style="font-family: monospace; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${shareLink}
          </span>
          <span style="color: var(--color-primary); font-weight: 600; cursor: pointer; flex-shrink: 0;" id="copy-link-text">복사</span>
        </div>
      </div>

      <!-- 내보내기 툴바 -->
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1rem;">
        <button id="btn-export-csv" class="btn btn-secondary btn-sm" ${this.responses.length === 0 ? 'disabled' : ''}>
          📥 CSV 파일 내보내기 (Excel)
        </button>
        <button id="btn-export-pdf" class="btn btn-primary btn-sm" ${this.responses.length === 0 ? 'disabled' : ''}>
          🖨️ 인쇄용 PDF 출력
        </button>
      </div>

      <!-- 테이블 그리드 -->
      ${this.responses.length === 0 ? `
        <div class="card" style="text-align: center; padding: 5rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-secondary);">수집된 참석 응답이 없습니다</h3>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
            상단의 공유 링크를 복사하여 참석자들에게 전달해 서명을 받아보세요.
          </p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>등록 일시</th>
                <th>성명</th>
                ${activeModules.map(m => `<th>${m.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${this.responses.map((resp, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${idx + 1}</td>
                  <td style="color: var(--text-secondary); font-family: Outfit, sans-serif; font-size: 0.8rem;">
                    ${this.formatDate(resp.timestamp)}
                  </td>
                  <td style="font-weight: 700;">${resp.name}</td>
                  ${activeModules.map(m => {
                    const val = resp.responses[m.id];
                    return `<td>${this.renderCellValue(m.type, val)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}

      <!-- PDF 생성 오버레이 로딩 바 -->
      <div id="pdf-loading-overlay" class="modal-overlay" style="display: none;">
        <div class="card" style="max-width: 320px; text-align: center; padding: 2rem;">
          <div class="spinner" style="border: 4px solid var(--border-color); border-top: 4px solid var(--color-primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1.25rem auto;"></div>
          <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
          <h4 style="font-weight: 700; margin-bottom: 0.5rem;">출석부 출력 생성 중</h4>
          <p id="pdf-status-text" style="font-size: 0.85rem; color: var(--text-secondary);">준비 중...</p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  // 타임스탬프 현지 시간 포맷팅 헬퍼
  formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${date} ${hour}:${min}`;
    } catch (e) {
      return isoString;
    }
  }

  // 테이블 내 각 셀의 프리뷰 렌더러
  renderCellValue(type, value) {
    if (value === undefined || value === null) return '';

    if (type === 'signature') {
      if (value.startsWith('data:image/')) {
        // 서명 이미지 태그
        return `
          <img src="${value}" height="32" style="
            border: 1px solid var(--border-color);
            background-color: #fafbfc;
            border-radius: var(--radius-sm);
            max-width: 90px;
            object-fit: contain;
            display: block;
          " alt="자필서명">
        `;
      }
      return '<span style="color: var(--text-muted); font-size: 0.85rem;">[서명 없음]</span>';
    }

    if (Array.isArray(value)) {
      return value.map(v => `<span class="badge badge-primary" style="margin-right: 0.2rem; margin-bottom: 0.2rem;">${v}</span>`).join('');
    }

    return String(value);
  }

  // 외부 전파 공유링크 URL 생성
  getShareLink() {
    const loc = window.location;
    // URL에 포트가 포함될 수도 있음
    return `${loc.protocol}//${loc.host}${loc.pathname}#/user?id=${this.trainingId}`;
  }

  // -------------------------------------------------------------
  // 이벤트 바인딩
  // -------------------------------------------------------------
  bindEvents() {
    const shareLink = this.getShareLink();

    const copyHandler = () => {
      navigator.clipboard.writeText(shareLink)
        .then(() => showToast('공유용 등록 링크가 복사되었습니다.', 'success'))
        .catch(() => showToast('클립보드 복사에 실패했습니다.', 'danger'));
    };

    // 복사 버튼들
    const cpyBtn = this.container.querySelector('#btn-copy-link');
    if (cpyBtn) cpyBtn.addEventListener('click', copyHandler);
    
    const cpyText = this.container.querySelector('#copy-link-text');
    if (cpyText) cpyText.addEventListener('click', copyHandler);

    // CSV 익스포트
    const csvBtn = this.container.querySelector('#btn-export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        try {
          const headers = ['연번', '제출일시', '참석자명'];
          
          const activeModules = (this.training.modules || []).filter(m => m.type !== 'divider' && m.type !== 'info_text');
          activeModules.forEach(m => headers.push(m.label));

          const rows = this.responses.map((resp, rIdx) => {
            const row = [
              String(rIdx + 1),
              this.formatDate(resp.timestamp),
              resp.name
            ];
            activeModules.forEach(m => {
              const val = resp.responses[m.id];
              row.push(val);
            });
            return row;
          });

          const sanitizedTitle = this.training.title.replace(/[\\/:*?"<>|]/g, '_');
          exportToCSV(`출석대장_${sanitizedTitle}.csv`, headers, rows);
          showToast('CSV 다운로드를 시작합니다.', 'success');
        } catch (e) {
          showToast('CSV 변환 실패: ' + e.message, 'danger');
        }
      });
    }

    // PDF 익스포트
    const pdfBtn = this.container.querySelector('#btn-export-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', async () => {
        const overlay = this.container.querySelector('#pdf-loading-overlay');
        const statusText = this.container.querySelector('#pdf-status-text');

        overlay.style.display = 'flex';
        
        try {
          await exportToPDF(this.training, this.responses, (progressMsg) => {
            if (progressMsg) {
              statusText.textContent = progressMsg;
            }
          });
          showToast('PDF 다운로드를 시작합니다.', 'success');
        } catch (e) {
          showToast('PDF 인쇄 실패: ' + e.message, 'danger');
        } finally {
          overlay.style.display = 'none';
        }
      });
    }
  }
}
