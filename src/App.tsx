import { useState, useMemo, useEffect } from 'react';
import { 
  Compass,
  Search,
  Filter,
  School,
  BookOpen,
  Users,
  FlaskConical,
  Settings,
  Stethoscope,
  GraduationCap as EducationIcon,
  RotateCcw,
  Sparkles,
  Target,
  Calendar,
  Sliders,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { convertGrade, ConversionVersion, parseCSV, Category } from './lib/admissionUtils';
import { rawCSV } from './data/rawCSV';

export type SearchMode = 'current' | 'projected' | 'goal_seek';

export default function App() {
  const [searchMode, setSearchMode] = useState<SearchMode>('projected');

  // 이수 완료 학기 선택 (기본: 1-2까지)
  const [completedSemester, setCompletedSemester] = useState<'1-1' | '1-2' | '2-1' | '2-2'>('1-2');

  // 슬라이더 바 기준 등급
  const [sliderGpa, setSliderGpa] = useState<number>(1.40);
  const [sliderInput, setSliderInput] = useState<string>('1.400');

  // 1-1부터 3-1까지 5개 학기 성적 상태
  const [grades, setGrades] = useState({
    sem1_1: '1.40',
    sem1_2: '1.40',
    sem2_1: '',
    sem2_2: '',
    sem3_1: ''
  });

  const [conversionVersion, setConversionVersion] = useState<ConversionVersion>('mixed');
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRange, setSearchRange] = useState<number>(0.1);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('전체');
  const [displayLimit, setDisplayLimit] = useState<number>(90);
  const [includeTopTier, setIncludeTopTier] = useState<boolean>(true);

  useEffect(() => {
    setDisplayLimit(90);
  }, [conversionVersion, selectedCategory, searchQuery, searchRange, selectedUniversity, grades, searchMode, includeTopTier, completedSemester]);

  const allRecords = useMemo(() => parseCSV(rawCSV), []);

  const universityList = useMemo(() => {
    const unis = Array.from(new Set(allRecords.map(r => r.university))).sort();
    return ['전체', ...unis];
  }, [allRecords]);

  // 9등급 -> 5등급 역산 함수
  const invert9to5 = useMemo(() => {
    return (targetGrade9: number): number => {
      let low = 1.000;
      let high = 5.000;
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2;
        const converted = convertGrade(mid, conversionVersion).grade9;
        if (converted < targetGrade9) low = mid;
        else high = mid;
      }
      return (low + high) / 2;
    };
  }, [conversionVersion]);

  // 이수 완료 학기 수 매핑
  const completedCount = useMemo(() => {
    const map = { '1-1': 1, '1-2': 2, '2-1': 3, '2-2': 4 };
    return map[completedSemester];
  }, [completedSemester]);

  // 슬라이더 조작 시: 선택된 이수 학기에 일괄 반영
  const handleSliderChange = (val: number) => {
    setSliderGpa(val);
    setSliderInput(val.toFixed(3));

    const formatted = val.toFixed(2);
    setGrades(prev => {
      const next = { ...prev };
      if (completedCount >= 1) next.sem1_1 = formatted;
      if (completedCount >= 2) next.sem1_2 = formatted;
      if (completedCount >= 3) next.sem2_1 = formatted;
      if (completedCount >= 4) next.sem2_2 = formatted;
      return next;
    });
  };

  const handleSliderInputChange = (text: string) => {
    setSliderInput(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num >= 1.0 && num <= 5.0) {
      handleSliderChange(num);
    }
  };

  const handleSliderInputBlur = () => {
    const num = parseFloat(sliderInput);
    if (isNaN(num) || num < 1.0) {
      handleSliderChange(1.0);
    } else if (num > 5.0) {
      handleSliderChange(5.0);
    } else {
      setSliderInput(num.toFixed(3));
    }
  };

  // 남은 학기(예측) 개별 수정 핸들러
  const handleGradeChange = (key: keyof typeof grades, value: string) => {
    setGrades(prev => ({ ...prev, [key]: value }));
  };

  // 5개 학기 통계 집계
  const semesterInfo = useMemo(() => {
    const parse = (val: string, fallback: number) => {
      const num = parseFloat(val);
      return (!isNaN(num) && num >= 1.0 && num <= 5.0) ? num : fallback;
    };

    const g1_1 = parse(grades.sem1_1, sliderGpa);
    const g1_2 = parse(grades.sem1_2, g1_1);
    const g2_1 = parse(grades.sem2_1, g1_2);
    const g2_2 = parse(grades.sem2_2, g2_1);
    const g3_1 = parse(grades.sem3_1, g2_2);

    const allSemesters = [
      { id: 'sem1_1', name: '1학년 1학기', short: '1-1', grade: g1_1, raw: grades.sem1_1 },
      { id: 'sem1_2', name: '1학년 2학기', short: '1-2', grade: g1_2, raw: grades.sem1_2 },
      { id: 'sem2_1', name: '2학년 1학기', short: '2-1', grade: g2_1, raw: grades.sem2_1 },
      { id: 'sem2_2', name: '2학년 2학기', short: '2-2', grade: g2_2, raw: grades.sem2_2 },
      { id: 'sem3_1', name: '3학년 1학기', short: '3-1', grade: g3_1, raw: grades.sem3_1 },
    ];

    const remainingCount = 5 - completedCount;
    const completedSemList = allSemesters.slice(0, completedCount);
    const remainingSemList = allSemesters.slice(completedCount);

    const completedSum = completedSemList.reduce((acc, cur) => acc + cur.grade, 0);
    const completedAvg = completedSum / completedCount;

    const totalSum = allSemesters.reduce((acc, cur) => acc + cur.grade, 0);
    const projectedGpa5 = totalSum / 5;

    return {
      allSemesters,
      completedCount,
      remainingCount,
      completedSemList,
      remainingSemList,
      completedAvg,
      completedSum,
      projectedGpa5
    };
  }, [grades, completedCount, sliderGpa]);

  // 현재 이수 완료 기준 환산
  const currentConversion = useMemo(() => {
    return convertGrade(semesterInfo.completedAvg, conversionVersion);
  }, [semesterInfo.completedAvg, conversionVersion]);

  // 예상 최종 5개 학기 환산
  const projectedConversion = useMemo(() => {
    return convertGrade(semesterInfo.projectedGpa5, conversionVersion);
  }, [semesterInfo.projectedGpa5, conversionVersion]);

  const activeConversion = useMemo(() => {
    return searchMode === 'projected' ? projectedConversion : currentConversion;
  }, [searchMode, projectedConversion, currentConversion]);

  // 최상위권 소신 설정
  const isTopTierGrade = activeConversion.grade9 <= 1.55;
  const lowerBound = useMemo(() => {
    if (searchMode === 'goal_seek') return 1.00;
    if (isTopTierGrade && includeTopTier) return 1.00;
    return Math.max(1.00, activeConversion.grade9 - searchRange);
  }, [activeConversion.grade9, searchRange, isTopTierGrade, includeTopTier, searchMode]);

  const upperBound = useMemo(() => {
    if (searchMode === 'goal_seek') return 9.00;
    return activeConversion.grade9 + searchRange;
  }, [activeConversion.grade9, searchRange, searchMode]);

  // 목표 대학 합격을 위한 남은 학기 필요 등급 역산
  const calculateRequiredRemainingGrade = (deptCut9: number) => {
    const targetGpa5 = invert9to5(deptCut9);
    const totalNeededSum = targetGpa5 * 5;
    const neededForRemaining = totalNeededSum - semesterInfo.completedSum;
    const requiredAvg = neededForRemaining / semesterInfo.remainingCount;

    return {
      targetGpa5,
      requiredAvg,
      remainingCount: semesterInfo.remainingCount
    };
  };

  const categoryCounts = useMemo(() => {
    const baseFiltered = allRecords.filter(record => {
      const gradeMatch = searchMode === 'goal_seek' || (record.averageGrade >= lowerBound && record.averageGrade <= upperBound);
      const universityMatch = selectedUniversity === '전체' || record.university === selectedUniversity;
      const searchMatch = record.university.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.admissionName.toLowerCase().includes(searchQuery.toLowerCase());
      return gradeMatch && universityMatch && searchMatch;
    });

    const counts: Record<string, number> = { '전체': baseFiltered.length };
    baseFiltered.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [allRecords, lowerBound, upperBound, selectedUniversity, searchQuery, searchMode]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      const gradeMatch = searchMode === 'goal_seek' || (record.averageGrade >= lowerBound && record.averageGrade <= upperBound);
      const categoryMatch = selectedCategory === '전체' || record.category === selectedCategory;
      const universityMatch = selectedUniversity === '전체' || record.university === selectedUniversity;
      const searchMatch = record.university.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.admissionName.toLowerCase().includes(searchQuery.toLowerCase());
      return gradeMatch && categoryMatch && universityMatch && searchMatch;
    }).sort((a, b) => a.averageGrade - b.averageGrade);
  }, [allRecords, lowerBound, upperBound, selectedCategory, searchQuery, selectedUniversity, searchMode]);

  const getDifficulty = (avgGrade: number, myGrade: number) => {
    const diff = avgGrade - myGrade;
    if (diff < -0.10) return { label: '소신', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (diff > 0.10) return { label: '안정', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    return { label: '적정', color: 'bg-blue-50 text-blue-600 border-blue-200' };
  };

  const categories: { id: Category | '전체'; name: string; icon: any; emoji: string }[] = [
    { id: '전체', name: '전체', icon: Filter, emoji: '🔍' },
    { id: '인문', name: '인문', icon: BookOpen, emoji: '📖' },
    { id: '사회', name: '사회', icon: Users, emoji: '🤝' },
    { id: '자연', name: '자연', icon: FlaskConical, emoji: '🌿' },
    { id: '공학', name: '공학', icon: Settings, emoji: '⚙️' },
    { id: '의약', name: '의약', icon: Stethoscope, emoji: '🏥' },
    { id: '교육', name: '교육', icon: EducationIcon, emoji: '🎓' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-indigo-700 to-indigo-500 p-2 rounded-xl shadow-xs">
              <Compass className="text-white w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="font-serif italic font-black text-xl tracking-tight text-slate-900 leading-none">
                  나침반 5to9
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Compass 5to9</span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold tracking-tight mt-1">
                5등급제 내신 환산 및 2026 수시 지원선 예측기
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-600 font-bold bg-slate-100/90 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
              제작 : 숭신고등학교 진로전담교사 김강석
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* 성적 입력 및 슬라이더 + 학기 설정 통합 섹션 */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/70 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">내신 성적 설정 및 학기별 시뮬레이터</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                슬라이더 바를 조작하면 이수한 학기에 일괄 반영되며, 우측 표에서 남은 학기 예상 점수를 입력할 수 있습니다.
              </p>
            </div>

            {/* 현재 이수 학기 선택 토글 바 */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto">
              <span className="text-xs font-bold text-slate-600 px-2 flex items-center gap-1 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                현재 이수 학기:
              </span>
              <div className="flex items-center gap-1 flex-nowrap">
                {(['1-1', '1-2', '2-1', '2-2'] as const).map(sem => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setCompletedSemester(sem);
                      const map = { '1-1': 1, '1-2': 2, '2-1': 3, '2-2': 4 };
                      const count = map[sem];
                      const formatted = sliderGpa.toFixed(2);
                      setGrades(prev => {
                        const next = { ...prev };
                        if (count >= 1) next.sem1_1 = formatted;
                        if (count >= 2) next.sem1_2 = formatted;
                        if (count >= 3) next.sem2_1 = formatted;
                        if (count >= 4) next.sem2_2 = formatted;
                        return next;
                      });
                    }}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      completedSemester === sem 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {sem}까지
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 슬라이더 바(좌측) + 5개 학기 성적표(우측) 2열 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 좌측: 사이드 바(슬라이더) 컨트롤러 */}
            <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  내신 일괄 조정 슬라이더
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">직접 입력 가능 ✍️</span>
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={sliderInput}
                  onChange={(e) => handleSliderInputChange(e.target.value)}
                  onBlur={handleSliderInputBlur}
                  className="w-36 text-3xl font-black text-indigo-600 tabular-nums bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl px-3 py-1 outline-none transition-all shadow-inner"
                />
                <span className="text-base font-bold text-slate-400">등급 (5등급제)</span>
              </div>

              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.001" 
                value={sliderGpa}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleSliderChange(v)}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                      Math.abs(sliderGpa - v) < 0.25 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v}.0
                  </button>
                ))}
              </div>
            </div>

            {/* 우측: 1-1부터 3-1까지 5개 학기 세부 입력 카드 및 안내 멘트 */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800">
                    학기별 세부 성적 (남은 학기: <strong className="text-emerald-600">{semesterInfo.remainingCount}개</strong>)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const formatted = sliderGpa.toFixed(2);
                    setGrades({
                      sem1_1: formatted,
                      sem1_2: completedCount >= 2 ? formatted : '',
                      sem2_1: completedCount >= 3 ? formatted : '',
                      sem2_2: completedCount >= 4 ? formatted : '',
                      sem3_1: ''
                    });
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  초기화
                </button>
              </div>

              {/* 5개 학기 카드 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                {semesterInfo.allSemesters.map((sem, idx) => {
                  const isCompleted = idx < semesterInfo.completedCount;
                  return (
                    <div
                      key={sem.id}
                      className={`p-3 rounded-xl border text-center space-y-1.5 transition-all shadow-2xs ${
                        isCompleted 
                          ? 'bg-slate-100/90 border-slate-200' 
                          : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[11px] font-black text-slate-700">{sem.short}</span>
                        {isCompleted ? (
                          <span className="text-[8px] font-black text-slate-600 bg-slate-200/80 px-1 py-0.2 rounded flex items-center gap-0.5">
                            <Lock className="w-2 h-2" />
                            이수
                          </span>
                        ) : (
                          <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                            예측
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        readOnly={isCompleted}
                        disabled={isCompleted}
                        placeholder={idx === 0 ? sliderGpa.toFixed(2) : semesterInfo.allSemesters[idx - 1].grade.toFixed(2)}
                        value={sem.raw}
                        onChange={(e) => handleGradeChange(sem.id as keyof typeof grades, e.target.value)}
                        className={`w-full py-1.5 text-center text-lg font-black rounded-lg border outline-none transition-all ${
                          isCompleted
                            ? 'bg-slate-200/50 border-slate-300 text-slate-500 cursor-not-allowed select-none shadow-none'
                            : 'bg-white border-emerald-200 text-emerald-950 focus:border-emerald-600 shadow-inner'
                        }`}
                      />
                      <span className="text-[9px] font-bold text-slate-400 block">
                        {isCompleted ? '수정 불가(확정)' : '직접 입력 가능'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 안내 멘트 (한 줄 유지) */}
              <div className="bg-indigo-50/80 border border-indigo-100/90 rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] text-indigo-950 mt-3 overflow-x-auto whitespace-nowrap">
                <span className="flex items-center gap-1 font-black text-indigo-600 shrink-0 bg-indigo-100/80 px-1.5 py-0.5 rounded">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>연동 안내</span>
                </span>
                <span className="whitespace-nowrap">
                  왼쪽 슬라이더를 조작하면 현재 이수한 <strong className="text-indigo-700 font-black">1-1 ~ {completedSemester}학기</strong> 성적이 <strong className="text-indigo-700 font-black">{sliderGpa.toFixed(2)}등급</strong>으로 자동 일괄 기록됩니다.
                </span>
              </div>
            </div>
          </div>

          {/* 메인 블랙 대시보드 및 3대 핵심 모드 탭 */}
          <div className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
