# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-14

### Added
- Complete NPM package structure with proper metadata
- PaymentPopup class for modal/iframe handling with overlay support
- Comprehensive TypeScript definitions (`sdk/types/index.d.ts`)
- Jest testing infrastructure with 70% coverage threshold
- ESLint configuration for code quality and consistency
- Webpack build pipeline with Babel transpilation for ES6+ support
- Production and development build modes
- CSS extraction with MiniCssExtractPlugin
- Source maps for debugging
- Terser minification with console.log removal in production
- Performance budgets (max 512KB)
- CI/CD workflows using GitHub Actions
  - Build and test workflow for Node.js 14.x, 16.x, 18.x, 20.x
  - Bundle size checking (max 50KB)
  - Code coverage reporting
- NPM publishing automation via GitHub releases
- Complete documentation
  - NPM Publishing Guide (`docs/PUBLISHING-GUIDE.md`)
  - Contributing Guidelines (`CONTRIBUTING.md`)
  - This Changelog
- MIT License
- `.npmignore` for clean NPM package
- Style mock for Jest testing
- Entry point file (`sdk/src/index.js`)
- Enhanced package.json with:
  - Multiple entry points (main, module, unpkg, jsdelivr, types)
  - Comprehensive scripts (build, test, lint, watch)
  - Repository and bug tracking links
  - Keywords for NPM discoverability
  - Node.js engine requirements (>=14.0.0)
  - Browserslist configuration

### Changed
- Enhanced webpack configuration with production optimizations
- Improved package.json for NPM publishing readiness
- Updated build scripts for better developer experience
- Modularized SDK with proper ES6 imports/exports

### Security
- HTTPS enforcement in production mode
- Secure postMessage handling in popup
- Input validation and sanitization
- XSS protection in payment forms
- Secure credential management through backend proxy

### Developer Experience
- Hot reload support in development mode
- Comprehensive test coverage
- Automated linting
- CI/CD automation
- Clear contribution guidelines

## [Unreleased]

### Planned
- Additional payment method support
- Webhook signature verification helpers
- Enhanced error handling and reporting
- More comprehensive examples
- Support for recurring payments
- Mobile SDK (React Native)

---

[1.0.0]: https://github.com/abefimrs/pso-sdk-test/releases/tag/v1.0.0
