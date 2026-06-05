const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const API = 'http://localhost:3003/api/ask';
const QS = [
  '환불은 제품을 받고 며칠 이내에 신청할 수 있나요?',
  '배송비는 얼마이고 언제 무료인가요?',
  '제품 불량일 때 교환은 며칠 이내에 무료인가요?',
  '환불 금액은 며칠 이내에 어떤 수단으로 반환되나요?',
  '매장에 주차장이 있나요?',
  '영업시간은 언제인가요?',
  '매장 위치가 어디인가요?',
  '와이파이 비밀번호 알려줘',
];
(async () => {
  await prisma.query.deleteMany({});
  for (const q of QS) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
    const j = await r.json();
    console.log(/자료에 없습니다/.test(j.answer) ? 'NO ' : 'OK ', q);
  }
  const n = await prisma.query.count();
  const ans = await prisma.query.count({ where: { answered: true } });
  console.log(`logged ${n}, answered ${ans}`);
  await prisma.$disconnect();
})();
