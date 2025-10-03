# pnpm Environment Variable Limitations vs npm

## Key Differences from npm

### npm Behavior
- Automatically creates `npm_config_*` environment variables from package.json config field
- Dependency installation scripts can access these variables
- `package.json` config field translates to environment variables

### pnpm Behavior  
- Does NOT automatically create `npm_config_*` environment variables
- Does NOT support package.json config field for environment variable injection
- Requires explicit environment variable setting or `--config.` flags

## Official pnpm Documentation Evidence
From https://pnpm.io/pnpm-cli:
> "However, some dependencies may use the `npm_config_` environment variable, which is populated from the CLI options. In this case, you have the following options:
> - explicitly set the env variable: `npm_config_target_arch=x64 pnpm install`  
> - or force the unknown option with `--config.`: `pnpm install --config.target_arch=x64`"

This confirms pnpm requires manual intervention for `npm_config_*` variables.

## What Works in pnpm
- Environment variable interpolation in config files using `${NAME}` syntax (for reading)
- Direct environment variable setting: `ENV_VAR=value pnpm command`
- `.pnpmfile.cjs` hooks for programmatic environment variable setting
- `--config.` flags for one-off configuration

## What Doesn't Work in pnpm
- package.json config field automatic translation
- Automatic `npm_config_*` variable creation
- preinstall hook environment variable persistence to dependency scripts
- .npmrc environment variable injection for dependency scripts

## Design Philosophy
pnpm's approach is more secure and isolated - it doesn't automatically inject arbitrary environment variables into dependency installation processes. This is safer but requires explicit configuration for packages expecting npm's behavior.

## Workarounds
1. **Manual env vars**: `SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm i`
2. **Shell profile**: `export SHARP_IGNORE_GLOBAL_LIBVIPS=1`
3. **direnv**: `.envrc` file for automatic project-based env vars
4. **.pnpmfile.cjs**: Programmatic environment variable setting (best solution)