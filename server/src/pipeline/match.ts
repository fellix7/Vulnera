import type { Advisory, Package } from '../types.js';
import { DETAIL_CONCURRENCY, getAdvisoryOrNull, mapLimit, queryVersions } from './osv.js';

/** One entry per (package version, advisory). Withdrawn advisories are skipped. */
export async function matchPackages(pkgs: Package[]): Promise<{ pkg: Package; advisory: Advisory }[]> {
  // Dedupe by name@version, keeping the first Package seen.
  const unique = [...new Map(pkgs.map((p) => [`${p.name}@${p.version}`, p])).values()];
  const idLists = await queryVersions(unique);

  const jobs = unique.flatMap((pkg, i) => idLists[i]!.map((id) => ({ pkg, id })));
  const advisories = await mapLimit(jobs, DETAIL_CONCURRENCY, (j) => getAdvisoryOrNull(j.id, j.pkg.name));

  const out: { pkg: Package; advisory: Advisory }[] = [];
  jobs.forEach((j, i) => {
    const advisory = advisories[i];
    if (advisory) out.push({ pkg: j.pkg, advisory });
  });
  return out;
}
