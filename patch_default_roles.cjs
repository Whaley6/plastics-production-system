const fs = require('fs');
let code = fs.readFileSync('src/pages/Roles.tsx', 'utf8');

const target = `  {
    id: 'worker',
    name: 'Worker',
    permissions: { workers: false, workers_readonly: false, workers_view_all: false, maintenance: false, maintenance_readonly: false, cnc: false, cnc_readonly: false, auxiliary: false, auxiliary_readonly: false, production: true, production_readonly: false, complaints: false, complaints_readonly: false, machines: true, machines_readonly: false, archive: false, archive_readonly: false, settings: false }
  }`;
const replacement = `  {
    id: 'worker',
    name: 'Worker',
    permissions: { workers: false, workers_readonly: true, workers_view_all: false, maintenance: false, maintenance_readonly: true, cnc: false, cnc_readonly: true, auxiliary: false, auxiliary_readonly: true, production: true, production_readonly: true, complaints: false, complaints_readonly: true, machines: true, machines_readonly: true, archive: false, archive_readonly: true, settings: false }
  }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/Roles.tsx', code);
  console.log("Success defaultRoles");
} else {
  // Maybe it doesn't have the readonly fields in the file yet? No, I patched it in patch_roles_interface.cjs
  // Let's just try to replace any worker role definition.
  const regex = /id:\s*'worker',\s*name:\s*'Worker',\s*permissions:\s*\{[^}]*\}/;
  if (regex.test(code)) {
    code = code.replace(regex, replacement.trim());
    fs.writeFileSync('src/pages/Roles.tsx', code);
    console.log("Success regex defaultRoles");
  } else {
    console.log("Failed to find worker role");
  }
}
