declare module "cloudflare:test" {
  // Module augmentation: the bindings visible to tests are the Worker's Env.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an interface (not a type alias) is required to merge into ProvidedEnv
  interface ProvidedEnv extends Env {}
}
