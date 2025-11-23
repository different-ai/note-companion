# Orphaned Code Analysis Report

**Generated:** 2025-01-22  
**Analyzed Packages:** packages/web, packages/plugin  
**Analysis Type:** Deep Static Code Analysis

---

## Executive Summary

This report identifies orphaned files, unused exports, and potentially dead code across the Note Companion codebase. Each finding is rated by severity and certainty.

**Legend:**
- **Severity:** Critical | High | Medium | Low
- **Certainty:** High (95-100%) | Medium (70-95%) | Low (50-70%)

---

## 1. ORPHANED FILES

### 1.1 Anonymous User System (packages/web/app/api/anon.ts)
**Location:** `packages/web/app/api/anon.ts`  
**Severity:** MEDIUM  
**Certainty:** HIGH (95%)

**Description:**
File contains two exported functions:
- `createAnonymousUser()` 
- `updateAnonymousUserEmail()`

**Usage Analysis:**
- ✅ USED: `createAnonymousUser` - imported in `packages/web/app/api/top-up/route.ts:4`
- ❌ UNUSED: `updateAnonymousUserEmail` - No imports found in codebase

**Evidence:**
```bash
# Search results for updateAnonymousUserEmail usage:
grep -r "updateAnonymousUserEmail" packages/web --include="*.ts" --include="*.tsx"
# Result: Only found in anon.ts (definition only)
```

**Recommendation:**
- Remove `updateAnonymousUserEmail` function if no migration path is planned
- Document the anonymous user creation flow (currently only used in top-up flow)

**Impact:**
- Low impact - removes ~40 lines of dead code
- Improves code clarity by removing unused API

---

### 1.2 Old Folders API Route (packages/web/app/api/(newai)/folders/route.ts)
**Location:** `packages/web/app/api/(newai)/folders/route.ts`  
**Severity:** HIGH  
**Certainty:** HIGH (90%)

**Description:**
Legacy folders recommendation endpoint that appears to be superseded by v2.

**Usage Analysis:**
- V2 exists at `packages/web/app/api/(newai)/folders/v2/route.ts`
- Plugin uses `recommendFolders()` which calls `/api/folders/v2` (index.ts:932)
- Old route uses deprecated `handleAuthorization` (marked @deprecated)

**Evidence:**
```typescript
// Old route (folders/route.ts)
const { userId } = await handleAuthorization(request); // @deprecated

// V2 route (folders/v2/route.ts) 
const { userId } = await handleAuthorization(request); // Same issue, but at least it's the "current" version
```

**Recommendation:**
- Mark old route for deprecation/removal
- Add deprecation warning if endpoint is hit
- Plan migration timeline if external clients use old endpoint

**Impact:**
- Medium-High - Reduces maintenance burden
- Eliminates confusion about which endpoint to use

---

### 1.3 Upload Test Infrastructure
**Location:** 
- `packages/web/app/api/upload-test/route.ts`
- `packages/web/app/(app)/dashboard/upload-test/page.tsx`

**Severity:** LOW  
**Certainty:** HIGH (98%)

**Description:**
Development/testing infrastructure for file upload flow.

**Usage Analysis:**
- No plugin usage found
- Page exists at `/dashboard/upload-test` (public dashboard route)
- Marked with "test" in naming convention

**Evidence:**
```bash
# No plugin references found:
grep -r "upload-test" packages/plugin --include="*.ts" --include="*.tsx"
# Result: No matches
```

**Recommendation:**
- Keep for development/testing purposes
- Consider moving to dev-only routes (check NODE_ENV)
- Add authentication requirement if keeping in production

**Security Concern:**
The upload-test endpoint forwards to /api/upload with user credentials. If exposed in production without proper auth, could be abused.

**Impact:**
- Low - testing infrastructure
- Potential security risk if not properly protected

---

### 1.4 Check Tier Endpoint (packages/web/app/api/check-tier/route.ts)
**Location:** `packages/web/app/api/check-tier/route.ts`  
**Severity:** MEDIUM  
**Certainty:** MEDIUM (75%)

**Description:**
Endpoint to check if user needs upgrade and token usage.

**Usage Analysis:**
```bash
# Plugin usage search:
grep -r "check-tier" packages/plugin --include="*.ts" --include="*.tsx"
# Result: No matches found
```

