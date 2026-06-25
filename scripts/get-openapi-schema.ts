import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

async function run() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const dest = path.join(process.cwd(), 'scripts', 'supabase-schema-details.json');
    fs.writeFileSync(dest, JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully saved OpenAPI schema to:', dest);
  } catch (err: any) {
    console.error('Error fetching OpenAPI schema:', err.message);
  }
}

run();
