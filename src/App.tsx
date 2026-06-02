import { useMemo, useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  CalendarClock,
  CircleCheck,
  Clock,
  DollarSign,
  FileText,
  Gauge,
  PackageCheck,
  MapPin,
  MessageSquareText,
  Mic,
  Network,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';
import {
  auditLog,
  locations,
  patients,
  roiItems,
  safetyNotes,
  type LocationFilter,
  type Metric,
  type Patient,
  type RiskLevel,
  type Tone,
  type Message,
} from './data';

const toneDrafts: Record<Tone, string> = {
  Friendly:
    'Hi Jordan, thanks for the update. We can help you restart without judgment. Reply MORNING and our team will send available check-in times for next week.',
  Clinical:
    'Hi Jordan, thank you for the update. Reply MORNING and our care team can provide available follow-up times to support your next check-in.',
  Urgent:
    'Hi Jordan, we would like to help you reconnect with the care team this week. Reply MORNING and we will prioritize available check-in times.',
};

const riskClass: Record<RiskLevel, string> = {
  'Clinical Review': 'risk-red',
  'High Risk': 'risk-amber',
  'Moderate Risk': 'risk-blue',
  'Low Risk': 'risk-green',
  'Do Not Automate': 'risk-slate',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function App() {
  const [location, setLocation] = useState<LocationFilter>('All Locations');
  const [riskFilter, setRiskFilter] = useState<'All Risks' | RiskLevel>('All Risks');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('PT-1042');
  const [tone, setTone] = useState<Tone>('Friendly');
  const [draft, setDraft] = useState(toneDrafts.Friendly);
  const [sentCount, setSentCount] = useState(0);
  const [escalated, setEscalated] = useState(true);
  const [showSoap, setShowSoap] = useState(false);
  const [showFhir, setShowFhir] = useState(false);

  // Phase 3 States
  const [patientList, setPatientList] = useState<Patient[]>(patients);
  const [auditLogsList, setAuditLogsList] = useState<string[]>(auditLog);
  const [showIntakeForm, setShowIntakeForm] = useState(false);

  // Senior Accessibility States
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [activeTab, setActiveTab] = useState<'queue' | 'ops' | 'performance'>('queue');
  const [userRole, setUserRole] = useState<'coach' | 'provider'>('coach');

  // Voice SOAP dictation records state
  const [customSoapRecords, setCustomSoapRecords] = useState<Record<string, { subjective: string; assessment: string; plan: string }>>({});

  const handleVoiceScribeComplete = (patientId: string, subjective: string, assessment: string, plan: string) => {
    setCustomSoapRecords((prev) => ({
      ...prev,
      [patientId]: { subjective, assessment, plan },
    }));
  };

  const visiblePatients = useMemo(() => {
    return patientList.filter((patient) => {
      const locationMatch = location === 'All Locations' || patient.location === location;
      const riskMatch = riskFilter === 'All Risks' || patient.risk === riskFilter;
      const statusMatch = statusFilter === 'All Statuses' || patient.status === statusFilter;
      const normalizedQuery = query.trim().toLowerCase();
      const queryMatch =
        !normalizedQuery ||
        [patient.name, patient.id, patient.location, patient.program, patient.provider, patient.coach, patient.reason]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      return locationMatch && riskMatch && statusMatch && queryMatch;
    });
  }, [location, query, riskFilter, statusFilter, patientList]);

  const selectedPatient = useMemo(() => {
    const scoped = visiblePatients.find((patient) => patient.id === selectedId);
    return scoped ?? visiblePatients[0] ?? patientList[0];
  }, [selectedId, visiblePatients, patientList]);

  // Synchronize draft message when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      const aiMsg = selectedPatient.messages.find((m) => m.sender === 'ai');
      if (aiMsg) {
        setDraft(aiMsg.body);
      } else {
        setDraft(`Hi ${selectedPatient.name.split(' ')[0]}, this is Green Valley Weight Care checking in. How is your program going?`);
      }
      setEscalated(selectedPatient.risk === 'Clinical Review');
    }
  }, [selectedPatient]);

  const metrics = useMemo<Metric[]>(() => {
    const atRisk = visiblePatients.filter((patient) =>
      ['Clinical Review', 'High Risk', 'Moderate Risk', 'Do Not Automate'].includes(patient.risk),
    );
    const clinical = visiblePatients.filter((patient) => patient.risk === 'Clinical Review').length;
    const missed = visiblePatients.reduce((sum, patient) => sum + patient.missedAppointments, 0);
    const opportunity = visiblePatients.reduce((sum, patient) => sum + patient.opportunity, 0);

    return [
      {
        label: 'Active patients',
        value: String(visiblePatients.filter((patient) => patient.status !== 'Opted Out').length),
        sublabel: `${location} scope`,
        icon: Users,
        tone: 'green',
      },
      {
        label: 'Retention risk',
        value: String(atRisk.length),
        sublabel: `${clinical} clinical review`,
        icon: AlertTriangle,
        tone: clinical > 0 ? 'red' : 'amber',
      },
      {
        label: 'Missed visits',
        value: String(missed),
        sublabel: 'This operating week',
        icon: CalendarClock,
        tone: 'amber',
      },
      {
        label: 'Recovery opportunity',
        value: formatCurrency(opportunity),
        sublabel: 'Modeled monthly LTV',
        icon: TrendingUp,
        tone: 'blue',
      },
    ];
  }, [visiblePatients, location]);

  function changeTone(nextTone: Tone) {
    setTone(nextTone);
    if (selectedPatient) {
      // Create variations for current patient name to make it feel premium
      const firstName = selectedPatient.name.split(' ')[0];
      const drafts: Record<Tone, string> = {
        Friendly: `Hi ${firstName}, thanks for the update. We can help you restart without judgment. Reply MORNING and our team will send available check-in times for next week.`,
        Clinical: `Hi ${firstName}, thank you for the update. Reply MORNING and our care team can provide available follow-up times to support your next check-in.`,
        Urgent: `Hi ${firstName}, we would like to help you reconnect with the care team this week. Reply MORNING and we will prioritize available check-in times.`,
      };
      setDraft(drafts[nextTone]);
    } else {
      setDraft(toneDrafts[nextTone]);
    }
  }

  function approveDraft(patientId: string, currentDraft: string) {
    setPatientList((prevList) => {
      return prevList.map((p) => {
        if (p.id !== patientId) return p;
        
        // Remove AI draft if it exists
        const remainingMessages = p.messages.filter((m) => m.sender !== 'ai');
        
        const newMsg: Message = {
          id: `m-clinic-${Date.now()}`,
          sender: 'clinic',
          time: 'Just now',
          body: currentDraft,
        };

        const updatedScore = Math.max(15, p.riskScore - 15);
        const updatedRisk = updatedScore > 80 ? 'High Risk' : updatedScore > 50 ? 'Moderate Risk' : 'Low Risk';

        setAuditLogsList((prevLogs) => [
          `${new Date().toLocaleTimeString().substring(0, 5)} - Staff approved outreach message for ${p.id}.`,
          ...prevLogs,
        ]);

        return {
          ...p,
          messages: [...remainingMessages, newMsg],
          risk: p.risk === 'Clinical Review' ? 'Clinical Review' : updatedRisk,
          riskScore: updatedScore,
          recommendedAction: 'Outreach delivered. Awaiting reply.',
        };
      });
    });
    setSentCount((count) => count + 1);
  }

  function escalatePatient(patientId: string) {
    setPatientList((prevList) => {
      return prevList.map((p) => {
        if (p.id !== patientId) return p;

        setAuditLogsList((prevLogs) => [
          `${new Date().toLocaleTimeString().substring(0, 5)} - Clinical escalation triggered for ${p.id} (nausea side effects reported).`,
          ...prevLogs,
        ]);

        return {
          ...p,
          risk: 'Clinical Review',
          riskScore: 95,
          recommendedAction: 'Immediate provider clinical triage required.',
          escalationReason: 'Side-effect alert: Provider review requested.',
        };
      });
    });
    setEscalated(true);
    setShowSoap(true);
    setShowFhir(false);
  }

  const handleSendPatientMessage = (patientId: string, messageText: string) => {
    setPatientList((prevList) => {
      return prevList.map((p) => {
        if (p.id !== patientId) return p;

        const newMsg: Message = {
          id: `m-sim-${Date.now()}`,
          sender: 'patient',
          time: 'Just now',
          body: messageText,
        };

        const updatedMessages = [...p.messages, newMsg];

        let nextRisk = p.risk;
        let nextScore = p.riskScore;
        let nextAction = p.recommendedAction;
        let nextStatus = p.status;
        let escalationReason = p.escalationReason;
        let auditMsg = '';

        const text = messageText.toLowerCase();

        // 1. Side effects check
        if (
          text.includes('nausea') ||
          text.includes('dizzy') ||
          text.includes('sick') ||
          text.includes('pain') ||
          text.includes('vomit') ||
          text.includes('headache') ||
          text.includes('stomach') ||
          text.includes('symptom')
        ) {
          nextRisk = 'Clinical Review';
          nextScore = Math.max(nextScore, 95);
          nextAction = 'Immediate provider clinical triage required.';
          nextStatus = 'Clinical Review';
          escalationReason = `Reported symptoms: "${messageText}"`;
          auditMsg = `Clinical Review alert: Patient ${p.name} (${p.id}) reported side effects: "${messageText}". Route to Dr. Wallace MD immediately.`;
        }
        // 2. Non-adherence
        else if (
          text.includes('missed') ||
          text.includes('forgot') ||
          text.includes('skip') ||
          text.includes('skipped') ||
          text.includes('travel') ||
          text.includes('busy') ||
          text.includes('late') ||
          text.includes('vacation')
        ) {
          nextRisk = 'High Risk';
          nextScore = Math.max(nextScore, 85);
          nextAction = 'Send high-priority re-engagement SMS with schedule link.';
          nextStatus = 'At Risk';
          auditMsg = `Adherence warning: Patient ${p.name} (${p.id}) reported travel/skipped dose. Outreach scheduled.`;
        }
        // 3. Positive progress
        else if (
          text.includes('lost') ||
          text.includes('down') ||
          text.includes('pound') ||
          text.includes('lbs') ||
          text.includes('kg') ||
          text.includes('weight') ||
          text.includes('great') ||
          text.includes('good') ||
          text.includes('happy') ||
          text.includes('well')
        ) {
          nextRisk = 'Low Risk';
          nextScore = 20;
          nextAction = 'Send encouraging progress confirmation.';
          nextStatus = 'Needs Follow-Up';
          auditMsg = `Progress update: Patient ${p.name} (${p.id}) shared weight/wellness progress: "${messageText}".`;
        }
        // 4. Default general
        else {
          nextRisk = 'Moderate Risk';
          nextScore = 60;
          nextAction = 'Review response and follow up.';
          nextStatus = 'Needs Follow-Up';
          auditMsg = `General SMS reply: Patient ${p.name} (${p.id}) sent a message: "${messageText}".`;
        }

        if (auditMsg) {
          setAuditLogsList((prevLogs) => [
            `${new Date().toLocaleTimeString().substring(0, 5)} - ${auditMsg}`,
            ...prevLogs,
          ]);
        }

        return {
          ...p,
          messages: updatedMessages,
          risk: nextRisk,
          riskScore: nextScore,
          recommendedAction: nextAction,
          status: nextStatus,
          escalationReason,
        };
      });
    });
  };

  const handleAddPatient = (newPatientData: {
    name: string;
    ageRange: string;
    location: 'Centennial' | 'Salida';
    program: string;
    risk: RiskLevel;
    riskScore: number;
    reason: string;
    status: string;
    recommendedAction: string;
  }) => {
    const nextId = `PT-${1000 + Math.floor(Math.random() * 9000)}`;
    const newPatient: Patient = {
      ...newPatientData,
      id: nextId,
      lastVisit: 'Today',
      nextAppointment: 'Not scheduled',
      lastCheckIn: 'Just now',
      missedAppointments: 0,
      unreadMessages: 0,
      refillStatus: 'Current',
      consent: 'Opted in',
      coach: 'Elena P.',
      provider: 'Dr. Wallace',
      opportunity: 1200,
      messages: [
        {
          id: `m-sim-init-${Date.now()}`,
          sender: 'patient',
          time: 'Just now',
          body: `Hi, registering for Green Valley Weight Care. ${newPatientData.reason}`,
        },
        {
          id: `m-sim-ai-${Date.now()}`,
          sender: 'ai',
          time: 'Draft pending',
          body: `Hi ${newPatientData.name.split(' ')[0]}, welcome to Green Valley Weight Care. We are excited to support your journey. Reply YES to confirm your first coaching session.`,
        },
      ],
    };

    setPatientList((prev) => [newPatient, ...prev]);
    setSelectedId(nextId);
    setShowIntakeForm(false);

    setAuditLogsList((prevLogs) => [
      `${new Date().toLocaleTimeString().substring(0, 5)} - New patient ${newPatient.name} (${nextId}) registered via Intake Ingestion.`,
      ...prevLogs,
    ]);
  };

  const handleSyncComplete = (logText: string) => {
    setAuditLogsList((prev) => [
      `${new Date().toLocaleTimeString().substring(0, 5)} - ${logText}`,
      ...prev,
    ]);
  };

  return (
    <main className={`app-shell text-scale-${textSize}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">C</div>
          <div>
            <strong>Mary&apos;s Follow-up Board</strong>
            <span>Simple daily patient retention support</span>
          </div>
        </div>
        <div className="topbar-actions">
          {/* HIPAA Role Selector Toggle */}
          <div className="role-selector" aria-label="Session User Role">
            <button
              className={`role-btn ${userRole === 'coach' ? 'active' : ''}`}
              onClick={() => {
                setUserRole('coach');
                setEscalated(false);
              }}
              title="Switch to Care Coach Role"
            >
              <Users size={14} />
              Mary (Coach)
            </button>
            <button
              className={`role-btn ${userRole === 'provider' ? 'active provider-active' : ''}`}
              onClick={() => {
                setUserRole('provider');
                setEscalated(true);
              }}
              title="Switch to Clinical Provider Role"
            >
              <Stethoscope size={14} />
              Dr. Wallace (MD)
            </button>
          </div>

          <div className="text-size-control" aria-label="Adjust font size">
            <span>Text Size:</span>
            <button
              className={`size-toggle-btn ${textSize === 'normal' ? 'active' : ''}`}
              onClick={() => setTextSize('normal')}
              data-size="normal"
              title="Normal text size"
            >
              A
            </button>
            <button
              className={`size-toggle-btn ${textSize === 'large' ? 'active' : ''}`}
              onClick={() => setTextSize('large')}
              data-size="large"
              title="Larger text size"
            >
              A+
            </button>
            <button
              className={`size-toggle-btn ${textSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setTextSize('xlarge')}
              data-size="xlarge"
              title="Extra large text size"
            >
              A++
            </button>
          </div>
          <span className="demo-pill">
            <ShieldCheck size={15} />
            Workflow demo only
          </span>
        </div>
      </header>

      {/* Senior Accessibility Tab Navigation */}
      <nav className="tab-bar" aria-label="Workspace Views">
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📋 Daily Follow-up Queue
        </button>
        <button
          className={`tab-btn ${activeTab === 'ops' ? 'active' : ''}`}
          onClick={() => setActiveTab('ops')}
        >
          📊 Multi-Clinic Operations
        </button>
        <button
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          📈 Economics & ROI
        </button>
      </nav>

      {/* HIPAA Secure Banner */}
      {userRole === 'provider' && (
        <div className="hipaa-banner" role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="hipaa-badge">Secure HIPAA Session</span>
            <span>Dr. Wallace&apos;s Provider Workspace is active. Role-restricted Protected Health Information (PHI) visible.</span>
          </div>
          <span style={{ fontSize: 'var(--font-xs)', opacity: 0.8 }}>ID: PRV-90822</span>
        </div>
      )}

      {activeTab === 'queue' && (
        <>
          <section className="hero-band">
            <div>
              <h1>Start with the patients who need help today.</h1>
              <p>
                A calmer command center: review the pending automated outreach, customize message tones,
                or escalate concerns directly to clinic providers.
              </p>
            </div>
            <div className="hero-actions" aria-label="Location filter">
              {locations.map((item) => (
                <button
                  className={item === location ? 'filter active' : 'filter'}
                  key={item}
                  onClick={() => {
                    setLocation(item);
                    const next = item === 'All Locations' ? patientList[0] : patientList.find((patient) => patient.location === item);
                    if (next) setSelectedId(next.id);
                  }}
                >
                  {item === 'All Locations' ? <Network size={16} /> : <MapPin size={16} />}
                  {item === 'All Locations' ? 'All clinics' : item}
                </button>
              ))}
            </div>
          </section>

          <PriorityPanel patient={selectedPatient} patients={visiblePatients} onSelect={() => setSelectedId(selectedPatient.id)} />

          <section className="workspace-grid">
            <RiskQueue
              patients={visiblePatients}
              selectedId={selectedPatient.id}
              query={query}
              riskFilter={riskFilter}
              statusFilter={statusFilter}
              onQueryChange={setQuery}
              onRiskFilterChange={setRiskFilter}
              onStatusFilterChange={setStatusFilter}
              onSelect={(patient) => {
                setSelectedId(patient.id);
                setEscalated(patient.risk === 'Clinical Review');
                setShowSoap(false);
                setShowFhir(false);
                setShowIntakeForm(false);
              }}
              onAddPatientClick={() => setShowIntakeForm(true)}
            />
            {showIntakeForm ? (
              <PatientIntakeForm
                onCancel={() => setShowIntakeForm(false)}
                onSubmit={handleAddPatient}
              />
            ) : (
              <PatientCommand
                patient={selectedPatient}
                tone={tone}
                draft={draft}
                sentCount={sentCount}
                escalated={escalated}
                showSoap={showSoap}
                onToneChange={changeTone}
                onDraftChange={setDraft}
                onApprove={() => approveDraft(selectedPatient.id, draft)}
                onEscalate={() => escalatePatient(selectedPatient.id)}
                onShowSoap={() => {
                  setShowSoap((value) => !value);
                  if (showFhir) setShowFhir(false);
                }}
                userRole={userRole}
                customSoap={customSoapRecords[selectedPatient.id]}
                onVoiceScribeComplete={(sub, assess, plan) => handleVoiceScribeComplete(selectedPatient.id, sub, assess, plan)}
                showFhir={showFhir}
                onShowFhir={() => {
                  setShowFhir((value) => !value);
                  if (showSoap) setShowSoap(false);
                }}
                onFhirSyncComplete={handleSyncComplete}
                onSendPatientMessage={(msgText) => handleSendPatientMessage(selectedPatient.id, msgText)}
              />
            )}
          </section>
        </>
      )}

      {activeTab === 'ops' && (
        <>
          <section className="metric-grid" aria-label="Clinical operations metrics" style={{ marginTop: '24px' }}>
            {metrics.map((metric) => (
              <MetricCard metric={metric} key={metric.label} />
            ))}
          </section>

          <section className="bottom-grid-ops" style={{ marginTop: '24px' }}>
            <OperationsPanel location={location} patients={visiblePatients} />
            <AuditPanel logs={auditLogsList} />
          </section>
        </>
      )}

      {activeTab === 'performance' && (
        <>
          <section className="promise-grid" aria-label="Why this improves retention" style={{ marginTop: '24px' }}>
            <RetentionCurve />
            <WorkflowComparison />
            <PaybackSummary patients={visiblePatients} />
          </section>

          <div style={{ marginTop: '24px' }}>
            <RoiMatrix />
          </div>
        </>
      )}
    </main>
  );
}

