const fs = require('fs');
let c = fs.readFileSync('src/views/FinanzasView.tsx', 'utf8');

// Replace table header
c = c.replace('<th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-right">Monto</th>', '<th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Método</th>\n                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-right">Monto</th>');

// Replace colSpan
c = c.replace('<td colSpan={5} className="p-8 text-center text-gray-400 font-bold text-xs uppercase">No hay gastos en este mes</td>', '<td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs uppercase">No hay gastos en este mes</td>');

// Replace row
c = c.replace('<td className="px-5 py-3 font-black text-rose-600 text-right">{fmtCOP(g.monto)}</td>', `<td className="px-5 py-3 text-xs">\n                            <span className={\`px-2 py-1 rounded-md text-[9px] font-black uppercase \${g.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : g.metodo_pago === 'Transferencia' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}\`}>{g.metodo_pago || 'Efectivo'}</span>\n                          </td>\n                          <td className="px-5 py-3 font-black text-rose-600 text-right">{fmtCOP(g.monto)}</td>`);

fs.writeFileSync('src/views/FinanzasView.tsx', c);
console.log("Done");
