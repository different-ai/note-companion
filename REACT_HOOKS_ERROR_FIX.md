# React Hooks Error Fix - Mobile Package

## Error Summary

```
ERROR  Warning: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app

ERROR  Warning: TypeError: Cannot read property 'useContext' of null
This error is located at:
    in CssInterop.View
    in AppContainer
    in LogBox(RootComponent), js engine: hermes
```

## Root Cause Analysis

### The Problem: React Version Mismatch in Monorepo

The mobile package is experiencing a **critical React version conflict** caused by pnpm workspace hoisting in the monorepo setup.

**Evidence:**
1. ✅ Mobile package (`packages/mobile/package.json`) specifies: `"react": "catalog:react18"` → React 18.3.1
2. ❌ Web package (`packages/web/package.json`) specifies: `"react": "^19.0.0"` → React 19.0.0
3. ❌ Plugin package also uses React 19.0.0
4. ❌ Root `node_modules/react` contains React 19.0.0 (hoisted from web/plugin packages)
5. ✅ Mobile `node_modules/react` contains React 18.3.1 (correct version)

**The Issue:**
The NativeWind CSS transformation (`CssInterop.View`) is trying to use React's `useContext` hook, but it's resolving to the **wrong React instance** due to module resolution conflicts. When Metro bundler resolves imports, it occasionally picks up React 19 from the root `node_modules` instead of the mobile package's React 18, causing:

- `useContext` to be null (React 19 and React 18 have different internal structures)
- "Invalid hook call" errors (mixing React versions)
- Context providers failing to work properly

### Dependency Tree Analysis

```
monorepo/
├── node_modules/
│   └── react@19.0.0 ❌ (hoisted from web/plugin)
├── packages/
│   ├── mobile/
│   │   ├── node_modules/
│   │   │   └── react@18.3.1 ✅ (correct)
│   │   └── package.json (catalog:react18)
│   ├── web/
│   │   ├── node_modules/
│   │   │   └── react@19.0.0 ❌
│   │   └── package.json (react: ^19.0.0)
│   └── plugin/
│       ├── node_modules/
│       │   └── react@19.0.0 ❌
│       └── package.json (uses React 19)
```

**pnpm why react** shows:
- Mobile package correctly depends on React 18.3.1
- Web/Plugin packages depend on React 19.0.0
- Root workspace has React 19.0.0 hoisted

### NativeWind v4 and CssInterop

NativeWind v4 uses `CssInterop.View` which internally calls React hooks:
- `useContext` for theme context
- `useMemo` for style optimization
- `useRef` for component refs

When NativeWind tries to call these hooks, it's using the React instance from the wrong package, causing the error.

---

## Step-by-Step Debugging Approach

### 1. Verify the Issue
```bash
# From monorepo root
cd packages/mobile

# Check mobile React version
cat node_modules/react/package.json | grep version
# Should show: 18.3.1

# Check root React version
cd ../..
cat node_modules/react/package.json | grep version
# Will show: 19.0.0 (PROBLEM!)

# Check dependency tree
pnpm why react --recursive
# Shows multiple React versions
```

### 2. Reproduce the Error
```bash
cd packages/mobile
pnpm start
# Press 'i' for iOS or 'a' for Android
# Error appears immediately on app launch
```

### 3. Check Metro Bundler Resolution
```bash
# Start Metro with verbose logging
cd packages/mobile
REACT_NATIVE_METRO_LOG_LEVEL=info pnpm start

# Look for React module resolution logs
# Will show which react package is being used
```

---

## Proposed Solutions (Ordered by Likelihood of Success)

### ✅ Solution 1: Enforce Strict Module Resolution with pnpm (RECOMMENDED)

This solution prevents pnpm from hoisting React to the root and ensures each package uses its own React version.

**Steps:**

1. **Update root `package.json` with pnpm configuration:**

```json
{
  "pnpm": {
    "patchedDependencies": {
      "xcode@3.0.1": "patches/xcode@3.0.1.patch"
    },
    "overrides": {
      "react": "$react",
      "react-dom": "$react-dom"
    },
    "packageExtensions": {
      "react-native": {
        "peerDependencies": {
          "react": "18.3.1"
        }
      }
    }
  }
}
```

2. **Update `.npmrc` in monorepo root:**

```ini
# Add or create .npmrc file in root
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*

# Prevent React from being hoisted
shamefully-hoist=false
hoist=false
```

3. **Clean and reinstall:**

