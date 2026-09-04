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
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Sparkles
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
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  // 학기별 예상 등급 상태 (미입력 시 공란)
  const [futureGrades, setFutureGrades] = useState({
    sem1_2: '',
    sem2_1: '',
    sem2_2: '',
    sem3_1: ''
  });
  const [useProjectedGrade, setUseProjectedGrade] = useState<boolean>(false);

  // gpa5 변경 시 현재 등급 입력창 동기화
  useEffect(() => {
    setInputGpa(gpa5.toFixed(3));
  }, [gpa5]);

  // 검색 조건 변경 시 카드 표시 개수 초기화
  useEffect(() => {
    setDisplayLimit(60);
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

  // 학기별 예상 성적 반영 계산 (미입력 시 현재 등급 gpa5 유지)
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
        { label: '1학년 1학기 (현재)', grade: g1_1, isCustom: true },
        { label: '1학년 2학기', grade: g1_2, isCustom: futureGrades.sem1_2 !== '' },
        { label: '2학년 1학기', grade: g2_1, isCustom: futureGrades.sem2_1 !== '' },
        { label: '2학년 2학기', grade: g2_2, isCustom: futureGrades.sem2_2 !== '' },
        { label: '3학년 1학기', grade: g3_1, isCustom: futureGrades.sem3_1 !== '' },
      ],
      projectedGpa5,
      projectedConversion,
      diffGpa5: projectedGpa5 - gpa5,
      diffGrade9: projectedConversion.grade9 - currentConversion.grade9
    };
  }, [gpa5, futureGrades, conversionVersion, currentConversion.grade9]);

  // 대학 탐색에 사용할 최종 타겟 등급 결정
  const activeConversion = useMemo(() => {
    return useProjectedGrade ? projection.projectedConversion : currentConversion;
  }, [useProjectedGrade, projection.projectedConversion, currentConversion]);

  // 키보드로 현재 등급 직접 입력 처리
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
                          record.department.toLowerCase().includes(searchQuery.toLowerCase());
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
                          record.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      return gradeMatch && categoryMatch && universityMatch && searchMatch;
    }).sort((a, b) => a.averageGrade - b.averageGrade);
  }, [allRecords, activeConversion.grade9, selectedCategory, searchQuery, searchRange, selectedUniversity, showAmbitious]);

  const getDifficulty = (avgGrade: number, myGrade: number) => {
    const diff = avgGrade - myGrade;
    if (diff < -0.15) return { label: '소신', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    if (diff > 0.15) return { label: '안정', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
    return { label: '적정', color: 'bg-blue-100 text-blue-600 border-blue-200' };
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-serif italic font-black text-2xl tracking-tighter uppercase leading-none text-slate-900">9등급 환산 적정 대학 찾기(경기, 부산, 광주 자료)</h1>
              <p className="text-[10px] text-indigo-600 font-black tracking-[0.3em] uppercase mt-1">(2026학년도 입결 자료)</p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase">제작 : 숭신고등학교 진로전담교사 김강석</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Main 성적 입력 섹션 */}
        <section className="relative">
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-50" />
          <div className="relative bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-4xl font-serif italic font-black tracking-tighter text-slate-900">성적 입력 및 예측</h2>
                <p className="text-sm text-slate-500 font-medium">현재 성적과 향후 학기별 예상 등급을 시뮬레이션하여 최종 성적을 비교합니다.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                  내 등급을 모를 경우 👉
                </span>
                <button 
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                >
                  <Calculator className="w-4 h-4" />
                  등급 계산기
                </button>
              </div>
            </div>

            {/* 좌우 2단 레이아웃: [현재 등급 입력] vs [학기별 예상 등급 시뮬레이터] */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* 왼쪽: 현재 성적 입력 (1학년 1학기) */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">1-1 현재 등급 (5등급제)</span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">직접 입력 가능 ✍️</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputGpa}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={handleInputBlur}
                      placeholder="1.000 ~ 5.000"
                      className="w-44 text-4xl font-black text-indigo-600 tabular-nums bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-2xl px-3 py-1 outline-none transition-all shadow-sm"
                    />
                    <span className="text-lg font-bold text-slate-400">등급</span>
                  </div>
                </div>

                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="0.001" 
                  value={gpa5}
                  onChange={(e) => setGpa5(parseFloat(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setGpa5(v)}
                      className={`py-1 rounded-lg text-[11px] font-black transition-colors ${
                        Math.abs(gpa5 - v) < 0.2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 hover:text-slate-700 border border-slate-200'
                      }`}
                    >
                      {v}.0
                    </button>
                  ))}
                </div>
              </div>

              {/* 오른쪽: 향후 학기별 예상 등급 입력 */}
              <div className="lg:col-span-7 p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-800">향후 학기별 예상 등급 (5등급제)</h3>
                  </div>
                  <button
                    onClick={() => setFutureGrades({ sem1_2: '', sem2_1: '', sem2_2: '', sem3_1: '' })}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    예상값 초기화
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  예상 등급을 입력하지 않은 학기는 <span className="font-bold text-indigo-600">현재 등급({gpa5.toFixed(2)})</span>이 그대로 유지됩니다.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {[
                    { key: 'sem1_2', label: '1학년 2학기' },
                    { key: 'sem2_1', label: '2학년 1학기' },
                    { key: 'sem2_2', label: '2학년 2학기' },
                    { key: 'sem3_1', label: '3학년 1학기' }
                  ].map(({ key, label }) => {
                    const currentVal = futureGrades[key as keyof typeof futureGrades];
                    return (
                      <div key={key} className="bg-white p-3 rounded-2xl border border-indigo-100/80 shadow-xs space-y-1.5 text-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block">{label}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={gpa5.toFixed(2)}
                          value={currentVal}
                          onChange={(e) => setFutureGrades({ ...futureGrades, [key]: e.target.value })}
                          className={`w-full py-1.5 text-center text-lg font-black rounded-xl border outline-none transition-all ${
                            currentVal !== '' 
                              ? 'bg-indigo-50/50 border-indigo-500 text-indigo-700 font-black' 
                              : 'border-slate-200 text-slate-400 placeholder:text-slate-300'
                          }`}
                        />
                        <span className="text-[9px] font-bold text-slate-400 block">
                          {currentVal !== '' ? '직접 설정' : '현재값 유지'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 최종 점수 및 비교 표 (Comparison Table) */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-serif italic font-black text-slate-900 tracking-tight">현재 성적 vs 예상 최종 성적 비교표</h3>
                </div>
                
                {/* 대학 추천에 반영할 성적 선택 스위치 */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setUseProjectedGrade(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      !useProjectedGrade 
                        ? 'bg-white text-indigo-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    현재 성적 기준 탐색
                  </button>
                  <button
                    onClick={() => setUseProjectedGrade(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      useProjectedGrade 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    예상 최종 성적 기준 탐색
                  </button>
                </div>
              </div>

              {/* 비교 표 */}
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-4 px-6">구분</th>
                      <th className="py-4 px-6 text-center">5등급제 평균 등급</th>
                      <th className="py-4 px-6 text-center">9등급제 환산 등급</th>
                      <th className="py-4 px-6 text-center">산출 내역</th>
                      <th className="py-4 px-6 text-center">탐색 상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {/* 현재 1-1 행 */}
                    <tr className={!useProjectedGrade ? 'bg-indigo-50/40' : ''}>
                      <td className="py-4 px-6 font-black text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        현재 성적 (1-1)
                      </td>
                      <td className="py-4 px-6 text-center font-black text-slate-900 text-base">
                        {gpa5.toFixed(3)} 등급
                      </td>
                      <td className="py-4 px-6 text-center font-black text-slate-900 text-base">
                        {currentConversion.grade9.toFixed(3)} 등급
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-slate-500">
                        1학년 1학기 단일 성적
                      </td>
                      <td className="py-4 px-6 text-center">
                        {!useProjectedGrade ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                            적용 중
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">대기</span>
                        )}
                      </td>
                    </tr>

                    {/* 예상 최종 5개 학기 행 */}
                    <tr className={useProjectedGrade ? 'bg-indigo-50/40' : ''}>
                      <td className="py-4 px-6 font-black text-indigo-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        예상 최종 성적 (1-1 ~ 3-1)
                      </td>
                      <td className="py-4 px-6 text-center font-black text-indigo-600 text-base">
                        {projection.projectedGpa5.toFixed(3)} 등급
                      </td>
                      <td className="py-4 px-6 text-center font-black text-indigo-600 text-base">
                        {projection.projectedConversion.grade9.toFixed(3)} 등급
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-slate-600">
                        5개 학기 균등 평균 (3-1 수시 마감 기준)
                      </td>
                      <td className="py-4 px-6 text-center">
                        {useProjectedGrade ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                            적용 중
                          </span>
                        ) : (
                          <button
                            onClick={() => setUseProjectedGrade(true)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 hover:bg-indigo-100 text-indigo-600 transition-colors"
                          >
                            적용하기
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* 변동폭 비교 행 */}
                    <tr className="bg-slate-50/80 font-bold text-xs">
                      <td className="py-3 px-6 text-slate-500">
                        예상 변동치 (Gain / Drop)
                      </td>
                      <td className="py-3 px-6 text-center font-black">
                        {projection.diffGpa5 === 0 ? (
                          <span className="text-slate-400">변동 없음 (0.000)</span>
                        ) : projection.diffGpa5 < 0 ? (
                          <span className="text-emerald-600">▲ {Math.abs(projection.diffGpa5).toFixed(3)} 등급 향상</span>
                        ) : (
                          <span className="text-rose-600">▼ {projection.diffGpa5.toFixed(3)} 등급 하락</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center font-black">
                        {projection.diffGrade9 === 0 ? (
                          <span className="text-slate-400">변동 없음 (0.000)</span>
                        ) : projection.diffGrade9 < 0 ? (
                          <span className="text-emerald-600">▲ {Math.abs(projection.diffGrade9).toFixed(3)} 환산 향상</span>
                        ) : (
                          <span className="text-rose-600">▼ {projection.diffGrade9.toFixed(3)} 환산 하락</span>
                        )}
                      </td>
                      <td colSpan={2} className="py-3 px-6 text-center text-[11px] text-slate-400">
                        * 내신 등급은 숫자가 낮을수록 우수합니다.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 계산기 팝업 모달 */}
            <AnimatePresence>
              {showCalculator && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 p-8 rounded-3xl border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">성적 상세 입력 (등급별 과목 수)</h4>
                  </div>
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    {[1, 2, 3, 4, 5].map(grade => (
                      <div key={grade} className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 text-center block uppercase tracking-widest">{grade}등급</label>
                        <input 
                          type="number" 
                          min="0"
                          value={gradeCounts[grade]}
                          onChange={(e) => setGradeCounts({ ...gradeCounts, [grade]: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-center text-lg font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={calculateGPA}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                  >
                    계산 결과 적용하기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 교육청 환산 기준 선택 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'gyeonggi', name: '경기 진협 분석 자료', desc: '경기진협 버전' },
                { id: 'busan', name: '부산시 교육청 버전', desc: '부산시 교육청 버전' },
                { id: 'gwangju', name: '광주시 교육청 버전', desc: '광주시 교육청 버전' },
                { id: 'mixed', name: '통합 분석 버전', desc: '경기/부산/광주시 평균' }
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setConversionVersion(v.id as ConversionVersion)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    conversionVersion === v.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{v.desc}</p>
                  <p className="text-xs font-black">{v.name}</p>
                </button>
              ))}
            </div>

            {/* 최종 활성 환산 결과 카드 */}
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-slate-300">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500 rounded-full">
                  <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
                    {useProjectedGrade ? '★ 목표/예상 최종 성적 기준 환산' : '현재 성적 기준 환산'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-300 max-w-md leading-snug">
                    {activeConversion.reason}
                  </p>
                  <p className="text-[11px] text-indigo-300 font-medium">
                    {useProjectedGrade 
                      ? `5개 학기 평균 ${projection.projectedGpa5.toFixed(3)}등급 기준 추천 대학을 탐색합니다.`
                      : `1-1 성적 ${gpa5.toFixed(3)}등급 기준 추천 대학을 탐색합니다.`
                    }
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right shrink-0 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                <div className="flex items-baseline justify-center md:justify-end gap-2">
                  <span className="text-7xl font-black tabular-nums tracking-tighter text-indigo-400">{activeConversion.grade9.toFixed(3)}</span>
                  <span className="text-xl font-bold text-slate-400">등급</span>
                </div>
              </div>
            </div>

            {/* 계열 필터 */}
            <div className="pt-8 border-t border-slate-100 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-serif italic font-black tracking-tight text-slate-900">계열별 탐색</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Explore by Academic Field</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                    검색 범위: ±{searchRange.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {categories.map((cat) => {
                  const count = categoryCounts[cat.id] || 0;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border-2 group ${
                        selectedCategory === cat.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 -translate-y-1'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                      <span className="text-[11px] font-black tracking-tight">{cat.name}</span>
                      {count > 0 && (
                        <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          selectedCategory === cat.id 
                            ? 'bg-white text-indigo-600 border-white' 
                            : 'bg-indigo-600 text-white border-indigo-600'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 적정 대학 검색 & 리스트 섹션 */}
        <section className="space-y-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <School className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-4xl font-serif italic font-black tracking-tighter text-slate-900">
                      적정 대학 리스트
                    </h2>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase ml-15">
                    기준 : 2026 어디가 입결 ({useProjectedGrade ? '예상 최종 성적 반영' : '현재 성적 반영'})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</span>
                    <span className="text-sm font-black text-indigo-600">{activeConversion.grade9.toFixed(3)} 등급</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Range</span>
                    <span className="text-sm font-black text-indigo-600">{(activeConversion.grade9 - searchRange).toFixed(2)} ~ {(activeConversion.grade9 + searchRange).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-4">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={showAmbitious}
                          onChange={(e) => setShowAmbitious(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${showAmbitious ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showAmbitious ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">소신 지원 포함</span>
                    </label>
                    <button 
                      onClick={() => {
                        setSelectedUniversity('전체');
                        setSelectedCategory('전체');
                        setSearchQuery('');
                        setSearchRange(0.3);
                        setShowAmbitious(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      필터 초기화
                    </button>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[0.1, 0.3, 0.5].map(r => (
                      <button 
                        key={r}
                        onClick={() => setSearchRange(r)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          searchRange === r 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        ±{r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 flex items-center gap-4">
                  <span className="opacity-60 text-[10px] uppercase tracking-[0.2em]">Departments Found</span>
                  <span className="text-2xl tracking-tighter">{filteredRecords.length}</span>
                </div>
              </div>
            </div>

            {activeConversion.grade9 < 2.0 && !showAmbitious && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
                <span className="text-xl">💡</span>
                <p className="text-xs font-bold text-amber-800">
                  1등급대 최상위 대학을 더 많이 보려면 우측 상단의 <span className="text-indigo-600">'소신 지원 포함'</span>을 켜주세요!
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">University Filter</label>
                <div className="relative">
                  <select 
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="w-full pl-14 pr-10 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    {universityList.map(uni => (
                      <option key={uni} value={uni}>{uni === '전체' ? '모든 대학교 탐색' : uni}</option>
                    ))}
                  </select>
                  <School className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                  <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Keyword Search</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                  <input 
                    type="text"
                    placeholder="학과명 또는 전형명을 입력하세요..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* 결과 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRecords.length > 0 ? (
                <>
                  {filteredRecords.slice(0, displayLimit).map((record, index) => (
                    <motion.div
                      key={`${record.university}-${record.department}-${record.admissionName}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg uppercase tracking-widest">
                              {record.category}
                            </span>
                            {(() => {
                              const diff = getDifficulty(record.averageGrade, activeConversion.grade9);
                              return (
                                <span className={`px-2 py-1 border text-[9px] font-black rounded-lg uppercase tracking-widest ${diff.color}`}>
                                  {diff.label}
                                </span>
                              );
                            })()}
                          </div>
                          <h3 className="font-serif italic font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                            {record.university}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.campus}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Avg Grade</p>
                          <p className="text-2xl font-black text-indigo-600 tabular-nums">{record.averageGrade.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-6 border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-800 line-clamp-1">{record.department}</p>
                          <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{record.admissionName}</p>
                        </div>
                        <div className="flex items-center justify-between text-indigo-600">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {filteredRecords.length > displayLimit && (
                    <div className="col-span-full text-center py-8">
                      <button
                        onClick={() => setDisplayLimit(prev => prev + 60)}
                        className="px-8 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        결과 더보기 ({Math.min(displayLimit, filteredRecords.length)} / {filteredRecords.length})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-full py-32 text-center space-y-6">
                  <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black text-slate-900">검색 결과가 없습니다</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                      현재 설정된 범위(±{searchRange.toFixed(2)}) 내에<br/>
                      일치하는 대학이 없습니다.
                    </p>
                    <div className="pt-4">
                      <button 
                        onClick={() => setSearchRange(0.3)}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95"
                      >
                        검색 범위 ±0.3으로 확대하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-40">
            <GraduationCap className="w-5 h-5" />
            <span className="font-black tracking-tighter uppercase">9등급 환산 적정 대학 찾기(경기, 부산, 광주 자료)</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold leading-relaxed uppercase tracking-widest">
            제작 : 숭신고등학교 진로전담교사 김강석
          </p>
          <p className="text-slate-300 text-[9px] font-bold uppercase tracking-[0.2em]">
            © 2026 UNIVERSITY SEARCH. ALL RIGHTS RESERVED. | DATA SOURCE: BUSAN OFFICE OF EDUCATION, GYEONGGI JINHAK, ADIGA
          </p>
        </div>
      </footer>
    </div>
  );
}
