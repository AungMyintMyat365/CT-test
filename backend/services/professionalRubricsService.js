import fs from 'node:fs';

const fileUrl = new URL('../data/professionalRubrics.json', import.meta.url);

const loadTemplates = () => {
  const raw = fs.readFileSync(fileUrl, 'utf8');
  const data = JSON.parse(raw);
  return (data || []).map((template) => {
    const maxScore = (template.items || []).reduce((sum, item) => sum + Number(item.max || 0), 0);
    return {
      ...template,
      maxScore,
    };
  });
};

let cachedTemplates = null;

export const getProfessionalTemplates = () => {
  if (!cachedTemplates) {
    cachedTemplates = loadTemplates();
  }
  return cachedTemplates;
};

export const getProfessionalTemplate = (key) =>
  getProfessionalTemplates().find((template) => template.key === key);