```bash
# From monorepo root
pnpm clean
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf pnpm-lock.yaml

# Reinstall with new config
pnpm install

# Verify mobile has React 18
cat packages/mobile/node_modules/react/package.json | grep version

# Verify root doesn't have React hoisted
ls node_modules/ | grep react
# Should be minimal or no react packages
```

4. **Update Metro config to prefer local node_modules:**

Edit `packages/mobile/metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(__dirname);

// Prevent Metro from looking in parent node_modules for React
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Ensure React resolves to mobile's version
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = withNativeWind(config, { input: './global.css' });
```

5. **Clear Metro cache:**

```bash
cd packages/mobile
rm -rf .expo
npx expo start --clear
```

**Expected Result:** ✅ Mobile package uses React 18.3.1 exclusively, no version conflicts.

---

### ✅ Solution 2: Upgrade Mobile Package to React 19 (ALTERNATIVE)

If React Native 0.76.9 supports React 19, upgrade the mobile package to match the rest of the monorepo.

**Steps:**

1. **Check React Native compatibility:**

```bash
# Check if React Native 0.76.9 officially supports React 19
# Visit: https://reactnative.dev/blog
# Or check: https://github.com/facebook/react-native/releases
```

2. **Update mobile package.json:**

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-native": "0.76.9"
  },
  "devDependencies": {
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4"
  }
}
```

3. **Update pnpm-workspace.yaml catalog:**

```yaml
catalogs:
  react19:
    react: 19.0.0
    react-dom: 19.0.0
    "@types/react": ^19.0.0
    "@types/react-dom": ^19.0.0
  # Keep react18 for backward compatibility if needed
```

4. **Update dependencies:**

```bash
cd packages/mobile
pnpm install
```

5. **Test compatibility:**

```bash
pnpm start
# Test all features, especially:
# - Camera functionality
# - File uploads
# - Navigation
# - Clerk authentication
```

**Risks:**
- ⚠️ React Native 0.76.9 may not officially support React 19
- ⚠️ Some Expo packages may have peer dependency warnings
- ⚠️ Breaking changes in React 19 may affect existing code

**Expected Result:** ✅ All packages use React 19, no version conflicts.

---

### ✅ Solution 3: Isolate Mobile Package as Separate Workspace

Move mobile package to its own pnpm workspace to completely isolate dependencies.

**Steps:**

1. **Create new workspace structure:**

```bash
# From monorepo root
mkdir -p mobile-workspace
mv packages/mobile mobile-workspace/
```

2. **Create separate pnpm-workspace.yaml:**

```yaml
# mobile-workspace/pnpm-workspace.yaml
packages:
  - '.'
```

3. **Create separate package.json:**

```json
// mobile-workspace/package.json
{
  "name": "note-companion-mobile-workspace",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@10.8.1"
}
```

4. **Update root pnpm-workspace.yaml:**

```yaml
packages:
  - packages/*
  # Remove mobile from main workspace
```

5. **Update root scripts:**

```json
{
  "scripts": {
    "mobile:dev": "cd mobile-workspace && pnpm dev",
    "mobile:ios": "cd mobile-workspace && pnpm ios",
    "mobile:android": "cd mobile-workspace && pnpm android"
  }
}
```

**Expected Result:** ✅ Complete isolation, no shared dependencies.

**Trade-offs:**
- ❌ More complex monorepo structure
- ❌ Harder to share code between packages
- ✅ Complete dependency isolation

---

### ✅ Solution 4: Use Yarn Workspaces Instead of pnpm

Switch to Yarn v3+ which has better React Native support and more predictable hoisting.

**Steps:**

1. **Install Yarn:**

```bash
corepack enable
yarn set version stable
```

2. **Create .yarnrc.yml:**

```yaml
nodeLinker: node-modules
nmHoistingLimits: workspaces
```

3. **Remove pnpm:**

```bash
rm pnpm-lock.yaml
rm -rf node_modules
rm -rf packages/*/node_modules
```

4. **Install with Yarn:**

```bash
yarn install
```

**Expected Result:** ✅ Better hoisting behavior, fewer conflicts.

**Trade-offs:**
- ❌ Requires migration from pnpm
- ❌ Different lockfile format
- ❌ Team needs to switch package manager

---

## Code Changes Needed

### 1. Metro Config Update (For Solution 1)

**File:** `packages/mobile/metro.config.js`

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(__dirname);

// Prevent Metro from looking in parent node_modules
config.watchFolders = [projectRoot];

// Ensure local node_modules are prioritized
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Force React to resolve from mobile's node_modules
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
};

// Prevent duplicate modules
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
```

### 2. Root .npmrc Update (For Solution 1)

**File:** `.npmrc` (create in monorepo root)

