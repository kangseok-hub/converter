import { gyeonggiData, busanData, gwangjuData } from '../data/conversionData';
import { rawAdmissionData } from '../data/admissionData';

export type Category = '인문' | '사회' | '자연' | '공학' | '의약' | '교육' | '기타';

export interface AdmissionRecord {
  region: string;
  university: string;
  admissionName: string;
  department: string;
  track: string;               // 원자료의 인문/자연/의학/통합 구분
  recruitCount: number;        // 모집인원
  competitionRate: number | null; // 경쟁률 (정보 없으면 null)
  additionalAdmit: number | null; // 추합인원 (정보 없으면 null)
  averageGrade: number;        // 70% 컷 등급
  category: Category;
}

export type ConversionVersion = 'gyeonggi' | 'busan' | 'gwangju' | 'mixed';

export function convertGrade(grade5: number, version: ConversionVersion = 'mixed'): { grade9: number; reason: string } {
  const interpolate = (val: number, data: { grade5: number; grade9: number }[]) => {
    if (val <= data[0].grade5) return data[0].grade9;
    if (val >= data[data.length - 1].grade5) return data[data.length - 1].grade9;

    for (let i = 0; i < data.length - 1; i++) {
      if (val >= data[i].grade5 && val <= data[i + 1].grade5) {
        const t = (val - data[i].grade5) / (data[i + 1].grade5 - data[i].grade5);
        return data[i].grade9 + t * (data[i + 1].grade9 - data[i].grade9);
      }
    }
    return val;
  };

  const g9 = interpolate(grade5, gyeonggiData);
  const b9 = interpolate(grade5, busanData);
  const gj9 = interpolate(grade5, gwangjuData);
  
  let grade9: number;
  let reason: string;

  if (version === 'gyeonggi') {
    grade9 = g9;
    reason = `경기진학지도협의회 '2025학년도 1학년 성적 분석 자료'를 바탕으로 환산한 결과, 약 ${grade9.toFixed(3)} 등급으로 추정됩니다.`;
  } else if (version === 'busan') {
    grade9 = b9;
    reason = `부산시 교육청 '2026학년도 고2 1학기까지 누적 등급평균 분석 자료(최신)'를 바탕으로 환산한 결과, 약 ${grade9.toFixed(3)} 등급으로 추정됩니다.`;
  } else if (version === 'gwangju') {
    grade9 = gj9;
    reason = `광주시 교육청 '2025학년도 고1 등급평균 분석 자료'를 바탕으로 환산한 결과, 약 ${grade9.toFixed(3)} 등급으로 추정됩니다.`;
  } else {
    grade9 = (g9 + b9 + gj9) / 3;
    reason = `경기진협(${g9.toFixed(3)}), 부산시 교육청(${b9.toFixed(3)}), 광주시 교육청(${gj9.toFixed(3)})의 2025학년도 분석 자료를 평균하여 환산한 결과, 약 ${grade9.toFixed(3)} 등급으로 추정됩니다.`;
  }

  return {
    grade9: Number(grade9.toFixed(3)),
    reason
  };
}

export function categorizeDepartment(dept: string): Category {
  const educationKeywords = ['교육', '사범'];
  const medicalKeywords = ['의예', '치의예', '한의예', '약학', '간호', '임상병리', '방사선', '물리치료', '작업치료', '치위생', '응급구조', '수의예', '의학', '한약', '의료', '치기공', '보건'];
  const engineeringKeywords = ['전자', '컴퓨터', '기계', '신소재', '건축', '에너지', '토목', '환경', '산업', '소프트웨어', '인공지능', '로봇', '반도체', '자동차', '화학공학', '고분자', '시스템', '전기', '정보', '공학', 'AI', '데이터', '융합기술', '드론', '메카'];
  const naturalKeywords = ['수학', '물리', '화학', '생물', '천문', '지질', '해양', '통계', '의생명', '생명과학', '과학', '나노', '식품', '원예', '산림', '조경', '생명'];
  const socialKeywords = ['경영', '경제', '법학', '행정', '미디어', '사회복지', '심리', '정치', '외교', '무역', '회계', '관광', '언론', '아동', '소비자', '지리', '사회', '광고', '홍보', '금융', '부동산', '세무', '국제', '커뮤니케이션'];
  const humanitiesKeywords = ['인문', '어문', '역사', '철학', '종교', '국어', '영어', '독어', '불어', '일어', '중어', '한문', '사학', '고고', '미학', '문학', '언어', '신학', '창작', '문화'];

  if (educationKeywords.some(k => dept.includes(k))) return '교육';
  if (medicalKeywords.some(k => dept.includes(k))) return '의약';
  if (engineeringKeywords.some(k => dept.includes(k))) return '공학';
  if (naturalKeywords.some(k => dept.includes(k))) return '자연';
  if (socialKeywords.some(k => dept.includes(k))) return '사회';
  if (humanitiesKeywords.some(k => dept.includes(k))) return '인문';

  return '기타';
}

// 학과 키워드로 계열 분류가 애매한(기타로 빠지는) 경우, 원자료의 인문/자연 구분값으로 보정한다.
function resolveCategory(department: string, track: string): Category {
  const byKeyword = categorizeDepartment(department);
  if (byKeyword !== '기타') return byKeyword;
  if (track === '의학') return '의약';
  if (track === '인문') return '인문';
  if (track === '자연') return '자연';
  return '기타';
}

// 2026학년도 수시 입시결과 원자료(src/data/admissionData.ts)를 화면에서 쓰는
// AdmissionRecord 형태로 변환한다. 기존에는 CSV 문자열을 파싱했지만,
// 학과/전형명에 쉼표가 포함된 경우가 있어 이제는 구조화된 배열을 직접 사용한다.
export function loadAdmissionRecords(): AdmissionRecord[] {
  return rawAdmissionData.map(row => {
    const [region, university, admissionName, department, track, recruitCount, competitionRate, additionalAdmit, averageGrade] = row;

    return {
      region,
      university,
      admissionName,
      department,
      track,
      recruitCount,
      competitionRate,
      additionalAdmit,
      averageGrade,
      category: resolveCategory(department, track)
    };
  });
}
