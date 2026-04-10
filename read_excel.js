import xlsx from 'xlsx';
import fs from 'fs';

try {
  const buf = fs.readFileSync('F:\\app contability\\productos.xlsx');
  const workbook = xlsx.read(buf, { type: 'buffer' });
  
  const result = {};
  for (const sheetName of workbook.SheetNames) {
    result[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]).slice(0, 10);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Error reading file:", e.message);
}
