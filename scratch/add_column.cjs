const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Use the service role key if available, otherwise use anon key
const serviceKey = env.match(/VITE_SUPABASE_SERVICE_KEY=(.*)/)?.[1]?.trim() || 
                   env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const sb = createClient(url, serviceKey || key);

async function run() {
  // Try using the REST API to add column via SQL
  const response = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${serviceKey || key}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Alternative: use the management API
  const sqlUrl = `${url}/rest/v1/`;
  
  // Since we can't run DDL from the client, we'll handle it in the app code
  // by treating missing 'cuenta' field as 'Efectivo' (default)
  console.log('Cannot add column via client SDK. Will handle in app code.');
  console.log('The app will treat all existing records as "Efectivo" by default.');
  console.log('New records will include the cuenta field once the column is added.');
  
  // Let's try the Supabase Management API
  console.log('\nAttempting to add column via Supabase SQL...');
  
  const sqlResponse = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: "ALTER TABLE caja_banco ADD COLUMN cuenta TEXT DEFAULT 'Efectivo'" })
  });
  
  const result = await sqlResponse.text();
  console.log('SQL result:', sqlResponse.status, result);
}

run();
