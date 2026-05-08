const fs = require('fs');
let c = fs.readFileSync('src/views/FinanzasView.tsx', 'utf8');
c = c.replace(
  '{ id: "fijos", label: "Gastos Fijos", icon: Building }',
  '{ id: "fijos", label: "Gastos Fijos", icon: Building },\n          { id: "prestamos", label: "Préstamos", icon: DollarSign }'
);
fs.writeFileSync('src/views/FinanzasView.tsx', c);
console.log("Done");
