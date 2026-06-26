import { api } from '../utils/api';
import { showToast } from '../utils/toast';

const MODULE_TYPES = [
  { type: 'signature', name: '✍ 자필 서명', icon: 'pen-tool' },
  { type: 'short_text', name: '📝 단답형 텍스트', icon: 'type' },
  { type: 'long_text', name: '📋 장문형 텍스트', icon: 'align-left' },
  { type: 'number', name: '🔢 숫자 입력', icon: 'hash' },
  { type: 'single_select', name: '🔘 단일 선택 (라디오)', icon: 'circle-dot' },
  { type: 'checkbox', name: '☑ 복수 선택 (체크)', icon: 'check-square' },
  { type: 'dropdown', name: '▼ 드롭다운 선택', icon: 'chevron-down' },
  { type: 'date', name: '📅 날짜 선택', icon: 'calendar' },
  { type: 'time', name: '⏰ 시간 입력', icon: 'clock' },
  { type: 'divider', name: '― 구분선 섹션', icon: 'minus' },
  { type: 'info_text', name: 'ℹ 안내 텍스트', icon: 'info' }
];

export class FormBuilder {
  constructor(container, options = {}) {
    this.container = container;
    this.trainingId = options.trainingId || null;
    
    this.training = null;
    this.modules = [];
    this.selectedModuleId = null;
    
    this.init();
  }

