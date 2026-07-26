import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, Delete, ShieldCheck } from "lucide-react";

export default function LoginView() {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { login }             = useAuth();

  const handleLogin = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError(false);
    const ok = await login(pin);
    if (!ok) { setError(true); setPin(""); }
    setLoading(false);
  };

  const addDigit = (d: string) => { if (pin.length < 4) setPin(p => p + d); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background selection:bg-brand-500/30">

      {/* Logo */}
      <div className="flex flex-col items-center mb-10 select-none">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full blur-3xl opacity-10 scale-150 bg-brand-500" />
          <img src="/marrano.svg" alt="A la Carrera"
            className="relative w-40 h-40 object-contain drop-shadow-xl invert opacity-90" />
        </div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
          A la Carrera
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[4px] mt-1 text-muted-foreground">
          Sistema de Control Operativo
        </p>
      </div>

      {/* Tarjeta — Glassmorphism */}
      <div className="w-full max-w-xs glass rounded-[32px] p-8 relative overflow-hidden">
        {/* Línea decorativa */}
        <div className="absolute top-0 inset-x-0 h-1 bg-brand-500 opacity-80" />

        {/* Puntos PIN */}
        <div className="flex justify-center gap-4 mb-6 mt-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className={`size-14 rounded-2xl border flex items-center justify-center text-2xl font-black transition-all duration-300 ${
                error
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : pin[i]
                    ? "border-brand-500/50 bg-brand-500/10 text-brand-500 shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)]"
                    : "border-white/10 text-muted-foreground bg-white/5"
              }`}>
              {pin[i] ? "●" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-destructive mb-4 animate-bounce">
            PIN incorrecto — intenta de nuevo
          </p>
        )}

        {/* Teclado */}
        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9"].map(k => (
            <button key={k} onClick={() => addDigit(k)} disabled={loading}
              className="h-14 rounded-2xl bg-white/5 border border-white/5 text-foreground text-xl font-bold data-number transition-all duration-200 hover:bg-white/10 active:translate-y-1 active:bg-brand-500/20 active:border-brand-500/30 active:text-brand-400">
              {k}
            </button>
          ))}
          <button onClick={() => setPin(p => p.slice(0,-1))} disabled={loading}
            className="h-14 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground transition-all duration-200 hover:bg-white/10 active:translate-y-1 hover:text-foreground flex items-center justify-center">
            <Delete size={18} />
          </button>
          <button onClick={() => addDigit("0")} disabled={loading}
            className="h-14 rounded-2xl bg-white/5 border border-white/5 text-foreground text-xl font-bold data-number transition-all duration-200 hover:bg-white/10 active:translate-y-1 active:bg-brand-500/20 active:border-brand-500/30 active:text-brand-400">
            0
          </button>
          <button onClick={handleLogin} disabled={loading || pin.length < 4}
            className="h-14 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:translate-y-1 disabled:opacity-30 flex items-center justify-center bg-brand-500 hover:bg-[#cc006f] shadow-lg shadow-black/50">
            {loading ? <Loader2 size={20} className="animate-spin" /> : "OK"}
          </button>
        </div>

        <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck size={13} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Acceso seguro · PIN encriptado</span>
        </div>
      </div>

      <p className="mt-8 text-[9px] text-muted-foreground/50 font-bold uppercase tracking-[3px]">
        © A la Carrera · Todos los derechos reservados
      </p>
    </div>
  );
}
