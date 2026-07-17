import { pathToFileURL } from 'node:url'

type RuntimeModule = Record<string, unknown>

export async function loadRuntimeModule(path: string): Promise<RuntimeModule> {
  return (await import(pathToFileURL(path).href)) as RuntimeModule
}
