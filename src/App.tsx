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
  ChevronRight
} from 'lucide-react';
import { convertGrade, ConversionVersion, parseCSV, Category } from './lib/admissionUtils';
import { rawCSV } from './data/rawCSV';

export default function App() {
  const [gpa5, setGpa5] = useState<number>(2.0);
  const [conversionVersion, setConversionVersion] = useState<ConversionVersion>('mixed');
  const [gradeCounts, setGradeCounts] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRange, setSearchRange] = useState<number>(0.1); // 기본 범위를 ±0.1로 복구
  const [selectedUniversity, setSelectedUniversity] = useState<string>('전체');
  const [showAmbitious, setShowAmbitious] = useState(true); // 소신 지원(더 높은 등급) 포함 여부
  const [displayLimit, setDisplayLimit] = useState<number>(60); // 렌더링 부하 방지용 표시 개수 제한

  // 검색 조건 변경 시 표시 개수 초기화
  useEffect(() => {
    setDisplayLimit(60);
  }, [gpa5, conversionVersion, selectedCategory, searchQuery, searchRange, selectedUniversity, showAmbitious]);

  const allRecords = useMemo(() => parseCSV(rawCSV), []);

  const universityList = useMemo(() => {
    const unis = Array.from(new Set(allRecords.map(r => r.university))).sort();
    return ['전체', ...unis];
  }, [allRecords]);

  const conversion = useMemo(() => {
    return convertGrade(gpa5, conversionVersion);
  }, [gpa5, conversionVersion]);

  const calculateGPA = () => {
    const totalCount = Object.values(gradeCounts).reduce((acc, val) => acc + val, 0);
    if (totalCount === 0) return;
    const weightedSum = Object.entries(gradeCounts).reduce((acc, [grade, count]) => acc + (parseInt(grade) * count), 0);
    const result = weightedSum / totalCount;
    setGpa5(result);
    setShowCalculator(false);
  };

  const categoryCounts = useMemo(() => {
    const targetGrade = conversion.grade9;
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
  }, [allRecords, conversion.grade9, searchRange, selectedUniversity, searchQuery, showAmbitious]);

  const filteredRecords = useMemo(() => {
    const targetGrade = conversion.grade9;
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
  }, [allRecords, conversion.grade9, selectedCategory, searchQuery, searchRange, selectedUniversity, showAmbitious]);

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
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
        {/* Hero Section / GPA Input */}
        <section className="relative">
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-50" />
          <div className="relative bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-4xl font-serif italic font-black tracking-tighter text-slate-900">성적 입력</h2>
                <p className="text-sm text-slate-500 font-medium">5등급제 내신을 입력하면 9등급제로 자동 환산됩니다.</p>
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

            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current GPA (5-Grade)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-indigo-600 tabular-nums">{gpa5.toFixed(3)}</span>
                    <span className="text-xl font-bold text-slate-300">등급</span>
                  </div>
                </div>
              </div>

              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.001" 
                value={gpa5}
                onChange={(e) => setGpa5(parseFloat(e.target.value))}
                className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
              
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(v => (
                  <div key={v} className="text-center space-y-1">
                    <div className={`h-1 rounded-full ${gpa5 >= v - 0.5 && gpa5 <= v + 0.5 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                    <span className="text-[10px] font-black text-slate-400">{v}.0</span>
                  </div>
                ))}
              </div>
            </div>

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

            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-slate-300">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-indigo-500 rounded-full">
                  <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">9-Grade Conversion Result</p>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-300 max-w-md leading-snug">
                    {conversion.reason}
                  </p>
                  {gpa5 <= 1.5 && (
                    <p className="text-[11px] text-indigo-300 font-medium">
                      💡 5등급제 1.0은 9등급제 기준 약 1.4등급으로 환산됩니다. (2026 분석 자료 기준) <br/>
                      1.0~1.3 구간의 대학을 보려면 '소신 지원 포함'을 켜주세요.
                    </p>
                  )}
                </div>
              </div>
              <div className="text-center md:text-right shrink-0 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                <div className="flex items-baseline justify-center md:justify-end gap-2">
                  <span className="text-7xl font-black tabular-nums tracking-tighter text-indigo-400">{conversion.grade9.toFixed(3)}</span>
                  <span className="text-xl font-bold text-slate-400">등급</span>
                </div>
              </div>
            </div>

            {/* Integrated Category Filter */}
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

        {/* Search & Filter Section */}
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
                  <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase ml-15">출처 : 2026 어디가 입결 자료</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</span>
                    <span className="text-sm font-black text-indigo-600">{conversion.grade9.toFixed(3)} 등급</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Range</span>
                    <span className="text-sm font-black text-indigo-600">{(conversion.grade9 - searchRange).toFixed(2)} ~ {(conversion.grade9 + searchRange).toFixed(2)}</span>
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

            {conversion.grade9 < 2.0 && !showAmbitious && (
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

            {/* Results Grid */}
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
                              const diff = getDifficulty(record.averageGrade, conversion.grade9);
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
