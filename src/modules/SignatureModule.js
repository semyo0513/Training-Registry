export class SignatureModule {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      strokeStyle: '#1a1a2e',   // 진한 남색 (볼펜 느낌)
      lineJoin: 'round',
      lineCap: 'round',
      globalAlpha: 0.92,
      minWidth: 0.8,
      maxWidth: 3.5,
      ...options
    };

    this.points = [];
    this.isDrawing = false;
    this.lastVelocity = 0;
    this.lastWidth = (this.options.minWidth + this.options.maxWidth) / 2;
    this.hasDrawn = false; // 서명이 작성되었는지 확인하는 플래그

    this.initDOM();
    this.initCanvas();
    this.bindEvents();
  }

  // 1. DOM 레이아웃 생성
  initDOM() {
    this.container.innerHTML = `
      <div class="signature-container">
        <div class="signature-canvas-wrapper">
          <canvas></canvas>
          <div class="signature-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m19 12-7-7-9 9c-1.25 1.25-1.25 3.28 0 4.53 1.25 1.25 3.28 1.25 4.53 0l11.5-11.5z"/><path d="m15 16-3-3"/><path d="m17 14-3-3"/><path d="m19 12-3-3"/></svg>
            <span>이곳에 서명해 주세요</span>
          </div>
        </div>
        <div class="signature-actions">
          <div class="signature-modes">
            <button type="button" class="btn btn-outline btn-sm signature-upload-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              이미지 업로드
              <input type="file" accept="image/*" class="file-input">
            </button>
          </div>
          <button type="button" class="btn btn-secondary btn-sm clear-btn">지우기</button>
        </div>
      </div>
    `;

    this.wrapper = this.container.querySelector('.signature-canvas-wrapper');
    this.canvas = this.container.querySelector('canvas');
    this.placeholder = this.container.querySelector('.signature-placeholder');
    this.clearBtn = this.container.querySelector('.clear-btn');
    this.fileInput = this.container.querySelector('.file-input');
  }

  // 2. 캔버스 해상도 및 컨텍스트 초기화
  initCanvas() {
    this.ctx = this.canvas.getContext('2d');
    
    // 고해상도 화면 대응 (Retina 등 선명도 확보)
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 크기가 화면에 렌더링되지 않았을 경우 기본값 적용
    const width = rect.width || 450;
    const height = rect.height || 180;
    
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // 캔버스 스타일 너비/높이 명시
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // 기본 선 스타일 캐싱
    this.ctx.strokeStyle = this.options.strokeStyle;
    this.ctx.lineJoin = this.options.lineJoin;
    this.ctx.lineCap = this.options.lineCap;
    this.ctx.globalAlpha = this.options.globalAlpha;
  }

  // 3. 포인터 이벤트 바인딩
  bindEvents() {
    // 포인터(마우스/터치 통합) 리스너
    this.canvas.addEventListener('pointerdown', (e) => this.startDraw(e));
    this.canvas.addEventListener('pointermove', (e) => this.draw(e));
    this.canvas.addEventListener('pointerup', () => this.endDraw());
    this.canvas.addEventListener('pointercancel', () => this.endDraw());
    
    // 지우기 버튼 리스너
    this.clearBtn.addEventListener('click', () => this.clear());
    
    // 파일 업로드 리스너
    this.fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
  }

  // 4. 드로잉 기능 로직

  // 속도 기반 선 굵기 조절 (필압 시뮬레이션)
  getLineWidth(speed) {
    // speed가 빠를수록 선이 가늘어지게 설정
    const minWidth = this.options.minWidth;
    const maxWidth = this.options.maxWidth;
    const computed = maxWidth - speed * 0.25;
    return Math.max(minWidth, Math.min(maxWidth, computed));
  }

  startDraw(e) {
    e.preventDefault();
    this.isDrawing = true;
    this.hasDrawn = true;
    this.placeholder.style.display = 'none';
    this.wrapper.classList.add('active');

    const pos = this.getPointerPos(e);
    this.points = [{ x: pos.x, y: pos.y, time: Date.now() }];
    
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.options.minWidth / 2, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = this.options.strokeStyle;
    this.ctx.fill();
  }

  draw(e) {
    if (!this.isDrawing) return;
    e.preventDefault();

    const pos = this.getPointerPos(e);
    const now = Date.now();
    const currPoint = { x: pos.x, y: pos.y, time: now };
    
    this.points.push(currPoint);

    if (this.points.length > 2) {
      // 1. 이전 포인트와 현재 포인트 간의 거리와 속도 계산
      const prevPoint = this.points[this.points.length - 2];
      const dist = Math.sqrt(Math.pow(currPoint.x - prevPoint.x, 2) + Math.pow(currPoint.y - prevPoint.y, 2));
      const timeDiff = currPoint.time - prevPoint.time;
      const speed = timeDiff > 0 ? dist / timeDiff : 0;
      
      // 2. 새로운 두께 계산 및 보간 (부드러운 변환 적용)
      const targetWidth = this.getLineWidth(speed);
      const newWidth = this.lastWidth * 0.7 + targetWidth * 0.3; // 지수 가중 이동 평균 적용
      
      this.ctx.lineWidth = newWidth;
      this.lastWidth = newWidth;

      // 3. 베지어 곡선(이전 점과 현재 점의 중간점을 제어점으로 사용)으로 곡선 드로잉
      const pointsCount = this.points.length;
      const p1 = this.points[pointsCount - 3];
      const p2 = this.points[pointsCount - 2];
      const p3 = this.points[pointsCount - 1];

      const midX = (p2.x + p3.x) / 2;
      const midY = (p2.y + p3.y) / 2;

      this.ctx.beginPath();
      // p1과 p2의 중간점에서 시작
      const startMidX = (p1.x + p2.x) / 2;
      const startMidY = (p1.y + p2.y) / 2;
      this.ctx.moveTo(startMidX, startMidY);
      
      // p2를 조절점으로 삼아 p2와 p3의 중간점까지 베지어 곡선을 그림
      this.ctx.quadraticCurveTo(p2.x, p2.y, midX, midY);
      this.ctx.stroke();
    }
  }

  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.wrapper.classList.remove('active');
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // 5. 이미지 파일 업로드 처리
  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.clear();
        this.placeholder.style.display = 'none';
        this.hasDrawn = true;

        const canvasW = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasH = this.canvas.height / (window.devicePixelRatio || 1);

        // 이미지 종횡비를 깨지 않으면서 캔버스 중앙에 배치
        const scale = Math.min(canvasW / img.width, canvasH / img.height);
        const x = (canvasW - img.width * scale) / 2;
        const y = (canvasH - img.height * scale) / 2;
        
        this.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 6. 데이터 가져오기 및 초기화 인터페이스
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));
    this.points = [];
    this.isDrawing = false;
    this.hasDrawn = false;
    this.placeholder.style.display = 'flex';
    this.fileInput.value = ''; // 파일 필드 리셋
  }

  getValue() {
    if (!this.hasDrawn) return null;
    // Base64 PNG 데이터 URL 익스포트
    return this.canvas.toDataURL('image/png');
  }

  isEmpty() {
    return !this.hasDrawn;
  }
}