function CircuitTexture() {
  return (
    <svg className="circuit-texture" aria-hidden="true" viewBox="0 0 760 420">
      <path d="M12 80h160l52 54h102l48-48h132l34 34h182" />
      <path d="M80 270h126l44-44h140l34 32h88l58-58h144" />
      <path d="M0 178h118l46-46m126 144v-84m196-48v176" />
      <circle cx="172" cy="80" r="10" />
      <circle cx="506" cy="86" r="12" />
      <circle cx="390" cy="226" r="8" />
      <circle cx="570" cy="200" r="10" />
    </svg>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <article className={`metric-card tone-${metric.tone}`}>
      <div className="metric-label">
        <Icon size={18} />
        <span>{metric.label}</span>
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.sublabel}</small>
    </article>
  );
}

function PriorityPanel({
  patient,
  patients: visiblePatients,
  onSelect,
}: {
  patient: Patient;
  patients: Patient[];
  onSelect: () => void;
}) {
  const providerReview = visiblePatients.filter((item) => item.risk === 'Clinical Review').length;
  const readyToSend = visiblePatients.filter((item) => item.risk === 'High Risk' || item.risk === 'Moderate Risk').length;
  return (
    <section className="priority-panel">
      <div className="priority-main">
        <span className={`status-chip ${riskClass[patient.risk]}`}>{patient.risk}</span>
        <h2>First priority: {patient.name}</h2>
        <p>{patient.reason}</p>
        <button className="primary-button large-action" onClick={onSelect}>
          <MessageSquareText size={18} />
          Review this patient
        </button>
      </div>
      <div className="priority-steps">
        <div>
          <strong>1</strong>
          <span>Read the patient context</span>
        </div>
        <div>
          <strong>2</strong>
          <span>Approve or edit the message</span>
        </div>
        <div>
          <strong>3</strong>
          <span>Escalate if clinical review is needed</span>
        </div>
      </div>
      <div className="priority-counts">
        <span>
          <strong>{providerReview}</strong>
          provider review
        </span>
        <span>
          <strong>{readyToSend}</strong>
          ready for outreach
        </span>
      </div>
    </section>
  );
}

