// src/rag.js — RAG local (simples) com embeddings e sqlite
//  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
import fs from "fs";
import path from "path";
import { getDatabase } from './db/index.js';
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const EMB_MODEL = process.env.OPENAI_EMB_MODEL || "text-embedding-3-small";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY ausente. Configure no .env antes de rodar o RAG.");
  process.exit(1);
}
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  CORREÇÃO: Usar conexão singleton do db/connection.js
const db = getDatabase();
db.prepare(`CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  chunk TEXT,
  embedding TEXT
)`).run();

function cosine(a,b){
  let s=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){ s+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return s / (Math.sqrt(na)*Math.sqrt(nb) + 1e-8);
}

function splitChunks(text, size=900){
  const out=[]; for(let i=0;i<text.length;i+=size){ out.push(text.slice(i,i+size)); } return out;
}

async function embed(text){
  const r = await client.embeddings.create({ model: EMB_MODEL, input: text });
  return r.data[0].embedding;
}

// ===== ingest =====
export async function ingestDir(dir){
  const files = fs.readdirSync(dir).filter(f=>/\.(md|txt|json)$/i.test(f));
  for(const f of files){
    const full = path.join(dir,f);
    const raw = fs.readFileSync(full,'utf-8');
    const title = f;
    const chunks = splitChunks(raw, 1200);
    for(const ch of chunks){
      const emb = await embed(ch);
      const stmt = db.prepare(`INSERT INTO docs(title,chunk,embedding) VALUES(?,?,?)`);
      stmt.run(title, ch, JSON.stringify(emb));
    }
    console.log(`Ingerido: ${f} (${chunks.length} pedaços)`);
  }
  console.log(" Ingestão concluída.");
}

// ===== search =====
export async function searchDocs(query, k=4){
  // pega todos (ok para bases pequenas); para grandes, use uma lib de vetor
  const stmt = db.prepare(`SELECT id,title,chunk,embedding FROM docs`);
  const all = stmt.all();
  if(!all.length) return [];

  const qEmb = await embed(query);
  const scored = all.map(r=>{
    const emb = JSON.parse(r.embedding);
    return { id:r.id, title:r.title, chunk:r.chunk, score: cosine(qEmb,emb) };
  }).sort((a,b)=> b.score - a.score);

  return scored.slice(0,k);
}
  
// CLI simples: node src/rag.js ingest ./knowledge
if (process.argv[2]==='ingest') {
  const dir = process.argv[3] || path.join(process.cwd(),'knowledge');
  if(!fs.existsSync(dir)){
    console.error(`Pasta não encontrada: ${dir}`);
    process.exit(1);
  }
  ingestDir(dir).then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
}

