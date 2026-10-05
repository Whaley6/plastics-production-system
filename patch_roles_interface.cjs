const fs = require('fs');
let code = fs.readFileSync('src/pages/Roles.tsx', 'utf8');

const interfaceTarget = `export interface Role {
  id: string;
  name: string;
  permissions: {
    workers: boolean;
    workers_view_all?: boolean;
    workers_view_titles?: string[];
    maintenance: boolean;
    cnc: boolean;
    auxiliary: boolean;
    production: boolean;
    complaints: boolean;
    machines: boolean;
    archive: boolean;
    settings: boolean;
  };
}`;

const interfaceReplacement = `export interface Role {
  id: string;
  name: string;
  permissions: {
    workers: boolean;
    workers_readonly?: boolean;
    workers_view_all?: boolean;
    workers_view_titles?: string[];
    maintenance: boolean;
    maintenance_readonly?: boolean;
    cnc: boolean;
    cnc_readonly?: boolean;
    auxiliary: boolean;
    auxiliary_readonly?: boolean;
    production: boolean;
    production_readonly?: boolean;
    complaints: boolean;
    complaints_readonly?: boolean;
    machines: boolean;
    machines_readonly?: boolean;
    archive: boolean;
    archive_readonly?: boolean;
    settings: boolean;
  };
}`;

code = code.replace(interfaceTarget, interfaceReplacement);

const newRoleTarget = `permissions: { workers: false, workers_view_all: false, maintenance: false, cnc: false, auxiliary: false, production: false, complaints: false, machines: false, archive: false, settings: false }`;
const newRoleReplacement = `permissions: { workers: false, workers_readonly: false, workers_view_all: false, maintenance: false, maintenance_readonly: false, cnc: false, cnc_readonly: false, auxiliary: false, auxiliary_readonly: false, production: false, production_readonly: false, complaints: false, complaints_readonly: false, machines: false, machines_readonly: false, archive: false, archive_readonly: false, settings: false }`;
code = code.replace(newRoleTarget, newRoleReplacement);

fs.writeFileSync('src/pages/Roles.tsx', code);
