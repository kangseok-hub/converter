# 🎓 9등급 환산 적정 대학 찾기

> 5등급제 내신 성적을 9등급제로 환산하여 **2025학년도 입결 데이터** 기반으로 적정 대학·학과를 추천해주는 웹 앱입니다.

---

## ✨ 주요 기능

- **5등급 → 9등급 자동 환산** : 문·이과 혼합, 문과, 이과 방식 중 선택
- **등급 계산기** : 과목별 이수단위를 입력해 평균 등급 자동 계산
- **2025학년도 입결 검색** : 환산된 등급 기준 ±범위 내 대학·학과 필터링
- **카테고리 필터** : 인문, 자연, 의약, 교육, 예체능 등 계열별 분류
- **소신/적정/안정** 지원 범위 표시

---

## 🚀 시작하기

### 사전 요구사항

- [Node.js](https://nodejs.org/) 18 이상

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/<your-username>/grade-university-finder.git
cd grade-university-finder

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속하세요.

### 빌드

```bash
npm run build
```

---

## 🛠️ 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프레임워크 | React 19 + TypeScript |
| 빌드 도구 | Vite 6 |
| 스타일링 | Tailwind CSS v4 |
| 애니메이션 | Motion (Framer Motion) |
| 아이콘 | Lucide React |

---

## 📁 프로젝트 구조

```
src/
├── App.tsx                 # 메인 앱 컴포넌트
├── main.tsx                # 진입점
├── index.css               # 전역 스타일
├── data/
│   ├── rawCSV.ts           # 2025학년도 입결 원본 데이터
│   └── conversionData.ts   # 등급 환산 기준표
└── lib/
    └── admissionUtils.ts   # 등급 환산 · CSV 파싱 유틸
```

---

## 📊 데이터 출처

- 2025학년도 대학별 입시 결과(입결) 자료 기반
- 등급 환산 방식: 문·이과 혼합 / 문과 / 이과 3가지 선택 가능

---

## 📄 라이선스

MIT License
