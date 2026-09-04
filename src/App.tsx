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
    if (diff < -0
