# Show HN: Forecaster Arena

---

## 📋 HackerNews Submission Guide

HackerNews has a unique culture. This is a technical, skeptical audience that values honesty over hype. They'll ask hard questions and poke holes. That's good—it makes your project better.

---

## 🎯 Title Options (Choose One)

HackerNews titles should be factual, not salesy. Format: "Show HN: [Name] – [What it does]"

### Option 1 (Recommended):
**Show HN: Forecaster Arena – Testing LLMs on future events using prediction markets**

### Option 2:
**Show HN: Forecaster Arena – LLM benchmark using real prediction markets as ground truth**

### Option 3:
**Show HN: Testing which LLM is the best forecaster using Polymarket**

### Option 4 (More technical):
**Show HN: Solving LLM benchmark contamination by testing on future events**

**Rules:**
- Keep it under 80 characters
- No "I made" or "I built" in title (save for comment)
- No marketing language ("revolutionary", "game-changing", etc.)
- Be specific about what it does
- Honest, not salesy

---

## 💬 First Comment (Post This Immediately)

**Why the first comment matters:**
HN culture expects the creator to add context in the first comment. Post this within 60 seconds of submitting.

---

### Recommended First Comment:

```
Hey HN! I'm the author.

I built this because I was frustrated with LLM benchmarks potentially being contaminated by training data. When a model scores 95% on MMLU, we can't tell if that's genuine reasoning or memorization.

Forecaster Arena solves this by testing models on events that haven't happened yet—real prediction markets from Polymarket. The ground truth is reality itself, weeks or months later.

How it works:
• 7 frontier LLMs (GPT-5.1, Claude Opus 4.5, Gemini, Grok, DeepSeek, etc.)
• Each gets $10k virtual capital weekly
• They bet on 500+ real prediction markets
• Bet size = confidence (larger bet = more confident)
• We measure calibration (Brier score) + returns (P/L)

Currently running first cohort (started Dec 7). No markets have resolved yet, so no results to share—just showing the system is live and working. First resolutions expected over next few weeks.

Everything is open source (MIT): https://github.com/[your-username]/forecasterarena

Technical stack: Next.js, TypeScript, SQLite, better-sqlite3. Cron jobs via OpenRouter API for LLM calls. All decisions logged with full prompts/responses for reproducibility.

Happy to answer questions about the methodology, implementation, or trade-offs I made!
```

---

## 🎯 Alternative First Comments (Choose Based on Mood)

### If You Want to Emphasize the Problem:
```
Built this to solve a problem that's been bugging me: how do you test LLM reasoning without risking data contamination?

Traditional benchmarks (MMLU, HumanEval, etc.) might be in training data. We can't tell memorization from understanding.

My solution: test on future events using real prediction markets. Models make forecasts, reality judges them later. Can't fake that.

Currently live with 7 models, 666 markets tracked. First cohort running now, resolutions pending.

Fully open source. Architecture is straightforward—Next.js + SQLite + OpenRouter API. Designed for academic reproducibility.

Code: https://github.com/[your-username]/forecasterarena
Live: https://forecasterarena.com

What would you want to see tested? Curious about feedback on methodology.
```

### If You Want to Emphasize Technical Choices:
```
This is a benchmark that tests LLMs on prediction markets—events that haven't happened yet, so they can't be in training data.

Some technical decisions that might interest HN:

• SQLite for everything (sufficient for single-server research platform)
• OpenRouter as unified API (access to 7 different models)
• Atomic transactions for all multi-table operations (prevents race conditions with concurrent cron jobs)
• Temperature=0 for reproducibility
• Complete audit trail (every prompt, response, and trade logged)

Trade-offs I made:
• Paper trading (not real money) - safer, but less skin in the game
• Weekly decisions (not continuous) - cheaper, but misses timing
• Top 500 markets only (not all) - manageable context window
• Single server (not distributed) - simpler, but limited scale

First cohort launched Dec 7. Watching how models behave when they can't memorize answers.

Code: https://github.com/[your-username]/forecasterarena
Methodology: https://forecasterarena.com/methodology

Open to feedback on architecture or methodology improvements.
```

