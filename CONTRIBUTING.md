# Contributing

Create focused changes, update affected documentation, and run `pnpm check` before requesting
review. CI is the authoritative quality gate and must pass formatting, linting, type checking, all
test layers, and the build.

Keep domain and application code independent of Discord, HTTP, configuration, and logger
implementations. Never commit secrets. Changes to public operational contracts require explicit
review and a migration plan when breaking.
