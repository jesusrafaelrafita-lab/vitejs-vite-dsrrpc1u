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
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Reemplaza con tus llaves si es necesario
const SUPABASE_URL = 'https://dsrrpc1u.supabase.co'; // Tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu Anon Key de Supabase

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dispositivo, setDispositivo] = useState('Él'); // 'Él' o 'Ella'
  
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

  // Estado para montos personalizados a ingresar en apartados
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

  // ABONAR MONTO PERSONALIZADO AL APARTADO Y RESTAR DEL BALANCE GENERAL
  const handleAbonarApartado = async (apartado) => {
    const montoPersonalizado = parseFloat(montosApartados[apartado.id]);

    if (!montoPersonalizado || montoPersonalizado <= 0) {
      alert('Ingresa una cantidad válida mayor a 0');
      return;
    }

    try {
      // 1. Sumar al apartado
      const nuevoActual = Number(apartado.actual || 0) + montoPersonalizado;
      const { error: errApartado } = await supabase
        .from('apartados')
        .update({ actual: nuevoActual })
        .eq('id', apartado.id);

      if (errApartado) throw errApartado;

      // 2. Registrar como Gasto para restar del balance general
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

      // Actualizar estados locales
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20">
      {/* HEADER */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="text-emerald-400" />
            <h1 className="font-bold text-lg text-white">Finanzas Compartidas</h1>
          </div>
          <div className="flex bg-slate-700 p-1 rounded-lg">
            <button 
              onClick={() => setDispositivo('Él')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition ${dispositivo === 'Él' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
            >
              Él
            </button>
            <button 
              onClick={() => setDispositivo('Ella')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition ${dispositivo === 'Ella' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
            >
              Ella
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* RESUMEN DE BALANCE */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance Total</span>
          <div className="text-3xl font-extrabold text-white mt-1">
            ${balanceGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Ingresos</div>
                <div className="text-sm font-bold text-emerald-400">+${totalIngresos.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <ArrowDownRight size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Gastos</div>
                <div className="text-sm font-bold text-rose-400">-${totalGastos.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* VISTA 1: DASHBOARD / NUEVO REGISTRO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarMovimiento} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
              <h2 className="font-semibold text-sm text-slate-300">Registrar Movimiento</h2>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'gasto' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 ${nuevoMovimiento.tipo === 'gasto' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  <MinusCircle size={16} /> Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'ingreso' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1 ${nuevoMovimiento.tipo === 'ingreso' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  <PlusCircle size={16} /> Ingreso
                </button>
              </div>

              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto $"
                  value={nuevoMovimiento.monto}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, monto: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={nuevoMovimiento.categoria}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, categoria: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200"
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
                  placeholder="Descripción (opcional)"
                  value={nuevoMovimiento.descripcion}
                  onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, descripcion: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-900 py-3 rounded-lg transition"
              >
                Guardar Registro
              </button>
            </form>

            {/* HISTORIAL RECIENTE */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-slate-400">Últimos Movimientos</h3>
              <div className="space-y-2">
                {movimientos.slice(0, 5).map((m) => (
                  <div key={m.id} className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm text-white">{m.categoria}</div>
                      <div className="text-xs text-slate-400">{m.descripcion || m.dispositivo}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString()}
                      </span>
                      <button onClick={() => eliminarMovimiento(m.id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: APARTADOS (CON MONTO PERSONALIZADO) */}
        {activeTab === 'apartados' && (
          <div className="space-y-6">
            <form onSubmit={handleGuardarApartado} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
              <h2 className="font-semibold text-sm text-slate-300">Crear Nuevo Apartado</h2>
              <input
                type="text"
                placeholder="Nombre (ej. Vacaciones, Meta)"
                value={nuevoApartado.nombre}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, nombre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                required
              />
              <input
                type="number"
                placeholder="Meta de ahorro $"
                value={nuevoApartado.meta}
                onChange={(e) => setNuevoApartado({ ...nuevoApartado, meta: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                required
              />
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-900 py-2.5 rounded-lg text-sm">
                Crear Apartado
              </button>
            </form>

            {/* LISTA DE APARTADOS */}
            <div className="space-y-4">
              {apartados.map((item) => {
                const porcentaje = Math.min(Math.round(((item.actual || 0) / item.meta) * 100), 100);

                return (
                  <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-white">{item.nombre}</h3>
                      <span className="text-xs font-semibold text-slate-400">
                        ${(item.actual || 0).toLocaleString()} / ${Number(item.meta).toLocaleString()}
                      </span>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${porcentaje}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Progreso: {porcentaje}%</span>
                      <span>Restante: ${(item.meta - (item.actual || 0)).toLocaleString()}</span>
                    </div>

                    {/* CAMPO PERSONALIZADO Y BOTÓN INGRESAR */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="number"
                        placeholder="Monto a abonar $"
                        value={montosApartados[item.id] || ''}
                        onChange={(e) => setMontosApartados({ ...montosApartados, [item.id]: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        min="1"
                      />
                      <button
                        onClick={() => handleAbonarApartado(item)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap"
                      >
                        Ingresar
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
            <form onSubmit={handleGuardarRecurrente} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
              <h2 className="font-semibold text-sm text-slate-300">Nuevo Pago/Ingreso Recurrente</h2>
              <input
                type="text"
                placeholder="Título (ej. Renta, Nómina)"
                value={nuevoRecurrente.titulo}
                onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, titulo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Monto $"
                  value={nuevoRecurrente.monto}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, monto: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  required
                />
                <select
                  value={nuevoRecurrente.frecuencia}
                  onChange={(e) => setNuevoRecurrente({ ...nuevoRecurrente, frecuencia: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-900 py-2.5 rounded-lg text-sm">
                Guardar Recurrente
              </button>
            </form>

            <div className="space-y-2">
              {recurrentes.map((r) => (
                <div key={r.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white text-sm">{r.titulo}</div>
                    <div className="text-xs text-slate-400 capitalize">{r.frecuencia}</div>
                  </div>
                  <div className="font-bold text-emerald-400 text-sm">${Number(r.monto).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-2">
        <div className="max-w-md mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <PieChart size={20} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('apartados')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium ${activeTab === 'apartados' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <Target size={20} /> Apartados
          </button>
          <button
            onClick={() => setActiveTab('recurrentes')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium ${activeTab === 'recurrentes' ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <Calendar size={20} /> Recurrentes
          </button>
        </div>
      </nav>
    </div>
  );
}
