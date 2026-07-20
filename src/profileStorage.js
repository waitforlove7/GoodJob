const PROFILE_KEY = "jobcloud-user-profile";
const MASTERED_KEY = "jobcloud-mastered-skills";

const DEFAULT_PROFILE = {
  name: "学习者",
  email: "learner@goodjob.local",
  goalCategoryId: null,
  resumeText: "",
  resumeFileName: "",
};

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadMasteredSkillIds() {
  try {
    const raw = localStorage.getItem(MASTERED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMasteredSkillIds(skillIds) {
  localStorage.setItem(MASTERED_KEY, JSON.stringify(skillIds));
}
