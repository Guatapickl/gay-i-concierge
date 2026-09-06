import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default [
  ...nextVitals, ...nextTypescript,
  { ignores: ['.next/**','.next-audit/**','functions/lib/**','docs/**','Gayiclub.com redesign review/**','public/**'] },
  { rules: { 'no-console':['warn',{allow:['warn','error']}], 'consistent-return':'warn', 'no-redeclare':'error', 'react-hooks/set-state-in-effect':'warn', 'react-hooks/purity':'warn' } },
  // Existing test doubles intentionally use permissive provider-shaped mocks.
  {files:['tests/**'],rules:{'@typescript-eslint/no-explicit-any':'warn'}},
];
