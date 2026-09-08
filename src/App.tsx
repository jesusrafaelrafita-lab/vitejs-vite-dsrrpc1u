import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, 
  Smartphone, FolderPlus, Clock, Layers, Edit2, Trash2, CheckCircle2
} from 'lucide-react';

// --------------------------------------------------
// CONFIGURACIÓN DE SUPABASE
// --------------------------------------------------
const SUPABASE_URL = 'https://hglxhzxtwkxzefbfelkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbHhoenh0d2t4emVmYmZlbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzMwMjQsImV4cCI6MjEwNDQwOTAyNH0.tdZ0iNzV9utW-SA6olG9LOarUip3xK-bVUBR3gZa55I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Categorías Predefinidas
const CATEGORIAS_GASTO = [
  '🍔 Comida / Boneless', '🛒 Mandado / Super', '🏧 Retiro Cajero',
  '⛽ Gasolina / Transporte', '💡 Luz / Servicios', '🏠 Renta',
  '📶 Internet / Plan', '💳 Crédito / Préstamo', '💊 Farmacia / Salud',
  '🎭 Entretenimiento', '🛍️ Compras Varias'
];

const CATEGORIAS_INGRESO = [
  '💼 Sueldo / Nómina', '💵 Ventas / Trabajo Extra', '🎁 Regalo / Transferencia', '🔀 Otro Ingreso'
];

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lun' },
  { id: 2, nombre: 'Mar' },
  { id: 3, nombre: 'Mié' },
  { id: 4, nombre: 'Jue' },
  { id: 5, nombre: 'Vie' },
  { id: 6, nombre: 'Sáb' },
  { id: 0, nombre: 'Dom' }
];

interface Movimiento {
  id?: string;
  monto: number;
  tipo: 'ingreso' | 'gasto';
  categoria: string;
  descripcion: string;
  dispositivo: string;
  created_at?: string;
}

interface Recurrente {
  id?: string;
  titulo: string;
  monto: number;
  tipo: 'ingreso' | 'gasto';
  frecuencia: string;
  categoria: string;
  proxima_fecha?: string;
  ultimo_procesado?: string;
  // Campos locales dinámicos
  esConstante?: boolean;
  diasSemana?: number[];
  hora24?: string;
}

interface Apartado {
  id?: string;
  nombre: string;
  meta: number;
  actual: number;
}

