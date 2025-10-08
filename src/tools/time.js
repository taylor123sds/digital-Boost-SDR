export async function getTime() {
  const now = new Date();
  return now.toISOString();
}
