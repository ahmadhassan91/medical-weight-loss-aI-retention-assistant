import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

export type LocationFilter = 'All Locations' | 'Centennial' | 'Salida';
export type RiskLevel = 'Clinical Review' | 'High Risk' | 'Moderate Risk' | 'Low Risk' | 'Do Not Automate';
export type Tone = 'Friendly' | 'Clinical' | 'Urgent';

export type Patient = {
  id: string;
  name: string;
  ageRange: string;
  location: 'Centennial' | 'Salida';
  program: string;
  status: string;
  risk: RiskLevel;
  riskScore: number;
  lastVisit: string;
  nextAppointment: string;
  lastCheckIn: string;
  missedAppointments: number;
  unreadMessages: number;
  refillStatus: string;
  consent: string;
  coach: string;
  provider: string;
  reason: string;
  recommendedAction: string;
  opportunity: number;
  escalationReason?: string;
  messages: Message[];
};

export type Message = {
  id: string;
  sender: 'patient' | 'clinic' | 'ai';
  body: string;
  time: string;
};

export type Metric = {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
  tone: 'green' | 'amber' | 'red' | 'blue' | 'slate';
};

export const locations: LocationFilter[] = ['All Locations', 'Centennial', 'Salida'];

export const patients: Patient[] = [
  {
    id: 'PT-1042',
    name: 'Maya R.',
    ageRange: '35-44',
    location: 'Centennial',
    program: 'GLP-1 + nutrition coaching',
    status: 'Clinical Review',
    risk: 'Clinical Review',
    riskScore: 94,
    lastVisit: 'May 10',
    nextAppointment: 'Not scheduled',
    lastCheckIn: '14 days ago',
    missedAppointments: 1,
    unreadMessages: 2,
    refillStatus: 'Overdue',
    consent: 'Opted in',
    coach: 'Elena P.',
    provider: 'Dr. Wallace',
    reason: 'Reported nausea and dizziness after missing refill review.',
    recommendedAction: 'Escalate to provider before sending automated follow-up.',
    opportunity: 1280,
    escalationReason: 'Medication side effect language requires staff review.',
    messages: [
      {
        id: 'm1',
        sender: 'clinic',
        time: 'May 24, 9:12 AM',
        body: 'Hi Maya, we missed your refill review. Reply REVIEW and our care team can help find another time.',
      },
      {
        id: 'm2',
        sender: 'patient',
        time: 'May 25, 6:48 PM',
        body: 'I have felt nauseous and dizzy this week. I stopped taking it and was not sure who to call.',
      },
      {
        id: 'm3',
        sender: 'ai',
        time: 'Draft pending',
        body: 'Thanks for letting us know. A member of the care team should review this before next steps. If symptoms are urgent or severe, please seek emergency care or call 911.',
      },
    ],
  },
  {
    id: 'PT-1094',
    name: 'Jordan K.',
    ageRange: '45-54',
    location: 'Centennial',
    program: 'Maintenance coaching',
    status: 'At Risk',
    risk: 'High Risk',
    riskScore: 86,
    lastVisit: 'May 03',
    nextAppointment: 'Jun 07',
    lastCheckIn: '18 days ago',
    missedAppointments: 2,
    unreadMessages: 1,
    refillStatus: 'Current',
    consent: 'Opted in',
    coach: 'Marcus L.',
    provider: 'Dr. Wallace',
    reason: 'Two missed visits and no weekly check-in for 18 days.',
    recommendedAction: 'Send re-engagement SMS with reschedule link.',
    opportunity: 940,
    messages: [
      {
        id: 'j1',
        sender: 'clinic',
        time: 'May 19, 10:03 AM',
        body: 'Hi Jordan, we noticed you have not completed your weekly check-in yet. Reply CHECKIN and our team can follow up.',
      },
      {
        id: 'j2',
        sender: 'patient',
        time: 'May 23, 8:41 PM',
        body: 'I have been traveling and fell off the plan. I can come in next week if there is a morning spot.',
      },
      {
        id: 'j3',
        sender: 'ai',
        time: 'Draft pending',
        body: 'Hi Jordan, thanks for the update. We can help you restart without judgment. Reply MORNING and our team will send available check-in times for next week.',
      },
    ],
  },
  {
    id: 'PT-1130',
    name: 'Taylor S.',
    ageRange: '25-34',
    location: 'Salida',
    program: 'New intake',
    status: 'Missed Visit',
    risk: 'High Risk',
    riskScore: 79,
    lastVisit: 'Apr 29',
    nextAppointment: 'Not scheduled',
    lastCheckIn: '21 days ago',
    missedAppointments: 1,
    unreadMessages: 0,
    refillStatus: 'Unknown',
    consent: 'Opted in',
    coach: 'Nina A.',
    provider: 'Dr. Harris',
    reason: 'No-show after initial consult; no contact in 21 days.',
    recommendedAction: 'Send missed-visit recovery message.',
    opportunity: 760,
    messages: [
      {
        id: 't1',
        sender: 'clinic',
        time: 'May 13, 11:18 AM',
        body: 'Hi Taylor, we missed you at your recent appointment. Reply RESCHEDULE or call the clinic and we can help find another time.',
      },
      {
        id: 't2',
        sender: 'ai',
        time: 'Draft pending',
        body: 'Hi Taylor, we are checking in to see if you still want support with your plan. Reply RESCHEDULE and our team will help find a time that works.',
      },
    ],
  },
  {
    id: 'PT-1017',
    name: 'Alex B.',
    ageRange: '55-64',
    location: 'Salida',
    program: 'Nutrition coaching',
    status: 'Needs Follow-Up',
    risk: 'Moderate Risk',
    riskScore: 61,
    lastVisit: 'May 17',
    nextAppointment: 'Jun 04',
    lastCheckIn: '8 days ago',
    missedAppointments: 0,
    unreadMessages: 1,
    refillStatus: 'Due soon',
    consent: 'Needs confirmation',
    coach: 'Nina A.',
    provider: 'Dr. Harris',
    reason: 'Consent confirmation needed before automated outreach continues.',
    recommendedAction: 'Manual consent confirmation before re-engagement.',
    opportunity: 420,
    messages: [
      {
        id: 'a1',
        sender: 'patient',
        time: 'May 29, 5:20 PM',
        body: 'Can you remind me what texts I signed up for?',
      },
      {
        id: 'a2',
        sender: 'ai',
        time: 'Draft pending',
        body: 'Hi Alex, our team can confirm your communication preferences before any automated reminders continue.',
      },
    ],
  },
  {
    id: 'PT-1088',
    name: 'Samira N.',
    ageRange: '35-44',
    location: 'Centennial',
    program: 'Re-engagement',
    status: 'Opted Out',
    risk: 'Do Not Automate',
    riskScore: 72,
    lastVisit: 'Apr 22',
    nextAppointment: 'Not scheduled',
    lastCheckIn: '31 days ago',
    missedAppointments: 1,
    unreadMessages: 0,
    refillStatus: 'Unknown',
    consent: 'Opted out',
    coach: 'Elena P.',
    provider: 'Dr. Wallace',
    reason: 'Patient opted out of automated messages.',
    recommendedAction: 'Do not send automated outreach; manual call only if care-related.',
    opportunity: 0,
    messages: [
      {
        id: 's1',
        sender: 'clinic',
        time: 'May 18, 3:45 PM',
        body: 'You have been unsubscribed from automated messages from Comprehensive Medical Weight Loss.',
      },
    ],
  },
];

