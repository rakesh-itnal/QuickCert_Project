const XLSX = require('xlsx');

const file = 'C:\\Users\\rakes\\OneDrive\\Desktop\\PUC STUDENT2.xlsx';
const workbook = XLSX.readFile(file);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

const rawMatrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

let headerRowIndex = 0;
const isHeaderColumn = (str) => ['sats', 'name', 'dob', 'mother', 'father', 'gender', 'caste', 'sts'].some(k => String(str).toLowerCase().replace(/[^a-z]/g, '').includes(k));

for (let i = 0; i < Math.min(20, rawMatrix.length); i++) {
    const row = rawMatrix[i] || [];
    const headerMatches = row.filter(cell => isHeaderColumn(String(cell))).length;
    if (headerMatches >= 2) {
        headerRowIndex = i;
        break;
    }
}

console.log('Found Header Row at:', headerRowIndex);
const headers = (rawMatrix[headerRowIndex] || []).map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
console.log('Headers:', headers);

const dataRows = rawMatrix.slice(headerRowIndex + 1).filter(row => row.some(cell => String(cell).trim() !== ''));
console.log('Data Rows Count:', dataRows.length);
