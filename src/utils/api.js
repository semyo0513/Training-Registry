import { config } from '../config';

// -------------------------------------------------------------
// 초기 Mock 데이터 시딩 (로컬 테스트용)
// -------------------------------------------------------------
const DEFAULT_MOCK_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqQX6dAAAABmJLR0QA/wD/AP+gvaeTAAAClElEQVR4nO2cwUtUURzHP+8Zc1Ka/gHTKkSpFpG0CDdK2hS0ClK3LgK3LfoPQbsW/QdBtChasSAIwVVBtHAREaKICFpEE5lOZ97ToeMwzszoe/PeTOf7gZl57757Pvd373v3vd8dEEIIIYQQQgghhBBCCCFE0xGxAsvJqN161K49atceoVqPAgAM1XoMAGo9FvGqXQ+B9ShT6xG1HlHrcd4K1HoArEeRWo9vtd6dWo+o9TirQ5+NlGvj+Nnx1HqUqfUoU+tRptajTK3HJ2tS+B/11XoAan1p/hRQa5tQawE12i6P+7n/K6q0XfO13d9sYxM3t/Yxt/4u1W2/uG2/6C+u15hV7v87hBBC3BYR21P9ZNRuPWq3HrVrj1CtRwEAhmq9B8bXei/w+FovMNeK1XrUerZ9L/lW6zVjPRbxeVjEr/UoU+tRptajTK1HmVqPy7XxrV822sW2DdV6DKz3E6o9rPee1P4E1nvq+Z5a+6m1Taq01XP9hDq+p3v5+T3VbaD7m9s213G/Wn0AEEIIIYQQQgghhBBCtDIRK7CcjNqtR+3ao3btEar1KADAUK3HANR6PGBhvQd4WK/x9Dyr1WMRr9rjYfF6POw9tZ7t1Hpy1nsgW7156y1k61l/51XrmdZqfWn+TGPWsM1j1nbD2G7N1vOaZ9R7v4s46D2T1u+J0P9f9d7rV95Z1e+p915P7WeW95/fR/13Gj/fFm2W3P+K2H4+o/y6aPv/3H++WwghhBBC3DYR21P9ZNRuPWq3HrVrj1CtRwEAhmq9BwDVeiySVa3HA1a29ex11Xo8fF5XrcfD1vPUesf/WqX1fK72K1O/d5/t5/uq9f6z3v+p/wHwKqK2gXv2iAAAAABJRU5ErkJggg==';

const SEED_TRAININGS = [
  {
    id: 'tr_seed_1',
    title: '2026학년도 제1차 학교운영위원회 협의연수',
    date: '2026-06-26',
    location: '본관 2층 회의실',
    modules: [
      { id: 'mod_1', type: 'divider', label: '기본 정보' },
      { id: 'mod_2', type: 'single_select', label: '위원 구분', required: true, options: ['교원위원', '학부모위원', '지역위원'] },
      { id: 'mod_3', type: 'divider', label: '서명 및 동의' },
      { id: 'mod_4', type: 'checkbox', label: '개인정보 수집 및 연수 시간 등재 동의', required: true, options: ['동의합니다.'] },
      { id: 'mod_5', type: 'signature', label: '참석자 자필서명', required: true }
    ],
    createdAt: '2026-06-26T12:00:00.000Z'
  },
  {
    id: 'tr_seed_2',
    title: '2026학년도 교직원 심폐소생술 및 응급처치 교육',
    date: '2026-07-03',
    location: '체육관',
    modules: [
      { id: 'mod_201', type: 'short_text', label: '소속 (부서명)', required: true, placeholder: '예: 교무기획부, 행정실' },
      { id: 'mod_202', type: 'dropdown', label: '직위', required: true, options: ['교사', '부장교사', '교감', '교장', '행정직원', '공무직', '기타'] },
      { id: 'mod_203', type: 'time', label: '입장 시간', required: true },
      { id: 'mod_204', type: 'signature', label: '교육 이수 서명', required: true }
    ],
    createdAt: '2026-06-26T12:30:00.000Z'
  }
];

const SEED_RESPONSES = {
  'tr_seed_1': [
    {
      timestamp: '2026-06-26T13:10:00.000Z',
      name: '홍길동',
      responses: {
        'mod_2': '교원위원',
        'mod_4': ['동의합니다.'],
        'mod_5': DEFAULT_MOCK_SIGNATURE
      }
    },
    {
      timestamp: '2026-06-26T13:15:00.000Z',
      name: '김영희',
      responses: {
        'mod_2': '학부모위원',
        'mod_4': ['동의합니다.'],
        'mod_5': DEFAULT_MOCK_SIGNATURE
      }
    },
    {
      timestamp: '2026-06-26T13:22:00.000Z',
      name: '이철수',
      responses: {
        'mod_2': '지역위원',
        'mod_4': ['동의합니다.'],
        'mod_5': DEFAULT_MOCK_SIGNATURE
      }
    }
  ],
  'tr_seed_2': [
    {
      timestamp: '2026-06-26T13:05:00.000Z',
      name: '강감찬',
      responses: {
        'mod_201': '체육진로부',
        'mod_202': '부장교사',
        'mod_203': '13:02',
        'mod_204': DEFAULT_MOCK_SIGNATURE
      }
    }
  ]
};

