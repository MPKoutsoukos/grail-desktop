# Contributing to grail

Thank you for wanting to help. Issues and pull requests are welcome.

## Before you send code

grail is free software under the [GNU GPL v3](LICENSE), and its maker, MPKoutsoukos, keeps the right to also
offer it under other terms (for example in an app store, or in a future version). So that your contribution can
be part of both, sending a pull request means you agree to the following:

1. You wrote the contribution yourself, or have the right to submit it, and it may be published under the GPL v3.
2. You license your contribution to the public under the GNU GPL v3, like the rest of the code.
3. You also grant MPKoutsoukos a perpetual, worldwide, non-exclusive, royalty-free and irrevocable licence to
   use, change and distribute your contribution under any licence, including licences other than the GPL.
4. You keep the copyright on your contribution; this only gives the permissions above.

If you can't agree to point 3, please say so in the pull request before it's merged.

## How

- Changes go to the `dev` branch. They move up through `qa` and `staging` to `main` (prod).
- Keep pull requests small and focused, and describe what you changed and why.
- Run the checks first: `npx tsc -p tsconfig.app.json --noEmit` and `npx eslint src`.
- Changes to the shared core (note format, vault, tags, themes) belong in the [grail](https://github.com/MPKoutsoukos/grail) repo; this one picks them up through the `grail` submodule.
- The grail name and look are covered by [TRADEMARKS.md](TRADEMARKS.md).
