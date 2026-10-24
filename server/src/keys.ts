import type { Advisory, Package } from './types.js';

// Stable id for one (package version, advisory) pair; used to attach AI verdicts and reviewer decisions.
export const findingKey = (pkg: Pick<Package, 'name' | 'version'>, advisory: Pick<Advisory, 'id'>) =>
  `${pkg.name}@${pkg.version}#${advisory.id}`;
