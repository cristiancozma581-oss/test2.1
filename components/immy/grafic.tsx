/**
 * Graficul cu bare (§41).
 *
 * SVG randat pe server, fără bibliotecă de grafice. La treizeci de puncte, o
 * dependență de câteva sute de kiloocteți ar costa mai mult decât aduce; iar
 * o diagramă randată pe server apare deodată cu pagina, nu după hidratare.
 *
 * Are și un tabel ascuns vizual (§57): fără el, un cititor de ecran nu are cum
 * să afle cifrele dintr-un desen.
 */
export function GraficBare({
  date,
  etichetaPrimar,
  etichetaSecundar,
}: {
  date: { eticheta: string; valoare: number; secundar?: number }[];
  etichetaPrimar: string;
  etichetaSecundar?: string;
}) {
  if (date.length === 0) {
    return <p className="text-sm text-muted-foreground">Non ci sono ancora dati.</p>;
  }

  const maxim = Math.max(1, ...date.map((d) => d.valoare));
  const latimeBara = 100 / date.length;

  return (
    <figure>
      <svg
        viewBox="0 0 100 34"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`${etichetaPrimar} per giorno`}
      >
        {date.map((d, i) => {
          const inaltime = (d.valoare / maxim) * 30;
          const inaltimeSecundar = ((d.secundar ?? 0) / maxim) * 30;
          const x = i * latimeBara;
          return (
            <g key={d.eticheta + i}>
              <rect
                x={x + latimeBara * 0.15}
                y={31 - inaltime}
                width={latimeBara * 0.7}
                height={inaltime}
                fill="var(--primary)"
                rx="0.4"
              />
              {inaltimeSecundar > 0 ? (
                <rect
                  x={x + latimeBara * 0.15}
                  y={31 - inaltimeSecundar}
                  width={latimeBara * 0.7}
                  height={inaltimeSecundar}
                  fill="var(--destructive)"
                  rx="0.4"
                />
              ) : null}
            </g>
          );
        })}
        <line x1="0" y1="31" x2="100" y2="31" stroke="var(--border)" strokeWidth="0.3" />
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary" />
          {etichetaPrimar}
        </span>
        {etichetaSecundar ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-destructive" />
            {etichetaSecundar}
          </span>
        ) : null}
        <span>
          {date[0]?.eticheta} → {date[date.length - 1]?.eticheta}
        </span>
      </figcaption>

      <table className="doar-cititor-ecran">
        <caption>{etichetaPrimar} per giorno</caption>
        <thead>
          <tr>
            <th scope="col">Giorno</th>
            <th scope="col">{etichetaPrimar}</th>
            {etichetaSecundar ? <th scope="col">{etichetaSecundar}</th> : null}
          </tr>
        </thead>
        <tbody>
          {date.map((d, i) => (
            <tr key={d.eticheta + i}>
              <th scope="row">{d.eticheta}</th>
              <td>{d.valoare}</td>
              {etichetaSecundar ? <td>{d.secundar ?? 0}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
