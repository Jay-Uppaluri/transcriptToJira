// Hardcoded test data for test mode — bypasses OpenAI calls entirely

export const TEST_PRD = `# Checkout Flow Redesign

## Overview

The checkout flow is being redesigned to reduce cart abandonment and improve conversion rates. The current checkout process has a 68% abandonment rate, significantly above the industry average of 45%. User research and session recordings reveal that users struggle with a lengthy multi-page form, unclear shipping cost presentation, and lack of guest checkout support.

This initiative will replace the existing 5-step checkout with a streamlined single-page experience featuring real-time validation, inline shipping estimates, and support for guest checkout. The redesign will also introduce Apple Pay and Google Pay as express payment options.

The project was discussed in the March sprint planning meeting with stakeholders from Product, Engineering, UX, and QA.

## Problem Statement

- **High abandonment rate (68%)**: Users drop off primarily at the shipping information and payment steps
- **No guest checkout**: Forcing account creation adds friction; 34% of abandoning users cite this as the reason
- **Hidden shipping costs**: Shipping fees are only revealed at the final step, causing sticker shock
- **Poor mobile experience**: The multi-page form is difficult to navigate on mobile devices (mobile abandonment is 78%)
- **Limited payment options**: Only credit card payments are supported, missing modern wallet-based options

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Reduce abandonment | Cart abandonment rate | < 50% (from 68%) |
| Increase conversion | Checkout completion rate | > 55% (from 32%) |
| Improve speed | Average checkout time | < 90 seconds (from 4.2 min) |
| Mobile parity | Mobile conversion rate | Within 5% of desktop |
| Express payments | Express pay adoption | > 15% of transactions |

## User Stories

1. **As a** returning customer, **I want** my shipping and payment info pre-filled **so that** I can check out in under 30 seconds.
2. **As a** guest user, **I want** to complete a purchase without creating an account **so that** I don't have to remember another password.
3. **As a** mobile shopper, **I want** to pay with Apple Pay or Google Pay **so that** I can skip entering card details on a small screen.
4. **As a** price-conscious shopper, **I want** to see shipping costs as soon as I enter my zip code **so that** I can make an informed purchase decision.
5. **As a** customer with multiple addresses, **I want** to select from my saved addresses **so that** I don't have to re-type them each time.
6. **As a** user who made an error, **I want** inline validation on every field **so that** I can fix mistakes without re-submitting the form.

## Functional Requirements

1. **Single-page checkout layout**: All checkout steps (shipping, billing, payment, review) displayed on one scrollable page with collapsible sections
2. **Guest checkout**: Allow purchases without account creation; offer optional account creation post-purchase
3. **Real-time shipping estimates**: Fetch and display shipping options and costs as soon as zip/postal code is entered
4. **Express payment buttons**: Apple Pay and Google Pay buttons above the fold on the checkout page
5. **Address autocomplete**: Integrate Google Places API for address suggestions as the user types
6. **Inline field validation**: Validate each field on blur with clear error messages
7. **Order summary sidebar**: Persistent order summary with item thumbnails, quantities, prices, discounts, and running total
8. **Promo code field**: Inline promo code entry with real-time discount calculation
9. **Saved payment methods**: Display saved cards for logged-in users with option to add new
10. **Order confirmation**: Confirmation page with order number, estimated delivery, and email confirmation trigger

## Non-Functional Requirements

- **Performance**: Checkout page must load in < 2 seconds on 3G connections
- **Security**: PCI DSS Level 1 compliance for all payment data handling
- **Accessibility**: WCAG 2.1 AA compliance; full keyboard navigation and screen reader support
- **Scalability**: Handle 10,000 concurrent checkout sessions during peak sales events
- **Reliability**: 99.9% uptime for checkout service; graceful degradation if payment provider is down
- **Browser support**: Chrome, Safari, Firefox, Edge (latest 2 versions); iOS Safari, Chrome Android

## Acceptance Criteria

1. **Guest checkout**: User can complete purchase without logging in; email receipt is sent
2. **Single-page flow**: All sections render on one page; completing a section auto-expands the next
3. **Shipping estimate**: Shipping options appear within 2 seconds of zip code entry
4. **Express payments**: Apple Pay button appears on supported devices; Google Pay on supported browsers
5. **Validation**: Every required field shows inline error on blur if invalid; form cannot submit with errors
6. **Mobile responsive**: Layout stacks vertically on screens < 768px; all tap targets are >= 44px
7. **Saved data**: Returning logged-in users see pre-filled shipping address and masked saved card
8. **Promo codes**: Valid codes show discounted total immediately; invalid codes show error message

## Out of Scope

- Redesign of the shopping cart page (separate initiative planned for Q3)
- Buy Now Pay Later (BNPL) integration (Klarna/Affirm — planned for Phase 2)
- International tax calculation engine (current tax service will be reused)
- Cryptocurrency payments
- Subscription/recurring payment setup

## Open Questions

1. Should we support PayPal as a payment option in Phase 1, or defer to Phase 2?
2. What is the fallback experience when Apple Pay / Google Pay are unavailable?
3. Do we need to support address validation for international addresses, or US/CA only for launch?
4. How long should guest checkout sessions persist before cart expiration?
5. Should the promo code field be visible by default or behind a "Have a code?" toggle?

## Dependencies

- **Payment gateway**: Stripe SDK upgrade to v3 required for Apple Pay / Google Pay support
- **Address service**: Google Places API key provisioning and billing setup
- **Shipping API**: Integration with ShipEngine for real-time rate calculation
- **Design system**: Updated button and form components from the UX team (due March 15)
- **Backend**: Cart service API needs new endpoint for real-time tax + shipping calculation
- **QA**: Load testing environment setup for concurrent checkout simulation

## Timeline & Milestones

| Milestone | Date | Description |
|-----------|------|-------------|
| Design complete | March 15 | Figma designs for all states and breakpoints |
| API contracts | March 22 | Backend API specs finalized and mocked |
| Sprint 1 complete | April 5 | Single-page layout, guest checkout, address form |
| Sprint 2 complete | April 19 | Payment integration, express pay, validation |
| QA & UAT | April 26 | Full regression, load testing, accessibility audit |
| Staged rollout | May 3 | 10% traffic, monitor metrics |
| Full launch | May 10 | 100% traffic |
`;

