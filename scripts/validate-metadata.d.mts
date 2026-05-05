export type PackageRole = 'library' | 'cli';

export interface ActivePackageConfig {
  name: string;
  role: PackageRole;
  dir: string;
  requiredKeys: readonly string[];
}

export interface ValidationOptions {
  rootDir?: string;
  packageConfigs?: readonly ActivePackageConfig[];
}

export const ROOT_DIR: string;
export const ACTIVE_PACKAGES: readonly ActivePackageConfig[];

export function validatePackage(pkgConfig: ActivePackageConfig, options?: ValidationOptions): Promise<string[]>;

export function collectValidationErrors(options?: ValidationOptions): Promise<string[]>;
export function main(): Promise<void>;
