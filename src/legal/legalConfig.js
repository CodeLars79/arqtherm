/**
 * Datos del titular para el aviso legal y la política de privacidad (art. 10 LSSI-CE, art. 13 RGPD).
 *
 * Por decisión del titular, solo se publican el nombre del sitio, el titular y el correo de contacto.
 * Los campos opcionales con valor null no se muestran.
 */
export const LEGAL = {
  ownerName: 'Lars Sørensen',
  ownerActivity: 'Arquitecto, consultor y especialista en fachadas',
  taxId: null, // NIF / NIE
  address: null, // Domicilio postal completo
  email: 'laaars79@gmail.com', // Correo de contacto, también para privacidad
  professionalBody: null, // Colegio profesional y n.º de colegiado, si se desea indicar
  websiteName: 'Arqtherm',
  websiteUrl: 'https://www.arqtherm.com',
  hostingProvider: null, // Proveedor de alojamiento y país (p. ej. «Netlify, Inc. (EE. UU.)»)
  jurisdictionCity: 'Barcelona',
  lastUpdated: '2026-10-31'
};

/** Campos del titular que aún faltan. */
export function missingLegalFields(config = LEGAL) {
  return ['email'].filter((k) => !config[k]);
}
