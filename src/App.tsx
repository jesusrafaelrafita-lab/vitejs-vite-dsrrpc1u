import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, 
  MinusCircle, 
  Wallet, 
  PieChart, 
  Calendar, 
  Target, 
  Trash2, 
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  User,
  Plus
} from 'lucide-react';

const SUPABASE_URL = 'https://dsrrpc1u.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dispositivo, setDispositivo] = useState('Él');
  
  // Estados de datos
  const [movimientos, setMovimientos] = useState([]);
  const [recurrentes, setRecurrentes] = useState([]);
  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formularios
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    monto: '',
    tipo: 'gasto',
    categoria: 'Comida',
    descripcion: ''
  });

  const [nuevoRecurrente, setNuevoRecurrente] = useState({
    titulo: '',
    monto: '',
    tipo: 'ingreso',
    frecuencia: 'quincenal',
    categoria: 'Sueldo'
  });

  const [nuevoApartado, setNuevoApartado] = useState({
    nombre: '',
    meta: ''
  });

  const [montosApartados, setMontosApartados] = useState({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: movs } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false });
      const { data: recs } = await supabase.from('recurrentes').select('*');
      const { data: aparts } = await supabase.from('apartados').select('*');

      if (movs) setMovimientos(movs);
      if (recs) setRecurrentes(recs);
      if (aparts) setApartados(aparts);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS ---
  const totalIngresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalGastos = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const balanceGeneral = totalIngresos - totalGastos;

  // --- ACCIONES ---
  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    if (!nuevoMovimiento.monto) return;

    try {
      const { data, error } = await supabase.from('movimientos').insert([
        { ...nuevoMovimiento, monto: parseFloat(nuevoMovimiento.monto), dispositivo }
      ]).select();

      if (error) throw error;
      setMovimientos([data[0], ...movimientos]);
      setNuevoMovimiento({ monto: '', tipo: 'gasto', categoria: 'Comida', descripcion: '' });
    } catch (err) {
      alert('Error al guardar el registro: ' + err.message);
    }
  };

  const handleGuardarRecurrente = async (e) => {
    e.preventDefault();
    if (!nuevoRecurrente.titulo || !nuevoRecurrente.monto) return;

    try {
      const { data, error } = await supabase.from('recurrentes').insert([
        { ...nuevoRecurrente, monto: parseFloat(nuevoRecurrente.monto) }
      ]).select();

      if (error) throw error;
      setRecurrentes([...recurrentes, data[0]]);
      setNuevoRecurrente({ titulo: '', monto: '', tipo: 'ingreso', frecuencia: 'quincenal', categoria: 'Sueldo' });
    } catch (err) {
      alert('Error al guardar recurrente: ' + err.message);
    }
  };

  const handleGuardarApartado = async (e) => {
    e.preventDefault();
    if (!nuevoApartado.nombre || !nuevoApartado.meta) return;

    try {
      const { data, error } = await supabase.from('apartados').insert([
        { nombre: nuevoApartado.nombre, meta: parseFloat(nuevoApartado.meta), actual: 0 }
      ]).select();

      if (error) throw error;
      setApartados([...apartados, data[0]]);
      setNuevoApartado({ nombre: '', meta: '' });
    } catch (err) {
      alert('Error al crear apartado: ' + err.message);
    }
  };

  const handleAbonarApartado = async (apartado) => {
    const montoPersonalizado = parseFloat(montosApartados[apartado.id]);

    if (!montoPersonalizado || montoPersonalizado <= 0) {
      alert('Ingresa una cantidad válida mayor a 0');
      return;
    }

    try {
      const nuevoActual = Number(apartado.actual || 0) + montoPersonalizado;
      const { error: errApartado } = await supabase
        .from('apartados')
        .update({ actual: nuevoActual })
        .eq('id', apartado.id);

      if (errApartado) throw errApartado;

      const { data: nuevoMov, error: errMov } = await supabase
        .from('movimientos')
        .insert([
          {
            monto: montoPersonalizado,
            tipo: 'gasto',
            categoria: 'Apartado',
            descripcion: `Abono a apartado: ${apartado.nombre}`,
            dispositivo
          }
        ]).select();

      if (errMov) throw errMov;

      setApartados(apartados.map(a => a.id === apartado.id ? { ...a, actual: nuevoActual } : a));
      setMovimientos([nuevoMov[0], ...movimientos]);
      setMontosApartados({ ...montosApartados, [apartado.id]: '' });

    } catch (err) {
      alert('Error al ingresar al apartado: ' + err.message);
    }
  };

  const eliminarMovimiento = async (id) => {
    if (!confirm('¿Seguro de eliminar este registro?')) return;
    try {
      await supabase.from('movimientos').delete().eq('id', id);
      setMovimientos(movimientos.filter(m => m.id !== id));
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans pb-24 selection:bg-emerald-500 selection:text-black">
      {/* HEADER ELEGANTE */}
      <header className="bg-[#161b22]/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20 px-4 py-3.5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base text-white leading-none">Finanzas</h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Compartidas</span>
            </div>
          </div>
          
          {/* SELECTOR DE USUARIO */}
          <div className="flex bg-[#0d1117] p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setDispositivo('Él')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${dispositivo === 'Él' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <User size={12} /> Él
            </button>
            <button 
              onClick={() => setDispositivo('Ella')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 ${dispositivo === 'Ella' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <User size={12} /> Ella
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* TARJETA DE BALANCE PRINCIPAL */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#161b22] via-[#1c2128] to-[#161b22] p-6 rounded-3xl border border-slate-800 shadow-2xl shadow-emerald-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Balance Total</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles size={10} /> Activo
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-2">
            ${balanceGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Ingresos</div>
                <div className="text-sm font-bold text-emerald-400">+${totalIngresos.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <ArrowDownRight size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Gastos</div>
                <div className="text-sm font-bold text-rose-400">-${totalGastos.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* VISTA 1: DASHBOARD / REGISTRO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarMovimiento} className="bg-[#161b22] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-slate-400">Nuevo Movimiento</h2>
              
              <div className="flex bg-[#0d1117] p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'gasto' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${nuevoMovimiento.tipo === 'gasto' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  <MinusCircle size={15} /> Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'ingreso' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${nuevoMovimiento.tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  <PlusCircle size={15} /> Ingreso
                </button>
              </div>

              <div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-lg font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={nuevoMovimiento.monto}
                    onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, monto: e.target.value })}
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-xl p-3 pl-8 text-2xl font-black text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={nuevoMovimiento.categoria}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, categoria: e.target.value })}
                  className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Comida">Comida</option>
                  <option value="Super">Súper</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Entretenimiento">Entretenimiento</option>
                  <option value="Sueldo">Sueldo</option>
                  <option value="Otros">Otros</option>
                </select>

                <input
                  type="text"
                  placeholder="Nota (opcional)"
                  value={nuevoMovimiento.descripcion}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, descripcion: e.target.value })}
                  className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-slate-950 py-3 rounded-xl transition shadow-lg shadow-emerald-500/10 text-sm"
              >
                Guardar Registro
              </button>
            </form>

            {/* HISTORIAL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-400">Historial Reciente</h3>
                <span className="text-[11px] text-slate-500">{movimientos.length} registros</span>
              </div>
              <div className="space-y-2">
                {movimientos.slice(0, 6).map((m) => (
                  <div key={m.id} className="bg-[#161b22] border border-slate-800/80 p-3.5 rounded-2xl flex justify-between items-center hover:border-slate-700 transition">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-xs ${m.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {m.tipo === 'ingreso' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{m.categoria}</div>
                        <div className="text-[11px] text-slate-400">{m.descripcion || `Registrado por ${m.dispositivo}`}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-sm ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString()}
                      </span>
                      <button onClick={() => eliminarMovimiento(m.id)} className="text-slate-600 hover:text-rose-400 transition p-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: APARTADOS */}
        {activeTab === 'apartados' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarApartado} className="bg-[#161b22] p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-slate-400">Nuevo Apartado</h2>
              <input
                type="text"
                placeholder="Nombre de la meta (ej. Vacaciones)"
                value={nuevoApartado.nombre}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, nombre: e.target.value })}
                className="w-full bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
              <input
                type="number"
                placeholder="Meta de ahorro $"
                value={nuevoApartado.meta}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, meta: e.target.value })}
                className="w-full bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition border border-slate-700">
                + Crear Meta
              </button>
            </form>

            <div className="space-y-4">
              {apartados.map((item) => {
                const porcentaje = Math.min(Math.round(((item.actual || 0) / item.meta) * 100), 100);

                return (
                  <div key={item.id} className="bg-[#161b22] p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-base">{item.nombre}</h3>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Faltan: ${(item.meta - (item.actual || 0)).toLocaleString()}
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-800 px-2.5 py-1 rounded-lg text-emerald-400 border border-slate-700">
                        ${(item.actual || 0).toLocaleString()} / ${Number(item.meta).toLocaleString()}
                      </span>
                    </div>

                    {/* Barra de Progreso Mejorada */}
                    <div className="space-y-1">
                      <div className="w-full bg-[#0d1117] h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
                          style={{ width: `${porcentaje}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-end text-[10px] font-bold text-slate-500">
                        {porcentaje}% completado
                      </div>
                    </div>

                    {/* Campo Personalizado y Botón */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="number"
                        placeholder="Cantidad a abonar $"
                        value={montosApartados[item.id] || ''}
                        onChange={(e) => setMontosApartados({ ...montosApartados, [item.id]: e.target.value })}
                        className="flex-1 bg-[#0d1117] border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                        min="1"
                      />
                      <button
                        onClick={() => handleAbonarApartado(item)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition shadow-lg shadow-emerald-500/10 flex items-center gap-1"
                      >
                        <Plus size={14} /> Ingresar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA 3: RECURRENTES */}
        {activeTab === 'recurrentes' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarRecurrente} className="bg-[#161b22] p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-slate-400">Nuevo Movimiento Recurrente</h2>
              <input
                type="text"
                placeholder="Título (ej. Renta, Netflix)"
                value={nuevoRecurrente.titulo}
                onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, titulo: e.target.value })}
                className="w-full bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Monto $"
                  value={nuevoRecurrente.monto}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, monto: e.target.value })}
                  className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
                <select
                  value={nuevoRecurrente.frecuencia}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, frecuencia: e.target.value })}
                  className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition border border-slate-700">
                + Guardar Recurrente
              </button>
            </form>

            <div className="space-y-2.5">
              {recurrentes.map((r) => (
                <div key={r.id} className="bg-[#161b22] p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white text-sm">{r.titulo}</div>
                    <div className="text-[11px] text-slate-400 capitalize mt-0.5">Frecuencia: {r.frecuencia}</div>
                  </div>
                  <div className="font-black text-emerald-400 text-sm bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                    ${Number(r.monto).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR ESTILO FLOTANTE */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#161b22]/90 backdrop-blur-lg border border-slate-800/90 p-1.5 rounded-2xl shadow-2xl z-30">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <PieChart size={18} /> Resumen
          </button>
          <button
            onClick={() => setActiveTab('apartados')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 ${activeTab === 'apartados' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Target size={18} /> Apartados
          </button>
          <button
            onClick={() => setActiveTab('recurrentes')}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 ${activeTab === 'recurrentes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Calendar size={18} /> Recurrentes
          </button>
        </div>
      </nav>
    </div>
  );
}
