import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, Delete } from "lucide-react";

// Color de marca: rgb(229, 0, 126) — magenta A la Carrera
const BRAND = "#E5007E";

export default function LoginView() {
  const [pin, setPin]       = useState("");
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length < 4) return;
    setLoading(true);
    setError(false);
    const success = await login(pin);
    if (!success) { setError(true); setPin(""); }
    setLoading(false);
  };

  const addDigit = (d: string) => {
    if (pin.length < 4) setPin(p => p + d);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a001a 50%, #0a0a0a 100%)" }}>

      {/* Logo + nombre de marca */}
      <div className="flex flex-col items-center mb-10 select-none">
        <img
          src="/marrano.svg"
          alt="A la Carrera"
          className="w-36 h-36 mb-4 drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 0 24px rgba(229,0,126,0.5))" }}
        />
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic"
          style={{ letterSpacing: "-0.04em" }}>
          A la Carrera
        </h1>
        <p className="text-xs font-bold uppercase tracking-[4px] mt-1"
          style={{ color: BRAND }}>
          Sistema de Control Operativo
        </p>
      </div>

      {/* Tarjeta de login */}
      <div className="w-full max-w-xs bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/10 p-8 shadow-2xl">

        {/* Barra de marca arriba */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full"
          style={{ background: BRAND }} />

        {/* Puntos PIN */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className="size-14 rounded-2xl flex items-center justify-center text-2xl font-black transition-all duration-200"
              style={{
                background: pin[i] ? "rgba(229,0,126,0.15)" : "rgba(255,255,255,0.05)",
                border: `2px solid ${pin[i] ? BRAND : error ? "#f43f5e" : "rgba(255,255,255,0.1)"}`,
                color: BRAND,
                boxShadow: pin[i] ? `0 0 20px rgba(229,0,126,0.3)` : "none",
              }}>
              {pin[i] ? "●" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4 animate-bounce">
            PIN incorrecto — intenta de nuevo
          </p>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map(k => (
            <button key={k} type="button" onClick={() => addDigit(k)} disabled={loading}
              className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-black transition-all active:scale-90 hover:bg-white/10 hover:border-white/20">
              {k}
            </button>
          ))}

          {/* Fila inferior: borrar · 0 · OK */}
          <button type="button" onClick={() => setPin(p => p.slice(0, -1))} disabled={loading}
            className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 transition-all active:scale-90 hover:bg-white/10 flex items-center justify-center">
            <Delete size={18} />
          </button>

          <button type="button" onClick={() => addDigit('0')} disabled={loading}
            className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-black transition-all active:scale-90 hover:bg-white/10">
            0
          </button>

          <button type="button" onClick={() => handleLogin()} disabled={loading || pin.length < 4}
            className="h-14 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 disabled:opacity-30 flex items-center justify-center"
            style={{ background: pin.length === 4 ? BRAND : "rgba(229,0,126,0.3)", boxShadow: pin.length === 4 ? `0 8px 30px rgba(229,0,126,0.5)` : "none" }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : "OK"}
          </button>
        </div>
      </div>

      <p className="mt-8 text-[9px] text-white/20 font-bold uppercase tracking-[3px]">
        © A la Carrera · Todos los derechos reservados
      </p>
    </div>
  );
}
