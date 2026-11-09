# Zero Gravity — Launch and Growth Playbook

## Positioning

**One-line promise:** See what your domain's public email-authentication DNS records show, understand the limits, and get a human-reviewed next-step report when you need one.

**Audience to start with:** owner-operated businesses, local service companies, small marketing agencies, web designers, MSPs, and email/CRM consultants who manage business domains.

**Do not claim:** guaranteed inbox placement, guaranteed revenue recovery, breach detection, legal compliance, mandatory status, customer counts, testimonials, certifications, or savings unless independently evidenced.

## Funnel

1. Discovery: useful search pages, educational posts, agency referrals, and founder-led outreach.
2. Proof: free read-only SPF / DMARC / MX snapshot. No email gate.
3. Understanding: show observed records, specific findings, and limitations in plain language.
4. Conversion: one-time $149 human-reviewed Domain Signals Review for one authorized domain.
5. Delivery: human-reviewed written report; separately agree any implementation scope.
6. Advocacy: ask for an honest review or share link only after the customer confirms the work was useful.

## Trust assets shipped in this release

- Free DNS preview without an email gate.
- Explicit read-only and authorization boundaries.
- Trust and scope page.
- How-it-works page.
- Plain-language SPF / DKIM / DMARC / MX educational guide.
- Privacy notice describing current data flows.
- Search metadata, sitemap, robots rules, and canonical Vercel URL.
- Share action with referral UTM parameters; no fake rewards or tracking claims.
- Operator-only paid-order report drafting in the private lead inbox; it generates evidence for human review and does not auto-send or mark an order delivered.

## Launch copy

### Short social post

Most businesses rely on email every day, but few owners know what their domain publishes about who is allowed to send it.

Zero Gravity now offers a free, read-only check of public SPF, DMARC and MX records. Enter a domain, see the observations, and read what the check cannot prove. No email gate. No DNS changes.

Try it: https://zero-gravity-smoky.vercel.app

### Founder post

I built Zero Gravity to make a technical subject easier for business owners to understand.

Start with a free public DNS snapshot. It checks for visible SPF, DMARC and MX records, explains the observations in plain language, and is honest about what DNS alone cannot tell you.

If you need more, the one-time Domain Signals Review is a human-reviewed report for one domain. No subscription and no changes to your DNS.

Try the free check: https://zero-gravity-smoky.vercel.app

### Agency / MSP partner introduction

Subject: A simple public DNS check your clients can use

Hi,

I run Zero Gravity, a small domain-signals review service from Wah-Lah. We have a free, read-only check for public SPF, DMARC and MX records that helps a business owner understand what is visible before deciding whether they need a deeper review.

It does not make DNS changes, claim to prove inbox placement, or replace your team's implementation work.

If this would be useful as an educational resource for your clients, feel free to share the link. I would also welcome feedback on what would make the output more useful for your workflow.

https://zero-gravity-smoky.vercel.app

### Customer referral ask

If this report helped you understand your domain more clearly, would you be comfortable sharing the free check with another business owner? There is no obligation, and we do not ask you to endorse anything you have not personally used.

## Channels and execution

### Search
- Submit the sitemap to Google Search Console and Bing Webmaster Tools after the production domain is finalized.
- Target specific educational searches: SPF lookup, DMARC check, MX record lookup, email authentication basics, and what a DMARC p=none policy means.
- Publish one useful, original guide each week. Do not generate thin near-duplicate SEO pages.
- Add real screenshots of the tool and anonymized findings only with customer permission.

### Founder-led social
- Publish the free check as the primary call to action.
- Use short explainers: one DNS concept, one example, one limitation, one link.
- Reuse each guide as a LinkedIn post, Facebook post, short video script, and email to opted-in contacts.
- Reply to genuine questions; never buy followers, fake engagement, scrape personal contact lists, or mass-DM people.

### Partners
- Approach web design agencies, MSPs, email marketing consultants, CRM implementers, and local business groups.
- Offer an educational resource, not an undisclosed commission.
- Add a tracked partner program only after attribution, reward terms, fraud controls, and tax/accounting handling are implemented.

### Reviews and referrals
- Ask every completed customer for candid feedback, including negative feedback.
- Publish testimonials only with explicit permission and exact wording.
- Do not create star ratings, logos, case studies, or customer counts without evidence.
- Do not offer incentives for positive reviews. Any future referral reward must be disclosed and earned for a completed purchase, not for a positive review.

### Paid promotion
- Keep paid spend at $0 until the free-check-to-paid conversion rate and fulfillment capacity are measured.
- Test paid ads only after the landing page, customer support, report delivery, refund policy, and analytics are verified.

## Weekly operating scorecard

Track:
- Landing page visitors
- Free checks started and completed
- Valid DNS preview rate / DNS provider failures
- Checkout starts
- Verified live payments (not checkout link creations)
- Paid orders delivered
- Median time from verified payment to delivery
- Refunds and disputes
- Customer-reported usefulness
- Voluntary shares and partner referrals

Never count test-mode payments, checkout links, modeled revenue, or unverified leads as sales.

## Release blockers before broad promotion

1. Confirm and publish the real production domain. Current Vercel project domain inventory must be rechecked before replacing the temporary Vercel URL in metadata and marketing links.
2. Define the exact report deliverable, owner, delivery deadline, refund/cancellation policy, and customer support process.
3. Run one genuine low-risk live purchase and verify the Stripe webhook, lead inbox, receipt, report fulfillment, and bank payout reconciliation.
4. Connect the intended social profiles to Metricool before scheduling posts.
5. Confirm privacy, terms, and refund wording with the business owner and qualified counsel as appropriate.
6. Verify the public free check on production and test invalid-domain, provider-failure, rate-limit, mobile and desktop states.

## First-week campaign cadence

- Day 1: founder launch post + free-check demo.
- Day 2: SPF explainer with a real, anonymized DNS example.
- Day 3: DMARC p=none vs quarantine vs reject explainer, emphasizing safe rollout.
- Day 4: partner introduction to five relevant agencies/consultants individually.
- Day 5: MX and mail-routing explainer.
- Day 6: customer questions / FAQ post based on actual questions received.
- Day 7: publish a transparent build-in-public update with real usage and conversion numbers only.

## Guardrails

Growth must be earned by usefulness and verifiable delivery. Do not make Zero Gravity sound legally mandatory. Email authentication is a worthwhile operational and security practice, but it is not universally mandated for every business in every circumstance. Do not imply that Zero Gravity is affiliated with Google, Microsoft, Stripe, Cloudflare, or any regulator.


### Custom domain status
Vercel has the custom domain zero-gravity.wah-lah.com attached to this project, but public Cloudflare DNS currently returns NXDOMAIN for A, AAAA and CNAME. Vercel recommends a CNAME for host zero-gravity pointing to eeff82cf4a8be6da.vercel-dns-017.com. Add that record in the Cloudflare zone, then verify public DNS and HTTPS before switching canonical URLs or advertising the custom domain. The temporary production URL remains https://zero-gravity-smoky.vercel.app.
