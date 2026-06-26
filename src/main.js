import './styles/main.css';
import { UserPage } from './pages/UserPage';
import { AdminPage } from './pages/AdminPage';
import { FormBuilder } from './pages/FormBuilder';
import { ResponseView } from './pages/ResponseView';

// -------------------------------------------------------------
// 1. 글로벌 토스트 알림 시스템
// -------------------------------------------------------------
let toastContainer = null;

export function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // 타입별 아이콘 설정
  let icon = '';
  if (type === 'success') {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
  } else if (type === 'danger') {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
  } else if (type === 'warning') {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
  } else {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>';
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  // 나타나는 트랜지션 이후 지정된 시간 후에 제거
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// -------------------------------------------------------------
// 2. 다크 모드 토글 컨트롤
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('everyone_register_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('everyone_register_theme', next);
  updateThemeIcon(next);
  showToast(`${next === 'dark' ? '다크 테마' : '라이트 테마'}가 적용되었습니다.`, 'info', 1500);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  if (theme === 'dark') {
    // 해 모양 아이콘
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  } else {
    // 달 모양 아이콘
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  }
}

// -------------------------------------------------------------
// 3. 네비게이션 헤더 렌더링
// -------------------------------------------------------------
function renderHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="header-container">
      <a href="#/" class="logo">
        <div class="logo-icon">✍</div>
        모두의 연수등록부
      </a>
      <div class="nav-links">
        <a href="#/" class="nav-link" id="nav-user">참여자 등록</a>
        <a href="#/admin" class="nav-link" id="nav-admin">관리자 대시보드</a>
        <button id="theme-toggle-btn" class="theme-toggle" aria-label="테마 토글"></button>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(header);

  // 테마 토글 핸들러 부착
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
}

// -------------------------------------------------------------
// 4. 해시 라우팅 시스템
// -------------------------------------------------------------
function updateActiveNavLink(hash) {
  const userLink = document.getElementById('nav-user');
  const adminLink = document.getElementById('nav-admin');
  
  if (!userLink || !adminLink) return;

  userLink.classList.remove('active');
  adminLink.classList.remove('active');

  if (hash === '#/' || hash === '' || hash.startsWith('#/user')) {
    userLink.classList.add('active');
  } else if (hash.startsWith('#/admin') || hash.startsWith('#/builder') || hash.startsWith('#/responses')) {
    adminLink.classList.add('active');
  }
}

function router() {
  const app = document.getElementById('app');
  let main = app.querySelector('.main-content');
  
  if (!main) {
    main = document.createElement('main');
    main.className = 'main-content';
    app.appendChild(main);
  }

  // 애니메이션 트리거를 위해 클래스 재적용
  main.style.animation = 'none';
  // 브라우저 렌더 큐 비우기 트리거
  void main.offsetHeight;
  main.style.animation = null;

  const hash = window.location.hash || '#/';
  updateActiveNavLink(hash);

  // 1. 라우트 파싱 및 렌더링
  if (hash === '#/' || hash === '' || hash.startsWith('#/user')) {
    // 사용자 페이지: #/ 또는 #/user?id=xxx
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    const id = params.get('id');
    new UserPage(main, { trainingId: id });
  } 
  else if (hash === '#/admin') {
    // 관리자 페이지
    new AdminPage(main);
  } 
  else if (hash.startsWith('#/builder')) {
    // 폼 빌더: #/builder?id=xxx
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    const id = params.get('id');
    new FormBuilder(main, { trainingId: id });
  } 
  else if (hash.startsWith('#/responses/')) {
    // 연수 응답 결과 조회: #/responses/tr_xxx
    const parts = hash.split('/');
    const id = parts[2];
    new ResponseView(main, { trainingId: id });
  } 
  else {
    // 404 Fallback
    main.innerHTML = `
      <div class="card" style="text-align: center; max-width: 500px; margin: 4rem auto;">
        <h2 style="font-size: 2rem; color: var(--color-danger); margin-bottom: 1rem;">404 Not Found</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">요청하신 페이지를 찾을 수 없습니다.</p>
        <a href="#/" class="btn btn-primary">홈으로 돌아가기</a>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// 5. 앱 초기 실행 진입점
// -------------------------------------------------------------
function initApp() {
  document.getElementById('app').innerHTML = ''; // 초기 청소
  renderHeader();
  initTheme();
  
  // 라우터 바인딩
  window.addEventListener('hashchange', router);
  router(); // 최초 실행
}

document.addEventListener('DOMContentLoaded', initApp);
// 만약 DOMContentLoaded가 이미 실행된 시점인 경우에도 즉시 초기화되도록 대응
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initApp();
}
