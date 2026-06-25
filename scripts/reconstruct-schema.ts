import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'supabase-schema-details.json'), 'utf8'));

// Order tables to satisfy foreign key constraints
const orderedTables = [
  'users',
  'customer_profiles',
  'addresses',
  'settings',
  'cms_pages',
  'gallery_images',
  'milk_rates',
  'delivery_staff',
  'subscriptions',
  'daily_milk_entries',
  'orders',
  'monthly_bills',
  'payments',
  'animal_listings',
  'animal_images',
  'delivery_assignments',
  'notifications',
  'audit_logs',
  'daily_cash_sales',
  'contact_inquiries'
];

let sql = `-- Reconstructed Database Schema for Doodh Hisaab
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

`;

// Helper to extract foreign keys from description
function getForeignKey(desc: string, colName: string): string | null {
  if (!desc) return null;
  const match = desc.match(/<fk table='([^']+)' column='([^']+)'\/>/);
  if (match) {
    return `REFERENCES ${match[1]}(${match[2]}) ON DELETE CASCADE`;
  }
  return null;
}

for (const tableName of orderedTables) {
  const def = data.definitions[tableName];
  if (!def) continue;

  sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

  const colLines: string[] = [];
  const pkColumns: string[] = [];

  for (const propName of Object.keys(def.properties)) {
    const prop = def.properties[propName];
    let typeStr = '';
    
    if (prop.format) {
      if (prop.format === 'timestamp with time zone') {
        typeStr = 'TIMESTAMP WITH TIME ZONE';
      } else {
        typeStr = prop.format.toUpperCase();
      }
    } else if (prop.type === 'array') {
      const itemType = prop.items?.format || prop.items?.type || 'text';
      typeStr = `${itemType.toUpperCase()}[]`;
    } else if (prop.type === 'number') {
      typeStr = 'NUMERIC';
    } else if (prop.type === 'integer') {
      typeStr = 'INTEGER';
    } else if (prop.type === 'boolean') {
      typeStr = 'BOOLEAN';
    } else {
      typeStr = 'TEXT';
    }

    let line = `  ${propName} ${typeStr}`;

    // Add NULL/NOT NULL based on required array
    const isRequired = def.required && def.required.includes(propName);
    
    // Add DEFAULT if present
    if (prop.default !== undefined) {
      let defaultVal = prop.default;
      if (defaultVal === 'undefined') {
        // Skip undefined string representation
      } else if (typeof defaultVal === 'string') {
        if (defaultVal.includes('(') || defaultVal.includes('::') || defaultVal.toLowerCase() === 'current_date') {
          // It's a postgres expression/function call
          line += ` DEFAULT ${defaultVal}`;
        } else {
          line += ` DEFAULT '${defaultVal}'`;
        }
      } else {
        line += ` DEFAULT ${defaultVal}`;
      }
    }

    // Add Primary Key check
    const isPk = prop.description && prop.description.includes('<pk/>');
    if (isPk) {
      pkColumns.push(propName);
    }

    // Add Foreign Key check
    const fkConstraint = getForeignKey(prop.description || '', propName);
    if (fkConstraint) {
      line += ` ${fkConstraint}`;
    }

    if (isRequired && !isPk) {
      line += ' NOT NULL';
    }

    colLines.push(line);
  }

  if (pkColumns.length > 0) {
    colLines.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
  }

  sql += colLines.join(',\n') + '\n);\n\n';
}

// Add comments & documentation metadata
sql += `
-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_milk_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
`;

const dest = path.join(process.cwd(), 'supabase', 'schema.sql');
fs.writeFileSync(dest, sql, 'utf8');
console.log('Successfully generated SQL schema at:', dest);