- Not used by plugin
- Uses `handleAuthorizationV2` (current auth method)
- Returns useful upgrade/token data

**Recommendation:**
- Verify if mobile or web dashboard uses this endpoint
- If unused, consider consolidating with `/api/usage` endpoint
- Document intended use case

**Impact:**
- Low-Medium - May be dead code if no clients use it

---

### 1.5 Old Classify API (packages/web/app/api/(newai)/classify1/route.ts)
**Location:** `packages/web/app/api/(newai)/classify1/route.ts`  
**Severity:** MEDIUM  
**Certainty:** HIGH (85%)

**Description:**
Document classification endpoint with "1" suffix suggesting v1.

**Usage Analysis:**
- ✅ USED by plugin: `packages/plugin/index.ts:644` - `classifyContentV2()` calls `/api/classify1`
- Uses deprecated `handleAuthorization` function

**Evidence:**
```typescript
// plugin/index.ts:644
const response = await fetch(`${serverUrl}/api/classify1`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${this.settings.API_KEY}`,
  },
  body: JSON.stringify({
    content: trimmedContent,
    templateNames: classifications,
  }),
});
```

**Recommendation:**
- Migrate to `handleAuthorizationV2` 
- Remove "1" suffix or create v2 with better naming
- Document that this is the CURRENT classification endpoint (despite naming)

**Impact:**
- Low - endpoint is actively used but needs auth upgrade

---

### 1.6 Fabric Classify Endpoint (packages/web/app/api/(newai)/fabric-classify/route.ts)
**Location:** `packages/web/app/api/(newai)/fabric-classify/route.ts`  
**Severity:** LOW  
**Certainty:** HIGH (90%)

**Description:**
Fabric-specific classification endpoint.

**Usage Analysis:**
- ✅ USED by plugin: `packages/plugin/views/assistant/organizer/ai-format/fabric-templates.tsx`
- Conditional on `enableFabric` setting
- Uses deprecated `handleAuthorization`

**Recommendation:**
- Migrate to `handleAuthorizationV2`
- Keep endpoint (actively used feature)

**Impact:**
- Low - needs auth migration only

---

## 2. ORPHANED FUNCTIONS (EXPORTED BUT NOT IMPORTED)

### 2.1 checkAndCreateFolders (fileUtils.ts)
**Location:** `packages/plugin/fileUtils.ts`  
**Severity:** LOW  
**Certainty:** MEDIUM (70%)

**Description:**
Function has both export in fileUtils.ts AND import in index.ts, but there's a duplicate implementation.

**Evidence:**
```typescript
// index.ts:42-43
import { checkAndCreateFolders } from "./fileUtils";

