import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 flex items-center justify-center mb-8">
        <AlertCircle size={56} className="text-red-500" />
      </div>

      <h1 className="text-8xl font-black text-slate-900 tracking-tighter mb-4 dark:text-slate-100">
        404
      </h1>

      <h2 className="text-3xl font-bold text-slate-800 mb-4 dark:text-slate-200">
        Página no encontrada
      </h2>

      <p className="text-slate-500 text-lg max-w-md mb-10 leading-relaxed dark:text-slate-400">
        La ruta que estás intentando acceder no existe o ha sido movida temporalmente.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-3.5 px-8 rounded-full shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-100"
      >
        <Home size={20} />
        Volver al Inicio
      </Link>
    </div>
  );
}
