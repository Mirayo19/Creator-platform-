/**
 * SAMPLE DATA — fictional posts and metrics for demonstrating the product.
 * Rows are written with is_sample=true and labelled "Sample" throughout the UI.
 * [daysAgo, content, likes, comments, reposts, impressions]
 */
export const SAMPLE_POSTS: [number, string, number, number, number, number | null][] = [
  [150, "I spent 3 years building AI demos nobody used.\n\nThe day I started asking 'who is this for?' before writing a line of code, everything changed.\n\nStart with the person. The model comes second.", 412, 58, 77, 31200],
  [143, "Hot take: most AI wrappers die because they solve a feature, not a workflow.\n\nWhat's the last AI tool you used for more than a week?", 188, 94, 21, 22800],
  [136, "5 AI tools I use every day:\n\n1. Claude for drafting\n2. Perplexity for research\n3. Granola for meetings\n4. Cursor for code\n5. Raycast for everything else", 96, 12, 9, 17400],
  [129, "We shipped a feature on Friday. Broke production on Saturday.\n\nHere's the boring checklist that now stops me from doing it again 🧵", 301, 41, 64, 26900],
  [122, "AI is changing everything. Exciting times ahead for builders!", 14, 1, 0, 6100],
  [115, "Unpopular opinion: your prompt isn't the problem. Your unclear thinking is.\n\nWrite the problem in plain words first. Then prompt.", 523, 71, 102, 38400],
  [108, "Why do founders keep building for investors instead of users?", 77, 63, 8, 14200],
  [101, "Reading list for people building with LLMs this quarter:\n\n- Evals, not vibes\n- Latency budgets\n- Cost per task, not cost per token", 144, 19, 31, 19800],
  [94, "My first customer paid me $29. I screenshotted the email and put it on my wall.\n\nTwo years later, that $29 taught me more than any funding round could.", 689, 97, 118, 47200],
  [87, "Check out my new post on AI productivity! Link in bio.", 9, 0, 1, 4800],
  [80, "The best onboarding I've seen this year had 3 screens and a single question.\n\nEvery extra screen is a reason to leave.", 266, 33, 49, 24100],
  [73, "What does 'AI-native' actually mean? I keep hearing it and nobody defines it.\n\nMy attempt: the product doesn't work without the model. Everything else is a feature.", 231, 112, 38, 27600],
  [66, "I rewrote our pricing page 11 times.\n\nVersion 11 had fewer words, one plan, and doubled conversions.\n\nSimplicity is a growth strategy.", 574, 66, 91, 41000],
  [59, "Some thoughts on the future of AI agents and how they might change work.", 22, 3, 2, 7300],
  [52, "Three questions I ask before adding any AI feature:\n\n1. Does it save real time?\n2. Can the user check the output?\n3. What happens when it's wrong?", 349, 52, 72, 33500],
  [45, "A user told me our product 'feels like it knows me'.\n\nIt wasn't magic. We just stopped showing everyone the same thing.", 402, 49, 66, 35800],
  [38, "Is anyone else tired of 'AI will replace you' threads?\n\nI'd rather read 'here is what I actually built this week'.", 167, 88, 17, 20900],
  [31, "Infrastructure is the boring part of AI that decides who wins.\n\nGPU supply, inference cost, data pipelines. Nobody tweets about it. Everybody depends on it.", 118, 14, 20, 15600],
  [24, "I deleted 40% of our features last month.\n\nSupport tickets dropped. Retention went up. The roadmap got shorter and clearer.", 611, 84, 107, 44500],
  [17, "New week. New ideas. Let's build!", 11, 2, 0, 3900],
  [10, "The mistake I see most in AI products: no way to say 'this is wrong'.\n\nFeedback loops are the product.", 276, 38, 44, 28300],
  [4, "Quick story: our best feature idea came from a support email that began 'sorry if this is dumb, but…'\n\nThere are no dumb questions. There are unread inboxes.", 458, 61, 73, null],
];

export const SAMPLE_COMMENTS: [number, string][] = [
  [1, "How do you decide who the product is for before you have users?"],
  [1, "This. I built three things nobody wanted. Painful lesson."],
  [2, "Disagree — wrappers with good distribution still win."],
  [2, "What's an example of a workflow product vs a feature, though?"],
  [6, "How do you structure the plain-words problem statement?"],
  [6, "Do you have a template for this? I'd pay for it."],
  [9, "Did you ever consider raising money earlier? Curious about the tradeoff."],
  [13, "What did version 11 actually say? Can you show before/after?"],
  [15, "How do you test the 'what happens when it's wrong' question in practice?"],
  [17, "Disagree, the replace-you threads are useful warnings, not noise."],
  [19, "Which features did you cut? I'm scared to do this with our product."],
  [19, "How did you know it wouldn't hurt retention before cutting?"],
];