// index.ts:51-54 - ANOTHER import!
import {
  ensureFolderExists,
  checkAndCreateFolders,  // Duplicate import!
  checkAndCreateTemplates,
  moveFile,
} from "./fileUtils";
```

**Recommendation:**
- Clean up duplicate imports in index.ts
- Verify both functions do the same thing

**Impact:**
- Very Low - code clarity issue only

---

### 2.2 Deprecated handleAuthorization Function
**Location:** `packages/web/lib/handleAuthorization.ts:298`  
**Severity:** HIGH  
**Certainty:** HIGH (100%)

**Description:**
Function marked with `@deprecated` JSDoc but still actively used.

**Usage Count:**
```bash
grep -r "handleAuthorization" packages/web/app/api --include="*.ts" | grep -c "import.*handleAuthorization"
# Result: 13 imports of deprecated version
```

**Affected Files:**
- `/api/(newai)/fabric-classify/route.ts`
- `/api/(newai)/classify1/route.ts`
- `/api/(newai)/title/v2/route.ts`
- `/api/(newai)/modify/route.ts`
- `/api/(newai)/vision/route.ts`
- `/api/(newai)/tags/v2/route.ts`
- `/api/(newai)/format-stream/route.ts`
- `/api/(newai)/concepts-and-chunks/route.ts`
- `/api/(newai)/format/route.ts`
- `/api/(newai)/folders/v2/route.ts`
- `/api/(newai)/folders/route.ts`

**Recommendation:**
- URGENT: Migrate all usages to `handleAuthorizationV2`
- Add runtime deprecation warning
- Set timeline for removal (e.g., 2 releases from now)

**Impact:**
- High - affects authentication flow across 13 API endpoints
- Security implications if old auth has known issues

---

### 2.3 Commented-Out Webhook Handlers
**Location:** `packages/web/app/api/webhook/route.ts:15-17`  
**Severity:** LOW  
**Certainty:** HIGH (100%)

**Description:**
Two webhook handlers commented out in production code:
```typescript
const HANDLERS = {
  "checkout.session.completed": handleCheckoutComplete,
  "customer.subscription.deleted": handleSubscriptionCanceled,
  "customer.subscription.updated": handleSubscriptionUpdated,
  // "invoice.paid": handleInvoicePaid,  // COMMENTED OUT
  // "payment_intent.succeeded": handlePaymentIntentSucceeded,  // COMMENTED OUT
}
```

**Recommendation:**
- Document WHY these are commented out
- If intentionally disabled, remove imports
- If bug/testing, add TODO comment with reason

**Impact:**
- Low-Medium - Could indicate incomplete Stripe integration

---

## 3. POTENTIALLY UNUSED INFRASTRUCTURE

### 3.1 Process Pending Uploads Worker
**Location:** `packages/web/app/api/process-pending-uploads/route.ts`  
**Severity:** MEDIUM  
**Certainty:** MEDIUM (70%)

**Description:**
Background job to process uploaded files (OCR, transcription).

**Usage Analysis:**
- ✅ Called by: `packages/web/app/api/trigger-processing/route.ts:31`
- ✅ Called by: `packages/mobile/utils/file-handler.ts` (mobile app)
- Requires CRON_SECRET for authorization

**Recommendation:**
- KEEP - This is active infrastructure
- Verify cron job is configured on hosting platform
- Document expected trigger frequency

**Impact:**
- Critical infrastructure - do not remove

---

### 3.2 Reset Tokens Cron Job
**Location:** `packages/web/app/api/cron/reset-tokens/route.ts`  
**Severity:** LOW  
**Certainty:** HIGH (90%)

**Description:**
Monthly token reset for subscription users.

**Usage Analysis:**
- Only test file references it: `route.test.ts`
- Requires CRON_SECRET
- Should be triggered monthly by platform cron

**Recommendation:**
- KEEP - Critical billing infrastructure
- Verify cron schedule is configured
- Add monitoring/alerting for failed runs

**Impact:**
- Critical billing feature - do not remove

---

## 4. SUMMARY OF FINDINGS

### Immediate Action Required (HIGH Priority):
1. **Migrate deprecated `handleAuthorization`** - 13 files affected
2. **Review commented webhook handlers** - Potential incomplete Stripe integration
3. **Remove `updateAnonymousUserEmail`** - Confirmed unused function

### Medium Priority:
4. **Deprecate old `/api/folders` route** - Superseded by v2
5. **Review check-tier endpoint** - Possibly unused
6. **Clean up upload-test** - Security review needed

### Low Priority (Code Cleanup):
7. **Remove duplicate imports** in plugin index.ts
8. **Document fabric-classify** endpoint purpose
9. **Verify cron jobs** are properly configured

---

## 5. METHODOLOGY

**Analysis performed using:**
1. Static code analysis via grep/search
2. Import graph analysis (finding exports with no imports)
3. Cross-package reference checking
4. Manual code review of critical paths

**Limitations:**
- Dynamic imports not fully traced
- Runtime reflection/eval not detected
- External API consumers not analyzed (mobile app partially checked)

---

## 6. RECOMMENDATIONS FOR ONGOING MAINTENANCE

1. **Implement automated orphan detection**
   - Use tools like `ts-prune` or `knip` for TypeScript dead code detection
   - Add to CI/CD pipeline

2. **Code review checklist**
   - Check for deprecated functions before using
   - Verify imports exist for new exports
   - Mark deprecated code with JSDoc + runtime warnings

3. **Deprecation policy**
   - Clear timeline for deprecated code removal
   - Runtime warnings in development
   - Migration guides for external consumers

---

**Report prepared by:** AI Code Analysis Agent  
**Review recommended by:** Senior Engineer  
**Next review:** Q2 2025 or after major refactors
