import "server-only";

/**
 * Momentul curent, citit explicit pe server.
 *
 * Regula de puritate a React spune, pe bună dreptate, că randarea trebuie să
 * dea același rezultat pentru aceleași intrări — iar `Date.now()` chemat direct
 * în corpul unei componente încalcă asta.
 *
 * Paginile private sunt însă `force-dynamic` și se randează la fiecare cerere:
 * pentru ele ceasul ESTE o intrare, la fel ca sesiunea. Funcția de aici face
 * dependența vizibilă și o ține într-un singur loc, în loc s-o împrăștie prin
 * componente sub forma unor apeluri care par nevinovate.
 */
export function acum(): Date {
  return new Date();
}
