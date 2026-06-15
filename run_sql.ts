import fetch from 'node-fetch';

const PAT = process.env.RESTRO_SUPABASE;
const REF = 'ahyhimbzazypjudjlpqt';

async function run() {
  const query = `
    SELECT 1 as "connection_test";
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error:", text);
  } else {
    const data = await res.json();
    console.log("Success:", data);
  }
}

run();
