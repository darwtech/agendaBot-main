// Gestión de negocios desde la terminal:
//   npm run tenant:create -- <slug> "<nombre>" <tipo> <correo> "<nombre del dueño>" [contraseña] [zona-horaria]
//   npm run tenant:user   -- <slug> <correo> "<nombre>" [contraseña]   (crea usuario o restablece contraseña)
//   npm run tenant:list
// Sin contraseña se genera una segura y se muestra una sola vez.
import { pool } from '../db/pool.js';
import { userUpsertSchema } from '../modules/auth/auth.schema.js';
import { createTenant, listTenants, setTenantUser } from '../modules/platform/tenants.repository.js';
import { BUSINESS_TYPES, slugSchema, tenantCreateSchema } from '../modules/platform/tenants.schema.js';
import { PLATFORM_ACTOR_ID } from '../shared/auth.js';
import { parse } from '../shared/http.js';

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case 'create': {
      const [slug, name, businessType, email, fullName, password, timezone] = args;
      const data = parse(tenantCreateSchema, {
        slug,
        name,
        businessType,
        timezone,
        owner: { email, fullName, password: password || undefined },
      });
      const t = await createTenant(data, PLATFORM_ACTOR_ID);
      console.log(`Negocio creado: ${t.slug} (schema ${t.schema})`);
      console.log(`Chat:  /n/${t.slug}`);
      console.log(`Panel: /n/${t.slug}/admin  → usuario ${t.owner.email}`);
      if (t.owner.password) console.log(`Contraseña generada (guárdala, no se vuelve a mostrar): ${t.owner.password}`);
      break;
    }
    case 'user': {
      const slug = parse(slugSchema, args[0]);
      const user = parse(userUpsertSchema, { email: args[1], fullName: args[2], password: args[3] || undefined });
      const r = await setTenantUser(slug, user, PLATFORM_ACTOR_ID);
      console.log(`${r.created ? 'Usuario creado' : 'Contraseña actualizada (sesiones cerradas)'}: ${r.email} en ${slug}`);
      if (r.password) console.log(`Contraseña generada (guárdala, no se vuelve a mostrar): ${r.password}`);
      break;
    }
    case 'list':
      console.table(
        (await listTenants()).map((t) => ({
          slug: t.slug,
          nombre: t.name,
          tipo: t.businessType,
          schema: t.schema,
          estado: t.estado,
        }))
      );
      break;
    default:
      console.log('Comandos:');
      console.log('  create <slug> "<nombre>" <tipo> <correo> "<dueño>" [contraseña] [zona]');
      console.log('  user <slug> <correo> "<nombre>" [contraseña]');
      console.log('  list');
      console.log(`Tipos: ${BUSINESS_TYPES.join(', ')}`);
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Error:', err.message, err.details ? JSON.stringify(err.details) : '');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
