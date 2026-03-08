import * as XLSX from 'xlsx';

const wb = XLSX.readFile('../한국어문회 2급 준비.xlsx');
console.log(wb.SheetNames);
