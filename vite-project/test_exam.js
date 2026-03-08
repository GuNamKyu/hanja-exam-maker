import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

import { generateExamData } from './src/lib/examMaker.ts';

async function runTest() {
  try {
    const filePath = '../한국어문회 2급 준비.xlsx';
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    const parsedData = {};
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // header: 1 means getting an array of arrays
      parsedData[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    }
    
    // Convert arrays inside arrays to strings just to be safe with mapping
    for (const sheet in parsedData) {
      parsedData[sheet] = parsedData[sheet].map(row => row.map(cell => cell !== null && cell !== undefined ? String(cell) : ''));
    }

    const historyLog = {};
    console.log('Generating Exam Data...');
    const result = await generateExamData(parsedData, historyLog);
    
    const { examData } = result;
    
    let totalQuestions = 0;
    
    console.log('--- Generated Exam Sections ---');
    for (const section of examData) {
      console.log(`[${section.title}]: ${section.items.length} questions`);
      totalQuestions += section.items.length;
    }
    
    console.log(`\nTotal questions generated: ${totalQuestions}`);
    
    if (totalQuestions === 73) {
      console.log('✅ TEST PASSED: Exactly 73 questions were generated.');
    } else {
      console.error(`❌ TEST FAILED: Expected 73 questions, but got ${totalQuestions}.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

runTest();
