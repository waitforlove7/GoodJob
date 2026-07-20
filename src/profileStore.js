const STORAGE_KEY = "goodjob_profile";

const DEFAULT_PROFILE = {
  targets: [],
  profileMasteredSkillIds: [],
  resumeText: "",
  resumeKeywords: [],
  updatedAt: null,
};

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, updatedAt: Date.now() }));
}
