import { plan, advance, cost, pulses, PRICE_CENTS } from './model.mjs';
const $ = id => document.getElementById(id);
const fmt = (n, digits = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const readAmount = () => Number($('amount').value.trim().replace(',', '.'));
const KEY = 'fuel-lab-v1';
let mode = 'money', session = null, records = [], last = null, lastSave = 0, lastLog = -1, storageOK = true;
const validRecord = r => r && typeof r.id === 'string' && Number.isFinite(r.ml) && r.ml > 0 && r.ml <= 200000 && Number.isFinite(r.elapsed) && r.elapsed >= 0 && typeof r.date === 'string' && Number.isFinite(Date.parse(r.date)) && ['complete', 'stopped'].includes(r.status);
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ mode, amount: $('amount').value, capacity: $('capacity').value, initial: $('initial').value, rate: $('rate').value, session, records })); }
  catch { storageOK = false; $('storage-note').textContent = 'Armazenamento indisponível. Os dados desta sessão ficarão apenas na memória.'; }
}
function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!data) return;
    records = Array.isArray(data.records) ? data.records.filter(validRecord).slice(0, 50) : [];
    if (['money', 'litres', 'full'].includes(data.mode)) mode = data.mode;
    for (const field of ['amount', 'capacity', 'initial', 'rate']) if (typeof data[field] === 'string' && data[field].length < 20) $(field).value = data[field];
    const s = data.session;
    if (s && [s.ml, s.targetMl, s.initialMl, s.capacityMl, s.elapsed].every(Number.isFinite) && s.capacityMl > 0 && s.capacityMl <= 200000 && s.initialMl >= 0 && s.ml >= 0 && s.targetMl > 0 && s.ml <= s.targetMl && s.targetMl + s.initialMl <= s.capacityMl && s.elapsed >= 0 && ['running', 'paused', 'complete', 'stopped'].includes(s.status)) {
      session = { ...s, status: ['running', 'paused'].includes(s.status) ? 'paused' : s.status };
      if (session.status === 'paused') $('message').textContent = 'Sessão recuperada em pausa. Clique em Retomar para continuar.';
    }
  } catch { storageOK = false; }
}
function configureMode() {
  document.querySelectorAll('[data-mode]').forEach(b => { const selected = b.dataset.mode === mode; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  $('amount-label').textContent = mode === 'litres' ? 'Quantidade desejada (L)' : mode === 'full' ? 'Completar até a capacidade' : 'Valor desejado (R$)';
  $('amount-unit').textContent = mode === 'money' ? 'R$' : 'L';
  $('amount').disabled = mode === 'full' || locked();
  $('presets').hidden = mode === 'full';
  const values = mode === 'money' ? [50, 100, 200] : [5, 10, 20];
  document.querySelectorAll('[data-value]').forEach((b, i) => { b.dataset.value = values[i]; b.textContent = mode === 'money' ? `R$ ${values[i]}` : `${values[i]} L`; });
}
function locked() { return session && ['running', 'paused'].includes(session.status); }
function preview() {
  $('rate-value').textContent = `${$('rate').value} L/min`;
  try {
    const p = plan({ mode, amount: mode === 'full' ? 1 : readAmount(), capacity: Number($('capacity').value), initial: Number($('initial').value) });
    $('estimate').textContent = `${fmt(p.targetMl / 1000, 3)} L · R$ ${fmt(cost(p.targetMl) / 100)}${p.limited ? ' · limitado ao tanque' : ''}`;
  } catch (e) { $('estimate').textContent = e.message; }
}
function render() {
  const active = session?.status === 'running';
  const current = session ? session.initialMl + session.ml : Number($('initial').value) * 1000;
  const capacity = session ? session.capacityMl : Number($('capacity').value) * 1000;
  const level = Number.isFinite(current / capacity) ? Math.max(0, Math.min(100, current / capacity * 100)) : 0;
  const volume = session?.ml || 0;
  const percent = session ? Math.min(100, volume / session.targetMl * 100) : 0;
  $('money').textContent = fmt(cost(volume) / 100);
  $('litres').textContent = fmt(volume / 1000, 3);
  $('level-percent').replaceChildren(document.createTextNode(Math.floor(level)), Object.assign(document.createElement('small'), { textContent: '%' }));
  $('tank-litres').textContent = fmt(current / 1000);
  $('tank-capacity').textContent = fmt(capacity / 1000, 0);
  document.querySelector('.tank-mark').textContent = `F / ${fmt(capacity / 1000, 0)}`;
  $('remaining').textContent = `${fmt(Math.max(0, capacity - current) / 1000)} L disponíveis`;
  $('fuel').style.height = `${level}%`;
  $('tank').setAttribute('aria-valuenow', level.toFixed(1));
  $('progress').style.width = `${percent}%`;
  $('progress-percent').textContent = `${Math.floor(percent)}%`;
  $('progress-label').textContent = session ? `${fmt(volume / 1000, 3)} de ${fmt(session.targetMl / 1000, 3)} L` : 'Aguardando início';
  const states = { running: ['ABASTECENDO', 'PUMP ON'], paused: ['PAUSADO', 'PAUSED'], complete: ['CONCLUÍDO', 'COMPLETE'], stopped: ['FINALIZADO', 'STOPPED'] };
  const state = states[session?.status] || ['PRONTO', 'STANDBY'];
  $('state').textContent = state[0]; $('lcd-state').textContent = state[1];
  document.body.classList.toggle('running', active);
  $('pulses').textContent = fmt(pulses(volume), 0);
  $('flow').textContent = `${fmt(active ? Number($('rate').value) : 0, 1)} L/min`;
  const seconds = Math.floor(session?.elapsed || 0);
  $('elapsed').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('valve').textContent = active ? 'ABERTA' : 'FECHADA';
  $('start').disabled = Boolean(locked());
  $('pause').disabled = !locked(); $('pause').textContent = session?.status === 'paused' ? 'Retomar' : 'Pausar';
  $('stop').disabled = !locked(); $('reset').disabled = Boolean(locked());
  for (const id of ['capacity', 'initial', 'rate']) $(id).disabled = Boolean(locked());
  document.querySelectorAll('[data-mode], [data-value]').forEach(b => b.disabled = Boolean(locked()));
  $('amount').disabled = Boolean(locked()) || mode === 'full';
}
function log(state) {
  const ml = session?.ml || 0;
  $('serial').textContent = `[${state}] ESP32 virtual\n[VOLUME] ${(ml / 1000).toFixed(3)} L / ${pulses(ml)} pulses\n[VALVE] ${session?.status === 'running' ? 'OPEN' : 'CLOSED'}`;
}
function history() {
  const body = $('history'); body.replaceChildren();
  if (!records.length) { const tr = body.insertRow(); const td = tr.insertCell(); td.colSpan = 5; td.className = 'empty'; td.textContent = 'Seu primeiro abastecimento aparecerá aqui.'; }
  for (const r of records) {
    const row = body.insertRow();
    for (const text of [new Date(r.date).toLocaleString('pt-BR'), `${fmt(r.ml / 1000, 3)} L`, `R$ ${fmt(cost(r.ml) / 100)}`, `${fmt(r.elapsed, 1)} s`, r.status === 'complete' ? 'Concluído' : 'Parada manual']) row.insertCell().textContent = text;
  }
  $('export').disabled = !records.length; $('clear').disabled = !records.length;
}
function finish(status) {
  session.status = status;
  if (session.ml > 0) records.unshift({ id: crypto.randomUUID(), date: new Date().toISOString(), ml: session.ml, elapsed: session.elapsed, status });
  records = records.slice(0, 50);
  $('initial').value = ((session.initialMl + session.ml) / 1000).toFixed(3);
  $('message').textContent = status === 'complete' ? 'Abastecimento concluído. A válvula virtual foi fechada automaticamente.' : 'Abastecimento finalizado. O volume parcial foi registrado.';
  last = null; log(status.toUpperCase()); save(); history(); preview();
}
$('settings').addEventListener('submit', e => {
  e.preventDefault(); if (locked()) return;
  try {
    const p = plan({ mode, amount: mode === 'full' ? 1 : readAmount(), capacity: Number($('capacity').value), initial: Number($('initial').value) });
    session = { ...p, ml: 0, elapsed: 0, status: 'running' }; last = null; lastLog = -1;
    $('message').textContent = p.limited ? 'Quantidade ajustada ao espaço livre no tanque.' : 'Abastecendo. A parada será automática ao atingir a quantidade.';
    log('START'); save(); render();
  } catch (err) { $('message').textContent = err.message; }
});
$('pause').addEventListener('click', () => { if (!locked()) return; session.status = session.status === 'running' ? 'paused' : 'running'; last = null; $('message').textContent = session.status === 'paused' ? 'Abastecimento pausado. Válvula virtual fechada.' : 'Abastecimento retomado.'; log(session.status.toUpperCase()); save(); render(); });
$('stop').addEventListener('click', () => { if (locked()) { finish('stopped'); render(); } });
$('reset').addEventListener('click', () => { if (locked()) return; session = null; $('initial').value = '10'; $('capacity').value = '50'; $('message').textContent = 'Novo tanque preparado com 10 L iniciais.'; save(); preview(); render(); log('READY'); });
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; $('amount').value = mode === 'money' ? '100,00' : '10'; configureMode(); preview(); save(); }));
document.querySelectorAll('[data-value]').forEach(b => b.addEventListener('click', () => { $('amount').value = b.dataset.value; preview(); save(); }));
for (const id of ['amount', 'capacity', 'initial', 'rate']) $(id).addEventListener('input', () => { if (!locked()) { if (['capacity', 'initial'].includes(id)) session = null; preview(); render(); save(); } });
$('clear').addEventListener('click', () => { records = []; save(); history(); });
$('export').addEventListener('click', () => {
  const lines = [['data_iso', 'volume_l', 'valor_brl', 'preco_brl_l', 'duracao_s', 'resultado'], ...records.map(r => [r.date, (r.ml / 1000).toFixed(3), (cost(r.ml) / 100).toFixed(2), (PRICE_CENTS / 100).toFixed(2), r.elapsed.toFixed(2), r.status])];
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.map(row => row.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'abastecimentos.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && session?.status === 'running') { session.status = 'paused'; last = null; $('message').textContent = 'Pausado automaticamente ao sair da aba.'; log('PAUSED'); save(); render(); } });
window.addEventListener('pagehide', save);
function frame(time) {
  if (session?.status === 'running') {
    if (last !== null) session = advance(session, Math.min((time - last) / 1000, 0.5), Number($('rate').value));
    last = time;
    if (session.status === 'complete') finish('complete');
    if (Math.floor(session.elapsed) !== lastLog) { lastLog = Math.floor(session.elapsed); log(session.status.toUpperCase()); }
    if (time - lastSave >= 1000) { save(); lastSave = time; }
    render();
  } else last = null;
  requestAnimationFrame(frame);
}
restore(); configureMode(); preview(); render(); history();
if (!storageOK) $('storage-note').textContent = 'Dados locais indisponíveis ou inválidos. Uma nova sessão foi iniciada.';
if (session) log(session.status.toUpperCase());
requestAnimationFrame(frame);