```ini
# Prevent hoisting React packages
shamefully-hoist=false
hoist=false

# Only hoist safe packages
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*

# Strict peer dependencies
strict-peer-dependencies=true
```

### 3. Root package.json Update (For Solution 1)

**File:** `package.json`

```json
{
  "pnpm": {
    "patchedDependencies": {
      "xcode@3.0.1": "patches/xcode@3.0.1.patch"
    },
    "overrides": {
      "react": "$react",
      "react-dom": "$react-dom"
    },
    "neverBuiltDependencies": ["canvas"],
    "packageExtensions": {
      "react-native": {
        "peerDependencies": {
          "react": "18.3.1"
        }
      }
    }
  }
}
```

---

## Testing Verification Steps

### 1. Pre-Fix Verification

```bash
# Verify the problem exists
cd packages/mobile
pnpm start

# Should see the error:
# "Invalid hook call. Hooks can only be called inside of the body of a function component"
```

### 2. Post-Fix Verification

#### Step 1: Check React Versions

```bash
# From monorepo root
cd packages/mobile
cat node_modules/react/package.json | grep '"version"'
# Must show: "version": "18.3.1"

cd ../..
ls node_modules/ | grep -E "^react$"
# Should return empty or no react package (depending on solution)
```

#### Step 2: Verify Metro Resolution

```bash
cd packages/mobile
npx expo start --clear

# Check Metro logs for React resolution
# Should only resolve to packages/mobile/node_modules/react
```

#### Step 3: Test App Launch

```bash
cd packages/mobile
pnpm start
# Press 'i' for iOS or 'a' for Android

# App should launch without hooks error
# Check console for any React warnings
```

#### Step 4: Test NativeWind Styling

Create a test component to verify NativeWind works:

```tsx
// packages/mobile/app/test-nativewind.tsx
import { View, Text } from 'react-native';

export default function TestNativeWind() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-500">
      <Text className="text-white text-2xl font-bold">
        NativeWind Works!
      </Text>
    </View>
  );
}
```

Navigate to this screen and verify:
- ✅ No hook errors
- ✅ Tailwind classes apply correctly
- ✅ No console warnings

#### Step 5: Test Key Features

Test all critical app features:

```bash
# 1. Authentication
# - Sign in/out
# - Token persistence
# - OAuth flows

# 2. File Upload
# - Camera capture
# - Photo library selection
# - Document picker
# - Share sheet integration

# 3. Navigation
# - Tab switching
# - Stack navigation
# - Deep linking

# 4. Clerk Integration
# - useAuth() hook
# - getToken() function
# - User session management
```

#### Step 6: Run Tests

```bash
cd packages/mobile
pnpm test

# Should pass all tests with no React warnings
```

#### Step 7: Check Build

```bash
# iOS
cd packages/mobile
pnpm build:ios

# Android
pnpm build:android

# Both should complete without errors
```

---

## Prevention Best Practices

### 1. Monorepo Dependency Management

#### Use Strict Version Pinning

```json
{
  "pnpm": {
    "overrides": {
      "react": "$react",
      "react-dom": "$react-dom"
    }
  }
}
```

This ensures all packages requesting "react" get the version specified in their own package.json.

#### Document Workspace Dependencies

Create a `DEPENDENCIES.md` file:

```markdown
# Workspace Dependencies

## React Versions

- **Mobile Package**: React 18.3.1 (required by React Native 0.76.9)
- **Web Package**: React 19.0.0 (Next.js 15 requirement)
- **Plugin Package**: React 19.0.0 (Obsidian compatibility)

## Adding New Packages

Before adding a package that depends on React:

1. Check which React version it requires
2. Ensure it matches the workspace package's React version
3. Test in isolation before committing
```

### 2. Metro Configuration Best Practices

Always configure Metro to prefer local dependencies:

```javascript
// metro.config.js template for React Native in monorepo
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

### 3. CI/CD Checks

Add dependency validation to CI:

```yaml
# .github/workflows/validate-deps.yml
name: Validate Dependencies

on: [push, pull_request]

jobs:
  check-react-versions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - name: Check React Versions
        run: |
          cd packages/mobile
          MOBILE_REACT=$(cat node_modules/react/package.json | jq -r '.version')
          if [ "$MOBILE_REACT" != "18.3.1" ]; then
            echo "Error: Mobile React version is $MOBILE_REACT, expected 18.3.1"
            exit 1
          fi
```

### 4. Pre-commit Hooks

Add a pre-commit hook to validate dependencies:

```bash
#!/bin/sh
# .husky/pre-commit

