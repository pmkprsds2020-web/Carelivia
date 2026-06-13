'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
  SocialNeedsCategory,
  SocialNeedsQuestion,
  SocialNeedsRiskLevel,
  SocialNeedsScreeningResult,
  SocialNeedsAIResult,
  SocialNeedsCategoryScore,
} from '@/lib/types';
import {
  CATEGORY_META,
  SOCIAL_NEEDS_QUESTIONS,
  getRiskLevel,
  getRiskLevelDisplay,
  calculateScreeningResult,
  getQuestionsByCategory,
  getAIStatusLabel,
  getRecommendationCategoryLabel,
  generateLocalAIAnalysis,
} from '@/lib/social-needs-screening-data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Heart, Users, Home, Building2, Wallet, Car, MessageCircle,
  BookOpen, FileText, ChevronLeft, ChevronRight, Info,
  AlertTriangle, AlertCircle, CheckCircle, Sparkles, Save,
  Send, RotateCcw, TrendingUp, Shield, Activity, CircleDot,
  ClipboardList, BarChart3, Bell, Eye, Calendar, Clock,
  ArrowRight, History, Download,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// ICON MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Heart, Users, Home, Building2, Wallet, Car, MessageCircle, BookOpen, FileText,
};

function CategoryIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComp = CATEGORY_ICONS[name] || CircleDot;
  return <IconComp className={className} style={style} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY ORDER
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_ORDER: SocialNeedsCategory[] = [
  'dukungan_keluarga',
  'caregiver',
  'tempat_tinggal',
  'akses_layanan',
  'ekonomi',
  'transportasi',
  'interaksi_sosial',
  'kebutuhan_informasi',
  'pertanyaan_terbuka',
];

// ═══════════════════════════════════════════════════════════════════════════
// RISK GAUGE COMPONENT (Circular Progress)
// ═══════════════════════════════════════════════════════════════════════════

