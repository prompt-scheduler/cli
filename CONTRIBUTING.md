# 🤝 Contributing to Prompt Scheduler

Thank you for your interest in contributing to Prompt Scheduler! We welcome contributions from the community and are excited to work with you to make this AI agent automation tool even better.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a new branch** for your feature or fix
4. **Make your changes** following our guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request** with a clear description

## 📋 Development Setup

### Prerequisites
- Node.js 18+ 
- npm 9+
- Git
- tmux (for testing automation features)

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/cli.git
cd cli

# 2. Install dependencies
npm install

# 2.5. Set up configuration
cp prompts/prompts.jsonl.sample prompts/prompts.jsonl
# Edit prompts/prompts.jsonl with your test tmux session path

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Make your changes
# Edit files in src/, add tests, update documentation

# 5. Test your changes
npm run build
npm run help
tsx src/claude-schedule.ts status

# 6. Commit and push
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

## 🎯 Types of Contributions

We welcome various types of contributions:

### 🐛 Bug Fixes
- Fix issues with existing functionality
- Improve error handling
- Address performance problems

### ✨ New Features
- New command line options
- Additional AI platform integrations
- Enhanced scheduling capabilities
- Improved user experience

### 📚 Documentation
- README improvements
- Code comments and JSDoc
- Wiki articles and tutorials
- Translation to other languages

### 🧪 Testing
- Unit tests for new features
- Integration tests
- Performance benchmarks
- Bug reproduction cases

### 🔧 Maintenance
- Code refactoring
- Dependency updates
- Build process improvements
- CI/CD enhancements

## 📝 Code Guidelines

### TypeScript Style
- Use TypeScript strictly - no `any` types
- Follow existing code patterns and conventions
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

```typescript
// Good
interface PromptExecutionOptions {
  skipUsageLimitCheck: boolean;
  timeoutMs?: number;
}

/**
 * Executes a prompt with the specified options
 * @param prompt - The prompt configuration to execute
 * @param options - Execution options
 * @returns Promise that resolves when execution completes
 */
async function executePrompt(
  prompt: PromptData, 
  options: PromptExecutionOptions
): Promise<void> {
  // Implementation
}
```

### File Organization
- Keep files focused and cohesive
- Use clear, descriptive file names
- Group related functionality together
- Maintain consistent imports/exports

### Error Handling
- Use descriptive error messages
- Provide actionable error information
- Handle edge cases gracefully
- Log errors appropriately with chalk colors

### Command Line Interface
- Follow existing CLI patterns
- Use consistent color scheme (chalk)
- Provide helpful help text
- Support both short and long options where appropriate

## 🧪 Testing Guidelines

### Manual Testing
Before submitting a PR, test these scenarios:

```bash
# Basic functionality
npm run status
npm run next
npm run help

# Time controls
tsx src/claude-schedule.ts run --stop-at 1pm
tsx src/claude-schedule.ts run --hours 0.1

# Error handling
tsx src/claude-schedule.ts invalid-command
tsx src/claude-schedule.ts run --invalid-option
```

### Configuration Testing
Test with different `prompts.jsonl` configurations:
- Empty file
- Invalid JSON
- Missing required fields
- Different wait times and session paths

**Note**: Copy `prompts/prompts.jsonl.sample` to `prompts/prompts.jsonl` before testing. The actual `prompts.jsonl` file is gitignored to protect personal configurations.

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for all public functions
- Include parameter and return type descriptions
- Provide usage examples in comments
- Document complex logic and algorithms

### README Updates
When adding features, update:
- Feature list
- Command documentation
- Usage examples
- Configuration options

### Changelog
For significant changes, update the changelog with:
- Feature additions
- Bug fixes
- Breaking changes
- Migration instructions

## 🛡️ Contributor License Agreement (CLA)

By submitting a pull request or contribution, you agree to the following:

> You grant the project founder a **non-exclusive, irrevocable, worldwide, royalty-free license** to use, modify, sublicense, and relicense your contribution, including the right to incorporate it into dual-licensed or commercial versions of the project.

This ensures that the project can grow sustainably while preserving creator rights.  
If you are contributing on behalf of a company or organization, please contact us in advance.

## 🔍 Pull Request Process

### Before Submitting
1. **Check existing issues** - Is there already an issue for this?
2. **Search existing PRs** - Has someone already worked on this?
3. **Test thoroughly** - Does your change work as expected?
4. **Update documentation** - Are docs up to date?

### PR Requirements
- [ ] Clear, descriptive title
- [ ] Detailed description of changes
- [ ] Tests pass (manual testing documented)
- [ ] Documentation updated if needed
- [ ] No breaking changes (or clearly marked)
- [ ] Follows code style guidelines

### Review Process
1. **Automated checks** - Code style, basic testing
2. **Maintainer review** - Code quality, design, integration
3. **Community feedback** - Input from other contributors
4. **Testing** - Real-world usage validation
5. **Merge** - Integration into main branch

## 🏷️ Issue Labels

When creating issues or PRs, use appropriate labels:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `duplicate` - This issue or pull request already exists
- `wontfix` - This will not be worked on

## 💬 Communication

### Where to Ask Questions
- **GitHub Discussions** - General questions, ideas, community support
- **Issues** - Bug reports, specific feature requests
- **Pull Request comments** - Implementation-specific discussions

### Response Times
- We aim to respond to issues within 48 hours
- Pull request reviews typically take 2-7 days
- Complex features may require longer discussion

### Communication Guidelines
- Be respectful and constructive
- Provide context and examples
- Search before asking duplicate questions
- Use clear, descriptive titles

## 🌟 Recognition

Contributors who make significant contributions will be:
- Listed in the project's acknowledgments
- Mentioned in release notes
- Invited to provide input on project direction
- Given priority support for their own contributions

## 🔗 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## 📞 Getting Help

If you need help with contributing:

1. **Check the [Wiki](https://github.com/prompt-scheduler/cli/wiki)** for detailed guides
2. **Ask in [Discussions](https://github.com/prompt-scheduler/cli/discussions)** for community support
3. **Open an issue** with the `help wanted` label
4. **Reach out to maintainers** for complex architectural questions

---

**Thank you for contributing to Prompt Scheduler! 🚀**

*Your contributions help make automation better for developers worldwide. Every bug fix, feature addition, and documentation improvement makes a difference.*