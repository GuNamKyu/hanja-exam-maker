const fs = require('fs');
const xml = fs.readFileSync('../temp_docx/word/document.xml', 'utf8');
console.log("pgMar", xml.match(/<w:pgMar[^>]*>/g));
console.log("cols", xml.match(/<w:cols[^>]*>/g));
console.log("pgSz", xml.match(/<w:pgSz[^>]*>/g));
