import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL;

function SignalsTable({ signals }) {
  if (!signals?.length) return <p>No signals found.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#1e293b', textAlign: 'left' }}>
            <th style={th}>Time</th>
            <th style={th}>Component</th>
            <th style={th}>Type</th>
            <th style={th}>Severity</th>
            <th style={th}>Message</th>
            <th style={th}>Service</th>
            <th style={th}>Trace ID</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s, i) => (
            <tr key={s._id || i} style={{ borderBottom: '1px solid #334155', background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
              <td style={td}>{new Date(s.receivedAt).toLocaleString()}</td>
              <td style={td}>{s.componentId}</td>
              <td style={td}>{s.componentType}</td>
              <td style={{ ...td, color: severityColor(s.severity), fontWeight: 'bold' }}>{s.severity}</td>
              <td style={td}>{s.message}</td>
              <td style={td}>{s.payload?.service ?? '—'}</td>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.payload?.traceId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkItemDetail({ item, rca }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <tbody>
          <tr style={trStyle}><td style={labelTd}>Component</td><td style={td}>{item.component_id}</td></tr>
          <tr style={trStyle}><td style={labelTd}>Type</td><td style={td}>{item.component_type}</td></tr>
          <tr style={trStyle}><td style={labelTd}>Severity</td><td style={{ ...td, color: severityColor(item.severity), fontWeight: 'bold' }}>{item.severity}</td></tr>
          <tr style={trStyle}><td style={labelTd}>Status</td><td style={td}>{item.status}</td></tr>
          <tr style={trStyle}><td style={labelTd}>Signal Count</td><td style={td}>{item.signal_count}</td></tr>
          <tr style={trStyle}><td style={labelTd}>First Signal</td><td style={td}>{new Date(item.first_signal_time).toLocaleString()}</td></tr>
          <tr style={trStyle}><td style={labelTd}>MTTR</td><td style={td}>{item.mttr_seconds != null ? `${item.mttr_seconds}s` : 'Pending'}</td></tr>
          {rca && <>
            <tr style={trStyle}><td style={labelTd}>Root Cause</td><td style={td}>{rca.root_cause_category}</td></tr>
            <tr style={trStyle}><td style={labelTd}>Fix Applied</td><td style={td}>{rca.fix_applied}</td></tr>
            <tr style={trStyle}><td style={labelTd}>Prevention</td><td style={td}>{rca.prevention_steps}</td></tr>
            <tr style={trStyle}><td style={labelTd}>Incident Start</td><td style={td}>{new Date(rca.incident_start).toLocaleString()}</td></tr>
            <tr style={trStyle}><td style={labelTd}>Incident End</td><td style={td}>{new Date(rca.incident_end).toLocaleString()}</td></tr>
          </>}
        </tbody>
      </table>
    </div>
  );
}

// Styles
const th = { padding: '8px 12px', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' };
const td = { padding: '7px 12px', verticalAlign: 'top' };
const labelTd = { ...td, color: '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap', width: '140px' };
const trStyle = { borderBottom: '1px solid #1e293b' };
const severityColor = (s) => ({ P0: '#ef4444', P1: '#f97316', P2: '#eab308', P3: '#22c55e' }[s] ?? '#fff');

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const r = await fetch(`${API}/incidents`);
      setIncidents(await r.json());
    } catch (e) { setError(e.message); }
  }

  async function open(id) {
    const r = await fetch(`${API}/incidents/${id}`);
    const data = await r.json();
    setSelected(id);
    setDetail(data);
  }

  async function setStatus(status) {
    const r = await fetch(`${API}/incidents/${selected}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: 'Changed from dashboard' })
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    await open(selected);
    await load();
  }

  async function submitRca(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const r = await fetch(`${API}/incidents/${selected}/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    await open(selected);
  }

  async function simulate() {
    await fetch(`${API}/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentId: 'RDBMS_PRIMARY_01', componentType: 'RDBMS', severity: 'P0', message: 'checkout database timeout', payload: { service: 'checkout', latencyMs: 2200 } })
    });
    setTimeout(load, 700);
  }

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);

  return (
    <main>
      <header>
        <h1>Mission-Critical IMS Dashboard</h1>
        <button onClick={simulate}>Simulate P0 Signal</button>
      </header>
      {error && <p className="err">{error}</p>}
      <section className="grid">
        <aside>
          <h2>Live Feed</h2>
          {incidents.map(i => (
            <button className={`card ${i.severity}`} key={i.id} onClick={() => open(i.id)}>
              <b>{i.severity}</b> {i.component_id}
              <span>{i.status} • {i.signal_count} signals</span>
            </button>
          ))}
        </aside>

        <article>
          {detail ? <>
            <h2>{detail.item.title}</h2>

            {/* PostgreSQL structured data as table */}
            <h3>📋 Work Item — PostgreSQL</h3>
            <WorkItemDetail item={detail.item} rca={detail.rca} />

            <div className="actions">
              {['INVESTIGATING', 'RESOLVED', 'CLOSED'].map(s =>
                <button onClick={() => setStatus(s)} key={s}>{s}</button>
              )}
            </div>

            <h3>RCA</h3>
            <form onSubmit={submitRca}>
              <input name="incidentStart" type="datetime-local" required />
              <input name="incidentEnd" type="datetime-local" required />
              <select name="rootCauseCategory" required>
                <option value="Database">Database</option>
                <option value="Cache">Cache</option>
                <option value="Network">Network</option>
                <option value="Application">Application</option>
              </select>
              <textarea name="fixApplied" placeholder="Fix applied" required />
              <textarea name="preventionSteps" placeholder="Prevention steps" required />
              <button type="submit">Save RCA</button>
            </form>

            {/* MongoDB raw signals as readable table */}
            <h3>📡 Raw Signals — MongoDB <span style={{ fontWeight: 'normal', fontSize: '0.8rem', color: '#94a3b8' }}>({detail.signals?.length} shown)</span></h3>
            <SignalsTable signals={detail.signals} />

          </> : <p>Select an incident from the live feed.</p>}
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);