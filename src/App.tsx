import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Calculator,
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
  Compass,
  Unlock,
  Lock,
  Target,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { convertGrade, ConversionVersion, parseCSV, Category } from './lib/admissionUtils';
import { rawCSV } from './data/rawCSV';

export default function App() {
  // 현재 이수한 학기 선택 (기본: 1학년 2학기까지 이수)
  const [completedSemester, setCompletedSemester] = useState<'1-1' | '1-2' | '2-1' | '2-2'>('1-2');

  const [gpa1_1, setGpa1_1] = useState<number>(2.0);
  const [inputGpa1_1, setInputGpa1_1] = useState<string>('2.000');
  const [futureGrades, setFutureGrades] = useState({
    sem1_2: '',
    sem2_1: '',
    sem2_2: '',
    sem3_1: ''
  });

  const [conversionVersion, setConversionVersion] = useState<ConversionVersion>('mixed');
  const [gradeCounts, setGradeCounts] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRange, setSearchRange] = useState<number>(0.1);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('전체');
  const [displayLimit, setDisplayLimit] = useState<number>(90);
  const [ignoreGradeLimit, setIgnoreGradeLimit] = useState<boolean>(false);
  const [useProjectedGrade, setUseProjectedGrade] = useState<boolean>(true);
  const [includeTopTier, setIncludeTopTier] = useState<boolean>(true);

  useEffect(() => {
    setInputGpa1_1(gpa1_1.toFixed(3));
  }, [gpa1_1]);

  useEffect(() => {
    setDisplayLimit(90);
  }, [gpa1_1, conversionVersion, selectedCategory, searchQuery, searchRange, selectedUniversity, futureGrades, useProjectedGrade, includeTopTier, ignoreGradeLimit, completedSemester]);

  const allRecords = useMemo(() => parseCSV(rawCSV), []);

  const universityList = useMemo(() => {
    const unis = Array.from(new Set(allRecords.map(r => r.university))).sort();
    return ['전체', ...unis];
  }, [allRecords]);

  // 9등급제 점수를 5등급제로 역산하는 함수 (이진 탐색)
  const invert9to5 = useMemo(() => {
    return (targetGrade9: number): number => {
      let low = 1.000;
      let high = 5.000;
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2;
        const converted = convertGrade(mid, conversionVersion).grade9;
        if (converted < targetGrade9) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return (low + high) / 2;
    };
  }, [conversionVersion]);

  // 학기별 데이터 정돈 및 이수/남은 학기 구분
  const semesterStatus = useMemo(() => {
    const parseOrCurrent = (val: string, fallback: number) => {
      const parsed = parseFloat(val);
      return (!isNaN(parsed) && parsed >= 1.0 && parsed <= 5.0) ? parsed : fallback;
    };

    const g1 = gpa1_1;
    const g2 = parseOrCurrent(futureGrades.sem1_2, gpa1_1);
    const g3 = parseOrCurrent(futureGrades.sem2_1, g2);
    const g4 = parseOrCurrent(futureGrades.sem2_2, g3);
    const g5 = parseOrCurrent(futureGrades.sem3_1, g4);

    const semList = [
      { id: '1-1', label: '1학년 1학기', grade: g1 },
      { id: '1-2', label: '1학년 2학기', grade: g2 },
      { id: '2-1', label: '2학년 1학기', grade: g3 },
      { id: '2-2', label: '2학년 2학기', grade: g4 },
      { id: '3-1', label: '3학년 1학기', grade: g5 },
    ];

    const completedCountMap = { '1-1': 1, '1-2': 2, '2-1': 3, '2-2': 4 };
    const completedCount = completedCountMap[completedSemester];
    const remainingCount = 5 - completedCount;

    const completedGrades = semList.slice(0, completedCount);
    const remainingGrades = semList.slice(completedCount);

    const completedSum = completedGrades.reduce((acc, cur) => acc + cur.grade, 0);
    const completedAvg = completedSum / completedCount;

    const allSum = semList.reduce((acc, cur) => acc + cur.grade, 0);
    const projectedGpa5 = allSum / 5;

    return {
      semList,
      completedCount,
      remainingCount,
      completedAvg,
      completedSum,
      projectedGpa5,
      completedGrades,
      remainingGrades
    };
  }, [gpa1_1, futureGrades, completedSemester]);

  // 현재 이수 기준 환산
  const currentConversion = useMemo(() => {
    return convertGrade(semesterStatus.completedAvg, conversionVersion);
  }, [semesterStatus.completedAvg, conversionVersion]);

  // 예상 최종 5개 학기 환산
  const projectedConversion = useMemo(() => {
    return convertGrade(semesterStatus.projectedGpa5, conversionVersion);
  }, [semesterStatus.projectedGpa5, conversionVersion]);

  // 대학 탐색에 사용할 최종 타겟 등급 결정
  const activeConversion = useMemo(() => {
    return useProjectedGrade ? projectedConversion : currentConversion;
  }, [useProjectedGrade, projectedConversion, currentConversion]);

  // 1.0~1.3대 최상위 소신 개방 설정
  const isTopTierGrade = activeConversion.grade9 <= 1.55;
  const lowerBound = useMemo(() => {
    if (isTopTierGrade && includeTopTier) return 1.00;
    return Math.max(1.00, activeConversion.grade9 - searchRange);
  }, [activeConversion.grade9, searchRange, isTopTierGrade, includeTopTier]);

  const upperBound = useMemo(() => {
    return activeConversion.grade9 + searchRange;
  }, [activeConversion.grade9, searchRange]);

  // 키보드로 등급 직접 입력
  const handleInputChange = (val: string) => {
    setInputGpa1_1(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 1.0 && num <= 5.0) {
      setGpa1_1(num);
    }
  };

  const handleInputBlur = () => {
    const num = parseFloat(inputGpa1_1);
    if (isNaN(num) || num < 1.0) {
      setGpa1_1(1.0);
      setInputGpa1_1('1.000');
    } else if (num > 5.0) {
      setGpa1_1(5.0);
      setInputGpa1_1('5.000');
    } else {
      setInputGpa1_1(num.toFixed(3));
    }
  };

  const calculateGPA = () => {
    const totalCount = Object.values(gradeCounts).reduce((acc, val) => acc + val, 0);
    if (totalCount === 0) return;
    const weightedSum = Object.entries(gradeCounts).reduce((acc, [grade, count]) => acc + (parseInt(grade) * count), 0);
    const result = weightedSum / totalCount;
    setGpa1_1(result);
    setInputGpa1_1(result.toFixed(3));
    setShowCalculator(false);
  };

  // 특정 대학에 합격하기 위해 남은 학기 동안 필요한 등급 산출
  const calculateRequiredRemainingGrade = (deptCut9: number) => {
    const targetGpa5 = invert9to5(deptCut9);
    const totalNeededSum = targetGpa5 * 5;
    const neededForRemaining = totalNeededSum - semesterStatus.completedSum;
    const requiredAvg = neededForRemaining / semesterStatus.remainingCount;

    return {
      targetGpa5,
      requiredAvg,
      remainingCount: semesterStatus.remainingCount
    };
  };

  // 계열별 카운트
  const categoryCounts = useMemo(() => {
    const baseFiltered = allRecords.filter(record => {
      const gradeMatch = ignoreGradeLimit || (record.averageGrade >= lowerBound && record.averageGrade <= upperBound);
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
  }, [allRecords, lowerBound, upperBound, selectedUniversity, searchQuery, ignoreGradeLimit]);

  // 최종 필터링된 결과
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      const gradeMatch = ignoreGradeLimit || (record.averageGrade >= lowerBound && record.averageGrade <= upperBound);
      const categoryMatch = selectedCategory === '전체' || record.category === selectedCategory;
      const universityMatch = selectedUniversity === '전체' || record.university === selectedUniversity;
      const searchMatch = record.university.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.admissionName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return gradeMatch && categoryMatch && universityMatch && searchMatch;
    }).sort((a, b) => a.averageGrade - b.averageGrade);
  }, [allRecords, lowerBound, upperBound, selectedCategory, searchQuery, selectedUniversity, ignoreGradeLimit]);

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
        {/* 성적 입력 & 시뮬레이션 섹션 */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/70 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">성적 입력 및 남은 학기 목표 시뮬레이터</h2>
              <p className="text-xs text-slate-500 mt-0.5">현재까지 이수한 성적을 바탕으로, 목표 대학에 가기 위해 남은 학기에 필요한 등급을 자동 역산합니다.</p>
            </div>

            {/* 현재 이수 학기 선택 토글 바 */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 pl-2">현재 이수 학기:</span>
              {(['1-1', '1-2', '2-1', '2-2'] as const).map(sem => (
                <button
                  key={sem}
                  onClick={() => setCompletedSemester(sem)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    completedSemester === sem 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sem}까지
                </button>
              ))}
            </div>
          </div>

          {/* 학기별 성적 입력 카드들 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 1-1 성적 입력 */}
            <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                  1학년 1학기 (이수 완료 성적)
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">직접 입력 가능 ✍️</span>
              </div>

              <div className="flex items-baseline gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputGpa1_1}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={handleInputBlur}
                  className="w-36 text-3xl font-black text-indigo-600 tabular-nums bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl px-3 py-1 outline-none transition-all shadow-inner"
                />
                <span className="text-base font-bold text-slate-400">등급 (5등급제)</span>
              </div>

              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.001" 
                value={gpa1_1}
                onChange={(e) => setGpa1_1(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGpa1_1(v)}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                      Math.abs(gpa1_1 - v) < 0.25 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v}.0
                  </button>
                ))}
              </div>
            </div>

            {/* 1-2, 2-1, 2-2, 3-1 학기 입력 (이수 여부에 따라 파스텔 톤 동적 변경) */}
            <div className="lg:col-span-7 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950">
                    후속 학기 성적 (남은 학기: {semesterStatus.remainingCount}개)
                  </span>
                </div>
                <button
                  onClick={() => setFutureGrades({ sem1_2: '', sem2_1: '', sem2_2: '', sem3_1: '' })}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  초기화
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { key: 'sem1_2', label: '1-2학기', isDone: completedSemester !== '1-1' },
                  { key: 'sem2_1', label: '2-1학기', isDone: completedSemester === '2-1' || completedSemester === '2-2' },
                  { key: 'sem2_2', label: '2-2학기', isDone: completedSemester === '2-2' },
                  { key: 'sem3_1', label: '3-1학기', isDone: false }
                ].map(({ key, label, isDone }) => {
                  const val = futureGrades[key as keyof typeof futureGrades];
                  return (
                    <div key={key} className={`p-2.5 rounded-xl border text-center space-y-1 shadow-2xs transition-all ${
                      isDone ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white/95 border-emerald-200/90'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] font-black text-slate-700">{label}</span>
                        {isDone ? (
                          <span className="text-[8px] font-black text-indigo-700 bg-indigo-100 px-1 rounded">이수</span>
                        ) : (
                          <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 rounded">예측</span>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={gpa1_1.toFixed(2)}
                        value={val}
                        onChange={(e) => setFutureGrades({ ...futureGrades, [key]: e.target.value })}
                        className="w-full py-1 text-center text-base font-black rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 핵심 성적 비교 대시보드 */}
          <div className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Core Grade Comparison</span>
                </div>
                <h3 className="text-lg md:text-xl font-serif italic font-black tracking-tight text-white">
                  내신 성적 및 9등급제 환산 결과 비교
                </h3>
              </div>

              {/* 탐색 기준 선택 토글 */}
              <div className="inline-flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0 gap-1.5">
                <button
                  onClick={() => setUseProjectedGrade(false)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    !useProjectedGrade 
                      ? 'bg-white text-slate-900 shadow-md shadow-white/10' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  현재 성적 기준 ({completedSemester}까지)
                </button>
                <button
                  onClick={() => setUseProjectedGrade(true)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    useProjectedGrade 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>예상 최종 성적 기준 (적용 중)</span>
                </button>
              </div>
            </div>

            {/* 대형 점수 표시 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-center">
              {/* 현재 이수 성적 */}
              <div className={`p-6 rounded-2xl transition-all border ${
                !useProjectedGrade ? 'bg-slate-900/90 border-cyan-500/50 ring-2 ring-cyan-500/20' : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    현재 이수 완료 평균 ({completedSemester}까지)
                  </span>
                  {!useProjectedGrade && (
                    <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      탐색 반영 중
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    5등급제 <span className="text-white font-black">{semesterStatus.completedAvg.toFixed(3)}</span>등급
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl font-black tabular-nums tracking-tight text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                      {currentConversion.grade9.toFixed(3)}
                    </span>
                    <span className="text-lg font-bold text-slate-400">등급 (9등급제 환산)</span>
                  </div>
                </div>
              </div>

              {/* 예상 최종 5개 학기 평균 */}
              <div className={`p-6 rounded-2xl transition-all border ${
                useProjectedGrade ? 'bg-slate-900/90 border-emerald-500/60 ring-2 ring-emerald-500/20' : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    예상 최종 성적 (1-1 ~ 3-1 5개 학기)
                  </span>
                  {useProjectedGrade && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-xs">
                      탐색 반영 중
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    5등급제 <span className="text-white font-black">{semesterStatus.projectedGpa5.toFixed(3)}</span>등급
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl font-black tabular-nums tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                      {projectedConversion.grade9.toFixed(3)}
                    </span>
                    <span className="text-lg font-bold text-slate-400">등급 (9등급제 환산)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 요약 정보 */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold text-slate-300">남은 기회:</span>
                <span>총 5개 학기 중 <strong className="text-emerald-400">{semesterStatus.remainingCount}개 학기</strong>의 성적이 남아있습니다.</span>
              </div>
            </div>
          </div>
        </section>

        {/* 적정 대학 탐색 & 검색 필터 */}
        <section className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black rounded-xl shadow-xs ring-2 ring-indigo-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>예상 최종 성적 기준 지원 가능 대학</span>
                </span>
                
                {ignoreGradeLimit ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-black rounded-lg border border-amber-200">
                    <Unlock className="w-3.5 h-3.5" />
                    등급 제한 없음 (전체 입결 조회 모드)
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-black text-slate-900">
                      타겟 등급: <span className="text-indigo-600">{activeConversion.grade9.toFixed(2)}</span> 등급
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      (추천 범위: <strong className="text-slate-800">{lowerBound.toFixed(2)} ~ {upperBound.toFixed(2)}</strong>)
                    </span>
                  </>
                )}
              </div>

              {/* 검색 옵션 토글 */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIgnoreGradeLimit(!ignoreGradeLimit)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    ignoreGradeLimit 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                  }`}
                >
                  {ignoreGradeLimit ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-white" />
                      <span>등급 무관 전체 검색 ON</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>등급 무관 전체 검색</span>
                    </>
                  )}
                </button>

                {!ignoreGradeLimit && isTopTierGrade && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeTopTier}
                      onChange={(e) => setIncludeTopTier(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>최상위 소신 포함 (1.00~)</span>
                  </label>
                )}

                {!ignoreGradeLimit && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">범위:</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      {[0.1, 0.2, 0.3].map(r => (
                        <button 
                          key={r}
                          onClick={() => setSearchRange(r)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            searchRange === r ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          ±{r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 대학/학과 검색창 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              <div className="md:col-span-4 relative">
                <select 
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  {universityList.map(uni => (
                    <option key={uni} value={uni}>{uni === '전체' ? '모든 대학교 (전체)' : uni}</option>
                  ))}
                </select>
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="md:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={ignoreGradeLimit ? "원하는 대학명 또는 학과명을 입력하세요 (모든 등급의 입결 조회 가능)..." : "대학명, 학과명, 전형명을 입력하세요... (예: 간호, 컴퓨터, 지역균형)"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs font-bold outline-none transition-all ${
                    ignoreGradeLimit 
                      ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500 focus:bg-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* 계열 카테고리 탭 */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedCategory === cat.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 검색 결과 카운터 */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-slate-500">
              검색된 모집단위: <strong className="text-indigo-600">{filteredRecords.length}</strong>개
            </p>
            {selectedUniversity !== '전체' || selectedCategory !== '전체' || searchQuery !== '' || ignoreGradeLimit ? (
              <button 
                onClick={() => {
                  setSelectedUniversity('전체');
                  setSelectedCategory('전체');
                  setSearchQuery('');
                  setIgnoreGradeLimit(false);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-600"
              >
                검색 필터 초기화
              </button>
            ) : null}
          </div>

          {/* 컴팩트 카드 그리드 (3열) - 남은 학기 필요 등급 완벽 통합 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecords.length > 0 ? (
              <>
                {filteredRecords.slice(0, displayLimit).map((record, index) => {
                  const diff = getDifficulty(record.averageGrade, activeConversion.grade9);
                  const goalInfo = calculateRequiredRemainingGrade(record.averageGrade);
                  const reqGrade = goalInfo.requiredAvg;

                  return (
                    <div
                      key={`${record.university}-${record.department}-${record.admissionName}-${index}`}
                      className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      {/* 상단: 대학명 + 등급 & 배지 */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {record.university}
                          </h3>
                          <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">
                            {record.department}
                          </p>
                        </div>
                        
                        {/* 우측 컷 등급 */}
                        <div className="text-right shrink-0">
                          <span className="text-lg font-black text-indigo-600 tabular-nums block leading-none">
                            {record.averageGrade.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">70% 컷</span>
                        </div>
                      </div>

                      {/* 중단: 전형명 + 계열 + 소신/안정 배지 */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[170px]">
                          {record.admissionName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            {record.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${diff.color}`}>
                            {diff.label}
                          </span>
                        </div>
                      </div>

                      {/* ★ 하단: 목표 달성을 위한 남은 학기 필요 등급 안내 바 */}
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <Target className="w-3 h-3 text-indigo-600" />
                          남은 {goalInfo.remainingCount}개 학기 목표선:
                        </span>
                        <div className="font-black">
                          {reqGrade < 1.0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              올 1.00 필요 (도전적)
                            </span>
                          ) : reqGrade > 5.0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              현재 성적 유지 시 안정권
                            </span>
                          ) : (
                            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                              평균 <strong className="text-indigo-900 font-black">{reqGrade.toFixed(2)}</strong>등급 필요
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 결과 더보기 버튼 */}
                {filteredRecords.length > displayLimit && (
                  <div className="col-span-full text-center py-6">
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 90)}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      결과 더보기 ({Math.min(displayLimit, filteredRecords.length)} / {filteredRecords.length})
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">해당 조건의 대학이 없습니다</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  상단의 <strong className="text-amber-600 font-bold">[등급 무관 전체 검색]</strong> 버튼을 누르면 성적에 구애받지 않고 모든 대학을 검색할 수 있습니다.
                </p>
                <button 
                  onClick={() => setIgnoreGradeLimit(true)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-xs"
                >
                  등급 무관 전체 검색 켜기 🔓
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
          <p className="text-slate-400 text-xs font-semibold">
            제작 : 숭신고등학교 진로전담교사 김강석 | 데이터 : 2026학년도 대학어디가 수시 입결
          </p>
          <p className="text-slate-300 text-[10px]">
            © 2026 UNIVERSITY SEARCH. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
