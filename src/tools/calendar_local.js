import { run, all } from '../memory.js';

export async function addEvent(title, datetime, notes='') {
  await run('INSERT INTO events(title, datetime, notes, created_at) VALUES (?,?,?,?)',
    [title, datetime, notes, Date.now()/1000]);
  return `Evento criado: ${title} em ${datetime}`;
}

export async function listEvents() {
  const rows = await all('SELECT id, title, datetime, notes FROM events ORDER BY datetime ASC', []);
  if (!rows.length) return 'Sem eventos.';
  return rows.map(r => `#${r.id} ${r.datetime} — ${r.title}${r.notes? ' ('+r.notes+')':''}`).join('\n');
}
