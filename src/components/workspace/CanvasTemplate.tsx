import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Edit2, X, Download, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CanvasSection {
  id: string;
  label: string;
  placeholder: string;
  gridArea: string;
  color: string;
}

export type CanvasType = 'bmc' | 'lean' | 'value_prop' | 'empathy' | 'swot' | 'gtm' | 'icp' | 'pricing' | 'growth_loops' | 'okrs' | 'fundraising' | 'sales_pipeline' | 'roadmap';

interface CanvasTemplateProps {
  type: CanvasType;
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  disabled?: boolean;
  reviewStatus?: 'draft' | 'pending_review' | 'approved' | 'needs_changes';
  onSubmitForReview?: () => void;
  onExport?: () => void;
}

const BMC_SECTIONS: CanvasSection[] = [
  { id: 'key_partners', label: 'Key Partners', placeholder: 'Who are your key partners and suppliers?', gridArea: 'partners', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'key_activities', label: 'Key Activities', placeholder: 'What key activities does your value proposition require?', gridArea: 'activities', color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
  { id: 'key_resources', label: 'Key Resources', placeholder: 'What key resources does your value proposition require?', gridArea: 'resources', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'value_propositions', label: 'Value Propositions', placeholder: 'What value do you deliver to the customer?', gridArea: 'value', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'customer_relationships', label: 'Customer Relationships', placeholder: 'What type of relationship does each customer segment expect?', gridArea: 'relationships', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { id: 'channels', label: 'Channels', placeholder: 'How do you reach your customer segments?', gridArea: 'channels', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { id: 'customer_segments', label: 'Customer Segments', placeholder: 'For whom are you creating value?', gridArea: 'segments', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'cost_structure', label: 'Cost Structure', placeholder: 'What are the most important costs?', gridArea: 'costs', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700' },
  { id: 'revenue_streams', label: 'Revenue Streams', placeholder: 'For what value are customers willing to pay?', gridArea: 'revenue', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

const LEAN_SECTIONS: CanvasSection[] = [
  { id: 'problem', label: 'Problem', placeholder: 'Top 3 problems your customers face', gridArea: 'problem', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'solution', label: 'Solution', placeholder: 'Top 3 features that solve the problems', gridArea: 'solution', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'key_metrics', label: 'Key Metrics', placeholder: 'Key activities you measure', gridArea: 'metrics', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'unique_value', label: 'Unique Value Proposition', placeholder: 'Single, clear message that states why you are different', gridArea: 'uvp', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'unfair_advantage', label: 'Unfair Advantage', placeholder: 'Something that cannot be easily copied or bought', gridArea: 'advantage', color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
  { id: 'channels', label: 'Channels', placeholder: 'Path to customers', gridArea: 'channels', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { id: 'customer_segments', label: 'Customer Segments', placeholder: 'Target customers', gridArea: 'segments', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { id: 'cost_structure', label: 'Cost Structure', placeholder: 'Customer acquisition costs, hosting, etc.', gridArea: 'costs', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700' },
  { id: 'revenue_streams', label: 'Revenue Streams', placeholder: 'Revenue model, lifetime value, etc.', gridArea: 'revenue', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

const VALUE_PROP_SECTIONS: CanvasSection[] = [
  { id: 'customer_jobs', label: 'Customer Jobs', placeholder: 'What tasks are your customers trying to complete? What problems are they solving?', gridArea: 'jobs', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'pains', label: 'Pains', placeholder: 'What frustrates your customers? What risks do they fear?', gridArea: 'pains', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'gains', label: 'Gains', placeholder: 'What outcomes do customers want? What would delight them?', gridArea: 'gains', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'products_services', label: 'Products & Services', placeholder: 'What products and services do you offer?', gridArea: 'products', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'pain_relievers', label: 'Pain Relievers', placeholder: 'How do your products relieve customer pains?', gridArea: 'relievers', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { id: 'gain_creators', label: 'Gain Creators', placeholder: 'How do your products create customer gains?', gridArea: 'creators', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

const EMPATHY_SECTIONS: CanvasSection[] = [
  { id: 'think_feel', label: 'Think & Feel', placeholder: 'What really counts? Major preoccupations? Worries and aspirations?', gridArea: 'think', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'hear', label: 'Hear', placeholder: 'What friends, boss, influencers say? What channels influence them?', gridArea: 'hear', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'see', label: 'See', placeholder: 'What is their environment? What does the market offer? What are friends doing?', gridArea: 'see', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'say_do', label: 'Say & Do', placeholder: 'Attitude in public? Appearance? Behavior towards others?', gridArea: 'saydo', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { id: 'pains', label: 'Pains', placeholder: 'Fears? Frustrations? Obstacles? What are they trying to avoid?', gridArea: 'pains', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'gains', label: 'Gains', placeholder: 'Wants and needs? Measures of success? Goals?', gridArea: 'gains', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

const SWOT_SECTIONS: CanvasSection[] = [
  { id: 'strengths', label: 'Strengths', placeholder: 'What are your advantages? What do you do well? What resources do you have?', gridArea: 'strengths', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'weaknesses', label: 'Weaknesses', placeholder: 'What could you improve? What are you lacking? What should you avoid?', gridArea: 'weaknesses', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'opportunities', label: 'Opportunities', placeholder: 'What trends could you take advantage of? What opportunities are available?', gridArea: 'opportunities', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'threats', label: 'Threats', placeholder: 'What threats could harm you? What is your competition doing?', gridArea: 'threats', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
];

// New visual canvas sections
const GTM_SECTIONS: CanvasSection[] = [
  { id: 'target_market', label: 'Target Market', placeholder: 'Who is your ideal customer? Demographics, firmographics, psychographics.', gridArea: 'market', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'positioning', label: 'Positioning', placeholder: 'How do you want to be perceived vs competitors?', gridArea: 'positioning', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'channels', label: 'Channels', placeholder: 'How will you reach customers? (Content, SEO, Paid, Partnerships)', gridArea: 'channels', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'launch', label: 'Launch Plan', placeholder: 'Key milestones and dates for your go-to-market launch.', gridArea: 'launch', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
];

const ICP_SECTIONS: CanvasSection[] = [
  { id: 'company_profile', label: 'Company Profile', placeholder: 'Size, industry, tech stack, budget.', gridArea: 'company', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'buyer_persona', label: 'Buyer Persona', placeholder: 'Title, demographics, goals, motivations.', gridArea: 'persona', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'pain_points', label: 'Pain Points', placeholder: 'Key frustrations and problems.', gridArea: 'pains', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'buying_behavior', label: 'Buying Behavior', placeholder: 'How they research, buy, who influences them.', gridArea: 'buying', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
];

const PRICING_SECTIONS: CanvasSection[] = [
  { id: 'pricing_model', label: 'Pricing Model', placeholder: 'Subscription, usage-based, one-time, freemium?', gridArea: 'model', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'tiers', label: 'Tier Structure', placeholder: 'Free, Starter, Pro, Enterprise tiers.', gridArea: 'tiers', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'value_metric', label: 'Value Metric', placeholder: 'What unit do you charge for?', gridArea: 'metric', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'competition', label: 'Competitive Positioning', placeholder: 'How do competitors price? Where do you position?', gridArea: 'competition', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
];

const GROWTH_LOOPS_SECTIONS: CanvasSection[] = [
  { id: 'trigger', label: 'Loop Trigger', placeholder: 'What action triggers the loop? (signup, usage)', gridArea: 'trigger', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'value', label: 'Value Creation', placeholder: 'What value is created that can be shared?', gridArea: 'value', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'acquisition', label: 'New User Acquisition', placeholder: 'How does value create new users?', gridArea: 'acquisition', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'retention', label: 'Retention Loops', placeholder: 'What creates habitual usage?', gridArea: 'retention', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
];

const OKRS_SECTIONS: CanvasSection[] = [
  { id: 'north_star', label: 'North Star Metric', placeholder: 'The single metric that captures the value you deliver.', gridArea: 'northstar', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'objective_1', label: 'Objective 1', placeholder: 'Ambitious qualitative goal.', gridArea: 'obj1', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'key_results_1', label: 'Key Results 1', placeholder: 'Measurable outcomes for Objective 1.', gridArea: 'kr1', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'objective_2', label: 'Objective 2', placeholder: 'Second major objective.', gridArea: 'obj2', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'key_results_2', label: 'Key Results 2', placeholder: 'Measurable outcomes for Objective 2.', gridArea: 'kr2', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
];

const FUNDRAISING_SECTIONS: CanvasSection[] = [
  { id: 'round_target', label: 'Round Target', placeholder: 'Amount raising and use of funds.', gridArea: 'target', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'metrics', label: 'Key Metrics', placeholder: 'MRR, growth rate, CAC/LTV, retention.', gridArea: 'metrics', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'materials', label: 'Materials Checklist', placeholder: 'Pitch deck, financials, data room status.', gridArea: 'materials', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'investors', label: 'Target Investors', placeholder: 'Top 20 target investors with status.', gridArea: 'investors', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
];

const SALES_PIPELINE_SECTIONS: CanvasSection[] = [
  { id: 'pipeline_overview', label: 'Pipeline Overview', placeholder: 'Total value, weighted value, avg deal size.', gridArea: 'overview', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'stages', label: 'Stage Breakdown', placeholder: 'Lead, Qualified, Proposal, Negotiation counts.', gridArea: 'stages', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'metrics', label: 'Sales Metrics', placeholder: 'Cycle time, win rate, forecast.', gridArea: 'metrics', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
];

const ROADMAP_SECTIONS: CanvasSection[] = [
  { id: 'now', label: 'Now (This Quarter)', placeholder: 'Features currently in development.', gridArea: 'now', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'next', label: 'Next (Next Quarter)', placeholder: 'Features planned for next cycle.', gridArea: 'next', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'later', label: 'Later (6+ Months)', placeholder: 'Vision features and long-term bets.', gridArea: 'later', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'not_doing', label: 'Not Doing', placeholder: 'Explicitly not building and why.', gridArea: 'notdoing', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700' },
];

const CANVAS_CONFIG: Record<CanvasType, { sections: CanvasSection[]; title: string; author: string; gridStyle: React.CSSProperties }> = {
  bmc: {
    sections: BMC_SECTIONS,
    title: 'Business Model Canvas',
    author: 'Osterwalder',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(10, 1fr)',
      gridTemplateRows: 'repeat(6, minmax(120px, auto))',
      gap: '4px',
      gridTemplateAreas: `
        "partners partners activities activities value value relationships relationships segments segments"
        "partners partners activities activities value value relationships relationships segments segments"
        "partners partners resources resources value value channels channels segments segments"
        "partners partners resources resources value value channels channels segments segments"
        "costs costs costs costs costs revenue revenue revenue revenue revenue"
        "costs costs costs costs costs revenue revenue revenue revenue revenue"
      `,
    },
  },
  lean: {
    sections: LEAN_SECTIONS,
    title: 'Lean Canvas',
    author: 'Ash Maurya',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(10, 1fr)',
      gridTemplateRows: 'repeat(6, minmax(120px, auto))',
      gap: '4px',
      gridTemplateAreas: `
        "problem problem solution solution uvp uvp advantage advantage segments segments"
        "problem problem solution solution uvp uvp advantage advantage segments segments"
        "problem problem metrics metrics uvp uvp channels channels segments segments"
        "problem problem metrics metrics uvp uvp channels channels segments segments"
        "costs costs costs costs costs revenue revenue revenue revenue revenue"
        "costs costs costs costs costs revenue revenue revenue revenue revenue"
      `,
    },
  },
  value_prop: {
    sections: VALUE_PROP_SECTIONS,
    title: 'Value Proposition Canvas',
    author: 'Strategyzer',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gridTemplateRows: 'repeat(4, minmax(140px, auto))',
      gap: '4px',
      gridTemplateAreas: `
        "jobs jobs jobs products products products"
        "jobs jobs jobs products products products"
        "pains pains gains gains relievers creators"
        "pains pains gains gains relievers creators"
      `,
    },
  },
  empathy: {
    sections: EMPATHY_SECTIONS,
    title: 'Empathy Map',
    author: 'XPLANE',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(4, minmax(120px, auto))',
      gap: '4px',
      gridTemplateAreas: `
        "think think think think"
        "hear see see saydo"
        "hear see see saydo"
        "pains pains gains gains"
      `,
    },
  },
  swot: {
    sections: SWOT_SECTIONS,
    title: 'SWOT Analysis',
    author: 'Strategic Planning',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(180px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "strengths weaknesses"
        "opportunities threats"
      `,
    },
  },
  gtm: {
    sections: GTM_SECTIONS,
    title: 'Go-To-Market Canvas',
    author: 'Strategic Planning',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(160px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "market positioning"
        "channels launch"
      `,
    },
  },
  icp: {
    sections: ICP_SECTIONS,
    title: 'ICP & Persona Board',
    author: 'Customer Discovery',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(160px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "company persona"
        "pains buying"
      `,
    },
  },
  pricing: {
    sections: PRICING_SECTIONS,
    title: 'Pricing & Packaging Canvas',
    author: 'Monetization Strategy',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(160px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "model tiers"
        "metric competition"
      `,
    },
  },
  growth_loops: {
    sections: GROWTH_LOOPS_SECTIONS,
    title: 'Growth Loops Canvas',
    author: 'Growth Strategy',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(160px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "trigger value"
        "acquisition retention"
      `,
    },
  },
  okrs: {
    sections: OKRS_SECTIONS,
    title: 'OKRs & North Star Canvas',
    author: 'Goal Setting',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(3, minmax(120px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "northstar northstar"
        "obj1 kr1"
        "obj2 kr2"
      `,
    },
  },
  fundraising: {
    sections: FUNDRAISING_SECTIONS,
    title: 'Fundraising Readiness Canvas',
    author: 'Investor Relations',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, minmax(160px, auto))',
      gap: '8px',
      gridTemplateAreas: `
        "target metrics"
        "materials investors"
      `,
    },
  },
  sales_pipeline: {
    sections: SALES_PIPELINE_SECTIONS,
    title: 'Sales Pipeline Canvas',
    author: 'Revenue Operations',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'minmax(200px, auto)',
      gap: '8px',
      gridTemplateAreas: `
        "overview stages metrics"
      `,
    },
  },
  roadmap: {
    sections: ROADMAP_SECTIONS,
    title: 'Product Roadmap Canvas',
    author: 'Product Strategy',
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'minmax(200px, auto)',
      gap: '8px',
      gridTemplateAreas: `
        "now next later notdoing"
      `,
    },
  },
};

export function CanvasTemplate({ type, data, onChange, disabled = false, reviewStatus, onSubmitForReview, onExport }: CanvasTemplateProps) {
  const { t } = useTranslation();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const config = CANVAS_CONFIG[type];
  const sections = config.sections;

  const handleEdit = (sectionId: string) => {
    setEditingSection(sectionId);
    setEditValue(data[sectionId] || '');
  };

  const handleSave = () => {
    if (editingSection) {
      onChange({ ...data, [editingSection]: editValue });
      setEditingSection(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditValue('');
  };

  const handleExport = () => {
    // Generate text export
    let exportText = `${config.title}\n${'='.repeat(config.title.length)}\n\n`;
    sections.forEach(section => {
      exportText += `## ${section.label}\n${data[section.id] || '(empty)'}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {config.title}
            <Badge variant="outline" className="ml-2">
              {config.author}
            </Badge>
            {reviewStatus === 'pending_review' && (
              <Badge className="bg-amber-100 text-amber-700">{t('templates.pendingReview')}</Badge>
            )}
            {reviewStatus === 'approved' && (
              <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />{t('templates.approved')}</Badge>
            )}
            {reviewStatus === 'needs_changes' && (
              <Badge className="bg-red-100 text-red-700"><MessageSquare className="h-3 w-3 mr-1" />{t('templates.needsChanges')}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport || handleExport}>
              <Download className="h-4 w-4 mr-1" />
              {t('templates.export')}
            </Button>
            {!disabled && onSubmitForReview && reviewStatus !== 'pending_review' && reviewStatus !== 'approved' && (
              <Button variant="default" size="sm" onClick={onSubmitForReview}>
                <Send className="h-4 w-4 mr-1" />
                {t('templates.submitForReview')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="w-full">
          <div style={config.gridStyle} className="min-w-[600px]">
            {sections.map((section) => {
              const isEditing = editingSection === section.id;
              const hasContent = !!data[section.id];

              return (
                <div
                  key={section.id}
                  style={{ gridArea: section.gridArea }}
                  className={`relative rounded-lg border-2 p-3 transition-all ${section.color} ${
                    !disabled ? 'hover:shadow-md cursor-pointer' : ''
                  }`}
                  onClick={() => !disabled && !isEditing && handleEdit(section.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-foreground/80">
                      {section.label}
                    </h4>
                    {!disabled && hasContent && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(section.id);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={section.placeholder}
                        className="min-h-[80px] text-sm bg-background/80"
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7">
                          <X className="h-3 w-3 mr-1" />
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleSave} className="h-7">
                          <Save className="h-3 w-3 mr-1" />
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : hasContent ? (
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-6">
                      {data[section.id]}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      {section.placeholder}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper to check if a template is a canvas template
export function getCanvasType(templateName: string): CanvasType | null {
  const name = templateName.toLowerCase();
  if (name.includes('business model canvas') || name.includes('bmc')) return 'bmc';
  if (name.includes('lean canvas')) return 'lean';
  if (name.includes('value proposition')) return 'value_prop';
  if (name.includes('empathy map')) return 'empathy';
  if (name.includes('swot')) return 'swot';
  if (name.includes('go-to-market') || name.includes('gtm')) return 'gtm';
  if (name.includes('icp') || name.includes('persona')) return 'icp';
  if (name.includes('pricing')) return 'pricing';
  if (name.includes('growth loop')) return 'growth_loops';
  if (name.includes('okr') || name.includes('north star')) return 'okrs';
  if (name.includes('fundraising') || name.includes('readiness')) return 'fundraising';
  if (name.includes('sales pipeline')) return 'sales_pipeline';
  if (name.includes('roadmap')) return 'roadmap';
  return null;
}