# AI Credits System - Usage-Based Pricing & Abuse Prevention

## Overview

The AI Credits system provides usage-based billing for AI-powered features, with fair-usage protection and intelligent abuse detection.

## Architecture

```
src/
├── config/aiCredits.ts          # Central configuration
├── types/aiCredits.ts           # TypeScript interfaces
├── store/aiCreditsStore.ts      # Zustand state management
├── components/ai/
│   ├── AICreditsDashboard.tsx   # Main dashboard UI
│   └── AIHintExample.tsx        # Example AI feature
├── hooks/
│   └── useAICreditConsumption.ts # Hook for consuming credits
└── lib/
    └── aiCreditsValidator.ts    # Server-side validation helpers
```

## Key Features

### 1. Credit Costs per Feature

| Feature | Credits | Audience |
|---------|---------|----------|
| AI Hint | 1 | Student |
| AI Code Review | 3 | Student |
| AI Debugging | 2 | Student |
| AI Test Case Generation | 5 | Creator |
| AI Quiz Generation | 8 | Creator |
| AI Explanation | 2 | Student |
| AI Complexity Analysis | 1 | Student |
| AI Question Improvement | 3 | Creator |
| AI Difficulty Analysis | 2 | Creator |
| AI Report Generation | 4 | Creator |

### 2. Monthly Included Credits

| Plan | Credits |
|------|---------|
| Student Pro | 300 |
| Creator Pro | 700 |
| Ultimate | 1500 |

### 3. Credit Packs (One-time Purchase)

| Pack | Credits | Price (₹) |
|------|---------|-----------|
| Starter | 250 | 99 |
| Standard | 1000 | 299 |
| Power User | 5000 | 999 |
| Institution | 10000 | 1799 |

**Credits never expire while subscription is active.**

### 4. Fair Usage Limits

- Maximum 100 AI requests/hour
- Maximum 500 AI requests/day
- Maximum 5 simultaneous AI requests
- Maximum prompt size: 50 KB
- Maximum response size: 200 KB
- Large requests are queued

### 5. Abuse Detection Rules

| Rule | Threshold | Action |
|------|-----------|--------|
| Repeated identical prompts | 5 in 1 min | Slow down |
| Very high request frequency | 30/min | Slow down |
| Bot-like behavior | 50/min | CAPTCHA |
| AI calls without platform activity | 20 in 5 min | Notify |
| Multiple accounts farming | 3 in 10 min | Escalate |
| Large-scale scripted requests | 100 in 5 min | Escalate |

## Usage

### Basic Credit Consumption

```tsx
import { useAICreditConsumption } from "@/hooks/useAICreditConsumption";

function MyFeature() {
  const { consume, refund, completeRequest, balance } = useAICreditConsumption();

  const handleAIAction = async () => {
    // Consume credits
    const result = await consume("ai-hint", {
      promptHash: hashOfPrompt,
      onSuccess: () => {
        // Proceed with AI request
      },
      onError: (reason, message) => {
        // Handle errors
      }
    });

    if (!result.allowed) return;

    try {
      // Make AI API call
      await callAI();
      completeRequest();
    } catch (error) {
      await refund("ai-hint");
      completeRequest();
    }
  };
}
```

### Server-Side Validation

```tsx
import { validateAICredits, checkFairUsage, checkAbuse } from "@/lib/aiCreditsValidator";

// In your API route:
const validation = validateAICredits({
  userId: request.user.id,
  featureId: "ai-hint",
  remainingCredits: user.creditsRemaining,
  hasActiveSubscription: user.hasActiveSubscription,
});

if (!validation.allowed) {
  return Response.json({ error: validation.reason }, { status: 403 });
}

// Check fair usage
const usage = checkFairUsage({
  requestsThisHour: user.hourlyRequests,
  requestsThisDay: user.dailyRequests,
  concurrentRequests: user.concurrentJobs,
});

if (!usage.allowed) {
  return Response.json({ error: usage.reason }, { status: 429 });
}
```

## Dashboard Integration

The AI Credits Dashboard is automatically displayed in the layout header:

```tsx
import AICreditsDashboard from "@/components/ai/AICreditsDashboard";

// Compact view for header
<AICreditsDashboard compact />

// Full dashboard
<AICreditsDashboard />
```

## Smart Suggestions

The system automatically recommends credit packs when usage exceeds 50% or 80%:

```tsx
import { getRecommendedPack, checkLowCreditWarning } from "@/store/aiCreditsStore";

const isLow = checkLowCreditWarning(remaining, monthlyAllowance);
const recommended = getRecommendedPack(remaining, monthlyAllowance);
```

## Backend Security Principles

1. **Never trust frontend values** - Always validate on server
2. **Deduct after success** - Only consume credits after successful AI response
3. **Auto-refund on failure** - Refund credits if AI request fails
4. **Rate limit per user** - Track requests per user, not just globally
5. **Log all usage** - Maintain audit trail for debugging

## Extending the System

### Adding a New AI Feature

1. Add feature ID to `AICreditFeatureId` type in `src/config/aiCredits.ts`
2. Add cost entry to `AI_CREDIT_COSTS` array
3. Use in component with `useAICreditConsumption` hook

### Configuring Limits

All limits are in `src/config/aiCredits.ts`:

```ts
export const FAIR_USAGE_LIMITS = {
  maxRequestsPerHour: 100,
  maxRequestsPerDay: 500,
  maxConcurrentRequests: 5,
  maxPromptSizeKB: 50,
  maxResponseSizeKB: 200,
  queueLargeRequests: true,
};
```

## Testing

The build compiles successfully. To test:

1. Run `npm run dev`
2. Navigate to any page with AI features
3. Check header for AI Credits display
4. Use AI features to see credit consumption
5. Monitor dashboard for usage statistics

## Future Enhancements

- [ ] Real payment integration for credit packs
- [ ] Webhook notifications for low credits
- [ ] Advanced ML-based abuse detection
- [ ] Credit rollover for unused monthly credits
- [ ] Team/organization credit pools
- [ ] API for third-party credit purchases