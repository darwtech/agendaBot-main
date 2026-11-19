import { migrateAll } from './migrations.js';
import { pool } from './pool.js';

migrateAll()
  .then(() => console.log('Migraciones al día.'))
  .catch((err) => {
    console.error('Error al migrar:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
