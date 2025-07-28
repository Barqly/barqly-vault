# Developer Guide – Barqly Vault

## Prerequisites

- **Node.js** v22.17.0+
- **Rust** 1.87.0+
- **Tauri CLI** v2.x
- (Optional) [See full requirements in `zenai/validation_checklist.md`](zenai/validation_checklist.md)

---

## Running the App

### Development Mode

Run the app with hot reload and devtools (default config):

```sh
cargo tauri dev
```

### UAT Mode (User Acceptance Testing)

Run the app with UAT config (devtools enabled, strict CSP):

```sh
cargo tauri dev --config src-tauri/tauri.uat.conf.json
```

### Production Build

Build the app for production (devtools disabled, strictest security):

```sh
cargo tauri build --config src-tauri/tauri.prod.conf.json
```

---

## Building the Frontend Only

Build the React frontend for production:

```sh
npm run build --prefix src-ui
```

---

## Environment-Specific Configs

- **Default/dev:** `src-tauri/tauri.conf.json`
- **UAT:** `src-tauri/tauri.uat.conf.json`
- **Production:** `src-tauri/tauri.prod.conf.json`

Use the `--config` flag to select the appropriate config at build or run time. Never manually toggle config values for different environments.

---

## Security & Validation

- Always validate security posture in a production build (CSP, capabilities, etc.).
- See [validation_checklist.md](zenai/validation_checklist.md) for manual and automated security checks.
- See [Validation System & Pre-commit Hook](docs/VALIDATION_SYSTEM.md) for local validation and commit hygiene.

---

## Troubleshooting

- **Error: Unable to find your web assets...**
  - Make sure `frontendDist` in your config matches the actual build output directory (usually `../src-ui/dist` from `src-tauri`).

- **CSP not enforced in dev:**
  - Some security features (like CSP) may not be enforced in dev mode. Always test in a production build for true security validation.

- **Devtools not available in prod:**
  - By default, devtools are disabled in production for security. Use the UAT config if you need devtools for testing.

---

## Project Rituals & References

- [ZenAI Programming Rituals](zenai/README.md)
- [Project Plan](project-plan.md)
- [Validation Checklist](zenai/validation_checklist.md)
- [Milestone 0 Sprint Planning](zenai/milestone_0_sprint_planning.md)
- [Validation System](docs/VALIDATION_SYSTEM.md)

---

_Keep this guide up to date as the project evolves!_

---

If you find a better way or spot an error in our onboarding or validation process, **please update the docs for the next engineer!**