export const auditLog = [
  '09:12 - Risk score updated for PT-1042: Moderate to Clinical Review due to missed visit and symptom language.',
  '09:14 - Automated SMS drafted for PT-1094; pending staff approval.',
  '09:16 - Message blocked for PT-1088: patient opted out.',
  '09:20 - Clinical escalation created for PT-1042: reported nausea and dizziness.',
  '09:25 - Staff user demo_admin approved re-engagement message for PT-1094.',
  '09:31 - Consent status changed for PT-1017: needs confirmation.',
];

export const roiItems = [
  { label: 'Recovered appointments', value: '18', detail: 'Projected this month', icon: CalendarClock },
  { label: 'Admin hours saved', value: '42h', detail: 'Drafting + triage', icon: Clock },
  { label: 'Retention lift modeled', value: '27%', detail: 'Against standard workflow', icon: TrendingUp },
];

export const safetyNotes = [
  { icon: ShieldCheck, label: 'Synthetic demo data only' },
  { icon: ClipboardList, label: 'Staff approval before outreach' },
  { icon: FileText, label: 'Not a diagnostic tool' },
];

export const allMetricIcons = {
  users: Users,
  alert: AlertTriangle,
  message: MessageSquareText,
  clock: Clock,
  check: CircleCheck,
  map: MapPin,
};
