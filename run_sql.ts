import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const PAT = process.env.RESTRO_SUPABASE;
const REF = 'ahyhimbzazypjudjlpqt';

async function run() {
  if (!PAT) {
    console.error("Error: RESTRO_SUPABASE is not configured in .env");
    return;
  }

  const query = 'SELECT email, role, length(password_hash) as hash_len, length(salt) as salt_len FROM staff_credentials;';

  console.log("Executing migration SQL against remote Supabase project...");

  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
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
