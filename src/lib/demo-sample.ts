import { Clip } from '@/types';

export const DEMO_SAMPLE_VIDEO_ID = 'dQw4w9WgXcQ';
export const DEMO_SAMPLE_TOTAL_DURATION = 360; // 6 minutes

export const DEMO_SAMPLE_CLIPS: Clip[] = [
  {
    id: 'demo-clip-1',
    title: 'Why Most Startups Die Before Their First 100 Customers',
    start_sec: 14,
    end_sec: 42,
    hook_type: 'question',
    scores: {
      hook: 96,
      emotion: 88,
      standalone_clarity: 94,
      overall: 93,
    },
    reason:
      'Opens with a provocative existential question that immediately halts scrolling. Delivers an actionable diagnosis in under 30 seconds.',
    trigger_quote:
      'The single biggest lie in entrepreneurship is that if you build something great, people will naturally find you.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
  {
    id: 'demo-clip-2',
    title: 'Stop Building 10 Features For Your MVP',
    start_sec: 68,
    end_sec: 94,
    hook_type: 'contrarian',
    scores: {
      hook: 94,
      emotion: 85,
      standalone_clarity: 92,
      overall: 91,
    },
    reason:
      'Directly attacks standard developer behavior with counter-intuitive advice that resonates with builders.',
    trigger_quote:
      'If you are not embarrassed by the first version of your product, you shipped too late.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
  {
    id: 'demo-clip-3',
    title: 'The 80/20 Rule of High-Converting Landing Pages',
    start_sec: 120,
    end_sec: 151,
    hook_type: 'stat',
    scores: {
      hook: 89,
      emotion: 78,
      standalone_clarity: 90,
      overall: 87,
    },
    reason:
      'Grounds the advice in quantifiable metrics that promise immediate conversion improvements.',
    trigger_quote:
      '84 percent of visitors bounce in the first 3 seconds because your headline explains the mechanism instead of the outcome.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
  {
    id: 'demo-clip-4',
    title: 'You Are Building for Everyone, Which Means No One',
    start_sec: 185,
    end_sec: 218,
    hook_type: 'bold claim',
    scores: {
      hook: 88,
      emotion: 82,
      standalone_clarity: 86,
      overall: 85,
    },
    reason:
      'Strong polarizing claim that forces the viewer to choose a side and reflect on their positioning.',
    trigger_quote:
      'A niche of 1,000 obsessed people beats an audience of 100,000 lukewarm followers every single time.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
  {
    id: 'demo-clip-5',
    title: 'What Happens When You Delete 80% of Your Code?',
    start_sec: 240,
    end_sec: 268,
    hook_type: 'question',
    scores: {
      hook: 87,
      emotion: 79,
      standalone_clarity: 85,
      overall: 84,
    },
    reason:
      'Curiosity loop highlighting radical simplification that drives rapid iteration speed.',
    trigger_quote:
      'Every line of code you write is a liability. The best engineers delete more code than they commit.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
  {
    id: 'demo-clip-6',
    title: 'How We Survived Near Bankruptcy in Year Two',
    start_sec: 310,
    end_sec: 355,
    hook_type: 'story',
    scores: {
      hook: 74,
      emotion: 88,
      standalone_clarity: 78,
      overall: 79,
    },
    reason:
      'Emotional narrative storytelling explaining a raw founder turnaround moment.',
    trigger_quote:
      'With two weeks of payroll left in the bank, we had to make the hardest phone call of our lives.',
    totalVideoDuration: DEMO_SAMPLE_TOTAL_DURATION,
  },
];

export const DEMO_SAMPLE_TRANSCRIPT = `[00:00] Welcome everyone. Today we are unpacking why most startups fail in their first year.
[00:14] The single biggest lie in entrepreneurship is that if you build something great, people will naturally find you.
[00:30] Distribution is not an afterthought; it is the entire business model from day zero.
[00:45] Let's look at how early teams waste months building before ever speaking to a user.
[01:08] Stop building 10 features for your MVP. If you are not embarrassed by the first version of your product, you shipped too late.
[01:30] Pick one singular problem, solve it five times better than anyone else, and charge for it immediately.
[02:00] 84 percent of visitors bounce in the first 3 seconds because your headline explains the mechanism instead of the outcome.
[02:25] When your landing page says "AI-driven unified productivity platform", zero human beings understand what that means.
[03:05] You are building for everyone, which means no one. A niche of 1,000 obsessed people beats an audience of 100,000 lukewarm followers every single time.
[04:00] What happens when you delete 80% of your code? Every line of code you write is a liability. The best engineers delete more code than they commit.
[05:10] How we survived near bankruptcy in year two: with two weeks of payroll left in the bank, we had to make the hardest phone call of our lives.`;

