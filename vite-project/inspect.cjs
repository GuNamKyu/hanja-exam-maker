const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:/Users/namkyu-gu/workspace/hanja-exam-maker/한국어문회 2급 준비.xlsx');
for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
}
