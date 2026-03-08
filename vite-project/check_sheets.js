import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

try {
  const wb = XLSX.readFile('../한국어문회 2급 준비.xlsx');
  console.log(wb.SheetNames);
} catch (e) {
  console.error(e);
}
