/**
 * Negocio actual, tomado de la URL /n/<slug>/... al cargar la página.
 * null = sin negocio (modo demo local, o la portada en modo API).
 */
export const tenantSlug: string | null =
  typeof window === 'undefined'
    ? null
    : (/^\/n\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/.exec(window.location.pathname)?.[1] ?? null);

/** Prefijo de rutas del router: todas las rutas internas (/admin, /) cuelgan de aquí. */
export const routerBasename = tenantSlug ? `/n/${tenantSlug}` : '/';