// 로컬 스토리지에 초기 데이터가 없으면 시딩
function initializeLocalStorageMock() {
  if (!localStorage.getItem('everyone_register_trainings')) {
    localStorage.setItem('everyone_register_trainings', JSON.stringify(SEED_TRAININGS));
  }
  Object.keys(SEED_RESPONSES).forEach(trId => {
    const key = `everyone_register_responses_${trId}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(SEED_RESPONSES[trId]));
    }
  });
  if (!localStorage.getItem('everyone_register_admin_pw')) {
    // 기본 관리자 비밀번호: 1234
    localStorage.setItem('everyone_register_admin_pw', '1234');
  }
}

// 초기화 호출
initializeLocalStorageMock();

// -------------------------------------------------------------
// GAS API 및 Local Mock API 통합 서비스 레이어
// -------------------------------------------------------------
export const api = {
  // 1. 공통 비동기 통신 헬퍼
  async _request(action, payload = {}) {
    if (config.isMockMode()) {
      return this._mockRequest(action, payload);
    }

    const gasUrl = config.getGasUrl();
    try {
      // POST 통신
      const response = await fetch(gasUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // GAS doPost 대응용
        },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message || 'API 호출 에러 발생');
      }
      return data.data;
    } catch (error) {
      console.error(`GAS API Error (${action}):`, error);
      throw error;
    }
  },

  // 2. Local Mock API 처리
  _mockRequest(action, payload) {
    return new Promise((resolve, reject) => {
      // 50ms~150ms 딜레이를 두어 네트워크 환경 체감 시뮬레이션
      setTimeout(() => {
        try {
          const trainingsKey = 'everyone_register_trainings';
          let trainings = JSON.parse(localStorage.getItem(trainingsKey) || '[]');

          switch (action) {
            case 'adminLogin': {
              const savedPw = localStorage.getItem('everyone_register_admin_pw') || '1234';
              if (payload.password === savedPw) {
                // 임의의 세션 토큰 발급
                const token = 'mock_token_' + Math.random().toString(36).substring(2);
                localStorage.setItem('everyone_register_session', token);
                resolve({ success: true, token });
              } else {
                reject(new Error('비밀번호가 올바르지 않습니다.'));
              }
              break;
            }

            case 'getTrainings': {
              resolve(trainings);
              break;
            }

            case 'getForm': {
              const tr = trainings.find(t => t.id === payload.id);
              if (tr) {
                resolve(tr);
              } else {
                reject(new Error('해당 연수를 찾을 수 없습니다.'));
              }
              break;
            }

            case 'createTraining': {
              const newId = 'tr_' + Date.now();
              const newTraining = {
                id: newId,
                title: payload.title,
                date: payload.date,
                location: payload.location,
                modules: payload.modules || [],
                createdAt: new Date().toISOString()
              };
              trainings.unshift(newTraining);
              localStorage.setItem(trainingsKey, JSON.stringify(trainings));
              resolve(newTraining);
              break;
            }

            case 'updateForm': {
              const index = trainings.findIndex(t => t.id === payload.id);
              if (index !== -1) {
                trainings[index].modules = payload.modules;
                localStorage.setItem(trainingsKey, JSON.stringify(trainings));
                resolve(trainings[index]);
              } else {
                reject(new Error('해당 연수를 찾을 수 없습니다.'));
              }
              break;
            }

            case 'deleteTraining': {
              trainings = trainings.filter(t => t.id !== payload.id);
              localStorage.setItem(trainingsKey, JSON.stringify(trainings));
              // 응답 시트도 삭제
              localStorage.removeItem(`everyone_register_responses_${payload.id}`);
              resolve({ success: true });
              break;
            }

            case 'submitResponse': {
              const respKey = `everyone_register_responses_${payload.trainingId}`;
              const resps = JSON.parse(localStorage.getItem(respKey) || '[]');
              const newResponse = {
                timestamp: new Date().toISOString(),
                name: payload.name,
                responses: payload.responses
              };
              resps.push(newResponse);
              localStorage.setItem(respKey, JSON.stringify(resps));
              resolve({ success: true });
              break;
            }

            case 'getResponses': {
              const respKey = `everyone_register_responses_${payload.id}`;
              const resps = JSON.parse(localStorage.getItem(respKey) || '[]');
              resolve(resps);
              break;
            }

            default:
              reject(new Error(`정의되지 않은 모의 액션: ${action}`));
          }
        } catch (e) {
          reject(e);
        }
      }, Math.random() * 100 + 50);
    });
  },

  // -------------------------------------------------------------
  // 퍼블릭 API 인터페이스
  // -------------------------------------------------------------
  
  // 관리자 로그인
  login(password) {
    return this._request('adminLogin', { password });
  },

  // 연수 목록 가져오기
  getTrainings() {
    return this._request('getTrainings');
  },

  // 특정 연수 폼 스키마 가져오기
  getForm(id) {
    return this._request('getForm', { id });
  },

  // 연수 등록 정보 제출
  submitResponse(trainingId, name, responses) {
    return this._request('submitResponse', { trainingId, name, responses });
  },

  // 새 연수 생성
  createTraining(title, date, location, modules = []) {
    return this._request('createTraining', { title, date, location, modules });
  },

  // 연수 삭제
  deleteTraining(id) {
    return this._request('deleteTraining', { id });
  },

  // 연수 폼 구성 업데이트
  updateForm(id, modules) {
    return this._request('updateForm', { id, modules });
  },

  // 특정 연수 응답 결과 리스트 가져오기
  getResponses(id) {
    return this._request('getResponses', { id });
  },

  // 로컬 테스트용 비밀번호 리셋/조회 헬퍼
  resetLocalPassword(newPw) {
    localStorage.setItem('everyone_register_admin_pw', newPw);
    return true;
  },

  // 로컬 테스트용 Mock 데이터 리셋 헬퍼
  resetMockData() {
    localStorage.removeItem('everyone_register_trainings');
    SEED_TRAININGS.forEach(t => {
      localStorage.removeItem(`everyone_register_responses_${t.id}`);
    });
    initializeLocalStorageMock();
    return true;
  }
};
