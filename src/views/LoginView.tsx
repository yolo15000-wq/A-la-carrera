import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, Delete, ShieldCheck } from "lucide-react";

export default function LoginView() {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { login }             = useAuth();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length < 4) return;
    setLoading(true);
    setError(false);
    const ok = await login(pin);
    if (!ok) { setError(true); setPin(""); }
    setLoading(false);
  };

  const addDigit = (d: string) => { if (pin.length < 4) setPin(p => p + d); };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">

      {/* Logo sobre fondo blanco */}
      <div className="flex flex-col items-center mb-10 select-none">
        <div className="w-40 h-40 flex items-center justify-center mb-4">
          <img
            src="/marrano.svg"
            alt="A la Carrera"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 italic"
          style={{ letterSpacing: "-0.04em" }}>
          A la Carrera
        </h1>
        <p className="text-xs font-bold uppercase tracking-[4px] mt-1 text-brand-500">
          Sistema de Control Operativo
        </p>
      </div>

      {/* Tarjeta de login */}
      <div className="w-full max-w-xs bg-white rounded-[40px] border-2 border-gray-100 p-8 shadow-2xl shadow-brand-500/10">

        {/* Línea de marca arriba */}
        <div className="w-12 h-1 bg-brand-500 rounded-full mx-auto mb-8" />

        {/* Puntos PIN */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className={`size-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                error
                  ? 'border-rose-300 bg-rose-50 text-rose-400'
                  : pin[i]
                    ? 'border-brand-500 bg-brand-50 text-brand-500 shadow-lg shadow-brand-500/20'
                    : 'border-gray-100 text-gray-200'
              }`}>
              {pin[i] ? "●" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-rose-500 mb-4 animate-bounce">
            PIN incorrecto — intenta de nuevo
          </p>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map(k => (
            <button key={k} type="button" onClick={() => addDigit(k)} disabled={loading}
              className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800 text-xl font-black transition-all active:scale-90 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600">
              {k}
            </button>
          ))}

          {/* Borrar */}
          <button type="button" onClick={() => setPin(p => p.slice(0,-1))} disabled={loading}
            className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 transition-all active:scale-90 hover:bg-gray-100 flex items-center justify-center">
            <Delete size={18} />
          </button>

          {/* 0 */}
          <button type="button" onClick={() => addDigit('0')} disabled={loading}
            className="h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800 text-xl font-black transition-all active:scale-90 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600">
            0
          </button>

          {/* OK */}
          <button type="button" onClick={() => handleLogin()} disabled={loading || pin.length < 4}
            className="h-14 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 disabled:opacity-30 flex items-center justify-center bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30">
            {loading ? <Loader2 size={20} className="animate-spin" /> : "OK"}
          </button>
        </div>

        {/* Pie */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <ShieldCheck size={13} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Acceso seguro · PIN encriptado</span>
        </div>
      </div>

      <p className="mt-8 text-[9px] text-gray-300 font-bold uppercase tracking-[3px]">
        © A la Carrera · Todos los derechos reservados
      </p>
    </div>
  );
}