---

## ⚠️ Expected HN Reactions & How to Respond

### "This isn't new, [X] did something similar"
**Response:**
"Thanks for the pointer! I wasn't aware of [X]. How does their approach differ in terms of [specific aspect]? Always interested in related work."

**DON'T:**
Get defensive or argue why yours is better. HN hates that.

---

### "Why Polymarket? Seems biased/unreliable"
**Response:**
"Fair criticism. I chose Polymarket because:
1. Real liquidity (not synthetic)
2. Public API, no auth required
3. Clear resolution criteria
4. Outcomes determined by reality, not judgment

What alternative would you suggest? Genuinely curious about other prediction market sources."

---

### "Why paper trading? This isn't realistic"
**Response:**
"You're right that real money changes incentives. I went with paper trading because:
1. Research project, not production system
2. Can test multiple models without 7x costs
3. Focus is on forecasting ability, not risk tolerance

Real trading would be more authentic though. Might be interesting to explore with real API integration later."

---

### "Temperature=0? That's not how these models are meant to be used"
**Response:**
"Good point. I chose temperature=0 for reproducibility—same inputs should give same outputs for peer review.

Would be interesting to test with temperature > 0 though. Might capture epistemic uncertainty better. Could be a v2 improvement."

---

### "This will just show which model is best at gaming prediction markets"
**Response:**
"Interesting take. How would you distinguish 'gaming markets' from 'good forecasting'?

If a model consistently predicts real-world outcomes accurately, does it matter if it's 'gaming' vs 'reasoning'? Genuinely curious about your definition."

---

### "Sample size is too small / not statistically significant"
**Response:**
"Agreed! First cohort is definitely not enough for statistical significance. That's why the methodology includes multiple cohorts over time.

Goal is to accumulate data across different market regimes. What sample size would you consider sufficient? Planning the research timeline."

---

### "Why SQLite? This won't scale"
**Response:**
"Fair question. For a single-server research benchmark with ~7 models and weekly decisions, SQLite is plenty. Simple, self-contained, fast reads for analytics.

If this needed to scale to hundreds of models or real-time trading, PostgreSQL would make more sense. But right now, over-engineering would be premature optimization.

What would be your threshold for switching?"

---

### "This is just measuring which model gets lucky"
**Response:**
"That's exactly why we track Brier score (calibration) in addition to returns.

A lucky model would have high returns but poor calibration. A good forecaster should have both good calibration AND positive returns.

Also why multiple cohorts matter—luck regresses to mean, skill persists."

---

### "The models don't have real incentives, so this is meaningless"
**Response:**
"True, no real incentives. But the question I'm trying to answer is: which model's probability estimates best match reality?

If you're using an LLM to help make decisions (investment, planning, etc.), you want calibrated forecasts. Real incentives would be interesting to add though.

How would you test forecasting ability with better incentive alignment?"

---

### "You should add [feature X]"
**Response:**
"Interesting idea! How would that improve the benchmark?

Always open to methodology improvements. The challenge is balancing comprehensiveness with simplicity/reproducibility."

**DON'T:**
Promise to add it immediately or dismiss it. HN respects thoughtful consideration.

---

## 🎯 How to Get on Front Page

HN's algorithm is complex, but these help:

### DO:
✅ Post Tuesday-Thursday, 8-11 AM PT (when moderators are active)
✅ Respond to EVERY comment thoughtfully
✅ Admit limitations honestly
✅ Be humble ("I built this to learn" not "This solves everything")
✅ Engage with criticism constructively
✅ Thank people for feedback
✅ Add technical depth in comments

### DON'T:
❌ Get defensive
❌ Argue with critics
❌ Ask for upvotes (auto-penalized)
❌ Post on weekends (lower activity)
❌ Use marketing language
❌ Ignore critical comments
❌ Edit title after posting (can get penalized)

