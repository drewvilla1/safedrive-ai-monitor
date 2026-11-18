import {
  Shield, Eye, Lock, Users, Scale, AlertTriangle,
  Heart, FileText, Database, UserCheck, Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    icon: Eye,
    title: 'Privacy & Data Minimization',
    description: 'What data is collected and how it is handled',
    items: [
      'The system collects only the minimum signals required for distraction detection: phone interaction state, screen status, gaze direction, and basic vehicle telematics.',
      'Raw device data remains on the phone whenever possible. Only structured event records (not raw sensor data) are transmitted for scoring.',
      'Personal information such as message content, app names, contacts, or browsing history is never accessed or stored.',
      'Data retention follows Samsung\'s data minimization policies. Event records are retained only for the duration of the pilot evaluation period.',
      'All data in this proof of concept is synthetic. No real driver data has been collected or used.',
    ],
  },
  {
    icon: UserCheck,
    title: 'Consent & Transparency',
    description: 'How participants are informed and their rights',
    items: [
      'Drivers must provide explicit opt-in consent before the monitoring system is activated on their device.',
      'A clear explanation of what the system monitors, how it works, and what actions it may take is provided during onboarding.',
      'Drivers can opt out of the system at any time without penalty.',
      'All warnings and notifications clearly identify themselves as AI-generated safety suggestions, not disciplinary actions.',
      'The system\'s limitations and accuracy rates are communicated upfront to all stakeholders.',
    ],
  },
  {
    icon: Scale,
    title: 'Bias & Fairness',
    description: 'How the system addresses potential biases',
    items: [
      'The scoring algorithm uses objective, measurable signals (phone interaction, vehicle speed, gaze direction) rather than subjective assessments.',
      'The system accounts for legitimate phone use scenarios: passenger interaction, stopped vehicles, and hands-free operation.',
      'False positive and false negative rates are tracked across all driver demographics to identify potential disparities.',
      'Regular audits of warning distribution are conducted to ensure no group receives a disproportionate number of alerts.',
      'Ground truth labeling includes scenario context to prevent bias in the evaluation metrics.',
    ],
  },
  {
    icon: Users,
    title: 'Human Oversight',
    description: 'Where human judgment takes priority over AI',
    items: [
      'The AI system cannot independently impose penalties, fines, or disciplinary actions on any driver.',
      'All escalated cases require human review before any action beyond the initial safety warning is taken.',
      'Human reviewers have full access to the event record, risk factors, and confidence scores to make informed decisions.',
      'Reviewers can override, dismiss, or modify any AI-generated assessment or recommendation.',
      'The three-tier delegation model (Sensing → Risk Assessment → Escalation Review) ensures increasing human involvement as consequences grow.',
      'Model performance thresholds are set by human operators, not by the AI system itself.',
    ],
  },
  {
    icon: Brain,
    title: 'AI Limitations & Uncertainty',
    description: 'What the system cannot do and how uncertainty is handled',
    items: [
      'The AI may produce false positives (warning when no distraction exists) or false negatives (missing a genuine distraction).',
      'Missing data signals (e.g., unavailable speed or gaze data) reduce the confidence score rather than inflating the risk score.',
      'Events with low confidence scores are closed without issuing warnings to minimize unnecessary alerts.',
      'The system cannot determine the intent behind phone use — it assesses behavioral signals only.',
      'Edge cases (unusual driving conditions, device malfunctions, accessibility needs) may not be fully captured by the model.',
      'All confidence intervals and uncertainty metrics are exposed in the review interface so human reviewers can account for them.',
    ],
  },
  {
    icon: Lock,
    title: 'Security & Access Control',
    description: 'How the system protects data and restricts access',
    items: [
      'All data transmission between the device and the safety monitoring system is encrypted.',
      'Access to the review dashboard is role-based: only authorized safety reviewers can view escalated cases.',
      'The AI system has limited permissions — it cannot access contacts, messages, photos, or other personal data on the device.',
      'Audit logs track all review actions, ensuring accountability for every human decision in the system.',
      'No data is shared with third parties outside the pilot program without explicit consent.',
    ],
  },
];

export default function EthicsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Ethics & Compliance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          How the SafeDrive AI Monitor addresses privacy, consent, bias, human oversight, and system limitations
        </p>
        <Badge variant="outline" className="mt-2 text-xs">
          ITAI4373 Group 6 — Samsung Distracted Driving Pilot
        </Badge>
      </div>

      {/* Framework reference */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Aligned with NIST AI Risk Management Framework</p>
              <p className="text-xs text-muted-foreground mt-1">
                This pilot follows NIST AI RMF guidance on governance, measurement, and risk management.
                The three-tier delegation model ensures that AI autonomy decreases as potential consequences increase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ethics sections */}
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription className="text-xs">{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(section.items ?? []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Synthetic Data Disclaimer</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                This proof of concept uses entirely synthetic (simulated) data.
                No real drivers, vehicles, or driving events are represented.
                All performance metrics, risk scores, and analytics displayed in this application
                are based on generated test scenarios and should not be interpreted as real-world safety claims.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
