# Contributing to PSO Payment SDK

Thank you for your interest in contributing to the PSO Payment SDK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `develop`
4. **Make your changes**
5. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Git

### Installation

1. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/pso-sdk-test.git
cd pso-sdk-test
```

2. Add upstream remote:
```bash
git remote add upstream https://github.com/abefimrs/pso-sdk-test.git
```

3. Install SDK dependencies:
```bash
cd sdk
npm install
```

4. Build the SDK:
```bash
npm run build
```

5. Run tests:
```bash
npm test
```

## Development Workflow

### Creating a Feature Branch

```bash
# Update your fork
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write code** following our coding standards
2. **Write tests** for new features
3. **Update documentation** as needed
4. **Run tests** to ensure nothing breaks
5. **Run linter** to check code style

```bash
# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Build to ensure it works
npm run build
```

### Committing Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "feat: add support for recurring payments"
git commit -m "fix: correct order ID generation logic"
git commit -m "docs: update README with new examples"

# Commit message format
# type: description
#
# Types:
# - feat: New feature
# - fix: Bug fix
# - docs: Documentation changes
# - style: Code style changes (formatting)
# - refactor: Code refactoring
# - test: Adding or updating tests
# - chore: Maintenance tasks
```

## Coding Standards

### JavaScript Style

- Follow ES6+ standards
- Use modern JavaScript features
- Follow the existing code style
- ESLint configuration enforces our standards

### Code Quality

- **No console.log** in production code (use console.warn or console.error if needed)
- **Handle errors** properly with try-catch blocks
- **Validate inputs** for all public methods
- **Add JSDoc comments** for public APIs
- **Keep functions small** and focused
- **Use meaningful variable names**

### Example

```javascript
/**
 * Create a payment order
 * 
 * @param {Object} options - Payment options
 * @param {number} options.amount - Payment amount
 * @param {string} options.currency - Currency code
 * @returns {Promise<Object>} Payment order response
 * @throws {Error} If options are invalid
 */
async createPaymentOrder(options) {
  // Validate inputs
  if (!options.amount || options.amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  // Implementation
  try {
    const response = await fetch(url, { /* ... */ });
    return await response.json();
  } catch (error) {
    console.error('[PSO SDK] Order creation failed:', error);
    throw error;
  }
}
```

## Testing

### Writing Tests

- Write tests for all new features
- Update tests when modifying existing features
- Maintain at least 70% code coverage
- Use descriptive test names

### Test Structure

```javascript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    test('should do something specific', () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- payment-sdk.test.js
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Code builds successfully: `npm run build`
- [ ] Coverage is maintained or improved
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with `develop`

### Submitting a PR

1. **Push your branch** to your fork:
```bash
git push origin feature/your-feature-name
```

2. **Open a Pull Request** on GitHub:
   - Target the `develop` branch
   - Use a clear, descriptive title
   - Fill out the PR template
   - Reference related issues

3. **PR Title Format**:
```
feat: Add support for webhooks
fix: Correct amount validation
docs: Update integration guide
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Code Review

- Address all review comments
- Be open to feedback
- Make requested changes promptly
- Ask questions if unclear

### After Approval

Once approved, a maintainer will merge your PR. Thank you for your contribution!

## Release Process

Releases are handled by maintainers:

1. **Version bump** in package.json
2. **Update CHANGELOG.md**
3. **Create git tag** (e.g., v1.1.0)
4. **Push tag** to trigger CI/CD
5. **Create GitHub release**
6. **NPM publish** (automated)

For detailed release process, see [docs/PUBLISHING-GUIDE.md](docs/PUBLISHING-GUIDE.md).

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/abefimrs/pso-sdk-test/discussions)
- **Bug reports**: Open a [GitHub Issue](https://github.com/abefimrs/pso-sdk-test/issues)
- **Feature requests**: Open a [GitHub Issue](https://github.com/abefimrs/pso-sdk-test/issues) with the `enhancement` label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- Release notes
- CONTRIBUTORS.md file
- Project README

Thank you for contributing to PSO Payment SDK! 🎉
