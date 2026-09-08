import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Calendar, 
  Smartphone, Tag, FolderPlus, Settings, Clock, Layers
} from 'lucide-react';

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza con tus datos de Supabase Project Settings -> API
// ==========================================
const SUPABASE_URL = 'https://hglxhzxtwkxzefbfelkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbHhoenR3a3h6ZWZiZmVsa2oiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTI3NDQwOTAyNH0.tdZ0iNzV9utW-SA6olG9LOarUip3xK-bVUBR3gZa55I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Categorías Predefinidas
const CATEGORIAS_GASTO = [
  '🍔 Comida / Boneless', '🛒 Mandado / Super', '🏧 Retiro Cajero', 
  '🚗 Gasolina / Transporte', '💡 Luz / Servicios', '🏠 Renta', 
  '📶 Internet / Plan', '💳 Crédito / Préstamo', '💊 Farmacia / Salud', 
  '🎉 Entretenimiento', '🛍️ Compras Varias'
];

const CATEGORIAS_INGRESO = [
  '🏭 Depósito Trabajo', '💅 Uñas / Citas', '🔄 Transferencia Recibida', 
  '💵 Venta / Extra', '🎁 Regalo / Inyección'
];

export default function App() {
  const [balanceTotal, setBalanceTotal] = useState<number>(0);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [apartados, setApartados] = useState<any[]>([]);
  const [recurrentes, setRecurrentes] = useState<any[]>([]);

  // Estados del Formulario de Movimiento
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>('gasto');
  const [monto, setMonto] = useState<string>('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTO[0]);
  const [descripcion, setDescripcion] = useState<string>('');
  const [dispositivo, setDispositivo] = useState<string>(
    localStorage.getItem('finanzas_dispositivo') || 'Móvil 1'
  );

  // Estados del Formulario de Programados / Recurrentes (Admin)
  const [tituloRecurrente, setTituloRecurrente] = useState('');
  const [montoRecurrente, setMontoRecurrente] = useState('');
  const [tipoRecurrente, setTipoRecurrente] = useState<'ingreso' | 'gasto'>('ingreso');
  const [frecuencia, setFrecuencia] = useState('semanal');
  const [catRecurrente, setCatRecurrente] = useState(CATEGORIAS_INGRESO[0]);

  // Estados de Apartados
  const [nombreApartado, setNombreApartado] = useState('');
  const [metaApartado, setMetaApartado] = useState('');

  // Control de Pestañas
  const [tab, setTab] = useState<'inicio' | 'apartados' | 'admin'>('inicio');

  useEffect(() => {
    fetchDatos();

    // Suscripción en Tiempo Real con Supabase
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => {
        fetchDatos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartados' }, () => {
        fetchDatos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDatos = async () => {
    // 1. Obtener Movimientos
    const { data: movs } = await supabase
      .from('movimientos')
      .select('*')
      .order('created_at', { ascending: false });

    if (movs) {
      setMovimientos(movs);
      const total = movs.reduce((acc, m) => 
        m.tipo === 'ingreso' ? acc + Number(m.monto) : acc - Number(m.monto), 0
      );
      setBalanceTotal(total);
    }

    // 2. Obtener Apartados
    const { data: aports } = await supabase.from('apartados').select('*');
    if (aports) setApartados(aports);

    // 3. Obtener Recurrentes
    const { data: recs } = await supabase.from('recurrentes').select('*');
    if (recs) setRecurrentes(recs);
  };

  const guardarDispositivo = (nombre: string) => {
    setDispositivo(nombre);
    localStorage.setItem('finanzas_dispositivo', nombre);
  };

  const registrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return;

    const { error } = await supabase.from('movimientos').insert([{
      tipo,
      monto: parseFloat(monto),
      categoria,
      descripcion: descripcion || null,
      dispositivo
    }]);

    if (!error) {
      setMonto('');
      setDescripcion('');
      fetchDatos();
    }
  };

  const agregarRecurrente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoRecurrente || !tituloRecurrente) return;

    await supabase.from('recurrentes').insert([{
      titulo: tituloRecurrente,
      tipo: tipoRecurrente,
      monto: parseFloat(montoRecurrente),
      frecuencia,
      categoria: catRecurrente
    }]);

    setTituloRecurrente('');
    setMontoRecurrente('');
    fetchDatos();
  };

  const agregarApartado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreApartado) return;

    await supabase.from('apartados').insert([{
      nombre: nombreApartado,
      monto_meta: parseFloat(metaApartado) || 0,
      monto_actual: 0
    }]);

    setNombreApartado('');
    setMetaApartado('');
    fetchDatos();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 max-w-md mx-auto pb-24">
      
      {/* TARJETA DE BALANCE PRINCIPAL */}
      <header className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-5 shadow-2xl border border-slate-800 text-center relative overflow-hidden">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1"><Wallet size={14} className="text-emerald-400"/> Balance disponible</span>
          <button 
            onClick={() => {
              const nom = prompt("Nombre de este dispositivo (ej. Celular Él / Celular Ella):", dispositivo);
              if (nom) guardarDispositivo(nom);
            }}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium bg-slate-800/80 px-2 py-1 rounded-full border border-slate-700"
          >
            <Smartphone size={12} />
            {dispositivo}
          </button>
        </div>

        <h1 className="text-4xl font-black text-emerald-400 tracking-tight my-2">
          ${balanceTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <p className="text-[11px] text-slate-500">Sincronizado en tiempo real</p>
      </header>

      {/* NAVEGACIÓN INFERIOR / PESTAÑAS */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-2xl flex justify-around z-50">
        <button 
          onClick={() => setTab('inicio')} 
          className={`flex flex-col items-center py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
            tab === 'inicio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet size={18} />
          <span>Inicio</span>
        </button>
        <button 
          onClick={() => setTab('apartados')} 
          className={`flex flex-col items-center py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
            tab === 'apartados' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={18} />
          <span>Apartados</span>
        </button>
        <button 
          onClick={() => setTab('admin')} 
          className={`flex flex-col items-center py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
            tab === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar size={18} />
          <span>Programados</span>
        </button>
      </nav>

      {/* PESTAÑA 1: INICIO (REGISTRO Y HISTORIAL) */}
      {tab === 'inicio' && (
        <main className="space-y-6">
          {/* FORMULARIO DE REGISTRO RÁPIDO */}
          <form onSubmit={registrarMovimiento} className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800/80 shadow-xl space-y-4">
            
            {/* Toggle Gasto / Ingreso */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setTipo('gasto'); setCategoria(CATEGORIAS_GASTO[0]); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tipo === 'gasto' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownCircle size={16} /> - Gasto
              </button>
              <button
                type="button"
                onClick={() => { setTipo('ingreso'); setCategoria(CATEGORIAS_INGRESO[0]); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tipo === 'ingreso' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpCircle size={16} /> + Ingreso
              </button>
            </div>

            {/* Input Monto */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Monto ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-2xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                required
              />
            </div>

            {/* Selección de Categorías */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Categoría</label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {(tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      categoria === cat 
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md' 
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción opcional */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Descripción corta (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Tacos, pago de recibo..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2"
            >
              <Plus size={18} /> Registrar {tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          </form>

          {/* HISTORIAL RECIENTE */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Movimientos Recientes</h2>
            {movimientos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Aún no hay movimientos registrados</p>
            ) : (
              movimientos.map((m) => (
                <div key={m.id} className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 flex justify-between items-center hover:bg-slate-900 transition-all">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-slate-200">{m.categoria}</div>
                    {m.descripcion && <div className="text-[11px] text-slate-400">{m.descripcion}</div>}
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>{new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>•</span>
                      <span className="text-indigo-400 font-medium">{m.dispositivo}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-black ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      )}

      {/* PESTAÑA 2: APARTADOS / SOBRES */}
      {tab === 'apartados' && (
        <main className="space-y-5">
          <form onSubmit={agregarApartado} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FolderPlus size={16} className="text-indigo-400" /> Crear Nuevo Apartado
            </h3>
            <input
              type="text"
              placeholder="Nombre (ej. Renta, Luz, Internet...)"
              value={nombreApartado}
              onChange={(e) => setNombreApartado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="number"
              placeholder="Meta $ (opcional)"
              value={metaApartado}
              onChange={(e) => setMetaApartado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs">
              Guardar Apartado
            </button>
          </form>

          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis Apartados</h2>
            {apartados.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No has creado ningún apartado aún</p>
            ) : (
              apartados.map((a) => (
                <div key={a.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">{a.nombre}</h3>
                    {a.monto_meta > 0 && <p className="text-[11px] text-slate-400">Meta: ${a.monto_meta}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-indigo-400">${a.monto_actual}</span>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      )}

      {/* PESTAÑA 3: PROGRAMACIÓN / RECURRENTES (TRABAJO, UÑAS) */}
      {tab === 'admin' && (
        <main className="space-y-5">
          <form onSubmit={agregarRecurrente} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={16} className="text-indigo-400" /> Registrar Entrada / Salida Fija
            </h3>
            
            <input
              type="text"
              placeholder="Título (ej. Trabajo Fábrica, Uñas Semanal)"
              value={tituloRecurrente}
              onChange={(e) => setTituloRecurrente(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Monto ($)"
                value={montoRecurrente}
                onChange={(e) => setMontoRecurrente(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <select
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="semanal">Semanal (ej. Miércoles)</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="manual">Manual / Irregular</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Categoría Asociada</label>
              <select
                value={catRecurrente}
                onChange={(e) => setCatRecurrente(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {[...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs">
              Guardar Programación
            </button>
          </form>

          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas y Salidas Programadas</h2>
            {recurrentes.map((r) => (
              <div key={r.id} className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-slate-200">{r.titulo}</div>
                  <div className="text-[11px] text-slate-400 capitalize">{r.frecuencia} • {r.categoria}</div>
                </div>
                <div className={`text-sm font-bold ${r.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.tipo === 'ingreso' ? '+' : '-'}${r.monto}
                </div>
              </div>
            ))}
          </section>
        </main>
      )}

    </div>
  );
}