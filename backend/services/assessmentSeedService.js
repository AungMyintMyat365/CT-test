import { addMonths, isValid, parseISO } from 'date-fns';

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

const toIsoDate = (value) => {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
};

export const deriveJoinDate = (latestType, latestDate) => {
  const latest = toDate(latestDate);
  if (!latest || !latestType) return null;

  if (latestType === AssessmentType.INITIAL_CT) {
    return latest.toISOString().slice(0, 10);
  }

  if (latestType === AssessmentType.INITIAL_CT_SECOND) {
    return addMonths(latest, -6).toISOString().slice(0, 10);
  }

  return addMonths(latest, -12).toISOString().slice(0, 10);
};

export const buildAssessmentSeed = ({ latestType, latestDate }) => {
  const latestIso = toIsoDate(latestDate);
  if (!latestType || !latestIso) return [];

  const joinDate = deriveJoinDate(latestType, latestIso);
  if (!joinDate) return [];

  const initialDate = joinDate;
  const secondDate = addMonths(parseISO(joinDate), 6).toISOString().slice(0, 10);

  if (latestType === AssessmentType.INITIAL_CT) {
    return [{ assessment_type: AssessmentType.INITIAL_CT, date: latestIso }];
  }

  if (latestType === AssessmentType.INITIAL_CT_SECOND) {
    return [
      { assessment_type: AssessmentType.INITIAL_CT, date: initialDate },
      { assessment_type: AssessmentType.INITIAL_CT_SECOND, date: latestIso },
    ];
  }

  if (latestType === AssessmentType.PROFESSIONAL) {
    return [
      { assessment_type: AssessmentType.INITIAL_CT, date: initialDate },
      { assessment_type: AssessmentType.INITIAL_CT_SECOND, date: secondDate },
      { assessment_type: AssessmentType.PROFESSIONAL, date: latestIso },
    ];
  }

  return [
    { assessment_type: AssessmentType.INITIAL_CT, date: initialDate },
    { assessment_type: AssessmentType.INITIAL_CT_SECOND, date: secondDate },
    { assessment_type: AssessmentType.DEVELOPMENT_CT, date: latestIso },
  ];
};