---

## ⏰ Timing Strategy

**Best Times:**
- **Tuesday-Thursday**: 8-10 AM Pacific Time
- **Avoid**: Weekends, Mondays, Fridays after 2 PM

**Why Morning:**
- Moderators are active (can help with visibility)
- More users online
- More time to climb before evening traffic

**Plan:**
- Post at exactly 9:00 AM PT
- First comment within 60 seconds
- Monitor for first hour
- Respond to all comments within 2 hours

---

## 📊 Success Metrics for HN

### Great Outcome:
- 100+ points
- Front page for 4+ hours
- 50+ comments
- Substantive technical discussion
- 2-3 potential collaborators
- Constructive criticism to improve project

### Good Outcome:
- 50+ points
- Front page for 1-2 hours
- 20+ comments
- Some technical feedback
- GitHub stars increasing

### Okay Outcome:
- 20+ points
- New page visibility
- 10+ comments
- Learning experience

**Remember**: Even if it doesn't hit front page, HN has serious technical folks. One good connection is worth more than 1000 upvotes.

---

## 🚨 What If It Gets Critical?

HN users are famously critical. That's actually good—they're helping you improve.

### If Comment is Harsh:
1. Read it twice (don't react immediately)
2. Find the kernel of truth
3. Respond to that truth
4. Thank them for feedback
5. Don't take it personally

### If You Made a Mistake:
1. Admit it plainly ("You're right, I missed that")
2. Explain why you made that choice
3. Say how you'll fix it (if you will)
4. Thank them for catching it

**HN respects:**
- Honesty
- Humility
- Technical depth
- Admitting mistakes
- Learning in public

**HN hates:**
- Marketing speak
- Defensiveness
- Ignoring criticism
- Over-promising
- Fake humility

---

## 📝 Sample Comment Responses

### Someone Points Out a Bug:
"Oh wow, good catch! I hadn't considered [X]. Let me look into that.

Filed an issue: [link]. Will update when fixed.

Thanks for the thorough review!"

---

### Technical Question About Implementation:
"Great question. I chose [X] because [Y].

The trade-off is [Z], which I accepted because [reason].

Would [alternative] be better in your view? Curious about your reasoning."

---

### Skepticism About Premise:
"Fair skepticism. You're right that [their point].

The way I'm thinking about it is [your reasoning].

But I could be wrong! Part of why I'm sharing early—to get feedback on methodology before investing more time.

What would convince you this approach has merit?"

---

### Comparison to Other Work:
"Thanks for the link! I'll check out [their work].

From quick skim, looks like they focus on [X] while mine focuses on [Y]. Complementary approaches maybe?

Would be interesting to compare results if methodologies overlap."

---

## 🎁 Bonus: Guidelines for Karma

**HN Karma Tips:**
- Thoughtful > quick responses
- Questions > statements
- Admit when wrong
- Give credit to others
- Don't argue, explore
- Technical depth matters
- Be genuinely curious

**Quick Test Before Posting Comment:**
- Is this adding value?
- Am I being defensive?
- Would I want to read this?
- Is this respectful?

---

## 📋 Pre-Post Checklist

Before clicking "submit" on HN:

- [ ] Title follows format (under 80 chars)
- [ ] First comment drafted and ready
- [ ] Website is fast and working
- [ ] GitHub repo is public
- [ ] README is clear
- [ ] You're ready to respond for 2+ hours
- [ ] It's Tuesday-Thursday 8-11 AM PT
- [ ] You've read HN guidelines: https://news.ycombinator.com/newsguidelines.html

---

## 🔗 URLs to Post

**Submission URL**: https://forecasterarena.com

**In First Comment:**
- Code: https://github.com/[your-username]/forecasterarena
- Methodology: https://forecasterarena.com/methodology
- Live benchmark: https://forecasterarena.com

---

## 💡 What Makes a Good Show HN

From YC's own guidelines and successful posts:

**Good:**
- Solves a real problem you had
- Technical depth visible
- Open source + explained
- Honest about limitations
- Working prototype
- Novel approach to known problem

**Bad:**
- Pure marketing
- Vaporware
- Solving non-problems
- Over-hyped claims
- Closed source "look at my thing"
- Derivative work without credit

**Your Project:**
✅ Solves real problem (benchmark contamination)
✅ Technical and well-documented
✅ Open source (MIT)
✅ Working (first cohort live)
✅ Novel approach (future events as test)

You're in good shape!

---

## 🎯 Special HN Considerations

### If a YC Founder Comments:
- Be extra thoughtful
- Don't fanboy
- Engage technically
- They might be interested in collaborating

### If It Gets Flagged:
- Don't panic
- Email hn@ycombinator.com politely
- Ask if something violated guidelines
- Usually gets unflagged if legitimate

### If Moderators Edit Your Title:
- They're helping you
- Their edit is usually better
- Don't complain
- Accept gracefully

### If You Get "Dang'd":
- Dang (Daniel Gackle) is lead moderator
- He only comments to help or course-correct
- If he comments on your thread, read carefully
- He's fair and trying to keep discussion healthy

---

## 📖 Must-Read Before Posting

**HN Guidelines**: https://news.ycombinator.com/newsguidelines.html

**Key Points:**
- Intellectual curiosity matters
- Substantive > shallow
- Kind > snarky (well, try to be)
- No voting rings (don't ask friends to upvote)
- No duplicate submissions
- No editorializing titles

---

## 🎊 After Posting

### First Hour:
- Monitor every comment
- Respond thoughtfully
- Don't refresh obsessively (but you will)
- Keep responses substantive

### If It's Going Well:
- Keep engaging
- Don't get cocky
- Stay humble
- Thank people

### If It's Not Getting Traction:
- Don't delete and repost (against rules)
- Engage with commenters you do get
- Learn from feedback
- Maybe timing was off
- Maybe HN isn't your audience
- That's okay!

---

## 💬 Example Thread (How It Might Go)

**Post**: Title + your first comment

**User1**: "Why not use [alternative approach]?"
**You**: "Good question! I considered [X] but chose [Y] because [Z]. Would [X] be better in your view?"

**User2**: "This seems like it'll just measure which model is luckiest"
**You**: "Fair point! That's why we track Brier score (calibration) separately from returns. And why multiple cohorts matter—luck regresses, skill persists. But you're right that one cohort isn't enough for statistical significance."

**User3**: "Cool idea! Have you considered [feature]?"
**You**: "Interesting! How would that improve the benchmark? Always open to methodology improvements."

**User4**: "Here's a bug in your code: [link]"
**You**: "Oh wow, good catch! Filed issue: [link]. Thanks for the review!"

**Tone**: Curious, humble, grateful, technical

---

## 🚀 Final Checklist

- [ ] Title is factual and < 80 chars
- [ ] First comment ready (add context, not marketing)
- [ ] Website works on mobile
- [ ] GitHub README is clear
- [ ] You can commit 2+ hours to respond
- [ ] It's a Tuesday-Thursday morning PT
- [ ] You're mentally prepared for criticism
- [ ] You've read this entire guide
- [ ] Deep breath—you got this!

---

## 🎯 Remember

HN is not Twitter. HN is not LinkedIn.

**HN culture values:**
- Substance over style
- Honesty over hype
- Depth over breadth
- Learning over promoting
- Humility over confidence

**Your goal isn't karma. It's to:**
1. Get thoughtful feedback
2. Find potential collaborators
3. Improve your methodology
4. Learn from smart people
5. Share something useful

If you do those well, karma follows.

---

**Good luck! HN can be tough but fair. You've built something interesting. Trust the work.** 🚀

---

**Last Updated**: December 11, 2025
**Recommended Post Time**: Tuesday-Thursday, 8-11 AM Pacific
**Next Steps**: Wait for right timing → Post → First comment within 60s → Engage thoughtfully
