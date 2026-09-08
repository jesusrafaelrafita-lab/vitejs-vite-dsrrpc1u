import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PieChart, 
  Calendar, 
  Target, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';

// Credenciales corregidas
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hglxhzxtwkxzefbfelkj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbHhoenh0d2t4emVmYmZlbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzMwMjQsImV4cCI6MjEwNDQwOTAyNH0.tdZ0iNzV9utW-SA6olG9LOarUip3xK-bVUBR3gZa55I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dispositivo, setDispositivo] = useState('Él');
  
  const [movimientos, setMovimientos] = useState([]);
  const [recurrentes, setRecurrentes] = useState([]);
  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const { data: movs, error: errMovs } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false });
      const { data: recs } = await supabase.from('recurrentes').select('*');
      const { data: aparts } = await supabase.from('apartados').select('*');

      if (errMovs) {
        console.error('Error Supabase Movimientos:', errMovs);
      } else if (movs) {
        setMovimientos(movs);
      }

      if (recs) setRecurrentes(recs);
      if (aparts) setApartados(aparts);
    } catch (err) {
      console.error('Error de red al conectar con Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalGastos = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const balanceGeneral = totalIngresos - totalGastos;

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    if (!nuevoMovimiento.monto) return;

    try {
      const payload = {
        monto: parseFloat(nuevoMovimiento.monto),
        tipo: nuevoMovimiento.tipo,
        categoria: nuevoMovimiento.categoria,
        descripcion: nuevoMovimiento.descripcion,
        dispositivo: dispositivo
      };

      const { data, error } = await supabase
        .from('movimientos')
        .insert([payload])
        .select();

      if (error) {
        alert(`Error Supabase (${error.code}): ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setMovimientos([data[0], ...movimientos]);
        setNuevoMovimiento({ monto: '', tipo: 'gasto', categoria: 'Comida', descripcion: '' });
      }
    } catch (err) {
      alert('Error de red/conexión: ' + err.message);
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
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-28 antialiased">
      {/* HEADER BANCA MÓVIL */}
      <header className="bg-[#1E293B]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-5 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">Banca Compartida</h1>
              <span className="text-[11px] text-slate-400">Cuenta Principal</span>
            </div>
          </div>

          {/* PERFIL SELECTOR */}
          <div className="flex bg-[#0F172A] p-1 rounded-full border border-slate-800">
            <button 
              onClick={() => setDispositivo('Él')}
              className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${dispositivo === 'Él' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'}`}
            >
              Él
            </button>
            <button 
              onClick={() => setDispositivo('Ella')}
              className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${dispositivo === 'Ella' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'}`}
            >
              Ella
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-6">

        {/* TARJETA BANCARIA DE BALANCE */}
        <div className="relative bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <span>Balance Disponible</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              ● En línea
            </span>
          </div>

          <div className="text-4xl font-extrabold text-white my-3 tracking-tight">
            ${balanceGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>

          {/* RESUMEN INGRESOS Y GASTOS */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3 bg-[#0F172A]/60 p-2.5 rounded-2xl border border-slate-800/50">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Ingresos</p>
                <p className="text-xs font-bold text-emerald-400">+${totalIngresos.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#0F172A]/60 p-2.5 rounded-2xl border border-slate-800/50">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <TrendingDown size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Gastos</p>
                <p className="text-xs font-bold text-rose-400">-${totalGastos.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO POR PESTAÑA */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* REGISTRO RÁPIDO */}
            <form onSubmit={handleGuardarMovimiento} className="bg-[#1E293B] p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nuevo Movimiento</h2>
                <span className="text-[11px] text-slate-400">Registrando como <b className="text-emerald-400">{dispositivo}</b></span>
              </div>

              {/* TOGGLE TIPO */}
              <div className="grid grid-cols-2 gap-2 bg-[#0F172A] p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'gasto' })}
                  className={`py-2 text-xs font-bold rounded-xl transition ${nuevoMovimiento.tipo === 'gasto' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'ingreso' })}
                  className={`py-2 text-xs font-bold rounded-xl transition ${nuevoMovimiento.tipo === 'ingreso' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400'}`}
                >
                  Ingreso
                </button>
              </div>

              {/* CAMPO DE MONTO TIPO APP BANCA */}
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xl font-bold text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoMovimiento.monto}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, monto: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-2xl font-black text-white focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={nuevoMovimiento.categoria}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, categoria: e.target.value })}
                  className="bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                  className="bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
              >
                Confirmar Transacción
              </button>
            </form>

            {/* HISTORIAL TIPO BANCA */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Actividad Reciente</h3>
              <div className="space-y-2.5">
                {movimientos.length === 0 && !loading && (
                  <p className="text-center text-xs text-slate-500 py-4">No hay registros guardados aún.</p>
                )}
                {movimientos.slice(0, 5).map((m) => (
                  <div key={m.id} className="bg-[#1E293B] p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs ${m.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {m.tipo === 'ingreso' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{m.categoria}</p>
                        <p className="text-[11px] text-slate-400">{m.descripcion || m.dispositivo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-sm ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString()}
                      </span>
                      <button onClick={() => eliminarMovimiento(m.id)} className="text-slate-600 hover:text-rose-400 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA APARTADOS */}
        {activeTab === 'apartados' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarApartado} className="bg-[#1E293B] p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Crear Nueva Bóveda / Meta</h2>
              <input
                type="text"
                placeholder="Nombre de la meta"
                value={nuevoApartado.nombre}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, nombre: e.target.value })}
                className="w-full bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              <input
                type="number"
                placeholder="Meta $"
                value={nuevoApartado.meta}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, meta: e.target.value })}
                className="w-full bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs border border-slate-700">
                + Crear Bóveda
              </button>
            </form>

            <div className="space-y-4">
              {apartados.map((item) => {
                const porcentaje = Math.min(Math.round(((item.actual || 0) / item.meta) * 100), 100);

                return (
                  <div key={item.id} className="bg-[#1E293B] p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-base">{item.nombre}</h3>
                        <p className="text-[11px] text-slate-400">Meta: ${Number(item.meta).toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        ${(item.actual || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="space-y-1">
                      <div className="w-full bg-[#0F172A] h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${porcentaje}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right font-bold">{porcentaje}% alcanzado</p>
                    </div>

                    {/* ABONAR PERSONALIZADO */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Monto a transferir $"
                        value={montosApartados[item.id] || ''}
                        onChange={(e) => setMontosApartados({ ...montosApartados, [item.id]: e.target.value })}
                        className="flex-1 bg-[#0F172A] border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAbonarApartado(item)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition"
                      >
                        Abonar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA RECURRENTES */}
        {activeTab === 'recurrentes' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarRecurrente} className="bg-[#1E293B] p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Programar Cargo / Ingreso</h2>
              <input
                type="text"
                placeholder="Concepto (ej. Renta, Trabajo)"
                value={nuevoRecurrente.titulo}
                onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, titulo: e.target.value })}
                className="w-full bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Monto $"
                  value={nuevoRecurrente.monto}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, monto: e.target.value })}
                  className="bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
                <select
                  value={nuevoRecurrente.frecuencia}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, frecuencia: e.target.value })}
                  className="bg-[#0F172A] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs border border-slate-700">
                Guardar Programación
              </button>
            </form>

            <div className="space-y-2.5">
              {recurrentes.map((r) => (
                <div key={r.id} className="bg-[#1E293B] p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white text-sm">{r.titulo}</p>
                    <p className="text-[11px] text-slate-400 capitalize">Frecuencia {r.frecuencia}</p>
                  </div>
                  <span className="font-black text-emerald-400 text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    ${Number(r.monto).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR ESTILO BANCA MÓVIL */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1E293B]/90 backdrop-blur-md border-t border-slate-800 py-3 px-6 z-30">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <PieChart size={20} /> Inicio
          </button>
          <button
            onClick={() => setActiveTab('apartados')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${activeTab === 'apartados' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Target size={20} /> Bóvedas
          </button>
          <button
            onClick={() => setActiveTab('recurrentes')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${activeTab === 'recurrentes' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Calendar size={20} /> Pagos
          </button>
        </div>
      </nav>
    </div>
  );
}
