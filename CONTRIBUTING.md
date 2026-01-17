# Contributing to Game Prototype Generator

First off, thank you for considering contributing to Game Prototype Generator! It's people like you that make this project better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- API keys for development (Anthropic, TRIPO, Blockade Labs)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**
```bash
git clone https://github.com/YOUR_USERNAME/game-prototype-generator.git
cd game-prototype-generator
```

3. **Add the original repository as upstream**
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/game-prototype-generator.git
```

4. **Install dependencies**
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

5. **Set up environment variables**
```bash
cp .env.example .env
# Add your API keys
```

## 💻 Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/drag-drop-editing`)
- `fix/` - Bug fixes (e.g., `fix/websocket-reconnection`)
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests

### Creating a New Feature

1. **Sync with upstream**
```bash
git checkout main
git pull upstream main
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes** and commit regularly
```bash
git add .
git commit -m "feat: add your feature description"
```

4. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

5. **Open a Pull Request**

## 🔄 Pull Request Process

### Before Submitting

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the CHANGELOG if applicable
5. Make sure your code follows the coding standards

### PR Requirements

- Clear title describing the change
- Description of what and why
- Link to related issues
- Screenshots for UI changes
- Test plan or testing notes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all data structures
- Avoid `any` type when possible
- Use meaningful variable names

### Backend (NestJS)

```typescript
// Use dependency injection
@Injectable()
export class MyService {
  constructor(private otherService: OtherService) {}
}

// Add JSDoc comments for public methods
/**
 * Description of what this method does
 * @param param - Description of parameter
 * @returns Description of return value
 */
async myMethod(param: string): Promise<Result> {
  // Implementation
}
```

### Frontend (React)

```typescript
// Use functional components with TypeScript
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // Component logic
}

// Use hooks for state management
const [state, setState] = useState<StateType>(initialValue);
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug in component
docs: update README
refactor: restructure agent code
test: add unit tests for service
chore: update dependencies
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

### Writing Tests

- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Write component tests for React components
- Aim for meaningful coverage, not just high numbers

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Include examples in complex functions
- Document interfaces and types

### Project Documentation

- Update README for new features
- Add guides for complex workflows
- Keep API documentation current

## 🐛 Reporting Bugs

### Before Reporting

1. Check existing issues
2. Try to reproduce with latest version
3. Gather relevant information

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: 
- Browser:
- Node version:
- Project version:

## Screenshots
If applicable
```

## 💡 Feature Requests

We love feature ideas! Please:

1. Check existing issues/discussions
2. Describe the use case
3. Explain the expected behavior
4. Consider implementation complexity

## 🙋 Getting Help

- Open a GitHub issue for bugs
- Start a discussion for questions
- Check existing documentation

---

Thank you for contributing! 🎉