# Check mobile React version
cd packages/mobile
REACT_VERSION=$(node -p "require('./node_modules/react/package.json').version")

if [ "$REACT_VERSION" != "18.3.1" ]; then
  echo "❌ Error: Mobile React version is $REACT_VERSION, expected 18.3.1"
  echo "Run: pnpm install in packages/mobile"
  exit 1
fi

echo "✅ React versions validated"
```

### 5. Documentation Updates

Update `AGENTS.md` with React version requirements:

```markdown
## React Versions (CRITICAL)

The monorepo uses different React versions:

- **Mobile**: React 18.3.1 (React Native 0.76.9 requirement)
- **Web**: React 19.0.0 (Next.js 15 requirement)
- **Plugin**: React 19.0.0

**NEVER**:
- Change mobile React version without updating React Native
- Install packages that peer-depend on React 19 in mobile package
- Let pnpm hoist React to root node_modules

**ALWAYS**:
- Run `pnpm install` after pulling changes
- Clear Metro cache when switching branches: `npx expo start --clear`
- Verify React versions before committing
```

### 6. Package.json Scripts

Add helpful scripts to root package.json:

```json
{
  "scripts": {
    "validate:deps": "node scripts/validate-dependencies.js",
    "clean:mobile": "cd packages/mobile && rm -rf .expo node_modules && pnpm install",
    "check:react": "pnpm why react --recursive"
  }
}
```

Create `scripts/validate-dependencies.js`:

```javascript
const fs = require('fs');
const path = require('path');

function checkReactVersion(packagePath, expectedVersion) {
  const reactPkgPath = path.join(
    packagePath,
    'node_modules/react/package.json'
  );
  
  if (!fs.existsSync(reactPkgPath)) {
    console.error(`❌ React not found in ${packagePath}`);
    return false;
  }
  
  const { version } = JSON.parse(fs.readFileSync(reactPkgPath, 'utf8'));
  
  if (version !== expectedVersion) {
    console.error(
      `❌ ${packagePath}: React ${version} (expected ${expectedVersion})`
    );
    return false;
  }
  
  console.log(`✅ ${packagePath}: React ${version}`);
  return true;
}

const checks = [
  checkReactVersion('packages/mobile', '18.3.1'),
  checkReactVersion('packages/web', '19.0.0'),
  checkReactVersion('packages/plugin', '19.0.0'),
];

if (!checks.every(Boolean)) {
  console.error('\n❌ React version validation failed!');
  process.exit(1);
}

console.log('\n✅ All React versions validated!');
```

### 7. Error Monitoring

Add Sentry or similar to detect React errors in production:

```typescript
// packages/mobile/app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event, hint) {
    // Flag React version errors
    if (
      hint.originalException?.message?.includes('Invalid hook call') ||
      hint.originalException?.message?.includes('useContext')
    ) {
      event.tags = { ...event.tags, react_version_error: true };
    }
    return event;
  },
});
```

---

## Quick Reference Commands

### Clean Everything
```bash
# From monorepo root
pnpm clean
rm -rf node_modules pnpm-lock.yaml
rm -rf packages/*/node_modules
pnpm install
```

### Check React Versions
```bash
# Mobile
cat packages/mobile/node_modules/react/package.json | grep version

# Root
cat node_modules/react/package.json | grep version 2>/dev/null || echo "No React in root"
```

### Clear Metro Cache
```bash
cd packages/mobile
rm -rf .expo
npx expo start --clear
```

### Verify Dependencies
```bash
pnpm why react --recursive
```

### Test Mobile App
```bash
cd packages/mobile
pnpm start
# Then press 'i' or 'a'
```

---

## Summary

**Root Cause:** React version mismatch between mobile (React 18) and web/plugin (React 19) packages in monorepo, with pnpm hoisting causing resolution conflicts.

**Recommended Solution:** Solution 1 - Enforce strict module resolution with updated Metro config and pnpm settings.

**Impact:** Critical - Breaks all React hooks in mobile app, making it unusable.

**Difficulty:** Medium - Requires understanding of monorepo dependency management and Metro bundler.

**Time to Fix:** 15-30 minutes with Solution 1.

**Prevention:** Implement dependency validation scripts and documentation updates.

---

## Additional Resources

- [React Native Monorepo Guide](https://reactnative.dev/docs/monorepos)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Metro Bundler Resolution](https://metrobundler.dev/docs/resolution)
- [NativeWind v4 Documentation](https://www.nativewind.dev/v4/overview)
- [React Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)

---

**Last Updated:** 2025-11-22  
**Status:** Ready for Implementation  
**Priority:** P0 - Critical Bug
