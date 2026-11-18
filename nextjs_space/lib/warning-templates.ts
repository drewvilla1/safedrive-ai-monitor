/**
 * Samsung-style safety warning templates.
 * Voice: calm, brief, non-alarming, respectful.
 */
export const WARNING_TEMPLATES = [
  // Severity 1 — gentle reminder
  {
    category: 'gentle_reminder',
    severity: 1,
    texts: [
      'Please keep your eyes on the road.',
      'Your attention is needed on driving.',
      'For your safety, please minimize phone interaction.',
      'Stay focused — your safety matters.',
      'Please return your attention to driving.',
    ],
  },
  // Severity 2 — firm warning
  {
    category: 'firm_warning',
    severity: 2,
    texts: [
      'Continued phone use detected. Please stop for your safety.',
      'Multiple distractions detected. Please put your phone down.',
      'Your driving requires full attention right now.',
      'Repeated phone interaction detected. Please focus on the road.',
    ],
  },
  // Severity 3 — escalation notice
  {
    category: 'escalation_notice',
    severity: 3,
    texts: [
      'This event has been flagged for safety review.',
      'Persistent distraction detected. A safety reviewer will be notified.',
      'This driving session has been escalated for human review.',
    ],
  },
];

export function pickWarning(severity: number): { category: string; text: string; severity: number } {
  const tier = WARNING_TEMPLATES.find((t) => t.severity === severity) ?? WARNING_TEMPLATES[0];
  const texts = tier?.texts ?? ['Please focus on driving.'];
  const text = texts[Math.floor(Math.random() * texts.length)] ?? texts[0] ?? 'Please focus on driving.';
  return { category: tier?.category ?? 'gentle_reminder', text: text ?? '', severity: tier?.severity ?? 1 };
}

export function getSeverityFromScore(score: number): number {
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  return 1;
}
