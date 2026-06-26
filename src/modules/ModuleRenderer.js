import { SignatureModule } from './SignatureModule';

/**
 * 모듈 설정을 기반으로 적절한 DOM 요소를 생성하고, 값을 읽어올 수 있는 함수객체를 리턴합니다.
 * @param {Object} mod - 모듈 설정 객체 { id, type, label, required, options, placeholder, rows, min, max }
 * @param {HTMLElement} container - 모듈이 마운트될 부모 요소
 * @returns {Object} { element, getValue, validate }
 */
export function renderModule(mod, container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';
  wrapper.dataset.id = mod.id;

  // 라벨 생성 (구분선과 안내 텍스트 타입은 제외)
  const showLabel = mod.type !== 'divider' && mod.type !== 'info_text';
  if (showLabel) {
    const labelEl = document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.innerHTML = `${mod.label} ${mod.required ? '<span class="required">*</span>' : ''}`;
    wrapper.appendChild(labelEl);
  }

  let getValue = () => '';
  let validate = () => {
    if (mod.required && !getValue()) {
      return `${mod.label} 필드는 필수 입력 항목입니다.`;
    }
    return null;
  };

  // 모듈 타입별 렌더링
  switch (mod.type) {
    case 'short_text': {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.placeholder = mod.placeholder || '입력해 주세요';
      wrapper.appendChild(input);
      
      getValue = () => input.value.trim();
      break;
    }

    case 'long_text': {
      const textarea = document.createElement('textarea');
      textarea.className = 'form-control';
      textarea.placeholder = mod.placeholder || '내용을 입력해 주세요';
      textarea.rows = mod.rows || 4;
      wrapper.appendChild(textarea);
      
      getValue = () => textarea.value.trim();
      break;
    }

    case 'number': {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'form-control';
      input.placeholder = mod.placeholder || '숫자를 입력해 주세요';
      if (mod.min !== undefined && mod.min !== '') input.min = mod.min;
      if (mod.max !== undefined && mod.max !== '') input.max = mod.max;
      wrapper.appendChild(input);
      
      getValue = () => input.value !== '' ? Number(input.value) : '';
      validate = () => {
        if (mod.required && input.value === '') {
          return `${mod.label} 필드는 필수 입력 항목입니다.`;
        }
        if (input.value !== '') {
          const val = Number(input.value);
          if (mod.min !== undefined && mod.min !== '' && val < Number(mod.min)) {
            return `${mod.label} 필드는 최소값(${mod.min}) 이상이어야 합니다.`;
          }
          if (mod.max !== undefined && mod.max !== '' && val > Number(mod.max)) {
            return `${mod.label} 필드는 최대값(${mod.max}) 이하여야 합니다.`;
          }
        }
        return null;
      };
      break;
    }

    case 'date': {
      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'form-control';
      
      // 오늘 날짜로 기본 세팅 옵션이 설정되어 있다면 적용
      const today = new Date().toISOString().split('T')[0];
      input.value = today;

      wrapper.appendChild(input);
      
      getValue = () => input.value;
      break;
    }

    case 'time': {
      const input = document.createElement('input');
      input.type = 'time';
      input.className = 'form-control';
      
      // 기본값으로 현재 시간 세팅
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      input.value = `${hours}:${minutes}`;

      wrapper.appendChild(input);
      
      getValue = () => input.value;
      break;
    }

    case 'dropdown': {
      const select = document.createElement('select');
      select.className = 'form-select';
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- 선택해 주세요 --';
      select.appendChild(defaultOption);

      const options = mod.options || [];
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      wrapper.appendChild(select);
      
      getValue = () => select.value;
      break;
    }

    case 'single_select': { // 라디오 버튼 그룹
      const groupDiv = document.createElement('div');
      groupDiv.className = 'radio-group';
      
      const options = mod.options || [];
      options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.className = 'option-control';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `radio_group_${mod.id}`;
        radio.value = opt;
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${opt}`));
        groupDiv.appendChild(label);
      });
      wrapper.appendChild(groupDiv);
      
      getValue = () => {
        const checkedRadio = groupDiv.querySelector('input[type="radio"]:checked');
        return checkedRadio ? checkedRadio.value : '';
      };
      break;
    }

    case 'checkbox':
    case 'multi_select': { // 체크박스/다중선택 그룹
      const groupDiv = document.createElement('div');
      groupDiv.className = 'checkbox-group';
      
      const options = mod.options || [];
      options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.className = 'option-control';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = `chk_group_${mod.id}`;
        checkbox.value = opt;
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${opt}`));
        groupDiv.appendChild(label);
      });
      wrapper.appendChild(groupDiv);
      
      getValue = () => {
        const checkedCheckboxes = groupDiv.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkedCheckboxes).map(cb => cb.value);
      };
      validate = () => {
        const vals = getValue();
        if (mod.required && vals.length === 0) {
          return `${mod.label} 필드는 최소 1개 이상 선택해 주세요.`;
        }
        return null;
      };
      break;
    }

    case 'signature': {
      const sigPadDiv = document.createElement('div');
      wrapper.appendChild(sigPadDiv);
      
      // 마운트 후 즉시 서명 패드 초기화
      let sigInstance = null;
      setTimeout(() => {
        sigInstance = new SignatureModule(sigPadDiv);
      }, 0);

      getValue = () => {
        return sigInstance ? sigInstance.getValue() : null;
      };
      validate = () => {
        const val = getValue();
        if (mod.required && (!val || val === '')) {
          return `${mod.label} 자필 서명이 필요합니다.`;
        }
        return null;
      };
      break;
    }

    case 'divider': {
      const headerDiv = document.createElement('div');
      headerDiv.style.marginTop = '2.5rem';
      headerDiv.style.marginBottom = '1.25rem';
      
      if (mod.label) {
        const heading = document.createElement('h3');
        heading.style.fontSize = '1.1rem';
        heading.style.fontWeight = '700';
        heading.style.marginBottom = '0.5rem';
        heading.style.color = 'var(--color-primary)';
        heading.textContent = mod.label;
        headerDiv.appendChild(heading);
      }
      
      const hr = document.createElement('hr');
      hr.style.border = 'none';
      hr.style.height = '1px';
      hr.style.backgroundColor = 'var(--border-color)';
      headerDiv.appendChild(hr);
      wrapper.appendChild(headerDiv);
      
      getValue = () => '';
      validate = () => null; // 구분선은 검증 통과
      break;
    }

    case 'info_text': {
      const infoBox = document.createElement('div');
      infoBox.style.padding = '1rem 1.25rem';
      infoBox.style.backgroundColor = 'var(--bg-tertiary)';
      infoBox.style.borderLeft = '4px solid var(--color-primary)';
      infoBox.style.borderRadius = 'var(--radius-sm)';
      infoBox.style.fontSize = '0.9rem';
      infoBox.style.color = 'var(--text-secondary)';
      infoBox.style.whiteSpace = 'pre-wrap';
      infoBox.textContent = mod.label || '';
      wrapper.appendChild(infoBox);
      
      getValue = () => '';
      validate = () => null; // 안내 텍스트는 검증 통과
      break;
    }

    default:
      console.warn('지원되지 않는 모듈 타입입니다:', mod.type);
  }

  container.appendChild(wrapper);

  return {
    element: wrapper,
    getValue,
    validate
  };
}