export function getTestTickets(projectKey) {
  const key = projectKey || 'PROJ';
  return [
    {
      fields: {
        project: { key },
        summary: 'Checkout Flow Redesign — Epic',
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Redesign the checkout experience to reduce cart abandonment from 68% to under 50%. This epic covers the single-page checkout layout, guest checkout, express payments (Apple Pay / Google Pay), real-time shipping estimates, and inline validation.'
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Success Metrics' }]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cart abandonment rate < 50%' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Checkout completion rate > 55%' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Average checkout time < 90 seconds' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Express pay adoption > 15% of transactions' }] }] }
              ]
            }
          ]
        },
        issuetype: { name: 'Epic' },
        priority: { name: 'Highest' },
        labels: ['checkout', 'conversion', 'q2-initiative'],
        components: [{ name: 'checkout' }]
      }
    },
    {
      fields: {
        project: { key },
        summary: 'Implement single-page checkout layout with collapsible sections',
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Replace the current 5-step multi-page checkout with a single scrollable page. Each section (Shipping, Billing, Payment, Review) should be a collapsible accordion. Completing a section auto-expands the next one.'
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Acceptance Criteria' }]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All checkout sections render on a single page' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Completing shipping auto-expands billing section' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Order summary sidebar is always visible on desktop (stacks on mobile)' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page loads in < 2 seconds on 3G' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Layout stacks vertically on screens < 768px; tap targets >= 44px' }] }] }
              ]
            }
          ]
        },
        issuetype: { name: 'Story' },
        priority: { name: 'High' },
        labels: ['checkout', 'frontend', 'ux'],
        components: [{ name: 'checkout' }, { name: 'frontend' }]
      }
    },
    {
      fields: {
        project: { key },
        summary: 'Add guest checkout flow with optional post-purchase account creation',
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Allow users to complete a purchase without creating an account. Only require email address for order confirmation. After successful purchase, offer a one-click account creation option on the confirmation page.'
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Acceptance Criteria' }]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'User can complete checkout without logging in or signing up' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Only email is required (no password) for guest checkout' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Email receipt is sent to guest users after purchase' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Confirmation page offers "Create account to track your order" with pre-filled email' }] }] }
              ]
            }
          ]
        },
        issuetype: { name: 'Story' },
        priority: { name: 'High' },
        labels: ['checkout', 'auth', 'conversion'],
        components: [{ name: 'checkout' }, { name: 'auth' }]
      }
    },
    {
      fields: {
        project: { key },
        summary: 'Integrate Apple Pay and Google Pay express payment options',
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Add Apple Pay and Google Pay buttons above the fold on the checkout page using the Stripe Payment Request API (v3). Buttons should only appear on supported devices/browsers. Express payments should skip the manual payment form entirely.'
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Acceptance Criteria' }]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Apple Pay button renders on Safari (macOS/iOS) with Touch ID or Face ID' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Google Pay button renders on Chrome with saved payment methods' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Express pay bypasses manual card entry form' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Graceful fallback when neither is available (buttons hidden, no errors)' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stripe SDK upgraded to v3 with Payment Request API integration' }] }] }
              ]
            }
          ]
        },
        issuetype: { name: 'Story' },
        priority: { name: 'Medium' },
        labels: ['checkout', 'payments', 'stripe'],
        components: [{ name: 'checkout' }, { name: 'payments' }]
      }
    },
    {
      fields: {
        project: { key },
        summary: 'Set up real-time shipping rate calculation API endpoint',
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Create a backend API endpoint that accepts a zip/postal code and cart contents, then returns available shipping options with rates from ShipEngine. The frontend will call this as soon as the user enters their zip code to show shipping costs early in the flow.'
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Acceptance Criteria' }]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'POST /api/shipping/rates accepts { zipCode, cartItems } and returns shipping options' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Response includes carrier name, service level, estimated delivery date, and price' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Response time < 2 seconds for domestic US addresses' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rates are cached for 15 minutes per zip+cart combination' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ShipEngine API errors return a user-friendly fallback message' }] }] }
              ]
            }
          ]
        },
        issuetype: { name: 'Task' },
        priority: { name: 'Medium' },
        labels: ['checkout', 'backend', 'shipping'],
        components: [{ name: 'backend' }, { name: 'shipping' }]
      }
    }
  ];
}
