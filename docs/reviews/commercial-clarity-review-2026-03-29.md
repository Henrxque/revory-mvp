# Commercial Clarity Review

Date: 2026-03-29
Stage: Sprint 05 commercial MVP closeout
Product: REVORY Seller

## Objective

Tighten commercial clarity across the highest-impact surfaces without turning the product into a landing page rewrite, a broader promise, or a heavier system.

## Surfaces reviewed

- `src/app/(app)/app/dashboard/page.tsx`
- `src/app/(app)/app/imports/page.tsx`
- `src/app/(app)/app/setup/page.tsx`
- `components/onboarding/OnboardingStepLayout.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

## What was found

### 1. Revenue value was strong, but still slightly abstract in a few hero and support blocks

The dashboard already opened revenue-first, but some copy still described the read in a more structural way than a commercial one.

### 2. Booking Inputs was clear functionally, but the revenue link could still be more immediate

The page explained the upload path well, yet the reason it matters commercially could still become clearer at first glance.

### 3. Activation and onboarding still leaned a little too much on setup language

They were already much better than before, but a few blocks still described configuration more than commercial consequence.

### 4. Auth surfaces were coherent, but not fully using booked proof and revenue as first-impression anchors

Sign-in and sign-up still had room to connect the product path more directly to booked proof and revenue visibility.

## What was refined

### Dashboard

- Hero headline now makes the value read more immediate
- `Revenue visible now` became `Booked revenue visible`
- `Why the number holds` became `Why revenue is believable`
- `Executive read` became `Commercial read`
- Supporting copy now frames revenue as believable only when booked proof exists underneath
- Booked visibility support copy now makes it clearer that files exist only to support the value read, not to become the product center

### Booking Inputs

- Hero language now makes the page read more directly as the place where the bookings behind the revenue view become visible
- Support copy now explains the page as the shortest bridge between a live Seller workspace and a real revenue read
- Supporting cards were tightened so booked proof feels primary and revenue handoff feels clearer

### Activation and onboarding

- Activation hero copy now speaks more directly about a live booking and revenue path
- Supporting sections now clarify that activation should lead to visible revenue proof, not just a configured state
- Onboarding shell headline was tightened to a clearer booking-path framing

### Sign-in and sign-up

- Auth surfaces now use booked proof and revenue visibility more explicitly in hero copy, support text, and high-signal chips
- The first impression is more clearly tied to the live product path instead of just protected access or generic workspace creation

## Validation

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run build` -> passed

## Verdict

**Approved**

The product now explains its commercial value faster and more cleanly across the top surfaces. Revenue proof, booked outcomes, and the booking promise are easier to understand in demo, while the tone stays premium, concise, and honest to the current MVP.
