# Contributing to node-dynamixel

Thank you for your interest in contributing to the node-dynamixel library! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/node-dynamixel.git
   cd node-dynamixel
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

## 🧪 Testing

### Test Structure
- **Unit Tests**: `tests/unit/` - Test individual components in isolation
- **Integration Tests**: `tests/integration/` - Test component interactions
- **Test Fixtures**: `tests/fixtures/` - Shared test data and examples

### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Requirements
- All tests must pass before submitting a PR
- New features must include comprehensive tests
- Aim for >80% code coverage
- Tests should not require physical hardware (use mocks)

## 🔄 CI/CD Workflows

### Continuous Integration (`.github/workflows/ci.yml`)
**Triggers**: Push to `main`/`develop`, Pull Requests

**What it does**:
- Tests on Node.js 18.x, 20.x, and 22.x
- Runs unit and integration tests
- Generates coverage reports
- Uploads coverage to Codecov and Coveralls
- Validates package can be built

### Release & Publish (`.github/workflows/release.yml`)
**Triggers**: GitHub Release created

**What it does**:
- Runs full test suite
- Verifies package version matches release tag
- Publishes to npm registry
- Publishes to GitHub Packages
- Posts success comment on release

### Security & Dependencies (`.github/workflows/security.yml`)
**Triggers**: Weekly schedule, Push to `main`, Pull Requests

**What it does**:
- Runs npm security audit
- Reviews dependencies for vulnerabilities
- Performs CodeQL security analysis
- Checks license compatibility

## 📦 Release Process

### For Maintainers

1. **Update version** in `package.json`:
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md** with release notes

3. **Push changes**:
   ```bash
   git push origin main --tags
   ```

4. **Create GitHub Release**:
   - Go to GitHub → Releases → "Create a new release"
   - Select the version tag (e.g., `v1.0.1`)
   - Add release title and description
   - Click "Publish release"

5. **Automatic Publishing**:
   - GitHub Actions will automatically run tests
   - If tests pass, package will be published to npm
   - Package will also be published to GitHub Packages

### Version Guidelines
- **Patch** (`1.0.1`): Bug fixes, documentation updates
- **Minor** (`1.1.0`): New features, backwards compatible
- **Major** (`2.0.0`): Breaking changes

## 🛡️ Security

### Required Secrets
For the workflows to function properly, the following secrets must be configured in the repository:

- `NPM_TOKEN`: npm authentication token for publishing
- `CODECOV_TOKEN`: (optional) Codecov upload token for coverage reports

### Setting up NPM_TOKEN
1. Create an npm account and login
2. Generate an automation token: `npm token create --type=automation`
3. Add the token to GitHub repository secrets as `NPM_TOKEN`

## 📝 Code Style

### General Guidelines
- Use ES modules (`import`/`export`)
- Follow existing code style and patterns
- Add JSDoc comments for public APIs
- Use descriptive variable and function names
- Keep functions focused and small

### File Organization
```
src/
├── DynamixelController.js    # Main controller class
├── DynamixelDevice.js        # Individual device class
├── Protocol2.js              # DYNAMIXEL Protocol 2.0 implementation
├── U2D2Connection.js         # USB connection via U2D2
├── SerialConnection.js       # Serial port connection
├── constants.js              # Protocol constants
└── index.js                  # Main exports

tests/
├── unit/                     # Unit tests
├── integration/              # Integration tests
├── fixtures/                 # Test data and examples
└── README.md                 # Test documentation
```

## 🐛 Bug Reports

When reporting bugs, please include:
- Node.js version
- Operating system
- Hardware setup (U2D2, DYNAMIXEL models)
- Minimal code example that reproduces the issue
- Error messages and stack traces

## 💡 Feature Requests

For new features:
- Check existing issues to avoid duplicates
- Describe the use case and expected behavior
- Consider backwards compatibility
- Be willing to help implement or test

## 🤝 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write code following the style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add support for XM series motors"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **PR Review**:
   - All CI checks must pass
   - At least one maintainer review required
   - Address any feedback promptly

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new APIs
- Update examples if behavior changes
- Consider adding to the wiki for complex topics

## 🙏 Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- GitHub contributors list
- Special thanks for significant contributions

## 📞 Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact maintainers for security issues

Thank you for contributing to node-dynamixel! 🤖
