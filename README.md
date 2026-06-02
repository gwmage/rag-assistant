# AI 지식 도우미 (RAG)

도서 **《설계 지능》(이지스퍼블리싱)**의 **실전 프로젝트 III** 예제 소스입니다.
업로드한 '내 문서'의 내용만 근거로 답하고, 자료에 없으면 "자료에 없습니다"라고 답해 환각을 막는 RAG 지식 도우미입니다.

## 핵심 개념
- **임베딩**: 문서 조각의 '의미'를 좌표(벡터)로 변환 (Gemini `gemini-embedding-001`)
- **벡터 검색**: 질문 좌표와 가장 가까운 조각을 코사인 유사도로 찾음
- **근거 기반 생성**: 찾은 조각만 근거로 답하고, 없으면 "자료에 없습니다" (환각 방지)
- **출처 표시**: 답의 근거가 된 문서·조각·유사도를 함께 보여줌

## 기술 스택
| 영역 | 도구 |
|------|------|
| 백엔드 | NestJS + Prisma |
| 데이터베이스 | SQLite(로컬). 임베딩은 JSON으로 저장, 검색은 코사인 유사도(JS) — 추가 설치 0 |
| AI | Google Gemini (임베딩 + 생성) |
| 프론트엔드 | 정적 HTML + Tailwind |

> 배포 시에는 PostgreSQL + pgvector로 확장할 수 있습니다(책 26장). 로컬 학습용은 SQLite로 충분합니다.

## 실행 방법
```
cd backend
npm install
cp .env.example .env        # GEMINI_API_KEY 채우기
npm run prisma:push
npm start                   # http://localhost:3003

cd frontend
python -m http.server 3000  # http://localhost:3000
```
문서를 붙여넣어 색인한 뒤 질문하면, 문서 근거와 출처를 함께 답합니다. 문서에 없는 질문에는 "자료에 없습니다"라고 답합니다.

> ⚠️ `.env`와 `*.db`는 절대 커밋 금지(`.gitignore`로 제외됨).
