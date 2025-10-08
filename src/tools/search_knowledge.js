import { searchDocs as search } from '../rag.js';

export async function searchKnowledge(query, k=4) {
  const results = await search(query, k);
  return results.map((r,i)=>`[${i+1}] score=${r.score.toFixed(3)}\n${r.chunk}`).join('\n\n');
}
