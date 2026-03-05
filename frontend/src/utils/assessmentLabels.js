export const assessmentLabels = {
  INITIAL_CT: 'Initial CT',
  INITIAL_CT_SECOND: 'Initial CT Second',
  PROFESSIONAL: 'Professional Assessment',
  DEVELOPMENT_CT: 'Development CT',
};

export const assessmentTypeOptions = Object.entries(assessmentLabels).map(([value, label]) => ({
  value,
  label,
}));
