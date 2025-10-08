import { run, all } from '../memory.js';

export async function addTask(title) {
  await run('INSERT INTO tasks(title, created_at) VALUES (?,?)', [title, Date.now()/1000]);
  return `Tarefa criada: ${title}`;
}

export async function listTasks() {
  const rows = await all('SELECT id, title, done FROM tasks ORDER BY id DESC', []);
  if (!rows.length) return 'Sem tarefas.';
  return rows.map(r => `[${r.done? 'x':' '}] #${r.id} ${r.title}`).join('\n');
}
