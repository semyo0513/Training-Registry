import { api } from '../utils/api';
import { config } from '../config';
import { showToast } from '../utils/toast';

export class AdminPage {
  constructor(container) {
    this.container = container;
    this.trainings = [];
    this.isAuthenticated = false;
    
    this.checkSession();
  }

  // 관리자 세션 체크
  checkSession() {
    const session = localStorage.getItem('everyone_register_session');
    if (session && session.startsWith('mock_token_')) {
      // Mock 세션 간이 검증
      this.isAuthenticated = true;
      this.init();
    } else {
      this.renderLogin();
    }
  }

  // 로그인 화면 렌더링
  renderLogin() {
    this.container.innerHTML = `
      <div class="card" style="max-width: 420px; margin: 4rem auto; box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
          <h2 class="card-title">관리자 로그인</h2>
          <p class="card-subtitle">모두의 연수등록부 관리 권한이 필요합니다.</p>
        </div>
        
        <form id="admin-login-form">
          <div class="form-group">
            <label class="form-label" for="admin-password">관리자 비밀번호</label>
            <input type="password" class="form-control" id="admin-password" placeholder="비밀번호를 입력하세요" required autofocus>
            <p style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.4;">
              * 로컬 Mock 모드 기본 비밀번호는 <strong>1234</strong> 입니다.
            </p>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">로그인</button>
        </form>
      </div>
    `;

    const form = this.container.querySelector('#admin-login-form');
    const pwInput = this.container.querySelector('#admin-password');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = pwInput.value;
      
      try {
        const res = await api.login(pw);
        if (res.success) {
          showToast('성공적으로 로그인되었습니다.', 'success');
          this.isAuthenticated = true;
          this.init();
        }
      } catch (err) {
        showToast(err.message, 'danger');
        pwInput.value = '';
        pwInput.focus();
      }
    });
  }

  // 메인 대시보드 로드
  async init() {
    this.container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
        <div style="color: var(--text-secondary); font-weight: 500;">대시보드 데이터를 로드하는 중...</div>
      </div>
    `;

    try {
      this.trainings = await api.getTrainings();
      this.renderDashboard();
    } catch (err) {
      showToast('대시보드 데이터를 로드하지 못했습니다: ' + err.message, 'danger');
    }
  }

  // 대시보드 메인 뷰 렌더링
  async renderDashboard() {
    // 각 연수별 응답 수 실시간 계산
    const responseCounts = {};
    let totalResponses = 0;
    
    for (const tr of this.trainings) {
      try {
        const resps = await api.getResponses(tr.id);
        responseCounts[tr.id] = resps.length;
        totalResponses += resps.length;
      } catch (e) {
        responseCounts[tr.id] = 0;
      }
    }

    const isMock = config.isMockMode();
    const gasUrl = config.getGasUrl();

    this.container.innerHTML = `
      <!-- 통계 대시보드 요약 -->
      <div class="dashboard-stats">
        <div class="stat-card">
          <span class="stat-value">${this.trainings.length}</span>
          <span class="stat-label">등록된 총 연수·회의</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${totalResponses}</span>
          <span class="stat-label">수집된 누적 응답</span>
        </div>
        <div class="stat-card" style="border-left: 4px solid ${isMock ? 'var(--color-warning)' : 'var(--color-success)'}">
          <span class="badge ${isMock ? 'badge-danger' : 'badge-success'}" style="width: fit-content; margin-bottom: 0.25rem;">
            ${isMock ? '로컬 Mock DB' : 'Google Sheets 연동'}
          </span>
          <span class="stat-label" style="font-size: 0.775rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${isMock ? '로컬 브라우저 저장소 사용 중' : gasUrl}
          </span>
        </div>
      </div>

      <!-- 관리 도구 및 연수 추가 헤더 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">연수 및 회의 관리</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">등록부를 설계하고 응답을 모니터링할 수 있습니다.</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="logout-btn" class="btn btn-outline">로그아웃</button>
          <button id="new-training-btn" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            새 연수·회의 등록
          </button>
        </div>
      </div>

      <!-- 연수 리스트 카드 레이아웃 -->
      ${this.trainings.length === 0 ? `
        <div class="card" style="text-align: center; padding: 4rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">생성된 연수가 없습니다</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
            새 연수를 생성하고 양식을 디자인하여 서명부를 수집해보세요.
          </p>
          <button id="new-training-empty-btn" class="btn btn-primary">새 연수 등록하기</button>
        </div>
      ` : `
        <div class="dashboard-grid">
          ${this.trainings.map(tr => `
            <div class="card training-card" data-id="${tr.id}">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem;">
                  <span class="badge badge-primary">총 ${responseCounts[tr.id] || 0}명 참석</span>
                  <span style="font-size: 0.775rem; color: var(--text-muted); font-family: Outfit, sans-serif;">
                    ${tr.id}
                  </span>
                </div>
                <h3 class="card-title" style="font-size: 1.15rem; line-height: 1.4; margin-bottom: 0px;">
                  ${tr.title}
                </h3>
                
                <div class="training-meta">
                  <div class="meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <span>${tr.date}</span>
                  </div>
                  <div class="meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>${tr.location}</span>
                  </div>
                </div>
              </div>
              
              <div class="training-actions">
                <a href="#/responses/${tr.id}" class="btn btn-secondary btn-sm" style="flex: 1;">응답 조회</a>
                <a href="#/builder?id=${tr.id}" class="btn btn-outline btn-sm" style="flex: 1;">양식 설계</a>
                <button class="btn btn-outline btn-sm delete-tr-btn" data-id="${tr.id}" style="color: var(--color-danger); border-color: transparent;" title="연수 삭제">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- 설정 및 가이드 관리 카드 -->
      <div class="card" style="margin-top: 3rem; background-color: var(--bg-secondary); border-top: 4px solid var(--color-primary);">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          ⚙️ 시스템 연동 및 백엔드 설정
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">
          기본적으로 로컬 브라우저 메모리(Mock DB)를 사용하므로 즉시 테스트가 가능합니다. 구성원간 실제 웹 링크로 수집하려면 <strong>Google Sheets</strong>와 연동해야 합니다.
        </p>

        <div class="form-group" style="max-width: 600px;">
          <label class="form-label" for="system-gas-url">Google Apps Script Web App URL</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" class="form-control" id="system-gas-url" placeholder="https://script.google.com/macros/s/.../exec" value="${gasUrl}">
            <button id="save-gas-url-btn" class="btn btn-primary">연동 저장</button>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
            * 비어 둘 경우 자동으로 안전한 '로컬 Mock DB 모드'로 되돌아갑니다.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap;">
          <button id="reset-mock-btn" class="btn btn-outline btn-sm">Mock 데이터 초기화 (초기 시드 복원)</button>
          <button id="copy-gas-code-btn" class="btn btn-outline btn-sm">Code.gs 템플릿 코드 복사</button>
        </div>
      </div>

      <!-- 연수 생성 모달 백드롭 -->
      <div id="new-training-modal" class="modal-overlay" style="display: none;">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">새 연수·회의 등록</h3>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <form id="new-training-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="new-tr-title">연수·회의명 <span class="required">*</span></label>
                <input type="text" class="form-control" id="new-tr-title" placeholder="예: 2026학년도 교직원 안전교육" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="new-tr-date">일시 (날짜) <span class="required">*</span></label>
                <input type="date" class="form-control" id="new-tr-date" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="new-tr-location">장소 <span class="required">*</span></label>
                <input type="text" class="form-control" id="new-tr-location" placeholder="예: 과학실, 3학년 교실" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="modal-cancel-btn">취소</button>
              <button type="submit" class="btn btn-primary">생성 및 양식설계로 이동</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // 오늘 날짜로 생성 폼 초기화 바인딩
    const today = new Date().toISOString().split('T')[0];
    const dateInput = this.container.querySelector('#new-tr-date');
    if (dateInput) dateInput.value = today;

    this.bindDashboardEvents();
  }

  // 대시보드 리스너들 바인딩
  bindDashboardEvents() {
    // 로그아웃
    this.container.querySelector('#logout-btn').addEventListener('click', () => {
      localStorage.removeItem('everyone_register_session');
      this.isAuthenticated = false;
      showToast('로그아웃되었습니다.', 'info');
      this.renderLogin();
    });

    // 새 연수 모달 트리거
    const modal = this.container.querySelector('#new-training-modal');
    const openModal = () => {
      modal.style.display = 'flex';
      this.container.querySelector('#new-tr-title').focus();
    };
    const closeModal = () => {
      modal.style.display = 'none';
      this.container.querySelector('#new-training-form').reset();
      const dateInput = this.container.querySelector('#new-tr-date');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    };

    const newBtn = this.container.querySelector('#new-training-btn');
    if (newBtn) newBtn.addEventListener('click', openModal);

    const emptyNewBtn = this.container.querySelector('#new-training-empty-btn');
    if (emptyNewBtn) emptyNewBtn.addEventListener('click', openModal);

    this.container.querySelector('#modal-close-btn').addEventListener('click', closeModal);
    this.container.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
    
    // 모달 바깥 배경 클릭시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // 새 연수 제출 핸들러
    this.container.querySelector('#new-training-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = this.container.querySelector('#new-tr-title').value.trim();
      const date = this.container.querySelector('#new-tr-date').value;
      const location = this.container.querySelector('#new-tr-location').value.trim();

      // 기본 필수서명 하나를 포함해서 시작
      const defaultModules = [
        { id: 'mod_sig_default', type: 'signature', label: '자필서명', required: true }
      ];

      try {
        const newTr = await api.createTraining(title, date, location, defaultModules);
        showToast('연수가 생성되었습니다. 양식 빌더로 이동합니다.', 'success');
        closeModal();
        window.location.hash = `#/builder?id=${newTr.id}`;
      } catch (err) {
        showToast('생성 실패: ' + err.message, 'danger');
      }
    });

    // 연수 카드 삭제 액션
    this.container.querySelectorAll('.delete-tr-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // 카드 자체 클릭 캡처 방지
        const id = btn.dataset.id;
        const tr = this.trainings.find(t => t.id === id);
        
        if (confirm(`'${tr.title}' 연수를 정말 삭제하시겠습니까?\n모든 수집된 서명 데이터와 참석자 응답이 삭제됩니다.`)) {
          try {
            await api.deleteTraining(id);
            showToast('연수가 정상적으로 삭제되었습니다.', 'success');
            this.init();
          } catch (err) {
            showToast('삭제 실패: ' + err.message, 'danger');
          }
        }
      });
    });

    // GAS 연동 저장
    this.container.querySelector('#save-gas-url-btn').addEventListener('click', () => {
      const url = this.container.querySelector('#system-gas-url').value.trim();
      config.setGasUrl(url);
      if (url) {
        showToast('Google Apps Script 연동 완료!', 'success');
      } else {
        showToast('로컬 Mock DB 모드로 변경되었습니다.', 'warning');
      }
      this.init(); // 대시보드 리로드
    });

    // Mock 데이터 초기화
    this.container.querySelector('#reset-mock-btn').addEventListener('click', () => {
      if (confirm('모든 연수 및 응답 데이터를 지우고 초기의 예제 시드 데이터로 강제 복원하시겠습니까?')) {
        api.resetMockData();
        showToast('예제 데이터로 초기화 완료!', 'success');
        this.init();
      }
    });

    // Code.gs 코드 복사 기능
    this.container.querySelector('#copy-gas-code-btn').addEventListener('click', () => {
      // 나중에 Code.gs 내용을 텍스트 클립보드에 바로 밀어넣음
      const codeGSApiText = `// Google Apps Script 백엔드 코드 (Code.gs)\n// 자세한 파일 내용을 복사하려면 gas/Code.gs 파일을 열어주세요.`;
      
      // 비동기 fetch 등으로 gas/Code.gs 파일을 직접 복사하고 싶으나, 여기서는 하드코딩해서 전달하거나 편하게 복사할 수 있도록 유도
      navigator.clipboard.writeText(this.getGasScriptTemplate())
        .then(() => showToast('Code.gs 스크립트 템플릿이 클립보드에 복사되었습니다!', 'success'))
        .catch(() => showToast('클립보드 복사에 실패했습니다. gas/Code.gs 소스코드를 열어 직접 복사해주세요.', 'danger'));
    });
  }

  // 복사용 Apps Script 코드 템플릿 제공
  getGasScriptTemplate() {
    return `/**
 * 모두의 연수등록부 (Google Apps Script Web App 백엔드 코드)
 * 
 * [설치 방법]
 * 1. Google Drive에서 새 스프레드시트를 생성합니다.
 * 2. 확장 프로그램 -> Apps Script를 선택합니다.
 * 3. 본 코드를 복사하여 Code.gs 파일에 덮어씁니다.
 * 4. 우측 상단의 '배포' -> '새 배포' -> '웹 앱'을 선택합니다.
 *    - 웹앱을 실행할 사용자: 본인 (나)
 *    - 액세스 권한이 있는 사용자: 모든 사용자 (아무나 들어와서 등록할 수 있어야 함)
 * 5. 발급된 '웹 앱 URL'을 복사하여 관리자 설정란에 등록하세요.
 */

const DB_SHEET_NAME = "trainings";
const ADMINS_SHEET_NAME = "admins";

function doGet(e) {
  const action = e.parameter.action;
  try {
    switch(action) {
      case 'getTrainings': return jsonResponse(getTrainingList());
      case 'getForm':      return jsonResponse(getFormConfig(e.parameter.id));
      case 'getResponses': return jsonResponse(getResponses(e.parameter.id));
      default:             return jsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch(err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch(data.action) {
      case 'submitResponse': return jsonResponse(submitResponse(data));
      case 'createTraining': return jsonResponse(createTraining(data));
      case 'updateForm':     return jsonResponse(updateFormConfig(data));
      case 'deleteTraining': return jsonResponse(deleteTraining(data));
      case 'adminLogin':     return jsonResponse(adminLogin(data));
      default:               return jsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch(err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ... (상세 로직은 gas/Code.gs 파일 참조)`;
  }
}
