# NPM Publishing Guide for PSO Payment SDK

This guide covers everything you need to know about publishing the PSO Payment SDK to NPM.

## Prerequisites

Before publishing to NPM, ensure you have:

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **Two-Factor Authentication (2FA)**: Enable 2FA on your NPM account for security
3. **Organization Setup** (Optional): Create `@pso` organization on NPM for scoped packages
4. **NPM Access Token**: Generate an automation token for CI/CD
5. **Repository Access**: Maintainer access to the GitHub repository

## Manual Publishing Process

### 1. Pre-Publishing Checklist

Before publishing, verify:

- [ ] All tests pass: `npm test`
- [ ] Code lints without errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Bundle size is acceptable (< 50KB)
- [ ] Version number is updated in `package.json`
- [ ] `CHANGELOG.md` is updated with release notes
- [ ] Documentation is up to date
- [ ] TypeScript definitions are complete

### 2. Version Update

Follow [Semantic Versioning](https://semver.org/):

```bash
# Patch release (bug fixes): 1.0.0 -> 1.0.1
npm version patch

# Minor release (new features, backward compatible): 1.0.0 -> 1.1.0
npm version minor

# Major release (breaking changes): 1.0.0 -> 2.0.0
npm version major
```

### 3. Build the Package

```bash
cd sdk
npm install
npm run build
```

### 4. Test the Package Locally

Test the package before publishing:

```bash
# Create a tarball
npm pack

# This creates a file like: pso-payment-sdk-1.0.0.tgz
# Install it in a test project:
cd /path/to/test-project
npm install /path/to/sdk/pso-payment-sdk-1.0.0.tgz
```

### 5. Publish to NPM

```bash
# Login to NPM (one-time setup)
npm login

# Publish the package
npm publish --access public
```

For scoped packages (`@pso/payment-sdk`), you must use `--access public` unless you have a paid NPM account.

### 6. Verify Publication

After publishing:

```bash
# Check the package page
npm info @pso/payment-sdk

# Install in a test project
npm install @pso/payment-sdk
```

## Automated Publishing via GitHub Actions

The repository includes automated publishing workflows.

### Setup

1. **Generate NPM Token**:
   - Go to npmjs.com → Account Settings → Access Tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. **Add to GitHub Secrets**:
   - Go to GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your NPM token

### Publishing Flow

1. **Merge changes to main branch**
2. **Create a GitHub Release**:
   - Go to GitHub → Releases → "Draft a new release"
   - Create a new tag (e.g., `v1.0.0`)
   - Fill in release title and notes
   - Click "Publish release"

3. **Automated workflow runs**:
   - Checks out code
   - Installs dependencies
   - Runs tests
   - Builds the SDK
   - Publishes to NPM
   - Uploads build artifacts to GitHub release

## Version Management

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., removed features, API changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Examples:
- `1.0.0` → `1.0.1`: Bug fix
- `1.0.0` → `1.1.0`: New feature
- `1.0.0` → `2.0.0`: Breaking change

### Pre-release Versions

For beta/alpha releases:

```bash
# Alpha release
npm version prerelease --preid=alpha
# Example: 1.0.0 -> 1.0.1-alpha.0

# Beta release
npm version prerelease --preid=beta
# Example: 1.0.0 -> 1.0.1-beta.0

# Publish with beta tag
npm publish --tag beta
```

Install pre-release:
```bash
npm install @pso/payment-sdk@beta
```

## Publishing Checklist

Before each release:

- [ ] Update version in `sdk/package.json`
- [ ] Update `CHANGELOG.md` with changes
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Build production bundle: `npm run build`
- [ ] Check bundle size (should be < 50KB)
- [ ] Test locally with `npm pack` and install
- [ ] Review TypeScript definitions
- [ ] Update documentation if needed
- [ ] Commit all changes
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Create GitHub release
- [ ] Verify NPM publication
- [ ] Test installation: `npm install @pso/payment-sdk@latest`
- [ ] Announce release

## Post-Publishing Verification

After publishing:

```bash
# 1. Check package info
npm info @pso/payment-sdk

# 2. Check unpkg CDN
# Visit: https://unpkg.com/@pso/payment-sdk@latest/

# 3. Check jsDelivr CDN
# Visit: https://cdn.jsdelivr.net/npm/@pso/payment-sdk@latest/

# 4. Install and test
mkdir /tmp/test-sdk && cd /tmp/test-sdk
npm init -y
npm install @pso/payment-sdk
```

## Troubleshooting

### Common Errors

#### 1. "You must be logged in to publish packages"

```bash
npm login
# Enter username, password, and email
# Enter OTP if 2FA is enabled
```

#### 2. "You do not have permission to publish"

- Check you're a member of the `@pso` organization
- Verify organization access settings
- Ensure `--access public` flag is used

#### 3. "Version X.X.X already exists"

- You cannot republish the same version
- Increment version: `npm version patch`

#### 4. "Package name too similar to existing package"

- Check if package name is available: `npm info @pso/payment-sdk`
- Use a different name if needed

#### 5. "npm ERR! 402 Payment Required"

- Scoped packages require paid account OR `--access public` flag
- Solution: `npm publish --access public`

### Unpublishing

⚠️ **Warning**: Unpublishing is discouraged and has restrictions.

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @pso/payment-sdk@1.0.0

# Deprecate instead (recommended)
npm deprecate @pso/payment-sdk@1.0.0 "This version has a critical bug. Please upgrade to 1.0.1"
```

## Best Practices

1. **Never publish directly from local machine** for production releases
   - Use GitHub Actions for consistency

2. **Always test before publishing**
   - Run full test suite
   - Test in a real project using `npm pack`

3. **Use Git tags for versions**
   - Makes it easy to track releases
   - Enables rollback if needed

4. **Document all changes**
   - Keep `CHANGELOG.md` updated
   - Include migration guides for breaking changes

5. **Use npm version commands**
   - Automatically updates package.json
   - Creates git tags
   - Updates package-lock.json

6. **Security**
   - Never commit NPM tokens
   - Use automation tokens for CI/CD
   - Enable 2FA on NPM account

7. **Deprecation over unpublishing**
   - Unpublishing breaks dependent projects
   - Use deprecation warnings instead

## CDN Setup

After publishing, your package is automatically available on CDNs:

### unpkg

```html
<script src="https://unpkg.com/@pso/payment-sdk@1.0.0/dist/pso-sdk.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@pso/payment-sdk@1.0.0/dist/pso-sdk.css">
```

### jsDelivr

```html
<script src="https://cdn.jsdelivr.net/npm/@pso/payment-sdk@1.0.0/dist/pso-sdk.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@pso/payment-sdk@1.0.0/dist/pso-sdk.css">
```

### Always Use Specific Versions in Production

```html
<!-- ❌ Bad: Uses latest version (can break unexpectedly) -->
<script src="https://unpkg.com/@pso/payment-sdk"></script>

<!-- ✅ Good: Uses specific version -->
<script src="https://unpkg.com/@pso/payment-sdk@1.0.0"></script>
```

## Support

For issues with publishing:
- NPM support: https://www.npmjs.com/support
- GitHub issues: https://github.com/abefimrs/pso-sdk-test/issues
- Documentation: https://docs.npmjs.com/

## References

- [NPM Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions for NPM](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
