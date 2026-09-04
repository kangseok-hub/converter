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
  ArrowRight
} from 'lucide-react';
import { convertGrade, ConversionVersion, parseCSV, Category } from './lib/admissionUtils';
import { rawCSV } from './data/rawCSV';

export default function App() {
  const [gpa5, setGpa5] = useState<number>(2.0);
  const [inputGpa, setInputGpa] = useState<string>('2.000');
  const [conversionVersion, setConversionVersion] = useState<ConversionVersion>('mixed');
  const [gradeCounts, setGradeCounts] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRange, setSearchRange] = useState<number>(0.1);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('전체');
  const [showAmbitious, setShowAmbitious] = useState(true);
  const [displayLimit, setDisplayLimit] = useState<number>(90);

  // 학기별 예상 등급 상태
  const [futureGrades, setFutureGrades] = useState({
    sem1_2: '',
    sem2_1: '',
    sem2_2: '',
    sem3_1: ''
  });
  const [useProjectedGrade, setUseProjectedGrade] = useState<boolean>(true); // 기본: 예상 성적 기준 탐색

  // gpa5 변경 시 입력창 동기화
  useEffect(() => {
    setInputGpa(gpa5.toFixed(3));
  }, [gpa5]);

  // 검색 조건 변경 시 카드 표시 개수 초기화
  useEffect(() => {
    setDisplayLimit(90);
  }, [gpa5, conversionVersion, selectedCategory, searchQuery, searchRange, selectedUniversity, showAmbitious, futureGrades, useProjectedGrade]);

  const allRecords = useMemo(() => parseCSV(rawCSV), []);

  const universityList = useMemo(() => {
    const unis = Array.from(new Set(allRecords.map(r => r.university))).sort();
    return ['전체', ...unis];
  }, [allRecords]);

  // 현재 성적 기준 환산
  const currentConversion = useMemo(() => {
    return convertGrade(gpa5, conversionVersion);
  }, [gpa5, conversionVersion]);

  // 학기별 예상 성적 반영 계산
  const projection = useMemo(() => {
    const parseOrCurrent = (val: string) => {
      const parsed = parseFloat(val);
      return (!isNaN(parsed) && parsed >= 1.0 && parsed <= 5.0) ? parsed : gpa5;
    };

    const g1_1 = gpa5;
    const g1_2 = parseOrCurrent(futureGrades.sem1_2);
    const g2_1 = parseOrCurrent(futureGrades.sem2_1);
    const g2_2 = parseOrCurrent(futureGrades.sem2_2);
    const g3_1 = parseOrCurrent(futureGrades.sem3_1);

    const projectedGpa5 = (g1_1 + g1_2 + g2_1 + g2_2 + g3_1) / 5;
    const projectedConversion = convertGrade(projectedGpa5, conversionVersion);

    return {
      grades: [
        { label: '1-1 (현재)', grade: g1_1, isCustom: true },
        { label: '1-2', grade: g1_2, isCustom: futureGrades.sem1_2 !== '' },
        { label: '2-1', grade: g2_1, isCustom: futureGrades.sem2_1 !== '' },
        { label: '2-2', grade: g2_2, isCustom: futureGrades.sem2_2 !== '' },
        { label: '3-1', grade: g3_1, isCustom: futureGrades.sem3_1 !== '' },
      ],
      projectedGpa5,
      projectedConversion,
      diffGpa5: projectedGpa5 - gpa5,
      diffGrade9: projectedConversion.grade9 - currentConversion.grade9
    };
  }, [gpa5, futureGrades, conversionVersion, currentConversion.grade9]);

  // 대학 탐색에 사용할 최종 타겟 등급 결정 (기본값: 예상 성적)
  const activeConversion = useMemo(() => {
    return useProjectedGrade ? projection.projectedConversion : currentConversion;
  }, [useProjectedGrade, projection.projectedConversion, currentConversion]);

  // 키보드로 등급 직접 입력
  const handleInputChange = (val: string) => {
    setInputGpa(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 1.0 && num <= 5.0) {
      setGpa5(num);
    }
  };

  const handleInputBlur = () => {
    const num = parseFloat(inputGpa);
    if (isNaN(num) || num < 1.0) {
      setGpa5(1.0);
      setInputGpa('1.000');
    } else if (num > 5.0) {
      setGpa5(5.0);
      setInputGpa('5.000');
    } else {
      setInputGpa(num.toFixed(3));
    }
  };

  const calculateGPA = () => {
    const totalCount = Object.values(gradeCounts).reduce((acc, val) => acc + val, 0);
    if (totalCount === 0) return;
    const weightedSum = Object.entries(gradeCounts).reduce((acc, [grade, count]) => acc + (parseInt(grade) * count), 0);
    const result = weightedSum / totalCount;
    setGpa5(result);
    setInputGpa(result.toFixed(3));
    setShowCalculator(false);
  };

  const categoryCounts = useMemo(() => {
    const targetGrade = activeConversion.grade9;
    const lowerBound = showAmbitious ? Math.max(1.0, targetGrade - searchRange * 5.0) : targetGrade - searchRange;
    const upperBound = targetGrade + searchRange;

    const baseFiltered = allRecords.filter(record => {
      const gradeMatch = record.averageGrade >= lowerBound && record.averageGrade <= upperBound;
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
  }, [allRecords, activeConversion.grade9, searchRange, selectedUniversity, searchQuery, showAmbitious]);

  const filteredRecords = useMemo(() => {
    const targetGrade = activeConversion.grade9;
    const lowerBound = showAmbitious ? Math.max(1.0, targetGrade - searchRange * 5.0) : targetGrade - searchRange;
    const upperBound = targetGrade + searchRange;
    
    return allRecords.filter(record => {
      const gradeMatch = record.averageGrade >= lowerBound && record.averageGrade <= upperBound;
      const categoryMatch = selectedCategory === '전체' || record.category === selectedCategory;
      const universityMatch = selectedUniversity === '전체' || record.university === selectedUniversity;
      const searchMatch = record.university.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.admissionName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return gradeMatch && categoryMatch && universityMatch && searchMatch;
    }).sort((a, b) => a.averageGrade - b.averageGrade);
  }, [allRecords, activeConversion.grade9, selectedCategory, searchQuery, searchRange, selectedUniversity, showAmbitious]);

  const getDifficulty = (avgGrade: number, myGrade: number) => {
    const diff = avgGrade - myGrade;
    if (diff < -0.15) return { label: '소신', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (diff > 0.15) return { label: '안정', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
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
              <h2 className="text-2xl font-black tracking-tight text-slate-900">성적 입력 및 예측</h2>
              <p className="text-xs text-slate-500 mt-0.5">현재 내신과 향후 학기별 예상 등급을 설정하여 최종 성적을 시뮬레이션합니다.</p>
            </div>
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all self-start md:self-auto shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              과목별 등급 계산기
            </button>
          </div>

          {/* 성적 입력 2열 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 현재 등급 */}
            <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">1학년 1학기 (현재 등급)</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">직접 입력 가능 ✍️</span>
              </div>

              <div className="flex items-baseline gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputGpa}
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
                value={gpa5}
                onChange={(e) => setGpa5(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGpa5(v)}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                      Math.abs(gpa5 - v) < 0.25 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v}.0
                  </button>
                ))}
              </div>
            </div>

            {/* 향후 학기별 예상 등급 (파스텔 민트/에메랄드 톤 구별) */}
            <div className="lg:col-span-7 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950">향후 학기별 예상 등급 (5등급제)</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">예측 시뮬레이터</span>
                </div>
                <button
                  onClick={() => setFutureGrades({ sem1_2: '', sem2_1: '', sem2_2: '', sem3_1: '' })}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  초기화
                </button>
              </div>

              <p className="text-[11px] text-emerald-800/80 font-medium">
                빈칸으로 둔 학기는 <span className="font-bold text-emerald-700">현재 성적({gpa5.toFixed(2)})</span>으로 자동 반영됩니다.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { key: 'sem1_2', label: '1-2학기' },
                  { key: 'sem2_1', label: '2-1학기' },
                  { key: 'sem2_2', label: '2-2학기' },
                  { key: 'sem3_1', label: '3-1학기' }
                ].map(({ key, label }) => {
                  const val = futureGrades[key as keyof typeof futureGrades];
                  return (
                    <div key={key} className="bg-white/95 p-2.5 rounded-xl border border-emerald-200/90 text-center space-y-1 shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-800 block">{label}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={gpa5.toFixed(2)}
                        value={val}
                        onChange={(e) => setFutureGrades({ ...futureGrades, [key]: e.target.value })}
                        className={`w-full py-1 text-center text-base font-black rounded-lg border outline-none transition-all ${
                          val !== '' ? 'bg-emerald-50/80 border-emerald-500 text-emerald-800 font-black' : 'border-slate-200 text-slate-400 placeholder:text-slate-300 focus:border-emerald-400'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ★ 핵심 성적 비교 대시보드 (블랙 배경 + 초대형 화이트/네온 폰트 강조) */}
          <div className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
            {/* 상단 레이블 & 탐색 기준 토글 */}
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

              {/* 탐색 기준 선택 토글 (줄바꿈 없이 한 줄 유지) */}
              <div className="inline-flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0 gap-1.5">
                <button
                  onClick={() => setUseProjectedGrade(false)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    !useProjectedGrade 
                      ? 'bg-white text-slate-900 shadow-md shadow-white/10' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  현재 성적 기준 탐색
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

            {/* 메인 2분할 대형 점수 표시 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-center">
              {/* 왼쪽: 현재 성적 (1-1) */}
              <div className={`p-6 rounded-2xl transition-all border ${
                !useProjectedGrade 
                  ? 'bg-slate-900/90 border-cyan-500/50 ring-2 ring-cyan-500/20' 
                  : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    현재 성적 (1-1 단일)
                  </span>
                  {!useProjectedGrade && (
                    <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      탐색 반영 중
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    5등급제 <span className="text-white font-black">{gpa5.toFixed(3)}</span>등급
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl font-black tabular-nums tracking-tight text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                      {currentConversion.grade9.toFixed(3)}
                    </span>
                    <span className="text-lg font-bold text-slate-400">등급 (9등급제 환산)</span>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 예상 최종 (1-1 ~ 3-1) */}
              <div className={`p-6 rounded-2xl transition-all border ${
                useProjectedGrade 
                  ? 'bg-slate-900/90 border-emerald-500/60 ring-2 ring-emerald-500/20' 
                  : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    예상 최종 (1-1 ~ 3-1 평균)
                  </span>
                  {useProjectedGrade && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-xs">
                      탐색 반영 중
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    5등급제 <span className="text-white font-black">{projection.projectedGpa5.toFixed(3)}</span>등급
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl font-black tabular-nums tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                      {projection.projectedConversion.grade9.toFixed(3)}
                    </span>
                    <span className="text-lg font-bold text-slate-400">등급 (9등급제 환산)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 요약 정보 및 변동폭 바 */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold text-slate-300">환산 근거:</span>
                <span className="line-clamp-1">{activeConversion.reason}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 font-bold">환산 성적 변동폭:</span>
                {projection.diffGrade9 === 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-black">
                    변동 없음 (0.000)
                  </span>
                ) : projection.diffGrade9 < 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black flex items-center gap-1">
                    ▲ {Math.abs(projection.diffGrade9).toFixed(3)}등급 향상 (유리)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black flex items-center gap-1">
                    ▼ {projection.diffGrade9.toFixed(3)}등급 하락
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 환산 버전 선택 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">환산 산출 방식 선택:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'mixed', name: '경기/부산/광주 평균' },
                { id: 'gyeonggi', name: '경기진협' },
                { id: 'busan', name: '부산시교육청' },
                { id: 'gwangju', name: '광주시교육청' }
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setConversionVersion(v.id as ConversionVersion)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    conversionVersion === v.id 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* 등급 계산기 모달 */}
          <AnimatePresence>
            {showCalculator && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-50 p-6 rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">과목별 이수 등급 개수 입력</span>
                </div>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map(grade => (
                    <div key={grade} className="space-y-1 text-center">
                      <label className="text-[10px] font-bold text-slate-500 block">{grade}등급</label>
                      <input 
                        type="number" 
                        min="0"
                        value={gradeCounts[grade]}
                        onChange={(e) => setGradeCounts({ ...gradeCounts, [grade]: parseInt(e.target.value) || 0 })}
                        className="w-full py-1.5 rounded-lg border border-slate-200 text-center text-sm font-bold bg-white"
                      />
                    </div>
                  ))}
                </div>
                <button 
                  onClick={calculateGPA}
                  className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-xs"
                >
                  계산 결과 적용하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 적정 대학 탐색 & 검색 필터 */}
        <section className="space-y-6">
          {/* 상단 타겟 안내 및 필터 바 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 강조 배지 (예상 최종 성적 기준 지원 가능 대학) */}
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black rounded-xl shadow-xs ring-2 ring-indigo-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>예상 최종 성적 기준 지원 가능 대학</span>
                </span>
                <span className="text-sm font-black text-slate-900">
                  타겟 등급: <span className="text-indigo-600">{activeConversion.grade9.toFixed(2)}</span> 등급
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  (추천 범위: {(activeConversion.grade9 - searchRange).toFixed(2)} ~ {(activeConversion.grade9 + searchRange).toFixed(2)})
                </span>
              </div>

              {/* 검색 범위 & 소신 지원 토글 */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={showAmbitious}
                    onChange={(e) => setShowAmbitious(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>소신 포함</span>
                </label>

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
                  placeholder="대학명, 학과명, 전형명을 입력하세요... (예: 간호, 컴퓨터, 지역균형)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
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
            {selectedUniversity !== '전체' || selectedCategory !== '전체' || searchQuery !== '' ? (
              <button 
                onClick={() => {
                  setSelectedUniversity('전체');
                  setSelectedCategory('전체');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-600"
              >
                검색 필터 초기화
              </button>
            ) : null}
          </div>

          {/* 컴팩트 카드 그리드 (3열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecords.length > 0 ? (
              <>
                {filteredRecords.slice(0, displayLimit).map((record, index) => {
                  const diff = getDifficulty(record.averageGrade, activeConversion.grade9);
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

                      {/* 하단: 전형명 + 상태 뱃지 */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[190px]">
                          {record.admissionName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            {record.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${diff.color}`}>
                            {diff.label}
                          </span>
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
                  검색 범위를 넓히거나(±0.2 이상) '소신 포함' 체크박스를 켜보세요.
                </p>
                <button 
                  onClick={() => {
                    setSearchRange(0.2);
                    setShowAmbitious(true);
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  검색 범위 ±0.2로 확대
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
