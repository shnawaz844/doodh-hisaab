import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'supabase-schema-details.json'), 'utf8'));

let output = '';
for (const tableName of Object.keys(data.definitions)) {
  output += `=== TABLE: ${tableName} ===\n`;
  const def = data.definitions[tableName];
  for (const propName of Object.keys(def.properties)) {
    const prop = def.properties[propName];
    output += `  - ${propName}: type=${prop.type}, format=${prop.format}, default=${prop.default}, desc=${prop.description ? prop.description.replace(/\n/g, ' ') : ''}\n`;
  }
}

fs.writeFileSync(path.join(process.cwd(), 'scripts', 'supabase-schema-inspection.txt'), output, 'utf8');
console.log('Saved inspection output.');
