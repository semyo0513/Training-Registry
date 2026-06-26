# 📋 모두의 연수등록부 (Everyone's Training Registry)

> **Vite (Vanilla JS) + Google Sheets (via Google Apps Script Web App) + GitHub Pages**  
> 학교 연수·협의회·회의 등의 출석체크 및 동적 정보 수집을 디지털화하는 초경량 반응형 웹 애플리케이션입니다.

---

## ✨ 핵심 기능

1. **동적 폼 빌더 (Form Builder)**
   - 드래그 앤 드롭 또는 원클릭 추가 방식으로 설문/출석 필드를 자유롭게 커스터마이징할 수 있습니다.
   - 단답형, 장문형, 숫자, 선택형(라디오/체크/드롭다운), 날짜/시간, 구분선, 안내 상자 등 지원.
2. **프리미엄 자필 서명 패드 (Signature Pad)**
   - 모바일 터치패드와 데스크톱 마우스 드로잉을 동시 지원합니다.
   - 마우스 이동 속도에 반비례하는 선 두께 연산(필압 효과) 및 베지어 곡선 보간을 통해 부드럽고 자연스러운 필기감을 선사합니다.
   - 스캔된 서명 이미지 파일을 업로드해 가져올 수 있습니다.
3. **출석 대장 및 파일 내보내기**
   - 실시간으로 취합되는 참석자 서명 이미지와 응답 상태를 테이블로 확인 가능합니다.
   - **CSV**: 엑셀 한글 깨짐이 방지된 UTF-8 BOM 양식의 스프레드시트 출력.
   - **PDF**: CDN에서 폰트(나눔고딕)를 실시간 로드해 서체 깨짐을 방지하고 서명을 정교하게 임베딩한 인쇄용 PDF 출력.
4. **로컬 Mock DB 지원**
   - 별도 서버 연동 없이 브라우저 단독으로 `localStorage`를 매핑해 100% 동작을 테스트해 볼 수 있습니다.
5. **다크 모드 & 프리미엄 UI**
   - 반응형 레이아웃 및 심미성이 강화된 글래스모피즘 라이트/다크 테마가 유기적으로 작동합니다.

---

## 🏗️ 시스템 아키텍처

```
[ GitHub Pages ]          [ Google Apps Script ]        [ Google Sheets ]
 Vite 빌드 정적웹  ──(POST)──→  doPost / doGet Web App  ──→   스프레드시트 DB
 (SPA Router, JS)              - 연수 정보 저장              - trainings 시트
                               - 서명 데이터 수집            - responses_{id} 시트
```

---

## 🚀 시작하기 (로컬 설치 및 개발)

### 의존성 설치
```bash
npm install
```

### 로컬 개발 서버 실행
```bash
npm run dev
```
- 실행 후 브라우저에서 `http://localhost:3000`으로 자동 접속됩니다.
- 초기 관리자 페이지 암호는 `1234` 입니다.

### 프로덕션 빌드
```bash
npm run build
```

---

## ☁️ Google Apps Script (백엔드) 연동 가이드

1. Google Drive에서 **새 스프레드시트**를 만듭니다.
2. 상단 메뉴의 **확장 프로그램** -> **Apps Script**를 선택합니다.
3. 프로젝트 내의 `gas/Code.gs` 소스코드를 복사하여 Apps Script 에디터에 붙여넣고 저장합니다.
4. 우측 상단 **배포** -> **새 배포**를 누른 뒤 유형을 **웹 앱**으로 선택합니다.
   - **웹앱을 실행할 사용자**: `나 (본인 계정)`
   - **액세스 권한이 있는 사용자**: `모든 사용자` (참석자가 구글 로그인 없이 등록할 수 있어야 함)
5. 배포 완료 후 발급된 **웹 앱 URL**을 복사합니다.
6. 본 웹 애플리케이션의 관리자 대시보드 하단 연동 설정창에 해당 주소를 입력하고 **연동 저장**을 누르면 연동이 즉시 개시됩니다.

---

## 📂 프로젝트 구조

```
모두의연수등록부/
├── index.html
├── vite.config.js
├── package.json
├── README.md
├── gas/
│   └── Code.gs                 # Google Apps Script 전체 코드
├── src/
│   ├── main.js                 # 애플리케이션 진입점 및 라우터
│   ├── config.js               # GAS 연동 주소 구성 파일
│   ├── styles/
│   │   └── main.css            # 라이트/다크 테마 디자인 시스템 CSS
│   ├── pages/
│   │   ├── UserPage.js         # 사용자 출석 폼 작성 페이지
│   │   ├── AdminPage.js        # 관리자 대시보드 및 로그인 페이지
│   │   ├── FormBuilder.js      # 드래그앤드롭 폼 빌더 페이지
│   │   └── ResponseView.js     # 참석 데이터 대장 확인 페이지
│   ├── modules/
│   │   ├── SignatureModule.js  # 서명 캔버스 구현체
│   │   └── ModuleRenderer.js   # 필드 동적 렌더링 및 검증 모듈
│   └── utils/
│       ├── api.js              # GAS API & Mock DB 호출 통합 모듈
│       ├── pdf.js              # 동적 한글 폰트 VFS 탑재 PDF 인쇄 엔진
│       └── csv.js              # UTF-8 BOM CSV 내보내기 유틸
└── gas/
    └── Code.gs                 # Google Sheets DB 통신용 GAS 코드
```
