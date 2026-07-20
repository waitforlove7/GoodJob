const VIEWBOX = { width: 960, height: 520 };

const CLUSTER_CENTERS = {
  "web-client": { x: 110, y: 300 },
  backend: { x: 320, y: 300 },
  data: { x: 530, y: 300 },
  quality: { x: 740, y: 300 },
  languages: { x: 110, y: 430 },
  systems: { x: 320, y: 430 },
  "ai-agent": { x: 530, y: 430 },
  "ai-model": { x: 740, y: 430 },
  cloud: { x: 850, y: 365 },
};

const CATEGORY_PATTERN = [
  [[0, 0], [28, -12], [56, 4], [84, -8]],
  [[0, 0], [20, 18], [44, -6], [68, 14]],
  [[0, 0], [24, 20], [48, 0], [24, -20]],
  [[0, 0], [18, -16], [36, 8], [54, -4], [72, 12]],
];

export function getConstellationViewBox() {
  return VIEWBOX;
}

export function buildConstellationLayout(model) {
  const positions = {};
  const categoryPatterns = {};

  model.categories.forEach((category, index) => {
    const col = index % 6;
    const row = index >= 6 ? 1 : 0;
    const cx = 80 + col * 150;
    const cy = row ? 88 : 52;
    positions[category.id] = { x: cx, y: cy, type: "category" };
    categoryPatterns[category.id] = CATEGORY_PATTERN[index % CATEGORY_PATTERN.length].map(([dx, dy]) => ({
      x: cx + dx,
      y: cy + dy,
    }));
  });

  const spacing = 34;
  model.skillGroups.forEach((group) => {
    const center = CLUSTER_CENTERS[group.id];
    if (!center) return;
    const skills = group.skills
      .filter((skill) => model.skillMemberships.get(skill.id)?.length === 1)
      .sort((a, b) => hashString(a.id) - hashString(b.id));
    const columns = Math.max(1, Math.ceil(Math.sqrt(skills.length)));
    const rows = Math.max(1, Math.ceil(skills.length / columns));

    skills.forEach((skill, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowLength = Math.min(columns, skills.length - row * columns);
      const random = seededRandom(hashString(`${skill.id}:position`));
      positions[skill.id] = {
        x: center.x + (column - (rowLength - 1) / 2) * spacing + (random() - 0.5) * 6,
        y: center.y + (row - (rows - 1) / 2) * spacing + (random() - 0.5) * 6,
        type: "skill",
      };
    });
  });

  const sharedSkillsByBoundary = new Map();
  for (const skill of model.skills) {
    const memberships = model.skillMemberships.get(skill.id) || [];
    if (memberships.length < 2) continue;
    const boundaryId = [...memberships].sort().join(":");
    const boundarySkills = sharedSkillsByBoundary.get(boundaryId) || [];
    boundarySkills.push(skill);
    sharedSkillsByBoundary.set(boundaryId, boundarySkills);
  }

  for (const skills of sharedSkillsByBoundary.values()) {
    const memberships = model.skillMemberships.get(skills[0].id);
    const centers = memberships.map((groupId) => CLUSTER_CENTERS[groupId]).filter(Boolean);
    if (centers.length < 2) continue;
    const dx = centers[1].x - centers[0].x;
    const dy = centers[1].y - centers[0].y;
    const length = Math.hypot(dx, dy) || 1;
    const center = {
      x: centers.reduce((total, point) => total + point.x, 0) / centers.length,
      y: centers.reduce((total, point) => total + point.y, 0) / centers.length,
    };

    skills.sort((a, b) => hashString(a.id) - hashString(b.id)).forEach((skill, index) => {
      const offset = (index - (skills.length - 1) / 2) * 32;
      positions[skill.id] = {
        x: center.x - (dy / length) * offset,
        y: center.y + (dx / length) * offset,
        type: "skill",
      };
    });
  }

  for (const skill of model.skills) {
    if (!positions[skill.id]) {
      positions[skill.id] = { x: 480, y: 260, type: "skill" };
    }
  }

  return { positions, categoryPatterns, viewBox: VIEWBOX };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
