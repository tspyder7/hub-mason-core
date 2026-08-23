# hub-mason-core

Core utilities, helpers, types, and common modules shared across the Hub Mason ecosystem.

## Overview

`hub-mason-core` is the shared foundation for Hub Mason projects. It provides reusable functionality that can be consumed by components such as:

* `hub-mason-portal`
* `hub-mason-engine`

The package centralizes common functionality to prevent duplication and keep shared behavior consistent across the Hub Mason ecosystem.

## Installation

- Using `npm`

```bash
npm install @hub-mason/core
```

- Using `bun`

```bash
bun add @hub-mason/core
```

- Using `pnpm`

```bash
pnpm add @hub-mason/core
```

- Using `yarn`

```bash
yarn add @hub-mason/core
```

## Usage

Import the required modules from `@hub-mason/core`:

```ts
import { ... } from "@hub-mason/core";
```

## What Belongs Here

Code should be added to this package when it is:

* Shared across multiple Hub Mason projects
* Independent of a specific application or workflow
* Stable and reusable
* A common utility, helper, type, or foundational module

Application-specific business logic should remain within the consuming project.

## License

See [LICENSE](LICENSE) for license information.