  async init() {
    if (!this.trainingId) {
      showToast('올바르지 않은 연수 접근입니다.', 'danger');
      window.location.hash = '#/admin';
      return;
    }

    this.container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
        <div style="color: var(--text-secondary); font-weight: 500;">양식 디자인 설정을 가져오는 중...</div>
      </div>
    `;

    try {
      this.training = await api.getForm(this.trainingId);
      this.modules = this.training.modules || [];
      this.render();
    } catch (err) {
      showToast(err.message, 'danger');
      window.location.hash = '#/admin';
    }
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <span class="badge badge-primary" style="margin-bottom: 0.25rem;">양식 설계기</span>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
            ${this.training.title}
          </h2>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <a href="#/admin" class="btn btn-secondary">대시보드로</a>
          <button id="save-builder-btn" class="btn btn-primary">양식 저장하기</button>
        </div>
      </div>

      <!-- 빌더 레이아웃 -->
      <div class="builder-layout">
        
        <!-- 1. 좌측 팔레트 -->
        <div class="builder-panel">
          <h3 class="builder-panel-title">모듈 팔레트</h3>
          <p style="font-size: 0.775rem; color: var(--text-muted); margin-top: -0.5rem; margin-bottom: 1rem; line-height: 1.3;">
            * 항목을 클릭하거나 우측 캔버스로 드래그하여 필드를 추가하세요.
          </p>
          <div class="builder-palette">
            ${MODULE_TYPES.map(m => `
              <div class="palette-item" draggable="true" data-type="${m.type}">
                <span>${m.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. 중앙 캔버스 -->
        <div class="builder-panel" style="flex: 2; display: flex; flex-direction: column;">
          <h3 class="builder-panel-title">폼 레이아웃 미리보기</h3>
          <div class="builder-canvas-scroll" id="builder-canvas">
            <!-- 동적으로 필드 렌더링 -->
          </div>
        </div>

        <!-- 3. 우측 설정 사이드바 -->
        <div class="builder-panel" id="builder-sidebar">
          <h3 class="builder-panel-title">세부 속성 편집</h3>
          <div class="builder-settings" id="settings-area">
            <div class="settings-empty">필드를 선택하여 설정을 편집하세요.</div>
          </div>
        </div>

      </div>
    `;

    this.canvas = this.container.querySelector('#builder-canvas');
    this.sidebar = this.container.querySelector('#settings-area');

    this.bindEvents();
    this.refreshCanvas();
  }

  // -------------------------------------------------------------
  // 이벤트 등록 및 조작 로직
  // -------------------------------------------------------------
  bindEvents() {
    // 1. 팔레트 클릭 (클릭 즉시 맨 아래 추가)
    this.container.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        this.addModule(type);
      });

      // HTML5 Drag 시작 핸들러
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    // 2. 캔버스 Dropzone 처리
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.canvas.classList.add('dragover');
    });

    this.canvas.addEventListener('dragleave', () => {
      this.canvas.classList.remove('dragover');
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      this.canvas.classList.remove('dragover');
      const type = e.dataTransfer.getData('text/plain');
      if (type) {
        this.addModule(type);
      }
    });

    // 3. 빌더 저장 기능
    this.container.querySelector('#save-builder-btn').addEventListener('click', () => this.handleSave());
  }

  // -------------------------------------------------------------
  // 모듈 제어 데이터 가공
  // -------------------------------------------------------------

  // 새 필드 추가
  addModule(type) {
    const id = 'mod_' + Date.now() + Math.floor(Math.random() * 100);
    let label = '';
    let extra = {};

    switch (type) {
      case 'signature': label = '자필 서명'; break;
      case 'short_text': label = '단답형 기입란'; extra = { placeholder: '답변을 입력해 주세요' }; break;
      case 'long_text': label = '장문형 설명란'; extra = { placeholder: '상세 내용을 기입하세요', rows: 4 }; break;
      case 'number': label = '수치 입력란'; extra = { placeholder: '숫자 입력', min: '', max: '' }; break;
      case 'single_select': label = '단일 선택'; extra = { options: ['선택지 1', '선택지 2'] }; break;
      case 'checkbox': label = '체크 항목'; extra = { options: ['동의함'] }; break;
      case 'dropdown': label = '옵션 선택'; extra = { options: ['옵션 A', '옵션 B'] }; break;
      case 'date': label = '날짜 기입'; break;
      case 'time': label = '시간 기록'; break;
      case 'divider': label = '새 섹션 타이틀'; break;
      case 'info_text': label = '여기에 안내할 긴 텍스트 내용을 입력하세요.'; break;
    }

    const newMod = {
      id,
      type,
      label,
      required: type !== 'divider' && type !== 'info_text', // 구분선/안내글 외 기본 필수
      ...extra
    };

    this.modules.push(newMod);
    this.selectedModuleId = id; // 바로 선택 상태로 유도
    
    showToast('새 필드가 추가되었습니다.', 'success', 1500);
    this.refreshCanvas();
    this.refreshSidebar();
  }

  // 필드 삭제
  deleteModule(id, e) {
    if (e) e.stopPropagation();
    
    // 필수 서명 모듈이 아예 없으면 경고 (연수에는 서명이 최소 한개는 있는 것이 일반적)
    const target = this.modules.find(m => m.id === id);
    if (target.type === 'signature' && this.modules.filter(m => m.type === 'signature').length <= 1) {
      if (!confirm('이 폼에서 유일한 서명 모듈입니다. 삭제 시 참석자 서명 없이 정보만 수집됩니다. 삭제할까요?')) {
        return;
      }
    }

    this.modules = this.modules.filter(m => m.id !== id);
    if (this.selectedModuleId === id) {
      this.selectedModuleId = null;
    }

    this.refreshCanvas();
    this.refreshSidebar();
    showToast('필드가 제거되었습니다.', 'warning', 1500);
  }

  // 순서 이동 (Up)
  moveUp(idx, e) {
    e.stopPropagation();
    if (idx === 0) return;
    const temp = this.modules[idx];
    this.modules[idx] = this.modules[idx - 1];
    this.modules[idx - 1] = temp;
    this.refreshCanvas();
  }

  // 순서 이동 (Down)
  moveDown(idx, e) {
    e.stopPropagation();
    if (idx === this.modules.length - 1) return;
    const temp = this.modules[idx];
    this.modules[idx] = this.modules[idx + 1];
    this.modules[idx + 1] = temp;
    this.refreshCanvas();
  }

  // -------------------------------------------------------------
  // UI 갱신 로직 (중앙 캔버스)
  // -------------------------------------------------------------
  refreshCanvas() {
    this.canvas.innerHTML = '';

    if (this.modules.length === 0) {
      this.canvas.innerHTML = `
        <div class="canvas-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="15" y1="9" y2="9"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/></svg>
          <p>여기에 필드를 설계해보세요.<br>왼쪽 팔레트에서 필드 타입을 클릭하거나 끌어당겨 놓아 추가할 수 있습니다.</p>
        </div>
      `;
      return;
    }

    this.modules.forEach((mod, idx) => {
      const item = document.createElement('div');
      const isSelected = mod.id === this.selectedModuleId;
      item.className = `builder-item ${isSelected ? 'selected' : ''}`;
      item.dataset.id = mod.id;

      const typeMeta = MODULE_TYPES.find(m => m.type === mod.type) || { name: mod.type };

      item.innerHTML = `
        <div class="builder-item-header">
          <span class="builder-item-title">${typeMeta.name}</span>
          <div class="builder-item-actions">
            <button class="btn btn-secondary btn-sm order-up" title="위로" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn btn-secondary btn-sm order-down" title="아래로" ${idx === this.modules.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn btn-danger btn-sm delete-btn" title="삭제" style="padding: 0.25rem 0.5rem;">🗑</button>
          </div>
        </div>
        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">
          ${mod.label || `<span style="color: var(--text-muted); font-style: italic;">내용 또는 라벨이 없습니다</span>`}
          ${mod.required ? '<span class="required" style="color: var(--color-danger); margin-left: 0.2rem;">*</span>' : ''}
        </div>
        
        <!-- 미리보기 힌트 컴포넌트 -->
        <div class="builder-item-content">
          ${this.getModulePlaceholderHTML(mod)}
        </div>
      `;

      // 캔버스 내 아이템 선택 처리
      item.addEventListener('click', () => {
        this.selectedModuleId = mod.id;
        this.refreshCanvas();
        this.refreshSidebar();
      });

      // 액션 버튼 리스너 바인딩
      item.querySelector('.delete-btn').addEventListener('click', (e) => this.deleteModule(mod.id, e));
      
      const upBtn = item.querySelector('.order-up');
      if (upBtn) upBtn.addEventListener('click', (e) => this.moveUp(idx, e));
      
      const downBtn = item.querySelector('.order-down');
      if (downBtn) downBtn.addEventListener('click', (e) => this.moveDown(idx, e));

      this.canvas.appendChild(item);
    });
  }

  // 각 모듈타입별 시각적 힌트 렌더러
  getModulePlaceholderHTML(mod) {
    switch (mod.type) {
      case 'short_text':
        return `<input type="text" class="form-control form-control-sm" placeholder="${mod.placeholder || ''}" disabled>`;
      case 'long_text':
        return `<textarea class="form-control" rows="2" placeholder="${mod.placeholder || ''}" disabled></textarea>`;
      case 'number':
        return `<input type="number" class="form-control" placeholder="${mod.placeholder || '숫자 입력'}" disabled>`;
      case 'date':
        return `<input type="date" class="form-control" value="2026-06-26" disabled>`;
      case 'time':
        return `<input type="time" class="form-control" value="13:30" disabled>`;
      case 'signature':
        return `
          <div style="height: 60px; border: 1px dashed var(--border-color); background-color: var(--bg-primary); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--text-muted);">
            자필 서명 영역 (터치/마우스)
          </div>
        `;
      case 'dropdown':
        return `
          <select class="form-select" disabled>
            ${(mod.options || []).map(opt => `<option>${opt}</option>`).join('')}
          </select>
        `;
      case 'single_select':
        return `
          <div class="radio-group">
            ${(mod.options || []).map(opt => `
              <label class="option-control" style="cursor: not-allowed;"><input type="radio" disabled> ${opt}</label>
            `).join('')}
          </div>
        `;
      case 'checkbox':
        return `
          <div class="checkbox-group">
            ${(mod.options || []).map(opt => `
              <label class="option-control" style="cursor: not-allowed;"><input type="checkbox" disabled> ${opt}</label>
            `).join('')}
          </div>
        `;
      case 'divider':
        return `<hr style="border: none; border-top: 1px dashed var(--border-color); margin: 0.5rem 0;">`;
      case 'info_text':
        return `
          <div style="padding: 0.5rem; background-color: var(--bg-tertiary); border-left: 3px solid var(--color-primary); font-size: 0.8rem; color: var(--text-secondary);">
            설명 영역 (읽기전용)
          </div>
        `;
      default:
        return '';
    }
  }

  // -------------------------------------------------------------
  // UI 갱신 로직 (우측 속성 편집창)
  // -------------------------------------------------------------
  refreshSidebar() {
    this.sidebar.innerHTML = '';
    
    if (!this.selectedModuleId) {
      this.sidebar.innerHTML = '<div class="settings-empty">필드를 선택하여 설정을 편집하세요.</div>';
      return;
    }

    const mod = this.modules.find(m => m.id === this.selectedModuleId);
    if (!mod) return;

    // 기본 설정 HTML
    const isLayoutType = mod.type === 'divider' || mod.type === 'info_text';
    
    let html = `
      <div class="form-group">
        <label class="form-label" for="edit-label">${isLayoutType ? '내용 텍스트' : '필드명 (라벨)'}</label>
        ${mod.type === 'info_text' ? `
          <textarea class="form-control" id="edit-label" rows="3" required>${mod.label || ''}</textarea>
        ` : `
          <input type="text" class="form-control" id="edit-label" value="${mod.label || ''}" required>
        `}
      </div>
    `;

    // 필수 기입 여부 (레이아웃 타입 제외)
    if (!isLayoutType) {
      html += `
        <div class="form-group">
          <label class="option-control" style="font-weight: 600; color: var(--text-primary);">
            <input type="checkbox" id="edit-required" ${mod.required ? 'checked' : ''}>
            참석자 필수 입력 항목
          </label>
        </div>
      `;
    }

    // 텍스트 기입란 전용: placeholder 속성 편집
    if (mod.type === 'short_text' || mod.type === 'long_text' || mod.type === 'number') {
      html += `
        <div class="form-group">
          <label class="form-label" for="edit-placeholder">입력 유도 텍스트 (Placeholder)</label>
          <input type="text" class="form-control" id="edit-placeholder" value="${mod.placeholder || ''}">
        </div>
      `;
    }

    // 숫자 입력란 전용: 최소/최대 제약
    if (mod.type === 'number') {
      html += `
        <div style="display: flex; gap: 0.5rem;">
          <div class="form-group" style="flex: 1;">
            <label class="form-label" for="edit-min">최소값</label>
            <input type="number" class="form-control" id="edit-min" value="${mod.min ?? ''}">
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label" for="edit-max">최대값</label>
            <input type="number" class="form-control" id="edit-max" value="${mod.max ?? ''}">
          </div>
        </div>
      `;
    }

    // 선택 그룹 전용: 선택 옵션들 추가/편집 리스트
    if (mod.type === 'single_select' || mod.type === 'checkbox' || mod.type === 'dropdown') {
      const options = mod.options || [];
      html += `
        <div class="form-group">
          <label class="form-label">선택지 목록</label>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="options-edit-list">
            ${options.map((opt, oIdx) => `
              <div style="display: flex; gap: 0.25rem; align-items: center;">
                <input type="text" class="form-control edit-opt-input" data-index="${oIdx}" value="${opt}">
                <button class="btn btn-secondary delete-opt-btn" data-index="${oIdx}" style="padding: 0.55rem; color: var(--color-danger);" title="선택지 삭제">×</button>
              </div>
            `).join('')}
          </div>
          <button id="add-opt-btn" class="btn btn-outline btn-sm" style="width: 100%; margin-top: 0.75rem;">+ 선택지 추가</button>
        </div>
      `;
    }

    this.sidebar.innerHTML = html;

    // 변경사항 실시간 데이터 동기화 리스너 부착
    
    // 1. 라벨 변경
    const labelInput = this.sidebar.querySelector('#edit-label');
    labelInput.addEventListener('input', () => {
      mod.label = labelInput.value;
      this.refreshCanvas();
    });

    // 2. 필수여부 변경
    const reqCheckbox = this.sidebar.querySelector('#edit-required');
    if (reqCheckbox) {
      reqCheckbox.addEventListener('change', () => {
        mod.required = reqCheckbox.checked;
        this.refreshCanvas();
      });
    }

    // 3. Placeholder 변경
    const holderInput = this.sidebar.querySelector('#edit-placeholder');
    if (holderInput) {
      holderInput.addEventListener('input', () => {
        mod.placeholder = holderInput.value;
        this.refreshCanvas();
      });
    }

    // 4. 최소/최대 한계값 변경
    const minInput = this.sidebar.querySelector('#edit-min');
    const maxInput = this.sidebar.querySelector('#edit-max');
    if (minInput && maxInput) {
      const updateBounds = () => {
        mod.min = minInput.value !== '' ? Number(minInput.value) : '';
        mod.max = maxInput.value !== '' ? Number(maxInput.value) : '';
      };
      minInput.addEventListener('input', updateBounds);
      maxInput.addEventListener('input', updateBounds);
    }

    // 5. 선택 항목 조작
    if (mod.type === 'single_select' || mod.type === 'checkbox' || mod.type === 'dropdown') {
      // 선택지 텍스트 인풋 수정 바인딩
      this.sidebar.querySelectorAll('.edit-opt-input').forEach(optIn => {
        optIn.addEventListener('input', () => {
          const idx = Number(optIn.dataset.index);
          mod.options[idx] = optIn.value.trim();
          this.refreshCanvas();
        });
      });

      // 선택지 삭제
      this.sidebar.querySelectorAll('.delete-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          mod.options.splice(idx, 1);
          this.refreshCanvas();
          this.refreshSidebar();
        });
      });

      // 선택지 추가
      this.sidebar.querySelector('#add-opt-btn').addEventListener('click', () => {
        if (!mod.options) mod.options = [];
        mod.options.push(`새 선택지 ${mod.options.length + 1}`);
        this.refreshCanvas();
        this.refreshSidebar();
        
        // 새로 추가된 필드로 스크롤/포커스
        setTimeout(() => {
          const inputs = this.sidebar.querySelectorAll('.edit-opt-input');
          const lastInput = inputs[inputs.length - 1];
          if (lastInput) {
            lastInput.focus();
            lastInput.select();
          }
        }, 0);
      });
    }
  }

  // -------------------------------------------------------------
  // 양식 저장 요청
  // -------------------------------------------------------------
  async handleSave() {
    const saveBtn = this.container.querySelector('#save-builder-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장하는 중...';

    try {
      await api.updateForm(this.trainingId, this.modules);
      showToast('출석 양식이 성공적으로 저장되었습니다.', 'success');
      setTimeout(() => {
        window.location.hash = '#/admin';
      }, 1000);
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'danger');
      saveBtn.disabled = false;
      saveBtn.textContent = '양식 저장하기';
    }
  }
}