export default function App() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [recurrentes, setRecurrentes] = useState<Recurrente[]>([]);
  const [apartados, setApartados] = useState<Apartado[]>([]);

  // Formulario de Movimiento Rápido (Gastos / Ingresos)
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>('gasto');
  const [categoria, setCategoria] = useState(CATEGORIAS_GASTO[0]);
  const [descripcion, setDescripcion] = useState('');
  const [dispositivo, setDispositivo] = useState<string>(
    localStorage.getItem('finanzas_dispositivo') || 'Él'
  );

  // Formulario de Programados / Entradas de Dinero
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [tituloRecurrente, setTituloRecurrente] = useState('');
  const [montoRecurrente, setMontoRecurrente] = useState('');
  const [esConstante, setEsConstante] = useState<boolean>(true);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([3]); // Miércoles por defecto
  const [horaProgramada, setHoraProgramada] = useState('08:00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [catRecurrente, setCatRecurrente] = useState(CATEGORIAS_INGRESO[0]);

  // Formulario Apartados
  const [nombreApartado, setNombreApartado] = useState('');
  const [metaApartado, setMetaApartado] = useState('');

  // Control de Pestañas
  const [pestana, setPestana] = useState<'inicio' | 'apartados' | 'admin'>('inicio');

  useEffect(() => {
    fetchDatos();

    // Suscripciones en Tiempo Real
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => fetchMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurrentes' }, () => fetchRecurrentes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartados' }, () => fetchApartados())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Procesar las entradas de dinero constantes automáticamente en UTC-7
  useEffect(() => {
    if (recurrentes.length > 0) {
      procesarRecurrentesAutomaticos();
    }
  }, [recurrentes]);

  const fetchDatos = () => {
    fetchMovimientos();
    fetchRecurrentes();
    fetchApartados();
  };

  const fetchMovimientos = async () => {
    const { data, error } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false });
    if (data) setMovimientos(data);
    if (error) console.error("Error cargando movimientos:", error);
  };

  const fetchRecurrentes = async () => {
    const { data, error } = await supabase.from('recurrentes').select('*');
    if (data) {
      const procesados = data.map(item => {
        let esConstanteVal = true;
        let diasVal = [3];
        let horaVal = '08:00';

        if (item.frecuencia && item.frecuencia.startsWith('{')) {
          try {
            const parsed = JSON.parse(item.frecuencia);
            esConstanteVal = parsed.esConstante ?? true;
            diasVal = parsed.diasSemana || [3];
            horaVal = parsed.hora24 || '08:00';
          } catch (e) {
            console.error("Error parseando frecuencia JSON", e);
          }
        }
        return {
          ...item,
          esConstante: esConstanteVal,
          diasSemana: diasVal,
          hora24: horaVal
        };
      });
      setRecurrentes(procesados);
    }
    if (error) console.error("Error cargando recurrentes:", error);
  };

  const fetchApartados = async () => {
    const { data, error } = await supabase.from('apartados').select('*');
    if (data) setApartados(data);
    if (error) console.error("Error cargando apartados:", error);
  };

  const guardarDispositivo = (nombre: string) => {
    setDispositivo(nombre);
    localStorage.setItem('finanzas_dispositivo', nombre);
  };

  const obtenerHora24 = (hora12: string, formatoAMPM: 'AM' | 'PM') => {
    let [h, m] = hora12.split(':').map(Number);
    if (formatoAMPM === 'PM' && h < 12) h += 12;
    if (formatoAMPM === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  };

  const procesarRecurrentesAutomaticos = async () => {
    const ahoraUtc = new Date();
    const ahoraUtc7 = new Date(ahoraUtc.getTime() - 7 * 60 * 60 * 1000);

    const diaSemanaActual = ahoraUtc7.getUTCDay();
    const horaActualStr = `${String(ahoraUtc7.getUTCHours()).padStart(2, '0')}:${String(ahoraUtc7.getUTCMinutes()).padStart(2, '0')}`;
    const fechaHoyStr = ahoraUtc7.toISOString().split('T')[0];

    for (const rec of recurrentes) {
      if (rec.esConstante && rec.diasSemana && rec.diasSemana.includes(diaSemanaActual)) {
        const horaEjecucion = rec.hora24 || '08:00';
        
        if (horaActualStr >= horaEjecucion && rec.ultimo_procesado !== fechaHoyStr) {
          await supabase.from('movimientos').insert([{
            monto: rec.monto,
            tipo: rec.tipo || 'ingreso',
            categoria: rec.categoria,
            descripcion: `[Entrada Automática] ${rec.titulo}`,
            dispositivo: 'Auto UTC-7'
          }]);

          await supabase.from('recurrentes').update({ ultimo_procesado: fechaHoyStr }).eq('id', rec.id);
        }
      }
    }
  };

  const agregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return;

    const { error } = await supabase.from('movimientos').insert([{
      monto: parseFloat(monto),
      tipo,
      categoria,
      descripcion,
      dispositivo
    }]);

    if (!error) {
      setMonto('');
      setDescripcion('');
      fetchMovimientos();
    } else {
      alert("Error al guardar el registro: " + error.message);
    }
  };

  const borrarMovimiento = async (id: string) => {
    const { error } = await supabase.from('movimientos').delete().eq('id', id);
    if (!error) fetchMovimientos();
  };

  const alternarDiaSeleccionado = (diaId: number) => {
    if (diasSeleccionados.includes(diaId)) {
      setDiasSeleccionados(diasSeleccionados.filter(id => id !== diaId));
    } else {
      setDiasSeleccionados([...diasSeleccionados, diaId]);
    }
  };

  const guardarOActualizarRecurrente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloRecurrente || !montoRecurrente) return;

    const hora24 = obtenerHora24(horaProgramada, ampm);
    const metadataFrecuencia = JSON.stringify({
      esConstante,
      diasSemana: diasSeleccionados,
      hora24
    });

    const payload = {
      titulo: tituloRecurrente,
      monto: parseFloat(montoRecurrente),
      tipo: 'ingreso',
      frecuencia: metadataFrecuencia,
      categoria: catRecurrente
    };

    let resError = null;

    if (idEditando) {
      const { error } = await supabase.from('recurrentes').update(payload).eq('id', idEditando);
      resError = error;
    } else {
      const { error } = await supabase.from('recurrentes').insert([payload]);
      resError = error;
    }

    if (!resError) {
      cancelarEdicionRecurrente();
      fetchRecurrentes();
    } else {
      alert("Error al guardar la entrada de dinero: " + resError.message);
    }
  };

  const cargarParaEditarRecurrente = (rec: Recurrente) => {
    setIdEditando(rec.id || null);
    setTituloRecurrente(rec.titulo);
    setMontoRecurrente(rec.monto.toString());
    setEsConstante(rec.esConstante ?? true);
    setDiasSeleccionados(rec.diasSemana || [3]);
    setCatRecurrente(rec.categoria);
  };

  const cancelarEdicionRecurrente = () => {
    setIdEditando(null);
    setTituloRecurrente('');
    setMontoRecurrente('');
    setEsConstante(true);
    setDiasSeleccionados([3]);
  };

  const borrarRecurrente = async (id: string) => {
    const { error } = await supabase.from('recurrentes').delete().eq('id', id);
    if (!error) fetchRecurrentes();
  };

  const ejecutarEntradaManual = async (rec: Recurrente) => {
    const { error } = await supabase.from('movimientos').insert([{
      monto: rec.monto,
      tipo: 'ingreso',
      categoria: rec.categoria,
      descripcion: `[Entrada Registrada] ${rec.titulo}`,
      dispositivo
    }]);

    if (!error) {
      alert(`¡Entrada de $${rec.monto} añadida al saldo con éxito!`);
      fetchMovimientos();
    }
  };

  const agregarApartado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreApartado || !metaApartado) return;

    const { error } = await supabase.from('apartados').insert([{
      nombre: nombreApartado,
      meta: parseFloat(metaApartado),
      actual: 0
    }]);

    if (!error) {
      setNombreApartado('');
      setMetaApartado('');
      fetchApartados();
    }
  };

  const abonarApartado = async (id: string, actual: number, abono: number) => {
    if (abono <= 0) return;
    await supabase.from('apartados').update({ actual: actual + abono }).eq('id', id);
    fetchApartados();
  };

  const borrarApartado = async (id: string) => {
    await supabase.from('apartados').delete().eq('id', id);
    fetchApartados();
  };

  const calcularBalanceTotal = () => {
    return movimientos.reduce((acc, mov) => {
      return mov.tipo === 'ingreso' ? acc + mov.monto : acc - mov.monto;
    }, 0);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#f1f1f1', minHeight: '100vh' }}>
      
      {/* CABECERA Y SELECCIÓN DE DISPOSITIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#1e1e1e', padding: '12px', borderRadius: '12px' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#aaa' }}>Balance disponible</span>
          <h2 style={{ margin: 0, fontSize: '28px', color: calcularBalanceTotal() >= 0 ? '#4caf50' : '#f44336' }}>
            ${calcularBalanceTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Smartphone size={12} /> Dispositivo:
          </div>
          <select 
            value={dispositivo} 
            onChange={(e) => guardarDispositivo(e.target.value)}
            style={{ background: '#2d2d2d', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
          >
            <option value="Él">Él</option>
            <option value="Ella">Ella</option>
          </select>
        </div>
      </div>

      {/* MENÚ DE NAVEGACIÓN DE PESTAÑAS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => setPestana('inicio')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: pestana === 'inicio' ? '#3b82f6' : '#2d2d2d', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Wallet size={16} /> Inicio
        </button>
        <button 
          onClick={() => setPestana('apartados')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: pestana === 'apartados' ? '#3b82f6' : '#2d2d2d', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Layers size={16} /> Apartados
        </button>
        <button 
          onClick={() => setPestana('admin')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: pestana === 'admin' ? '#3b82f6' : '#2d2d2d', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Clock size={16} /> Entradas
        </button>
      </div>

      {/* PESTAÑA INICIO - REGISTRO RÁPIDO Y HISTORIAL */}
      {pestana === 'inicio' && (
        <>
          <form onSubmit={agregarMovimiento} style={{ background: '#1e1e1e', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => { setTipo('gasto'); setCategoria(CATEGORIAS_GASTO[0]); }}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: tipo === 'gasto' ? '#ef4444' : '#2d2d2d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <ArrowDownCircle size={16} /> - Gasto
              </button>
              <button
                type="button"
                onClick={() => { setTipo('ingreso'); setCategoria(CATEGORIAS_INGRESO[0]); }}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: tipo === 'ingreso' ? '#10b981' : '#2d2d2d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <ArrowUpCircle size={16} /> + Ingreso
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#aaa' }}>Monto ($)</label>
              <input 
                type="number" 
                step="0.01" 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '18px', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#aaa' }}>Categoría</label>
              <select 
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
              >
                {(tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#aaa' }}>Descripción (Opcional)</label>
              <input 
                type="text" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                placeholder="Ej. Tacos, recibo..."
                style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', background: tipo === 'gasto' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
              Registrar {tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          </form>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Historial de Movimientos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {movimientos.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No hay movimientos guardados aún.</p>
            ) : (
              movimientos.map(mov => (
                <div key={mov.id} style={{ background: '#1e1e1e', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{mov.categoria}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{mov.descripcion || 'Sin descripción'}</div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{mov.dispositivo} • {new Date(mov.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: mov.tipo === 'ingreso' ? '#10b981' : '#ef4444' }}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto.toFixed(2)}
                    </div>
                    {mov.id && (
                      <button onClick={() => borrarMovimiento(mov.id!)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* PESTAÑA ENTRADAS DE DINERO PROGRAMADAS / MANUALES */}
      {pestana === 'admin' && (
        <>
          <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={18} /> {idEditando ? 'Editar Entrada de Dinero' : 'Registrar Entrada de Dinero'}
            </h3>

            <form onSubmit={guardarOActualizarRecurrente}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Nombre del Ingreso</label>
                <input 
                  type="text" 
                  value={tituloRecurrente} 
                  onChange={(e) => setTituloRecurrente(e.target.value)} 
                  placeholder="Ej. Trabajo Fábrica, Trabajo Extra..."
                  style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Monto Aportado ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={montoRecurrente} 
                  onChange={(e) => setMontoRecurrente(e.target.value)} 
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {/* TIPO DE ENTRADA: CONSTANTE O MANUAL */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Frecuencia de la Entrada</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEsConstante(true)}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: esConstante ? '#10b981' : '#2d2d2d', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🔄 Constante (Semanal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsConstante(false)}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: !esConstante ? '#3b82f6' : '#2d2d2d', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🖐️ No Constante (Manual)
                  </button>
                </div>
              </div>

              {/* CONFIGURACIÓN DÍAS Y HORA SI ES CONSTANTE */}
              {esConstante && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Días de la semana que se registrará:</label>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                      {DIAS_SEMANA.map(dia => {
                        const seleccionado = diasSeleccionados.includes(dia.id);
                        return (
                          <button
                            type="button"
                            key={dia.id}
                            onClick={() => alternarDiaSeleccionado(dia.id)}
                            style={{
                              flex: 1,
                              padding: '8px 0',
                              borderRadius: '6px',
                              border: 'none',
                              background: seleccionado ? '#3b82f6' : '#2d2d2d',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {dia.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#aaa' }}>Hora de ejecución automática (UTC-7)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input 
                        type="time" 
                        value={horaProgramada} 
                        onChange={(e) => setHoraProgramada(e.target.value)}
                        style={{ flex: 2, padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                      />
                      <select 
                        value={ampm} 
                        onChange={(e) => setAmpm(e.target.value as 'AM' | 'PM')}
                        style={{ flex: 1, padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', fontWeight: 'bold' }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Categoría</label>
                <select 
                  value={catRecurrente} 
                  onChange={(e) => setCatRecurrente(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                >
                  {CATEGORIAS_INGRESO.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: idEditando ? '#f59e0b' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                  {idEditando ? 'Guardar Cambios' : 'Guardar Entrada'}
                </button>
                {idEditando && (
                  <button type="button" onClick={cancelarEdicionRecurrente} style={{ padding: '12px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Lista de Entradas Registradas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recurrentes.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No hay entradas de dinero guardadas aún.</p>
            ) : (
              recurrentes.map(rec => (
                <div key={rec.id} style={{ background: '#1e1e1e', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{rec.titulo}</div>
                    {rec.esConstante ? (
                      <>
                        <div style={{ fontSize: '12px', color: '#10b981' }}>
                          🔄 Constante: {rec.diasSemana?.map(d => DIAS_SEMANA.find(item => item.id === d)?.nombre).join(', ')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa' }}>Hora: {rec.hora24} (UTC-7)</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                        🖐️ No Constante (Se aplica de forma manual)
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#10b981' }}>+${rec.monto.toFixed(2)}</div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                      {!rec.esConstante && (
                        <button 
                          onClick={() => ejecutarEntradaManual(rec)}
                          title="Registrar esta entrada ahora"
                          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          <CheckCircle2 size={12} /> Sumar
                        </button>
                      )}
                      <button 
                        onClick={() => cargarParaEditarRecurrente(rec)}
                        style={{ background: '#2d2d2d', color: '#f59e0b', border: '1px solid #444', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => rec.id && borrarRecurrente(rec.id)}
                        style={{ background: '#2d2d2d', color: '#ef4444', border: '1px solid #444', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* PESTAÑA APARTADOS DE AHORRO */}
      {pestana === 'apartados' && (
        <>
          <form onSubmit={agregarApartado} style={{ background: '#1e1e1e', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderPlus size={18} /> Crear Nuevo Apartado
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#aaa' }}>Nombre de la Meta</label>
              <input 
                type="text" 
                value={nombreApartado} 
                onChange={(e) => setNombreApartado(e.target.value)} 
                placeholder="Ej. Salida Fin de Semana, Renta..."
                style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#aaa' }}>Meta de Ahorro ($)</label>
              <input 
                type="number" 
                value={metaApartado} 
                onChange={(e) => setMetaApartado(e.target.value)} 
                placeholder="0.00"
                style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
              Crear Apartado
            </button>
          </form>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Mis Apartados</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apartados.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No tienes apartados creados.</p>
            ) : (
              apartados.map(ap => {
                const porcentaje = Math.min(100, Math.round((ap.actual / ap.meta) * 100));
                return (
                  <div key={ap.id} style={{ background: '#1e1e1e', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold' }}>{ap.nombre}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#aaa' }}>${ap.actual.toFixed(2)} / ${ap.meta.toFixed(2)}</span>
                        {ap.id && (
                          <button onClick={() => borrarApartado(ap.id!)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ width: '100%', background: '#2d2d2d', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ width: `${porcentaje}%`, background: '#3b82f6', height: '100%' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => ap.id && abonarApartado(ap.id, ap.actual, 100)}
                        style={{ flex: 1, padding: '6px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                      >
                        +$100
                      </button>
                      <button 
                        onClick={() => ap.id && abonarApartado(ap.id, ap.actual, 500)}
                        style={{ flex: 1, padding: '6px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                      >
                        +$500
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

    </div>
  );
}
