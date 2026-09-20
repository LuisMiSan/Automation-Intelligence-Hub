#!/usr/bin/env node
/**
 * Prueba firestore.rules contra el simulador oficial de Firebase (firebaserules API).
 * NO escribe nada en la base de datos: sube las reglas del repo y simula peticiones.
 *
 * Los datos del caso 1 son EL DOCUMENTO QUE ESCRIBE App.tsx (ver addDoc de 'leads'):
 * si alguien cambia los campos alli y las reglas dejan de aceptarlos, este test lo caza.
 *
 * Requisitos: gcloud autenticado con acceso al proyecto (`gcloud auth login`).
 * Uso: node scripts/test-firestore-rules.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PROJECT = 'radar-local-491000';
const DB = '/databases/ai-studio-2f390961-8b38-41a6-9805-b66df1477234/documents';
const PATH = `${DB}/leads/lead1`;

const leadOk = {
  name: 'Ana Perez',
  email: 'ana@empresa.es',
  company: 'Empresa SL',
  businessDescription: 'Taller de reparacion',
  plan: {},
  sources: [],
  timestamp: 1758400000000,
  status: 'new',
  notes: '',
};
const sinStatus = { ...leadOk };
delete sinStatus.status;

const admin = { uid: 'u1', token: { email: 'luismigsm@gmail.com', email_verified: true } };
const intruso = { uid: 'u2', token: { email: 'intruso@gmail.com', email_verified: true } };

const casos = [
  ['crear lead valido SIN login', 'ALLOW', { method: 'create', auth: null, resource: { data: leadOk } }],
  ['crear lead sin status', 'DENY', { method: 'create', auth: null, resource: { data: sinStatus } }],
  ['crear lead con email invalido', 'DENY', { method: 'create', auth: null, resource: { data: { ...leadOk, email: 'no-es-email' } } }],
  ['leer leads sin login', 'DENY', { method: 'get', auth: null }],
  ['leer leads como intruso', 'DENY', { method: 'get', auth: intruso }],
  ['leer leads como admin', 'ALLOW', { method: 'get', auth: admin }],
  ['borrar lead como intruso', 'DENY', { method: 'delete', auth: intruso }],
];

const body = {
  source: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] },
  testSuite: { testCases: casos.map(([, expectation, request]) => ({ expectation, request: { path: PATH, ...request } })) },
};

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': PROJECT,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});
const json = await res.json();

// Nota: se usa process.exitCode y NO process.exit(). En Windows, salir a la fuerza
// justo despues de un fetch aborta Node con "Assertion failed: !(handle->flags &
// UV_HANDLE_CLOSING)" y devuelve 127 aunque el test haya ido bien.
if (json.error) {
  console.error(`ERROR ${json.error.code}: ${json.error.message}`);
  process.exitCode = 1;
}

let fallos = 0;
(json.testResults || []).forEach((r, i) => {
  const [desc, esperado] = casos[i];
  const ok = r.state === 'SUCCESS';
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${desc} (esperado ${esperado})`);
});
(json.issues || []).forEach((x) => console.log(`ISSUE ${x.severity}: ${x.description}`));

const total = (json.testResults || []).length;
console.log(`\n${total - fallos}/${total} correctos`);
if (fallos || !total) process.exitCode = 1;
