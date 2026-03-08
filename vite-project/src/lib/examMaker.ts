import type { ExamSectionDef, ExamSectionData, HistoryLog, QuestionItem } from './types';



export const EXAM_SECTIONS: ExamSectionDef[] = [
  { sheet: '부수', count: 5, title: '다음 漢字의 部首(부수)를 쓰시오.', q_idx: 2, a_idx: 4, dedup_idx: 2, fmt: (q) => `${q}` },
  { sheet: '약자', count: 3, title: '다음 漢字의 略字(약자)를 쓰시오.', q_idx: 2, a_idx: 4, dedup_idx: 2, fmt: (q) => `${q}` },
  { sheet: '유의어반의어상대어', count: 5, title: '다음 漢字와 비슷한 뜻을 가진 漢字[正字]를 ( ) 안에 써넣으시오.', q_idx: 3, a_idx: 5, dedup_idx: 3, filter: (row) => (row[2] || '').includes('유의어'), fmt: (q) => `${q}` },
  { sheet: '유의어반의어상대어', count: 5, title: '다음 漢字와 뜻이 反對 또는 相對되는 漢字[正字]를 써서 漢字語를 완성하시오.', q_idx: 3, a_idx: 5, dedup_idx: 3, filter: (row) => ((row[2] || '').includes('반의어') || (row[2] || '').includes('상대어')) && !(row[3] || '').includes('↔'), fmt: (q) => `${q}` },
  { sheet: '유의어반의어상대어', count: 5, title: '다음 漢字語의 反義語 또는 相對語를 2음절로 된 漢字[正字]로 쓰시오.', q_idx: 3, a_idx: 5, dedup_idx: 3, filter: (row) => ((row[2] || '').includes('반의어') || (row[2] || '').includes('상대어')) && (row[3] || '').includes('↔'), fmt: (q) => `${q}` },
  { sheet: '뜻풀이', count: 5, title: '다음 漢字語의 뜻을 쓰시오.', q_idx: 2, a_idx: 4, dedup_idx: 2, fmt: (q) => `${q}` },
  { sheet: '같은 음 단어', count: 5, title: '다음 ( )안의 단어와 음이 같은 同音異義語를 쓰시오.', q_idx: 2, d_idx: 3, a_idx: 4, dedup_idx: 2, fmt: (q, d) => d ? `${q} - ${d}` : q },
  { sheet: '사자성어', count: 10, title: '다음 ( ) 안에 알맞은 漢字를 써서 四字成語를 완성하시오.', q_idx: 2, a_idx: 3, dedup_idx: 2, fmt: (q) => `${q}` },
  { sheet: '쓰기', count: 30, title: '다음 밑줄 친 단어를 漢字(정자)로 쓰시오.', q_idx: 2, d_idx: 3, a_idx: 3, dedup_idx: 2, fmt: (q) => `${q}` }
];



// Utility to randomly sample items
function sampleSize<T>(array: T[], n: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
}

export async function generateExamData(parsedData: Record<string, string[][]>, historyLog: HistoryLog): Promise<{ examData: ExamSectionData[], updatedHistory: HistoryLog }> {
  const examData: ExamSectionData[] = [];
  const updatedHistory: HistoryLog = JSON.parse(JSON.stringify(historyLog));

  for (const section of EXAM_SECTIONS) {
    const sheetName = section.sheet;
    const rawData = parsedData[sheetName];
    
    if (!updatedHistory[sheetName]) {
      updatedHistory[sheetName] = [];
    }
    const pastQuestionsLog = new Set(updatedHistory[sheetName]);

    if (!rawData || rawData.length < 3) continue;
    // Skip first 2 rows
    const dataRows = rawData.slice(2);

    const uniqueCandidates: { data: string[], key: string }[] = [];
    const seenInThisSession = new Set<string>();

    const qCol = section.q_idx;
    const aCol = section.a_idx;
    const dedupCol = section.dedup_idx !== undefined ? section.dedup_idx : qCol;

    for (const row of dataRows) {
      if (row.length <= qCol) continue;
      if (section.filter && !section.filter(row)) continue;

      const qVal = (row[qCol] || '').trim();
      if (!qVal || ["문제", "한자", "단어"].includes(qVal)) continue;

      let kVal = '';
      if (['사자성어', '유의어반의어상대어'].includes(sheetName)) {
        const aVal = (aCol !== undefined && row.length > aCol) ? (row[aCol] || '').trim() : '';
        const combinedText = qVal + aVal;
        const hanjas = combinedText.match(/[\u4e00-\u9fff]/g);
        if (hanjas && hanjas.length > 0) {
          kVal = Array.from(new Set(hanjas)).sort().join('');
        } else {
          kVal = qVal;
        }
      } else if (sheetName === '같은 음 단어') {
        const baseVal = (row.length > dedupCol) ? (row[dedupCol] || '').trim() : qVal;
        kVal = baseVal.split('-')[0].trim();
      } else {
        kVal = (row.length > dedupCol) ? (row[dedupCol] || '').trim() : qVal;
        if (!kVal) kVal = qVal;
      }

      if (pastQuestionsLog.has(kVal)) continue;
      if (seenInThisSession.has(kVal)) continue;

      seenInThisSession.add(kVal);
      uniqueCandidates.push({ data: row, key: kVal });
    }

    const selectedItems = uniqueCandidates.length < section.count 
      ? uniqueCandidates 
      : sampleSize(uniqueCandidates, section.count);

    const items: QuestionItem[] = [];

    for (const item of selectedItems) {
      const row = item.data;
      const qText = (row[section.q_idx] || '').trim();
      const dText = section.d_idx !== undefined && row.length > section.d_idx ? (row[section.d_idx] || '').trim() : '';
      
      const formattedQ = section.fmt.length === 2 ? section.fmt(qText, dText) : section.fmt(qText);
      const aText = section.a_idx !== undefined && row.length > section.a_idx ? (row[section.a_idx] || '').trim() : '';
      
      items.push({ q: formattedQ, a: aText });
      updatedHistory[sheetName].push(item.key);
    }

    examData.push({ title: section.title, items });
  }

  return { examData, updatedHistory };
}
