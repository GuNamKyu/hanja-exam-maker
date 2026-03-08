const fs = require('fs');

const xml = fs.readFileSync('../temp_docx/word/document.xml', 'utf8');

// Very basic regex to split nodes: <w:tbl>, <w:tr>, <w:tc>, <w:p>, <w:t>
const tokens = xml.split(/(<[^>]+>)/).filter(Boolean);

let output = [];
let CurrentRow = [];
let CurrentCell = [];

let inTbl = false;
let inTr = false;
let inTc = false;
let inP = false;
let currentText = "";

for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.startsWith('<w:tbl') && !token.includes('</')) inTbl = true;
    else if (token.startsWith('</w:tbl>')) {
        inTbl = false;
        output.push("--- TABLE END ---");
    }
    else if (token.startsWith('<w:tr') && !token.includes('</')) {
        inTr = true;
        CurrentRow = [];
    }
    else if (token.startsWith('</w:tr>')) {
        inTr = false;
        output.push("ROW: " + CurrentRow.join(' | '));
    }
    else if (token.startsWith('<w:tc') && !token.includes('</')) {
        inTc = true;
        CurrentCell = [];
    }
    else if (token.startsWith('</w:tc>')) {
        inTc = false;
        CurrentRow.push(CurrentCell.join(' '));
    }
    else if (token.startsWith('<w:p>') || token.startsWith('<w:p ')) {
        inP = true;
        currentText = "";
    }
    else if (token.startsWith('</w:p>')) {
        inP = false;
        if (currentText.trim()) {
            if (inTc) CurrentCell.push(currentText);
            else output.push("P: " + currentText);
        }
    }
    else if (token.startsWith('<w:t>') || token.startsWith('<w:t ')) {
        // next token is the text
        if (i + 1 < tokens.length && !tokens[i+1].startsWith('<')) {
            currentText += tokens[i+1];
        }
    }
}

fs.writeFileSync('layout.txt', output.join('\n'), 'utf8');
console.log("Extracted to layout.txt");
