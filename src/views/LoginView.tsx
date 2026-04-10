import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Factory, ShieldCheck, Loader2 } from "lucide-react";

export default function LoginView() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError(false);
    
    const success = await login(pin);
    if (!success) {
      setError(true);
      setPin("");
    }
    setLoading(false);
  };

  const addDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl shadow-blue-500/20 mb-4">
            <Factory className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">A la Carrera</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Sistema de Control Operativo</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Panel de Acceso</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ingresa tu PIN de seguridad</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {/* PIN Display */}
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={`size-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-300 ${
                    pin[i] 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-lg shadow-blue-500/10' 
                      : error ? 'border-rose-300 bg-rose-50' : 'border-gray-100 dark:border-gray-800 text-gray-300'
                  }`}
                >
                  {pin[i] ? '●' : ''}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-center text-xs font-bold text-rose-600 animate-bounce">PIN INCORRECTO. INTENTA DE NUEVO.</p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'C') setPin("");
                    else if (key === 'OK') handleLogin({ preventDefault: () => {} } as any);
                    else addDigit(key);
                  }}
                  disabled={loading}
                  className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-90 flex items-center justify-center ${
                    key === 'OK' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 col-span-1' 
                      : key === 'C' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-blue-300'
                  }`}
                >
                  {loading && key === 'OK' ? <Loader2 className="h-6 w-6 animate-spin" /> : key}
                </button>
              ))}
            </div>
          </form>

          {/* Footer Info */}
          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-400">
               <ShieldCheck className="h-4 w-4" />
               <span className="text-[10px] uppercase font-bold tracking-widest">Nivel de Seguridad</span>
            </div>
            <div className="text-right">
               <span className="text-[10px] font-black text-blue-600 uppercase">Encriptado AES</span>
            </div>
          </div>
        </div>

        {/* Hints for the user in development */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Credenciales de Prueba
          </p>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-blue-600 font-bold">
            <div>Admin: 1234</div>
            <div>Vendedor: 4321</div>
            <div>Operario: 0000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
