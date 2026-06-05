import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { embed, generate, cosine } from './gemini';

const SIM_THRESHOLD = 0.5; // 이 미만이면 '관련 자료 없음'으로 간주

@Injectable()
export class RagService {
  constructor(private readonly prisma: PrismaService) {}

  // 문단 경계를 존중하며 약 size자 단위로 자른다
  private splitIntoChunks(text: string, size = 500): string[] {
    const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let buf = '';
    for (const p of paras) {
      if ((buf + '\n' + p).length > size && buf) { chunks.push(buf.trim()); buf = p; }
      else buf = buf ? buf + '\n' + p : p;
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.length ? chunks : [text];
  }

  // 색인: 업로드 → 청크 → 임베딩 → 저장
  async indexDocument(title: string, text: string) {
    const doc = await this.prisma.document.create({ data: { title } });
    const chunks = this.splitIntoChunks(text, 500);
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embed(chunks[i]);
      await this.prisma.chunk.create({
        data: { documentId: doc.id, content: chunks[i], embedding: JSON.stringify(vec), position: i },
      });
    }
    return { id: doc.id, title: doc.title, chunks: chunks.length };
  }

  async listDocuments() {
    return this.prisma.document.findMany({
      orderBy: { id: 'desc' },
      select: { id: true, title: true, createdAt: true, _count: { select: { chunks: true } } },
    });
  }

  // 운영 리포트: 문서 수·질문 수·답 못 한 질문·예상 비용
  async stats() {
    const docs = await this.prisma.document.count();
    const chunks = await this.prisma.chunk.count();
    const queries = await this.prisma.query.findMany({ orderBy: { id: 'desc' } });
    const answered = queries.filter((q) => q.answered).length;
    const unanswered = queries.filter((q) => !q.answered);
    // 질문당 임베딩+생성 대략 비용(추정): 약 $0.0003 → 원화 환산(1$=1400원 가정)
    const costUsd = +(queries.length * 0.0003).toFixed(4);
    return {
      docs,
      chunks,
      totalQueries: queries.length,
      answered,
      answerRate: queries.length ? Math.round((answered / queries.length) * 100) : 0,
      estCostUsd: costUsd,
      estCostKrw: Math.round(costUsd * 1400),
      unanswered: unanswered.slice(0, 8).map((q) => q.question),
    };
  }

  // 질문 → 가까운 조각 검색 → 근거로만 답변
  async ask(question: string) {
    const qVec = await embed(question);
    const all = await this.prisma.chunk.findMany({ include: { document: true } });
    if (!all.length) return { answer: '먼저 문서를 업로드해주세요.', sources: [] };

    const ranked = all
      .map((c) => ({ c, sim: cosine(qVec, JSON.parse(c.embedding)) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 4);

    // 가장 가까운 조각도 기준 미만이면 '자료 없음'
    if (!ranked.length || ranked[0].sim < SIM_THRESHOLD) {
      await this.prisma.query.create({ data: { question, answered: false, topSim: ranked[0]?.sim ?? 0 } });
      return { answer: '자료에 없습니다.', sources: [], topSim: ranked[0]?.sim ?? 0 };
    }

    const context = ranked.map((r) => r.c.content).join('\n---\n');
    const answer = await generate(question, context);

    // 모델이 '자료에 없음'으로 판단하면, 오해를 주는 출처는 표시하지 않는다(환각 방지의 연장).
    if (/자료에 없습니다/.test(answer)) {
      await this.prisma.query.create({ data: { question, answered: false, topSim: ranked[0].sim } });
      return { answer: '자료에 없습니다.', sources: [], topSim: ranked[0].sim };
    }
    await this.prisma.query.create({ data: { question, answered: true, topSim: ranked[0].sim } });

    const sources = ranked.map((r) => ({
      doc: r.c.document.title,
      position: r.c.position,
      similarity: Math.round(r.sim * 100),
      preview: r.c.content.slice(0, 60),
    }));
    return { answer, sources };
  }
}