function RiskGauge({
  percentage,
  size = 120,
  strokeWidth = 10,
  label,
  riskLevel,
  showLabel = true,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  riskLevel: SocialNeedsRiskLevel;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const display = getRiskLevelDisplay(riskLevel);

  const colorMap: Record<SocialNeedsRiskLevel, string> = {
    rendah: '#16A34A',
    sedang: '#CA8A04',
    tinggi: '#EA580C',
    sangat_tinggi: '#DC2626',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[riskLevel]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: colorMap[riskLevel] }}>
            {percentage}%
          </span>
          <span className="text-xs text-muted-foreground">skor</span>
        </div>
      </div>
      {showLabel && label && (
        <span className="text-xs font-medium text-center mt-1 max-w-[100px]">{label}</span>
      )}
      {showLabel && (
        <Badge
          className="text-[10px] px-1.5 py-0"
          style={{
            backgroundColor: display.bgColor,
            color: display.color,
            borderColor: display.borderColor,
            border: `1px solid ${display.borderColor}`,
          }}
        >
          {display.label}
        </Badge>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY SCORE CARD
// ═══════════════════════════════════════════════════════════════════════════

function CategoryScoreCard({ score }: { score: SocialNeedsCategoryScore }) {
  const meta = CATEGORY_META[score.category];
  const display = getRiskLevelDisplay(score.riskLevel);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <CategoryIcon name={meta.icon} className="w-4 h-4" style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{score.categoryLabel}</p>
            <p className="text-xs text-muted-foreground">
              {score.totalScore}/{score.maxScore} poin
            </p>
          </div>
          <Badge
            className="text-[10px] shrink-0"
            style={{
              backgroundColor: display.bgColor,
              color: display.color,
              borderColor: display.borderColor,
              border: `1px solid ${display.borderColor}`,
            }}
          >
            {display.label}
          </Badge>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${score.percentage}%`,
              backgroundColor: display.color,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI RISK SCORE CARD
// ═══════════════════════════════════════════════════════════════════════════

function AIRiskScoreCard({
  title,
  icon: Icon,
  riskLevel,
}: {
  title: string;
  icon: React.ElementType;
  riskLevel: SocialNeedsRiskLevel;
}) {
  const display = getRiskLevelDisplay(riskLevel);
  const statusLabel = getAIStatusLabel(riskLevel);

  const percentageMap: Record<SocialNeedsRiskLevel, number> = {
    rendah: 20,
    sedang: 45,
    tinggi: 70,
    sangat_tinggi: 90,
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${display.color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: display.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{title}</p>
            <Badge
              className="mt-0.5 text-[10px]"
              style={{
                backgroundColor: display.bgColor,
                color: display.color,
                borderColor: display.borderColor,
                border: `1px solid ${display.borderColor}`,
              }}
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentageMap[riskLevel]}%`,
              backgroundColor: display.color,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONITORING GAUGE BAR (for Tab 3)
// ═══════════════════════════════════════════════════════════════════════════

function MonitoringGaugeBar({
  title,
  icon: Icon,
  value,
  maxValue,
  riskLevel,
}: {
  title: string;
  icon: React.ElementType;
  value: number;
  maxValue: number;
  riskLevel: SocialNeedsRiskLevel;
}) {
  const display = getRiskLevelDisplay(riskLevel);
  const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: display.color }} />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <Badge
            className="text-[10px]"
            style={{
              backgroundColor: display.bgColor,
              color: display.color,
              borderColor: display.borderColor,
              border: `1px solid ${display.borderColor}`,
            }}
          >
            {display.label}
          </Badge>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentage}%`,
              backgroundColor: display.color,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value}/{maxValue}</span>
          <span>{percentage}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK MONITORING HISTORY DATA
// ═══════════════════════════════════════════════════════════════════════════

interface ScreeningHistoryEntry {
  id: string;
  date: string;
  overallPercentage: number;
  overallRiskLevel: SocialNeedsRiskLevel;
  totalScore: number;
  maxScore: number;
  categoryScores: { category: string; percentage: number; riskLevel: SocialNeedsRiskLevel }[];
}

const MOCK_SCREENING_HISTORY: ScreeningHistoryEntry[] = [
  {
    id: 'hist-1',
    date: '2025-05-15T09:30:00Z',
    overallPercentage: 62,
    overallRiskLevel: 'tinggi',
    totalScore: 38,
    maxScore: 61,
    categoryScores: [
      { category: 'dukungan_keluarga', percentage: 70, riskLevel: 'tinggi' },
      { category: 'caregiver', percentage: 55, riskLevel: 'sedang' },
      { category: 'tempat_tinggal', percentage: 40, riskLevel: 'sedang' },
      { category: 'akses_layanan', percentage: 75, riskLevel: 'tinggi' },
      { category: 'ekonomi', percentage: 65, riskLevel: 'tinggi' },
      { category: 'transportasi', percentage: 50, riskLevel: 'sedang' },
      { category: 'interaksi_sosial', percentage: 45, riskLevel: 'sedang' },
    ],
  },
  {
    id: 'hist-2',
    date: '2025-07-20T14:00:00Z',
    overallPercentage: 48,
    overallRiskLevel: 'sedang',
    totalScore: 29,
    maxScore: 61,
    categoryScores: [
      { category: 'dukungan_keluarga', percentage: 55, riskLevel: 'sedang' },
      { category: 'caregiver', percentage: 45, riskLevel: 'sedang' },
      { category: 'tempat_tinggal', percentage: 35, riskLevel: 'sedang' },
      { category: 'akses_layanan', percentage: 60, riskLevel: 'sedang' },
      { category: 'ekonomi', percentage: 50, riskLevel: 'sedang' },
      { category: 'transportasi', percentage: 40, riskLevel: 'sedang' },
      { category: 'interaksi_sosial', percentage: 38, riskLevel: 'rendah' },
    ],
  },
  {
    id: 'hist-3',
    date: '2025-09-10T10:15:00Z',
    overallPercentage: 35,
    overallRiskLevel: 'sedang',
    totalScore: 21,
    maxScore: 61,
    categoryScores: [
      { category: 'dukungan_keluarga', percentage: 40, riskLevel: 'sedang' },
      { category: 'caregiver', percentage: 35, riskLevel: 'sedang' },
      { category: 'tempat_tinggal', percentage: 25, riskLevel: 'rendah' },
      { category: 'akses_layanan', percentage: 45, riskLevel: 'sedang' },
      { category: 'ekonomi', percentage: 38, riskLevel: 'sedang' },
      { category: 'transportasi', percentage: 30, riskLevel: 'rendah' },
      { category: 'interaksi_sosial', percentage: 28, riskLevel: 'rendah' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SocialNeedsScreeningPanelProps {
  embedded?: boolean;
}

export function SocialNeedsScreeningPanel({ embedded = false }: SocialNeedsScreeningPanelProps) {
  const { currentUser } = useStore();
  const { toast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('screening');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [screeningResult, setScreeningResult] = useState<SocialNeedsScreeningResult | null>(null);
  const [aiResult, setAiResult] = useState<SocialNeedsAIResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────
  const questionsByCategory = useMemo(() => getQuestionsByCategory(), []);
  const currentCategory = CATEGORY_ORDER[currentCategoryIndex];
  const currentQuestions = questionsByCategory[currentCategory] || [];
  const totalQuestions = SOCIAL_NEEDS_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;

  // Count answered required questions
  const answeredRequiredCount = useMemo(() => {
    return SOCIAL_NEEDS_QUESTIONS.filter(
      (q) => q.required && answers[q.id] !== undefined && answers[q.id] !== ''
    ).length;
  }, [answers]);

  const totalRequiredCount = SOCIAL_NEEDS_QUESTIONS.filter((q) => q.required).length;

  // Category progress
  const categoryProgress = useMemo(() => {
    const progress: Record<string, { answered: number; total: number }> = {};
    for (const cat of CATEGORY_ORDER) {
      const qs = questionsByCategory[cat] || [];
      const answered = qs.filter(
        (q) => answers[q.id] !== undefined && answers[q.id] !== ''
      ).length;
      progress[cat] = { answered, total: qs.length };
    }
    return progress;
  }, [answers, questionsByCategory]);

  // Live screening result
  const liveResult = useMemo(() => {
    if (answeredCount === 0) return null;
    return calculateScreeningResult(answers);
  }, [answers, answeredCount]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSingleChoice = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleMultipleChoice = useCallback(
    (questionId: string, value: string, checked: boolean) => {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) || [];
        if (checked) {
          return { ...prev, [questionId]: [...current, value] };
        } else {
          return { ...prev, [questionId]: current.filter((v) => v !== value) };
        }
      });
    },
    []
  );

  const handleTextArea = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentCategoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentCategoryIndex((prev) =>
      Math.min(CATEGORY_ORDER.length - 1, prev + 1)
    );
  }, []);

  const handleSaveDraft = useCallback(() => {
    toast({
      title: 'Draft Tersimpan',
      description: `${answeredCount} dari ${totalQuestions} pertanyaan telah disimpan.`,
    });
  }, [answeredCount, totalQuestions, toast]);

  const handleCompleteScreening = useCallback(() => {
    // Check if all required questions are answered
    const unansweredRequired = SOCIAL_NEEDS_QUESTIONS.filter(
      (q) => q.required && (!answers[q.id] || answers[q.id] === '')
    );

    if (unansweredRequired.length > 0) {
      toast({
        title: 'Pertanyaan Wajib Belum Lengkap',
        description: `Masih ada ${unansweredRequired.length} pertanyaan wajib yang belum dijawab.`,
        variant: 'destructive',
      });
      return;
    }

    const result = calculateScreeningResult(answers);
    setScreeningResult(result);
    setIsCompleted(true);
    setShowSummary(true);
    setActiveTab('results');
    toast({
      title: 'Skrining Selesai',
      description: `Skor keseluruhan: ${result.overallPercentage}% (${getRiskLevelDisplay(result.overallRiskLevel).label})`,
    });
  }, [answers, toast]);

  const handleResetForm = useCallback(() => {
    setAnswers({});
    setScreeningResult(null);
    setAiResult(null);
    setIsCompleted(false);
    setShowSummary(false);
    setCurrentCategoryIndex(0);
    setActiveTab('screening');
    toast({ title: 'Form Direset', description: 'Semua jawaban telah dihapus.' });
  }, [toast]);

  const handleRunAI = useCallback(async () => {
    const result = screeningResult || liveResult;
    if (!result) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await fetch('/api/social-needs-screening-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningResult: result,
          answers,
          patientData: {
            name: currentUser?.name,
            role: currentUser?.role,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Map API response to SocialNeedsAIResult format
        const mapped: SocialNeedsAIResult = {
          familySupportScore: data.familySupportScore || result.categoryScores.find(c => c.category === 'dukungan_keluarga')?.riskLevel || 'rendah',
          socialRiskScore: data.socialRiskScore || result.overallRiskLevel,
          caregiverBurnoutScore: data.caregiverBurnoutScore || result.categoryScores.find(c => c.category === 'caregiver')?.riskLevel || 'rendah',
          accessToCareScore: data.accessToCareScore || result.categoryScores.find(c => c.category === 'akses_layanan')?.riskLevel || 'rendah',
          financialRiskScore: data.financialRiskScore || result.categoryScores.find(c => c.category === 'ekonomi')?.riskLevel || 'rendah',
          socialIsolationScore: data.socialIsolationScore || result.categoryScores.find(c => c.category === 'interaksi_sosial')?.riskLevel || 'rendah',
          recommendations: (data.recommendations || []).map((a: { priority: number; action: string; reason: string; category: string }, i: number) => ({
            priority: a.priority || i + 1,
            action: a.action,
            reason: a.reason || '',
            category: a.category || 'monitoring_intensif',
          })),
          analysisSummary: data.analysisSummary || data.socialConditionSummary || 'Analisis AI kebutuhan sosial selesai.',
          earlyWarnings: (data.earlyWarnings || []).map((w: { type: string; severity: string; title: string; description: string }) => ({
            type: w.type || '',
            severity: w.severity || 'warning',
            title: w.title || '',
            description: w.description || '',
          })),
          generatedAt: data.generatedAt || new Date().toISOString(),
        };
        setAiResult(mapped);
      } else {
        throw new Error('API failed');
      }
    } catch {
      // Fallback to local AI analysis
      const localResult = generateLocalAIAnalysis(result, answers);
      setAiResult(localResult);
      toast({
        title: 'Menggunakan Analisis Lokal',
        description: 'API AI tidak tersedia, menggunakan analisis lokal sebagai fallback.',
      });
    } finally {
      setAiLoading(false);
    }
  }, [screeningResult, liveResult, answers, currentUser, toast]);

  // ── Render: Question ─────────────────────────────────────────────────────

  const renderQuestion = (question: SocialNeedsQuestion) => {
    const currentAnswer = answers[question.id];

    return (
      <div key={question.id} className="space-y-1.5 sm:space-y-3 pb-3 sm:pb-4">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm font-semibold text-[#2D8C7A] shrink-0">
            Q{question.questionNumber}.
          </span>
          <Label className="text-xs sm:text-sm font-medium leading-snug">
            {question.questionText}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>

        {/* Single Choice (Radio) */}
        {question.type === 'single_choice' && question.options && (
          <div className="space-y-1.5 sm:space-y-2 pl-1 sm:pl-2">
            {question.options.map((option) => {
              const isSelected = currentAnswer === option.value;
              const hasTooltip = question.hasTooltip && option.tooltip;

              return (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border cursor-pointer transition-all duration-200',
                    isSelected
                      ? 'border-[#2D8C7A] bg-[#2D8C7A]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                  onClick={() => handleSingleChoice(question.id, option.value)}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? 'border-[#2D8C7A] bg-[#2D8C7A]'
                        : 'border-gray-300'
                    )}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm flex-1',
                      isSelected ? 'font-medium text-[#2D8C7A]' : 'text-gray-700'
                    )}
                  >
                    {option.label}
                  </span>
                  {hasTooltip && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="text-muted-foreground hover:text-[#2D8C7A] transition-colors p-0.5 sm:p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-[280px] text-xs leading-relaxed"
                        >
                          {option.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Multiple Choice (Checkbox) */}
        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-1.5 sm:space-y-2 pl-1 sm:pl-2">
            {question.options.map((option) => {
              const selectedValues = (currentAnswer as string[]) || [];
              const isSelected = selectedValues.includes(option.value);

              return (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border cursor-pointer transition-all duration-200',
                    isSelected
                      ? 'border-[#2D8C7A] bg-[#2D8C7A]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                  onClick={() =>
                    handleMultipleChoice(question.id, option.value, !isSelected)
                  }
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? 'border-[#2D8C7A] bg-[#2D8C7A]'
                        : 'border-gray-300'
                    )}
                  >
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm flex-1',
                      isSelected ? 'font-medium text-[#2D8C7A]' : 'text-gray-700'
                    )}
                  >
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Area */}
        {question.type === 'text_area' && (
          <div className="pl-1 sm:pl-2">
            <Textarea
              placeholder="Tulis jawaban Anda di sini..."
              value={(currentAnswer as string) || ''}
              onChange={(e) => handleTextArea(question.id, e.target.value)}
              className="min-h-[80px] resize-y"
            />
          </div>
        )}
      </div>
    );
  };

  // ── Render: Category Navigation (Desktop) ────────────────────────────────

  const renderDesktopCategoryNav = () => (
    <div className="w-56 shrink-0">
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1 pr-2">
          {CATEGORY_ORDER.map((cat, idx) => {
            const meta = CATEGORY_META[cat];
            const progress = categoryProgress[cat];
            const isActive = idx === currentCategoryIndex;
            const isComplete = progress && progress.answered === progress.total && progress.total > 0;

            return (
              <button
                key={cat}
                onClick={() => setCurrentCategoryIndex(idx)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
                  isActive
                    ? 'bg-[#2D8C7A]/10 border border-[#2D8C7A]/30'
                    : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                    isActive ? 'bg-[#2D8C7A] text-white' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  <CategoryIcon name={meta.icon} className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-medium truncate',
                      isActive ? 'text-[#2D8C7A]' : 'text-gray-700'
                    )}
                  >
                    {meta.label}
                  </p>
                  {progress && (
                    <p className="text-[10px] text-muted-foreground">
                      {progress.answered}/{progress.total}
                    </p>
                  )}
                </div>
                {isComplete && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  // ── Render: Category Navigation (Mobile - Horizontal Scroll) ─────────────

  const renderMobileCategoryNav = () => (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORY_ORDER.map((cat, idx) => {
        const meta = CATEGORY_META[cat];
        const progress = categoryProgress[cat];
        const isActive = idx === currentCategoryIndex;
        const isComplete = progress && progress.answered === progress.total && progress.total > 0;

        return (
          <button
            key={cat}
            onClick={() => setCurrentCategoryIndex(idx)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-all border',
              isActive
                ? 'bg-[#2D8C7A] text-white border-[#2D8C7A]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            <CategoryIcon name={meta.icon} className="w-3.5 h-3.5" />
            <span className="font-medium">{meta.label}</span>
            {isComplete && <CheckCircle className="w-3 h-3 text-green-300" />}
          </button>
        );
      })}
    </div>
  );

  // ── Tab 1: Screening Form ────────────────────────────────────────────────

  const renderScreeningTab = () => {
    const meta = CATEGORY_META[currentCategory];

    return (
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Progress Header */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
              {answeredCount}/{totalQuestions} dijawab
            </p>
            <Progress
              value={(answeredCount / totalQuestions) * 100}
              className="h-1.5 sm:h-2"
            />
          </div>
          {liveResult && (
            <Badge
              variant="outline"
              className="shrink-0 text-[9px] sm:text-[10px]"
              style={{
                borderColor: getRiskLevelDisplay(liveResult.overallRiskLevel).borderColor,
                color: getRiskLevelDisplay(liveResult.overallRiskLevel).color,
                backgroundColor: getRiskLevelDisplay(liveResult.overallRiskLevel).bgColor,
              }}
            >
              {liveResult.overallPercentage}%
            </Badge>
          )}
        </div>

        {/* Main Content: Nav + Questions */}
        <div className="flex gap-4">
          {/* Desktop Category Navigation */}
          <div className="hidden md:block shrink-0">{renderDesktopCategoryNav()}</div>

          {/* Questions Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Mobile Category Navigation */}
            <div className="md:hidden mb-3 shrink-0">{renderMobileCategoryNav()}</div>

            <Card className="flex flex-col">
              <CardHeader className="py-2 sm:py-3 px-3 sm:px-6 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    <CategoryIcon name={meta.icon} className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base" style={{ color: meta.color }}>
                      {meta.label}
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs hidden sm:block">{meta.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="py-3 sm:pt-4 px-3 sm:px-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="pr-1 sm:pr-2 space-y-1">
                  {currentQuestions.map(renderQuestion)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 sticky bottom-0 py-2 bg-background/95 backdrop-blur-sm z-10">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentCategoryIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              className="gap-1.5 text-[#2D8C7A] border-[#2D8C7A]/30 hover:bg-[#2D8C7A]/5"
            >
              <Save className="w-4 h-4" />
              Simpan Draft
            </Button>
            {!isCompleted ? (
              <Button
                onClick={handleCompleteScreening}
                className="gap-1.5 bg-[#2D8C7A] hover:bg-[#2D8C7A]/90"
              >
                <Send className="w-4 h-4" />
                Selesai Skrining
              </Button>
            ) : (
              <Button
                onClick={() => setActiveTab('results')}
                className="gap-1.5 bg-[#2D8C7A] hover:bg-[#2D8C7A]/90"
              >
                Lihat Hasil
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentCategoryIndex === CATEGORY_ORDER.length - 1}
            className="gap-1"
          >
            Selanjutnya
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Screening Summary (shown after completion) ───────────────────────────

  const renderScreeningSummary = () => {
    const result = screeningResult || liveResult;
    if (!result) return null;

    const overallDisplay = getRiskLevelDisplay(result.overallRiskLevel);

    // Extract key findings from category scores
    const familySupport = result.categoryScores.find(c => c.category === 'dukungan_keluarga');
    const economic = result.categoryScores.find(c => c.category === 'ekonomi');
    const caregiver = result.categoryScores.find(c => c.category === 'caregiver');
    const socialAssist = result.categoryScores.find(c => c.category === 'akses_layanan');
    const healthAccess = result.categoryScores.find(c => c.category === 'akses_layanan');

    const riskColorMap: Record<SocialNeedsRiskLevel, string> = {
      rendah: 'text-green-600',
      sedang: 'text-amber-600',
      tinggi: 'text-orange-600',
      sangat_tinggi: 'text-red-600',
    };

    const riskBgMap: Record<SocialNeedsRiskLevel, string> = {
      rendah: 'bg-green-50 border-green-200',
      sedang: 'bg-amber-50 border-amber-200',
      tinggi: 'bg-orange-50 border-orange-200',
      sangat_tinggi: 'bg-red-50 border-red-200',
    };

    // Generate recommendations based on risk level
    const generateRecommendations = () => {
      const recs: string[] = [];
      if (result.overallRiskLevel === 'tinggi' || result.overallRiskLevel === 'sangat_tinggi') {
        recs.push('Rujuk ke pekerja sosial medis untuk intervensi komprehensif');
      }
      if (familySupport && (familySupport.riskLevel === 'tinggi' || familySupport.riskLevel === 'sangat_tinggi')) {
        recs.push('Lakukan family meeting untuk meningkatkan dukungan keluarga');
      }
      if (economic && (economic.riskLevel === 'tinggi' || economic.riskLevel === 'sangat_tinggi')) {
        recs.push('Evaluasi kebutuhan bantuan finansial dan akses BPJS/JSK');
      }
      if (caregiver && (caregiver.riskLevel === 'tinggi' || caregiver.riskLevel === 'sangat_tinggi')) {
        recs.push('Assess caregiver burnout dan sediakan dukungan respite care');
      }
      if (socialAssist && (socialAssist.riskLevel === 'tinggi' || socialAssist.riskLevel === 'sangat_tinggi')) {
        recs.push('Fasilitasi akses ke bantuan sosial dan layanan transportasi');
      }
      if (healthAccess && (healthAccess.riskLevel === 'tinggi' || healthAccess.riskLevel === 'sangat_tinggi')) {
        recs.push('Evaluasi hambatan akses pelayanan kesehatan dan cari solusi alternatif');
      }
      if (recs.length === 0) {
        recs.push('Lanjutkan monitoring rutin kebutuhan sosial pasien');
        recs.push('Edukasi keluarga tentang sumber daya dukungan yang tersedia');
      }
      return recs;
    };

    return (
      <div className="space-y-4">
        {/* Summary Header */}
        <Card className={cn('border-2', riskBgMap[result.overallRiskLevel])}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <RiskGauge
                percentage={result.overallPercentage}
                size={120}
                strokeWidth={10}
                riskLevel={result.overallRiskLevel}
                label="Risiko Keseluruhan"
              />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-semibold">Skrining Selesai</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Skor total: <span className={cn('font-bold', riskColorMap[result.overallRiskLevel])}>{result.totalScore}/{result.maxScore}</span> poin
                </p>
                <Badge
                  className="text-sm px-3 py-1"
                  style={{
                    backgroundColor: overallDisplay.bgColor,
                    color: overallDisplay.color,
                    borderColor: overallDisplay.borderColor,
                    border: `1px solid ${overallDisplay.borderColor}`,
                  }}
                >
                  Risiko {overallDisplay.label}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(result.completedAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Findings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Status Dukungan Keluarga */}
          {familySupport && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium">Dukungan Keluarga</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-lg font-bold', riskColorMap[familySupport.riskLevel])}>
                    {familySupport.totalScore}/{familySupport.maxScore}
                  </span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor: getRiskLevelDisplay(familySupport.riskLevel).bgColor,
                      color: getRiskLevelDisplay(familySupport.riskLevel).color,
                      borderColor: getRiskLevelDisplay(familySupport.riskLevel).borderColor,
                      border: `1px solid ${getRiskLevelDisplay(familySupport.riskLevel).borderColor}`,
                    }}
                  >
                    {getRiskLevelDisplay(familySupport.riskLevel).label}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${familySupport.percentage}%`,
                      backgroundColor: getRiskLevelDisplay(familySupport.riskLevel).color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kondisi Ekonomi */}
          {economic && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Kondisi Ekonomi</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-lg font-bold', riskColorMap[economic.riskLevel])}>
                    {economic.totalScore}/{economic.maxScore}
                  </span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor: getRiskLevelDisplay(economic.riskLevel).bgColor,
                      color: getRiskLevelDisplay(economic.riskLevel).color,
                      borderColor: getRiskLevelDisplay(economic.riskLevel).borderColor,
                      border: `1px solid ${getRiskLevelDisplay(economic.riskLevel).borderColor}`,
                    }}
                  >
                    {getRiskLevelDisplay(economic.riskLevel).label}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${economic.percentage}%`,
                      backgroundColor: getRiskLevelDisplay(economic.riskLevel).color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kebutuhan Caregiver */}
          {caregiver && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Kebutuhan Caregiver</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-lg font-bold', riskColorMap[caregiver.riskLevel])}>
                    {caregiver.totalScore}/{caregiver.maxScore}
                  </span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor: getRiskLevelDisplay(caregiver.riskLevel).bgColor,
                      color: getRiskLevelDisplay(caregiver.riskLevel).color,
                      borderColor: getRiskLevelDisplay(caregiver.riskLevel).borderColor,
                      border: `1px solid ${getRiskLevelDisplay(caregiver.riskLevel).borderColor}`,
                    }}
                  >
                    {getRiskLevelDisplay(caregiver.riskLevel).label}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${caregiver.percentage}%`,
                      backgroundColor: getRiskLevelDisplay(caregiver.riskLevel).color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kebutuhan Bantuan Sosial */}
          {socialAssist && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-medium">Hambatan Akses Layanan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-lg font-bold', riskColorMap[socialAssist.riskLevel])}>
                    {socialAssist.totalScore}/{socialAssist.maxScore}
                  </span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor: getRiskLevelDisplay(socialAssist.riskLevel).bgColor,
                      color: getRiskLevelDisplay(socialAssist.riskLevel).color,
                      borderColor: getRiskLevelDisplay(socialAssist.riskLevel).borderColor,
                      border: `1px solid ${getRiskLevelDisplay(socialAssist.riskLevel).borderColor}`,
                    }}
                  >
                    {getRiskLevelDisplay(socialAssist.riskLevel).label}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${socialAssist.percentage}%`,
                      backgroundColor: getRiskLevelDisplay(socialAssist.riskLevel).color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Risiko Masalah Sosial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Risiko Masalah Sosial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('p-4 rounded-lg border', riskBgMap[result.overallRiskLevel])}>
              <div className="flex items-center gap-3">
                <div className={cn('text-3xl font-bold', riskColorMap[result.overallRiskLevel])}>
                  {result.overallPercentage}%
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', riskColorMap[result.overallRiskLevel])}>
                    Risiko {overallDisplay.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.overallRiskLevel === 'rendah' && 'Pasien memiliki risiko masalah sosial yang rendah. Monitoring rutin tetap diperlukan.'}
                    {result.overallRiskLevel === 'sedang' && 'Pasien memiliki risiko masalah sosial sedang. Diperlukan intervensi preventif dan monitoring berkala.'}
                    {result.overallRiskLevel === 'tinggi' && 'Pasien memiliki risiko masalah sosial tinggi. Diperlukan intervensi segera dan monitoring intensif.'}
                    {result.overallRiskLevel === 'sangat_tinggi' && 'Pasien memiliki risiko masalah sosial sangat tinggi. Diperlukan intervensi krisis dan rujukan ke pekerja sosial.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rekomendasi Tindak Lanjut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#2D8C7A]" />
              Rekomendasi Tindak Lanjut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generateRecommendations().map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50/50">
                  <div className="w-6 h-6 rounded-full bg-[#2D8C7A]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#2D8C7A]">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={handleRunAI}
            disabled={aiLoading}
            className="gap-2 bg-[#D9B26F] hover:bg-[#D9B26F]/90 text-white w-full sm:w-auto"
          >
            {aiLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menganalisis AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analisis AI Lanjutan
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowSummary(false); setActiveTab('results'); }}
            className="gap-2 w-full sm:w-auto"
          >
            <Eye className="w-4 h-4" />
            Lihat Hasil Detail
          </Button>
          <Button
            variant="outline"
            onClick={handleResetForm}
            className="gap-2 w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Ulangi Skrining
          </Button>
        </div>
      </div>
    );
  };

  // ── Tab 2: Results & AI Analysis ─────────────────────────────────────────

  const renderResultsTab = () => {
    // If just completed, show summary first
    if (showSummary) {
      return renderScreeningSummary();
    }

    const result = screeningResult || liveResult;

    if (!result) {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum Ada Hasil Skrining</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Silakan lengkapi skrining terlebih dahulu untuk melihat hasil analisis.
            </p>
            <Button
              onClick={() => setActiveTab('screening')}
              className="bg-[#2D8C7A] hover:bg-[#2D8C7A]/90"
            >
              Mulai Skrining
            </Button>
          </CardContent>
        </Card>
      );
    }

    const overallDisplay = getRiskLevelDisplay(result.overallRiskLevel);

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <RiskGauge
                percentage={result.overallPercentage}
                size={140}
                strokeWidth={12}
                riskLevel={result.overallRiskLevel}
                label="Risiko Keseluruhan"
              />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-semibold mb-1">Hasil Skrining Kebutuhan Sosial</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Skor total: {result.totalScore}/{result.maxScore} poin
                </p>
                <Badge
                  className="text-sm px-3 py-1"
                  style={{
                    backgroundColor: overallDisplay.bgColor,
                    color: overallDisplay.color,
                    borderColor: overallDisplay.borderColor,
                    border: `1px solid ${overallDisplay.borderColor}`,
                  }}
                >
                  Risiko {overallDisplay.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-3">
                  Diselesaikan: {new Date(result.completedAt).toLocaleString('id-ID')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  className="mt-3 gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Ulangi Skrining
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Scores Grid */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#2D8C7A]" />
            Skor per Kategori
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.categoryScores.map((cs) => (
              <CategoryScoreCard key={cs.category} score={cs} />
            ))}
          </div>
        </div>

        <Separator />

        {/* AI Analysis Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D9B26F]" />
                Analisis AI Kebutuhan Sosial
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dapatkan analisis mendalam dan rekomendasi berbasis AI
              </p>
            </div>
            <Button
              onClick={handleRunAI}
              disabled={aiLoading}
              className="gap-2 bg-[#D9B26F] hover:bg-[#D9B26F]/90 text-white shrink-0"
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisis AI Kebutuhan Sosial
                </>
              )}
            </Button>
          </div>

          {/* AI Loading State */}
          {aiLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 border-4 border-[#D9B26F]/30 border-t-[#D9B26F] rounded-full animate-spin mx-auto mb-4" />
                <h4 className="font-semibold mb-1">AI Sedang Menganalisis</h4>
                <p className="text-sm text-muted-foreground">
                  Menganalisis data skrining kebutuhan sosial pasien...
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Results */}
          {aiResult && !aiLoading && (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="border-[#D9B26F]/30 bg-[#D9B26F]/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#D9B26F] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Ringkasan Analisis</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiResult.analysisSummary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6 Risk Score Cards */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Skor Risiko AI</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AIRiskScoreCard
                    title="Dukungan Keluarga"
                    icon={Heart}
                    riskLevel={aiResult.familySupportScore}
                  />
                  <AIRiskScoreCard
                    title="Risiko Sosial"
                    icon={Shield}
                    riskLevel={aiResult.socialRiskScore}
                  />
                  <AIRiskScoreCard
                    title="Caregiver Burnout"
                    icon={Users}
                    riskLevel={aiResult.caregiverBurnoutScore}
                  />
                  <AIRiskScoreCard
                    title="Akses Pelayanan"
                    icon={Building2}
                    riskLevel={aiResult.accessToCareScore}
                  />
                  <AIRiskScoreCard
                    title="Risiko Finansial"
                    icon={Wallet}
                    riskLevel={aiResult.financialRiskScore}
                  />
                  <AIRiskScoreCard
                    title="Isolasi Sosial"
                    icon={MessageCircle}
                    riskLevel={aiResult.socialIsolationScore}
                  />
                </div>
              </div>

              {/* Recommendations */}
              {aiResult.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#2D8C7A]" />
                    Rekomendasi Intervensi
                  </h4>
                  <div className="space-y-2">
                    {aiResult.recommendations.map((rec, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#2D8C7A]/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#2D8C7A]">
                                {rec.priority}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-sm font-medium">{rec.action}</p>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                  style={{
                                    borderColor: '#2D8C7A40',
                                    color: '#2D8C7A',
                                  }}
                                >
                                  {getRecommendationCategoryLabel(rec.category)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {rec.reason}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Early Warnings */}
              {aiResult.earlyWarnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Peringatan Dini
                  </h4>
                  <div className="space-y-2">
                    {aiResult.earlyWarnings.map((warning, idx) => (
                      <Card
                        key={idx}
                        className={cn(
                          'border-l-4',
                          warning.severity === 'critical'
                            ? 'border-l-red-500 bg-red-50/50'
                            : warning.severity === 'warning'
                            ? 'border-l-orange-500 bg-orange-50/50'
                            : 'border-l-blue-500 bg-blue-50/50'
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {warning.severity === 'critical' ? (
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            ) : warning.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{warning.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {warning.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation Timestamp */}
              <p className="text-[10px] text-muted-foreground text-center">
                Dihasilkan pada: {new Date(aiResult.generatedAt).toLocaleString('id-ID')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Tab 3: Monitoring Dashboard ──────────────────────────────────────────

  const renderMonitoringTab = () => {
    const result = screeningResult || liveResult;

    // Mock data for monitoring
    const mockMonitoringData = [
      {
        title: 'Social Risk Score',
        icon: Shield,
        value: result?.totalScore ?? 12,
        maxValue: result?.maxScore ?? 30,
        riskLevel: result?.overallRiskLevel ?? 'sedang',
      },
      {
        title: 'Family Support',
        icon: Heart,
        value: result?.categoryScores.find((c) => c.category === 'dukungan_keluarga')?.totalScore ?? 5,
        maxValue: result?.categoryScores.find((c) => c.category === 'dukungan_keluarga')?.maxScore ?? 15,
        riskLevel: result?.categoryScores.find((c) => c.category === 'dukungan_keluarga')?.riskLevel ?? 'sedang',
      },
      {
        title: 'Caregiver Burden',
        icon: Users,
        value: result?.categoryScores.find((c) => c.category === 'caregiver')?.totalScore ?? 7,
        maxValue: result?.categoryScores.find((c) => c.category === 'caregiver')?.maxScore ?? 12,
        riskLevel: result?.categoryScores.find((c) => c.category === 'caregiver')?.riskLevel ?? 'tinggi',
      },
      {
        title: 'Financial Risk',
        icon: Wallet,
        value: result?.categoryScores.find((c) => c.category === 'ekonomi')?.totalScore ?? 4,
        maxValue: result?.categoryScores.find((c) => c.category === 'ekonomi')?.maxScore ?? 12,
        riskLevel: result?.categoryScores.find((c) => c.category === 'ekonomi')?.riskLevel ?? 'sedang',
      },
      {
        title: 'Access to Care',
        icon: Building2,
        value: result?.categoryScores.find((c) => c.category === 'akses_layanan')?.totalScore ?? 3,
        maxValue: result?.categoryScores.find((c) => c.category === 'akses_layanan')?.maxScore ?? 9,
        riskLevel: result?.categoryScores.find((c) => c.category === 'akses_layanan')?.riskLevel ?? 'sedang',
      },
      {
        title: 'Social Isolation',
        icon: MessageCircle,
        value: result?.categoryScores.find((c) => c.category === 'interaksi_sosial')?.totalScore ?? 2,
        maxValue: result?.categoryScores.find((c) => c.category === 'interaksi_sosial')?.maxScore ?? 9,
        riskLevel: result?.categoryScores.find((c) => c.category === 'interaksi_sosial')?.riskLevel ?? 'rendah',
      },
    ];

    // Mock trend data - include history + current result
    const allHistory = [
      ...MOCK_SCREENING_HISTORY,
      ...(result ? [{
        id: 'hist-current',
        date: result.completedAt,
        overallPercentage: result.overallPercentage,
        overallRiskLevel: result.overallRiskLevel,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        categoryScores: result.categoryScores.map(cs => ({
          category: cs.category,
          percentage: cs.percentage,
          riskLevel: cs.riskLevel,
        })),
      }] : []),
    ];

    const trendData = allHistory.map((h, idx) => ({
      label: new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      value: h.overallPercentage,
    }));
    const maxTrendValue = Math.max(...trendData.map((d) => d.value), 1);

    // Mock high-risk patients
    const highRiskPatients = [
      { name: 'Siti Rahayu', score: 78, risk: 'sangat_tinggi' as SocialNeedsRiskLevel, category: 'Caregiver Burnout' },
      { name: 'Ahmad Hidayat', score: 65, risk: 'tinggi' as SocialNeedsRiskLevel, category: 'Risiko Finansial' },
      { name: 'Dewi Lestari', score: 52, risk: 'tinggi' as SocialNeedsRiskLevel, category: 'Isolasi Sosial' },
    ];

    // Mock early warnings
    const monitoringWarnings = aiResult?.earlyWarnings || [
      { type: 'caregiver_burnout', severity: 'warning' as const, title: 'Risiko Caregiver Burnout', description: 'Caregiver menunjukkan tanda kelelahan. Pertimbangkan dukungan tambahan.' },
      { type: 'financial_burden', severity: 'info' as const, title: 'Pemantauan Finansial', description: 'Biaya pengobatan meningkat. Evaluasi kebutuhan bantuan sosial.' },
    ];

    return (
      <div className="space-y-6">
        {/* Score Gauges Row */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2D8C7A]" />
            Skor Monitoring Kebutuhan Sosial
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {mockMonitoringData.map((item) => (
              <RiskGauge
                key={item.title}
                percentage={item.maxValue > 0 ? Math.round((item.value / item.maxValue) * 100) : 0}
                size={90}
                strokeWidth={8}
                label={item.title}
                riskLevel={item.riskLevel}
              />
            ))}
          </div>
        </div>

        {/* Gauge Bars */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#2D8C7A]" />
            Detail Skor
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockMonitoringData.map((item) => (
              <MonitoringGaugeBar
                key={item.title}
                title={item.title}
                icon={item.icon}
                value={item.value}
                maxValue={item.maxValue}
                riskLevel={item.riskLevel}
              />
            ))}
          </div>
        </div>

        {/* Trend Chart (CSS-based) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2D8C7A]" />
              Tren Risiko Sosial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {trendData.map((item, idx) => {
                const heightPct = (item.value / maxTrendValue) * 100;
                const barColor = item.value <= 25 ? '#16A34A' : item.value <= 50 ? '#CA8A04' : item.value <= 75 ? '#EA580C' : '#DC2626';

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium" style={{ color: barColor }}>
                      {item.value}%
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all duration-500 min-h-[4px]"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: barColor,
                        opacity: idx === trendData.length - 1 ? 1 : 0.7,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monitoring History Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[#2D8C7A]" />
                Riwayat Monitoring
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#2D8C7A]"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Sembunyikan' : 'Lihat Semua'}
                <ChevronRight className={cn('w-3 h-3 ml-1 transition-transform', showHistory && 'rotate-90')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Latest screening summary */}
            {allHistory.length > 0 && (
              <div className="space-y-3">
                {allHistory.slice().reverse().slice(0, showHistory ? undefined : 3).map((entry, idx) => {
                  const display = getRiskLevelDisplay(entry.overallRiskLevel);
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'p-3 rounded-lg border transition-all',
                        isLatest ? 'border-[#2D8C7A]/30 bg-[#2D8C7A]/5' : 'border-gray-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {new Date(entry.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {isLatest && (
                            <Badge className="text-[9px] bg-[#2D8C7A] text-white">Terbaru</Badge>
                          )}
                        </div>
                        <Badge
                          className="text-[10px]"
                          style={{
                            backgroundColor: display.bgColor,
                            color: display.color,
                            borderColor: display.borderColor,
                            border: `1px solid ${display.borderColor}`,
                          }}
                        >
                          {display.label} ({entry.overallPercentage}%)
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {entry.categoryScores.slice(0, 4).map((cs) => {
                          const meta = CATEGORY_META[cs.category as SocialNeedsCategory];
                          const csDisplay = getRiskLevelDisplay(cs.riskLevel);
                          return (
                            <div key={cs.category} className="text-xs">
                              <span className="text-muted-foreground">{meta?.label || cs.category}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${cs.percentage}%`, backgroundColor: csDisplay.color }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: csDisplay.color }}>
                                  {cs.percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {allHistory.length === 0 && (
              <div className="text-center py-6">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada riwayat monitoring</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Row: High-Risk Patients + Early Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* High-Risk Patients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                Pasien Risiko Tinggi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {highRiskPatients.map((patient, idx) => {
                const display = getRiskLevelDisplay(patient.risk);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                    style={{ borderColor: display.borderColor, backgroundColor: display.bgColor }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold border"
                      style={{ color: display.color, borderColor: display.borderColor }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: display.color }}>
                        {patient.score}%
                      </p>
                      <Badge
                        className="text-[9px]"
                        style={{
                          backgroundColor: display.bgColor,
                          color: display.color,
                          borderColor: display.borderColor,
                          border: `1px solid ${display.borderColor}`,
                        }}
                      >
                        {display.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Early Warnings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                Notifikasi Peringatan Dini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {monitoringWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-2 p-2.5 rounded-lg border',
                    warning.severity === 'critical'
                      ? 'border-l-4 border-l-red-500 bg-red-50/50'
                      : warning.severity === 'warning'
                      ? 'border-l-4 border-l-orange-500 bg-orange-50/50'
                      : 'border-l-4 border-l-blue-500 bg-blue-50/50'
                  )}
                >
                  {warning.severity === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  ) : warning.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{warning.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {warning.description}
                    </p>
                  </div>
                </div>
              ))}
              {monitoringWarnings.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tidak ada peringatan saat ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const wrapperClass = embedded
    ? 'flex flex-col h-full min-h-0 overflow-y-auto'
    : 'p-4 flex flex-col h-[calc(100vh-8rem)] min-h-0 overflow-y-auto';

  return (
    <div className={wrapperClass}>
      {/* Header - only show in standalone mode */}
      {!embedded && (
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#2D8C7A' }}>
              <Heart className="w-5 h-5" />
              Skrining Kebutuhan Sosial
            </h2>
            <p className="text-xs text-muted-foreground">
              Penilaian kebutuhan sosial pasien paliatif berbasis skrining komprehensif
            </p>
          </div>
          {currentUser && (
            <Badge variant="outline" className="text-xs shrink-0">
              {currentUser.name} ({currentUser.role})
            </Badge>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('flex-1 flex flex-col min-h-0', !embedded && 'mt-3')}>
        <TabsList className={cn('grid grid-cols-3 shrink-0', embedded ? 'w-full' : 'w-full')}>
          <TabsTrigger value="screening" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Skrining</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hasil & Analisis AI</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard Monitoring</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screening" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderScreeningTab()}
        </TabsContent>

        <TabsContent value="results" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderResultsTab()}
        </TabsContent>

        <TabsContent value="monitoring" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderMonitoringTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helper: Map API category strings to SocialNeedsAIRecommendation category ──

function mapActionCategory(
  category: string | undefined
): 'edukasi_keluarga' | 'family_meeting' | 'home_visit' | 'konseling_psikososial'
    | 'dukungan_caregiver' | 'bantuan_finansial' | 'bantuan_transportasi'
    | 'rujukan_pekerja_sosial' | 'pendampingan_spiritual' | 'monitoring_intensif' {
  const mapping: Record<string, string> = {
    family_meeting: 'family_meeting',
    caregiver_support: 'dukungan_caregiver',
    home_visit: 'home_visit',
    family_education: 'edukasi_keluarga',
    monitoring: 'monitoring_intensif',
    financial_support: 'bantuan_finansial',
    transport_support: 'bantuan_transportasi',
    psychosocial: 'konseling_psikososial',
    other: 'rujukan_pekerja_sosial',
  };
  return (mapping[category || ''] || 'monitoring_intensif') as typeof mapActionCategory extends (...args: unknown[]) => infer R ? R : never;
}