function RetentionCurve() {
  return (
    <section className="panel promise-panel retention-panel">
      <PanelHeader icon={TrendingUp} title="Retention curve impact" action="25-30% modeled lift" />
      <div className="curve-wrap">
        <svg viewBox="0 0 520 220" role="img" aria-label="Retention curve comparing standard workflow with Clustox AI workflow">
          <line x1="54" y1="174" x2="488" y2="174" />
          <line x1="54" y1="34" x2="54" y2="174" />
          <path className="standard-line" d="M58 58 C156 62 212 96 258 132 S360 166 486 170" />
          <path className="ai-line" d="M58 58 C152 54 245 52 336 52 S440 47 486 42" />
          <circle className="curve-dot" cx="338" cy="52" r="6" />
          <text x="76" y="28">Patient engagement</text>
          <text x="315" y="32">Clustox AI workflow</text>
          <text x="282" y="145">Standard workflow</text>
          <text x="300" y="82">25-30% retention lift</text>
          <text x="170" y="205">Time after initial consult</text>
        </svg>
      </div>
      <div className="curve-legend">
        <span><i className="legend-ai" /> Conversational SMS check-ins</span>
        <span><i className="legend-standard" /> Manual front-desk outreach</span>
      </div>
    </section>
  );
}

function WorkflowComparison() {
  const before = ['Manual follow-up lists', 'Low response visibility', 'Patient falls off regimen'];
  const after = ['AI risk scoring', 'Staff-reviewed outreach', 'Human escalation when needed'];
  return (
    <section className="panel promise-panel">
      <PanelHeader icon={Workflow} title="Before AI vs with Clustox AI" action="Workflow upgrade" />
      <div className="comparison-grid">
        <div className="comparison-column before">
          <strong>Before AI</strong>
          {before.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="comparison-column after">
          <strong>With Clustox AI</strong>
          {after.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaybackSummary({ patients: visiblePatients }: { patients: Patient[] }) {
  const opportunity = visiblePatients.reduce((sum, patient) => sum + patient.opportunity, 0);
  const missed = visiblePatients.reduce((sum, patient) => sum + patient.missedAppointments, 0);
  const refillReviews = visiblePatients.filter((patient) => ['Overdue', 'Due soon'].includes(patient.refillStatus)).length;
  return (
    <section className="panel promise-panel payback-panel">
      <PanelHeader icon={DollarSign} title="Operator ROI summary" action="Demo economics" />
      <div className="payback-hero">
        <span>Modeled recovery opportunity</span>
        <strong>{formatCurrency(opportunity)}</strong>
        <p>{missed} missed visits, {refillReviews} refill reviews, and staff-reviewed outreach in one queue.</p>
      </div>
      <div className="payback-rows">
        <span>Payback lever</span>
        <strong>Retention + recovered appointments</strong>
        <span>Admin lever</span>
        <strong>Less manual chasing and safer routing</strong>
      </div>
    </section>
  );
}

function RiskQueue({
  patients: visiblePatients,
  selectedId,
  query,
  riskFilter,
  statusFilter,
  onQueryChange,
  onRiskFilterChange,
  onStatusFilterChange,
  onSelect,
  onAddPatientClick,
}: {
  patients: Patient[];
  selectedId: string;
  query: string;
  riskFilter: 'All Risks' | RiskLevel;
  statusFilter: string;
  onQueryChange: (query: string) => void;
  onRiskFilterChange: (risk: 'All Risks' | RiskLevel) => void;
  onStatusFilterChange: (status: string) => void;
  onSelect: (patient: Patient) => void;
  onAddPatientClick: () => void;
}) {
  const riskOptions: Array<'All Risks' | RiskLevel> = [
    'All Risks',
    'Clinical Review',
    'High Risk',
    'Moderate Risk',
    'Do Not Automate',
  ];
  const statusOptions = ['All Statuses', 'Clinical Review', 'At Risk', 'Missed Visit', 'Needs Follow-Up', 'Opted Out'];

  return (
    <section className="panel risk-panel">
      <PanelHeader
        icon={Gauge}
        title="Patient risk queue"
        action={
          <div className="queue-header-actions">
            <button className="add-patient-btn" onClick={onAddPatientClick} title="Add a new patient to the board">
              + New Intake
            </button>
            <span>{visiblePatients.length} patients</span>
          </div>
        }
      />
      <div className="queue-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search patient, provider, reason"
          />
        </label>
        <select value={riskFilter} onChange={(event) => onRiskFilterChange(event.target.value as 'All Risks' | RiskLevel)}>
          {riskOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          {statusOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="queue-list">
        {visiblePatients.length === 0 && (
          <div className="empty-state">
            No patients match these filters. Clear search or switch location to continue the demo.
          </div>
        )}
        {visiblePatients.map((patient) => (
          <button
            className={patient.id === selectedId ? 'queue-row selected' : 'queue-row'}
            key={patient.id}
            onClick={() => onSelect(patient)}
          >
            <span className="queue-main">
              <strong>{patient.name}</strong>
              <small>
                {patient.location} - {patient.program}
              </small>
            </span>
            <span className={`status-chip ${riskClass[patient.risk]}`}>{patient.risk}</span>
            <span className="risk-score">{patient.riskScore}</span>
            <span className="queue-reason">{patient.reason}</span>
            <span className="queue-action">
              {patient.recommendedAction}
              <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PatientCommand({
  patient,
  tone,
  draft,
  sentCount,
  escalated,
  showSoap,
  onToneChange,
  onDraftChange,
  onApprove,
  onEscalate,
  onShowSoap,
  userRole,
  customSoap,
  onVoiceScribeComplete,
  showFhir,
  onShowFhir,
  onFhirSyncComplete,
  onSendPatientMessage,
}: {
  patient: Patient;
  tone: Tone;
  draft: string;
  sentCount: number;
  escalated: boolean;
  showSoap: boolean;
  onToneChange: (tone: Tone) => void;
  onDraftChange: (draft: string) => void;
  onApprove: () => void;
  onEscalate: () => void;
  onShowSoap: () => void;
  userRole: 'coach' | 'provider';
  customSoap?: { subjective: string; assessment: string; plan: string };
  onVoiceScribeComplete: (subjective: string, assessment: string, plan: string) => void;
  showFhir: boolean;
  onShowFhir: () => void;
  onFhirSyncComplete: (logMessage: string) => void;
  onSendPatientMessage: (messageText: string) => void;
}) {
  return (
    <section className="panel patient-panel">
      <PanelHeader
        icon={MessageSquareText}
        title={`${patient.name} outreach workspace`}
        action={
          userRole === 'provider'
            ? '🔐 Secure Clinical Mode (MD)'
            : escalated
            ? '⚠️ Needs Coach Review'
            : '✨ AI Assist Active (Coach)'
        }
      />
      <div className="patient-layout">
        <aside className="patient-summary">
          <div className="avatar-row">
            <div className="avatar">{patient.name.charAt(0)}</div>
            <div>
              <strong>{patient.name}</strong>
              <small>{patient.id} - {patient.ageRange}</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>Program</dt>
              <dd>{patient.program}</dd>
            </div>
            <div>
              <dt>Last visit</dt>
              <dd>{patient.lastVisit}</dd>
            </div>
            <div>
              <dt>Next appointment</dt>
              <dd>{patient.nextAppointment}</dd>
            </div>
            <div>
              <dt>Refill status</dt>
              <dd>{patient.refillStatus}</dd>
            </div>
            <div>
              <dt>Consent</dt>
              <dd>{patient.consent}</dd>
            </div>
          </dl>
          <div className="risk-explain">
            <AlertTriangle size={17} />
            <span>{patient.reason}</span>
          </div>
        </aside>

        <div className="conversation-area">
          <div className="thread" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {patient.messages.map((message) => (
              <div className={`message ${message.sender}`} key={message.id}>
                <span>{message.sender === 'patient' ? patient.name : message.sender === 'clinic' ? 'Clinic' : 'AI Draft'}</span>
                <p>{message.body}</p>
                <small>{message.time}</small>
              </div>
            ))}
          </div>

          {/* Interactive SMS Simulator */}
          <SmsSimulator patient={patient} onSendMessage={onSendPatientMessage} />

          <div className="ai-panel">
            <div className="ai-header">
              <div>
                <Sparkles size={18} />
                <strong>AI suggested response</strong>
              </div>
              <span>Staff approval required</span>
            </div>
            <div className="tone-tabs">
              {(['Friendly', 'Clinical', 'Urgent'] as Tone[]).map((item) => (
                <button className={tone === item ? 'tone active' : 'tone'} key={item} onClick={() => onToneChange(item)}>
                  {item}
                </button>
              ))}
            </div>
            <textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} />
            <div className="ai-actions">
              <button className="primary-button" onClick={onApprove}>
                <Send size={16} />
                Approve outreach
              </button>
              <button className="secondary-button danger" onClick={onEscalate}>
                <Stethoscope size={16} />
                Escalate to provider
              </button>
              <button className={`secondary-button ${showSoap ? 'active' : ''}`} onClick={onShowSoap}>
                <FileText size={16} />
                SOAP Preview
              </button>
              <button className={`secondary-button ${showFhir ? 'active' : ''}`} onClick={onShowFhir}>
                <Network size={16} />
                FHIR Sync
              </button>
            </div>
            {escalated && (
              <div className="escalation-box">
                <CircleCheck size={17} />
                <span>
                  Routed to {patient.provider}. Reason: {patient.escalationReason ?? patient.recommendedAction}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {showSoap && (
        <SoapPreview
          patient={patient}
          userRole={userRole}
          customSoap={customSoap}
          onVoiceScribeComplete={onVoiceScribeComplete}
        />
      )}
      {showFhir && (
        <FhirIntegrationPanel
          patient={patient}
          onSyncComplete={onFhirSyncComplete}
        />
      )}
    </section>
  );
}

const mockSoapTranscripts: Record<string, { subjective: string; assessment: string; plan: string }> = {
  'PT-1042': {
    subjective: 'Patient Maya R. reporting persistent moderate nausea and mild dizziness after missing her refill check-in. Adherence is disrupted.',
    assessment: 'GLP-1 receptor agonist side effects (nausea, dizziness), likely secondary to titration schedule or poor hydration. Adherence alert.',
    plan: 'Hold automated SMS checks. Escalating clinical file to Dr. Wallace for medication titration adjustment or anti-emetic prescription. Patient contact requested.'
  },
  'PT-1094': {
    subjective: 'Jordan K. reported by phone that they missed two coaching consults due to travel and plan disruption. Requests morning spots.',
    assessment: 'Non-adherence due to lifestyle travel changes. High risk of program drop-off. Ready for re-engagement checks.',
    plan: 'Approve conversational outreach message. Provide scheduling link for Centennial clinic morning appointments. Monitor weekly reply status.'
  },
  'PT-1130': {
    subjective: 'Taylor S. is a no-show following initial GLP-1 program consult. No replies or activity for 21 days.',
    assessment: 'New intake patient retention risk. Critical barrier to program initiation.',
    plan: 'Send missed-visit re-engagement check-in with scheduling options. If no response within 48 hours, route file to clinic operations.'
  },
  'PT-1017': {
    subjective: 'Alex B. requesting clarification on communications consent preferences and automated reminders.',
    assessment: 'Moderate risk. Retention outreach blocked pending manual confirmation of text consent flags.',
    plan: 'Initiate manual coaching call to verify SMS consent status and record preferences before resuming automated re-engagement workflow.'
  },
  'PT-1088': {
    subjective: 'Samira N. requested full unsubscribe from SMS reminders. No-show on medication checks.',
    assessment: 'Opted out. Automated clinical outreach deactivated. Manual clinical support only.',
    plan: 'Place profile on do-not-automate list. Route to clinic operations for phone callback if clinical indicators deteriorate.'
  }
};

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function SoapPreview({
  patient,
  userRole,
  customSoap,
  onVoiceScribeComplete,
}: {
  patient: Patient;
  userRole: 'coach' | 'provider';
  customSoap?: { subjective: string; assessment: string; plan: string };
  onVoiceScribeComplete: (subjective: string, assessment: string, plan: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const transcript = mockSoapTranscripts[patient.id] || {
        subjective: `Patient reported concern: ${patient.reason}`,
        assessment: `${patient.risk} clinical review.`,
        plan: `${patient.recommendedAction} Approved by provider.`
      };
      onVoiceScribeComplete(transcript.subjective, transcript.assessment, transcript.plan);
    } else {
      setIsRecording(true);
    }
  };

  const isProvider = userRole === 'provider';
  const hasTranscribed = !!customSoap;

  return (
    <div className="soap-preview">
      <div className="panel-header" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic size={18} />
          <h2>SOAP documentation preview</h2>
        </div>
        
        <div className="mic-btn-container">
          {isRecording && (
            <div className="recording-status" style={{ marginRight: '8px' }}>
              <span className="recording-pulse-dot" />
              <span>Transcribing audio... {formatTimer(recordTime)}</span>
            </div>
          )}
          
          <button
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={!isProvider}
            title={
              !isProvider
                ? 'Role-restricted: Clinical Providers only can record SOAP scribe'
                : isRecording
                ? 'Stop Voice Scribe dictation'
                : 'Start Voice Scribe dictation'
            }
            style={{ opacity: isProvider ? 1 : 0.5, cursor: isProvider ? 'pointer' : 'not-allowed' }}
          >
            <Mic size={20} />
          </button>

          {!isProvider && (
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-soft)' }}>
              🔒 Scribe locked (Provider only)
            </span>
          )}
          {isProvider && !isRecording && !hasTranscribed && (
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-soft)' }}>
              🎙️ Click to record dictation
            </span>
          )}
          {isProvider && hasTranscribed && !isRecording && (
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
              ✓ Scribed successfully
            </span>
          )}
        </div>
      </div>

      <div className="soap-grid" style={{ paddingTop: 0 }}>
        <div>
          <strong>Subjective</strong>
          <p>{customSoap ? customSoap.subjective : `Patient-reported engagement concern: ${patient.reason}`}</p>
        </div>
        <div>
          <strong>Assessment</strong>
          <p>{customSoap ? customSoap.assessment : `${patient.risk} follow-up signal. AI draft is informational and requires care-team review.`}</p>
        </div>
        <div>
          <strong>Plan</strong>
          <p>{customSoap ? customSoap.plan : `${patient.recommendedAction} Clinical decisions remain with licensed professionals.`}</p>
        </div>
      </div>
    </div>
  );
}

function OperationsPanel({ location, patients: visiblePatients }: { location: LocationFilter; patients: Patient[] }) {
  const centennial = visiblePatients.filter((patient) => patient.location === 'Centennial').length;
  const salida = visiblePatients.filter((patient) => patient.location === 'Salida').length;
  const appointmentGaps = visiblePatients.filter((patient) => patient.nextAppointment === 'Not scheduled').length;
  const refillReviews = visiblePatients.filter((patient) => ['Overdue', 'Due soon'].includes(patient.refillStatus)).length;
  const unreadMessages = visiblePatients.reduce((sum, patient) => sum + patient.unreadMessages, 0);
  const inventoryWatch = location === 'Salida' ? 3 : location === 'Centennial' ? 7 : 10;
  return (
    <section className="panel">
      <PanelHeader icon={Building2} title="Multi-location operations" action={location} />
      <div className="ops-kpi-grid">
        <MiniKpi icon={CalendarClock} label="Appointment gaps" value={appointmentGaps} />
        <MiniKpi icon={PackageCheck} label="Inventory watch" value={inventoryWatch} />
        <MiniKpi icon={FileText} label="Refill reviews" value={refillReviews} />
        <MiniKpi icon={MessageSquareText} label="Unread replies" value={unreadMessages} />
      </div>
      <div className="location-map">
        <LocationLine label="Centennial" value={centennial} total={Math.max(visiblePatients.length, 1)} />
        <LocationLine label="Salida" value={salida} total={Math.max(visiblePatients.length, 1)} />
      </div>
      <div className="workflow-strip">
        <span>Location data</span>
        <Workflow size={18} />
        <span>Clustox AI triage</span>
        <ArrowUpRight size={18} />
        <span>Staff-approved outreach</span>
      </div>
      <ul className="safety-list">
        {safetyNotes.map((note) => {
          const Icon = note.icon;
          return (
            <li key={note.label}>
              <Icon size={16} />
              {note.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MiniKpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="mini-kpi">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LocationLine({ label, value, total }: { label: string; value: number; total: number }) {
  const width = `${Math.max(8, (value / total) * 100)}%`;
  return (
    <div className="location-line">
      <div>
        <strong>{label}</strong>
        <span>{value} active queue records</span>
      </div>
      <div className="bar-track">
        <span style={{ width }} />
      </div>
    </div>
  );
}

function RoiMatrix() {
  return (
    <section className="panel">
      <PanelHeader icon={TrendingUp} title="POC ROI matrix" action="Modeled" />
      <div className="roi-grid">
        {roiItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label}>
              <Icon size={18} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AuditPanel({ logs }: { logs: string[] }) {
  return (
    <section className="panel">
      <PanelHeader icon={Clock} title="Audit and guardrails" action="Live log" />
      <div className="audit-list">
        {logs.slice(0, 8).map((entry, idx) => (
          <div key={idx}>
            <span />
            <p>{entry}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Users;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action && (typeof action === 'string' ? <span>{action}</span> : action)}
    </div>
  );
}

// ==========================================
// Phase 3 Support Components
// ==========================================

function SmsSimulator({
  patient,
  onSendMessage,
}: {
  patient: Patient;
  onSendMessage: (messageText: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const quickReplies = [
    { text: 'Severe stomach pain after dose', label: '🤢 Symptoms' },
    { text: 'I missed my dose because of travel', label: '✈️ Missed Dose' },
    { text: 'I lost 3 lbs this week!', label: '⚖️ Weight Lost' },
    { text: 'Refill working great, no complaints', label: '✓ Feeling Well' },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="sms-simulator-box">
      <div className="sms-simulator-header">
        <strong>
          <Send size={14} />
          Simulate Patient SMS Response
        </strong>
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--blue)', fontWeight: 'bold' }}>
          Interactive Demo Mode
        </span>
      </div>
      <form className="sms-input-row" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a mock reply from patient or click below..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="sms-send-btn">
          Send Reply
        </button>
      </form>
      <div className="sms-quick-tags">
        {quickReplies.map((qr) => (
          <button
            key={qr.text}
            type="button"
            className="sms-quick-tag"
            onClick={() => onSendMessage(qr.text)}
          >
            {qr.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FhirIntegrationPanel({
  patient,
  onSyncComplete,
}: {
  patient: Patient;
  onSyncComplete: (logMessage: string) => void;
}) {
  const [activeFhirTab, setActiveFhirTab] = useState<'patient' | 'observation' | 'communication'>('patient');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const formattedName = patient.name.split(' ');
  const firstName = formattedName[0];
  const lastName = formattedName[1] || '';

  const fhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    active: patient.status !== 'Opted Out',
    name: [
      {
        use: 'official',
        family: lastName,
        given: [firstName],
      },
    ],
    telecom: [
      {
        system: 'sms',
        value: `+1-303-555-0${patient.id.replace('PT-', '')}`,
        use: 'mobile',
      },
    ],
    gender: 'unknown',
    birthDate: patient.ageRange === '25-34' ? '1996-03-12' : patient.ageRange === '35-44' ? '1988-09-24' : '1974-12-05',
    extension: [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/consent-state',
        valueString: patient.consent,
      },
    ],
  };

  const fhirObservation = {
    resourceType: 'Observation',
    id: `obs-${patient.id}`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'clinical-risk',
            display: 'Risk Assessment',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '80345-2',
          display: 'Program Adherence Risk Score',
        },
      ],
      text: `Care Program: ${patient.program}`,
    },
    subject: {
      reference: `Patient/${patient.id}`,
    },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: patient.riskScore,
      unit: 'Risk Score %',
      system: 'http://unitsofmeasure.org',
      code: '%',
    },
    interpretation: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: patient.risk === 'Clinical Review' ? 'CR' : patient.risk === 'High Risk' ? 'A' : 'N',
            display: patient.risk,
          },
        ],
        text: patient.reason,
      },
    ],
  };

  const fhirCommunication = {
    resourceType: 'Communication',
    id: `comm-${patient.id}`,
    status: 'completed',
    subject: {
      reference: `Patient/${patient.id}`,
    },
    sent: new Date().toISOString(),
    recipient: [
      {
        reference: `Patient/${patient.id}`,
      },
    ],
    payload: patient.messages.map((m) => ({
      contentString: `[${m.sender}] ${m.body} (${m.time})`,
    })),
  };

  const currentFhirJson =
    activeFhirTab === 'patient'
      ? fhirPatient
      : activeFhirTab === 'observation'
      ? fhirObservation
      : fhirCommunication;

  const fhirResourceSummaries = [
    {
      id: 'patient' as const,
      title: 'Patient profile',
      label: 'FHIR Patient',
      detail: `${patient.name}, ${patient.ageRange}, ${patient.consent} consent`,
    },
    {
      id: 'observation' as const,
      title: 'Risk note',
      label: 'FHIR Observation',
      detail: `${patient.riskScore}% risk score, ${patient.risk} status`,
    },
    {
      id: 'communication' as const,
      title: 'Outreach history',
      label: 'FHIR Communication',
      detail: `${patient.messages.length} recent message${patient.messages.length === 1 ? '' : 's'} saved for continuity`,
    },
  ];

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs]);

  const triggerFhirSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs([]);

    const steps = [
      { msg: 'Initializing secure HL7 FHIR r4 integration pipeline...', type: 'info' },
      { msg: 'Checking client authentication credentials (OAuth2 token valid)...', type: 'info' },
      { msg: 'Matching local patient ID against EHR Master Patient Index (MPI)...', type: 'info' },
      { msg: `Match found! EHR Record identifier: EHR-${patient.id.replace('PT-', '59')}`, type: 'success' },
      { msg: `Checking HIPAA consent scopes: Patient has status "${patient.consent}"`, type: 'info' },
      { msg: `Serializing Patient resource... POST /fhir/r4/Patient/${patient.id}`, type: 'info' },
      { msg: `[FHIR API] 200 OK (Patient demographics successfully synchronized)`, type: 'success' },
      { msg: `Serializing Observation resource... POST /fhir/r4/Observation`, type: 'info' },
      { msg: `[FHIR API] 201 Created (Observation ref obs-${patient.id} committed to EHR repository)`, type: 'success' },
      { msg: `Serializing Communication history (${patient.messages.length} messages)... POST /fhir/r4/Communication`, type: 'info' },
      { msg: `[FHIR API] 201 Created (Communication payload sync completed)`, type: 'success' },
      { msg: `Writing pipeline transaction log audit entries...`, type: 'info' },
      { msg: `✓ Synchronized successfully. Green Valley Weight Care EHR data is current.`, type: 'success' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${step.msg}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsSyncing(false);
        onSyncComplete(`HL7 FHIR Sync completed for ${patient.name} (${patient.id}). EHR records updated.`);
      }
    }, 400);
  };

  return (
    <div className="fhir-container">
      <div className="fhir-header">
        <div>
          <div className="fhir-eyebrow">
            <Network size={17} />
            EHR sync preview
          </div>
          <h2>What will be saved after staff approval</h2>
          <p>
            Plain-language view of the patient profile, risk note, and outreach history that can sync to the EHR.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={triggerFhirSync}
          disabled={isSyncing}
        >
          <Network size={16} />
          {isSyncing ? 'Syncing...' : 'Run EHR sync'}
        </button>
      </div>

      <div className="fhir-layout">
        <div className="fhir-resources">
          <div className="fhir-summary-grid">
            {fhirResourceSummaries.map((resource) => (
              <button
                type="button"
                key={resource.id}
                className={`fhir-resource-card ${activeFhirTab === resource.id ? 'active' : ''}`}
                onClick={() => setActiveFhirTab(resource.id)}
              >
                <span>{resource.label}</span>
                <strong>{resource.title}</strong>
                <small>{resource.detail}</small>
              </button>
            ))}
          </div>

          <details className="fhir-technical-details">
            <summary>Show technical FHIR payload</summary>
            <div className="fhir-tab-buttons">
              <button
                className={`fhir-tab-btn ${activeFhirTab === 'patient' ? 'active' : ''}`}
                onClick={() => setActiveFhirTab('patient')}
              >
                Patient
              </button>
              <button
                className={`fhir-tab-btn ${activeFhirTab === 'observation' ? 'active' : ''}`}
                onClick={() => setActiveFhirTab('observation')}
              >
                Risk note
              </button>
              <button
                className={`fhir-tab-btn ${activeFhirTab === 'communication' ? 'active' : ''}`}
                onClick={() => setActiveFhirTab('communication')}
              >
                Outreach log
              </button>
            </div>
            <pre className="fhir-code-block">
              {JSON.stringify(currentFhirJson, null, 2)}
            </pre>
          </details>
        </div>

        <aside className="fhir-sync-card">
          <div className="fhir-terminal-header">
            <span>Sync status</span>
            <span>Secure TLS 1.3</span>
          </div>
          {syncLogs.length === 0 ? (
            <div className="fhir-empty-state">
              <ShieldCheck size={20} />
              <strong>Ready to preview</strong>
              <p>
                Click &quot;Run EHR sync&quot; to show the audit trail Mary or a provider would review.
              </p>
            </div>
          ) : (
            syncLogs.map((log, idx) => {
              let logClass = 'info';
              if (log.includes('Created') || log.includes('successfully') || log.includes('OK') || log.includes('Match found')) {
                logClass = 'success';
              } else if (log.includes('warning') || log.includes('HIPAA')) {
                logClass = 'warn';
              }
              return (
                <div key={idx} className={`fhir-terminal-line ${logClass}`}>
                  {log}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </aside>
      </div>
    </div>
  );
}

function PatientIntakeForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (newPatient: Omit<Patient, 'id' | 'messages' | 'missedAppointments' | 'unreadMessages' | 'refillStatus' | 'consent' | 'coach' | 'provider' | 'opportunity' | 'lastVisit' | 'nextAppointment' | 'lastCheckIn'> & { reason: string }) => void;
}) {
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('35-44');
  const [location, setLocation] = useState<'Centennial' | 'Salida'>('Centennial');
  const [program, setProgram] = useState('GLP-1 + nutrition coaching');
  const [risk, setRisk] = useState<RiskLevel>('Moderate Risk');
  const [weightGoal, setWeightGoal] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name,
      ageRange,
      location,
      program,
      risk,
      riskScore: risk === 'Clinical Review' ? 90 : risk === 'High Risk' ? 80 : risk === 'Moderate Risk' ? 55 : risk === 'Low Risk' ? 25 : 40,
      reason: reason || `Patient enrolled in ${program} with goal to ${weightGoal || 'achieve healthy weight'}.`,
      status: risk === 'Clinical Review' ? 'Clinical Review' : 'Needs Follow-Up',
      recommendedAction: risk === 'Clinical Review' ? 'Escalate to provider.' : 'Initiate automated check-in.',
    });
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <div className="panel-header" style={{ borderBottom: '1.5px solid var(--border)', padding: '0 0 16px 0', marginBottom: '20px', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} />
          <h2>New Patient Intake Registration</h2>
        </div>
      </div>
      
      <div className="intake-grid">
        <div className="intake-group">
          <label htmlFor="patient-name">Patient Name</label>
          <input
            id="patient-name"
            type="text"
            required
            placeholder="e.g. Sarah Jenkins"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="intake-group">
          <label htmlFor="patient-age">Age Range</label>
          <select id="patient-age" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            <option>18-24</option>
            <option>25-34</option>
            <option>35-44</option>
            <option>45-54</option>
            <option>55-64</option>
            <option>65+</option>
          </select>
        </div>

        <div className="intake-group">
          <label htmlFor="patient-location">Clinic Location</label>
          <select id="patient-location" value={location} onChange={(e) => setLocation(e.target.value as 'Centennial' | 'Salida')}>
            <option value="Centennial">Centennial (Denver Area)</option>
            <option value="Salida">Salida (Rural Clinic)</option>
          </select>
        </div>

        <div className="intake-group">
          <label htmlFor="patient-program">Care Program</label>
          <select id="patient-program" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option>GLP-1 + nutrition coaching</option>
            <option>Maintenance coaching</option>
            <option>Nutrition coaching</option>
            <option>New intake</option>
          </select>
        </div>

        <div className="intake-group">
          <label htmlFor="patient-risk">Initial Risk Assessment</label>
          <select id="patient-risk" value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel)}>
            <option>Low Risk</option>
            <option>Moderate Risk</option>
            <option>High Risk</option>
            <option>Clinical Review</option>
            <option>Do Not Automate</option>
          </select>
        </div>

        <div className="intake-group">
          <label htmlFor="patient-goal">Weight Loss Goal / Target</label>
          <input
            id="patient-goal"
            type="text"
            placeholder="e.g. Lose 25 lbs"
            value={weightGoal}
            onChange={(e) => setWeightGoal(e.target.value)}
          />
        </div>

        <div className="intake-group intake-full">
          <label htmlFor="patient-statement">Patient Intake Statement / Symptoms</label>
          <input
            id="patient-statement"
            type="text"
            placeholder="e.g. Experienced nausea during loading dose, wants alternative options"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <div className="intake-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button">
          Create Patient Profile
        </button>
      </div>
    </form>
  );
}

export default App;
