import { findWorkspacePackages } from './package-discovery'
import { verifyPackage } from './verify-package'

export async function verifyPackages(): Promise<void> {
  const packages = findWorkspacePackages('packages')

  for (const packagePath of packages) {
    await verifyPackage({
      packagePath
    })
  }
}
