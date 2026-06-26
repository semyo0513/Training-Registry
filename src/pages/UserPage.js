import { api } from '../utils/api';
import { renderModule } from '../modules/ModuleRenderer';
import { showToast } from '../main';

export class UserPage {
  constructor(container, options = {}) {
    this.container = container;
    this.trainingId = options.trainingId || null;
    
    this.trainings = [];
    this.selectedTraining = null;
    this.renderedModules = {}; // { moduleId: { getValue, validate } }
    
    this.init();
  }

  async init() {
    this.container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
        <div style="color: var(--text-secondary); font-weight: 500;">연수 정보를 불러오는 중...</div>
      </div>
    `;

    try {
      this.trainings = await api.getTrainings();
      this.render();
    } catch (err) {
      this.container.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 2rem auto; text-align: center;">
          <h3 style="color: var(--color-danger); margin-bottom: 1rem;">연수 데이터를 로드하지 못했습니다</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${err.message}</p>
          <button class="btn btn-primary retry-btn">다시 시도</button>
        </div>
      `;
      this.container.querySelector('.retry-btn').addEventListener('click', () => this.init());
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="card" style="max-width: 600px; margin: 0 auto; box-shadow: var(--shadow-lg);">
        <h2 class="card-title" id="form-title">연수·회의 출석 등록</h2>
        <p class="card-subtitle">참석 정보를 성실히 입력한 후 제출해 주시기 바랍니다.</p>
        
        <form id="register-form">
          <!-- 1. 연수 선택 (direct link가 아닐 경우에만 노출) -->
          <div class="form-group" id="training-select-group">
            <label class="form-label" for="training-select">연수·회의 선택 <span class="required">*</span></label>
            <select class="form-select" id="training-select" required>
              <option value="">-- 참석할 연수를 선택하세요 --</option>
              ${this.trainings.map(t => `<option value="${t.id}">${t.title} (${t.date})</option>`).join('')}
            </select>
          </div>

          <!-- 연수가 선택되었을 때 동적으로 나타나는 영역 -->
          <div id="dynamic-form-area" style="display: none;">
            <!-- 2. 성명 (기본 필수 필드) -->
            <div class="form-group">
              <label class="form-label" for="user-name">성명 <span class="required">*</span></label>
              <input type="text" class="form-control" id="user-name" placeholder="이름을 입력해 주세요" required>
            </div>

            <!-- 3. 모듈별 렌더링 영역 -->
            <div id="modules-container"></div>

            <!-- 제출 버튼 -->
            <div style="margin-top: 2rem;">
              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">출석부 제출하기</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.form = this.container.querySelector('#register-form');
    this.selectGroup = this.container.querySelector('#training-select-group');
    this.selectEl = this.container.querySelector('#training-select');
    this.formArea = this.container.querySelector('#dynamic-form-area');
    this.nameInput = this.container.querySelector('#user-name');
    this.modulesContainer = this.container.querySelector('#modules-container');

    // 이벤트 리스너 바인딩
    this.selectEl.addEventListener('change', () => this.handleTrainingChange());
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // URL Query를 통해 특정 연수 ID가 바로 전달되었을 경우 처리
    if (this.trainingId) {
      const exists = this.trainings.some(t => t.id === this.trainingId);
      if (exists) {
        this.selectEl.value = this.trainingId;
        this.selectGroup.style.display = 'none'; // 연수 선택 선택창 숨김
        this.handleTrainingChange();
      } else {
        showToast('전달받은 공유 링크의 연수가 존재하지 않습니다.', 'danger');
      }
    }
  }

  // 연수 변경 시 폼 필드 구성 동적 갱신
  async handleTrainingChange() {
    const trId = this.selectEl.value;
    if (!trId) {
      this.formArea.style.display = 'none';
      this.selectedTraining = null;
      return;
    }

    this.modulesContainer.innerHTML = `
      <div style="padding: 1rem; text-align: center; color: var(--text-muted);">
        양식을 렌더링하는 중...
      </div>
    `;
    this.formArea.style.display = 'block';

    try {
      this.selectedTraining = await api.getForm(trId);
      this.renderModules();
    } catch (err) {
      showToast(err.message, 'danger');
      this.formArea.style.display = 'none';
    }
  }

  // 모듈 렌더링 실행
  renderModules() {
    this.modulesContainer.innerHTML = '';
    this.renderedModules = {};

    const modules = this.selectedTraining.modules || [];
    if (modules.length === 0) {
      this.modulesContainer.innerHTML = `
        <div style="padding: 1.5rem; background-color: var(--bg-tertiary); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          이 연수는 별도의 커스텀 수집 필드가 없습니다.
        </div>
      `;
      return;
    }

    modules.forEach(mod => {
      const renderResult = renderModule(mod, this.modulesContainer);
      this.renderedModules[mod.id] = renderResult;
    });
  }

  // 서제스트 완료 화면 렌더링
  renderSuccessState(name) {
    this.container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 3rem auto; text-align: center; padding: 3rem 2rem; box-shadow: var(--shadow-lg);">
        <div style="width: 4rem; height: 4rem; background-color: var(--color-success-light); color: var(--color-success); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; font-size: 2rem;">
          ✓
        </div>
        <h2 class="card-title">출석 등록 완료!</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2.5rem; font-weight: 500;">
          <strong>${name}</strong>님의 출석 등록이 정상적으로 완료되었습니다.<br>협조해 주셔서 대단히 감사합니다.
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button class="btn btn-primary re-register-btn">추가 등록하기 (다른 사람)</button>
          <a href="#/" class="btn btn-outline">처음 페이지로</a>
        </div>
      </div>
    `;

    this.container.querySelector('.re-register-btn').addEventListener('click', () => {
      // 파라미터 유지한 채 리셋
      new UserPage(this.container, { trainingId: this.trainingId });
    });
  }

  // 제출 폼 검증 및 전송 핸들러
  async handleSubmit(e) {
    e.preventDefault();
    if (!this.selectedTraining) return;

    const name = this.nameInput.value.trim();
    if (!name) {
      showToast('성명을 입력해 주세요.', 'danger');
      this.nameInput.focus();
      return;
    }

    // 모듈별 검증 실행
    const responses = {};
    const errorMessages = [];

    const modules = this.selectedTraining.modules || [];
    for (const mod of modules) {
      // 구분선 및 읽기전용 등은 데이터 수집 안 함
      if (mod.type === 'divider' || mod.type === 'info_text') continue;

      const renderer = this.renderedModules[mod.id];
      if (renderer) {
        const error = renderer.validate();
        if (error) {
          errorMessages.push(error);
        } else {
          responses[mod.id] = renderer.getValue();
        }
      }
    }

    if (errorMessages.length > 0) {
      // 가장 첫 번째 에러 메시지를 토스트에 표시
      showToast(errorMessages[0], 'danger');
      return;
    }

    // 제출 잠금 처리 (중복 클릭 방지)
    const submitBtn = this.form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '제출하는 중...';

    try {
      await api.submitResponse(this.selectedTraining.id, name, responses);
      showToast('출석 등록이 완료되었습니다.', 'success');
      this.renderSuccessState(name);
    } catch (err) {
      showToast(`제출 오류: ${err.message}`, 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = '출석부 제출하기';
    }
  }
}
