import { Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, convertMillimetersToTwip, SectionType } from "docx";
import type { ExamSectionData } from "./types";

export function createDocx(examData: ExamSectionData[]): { doc: Document, totalQs: number } {
  const titleChildren: any[] = [];
  const questionChildren: any[] = [];
  
  // Title
  titleChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "전국한자능력검정시험 2급 [모의고사]", size: 32, bold: true, font: "Batang" })]
  }));

  // Info Table
  titleChildren.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: " 성명 : (                  )", font: "Batang", size: 22 })] })],
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "수험번호 : (                  ) ", font: "Batang", size: 22 })] })],
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
          })
        ]
      })
    ]
  }));

  titleChildren.push(new Paragraph({ text: "" })); // Empty paragraph to space it out

  let qGlobalNum = 1;
  const allAnswers: { num: number, ans: string }[] = [];

  for (const group of examData) {
    if (!group.items.length) continue;
    const startN = qGlobalNum;
    const endN = qGlobalNum + group.items.length - 1;

    questionChildren.push(new Paragraph({
      spacing: { before: 280, after: 80 },
      keepNext: true,
      children: [new TextRun({ text: `[問 ${startN}-${endN}] ${group.title}`, size: 20, bold: true, font: "Batang" })]
    }));

    for (const item of group.items) {
      questionChildren.push(new Paragraph({
        spacing: { line: 360, after: 40 },
        indent: { left: convertMillimetersToTwip(7), hanging: convertMillimetersToTwip(7) },
        children: [new TextRun({ text: `[${qGlobalNum}] ${item.q}`, size: 22, font: "Batang" })]
      }));
      allAnswers.push({ num: qGlobalNum, ans: item.a });
      qGlobalNum++;
    }
    questionChildren.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // Answers section on next page
  questionChildren.push(new Paragraph({
    pageBreakBefore: true,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: "― 正 答 表 (정답표) ―", size: 28, bold: true, font: "Batang" })]
  }));

  for (const ans of allAnswers) {
    questionChildren.push(new Paragraph({
      spacing: { line: 360, before: 150, after: 150 },
      indent: { left: convertMillimetersToTwip(8), hanging: convertMillimetersToTwip(8) },
      children: [new TextRun({ text: `[${ans.num}] ${ans.ans}`, size: 20, font: "Batang" })]
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1800, bottom: 1440, left: 1800 },
          },
        },
        children: titleChildren
      },
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: convertMillimetersToTwip(20), bottom: convertMillimetersToTwip(20), left: convertMillimetersToTwip(15), right: convertMillimetersToTwip(15) },
          },
          column: { space: 720, count: 2, separate: true }
        },
        children: questionChildren
      }
    ]
  });

  return { doc, totalQs: qGlobalNum - 1 };
}
