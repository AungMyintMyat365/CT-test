import { addMonths, isAfter, isBefore, isValid, parseISO } from 'date-fns';

export const AssessmentType = {
  INITIAL_CT: 'INITIAL_CT',
  INITIAL_CT_SECOND: 'INITIAL_CT_SECOND',
  PROFESSIONAL: 'PROFESSIONAL',
  DEVELOPMENT_CT: 'DEVELOPMENT_CT',
};

const toDate = (value) => {
  if (!value) return null;
  const candidate = value instanceof Date ? value : parseISO(String(value));
  return isValid(candidate) ? candidate : null;
};

const latestByType = (assessments = [], type) => {
  const filtered = assessments.filter((item) => item.assessment_type === type && item.date);
  if (!filtered.length) return null;
  return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};

export const getNextAssessment = ({
  joinDate,
  professionalLevelCompletedAt,
  assessments,
  now = new Date(),
}) => {
  const join = toDate(joinDate);
  const professionalCompleted = toDate(professionalLevelCompletedAt);
  if (!join) {
    return {
      nextAssessmentType: AssessmentType.INITIAL_CT,
      nextAssessmentDate: null,
      status: 'PENDING',
    };
  }

  const hasInitial = assessments.some((item) => item.assessment_type === AssessmentType.INITIAL_CT);
  if (!hasInitial) {
    return {
      nextAssessmentType: AssessmentType.INITIAL_CT,
      nextAssessmentDate: join,
      status: isAfter(join, now) ? 'UPCOMING' : 'DUE',
    };
  }

  const initialSecondDate = addMonths(join, 6);
  const hasInitialSecond = assessments.some(
    (item) => item.assessment_type === AssessmentType.INITIAL_CT_SECOND,
  );
  if (!hasInitialSecond) {
    return {
      nextAssessmentType: AssessmentType.INITIAL_CT_SECOND,
      nextAssessmentDate: initialSecondDate,
      status: isAfter(initialSecondDate, now) ? 'UPCOMING' : 'DUE',
    };
  }

  const hasProfessional = assessments.some((item) => item.assessment_type === AssessmentType.PROFESSIONAL);
  if (professionalCompleted && !hasProfessional) {
    return {
      nextAssessmentType: AssessmentType.PROFESSIONAL,
      nextAssessmentDate: professionalCompleted,
      status: isAfter(professionalCompleted, now) ? 'UPCOMING' : 'DUE',
    };
  }

  const developmentBaseline = addMonths(join, 12);
  const lastDevelopment = latestByType(assessments, AssessmentType.DEVELOPMENT_CT);

  if (!lastDevelopment) {
    return {
      nextAssessmentType: AssessmentType.DEVELOPMENT_CT,
      nextAssessmentDate: developmentBaseline,
      status: isAfter(developmentBaseline, now) ? 'UPCOMING' : 'DUE',
    };
  }

  const nextDevelopmentDate = addMonths(new Date(lastDevelopment.date), 6);
  const status = isBefore(now, nextDevelopmentDate) ? 'UPCOMING' : 'DUE';

  return {
    nextAssessmentType: AssessmentType.DEVELOPMENT_CT,
    nextAssessmentDate: nextDevelopmentDate,
    status,
  };
};
