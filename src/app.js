import { createClient } from "@supabase/supabase-js";
import { LANGS, DICT } from "./i18n.js";

const SUPABASE_URL = __SUPABASE_URL__;
const SUPABASE_ANON_KEY = __SUPABASE_ANON_KEY__;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Configure environment variables before running the app.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaults = {
  landing: {
    brandName: "NephroRounds Studio",
    brandTagline: "Editable nephrology morning report",
    loginHeadline: "Build each round yourself.",
    loginLead: "Edit the schedule, presenters, guests, photos, introductions, questions, and the meeting link from the admin console.",
    heroBadge: "Nephrology case conference",
    heroHeadline: "Schedule. Speakers. Guests. Questions. All editable.",
heroImage: "https://vjyzwqiehyfzjnebtiwv.supabase.co/storage/v1/object/public/public-images/landing/db1ddd79-1807-42bd-8262-481ecdd62e56/16b4acb4-6484-47ab-848a-718287d5375e.jpeg",    metrics: [
      { value: "Edit", label: "Calendar" },
      { value: "Upload", label: "Photos" },
      { value: "Lock", label: "Answers" }
    ],
    cards: [
      { title: "Admin-controlled content", text: "Add as many presenters and guests as you want, with photos and affiliations." },
      { title: "Flexible calendar", text: "Each item can have its own date, time, topic, and notes." },
      { title: "Locked responses", text: "Users choose an answer, write a reason, and cannot edit after submitting." }
    ]
  },
  meeting: {
    enabled: true,
    reportHeading: "Nephrology Morning Report",
    reportSubheading: "Schedule, speakers, video access, and locked audience responses.",
    title: "Nephrology Morning Report",
    time: "08:30 - 09:00",
    url: "https://meet.google.com/",
    notes: "Today: high-yield nephrology cases, action items for admitted patients, and teaching points for the team."
  },
  appearance: {
    scheduleHeight: 165,
    heroHeight: 330,
    avatarSize: 74,
    panelPadding: 18,
    brandAlign: "left"
  }
};

let currentUser = null;
let currentLang = detectLanguage();
let draftAnswers = {};
let mediaStream = null;
let localMedia = { mic: false, camera: false, status: "Mic and camera are off." };
let presenterMode = { presenting: false, mic: false, camera: false, background: "clean" };
let reminderTimer = null;

let state = {
  settings: structuredClone(defaults),
  users: [],
  schedule: [],
  people: [],
  questions: [],
  answers: [],
  announcements: [],
  liveMessages: [],
  handRaises: [],
  mediaControls: [],
  programs: [],
  lessons: [],
  progress: [],
  trainingReady: false,
  updateFilter: "all",
  selectedProgramId: null,
  adminProgramId: null
};

const $ = id => document.getElementById(id);

const els = {
  loginView: $("loginView"),
  appView: $("appView"),
  loginForm: $("loginForm"),
  username: $("username"),
  password: $("password"),
  todayText: $("todayText"),
  appShellName: $("appShellName"),
  profileName: $("profileName"),
  profileRole: $("profileRole"),
  logoutBtn: $("logoutBtn"),
  reportTab: $("reportTab"),
  profileTab: $("profileTab"),
  presenterTab: $("presenterTab"),
  adminTab: $("adminTab"),
  reportView: $("reportView"),
  profileView: $("profileView"),
  presenterView: $("presenterView"),
  adminView: $("adminView"),
  meetingLink: $("meetingLink"),
  copyMeetingLink: $("copyMeetingLink"),
  reportHeading: $("reportHeading"),
  reportSubheading: $("reportSubheading"),
  meetingCard: $("meetingCard"),
  notificationTitle: $("notificationTitle"),
  notificationText: $("notificationText"),
  enableReminder: $("enableReminder"),
  meetingTitle: $("meetingTitle"),
  meetingMeta: $("meetingMeta"),
  meetingNotes: $("meetingNotes"),
  localMediaPreview: $("localMediaPreview"),
  userMicToggle: $("userMicToggle"),
  userCameraToggle: $("userCameraToggle"),
  stopMediaBtn: $("stopMediaBtn"),
  mediaStatus: $("mediaStatus"),
  mediaAccessLabel: $("mediaAccessLabel"),
  submitState: $("submitState"),
  lockedLabel: $("lockedLabel"),
  schedule: $("schedule"),
  presenters: $("presenters"),
  guests: $("guests"),
  questions: $("questions"),
  submitAnswers: $("submitAnswers"),
  liveMessages: $("liveMessages"),
  liveMessageForm: $("liveMessageForm"),
  liveMessageInput: $("liveMessageInput"),
  raiseHandBtn: $("raiseHandBtn"),
  handRaiseStatus: $("handRaiseStatus"),
  slideViewerPanel: $("slideViewerPanel"),
  slideViewerTitle: $("slideViewerTitle"),
  slideFrame: $("slideFrame"),
  slideOpenLink: $("slideOpenLink"),
  closeSlides: $("closeSlides"),
  meetingForm: $("meetingForm"),
  adminReportHeading: $("adminReportHeading"),
  adminReportSubheading: $("adminReportSubheading"),
  adminMeetingTitle: $("adminMeetingTitle"),
  adminMeetingTime: $("adminMeetingTime"),
  adminMeetingUrl: $("adminMeetingUrl"),
  adminMeetingNotes: $("adminMeetingNotes"),
  clearMeeting: $("clearMeeting"),
  scheduleForm: $("scheduleForm"),
  scheduleId: $("scheduleId"),
  scheduleDate: $("scheduleDate"),
  scheduleTime: $("scheduleTime"),
  scheduleEndTime: $("scheduleEndTime"),
  scheduleTopic: $("scheduleTopic"),
  scheduleNotes: $("scheduleNotes"),
  scheduleRecordingUrl: $("scheduleRecordingUrl"),
  scheduleRecordingFile: $("scheduleRecordingFile"),
  scheduleRecordingData: $("scheduleRecordingData"),
  scheduleSlidesUrl: $("scheduleSlidesUrl"),
  scheduleSlidesFile: $("scheduleSlidesFile"),
  scheduleSlidesData: $("scheduleSlidesData"),
  scheduleSlidesName: $("scheduleSlidesName"),
  scheduleSlidesType: $("scheduleSlidesType"),
  cancelScheduleEdit: $("cancelScheduleEdit"),
  scheduleAdminList: $("scheduleAdminList"),
  personForm: $("personForm"),
  personId: $("personId"),
  personType: $("personType"),
  personName: $("personName"),
  personRole: $("personRole"),
  personInstitution: $("personInstitution"),
  personLocation: $("personLocation"),
  personPhoto: $("personPhoto"),
  personPhotoData: $("personPhotoData"),
  personIntro: $("personIntro"),
  cancelPersonEdit: $("cancelPersonEdit"),
  peopleAdminList: $("peopleAdminList"),
  questionForm: $("questionForm"),
  questionId: $("questionId"),
  questionText: $("questionText"),
  questionOptions: $("questionOptions"),
  cancelQuestionEdit: $("cancelQuestionEdit"),
  questionsAdminList: $("questionsAdminList"),
  userForm: $("userForm"),
  userId: $("userId"),
  userPhotoData: $("userPhotoData"),
  userFullName: $("userFullName"),
  userUsername: $("userUsername"),
  userPassword: $("userPassword"),
  userEmail: $("userEmail"),
  userRole: $("userRole"),
  userDiscipline: $("userDiscipline"),
  userUniversity: $("userUniversity"),
  userLocation: $("userLocation"),
  userPhoto: $("userPhoto"),
  userBio: $("userBio"),
  cancelUserEdit: $("cancelUserEdit"),
  usersAdminList: $("usersAdminList"),
  liveRoomAdminList: $("liveRoomAdminList"),
  appearanceForm: $("appearanceForm"),
  appearanceScheduleHeight: $("appearanceScheduleHeight"),
  appearanceHeroHeight: $("appearanceHeroHeight"),
  appearanceAvatarSize: $("appearanceAvatarSize"),
  appearancePanelPadding: $("appearancePanelPadding"),
  appearanceBrandAlign: $("appearanceBrandAlign"),
  resetAppearance: $("resetAppearance"),
  presentingStatus: $("presentingStatus"),
  presenterPreview: $("presenterPreview"),
  presenterPreviewText: $("presenterPreviewText"),
  presentingToggle: $("presentingToggle"),
  presenterMicToggle: $("presenterMicToggle"),
  presenterCameraToggle: $("presenterCameraToggle"),
  presenterBackground: $("presenterBackground"),
  presenterSlidesList: $("presenterSlidesList"),
  profileForm: $("profileForm"),
  profilePhotoData: $("profilePhotoData"),
  profileFullName: $("profileFullName"),
  profileUsernameInput: $("profileUsernameInput"),
  profilePasswordInput: $("profilePasswordInput"),
  profileEmail: $("profileEmail"),
  profileDiscipline: $("profileDiscipline"),
  profileUniversity: $("profileUniversity"),
  profileLocation: $("profileLocation"),
  profilePhoto: $("profilePhoto"),
  profileBio: $("profileBio"),
  thankYouForm: $("thankYouForm"),
  thankYouSession: $("thankYouSession"),
  thankYouSubject: $("thankYouSubject"),
  thankYouMessage: $("thankYouMessage"),
  thankYouList: $("thankYouList"),
  answersTable: $("answersTable"),
  toast: $("toast"),
  landingBrandName: $("landingBrandName"),
  landingBrandTagline: $("landingBrandTagline"),
  landingLoginHeadline: $("landingLoginHeadline"),
  landingLoginLead: $("landingLoginLead"),
  landingHeroBadge: $("landingHeroBadge"),
  landingHeroHeadline: $("landingHeroHeadline"),
  landingMetrics: $("landingMetrics"),
  landingCards: $("landingCards"),
  landingForm: $("landingForm"),
  landingHeroImageData: $("landingHeroImageData"),
  adminLandingBrandName: $("adminLandingBrandName"),
  adminLandingBrandTagline: $("adminLandingBrandTagline"),
  adminLandingLoginHeadline: $("adminLandingLoginHeadline"),
  adminLandingLoginLead: $("adminLandingLoginLead"),
  adminLandingHeroBadge: $("adminLandingHeroBadge"),
  adminLandingHeroImage: $("adminLandingHeroImage"),
  adminLandingHeroHeadline: $("adminLandingHeroHeadline"),
  landingMetricsAdminList: $("landingMetricsAdminList"),
  landingCardsAdminList: $("landingCardsAdminList"),
  addLandingMetric: $("addLandingMetric"),
  clearLandingMetrics: $("clearLandingMetrics"),
  addLandingCard: $("addLandingCard"),
  clearLandingCards: $("clearLandingCards"),
  clearLandingHeroImage: $("clearLandingHeroImage"),
  signupForm: $("signupForm"),
  signupFullName: $("signupFullName"),
  signupUsername: $("signupUsername"),
  signupEmail: $("signupEmail"),
  signupDiscipline: $("signupDiscipline"),
  signupUniversity: $("signupUniversity"),
  signupPassword: $("signupPassword"),
  pendingNotice: $("pendingNotice"),
  pendingTitle: $("pendingTitle"),
  pendingText: $("pendingText"),
  pendingBack: $("pendingBack"),
  authCard: $("authCard"),
  landingFooterName: $("landingFooterName"),
  userStatus: $("userStatus"),
  userFormTitle: $("userFormTitle"),
  pendingUsersList: $("pendingUsersList"),
  pendingCount: $("pendingCount"),
  langSelect: $("langSelect"),
  langSelectApp: $("langSelectApp"),
  updatesTab: $("updatesTab"),
  trainingTab: $("trainingTab"),
  updatesView: $("updatesView"),
  trainingView: $("trainingView"),
  updatesBadge: $("updatesBadge"),
  addAllToCalendar: $("addAllToCalendar"),
  nextSessionCard: $("nextSessionCard"),
  nextSessionTitle: $("nextSessionTitle"),
  nextSessionMeta: $("nextSessionMeta"),
  nextSessionCountdown: $("nextSessionCountdown"),
  pinnedUpdates: $("pinnedUpdates"),
  updatesList: $("updatesList"),
  trainingOverview: $("trainingOverview"),
  trainingStats: $("trainingStats"),
  trainingPrograms: $("trainingPrograms"),
  trainingDetail: $("trainingDetail"),
  trainingBack: $("trainingBack"),
  programLevel: $("programLevel"),
  programTitle: $("programTitle"),
  programSummary: $("programSummary"),
  programRing: $("programRing"),
  programPercent: $("programPercent"),
  programCertificate: $("programCertificate"),
  lessonList: $("lessonList"),
  updateForm: $("updateForm"),
  updateId: $("updateId"),
  updateTitle: $("updateTitle"),
  updateCategory: $("updateCategory"),
  updateBody: $("updateBody"),
  updateLink: $("updateLink"),
  updatePinned: $("updatePinned"),
  updateActive: $("updateActive"),
  cancelUpdateEdit: $("cancelUpdateEdit"),
  updatesAdminList: $("updatesAdminList"),
  programForm: $("programForm"),
  programId: $("programId"),
  programCoverData: $("programCoverData"),
  programTitleInput: $("programTitleInput"),
  programLevelInput: $("programLevelInput"),
  programSummaryInput: $("programSummaryInput"),
  programAudience: $("programAudience"),
  programCover: $("programCover"),
  programOrder: $("programOrder"),
  programActive: $("programActive"),
  cancelProgramEdit: $("cancelProgramEdit"),
  programsAdminList: $("programsAdminList"),
  lessonsAdmin: $("lessonsAdmin"),
  lessonsAdminTitle: $("lessonsAdminTitle"),
  closeLessonsAdmin: $("closeLessonsAdmin"),
  lessonForm: $("lessonForm"),
  lessonId: $("lessonId"),
  lessonResourceData: $("lessonResourceData"),
  lessonResourceName: $("lessonResourceName"),
  lessonTitle: $("lessonTitle"),
  lessonDuration: $("lessonDuration"),
  lessonBody: $("lessonBody"),
  lessonVideo: $("lessonVideo"),
  lessonResourceUrl: $("lessonResourceUrl"),
  lessonResourceFile: $("lessonResourceFile"),
  lessonOrder: $("lessonOrder"),
  cancelLessonEdit: $("cancelLessonEdit"),
  lessonsAdminList: $("lessonsAdminList"),
  trainingReport: $("trainingReport"),
  forgotLink: $("forgotLink"),
  forgotForm: $("forgotForm"),
  forgotEmail: $("forgotEmail"),
  resetForm: $("resetForm"),
  resetPassword: $("resetPassword"),
  resetPassword2: $("resetPassword2"),
  newUpdateBtn: $("newUpdateBtn"),
  newProgramBtn: $("newProgramBtn"),
  heroSlider: $("heroSlider"),
  heroSlides: $("heroSlides"),
  heroDots: $("heroDots"),
  heroPrev: $("heroPrev"),
  heroNext: $("heroNext"),
  lightbox: $("lightbox"),
  lightboxClose: $("lightboxClose"),
  lightboxImage: $("lightboxImage"),
  adminLandingHeroInterval: $("adminLandingHeroInterval"),
  heroImagesAdmin: $("heroImagesAdmin"),
  landingCanvas: $("landingCanvas"),
  landingBoxes: $("landingBoxes"),
  designerBar: $("designerBar"),
  dAddBox: $("dAddBox"),
  dAddMetric: $("dAddMetric"),
  dAddCard: $("dAddCard"),
  dThemeBtn: $("dThemeBtn"),
  dUndo: $("dUndo"),
  dCancel: $("dCancel"),
  dSave: $("dSave"),
  dFormat: $("dFormat"),
  dSelLabel: $("dSelLabel"),
  dFont: $("dFont"),
  dSize: $("dSize"),
  dBold: $("dBold"),
  dItalic: $("dItalic"),
  dColor: $("dColor"),
  dFill: $("dFill"),
  dNoFill: $("dNoFill"),
  dRadius: $("dRadius"),
  dFront: $("dFront"),
  dBack: $("dBack"),
  dReset: $("dReset"),
  dHide: $("dHide"),
  dTheme: $("dTheme"),
  tBg1: $("tBg1"),
  tBg2: $("tBg2"),
  tAccent: $("tAccent"),
  tFont: $("tFont"),
  tGradient: $("tGradient"),
  tReset: $("tReset"),
  appCopyright: $("appCopyright"),
  openDesigner: $("openDesigner"),
  adminLandingCopyright: $("adminLandingCopyright")
};

let recoveryMode = /type=recovery/.test(`${window.location.hash}${window.location.search}`);
let heroIndex = 0;
let heroTimer = null;
let heroPaused = false;
const FONT_STACKS = {
  Inter: "Inter, system-ui, sans-serif",
  Montserrat: "Montserrat, system-ui, sans-serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Vazirmatn: "Vazirmatn, Tahoma, sans-serif",
  "Courier New": "'Courier New', monospace"
};
const MULTILINE_KEYS = /^(heroHeadline|loginLead|card:\d+:text|copyright)$/;
const KEY_LABELS = {
  brandName: "App name", brandTagline: "Tagline", heroBadge: "Badge", heroHeadline: "Main headline",
  loginLead: "Description", loginHeadline: "Sign-in title", copyright: "Copyright"
};
const designer = {
  active: false,
  draft: null,
  undo: [],
  selected: null,
  drag: null
};
/* ------------------------------------------------------------------
   Languages
------------------------------------------------------------------ */
const LOCALES = { en: "en-US", es: "es-ES", fr: "fr-FR", fa: "fa-IR-u-ca-gregory", tr: "tr-TR" };

function detectLanguage() {
  const saved = (document.cookie.match(/(?:^|; )lang=([a-z]{2})/) || [])[1];
  if (saved && LANGS.some(lang => lang.code === saved)) return saved;
  for (const pref of navigator.languages || [navigator.language || "en"]) {
    const code = String(pref).slice(0, 2).toLowerCase();
    if (LANGS.some(lang => lang.code === code)) return code;
  }
  return "en";
}

function t(text) {
  if (currentLang === "en") return text;
  return DICT[currentLang]?.[text] || text;
}

function currentLocale() {
  return LOCALES[currentLang] || "en-US";
}

function currentDir() {
  return LANGS.find(lang => lang.code === currentLang)?.dir || "ltr";
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

function renderLanguageMenus() {
  for (const select of [els.langSelect, els.langSelectApp]) {
    if (!select) continue;
    if (!select.options.length) {
      select.innerHTML = LANGS.map(lang => `<option value="${lang.code}">${lang.label}</option>`).join("");
      select.addEventListener("change", () => setLanguage(select.value));
    }
    select.value = currentLang;
  }
}

function setLanguage(code, { initial = false } = {}) {
  if (!LANGS.some(lang => lang.code === code)) code = "en";
  currentLang = code;
  document.cookie = `lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = code;
  document.documentElement.dir = currentDir();
  applyStaticTranslations();
  renderLanguageMenus();
  els.todayText.textContent = new Intl.DateTimeFormat(currentLocale(), { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  if (initial) return;
  if (currentUser) renderAll();
  else if (!designer.active) renderLanding();
  const visible = [...document.querySelectorAll(".main > section")].find(section => !section.classList.contains("hidden"));
  if (visible?.id === "updatesView") renderUpdates();
  if (visible?.id === "trainingView") renderTraining();
}

const UPDATE_LABELS = { update: "Update", reminder: "Reminder", event: "Event", training: "Training" };
const updateLabel = key => t(UPDATE_LABELS[key] || "Update");
const VIEWS = ["report", "updates", "training", "profile", "presenter", "admin"];

boot();

async function boot() {
  setLanguage(currentLang, { initial: true });

  renderLanding();
  bindEvents();
  await loadPublicLanding();
  window.setInterval(updateCountdown, 1000);

  supabase.auth.onAuthStateChange(event => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryMode = true;
      showAuthPanel("reset");
    }
  });

  const { data } = await supabase.auth.getSession();
  if (recoveryMode && data.session) {
    showAuthPanel("reset");
    els.authCard.scrollIntoView({ block: "center" });
    return;
  }
  if (data.session) {
    await hydrateSession(data.session.user);
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", signIn);
  els.signupForm.addEventListener("submit", signUp);
  els.pendingBack.addEventListener("click", () => setAuthTab("signin"));
  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
      setAuthTab(button.dataset.authTab);
      els.authCard.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  els.logoutBtn.addEventListener("click", signOut);
  for (const view of VIEWS) els[`${view}Tab`].addEventListener("click", () => showView(view));
  document.querySelectorAll("[data-update-filter]").forEach(button => button.addEventListener("click", () => {
    state.updateFilter = button.dataset.updateFilter;
    renderUpdates();
  }));
  els.addAllToCalendar.addEventListener("click", () => downloadIcs(upcomingSessions(), "all-sessions.ics"));
  els.schedule.addEventListener("click", event => {
    const button = event.target.closest("[data-ics]");
    if (!button) return;
    const item = state.schedule.find(entry => entry.id === button.dataset.ics);
    if (item) downloadIcs([item], "session.ics");
  });
  els.updateForm.addEventListener("submit", saveUpdate);
  els.cancelUpdateEdit.addEventListener("click", clearUpdateForm);
  els.programForm.addEventListener("submit", saveProgram);
  els.cancelProgramEdit.addEventListener("click", clearProgramForm);
  els.lessonForm.addEventListener("submit", saveLesson);
  els.cancelLessonEdit.addEventListener("click", clearLessonForm);
  els.closeLessonsAdmin.addEventListener("click", () => {
    state.adminProgramId = null;
    els.lessonsAdmin.classList.add("hidden");
  });
  els.programCover.addEventListener("change", () => uploadProgramCover());
  els.lessonResourceFile.addEventListener("change", () => uploadLessonResource());
  els.trainingBack.addEventListener("click", () => {
    state.selectedProgramId = null;
    renderTraining();
  });
  els.programCertificate.addEventListener("click", openCertificate);
  els.copyMeetingLink.addEventListener("click", copyMeetingLink);
  els.enableReminder.addEventListener("click", enableMeetingReminder);
  els.submitAnswers.addEventListener("click", submitAnswers);
  els.meetingForm.addEventListener("submit", saveMeeting);
  els.clearMeeting.addEventListener("click", clearMeeting);
  els.scheduleForm.addEventListener("submit", saveScheduleItem);
  els.cancelScheduleEdit.addEventListener("click", clearScheduleForm);
  els.personForm.addEventListener("submit", savePerson);
  els.cancelPersonEdit.addEventListener("click", clearPersonForm);
  els.questionForm.addEventListener("submit", saveQuestion);
  els.cancelQuestionEdit.addEventListener("click", clearQuestionForm);
  els.userForm.addEventListener("submit", saveProfileFromAdmin);
  els.cancelUserEdit.addEventListener("click", clearUserForm);
  els.profileForm.addEventListener("submit", saveMyProfile);
  els.appearanceForm.addEventListener("submit", saveAppearance);
  els.resetAppearance.addEventListener("click", resetAppearance);
  els.thankYouForm.addEventListener("submit", event => {
    event.preventDefault();
    renderThankYouCards();
  });
  els.liveMessageForm.addEventListener("submit", sendLiveMessage);
  els.raiseHandBtn.addEventListener("click", raiseHand);
  els.userMicToggle.addEventListener("click", () => setLocalMedia({ mic: !localMedia.mic, camera: localMedia.camera }));
  els.userCameraToggle.addEventListener("click", () => setLocalMedia({ mic: localMedia.mic, camera: !localMedia.camera }));
  els.stopMediaBtn.addEventListener("click", () => {
    stopLocalMedia();
    renderMediaControls();
  });
  els.closeSlides.addEventListener("click", () => {
    els.slideViewerPanel.classList.add("hidden");
    els.slideFrame.removeAttribute("src");
  });
  els.presentingToggle.addEventListener("click", () => {
    presenterMode.presenting = !presenterMode.presenting;
    renderPresentingMode();
  });
  els.presenterMicToggle.addEventListener("click", () => {
    presenterMode.mic = !presenterMode.mic;
    renderPresentingMode();
  });
  els.presenterCameraToggle.addEventListener("click", () => {
    presenterMode.camera = !presenterMode.camera;
    renderPresentingMode();
  });
  els.presenterBackground.addEventListener("change", () => {
    presenterMode.background = els.presenterBackground.value;
    renderPresentingMode();
  });

  document.querySelectorAll("[data-admin-section]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-section]").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(section => section.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.adminSection).classList.remove("hidden");
    });
  });

  els.adminLandingHeroImage.addEventListener("change", () => uploadLandingHero());
  els.personPhoto.addEventListener("change", () => uploadPersonPhoto());
  els.profilePhoto.addEventListener("change", () => uploadProfilePhoto());
  els.userPhoto.addEventListener("change", () => uploadUserPhoto());
  els.scheduleRecordingFile.addEventListener("change", () => uploadScheduleRecording());
  els.scheduleSlidesFile.addEventListener("change", () => uploadScheduleSlides());
  els.addLandingMetric.addEventListener("click", () => {
    state.settings.landing.metrics = readLandingMetricsFromAdmin();
    state.settings.landing.cards = readLandingCardsFromAdmin();
    state.settings.landing.metrics.push({ value: "New", label: "Small box" });
    renderLanding();
  });
  els.clearLandingMetrics.addEventListener("click", () => {
    state.settings.landing.metrics = [];
    renderLanding();
  });
  els.addLandingCard.addEventListener("click", () => {
    state.settings.landing.metrics = readLandingMetricsFromAdmin();
    state.settings.landing.cards = readLandingCardsFromAdmin();
    state.settings.landing.cards.push({ title: "New card", text: "Write the card text here." });
    renderLanding();
  });
  els.clearLandingCards.addEventListener("click", () => {
    state.settings.landing.cards = [];
    renderLanding();
  });
  els.landingMetricsAdminList.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-landing-metric]");
    if (!button) return;
    state.settings.landing.metrics = readLandingMetricsFromAdmin();
    state.settings.landing.metrics.splice(Number(button.dataset.removeLandingMetric), 1);
    renderLanding();
  });
  els.landingCardsAdminList.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-landing-card]");
    if (!button) return;
    state.settings.landing.cards = readLandingCardsFromAdmin();
    state.settings.landing.cards.splice(Number(button.dataset.removeLandingCard), 1);
    renderLanding();
  });
  els.landingForm.addEventListener("submit", saveLanding);
  els.clearLandingHeroImage.addEventListener("click", () => {
    if (window.confirm("Remove all home page pictures?")) setHeroImages([]);
  });
  els.heroImagesAdmin.addEventListener("click", event => {
    const remove = event.target.closest("[data-hero-remove]");
    const move = event.target.closest("[data-hero-move]");
    const images = [...heroImagesOf(state.settings.landing)];
    if (remove) {
      images.splice(Number(remove.dataset.heroRemove), 1);
      setHeroImages(images);
    } else if (move) {
      const from = Number(move.dataset.heroMove);
      const to = from + Number(move.dataset.dir);
      if (to < 0 || to >= images.length) return;
      [images[from], images[to]] = [images[to], images[from]];
      setHeroImages(images);
    }
  });
  els.heroPrev.addEventListener("click", event => {
    event.stopPropagation();
    showHeroSlide(heroIndex - 1);
    restartHeroTimer();
  });
  els.heroNext.addEventListener("click", event => {
    event.stopPropagation();
    showHeroSlide(heroIndex + 1);
    restartHeroTimer();
  });
  els.heroDots.addEventListener("click", event => {
    const dot = event.target.closest("[data-hero-dot]");
    if (!dot) return;
    event.stopPropagation();
    showHeroSlide(Number(dot.dataset.heroDot));
    restartHeroTimer();
  });
  els.heroSlides.addEventListener("click", event => {
    if (designer.active) return;
    const img = event.target.closest(".hero-slide")?.querySelector("img");
    if (img) openLightbox(img.src, img.alt);
  });
  els.heroSlider.addEventListener("mouseenter", () => { heroPaused = true; });
  els.heroSlider.addEventListener("mouseleave", () => { heroPaused = false; });
  els.lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !els.lightbox.classList.contains("hidden")) closeLightbox();
  });
  bindDesigner();
  els.forgotLink.addEventListener("click", () => showAuthPanel("forgot"));
  els.forgotForm.addEventListener("submit", sendResetLink);
  els.resetForm.addEventListener("submit", saveNewPassword);
  els.newUpdateBtn.addEventListener("click", () => {
    clearUpdateForm();
    openAdminSection("updatesAdmin", els.updateTitle);
  });
  els.newProgramBtn.addEventListener("click", () => {
    clearProgramForm();
    openAdminSection("trainingAdmin", els.programTitleInput);
  });
  els.presenterSlidesList.addEventListener("click", presenterSlidesClick);
  els.presenterSlidesList.addEventListener("change", presenterSlidesFileChange);
}

async function signIn(event) {
  event.preventDefault();
  const identifier = els.username.value.trim();
  const password = els.password.value;
  let email = identifier;

  if (!identifier.includes("@")) {
    email = await lookupEmailForUsername(identifier);
    if (!email) {
      showToast(t("No account found for that username."));
      return;
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showToast(error.message);
    return;
  }
  await hydrateSession(data.user);
}

async function hydrateSession(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    await supabase.auth.signOut();
    showToast(t("Your account does not have a profile yet. Please contact the organizers."));
    return;
  }

  const status = profile.status || "approved";
  if (status !== "approved") {
    await supabase.auth.signOut();
    showPendingNotice(status);
    return;
  }

  currentUser = normalizeProfile(profile);
  els.password.value = "";
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.adminTab.classList.toggle("hidden", currentUser.role !== "admin");
  els.newUpdateBtn.classList.toggle("hidden", currentUser.role !== "admin");
  els.newProgramBtn.classList.toggle("hidden", currentUser.role !== "admin");
  els.presenterTab.classList.toggle("hidden", currentUser.role !== "presenter");
  await loadSharedData();
  subscribeToSharedData();
  renderAll();
  if (currentUser.role === "presenter") showPresenter();
  else showReport();
}

async function signOut() {
  stopLocalMedia();
  await supabase.auth.signOut();
  currentUser = null;
  draftAnswers = {};
  state.selectedProgramId = null;
  state.adminProgramId = null;
  els.appView.classList.add("hidden");
  els.loginView.classList.remove("hidden");
  els.password.value = "";
}

async function loadSharedData() {
  const [
    settingsResult,
    usersResult,
    schedulesResult,
    peopleResult,
    questionsResult,
    answersResult,
    announcementsResult,
    messagesResult,
    handRaisesResult,
    mediaResult
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", true).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("schedules").select("*").order("date").order("start_time"),
    supabase.from("people").select("*").order("type").order("name"),
    supabase.from("questions").select("*").eq("active", true).order("sort_order"),
    supabase.from("answers").select("*, profiles(full_name, username), questions(text)").order("submitted_at", { ascending: false }),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("live_messages").select("*, profiles(full_name, role)").order("created_at", { ascending: false }).limit(100),
    supabase.from("hand_raises").select("*, profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("media_controls").select("*")
  ]);

  for (const result of [settingsResult, usersResult, schedulesResult, peopleResult, questionsResult, answersResult, announcementsResult, messagesResult, handRaisesResult, mediaResult]) {
    if (result.error) throw result.error;
  }

  state.settings = {
    landing: normalizeLanding(settingsResult.data?.landing || defaults.landing),
    meeting: { ...defaults.meeting, ...(settingsResult.data?.meeting || {}) },
    appearance: { ...defaults.appearance, ...(settingsResult.data?.appearance || {}) }
  };
  applyLandingHeroImage(state.settings.landing);
  state.users = (usersResult.data || []).map(normalizeProfile);
  state.schedule = (schedulesResult.data || []).map(normalizeSchedule);
  state.people = (peopleResult.data || []).map(normalizePerson);
  state.questions = (questionsResult.data || []).map(normalizeQuestion);
  state.answers = answersResult.data || [];
  state.announcements = announcementsResult.data || [];
  state.liveMessages = messagesResult.data || [];
  state.handRaises = handRaisesResult.data || [];
  state.mediaControls = mediaResult.data || [];
  await loadExtraData();
}

let subscribed = false;
let realtimeTimer = null;
function scheduleRealtimeRefresh() {
  // Many rows can change at once; refresh once per burst.
  window.clearTimeout(realtimeTimer);
  realtimeTimer = window.setTimeout(async () => {
    if (!currentUser) return;
    const previousIds = new Set(state.announcements.map(item => item.id));
    try {
      await loadSharedData();
    } catch (error) {
      console.warn(error);
      return;
    }
    renderAll();
    notifyNewUpdates(previousIds);
  }, 400);
}
function subscribeToSharedData() {
  if (subscribed) return;
  subscribed = true;
  supabase
    .channel("nephrorounds-shared-data")
    .on("postgres_changes", { event: "*", schema: "public" }, scheduleRealtimeRefresh)
    .subscribe();
}

function renderAll() {
  applyAppearance();
  if (!designer.active) renderLanding();
  renderMeeting();
  renderReminderStatus();
  renderSchedule();
  renderPeople();
  renderQuestions();
  renderLiveRoom();
  renderMediaControls();
  renderPresenterSlides();
  renderPresentingMode();
  renderUserShell();
  renderNextSession();
  renderPinnedUpdates();
  renderUpdatesBadge();
  if (!els.updatesView.classList.contains("hidden")) renderUpdates();
  if (!els.trainingView.classList.contains("hidden")) renderTraining();
  renderAdmin();
}

function applyAppearance() {
  const appearance = { ...defaults.appearance, ...state.settings.appearance };
  document.documentElement.style.setProperty("--schedule-card-min-height", `${appearance.scheduleHeight}px`);
  document.documentElement.style.setProperty("--hero-image-height", `${appearance.heroHeight}px`);
  document.documentElement.style.setProperty("--avatar-size", `${appearance.avatarSize}px`);
  document.documentElement.style.setProperty("--panel-padding", `${appearance.panelPadding}px`);
  document.documentElement.style.setProperty("--brand-justify", getBrandJustify(appearance.brandAlign));
  els.appearanceScheduleHeight.value = appearance.scheduleHeight;
  els.appearanceHeroHeight.value = appearance.heroHeight;
  els.appearanceAvatarSize.value = appearance.avatarSize;
  els.appearancePanelPadding.value = appearance.panelPadding;
  els.appearanceBrandAlign.value = appearance.brandAlign || "left";
}

function renderLanding() {
  const landing = normalizeLanding(state.settings.landing || defaults.landing);
  state.settings.landing = landing;
  renderLandingView(landing);
  applyLandingDesign(landing);
  els.adminLandingBrandName.value = landing.brandName || "";
  els.adminLandingBrandTagline.value = landing.brandTagline || "";
  els.adminLandingLoginHeadline.value = landing.loginHeadline || "";
  els.adminLandingLoginLead.value = landing.loginLead || "";
  els.adminLandingHeroBadge.value = landing.heroBadge || "";
  els.adminLandingHeroHeadline.value = landing.heroHeadline || "";
  els.adminLandingCopyright.value = landing.copyright ?? defaultCopyright(landing);
  els.landingHeroImageData.value = landing.heroImage || "";
  renderHeroImagesAdmin(landing);
  renderLandingMetricsAdmin(landing.metrics);
  renderLandingCardsAdmin(landing.cards);
}

function renderLandingView(landing) {
  els.landingBrandName.textContent = landing.brandName || "";
  document.title = landing.brandName || "NephroRounds Studio";
  els.appShellName.textContent = landing.brandName || "NephroRounds";
  els.landingBrandTagline.textContent = landing.brandTagline || "";
  els.landingLoginHeadline.textContent = landing.loginHeadline || "";
  els.landingLoginLead.textContent = landing.loginLead || "";
  els.landingHeroBadge.textContent = landing.heroBadge || "";
  els.landingHeroHeadline.textContent = landing.heroHeadline || "";
  els.landingMetrics.innerHTML = landing.metrics.map((item, i) => `<div class="metric" data-edit-box="metric:${i}"><b data-edit-key="metric:${i}:value" dir="auto">${escapeHtml(item.value)}</b><span data-edit-key="metric:${i}:label" dir="auto">${escapeHtml(item.label)}</span></div>`).join("");
  els.landingMetrics.classList.toggle("hidden", landing.metrics.length === 0);
  els.landingCards.innerHTML = landing.cards.map((item, i) => `<div class="mini-card" data-edit-box="card:${i}"><strong data-edit-key="card:${i}:title" dir="auto">${escapeHtml(item.title)}</strong><p class="hint" data-edit-key="card:${i}:text" dir="auto">${escapeHtml(item.text)}</p></div>`).join("");
  els.landingCards.classList.toggle("hidden", landing.cards.length === 0);
  applyLandingHeroImage(landing);
}

function applyLandingHeroImage(landing) {
  renderHeroSlider(landing);
}

function renderLandingMetricsAdmin(metrics) {
  els.landingMetricsAdminList.innerHTML = metrics.length
    ? metrics.map((item, index) => `
      <article class="editable-row">
        <div class="form-grid">
          <div class="field"><label>Big text</label><input data-landing-metric-value="${index}" value="${escapeHtml(item.value)}"></div>
          <div class="field"><label>Small text</label><input data-landing-metric-label="${index}" value="${escapeHtml(item.label)}"></div>
        </div>
        <div class="row-actions"><button class="btn warn small" type="button" data-remove-landing-metric="${index}">${t("Remove")}</button></div>
      </article>`).join("")
    : `<div class="empty-state">${t("No small boxes. Click Add small box if you want one.")}</div>`;
}

function renderLandingCardsAdmin(cards) {
  els.landingCardsAdminList.innerHTML = cards.length
    ? cards.map((item, index) => `
      <article class="editable-row">
        <div class="form-grid">
          <div class="field"><label>Card title</label><input data-landing-card-title="${index}" value="${escapeHtml(item.title)}"></div>
          <div class="field"><label>Card text</label><input data-landing-card-text="${index}" value="${escapeHtml(item.text)}"></div>
        </div>
        <div class="row-actions"><button class="btn warn small" type="button" data-remove-landing-card="${index}">${t("Remove")}</button></div>
      </article>`).join("")
    : `<div class="empty-state">${t("No right-side cards. Click Add card if you want one.")}</div>`;
}

function renderMeeting() {
  const meeting = state.settings.meeting;
  els.reportHeading.textContent = meeting.reportHeading || t("Morning Report");
  els.reportSubheading.textContent = meeting.reportSubheading || "";
  els.meetingTitle.textContent = meeting.title || t("Meeting details");
  els.meetingMeta.textContent = meeting.time || "";
  els.meetingNotes.textContent = meeting.notes || "";
  els.meetingLink.href = meeting.url || "#";
  els.meetingCard.classList.toggle("hidden", meeting.enabled === false);
  els.meetingLink.classList.toggle("hidden", !meeting.url);
  els.copyMeetingLink.classList.toggle("hidden", !meeting.url);
  els.adminReportHeading.value = meeting.reportHeading || "";
  els.adminReportSubheading.value = meeting.reportSubheading || "";
  els.adminMeetingTitle.value = meeting.title || "";
  els.adminMeetingTime.value = meeting.time || "";
  els.adminMeetingUrl.value = meeting.url || "";
  els.adminMeetingNotes.value = meeting.notes || "";
}

function renderReminderStatus() {
  const next = getNextSession();
  const start = next ? sessionStart(next) : getMeetingStartDate();
  els.notificationTitle.textContent = t("Session reminders");
  if (!start) {
    els.notificationText.textContent = t("Reminders will be available once the next session is on the schedule.");
    return;
  }
  const minutes = Math.round((start.getTime() - Date.now()) / 60000);
  if (minutes < 0) {
    els.notificationTitle.textContent = t("Session in progress");
    els.notificationText.textContent = t("Join video to take part now.");
  } else if (minutes <= 15) {
    els.notificationTitle.textContent = t("Starting soon");
    els.notificationText.textContent = `The next session starts in about ${minutes} minutes. Join video when ready.`;
  } else {
    els.notificationText.textContent = t("Add sessions to your phone or computer calendar to get a reminder the day before and 15 minutes before each one.");
  }
}

function renderSchedule() {
  if (!state.schedule.length) {
    els.schedule.innerHTML = `<div class="empty-state">${t("No schedule items yet.")}</div>`;
    return;
  }
  els.schedule.innerHTML = state.schedule.map(item => `
    <article class="schedule-item">
      <strong>${escapeHtml(item.topic)}</strong>
      <time>${formatScheduleDate(item.date)}<br>${escapeHtml(formatTimeRange(item))}</time>
      ${notesToTasks(item.notes)}
      ${renderSlidesButton(item)}
      ${renderRecordingButton(item)}
      ${sessionEnd(item) && sessionEnd(item).getTime() > Date.now() ? calendarButtons(item) : ""}
    </article>`).join("");
  els.schedule.querySelectorAll("[data-view-slides]").forEach(button => {
    button.addEventListener("click", () => openSlides(button.dataset.viewSlides));
  });
}

function renderPeople() {
  const presenters = state.people.filter(person => person.type === "presenter");
  const guests = state.people.filter(person => person.type === "guest");
  els.presenters.innerHTML = presenters.length ? presenters.map(renderPersonCard).join("") : `<div class="empty-state">${t("No presenters yet.")}</div>`;
  els.guests.innerHTML = guests.length ? guests.map(renderPersonCard).join("") : `<div class="empty-state">${t("No guests yet.")}</div>`;
}

function renderPersonCard(person) {
  return `<article class="person-card">${renderAvatar(person)}<div><h4>${escapeHtml(person.name)}</h4><div class="meta">${escapeHtml(person.role)}<br>${escapeHtml(person.institution)}${person.location ? `<br>${escapeHtml(person.location)}` : ""}</div><p class="hint">${escapeHtml(person.introduction || "")}</p></div></article>`;
}

function renderQuestions() {
  els.questions.innerHTML = "";
  const myAnswers = state.answers.filter(answer => answer.user_id === currentUser?.id);
  const locked = myAnswers.length > 0;
  els.lockedLabel.classList.toggle("hidden", !locked);
  els.submitAnswers.disabled = locked || state.questions.length === 0;
  els.submitAnswers.textContent = locked ? t("Answers submitted") : t("Submit answers");
  els.submitState.textContent = locked ? t("Submitted") : t("Awaiting response");
  if (!state.questions.length) {
    els.questions.innerHTML = `<div class="empty-state">${t("No questions have been added for this round.")}</div>`;
    return;
  }
  state.questions.forEach((question, index) => {
    const saved = myAnswers.find(answer => answer.question_id === question.id);
    const answer = saved ? { choice: saved.choice, reason: saved.reason } : normalizeAnswer(draftAnswers[question.id]);
    const node = document.createElement("article");
    node.className = "question";
    node.innerHTML = `
      <div class="split-title"><strong>${index + 1}. ${escapeHtml(question.text)}</strong>${saved ? `<span class="pill">Locked</span>` : ""}</div>
      <div class="options">${question.options.map(option => `<button class="option ${answer.choice === option ? "selected" : ""}" type="button" ${saved ? "disabled" : ""} data-question="${question.id}" data-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>
      <div class="reason-box"><label for="reason-${question.id}">${t("Reason for your choice")}</label>${saved ? `<div class="locked-reason">${escapeHtml(answer.reason || t("No reason provided"))}</div>` : `<textarea id="reason-${question.id}" data-reason-question="${question.id}" placeholder="${t("Briefly explain why you selected this answer.")}">${escapeHtml(answer.reason || "")}</textarea>`}</div>`;
    els.questions.append(node);
  });
  els.questions.querySelectorAll(".option").forEach(button => {
    button.addEventListener("click", () => {
      const existing = normalizeAnswer(draftAnswers[button.dataset.question]);
      draftAnswers[button.dataset.question] = { ...existing, choice: button.dataset.option };
      renderQuestions();
    });
  });
  els.questions.querySelectorAll("[data-reason-question]").forEach(textarea => {
    textarea.addEventListener("input", () => {
      const existing = normalizeAnswer(draftAnswers[textarea.dataset.reasonQuestion]);
      draftAnswers[textarea.dataset.reasonQuestion] = { ...existing, reason: textarea.value };
    });
  });
}

function renderLiveRoom() {
  els.liveMessages.innerHTML = state.liveMessages.length
    ? state.liveMessages.map(message => `<article class="chat-message"><strong>${escapeHtml(message.profiles?.full_name || t("Participant"))} <span class="hint">| ${escapeHtml(formatDate(message.created_at))}</span></strong><div>${escapeHtml(message.body)}</div></article>`).join("")
    : `<div class="empty-state">${t("No live questions yet.")}</div>`;
  const request = state.handRaises.find(item => item.user_id === currentUser?.id);
  if (!request) {
    els.handRaiseStatus.textContent = t("No request");
    els.raiseHandBtn.disabled = false;
    els.raiseHandBtn.textContent = t("Request to speak");
  } else if (request.status === "pending") {
    els.handRaiseStatus.textContent = t("Waiting for approval");
    els.raiseHandBtn.disabled = true;
    els.raiseHandBtn.textContent = t("Request pending");
  } else {
    els.handRaiseStatus.textContent = request.status === "approved" ? t("Approved to speak") : t("Request declined");
    els.raiseHandBtn.disabled = false;
    els.raiseHandBtn.textContent = t("Request again");
  }
}

function renderMediaControls() {
  if (!currentUser) return;
  const controls = getMediaControl(currentUser.id);
  const micBlocked = controls.mic_allowed === false;
  const cameraBlocked = controls.camera_allowed === false;
  if (micBlocked && localMedia.mic) stopLocalMedia({ micOnly: true });
  if (cameraBlocked && localMedia.camera) stopLocalMedia({ cameraOnly: true });
  els.userMicToggle.disabled = micBlocked;
  els.userCameraToggle.disabled = cameraBlocked;
  els.userMicToggle.textContent = micBlocked ? t("Mic muted by admin") : localMedia.mic ? t("Turn mic off") : t("Turn mic on");
  els.userCameraToggle.textContent = cameraBlocked ? t("Camera blocked by admin") : localMedia.camera ? t("Turn camera off") : t("Turn camera on");
  els.mediaAccessLabel.textContent = micBlocked || cameraBlocked ? t("Admin controlled") : t("Ready");
  els.mediaStatus.textContent = localMedia.status.split(" | ").map(part => t(part)).join(" | ");
  els.localMediaPreview.classList.toggle("hidden", !localMedia.camera);
}

function renderPresenterSlides() {
  if (!currentUser || currentUser.role !== "presenter") return;
  if (!state.schedule.length) {
    els.presenterSlidesList.innerHTML = `<div class="empty-state">${t("No sessions have been scheduled yet.")}</div>`;
    return;
  }
  els.presenterSlidesList.innerHTML = state.schedule.map(item => `
    <article class="editable-row">
      <div>
        <strong>${escapeHtml(item.topic)}</strong>
        <p class="hint">${formatScheduleDate(item.date)} | ${escapeHtml(formatTimeRange(item))}<br>${item.slidesUrl || item.slidesData ? "Slides attached" : "No slides attached yet"}</p>
        <div class="form-grid" style="margin-top: 10px;">
          <div class="field"><label>Slides link</label><input data-presenter-slide-url="${item.id}" type="url" value="${escapeHtml(item.slidesUrl || "")}" placeholder="PDF, Google Drive, OneDrive, Box..."></div>
          <div class="field"><label>Upload slides</label><input data-presenter-slide-file="${item.id}" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"></div>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn secondary small" type="button" data-presenter-save-slides="${item.id}">Save link</button>
        ${item.slidesUrl || item.slidesData ? `<button class="btn small" type="button" data-view-slides="${item.id}">View slides</button>` : ""}
      </div>
    </article>`).join("");
  els.presenterSlidesList.querySelectorAll("[data-view-slides]").forEach(button => {
    button.addEventListener("click", () => {
      showReport();
      openSlides(button.dataset.viewSlides);
    });
  });
}

function renderPresentingMode() {
  if (!els.presentingStatus) return;
  els.presentingStatus.textContent = presenterMode.presenting ? t("Live presenting") : t("Not presenting");
  els.presentingToggle.textContent = presenterMode.presenting ? t("Stop presenting") : t("Start presenting");
  els.presenterMicToggle.textContent = presenterMode.mic ? t("Mic on") : t("Mic off");
  els.presenterCameraToggle.textContent = presenterMode.camera ? t("Camera on") : t("Camera off");
  els.presenterBackground.value = presenterMode.background;
  els.presenterPreview.classList.toggle("blur-bg", presenterMode.background === "blur");
  els.presenterPreview.classList.toggle("kidney-bg", presenterMode.background === "kidney");
  els.presenterPreview.classList.toggle("conference-bg", presenterMode.background === "conference");
  els.presenterPreviewText.textContent = presenterMode.camera ? `${currentUser?.name || t("Presenter")} camera preview` : t("Camera preview off");
}

function renderAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;
  renderScheduleAdmin();
  renderPeopleAdmin();
  renderQuestionsAdmin();
  renderUsersAdmin();
  renderLiveRoomAdmin();
  renderThankYouAdmin();
  renderAnswers();
  renderUpdatesAdmin();
  renderTrainingAdmin();
}

function renderUserShell() {
  if (!currentUser) return;
  els.profileName.textContent = currentUser.name;
  els.profileRole.textContent = [getRoleLabel(currentUser.role), currentUser.discipline, currentUser.university].filter(Boolean).join(" | ");
}

function renderProfile() {
  if (!currentUser) return;
  els.profileFullName.value = currentUser.name || "";
  els.profileUsernameInput.value = currentUser.username || "";
  els.profilePasswordInput.value = "";
  els.profileEmail.value = currentUser.email || "";
  els.profileDiscipline.value = currentUser.discipline || "";
  els.profileUniversity.value = currentUser.university || "";
  els.profileLocation.value = currentUser.location || "";
  els.profileBio.value = currentUser.bio || "";
  els.profilePhotoData.value = currentUser.photo || "";
  els.profilePhoto.value = "";
}

function renderScheduleAdmin() {
  els.scheduleAdminList.innerHTML = state.schedule.length ? state.schedule.map(item => `
    <article class="editable-row"><div><strong>${escapeHtml(item.topic)}</strong><p class="hint">${formatScheduleDate(item.date)} | ${escapeHtml(formatTimeRange(item))}<br>${escapeHtml(item.notes || "")}${item.slidesUrl || item.slidesData ? "<br>Slides attached" : ""}${item.recordingUrl || item.recordingData ? "<br>Recording attached" : ""}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-schedule="${item.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-schedule="${item.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("No schedule items yet.")}</div>`;
  els.scheduleAdminList.querySelectorAll("[data-edit-schedule]").forEach(button => button.addEventListener("click", () => editSchedule(button.dataset.editSchedule)));
  els.scheduleAdminList.querySelectorAll("[data-remove-schedule]").forEach(button => button.addEventListener("click", () => deleteRow("schedules", button.dataset.removeSchedule)));
}

function renderPeopleAdmin() {
  els.peopleAdminList.innerHTML = state.people.length ? state.people.map(person => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(person)}<div><strong>${escapeHtml(person.name)}</strong><p class="hint">${escapeHtml(person.type)} | ${escapeHtml(person.role)}<br>${escapeHtml(person.institution)}${person.location ? ` | ${escapeHtml(person.location)}` : ""}<br>${escapeHtml(person.introduction || "")}</p></div></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-person="${person.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-person="${person.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("No people yet.")}</div>`;
  els.peopleAdminList.querySelectorAll("[data-edit-person]").forEach(button => button.addEventListener("click", () => editPerson(button.dataset.editPerson)));
  els.peopleAdminList.querySelectorAll("[data-remove-person]").forEach(button => button.addEventListener("click", () => deleteRow("people", button.dataset.removePerson)));
}

function renderQuestionsAdmin() {
  els.questionsAdminList.innerHTML = state.questions.length ? state.questions.map(question => `
    <article class="editable-row"><div><strong>${escapeHtml(question.text)}</strong><p class="hint">${question.options.map(escapeHtml).join(", ")}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-question="${question.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-question="${question.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("No questions yet.")}</div>`;
  els.questionsAdminList.querySelectorAll("[data-edit-question]").forEach(button => button.addEventListener("click", () => editQuestion(button.dataset.editQuestion)));
  els.questionsAdminList.querySelectorAll("[data-remove-question]").forEach(button => button.addEventListener("click", () => deleteRow("questions", button.dataset.removeQuestion)));
}

function renderUsersAdmin() {
  const pending = state.users.filter(user => user.status === "pending");
  els.pendingCount.textContent = String(pending.length);
  els.pendingUsersList.innerHTML = pending.length ? pending.map(user => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><p class="hint">Username: ${escapeHtml(user.username)}<br>Email: ${escapeHtml(user.email || "No email")}<br>${escapeHtml(user.discipline || "")}${user.university ? ` | ${escapeHtml(user.university)}` : ""}</p></div></div><div class="row-actions">
      <select data-approve-role="${user.id}" aria-label="${t("Access level")}"><option value="user">${t("Clinician / attendee")}</option><option value="presenter">${t("Presenter / speaker")}</option><option value="admin">${t("Admin / panelist")}</option></select>
      <button class="btn small" type="button" data-approve-user="${user.id}">${t("Approve")}</button>
      <button class="btn warn small" type="button" data-reject-user="${user.id}">${t("Reject")}</button>
    </div></article>`).join("") : `<div class="empty-state">${t("No one is waiting for approval.")}</div>`;
  els.pendingUsersList.querySelectorAll("[data-approve-user]").forEach(button => button.addEventListener("click", () => {
    const role = els.pendingUsersList.querySelector(`[data-approve-role="${button.dataset.approveUser}"]`)?.value || "user";
    setUserAccess(button.dataset.approveUser, "approved", role);
  }));
  els.pendingUsersList.querySelectorAll("[data-reject-user]").forEach(button => button.addEventListener("click", () => setUserAccess(button.dataset.rejectUser, "rejected")));

  const others = state.users.filter(user => user.status !== "pending");
  els.usersAdminList.innerHTML = others.length ? others.map(user => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><p class="hint">Username: ${escapeHtml(user.username)}<br>Email: ${escapeHtml(user.email || "No email")}<br>Access: ${escapeHtml(getRoleLabel(user.role))}${user.status === "rejected" ? " (blocked)" : ""}<br>${escapeHtml(user.discipline || "")}${user.university ? ` | ${escapeHtml(user.university)}` : ""}</p></div></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-user="${user.id}">${t("Edit profile")}</button></div></article>`).join("") : `<div class="empty-state">${t("No users yet.")}</div>`;
  els.usersAdminList.querySelectorAll("[data-edit-user]").forEach(button => button.addEventListener("click", () => editUser(button.dataset.editUser)));
}

async function setUserAccess(id, status, role) {
  if (id === currentUser?.id) return showToast(t("You cannot change your own access."));
  const payload = { status };
  if (role) payload.role = role;
  const { error } = await supabase.from("profiles").update(payload).eq("id", id);
  if (error) return showToast(error.message);
  await loadSharedData();
  renderAll();
  showToast(status === "approved" ? t("Account approved.") : t("Account rejected."));
}

function renderLiveRoomAdmin() {
  const mediaUsers = state.users.filter(user => user.role !== "admin");
  els.liveRoomAdminList.innerHTML = `
    <article class="editable-row"><div><strong>Hand-raise requests</strong><p class="hint">${state.handRaises.filter(item => item.status === "pending").length} waiting for approval</p></div><button class="btn secondary small" type="button" data-clear-live-room="all">${t("Clear live room")}</button></article>
    ${state.handRaises.length ? state.handRaises.map(request => `<article class="editable-row"><div><strong>${escapeHtml(request.profiles?.full_name || t("Participant"))}</strong><p class="hint">Status: ${escapeHtml(request.status)} | ${escapeHtml(formatDate(request.created_at))}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-hand-raise="${request.id}" data-hand-status="approved">${t("Approve")}</button><button class="btn warn small" type="button" data-hand-raise="${request.id}" data-hand-status="declined">${t("Decline")}</button></div></article>`).join("") : `<div class="empty-state">${t("No hand-raise requests yet.")}</div>`}
    <article class="editable-row"><div><strong>Live questions</strong><p class="hint">${state.liveMessages.length} question${state.liveMessages.length === 1 ? "" : "s"} received</p></div></article>
    ${state.liveMessages.length ? state.liveMessages.map(message => `<article class="chat-message"><strong>${escapeHtml(message.profiles?.full_name || t("Participant"))} <span class="hint">| ${escapeHtml(formatDate(message.created_at))}</span></strong><div>${escapeHtml(message.body)}</div></article>`).join("") : `<div class="empty-state">${t("No live questions yet.")}</div>`}
    <article class="editable-row"><div><strong>Participant audio/video permissions</strong><p class="hint">Allow, mute, or block camera for participants and presenters.</p></div></article>
    ${mediaUsers.map(user => {
      const controls = getMediaControl(user.id);
      return `<article class="editable-row"><div><strong>${escapeHtml(user.name)}</strong><p class="hint">${escapeHtml(getRoleLabel(user.role))}<br>Mic: ${controls.mic_allowed === false ? "Muted by admin" : "Allowed"} | Camera: ${controls.camera_allowed === false ? "Blocked by admin" : "Allowed"}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-media-user="${user.id}" data-media-control="mic">${controls.mic_allowed === false ? "Allow mic" : "Mute mic"}</button><button class="btn secondary small" type="button" data-media-user="${user.id}" data-media-control="camera">${controls.camera_allowed === false ? "Allow camera" : "Block camera"}</button></div></article>`;
    }).join("")}`;
  els.liveRoomAdminList.querySelectorAll("[data-hand-raise]").forEach(button => button.addEventListener("click", () => updateHandRaise(button.dataset.handRaise, button.dataset.handStatus)));
  els.liveRoomAdminList.querySelectorAll("[data-media-user]").forEach(button => button.addEventListener("click", () => toggleMediaPermission(button.dataset.mediaUser, button.dataset.mediaControl)));
  els.liveRoomAdminList.querySelectorAll("[data-clear-live-room]").forEach(button => button.addEventListener("click", clearLiveRoom));
}

function renderThankYouAdmin() {
  const currentValue = els.thankYouSession.value;
  els.thankYouSession.innerHTML = state.schedule.length ? state.schedule.map(item => `<option value="${item.id}">${escapeHtml(item.topic)} - ${formatScheduleDate(item.date)}</option>`).join("") : `<option value="">No sessions yet</option>`;
  if (currentValue && state.schedule.some(item => item.id === currentValue)) els.thankYouSession.value = currentValue;
  if (!els.thankYouList.innerHTML.trim()) renderThankYouCards();
}

function renderThankYouCards() {
  const session = state.schedule.find(item => item.id === els.thankYouSession.value) || state.schedule[0];
  if (!session) {
    els.thankYouList.innerHTML = `<div class="empty-state">${t("Add a schedule item before generating thank-you cards.")}</div>`;
    return;
  }
  const recipients = state.users.filter(user => user.role !== "admin");
  els.thankYouList.innerHTML = recipients.map(user => {
    const body = buildThankYouBody(user, session);
    const mailto = user.email ? `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(els.thankYouSubject.value)}&body=${encodeURIComponent(body)}` : "";
    return `<article class="editable-row"><div><strong>${escapeHtml(user.name)}</strong><p class="hint">${escapeHtml(user.email || "No email saved")}<br>${escapeHtml(body)}</p></div><div class="row-actions">${mailto ? `<a class="btn secondary small" href="${mailto}">Open email</a>` : `<span class="pill">Add email first</span>`}</div></article>`;
  }).join("");
}

function renderAnswers() {
  if (!state.answers.length) {
    els.answersTable.innerHTML = `<div class="empty-state">${t("No responses submitted yet.")}</div>`;
    return;
  }
  const grouped = new Map();
  state.answers.forEach(answer => {
    const key = answer.user_id;
    if (!grouped.has(key)) grouped.set(key, { user: answer.profiles?.full_name || "Participant", submittedAt: answer.submitted_at, answers: [] });
    grouped.get(key).answers.push(answer);
  });
  els.answersTable.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Submitted</th><th>Answers</th></tr></thead><tbody>${[...grouped.values()].map(group => `<tr><td>${escapeHtml(group.user)}</td><td>${formatDate(group.submittedAt)}</td><td>${group.answers.map(answer => `<div><b>${escapeHtml(answer.questions?.text || "Question")}</b><br>Choice: ${escapeHtml(answer.choice)}<br>Reason: ${escapeHtml(answer.reason)}</div>`).join("<br>")}</td></tr>`).join("")}</tbody></table></div>`;
}

async function saveLanding(event) {
  event.preventDefault();
  state.settings.landing = readLandingForm();
  await saveSettings();
}

async function saveMeeting(event) {
  event.preventDefault();
  state.settings.meeting = {
    enabled: true,
    reportHeading: els.adminReportHeading.value.trim(),
    reportSubheading: els.adminReportSubheading.value.trim(),
    title: els.adminMeetingTitle.value.trim(),
    time: els.adminMeetingTime.value.trim(),
    url: els.adminMeetingUrl.value.trim(),
    notes: els.adminMeetingNotes.value.trim()
  };
  await saveSettings();
}

async function clearMeeting() {
  state.settings.meeting = { ...state.settings.meeting, enabled: false, title: "", time: "", url: "", notes: "" };
  await saveSettings();
}

async function saveAppearance(event) {
  event.preventDefault();
  state.settings.appearance = {
    scheduleHeight: clampNumber(els.appearanceScheduleHeight.value, 130, 320, 165),
    heroHeight: clampNumber(els.appearanceHeroHeight.value, 220, 520, 330),
    avatarSize: clampNumber(els.appearanceAvatarSize.value, 56, 110, 74),
    panelPadding: clampNumber(els.appearancePanelPadding.value, 12, 30, 18),
    brandAlign: els.appearanceBrandAlign.value
  };
  await saveSettings();
}

async function resetAppearance() {
  state.settings.appearance = structuredClone(defaults.appearance);
  await saveSettings();
}

async function saveSettings() {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: true, landing: state.settings.landing, meeting: state.settings.meeting, appearance: state.settings.appearance });
  if (error) return showToast(error.message);
  showToast(t("Saved."));
  await loadSharedData();
  renderAll();
}

async function saveScheduleItem(event) {
  event.preventDefault();
  const payload = {
    id: els.scheduleId.value || undefined,
    date: els.scheduleDate.value,
    start_time: els.scheduleTime.value,
    end_time: els.scheduleEndTime.value || null,
    topic: els.scheduleTopic.value.trim(),
    notes: els.scheduleNotes.value.trim(),
    recording_url: els.scheduleRecordingUrl.value.trim(),
    recording_file_url: els.scheduleRecordingData.value || "",
    slides_url: els.scheduleSlidesUrl.value.trim(),
    slides_file_url: els.scheduleSlidesData.value || "",
    slides_name: els.scheduleSlidesName.value || "",
    slides_type: els.scheduleSlidesType.value || "",
    updated_by: currentUser.id,
    created_by: currentUser.id
  };
  const { error } = await supabase.from("schedules").upsert(payload);
  if (error) return showToast(error.message);
  clearScheduleForm();
  await loadSharedData();
  renderAll();
}

async function savePerson(event) {
  event.preventDefault();
  const payload = {
    id: els.personId.value || undefined,
    type: els.personType.value,
    name: els.personName.value.trim(),
    role_title: els.personRole.value.trim(),
    institution: els.personInstitution.value.trim(),
    location: els.personLocation.value.trim(),
    introduction: els.personIntro.value.trim(),
    photo_url: els.personPhotoData.value || "",
    tone: "",
    updated_by: currentUser.id,
    created_by: currentUser.id
  };
  const { error } = await supabase.from("people").upsert(payload);
  if (error) return showToast(error.message);
  clearPersonForm();
  await loadSharedData();
  renderAll();
}

async function saveQuestion(event) {
  event.preventDefault();
  const options = els.questionOptions.value.split(",").map(option => option.trim()).filter(Boolean);
  const payload = {
    id: els.questionId.value || undefined,
    text: els.questionText.value.trim(),
    options: options.length ? options : ["Yes", "No"],
    active: true,
    updated_by: currentUser.id,
    created_by: currentUser.id
  };
  const { error } = await supabase.from("questions").upsert(payload);
  if (error) return showToast(error.message);
  clearQuestionForm();
  await loadSharedData();
  renderAll();
}

async function saveProfileFromAdmin(event) {
  event.preventDefault();
  if (!els.userId.value) {
    showToast(t("Choose a user from the list below to edit. New people create their own account from the home page."));
    return;
  }
  if (els.userId.value === currentUser?.id && (els.userRole.value !== currentUser.role || els.userStatus.value !== "approved")) {
    showToast(t("You cannot change your own access level or status."));
    return;
  }
  const payload = {
    id: els.userId.value,
    username: els.userUsername.value.trim(),
    full_name: els.userFullName.value.trim(),
    email: els.userEmail.value.trim(),
    role: els.userRole.value,
    status: els.userStatus.value,
    discipline: els.userDiscipline.value.trim(),
    university: els.userUniversity.value.trim(),
    location: els.userLocation.value.trim(),
    bio: els.userBio.value.trim(),
    photo_url: els.userPhotoData.value || ""
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", payload.id);
  if (error) return showToast(error.message);
  clearUserForm();
  await loadSharedData();
  renderAll();
}

async function saveMyProfile(event) {
  event.preventDefault();
  const payload = {
    username: els.profileUsernameInput.value.trim(),
    full_name: els.profileFullName.value.trim(),
    email: els.profileEmail.value.trim(),
    discipline: els.profileDiscipline.value.trim(),
    university: els.profileUniversity.value.trim(),
    location: els.profileLocation.value.trim(),
    bio: els.profileBio.value.trim(),
    photo_url: els.profilePhotoData.value || currentUser.photo || ""
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", currentUser.id);
  if (error) return showToast(error.message);
  if (els.profilePasswordInput.value) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: els.profilePasswordInput.value });
    if (passwordError) return showToast(passwordError.message);
  }
  await loadSharedData();
  currentUser = state.users.find(user => user.id === currentUser.id) || currentUser;
  renderAll();
  showToast(t("Profile saved."));
}

async function submitAnswers() {
  if (!currentUser) return;
  const missing = state.questions.some(question => {
    const answer = normalizeAnswer(draftAnswers[question.id]);
    return !answer.choice || !answer.reason.trim();
  });
  if (missing) return showToast(t("Please select an answer and write a reason for every question."));
  const rows = state.questions.map(question => ({
    user_id: currentUser.id,
    question_id: question.id,
    choice: draftAnswers[question.id].choice,
    reason: draftAnswers[question.id].reason
  }));
  const { error } = await supabase.from("answers").insert(rows);
  if (error) return showToast(error.message);
  draftAnswers = {};
  await loadSharedData();
  renderAll();
}

async function sendLiveMessage(event) {
  event.preventDefault();
  const text = els.liveMessageInput.value.trim();
  if (!text) return showToast(t("Write a question first."));
  const { error } = await supabase.from("live_messages").insert({ user_id: currentUser.id, body: text });
  if (error) return showToast(error.message);
  els.liveMessageInput.value = "";
}

async function raiseHand() {
  const { error } = await supabase.from("hand_raises").insert({ user_id: currentUser.id });
  if (error) return showToast(error.message);
}

async function updateHandRaise(id, status) {
  const { error } = await supabase.from("hand_raises").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) return showToast(error.message);
}

async function toggleMediaPermission(userId, control) {
  const controls = getMediaControl(userId);
  const payload = {
    user_id: userId,
    mic_allowed: control === "mic" ? controls.mic_allowed === false : controls.mic_allowed !== false,
    camera_allowed: control === "camera" ? controls.camera_allowed === false : controls.camera_allowed !== false,
    updated_by: currentUser.id
  };
  const { error } = await supabase.from("media_controls").upsert(payload);
  if (error) return showToast(error.message);
}

async function clearLiveRoom() {
  const { error: mError } = await supabase.from("live_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error: hError } = await supabase.from("hand_raises").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (mError || hError) return showToast(mError?.message || hError.message);
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return showToast(error.message);
  await loadSharedData();
  renderAll();
}


async function uploadPersonPhoto() {
  const url = await uploadFile(await enhanceImage(els.personPhoto.files[0], "people"), "public-images", "people");
  if (url) els.personPhotoData.value = url;
}

async function uploadProfilePhoto() {
  const url = await uploadFile(await enhanceImage(els.profilePhoto.files[0], "profiles"), "public-images", "profiles");
  if (url) els.profilePhotoData.value = url;
}

async function uploadUserPhoto() {
  const url = await uploadFile(await enhanceImage(els.userPhoto.files[0], "profiles"), "public-images", "profiles");
  if (url) els.userPhotoData.value = url;
}

async function uploadScheduleRecording() {
  const url = await uploadFile(els.scheduleRecordingFile.files[0], "recordings", "recordings");
  if (url) els.scheduleRecordingData.value = url;
}

async function uploadScheduleSlides() {
  const file = els.scheduleSlidesFile.files[0];
  const url = await uploadFile(file, "presenter-slides", "slides");
  if (url) {
    els.scheduleSlidesData.value = url;
    els.scheduleSlidesName.value = file.name;
    els.scheduleSlidesType.value = file.type || "";
  }
}

async function presenterSlidesFileChange(event) {
  const input = event.target.closest("[data-presenter-slide-file]");
  if (!input) return;
  const item = state.schedule.find(entry => entry.id === input.dataset.presenterSlideFile);
  if (!item) return;
  const file = input.files[0];
  const url = await uploadFile(file, "presenter-slides", "slides");
  if (!url) return;
  const { error } = await supabase.rpc("update_schedule_slides", {
    schedule_id: item.id,
    slide_url: item.slidesUrl || "",
    slide_file_url: url,
    slide_name: file.name,
    slide_type: file.type || ""
  });
  if (error) return showToast(error.message);
  await loadSharedData();
  renderAll();
}

async function presenterSlidesClick(event) {
  const saveButton = event.target.closest("[data-presenter-save-slides]");
  if (!saveButton) return;
  const input = els.presenterSlidesList.querySelector(`[data-presenter-slide-url="${saveButton.dataset.presenterSaveSlides}"]`);
  const item = state.schedule.find(entry => entry.id === saveButton.dataset.presenterSaveSlides);
  const { error } = await supabase.rpc("update_schedule_slides", {
    schedule_id: saveButton.dataset.presenterSaveSlides,
    slide_url: input.value.trim(),
    slide_file_url: item?.slidesData || "",
    slide_name: item?.slidesName || "",
    slide_type: item?.slidesType || ""
  });
  if (error) return showToast(error.message);
  await loadSharedData();
  renderAll();
}

async function uploadFile(file, bucket, folder) {
  if (!file) return "";
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${folder}/${currentUser.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) {
    showToast(error.message);
    return "";
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  await supabase.from("uploads").insert({
    owner_id: currentUser.id,
    bucket,
    path,
    public_url: data.publicUrl,
    file_name: file.name,
    content_type: file.type || "",
    purpose: folder
  });
  return data.publicUrl;
}

function editSchedule(id) {
  const item = state.schedule.find(entry => entry.id === id);
  if (!item) return;
  els.scheduleId.value = item.id;
  els.scheduleDate.value = item.date;
  els.scheduleTime.value = item.time;
  els.scheduleEndTime.value = item.endTime || "";
  els.scheduleTopic.value = item.topic;
  els.scheduleNotes.value = item.notes || "";
  els.scheduleRecordingUrl.value = item.recordingUrl || "";
  els.scheduleRecordingData.value = item.recordingData || "";
  els.scheduleSlidesUrl.value = item.slidesUrl || "";
  els.scheduleSlidesData.value = item.slidesData || "";
  els.scheduleSlidesName.value = item.slidesName || "";
  els.scheduleSlidesType.value = item.slidesType || "";
}

function editPerson(id) {
  const person = state.people.find(entry => entry.id === id);
  if (!person) return;
  els.personId.value = person.id;
  els.personType.value = person.type;
  els.personName.value = person.name;
  els.personRole.value = person.role;
  els.personInstitution.value = person.institution;
  els.personLocation.value = person.location || "";
  els.personIntro.value = person.introduction || "";
  els.personPhotoData.value = person.photo || "";
}

function editQuestion(id) {
  const question = state.questions.find(entry => entry.id === id);
  if (!question) return;
  els.questionId.value = question.id;
  els.questionText.value = question.text;
  els.questionOptions.value = question.options.join(", ");
}

function editUser(id) {
  const user = state.users.find(entry => entry.id === id);
  if (!user) return;
  els.userId.value = user.id;
  els.userFullName.value = user.name || "";
  els.userUsername.value = user.username || "";
  els.userPassword.value = "";
  els.userEmail.value = user.email || "";
  els.userRole.value = user.role || "user";
  els.userStatus.value = user.status || "approved";
  els.userForm.classList.remove("hidden");
  els.userFormTitle.classList.remove("hidden");
  els.userFormTitle.textContent = `Edit user — ${user.name}`;
  els.userFormTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  els.userDiscipline.value = user.discipline || "";
  els.userUniversity.value = user.university || "";
  els.userLocation.value = user.location || "";
  els.userBio.value = user.bio || "";
  els.userPhotoData.value = user.photo || "";
}

function clearScheduleForm() {
  els.scheduleForm.reset();
  els.scheduleId.value = "";
  els.scheduleRecordingData.value = "";
  els.scheduleSlidesData.value = "";
  els.scheduleSlidesName.value = "";
  els.scheduleSlidesType.value = "";
}

function clearPersonForm() {
  els.personForm.reset();
  els.personId.value = "";
  els.personPhotoData.value = "";
}

function clearQuestionForm() {
  els.questionForm.reset();
  els.questionId.value = "";
}

function clearUserForm() {
  els.userForm.reset();
  els.userForm.classList.add("hidden");
  els.userFormTitle.classList.add("hidden");
  els.userId.value = "";
  els.userPhotoData.value = "";
}

function showReport() {
  showView("report");
}

function showProfile() {
  showView("profile");
}

function showPresenter() {
  showView("presenter");
}

function showAdmin() {
  showView("admin");
}

async function copyMeetingLink() {
  try {
    await navigator.clipboard.writeText(state.settings.meeting.url || "");
    showToast(t("Video meeting link copied."));
  } catch {
    showToast(t("Copy failed."));
  }
}

async function setLocalMedia({ mic, camera }) {
  const controls = getMediaControl(currentUser.id);
  if (mic && controls.mic_allowed === false) return showToast(t("Admin has muted your microphone."));
  if (camera && controls.camera_allowed === false) return showToast(t("Admin has blocked your camera."));
  stopLocalMedia();
  if (!mic && !camera) return renderMediaControls();
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: mic, video: camera });
    localMedia.mic = mic;
    localMedia.camera = camera;
    els.localMediaPreview.srcObject = mediaStream;
    localMedia.status = `${mic ? "Mic on" : "Mic off"} | ${camera ? "Camera on" : "Camera off"}`;
  } catch {
    localMedia.status = "Browser permission failed. Use HTTPS and allow camera/microphone.";
    showToast(t("Camera/microphone permission failed."));
  }
  renderMediaControls();
}

function stopLocalMedia(options = {}) {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      if (options.micOnly && track.kind !== "audio") return;
      if (options.cameraOnly && track.kind !== "video") return;
      track.stop();
    });
  }
  if (!options.micOnly && !options.cameraOnly) {
    mediaStream = null;
    els.localMediaPreview.srcObject = null;
    localMedia = { mic: false, camera: false, status: "Mic and camera are off." };
    return;
  }
  if (options.micOnly) localMedia.mic = false;
  if (options.cameraOnly) {
    localMedia.camera = false;
    els.localMediaPreview.srcObject = null;
  }
}

async function enableMeetingReminder() {
  const next = getNextSession();
  const start = next ? sessionStart(next) : getMeetingStartDate();
  if (!start || start.getTime() < Date.now()) return showToast(t("There is no upcoming session to remind you about."));
  const title = next ? next.topic : state.settings.meeting.title;
  const reminderAt = new Date(start.getTime() - 15 * 60000);
  const delay = Math.max(0, reminderAt.getTime() - Date.now());
  window.clearTimeout(reminderTimer);
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (delay < 2147483647) {
    reminderTimer = window.setTimeout(() => {
      const message = `${title} starts in 15 minutes.`;
      if ("Notification" in window && Notification.permission === "granted") new Notification(state.settings.landing?.brandName || "Reminder", { body: message });
      showToast(message);
    }, delay);
  }
  showToast("Reminder set while this page is open. For a reminder on your phone, add the session to your calendar.");
}

function readLandingMetricsFromAdmin() {
  return [...els.landingMetricsAdminList.querySelectorAll("[data-landing-metric-value]")]
    .map(input => {
      const index = input.dataset.landingMetricValue;
      const label = els.landingMetricsAdminList.querySelector(`[data-landing-metric-label="${index}"]`);
      return { value: input.value.trim(), label: label?.value.trim() || "" };
    })
    .filter(item => item.value || item.label);
}

function readLandingCardsFromAdmin() {
  return [...els.landingCardsAdminList.querySelectorAll("[data-landing-card-title]")]
    .map(input => {
      const index = input.dataset.landingCardTitle;
      const text = els.landingCardsAdminList.querySelector(`[data-landing-card-text="${index}"]`);
      return { title: input.value.trim(), text: text?.value.trim() || "" };
    })
    .filter(item => item.title || item.text);
}

function normalizeLanding(landing = {}) {
  return {
    ...defaults.landing,
    ...landing,
    metrics: Array.isArray(landing.metrics) ? landing.metrics : defaults.landing.metrics,
    cards: Array.isArray(landing.cards) ? landing.cards : defaults.landing.cards,
    heroImages: Array.isArray(landing.heroImages) ? landing.heroImages : (landing.heroImage ? [landing.heroImage] : (Object.keys(landing).length ? [] : [defaults.landing.heroImage])),
    heroInterval: Number.isFinite(Number(landing.heroInterval)) ? Number(landing.heroInterval) : 6
  };
}

function normalizeProfile(row) {
  return {
    id: row.id,
    username: row.username || "",
    name: row.full_name || row.username || "Unnamed user",
    email: row.email || "",
    role: row.role || "user",
    status: row.status || "approved",
    updatesSeenAt: row.updates_seen_at || null,
    discipline: row.discipline || "",
    university: row.university || "",
    location: row.location || "",
    bio: row.bio || "",
    photo: row.photo_url || ""
  };
}

function normalizeSchedule(row) {
  return {
    id: row.id,
    date: row.date,
    time: row.start_time?.slice(0, 5) || "",
    endTime: row.end_time?.slice(0, 5) || "",
    topic: row.topic || "",
    notes: row.notes || "",
    recordingUrl: row.recording_url || "",
    recordingData: row.recording_file_url || "",
    slidesUrl: row.slides_url || "",
    slidesData: row.slides_file_url || "",
    slidesName: row.slides_name || "",
    slidesType: row.slides_type || ""
  };
}

function normalizePerson(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name || "",
    role: row.role_title || "",
    institution: row.institution || "",
    location: row.location || "",
    introduction: row.introduction || "",
    photo: row.photo_url || "",
    tone: row.tone || ""
  };
}

function normalizeQuestion(row) {
  return {
    id: row.id,
    text: row.text,
    options: Array.isArray(row.options) ? row.options : ["Yes", "No"]
  };
}

function getMediaControl(userId) {
  return state.mediaControls.find(item => item.user_id === userId) || { user_id: userId, mic_allowed: true, camera_allowed: true };
}

function hasSubmitted() {
  return state.answers.some(answer => answer.user_id === currentUser?.id);
}

function getMeetingStartDate() {
  const match = (state.settings.meeting.time || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const start = new Date();
  start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return start;
}

function openSlides(id) {
  const item = state.schedule.find(entry => entry.id === id);
  const href = item?.slidesUrl || item?.slidesData || "";
  if (!href) return;
  els.slideViewerTitle.textContent = `${item.topic} slides`;
  els.slideViewerPanel.classList.remove("hidden");
  els.slideFrame.src = href;
  els.slideOpenLink.href = href;
  els.slideViewerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSlidesButton(item) {
  if (!item.slidesUrl && !item.slidesData) return "";
  return `<button class="recording-link slides-link" type="button" data-view-slides="${item.id}">${t("View slides")}</button>`;
}

function renderRecordingButton(item) {
  const href = item.recordingUrl || item.recordingData || "";
  if (!href) return "";
  const safe = safeUrl(href);
  if (!safe) return "";
  return `<a class="recording-link" href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${t("Watch recording")}</a>`;
}

function renderAvatar(person) {
  const initials = getInitials(person.name);
  const tone = person.tone || "";
  if (person.photo) return `<div class="avatar ${escapeHtml(tone)}"><img src="${person.photo}" alt="${escapeHtml(person.name)}"></div>`;
  return `<div class="avatar ${escapeHtml(tone)}">${escapeHtml(initials)}</div>`;
}

function notesToTasks(notes) {
  return String(notes || "").split("\n").map(item => item.trim()).filter(Boolean).map(item => `<div class="task">${escapeHtml(item)}</div>`).join("");
}

function normalizeAnswer(answer) {
  if (!answer) return { choice: "", reason: "" };
  if (typeof answer === "string") return { choice: answer, reason: "" };
  return { choice: answer.choice || "", reason: answer.reason || "" };
}

function buildThankYouBody(user, session) {
  return `Dear ${user.name},\n\n${els.thankYouMessage.value}\n\nThis confirms that you participated in: ${session.topic}\nDate: ${formatScheduleDate(session.date)}\nTime: ${formatTimeRange(session)}\n\nWith appreciation,\nNephroRounds Team`;
}

function getRoleLabel(role) {
  if (role === "admin") return t("Administrator");
  if (role === "presenter") return t("Presenter");
  return t("Clinician");
}

function getBrandJustify(value) {
  if (value === "center") return "center";
  if (value === "right") return "flex-end";
  return "flex-start";
}

function getInitials(name) {
  return String(name || "NR").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function formatScheduleDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(currentLocale(), { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatTimeRange(item) {
  if (!item.time) return "No time";
  return item.endTime ? `${item.time} - ${item.endTime}` : item.time;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ------------------------------------------------------------------
   Views / navigation
------------------------------------------------------------------ */

function showView(name) {
  if (!currentUser) return;
  if (name === "presenter" && currentUser.role !== "presenter") return;
  if (name === "admin" && currentUser.role !== "admin") return;
  for (const view of VIEWS) {
    els[`${view}View`].classList.toggle("hidden", view !== name);
    els[`${view}Tab`].classList.toggle("active", view === name);
  }
  if (name === "profile") renderProfile();
  if (name === "admin") renderAdmin();
  if (name === "training") renderTraining();
  if (name === "updates") {
    renderUpdates();
    markUpdatesSeen();
  }
  els[`${name}Tab`].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ------------------------------------------------------------------
   Extra data (tolerant: app keeps working before migration 0003)
------------------------------------------------------------------ */
async function loadExtraData() {
  const [programs, lessons, progress] = await Promise.all([
    supabase.from("training_programs").select("*").order("sort_order").order("created_at"),
    supabase.from("training_lessons").select("*").order("sort_order").order("created_at"),
    supabase.from("training_progress").select("*")
  ]);
  state.trainingReady = !programs.error;
  state.programs = programs.error ? [] : programs.data || [];
  state.lessons = lessons.error ? [] : lessons.data || [];
  state.progress = progress.error ? [] : progress.data || [];
}

/* ------------------------------------------------------------------
   Updates
------------------------------------------------------------------ */

function visibleUpdates() {
  return state.announcements
    .filter(item => item.active !== false)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.created_at) - new Date(a.created_at));
}

function isUnread(item) {
  if (!currentUser) return false;
  if (!currentUser.updatesSeenAt) return true;
  return new Date(item.created_at) > new Date(currentUser.updatesSeenAt);
}

function renderUpdateCard(item, { compact = false } = {}) {
  const category = UPDATE_LABELS[item.category] ? item.category : "update";
  const link = safeUrl(item.link_url);
  return `<article class="update-card ${category} ${!compact && isUnread(item) ? "unread" : ""}">
    <div class="update-head">
      <div>
        <span class="tag ${category}">${updateLabel(category)}</span>
        ${item.pinned ? `<span class="tag pin">${t("Pinned")}</span>` : ""}
        ${!compact && isUnread(item) ? `<span class="tag">${t("New")}</span>` : ""}
      </div>
      <small class="hint">${formatRelative(item.created_at)}</small>
    </div>
    <h4>${escapeHtml(item.title)}</h4>
    ${item.body ? `<p>${escapeHtml(compact && item.body.length > 220 ? `${item.body.slice(0, 220)}…` : item.body)}</p>` : ""}
    ${link ? `<a class="update-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${t("Open link")} →</a>` : ""}
  </article>`;
}

function renderUpdates() {
  const filter = state.updateFilter || "all";
  const items = visibleUpdates().filter(item => filter === "all" || (item.category || "update") === filter);
  els.updatesList.innerHTML = items.length
    ? items.map(item => renderUpdateCard(item)).join("")
    : `<div class="empty-state">${t("Nothing here yet.")}</div>`;
  document.querySelectorAll("[data-update-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.updateFilter === filter);
  });
}

function renderUpdatesBadge() {
  const unread = visibleUpdates().filter(isUnread).length;
  els.updatesBadge.textContent = unread > 9 ? "9+" : String(unread);
  els.updatesBadge.classList.toggle("hidden", unread === 0);
}

function renderPinnedUpdates() {
  const pinned = visibleUpdates().filter(item => item.pinned).slice(0, 3);
  els.pinnedUpdates.innerHTML = pinned.map(item => renderUpdateCard(item, { compact: true })).join("");
  els.pinnedUpdates.classList.toggle("hidden", pinned.length === 0);
}

async function markUpdatesSeen() {
  if (!currentUser) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").update({ updates_seen_at: now }).eq("id", currentUser.id);
  if (error) return;
  // Keep the "New" highlight visible for this visit, clear the badge.
  window.setTimeout(() => {
    currentUser.updatesSeenAt = now;
    renderUpdatesBadge();
  }, 1500);
}

function notifyNewUpdates(previousIds) {
  if (!previousIds) return;
  const fresh = visibleUpdates().filter(item => !previousIds.has(item.id));
  if (!fresh.length) return;
  const first = fresh[0];
  showToast(`${updateLabel(first.category)}: ${first.title}`);
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification(first.title, { body: first.body?.slice(0, 140) || "" });
  }
}

function renderUpdatesAdmin() {
  const items = [...state.announcements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  els.updatesAdminList.innerHTML = items.length ? items.map(item => `
    <article class="editable-row"><div><span class="tag ${escapeHtml(item.category || "update")}">${UPDATE_LABELS[item.category] || "Update"}</span>${item.pinned ? ` <span class="tag pin">Pinned</span>` : ""}${item.active === false ? ` <span class="tag">Hidden</span>` : ""}<br><strong>${escapeHtml(item.title)}</strong><p class="hint">${formatDate(item.created_at)}<br>${escapeHtml((item.body || "").slice(0, 160))}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-update="${item.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-update="${item.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("Nothing published yet.")}</div>`;
  els.updatesAdminList.querySelectorAll("[data-edit-update]").forEach(button => button.addEventListener("click", () => editUpdate(button.dataset.editUpdate)));
  els.updatesAdminList.querySelectorAll("[data-remove-update]").forEach(button => button.addEventListener("click", () => confirmDelete("announcements", button.dataset.removeUpdate, "this update")));
}

async function saveUpdate(event) {
  event.preventDefault();
  const payload = {
    title: els.updateTitle.value.trim(),
    body: els.updateBody.value.trim(),
    category: els.updateCategory.value,
    link_url: els.updateLink.value.trim(),
    pinned: els.updatePinned.checked,
    active: els.updateActive.checked
  };
  if (els.updateId.value) payload.id = els.updateId.value;
  else payload.created_by = currentUser.id;
  const { error } = await supabase.from("announcements").upsert(payload);
  if (error) return showToast(friendlyError(error));
  clearUpdateForm();
  await refresh();
  showToast(t("Published."));
}

function editUpdate(id) {
  const item = state.announcements.find(entry => entry.id === id);
  if (!item) return;
  els.updateId.value = item.id;
  els.updateTitle.value = item.title || "";
  els.updateBody.value = item.body || "";
  els.updateCategory.value = item.category || "update";
  els.updateLink.value = item.link_url || "";
  els.updatePinned.checked = Boolean(item.pinned);
  els.updateActive.checked = item.active !== false;
  els.updateTitle.focus();
}

function clearUpdateForm() {
  els.updateForm.reset();
  els.updateId.value = "";
  els.updateActive.checked = true;
}

/* ------------------------------------------------------------------
   Sessions, countdown, calendar reminders
------------------------------------------------------------------ */
function sessionStart(item) {
  if (!item?.date || !item.time) return null;
  return new Date(`${item.date}T${item.time}:00`);
}

function sessionEnd(item) {
  const start = sessionStart(item);
  if (!start) return null;
  if (item.endTime) return new Date(`${item.date}T${item.endTime}:00`);
  return new Date(start.getTime() + 60 * 60000);
}

function upcomingSessions() {
  const now = Date.now();
  return state.schedule
    .filter(item => {
      const end = sessionEnd(item);
      return end && end.getTime() > now;
    })
    .sort((a, b) => sessionStart(a) - sessionStart(b));
}

function getNextSession() {
  return upcomingSessions()[0] || null;
}

function renderNextSession() {
  const next = getNextSession();
  els.nextSessionCard.classList.toggle("hidden", !next);
  if (!next) return;
  els.nextSessionTitle.textContent = next.topic;
  els.nextSessionMeta.textContent = `${formatScheduleDate(next.date)} · ${formatTimeRange(next)}`;
  updateCountdown();
}

function updateCountdown() {
  const next = getNextSession();
  if (!next || els.nextSessionCard.classList.contains("hidden")) return;
  const diff = sessionStart(next).getTime() - Date.now();
  if (diff <= 0) {
    els.nextSessionCountdown.innerHTML = `<div><b>${t("Live")}</b><span>${t("now")}</span></div>`;
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const parts = days > 0
    ? [[days, t("days")], [hours, t("hrs")], [minutes, t("min")]]
    : [[hours, t("hrs")], [minutes, t("min")], [seconds, t("sec")]];
  els.nextSessionCountdown.innerHTML = parts.map(([value, label]) => `<div><b>${String(value).padStart(2, "0")}</b><span>${label}</span></div>`).join("");
}

function calendarButtons(item) {
  if (!sessionStart(item)) return "";
  return `<div class="calendar-actions">
    <a class="recording-link" href="${escapeHtml(googleCalendarUrl(item))}" target="_blank" rel="noreferrer">+ Google Calendar</a>
    <button class="recording-link" type="button" data-ics="${item.id}">+ ${t("Apple / Outlook")}</button>
  </div>`;
}

function sessionDescription(item) {
  const meeting = state.settings.meeting || {};
  return [item.notes, meeting.url ? `Join: ${meeting.url}` : ""].filter(Boolean).join("\n\n");
}

function icsStamp(date) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function googleCalendarUrl(item) {
  const brand = state.settings.landing?.brandName || "Morning report";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${brand}: ${item.topic}`,
    dates: `${utcStamp(sessionStart(item))}/${utcStamp(sessionEnd(item))}`,
    details: sessionDescription(item),
    location: state.settings.meeting?.url || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
}

function buildIcs(items) {
  const brand = state.settings.landing?.brandName || "Morning report";
  const events = items.filter(sessionStart).map(item => [
    "BEGIN:VEVENT",
    `UID:${item.id}@${location.hostname || "rounds"}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(sessionStart(item))}`,
    `DTEND:${utcStamp(sessionEnd(item))}`,
    `SUMMARY:${icsEscape(`${brand}: ${item.topic}`)}`,
    `DESCRIPTION:${icsEscape(sessionDescription(item))}`,
    state.settings.meeting?.url ? `URL:${icsEscape(state.settings.meeting.url)}` : "",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(item.topic)} starts in 15 minutes`,
    "TRIGGER:-PT15M",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(item.topic)} is tomorrow`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT"
  ].filter(Boolean).join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${icsEscape(brand)}//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR"].join("\r\n");
}

function downloadIcs(items, filename) {
  if (!items.length) return showToast(t("There are no upcoming sessions to add."));
  const blob = new Blob([buildIcs(items)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(t("Calendar file ready. Open it to add the reminder to your calendar."));
}

/* ------------------------------------------------------------------
   Training
------------------------------------------------------------------ */
function lessonsFor(programId) {
  return state.lessons.filter(lesson => lesson.program_id === programId)
    .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
}

function isLessonDone(lessonId, userId = currentUser?.id) {
  return state.progress.some(entry => entry.lesson_id === lessonId && entry.user_id === userId);
}

function programProgress(programId, userId = currentUser?.id) {
  const lessons = lessonsFor(programId);
  const done = lessons.filter(lesson => isLessonDone(lesson.id, userId)).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

function visiblePrograms() {
  if (currentUser?.role === "admin") return state.programs;
  return state.programs.filter(program => program.active !== false && (program.audience === "all" || program.audience === currentUser?.role));
}

function renderTraining() {
  if (state.selectedProgramId && state.programs.some(program => program.id === state.selectedProgramId)) {
    renderProgramDetail(state.selectedProgramId);
    return;
  }
  state.selectedProgramId = null;
  els.trainingOverview.classList.remove("hidden");
  els.trainingDetail.classList.add("hidden");
  const programs = visiblePrograms();
  const progressList = programs.map(program => programProgress(program.id));
  const completed = progressList.filter(item => item.total && item.done === item.total).length;
  const inProgress = progressList.filter(item => item.done > 0 && item.done < item.total).length;
  const lessonsDone = progressList.reduce((sum, item) => sum + item.done, 0);
  const minutes = programs.flatMap(program => lessonsFor(program.id)).filter(lesson => isLessonDone(lesson.id)).reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);
  els.trainingStats.innerHTML = [
    [programs.length, t("Programs available")],
    [inProgress, t("In progress")],
    [completed, t("Completed")],
    [lessonsDone, t("Lessons finished")],
    [`${Math.round(minutes / 6) / 10} ${t("h")}`, t("Learning time")]
  ].map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("");

  if (!state.trainingReady) {
    els.trainingPrograms.innerHTML = `<div class="empty-state">${t("Training programs will appear here soon.")}</div>`;
    return;
  }
  els.trainingPrograms.innerHTML = programs.length ? programs.map(program => {
    const progress = programProgress(program.id);
    const cover = safeUrl(program.cover_url);
    return `<button class="program-card" type="button" data-open-program="${program.id}">
      <div class="program-cover" style="${cover ? `background-image: url('${escapeHtml(cover)}')` : ""}">${cover ? "" : escapeHtml(getInitials(program.title.replace(/[^\p{L}\p{N}\s]/gu, " ")))}</div>
      <div class="program-body">
        <div>${program.level ? `<span class="tag">${escapeHtml(program.level)}</span>` : ""}${program.active === false ? ` <span class="tag">${t("Draft")}</span>` : ""}</div>
        <strong>${escapeHtml(program.title)}</strong>
        <p class="hint">${escapeHtml((program.summary || "").slice(0, 140))}</p>
        <div class="progress-bar"><i style="width: ${progress.percent}%"></i></div>
        <div class="progress-meta"><span>${progress.done}/${progress.total} ${t("lessons")}</span><span>${progress.total && progress.done === progress.total ? `${t("Completed")} ✓` : `${progress.percent}%`}</span></div>
      </div>
    </button>`;
  }).join("") : `<div class="empty-state">${t("No training programs yet.")}</div>`;
  els.trainingPrograms.querySelectorAll("[data-open-program]").forEach(button => button.addEventListener("click", () => {
    state.selectedProgramId = button.dataset.openProgram;
    els.lessonList.innerHTML = "";
    renderTraining();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

function renderProgramDetail(programId) {
  const program = state.programs.find(entry => entry.id === programId);
  if (!program) return;
  els.trainingOverview.classList.add("hidden");
  els.trainingDetail.classList.remove("hidden");
  const progress = programProgress(programId);
  els.programLevel.textContent = program.level || t("Program");
  els.programTitle.textContent = program.title;
  els.programSummary.textContent = program.summary || "";
  els.programRing.style.setProperty("--value", progress.percent);
  els.programPercent.textContent = `${progress.percent}%`;
  els.programCertificate.classList.toggle("hidden", !(progress.total && progress.done === progress.total));

  const lessons = lessonsFor(programId);
  const openLessons = new Set([...els.lessonList.querySelectorAll("details[open]")].map(node => node.dataset.lesson));
  const firstOpen = lessons.find(lesson => !isLessonDone(lesson.id))?.id;
  els.lessonList.innerHTML = lessons.length ? lessons.map((lesson, index) => {
    const done = isLessonDone(lesson.id);
    const video = renderVideo(lesson.video_url);
    const resource = safeUrl(lesson.resource_url);
    const open = lesson.id === state.focusLessonId || (openLessons.size ? openLessons.has(lesson.id) : lesson.id === firstOpen);
    return `<details class="lesson ${done ? "done" : ""}" data-lesson="${lesson.id}" ${open ? "open" : ""}>
      <summary>
        <span class="lesson-num">${done ? "✓" : index + 1}</span>
        <span><strong>${escapeHtml(lesson.title)}</strong><br><small class="hint">${lesson.duration_minutes ? `${lesson.duration_minutes} ${t("min")}` : ""}</small></span>
        <span class="tag">${done ? t("Done") : t("To do")}</span>
      </summary>
      <div class="lesson-content">
        ${video}
        ${lesson.body ? `<p>${escapeHtml(lesson.body)}</p>` : ""}
        ${resource ? `<a class="recording-link" href="${escapeHtml(resource)}" target="_blank" rel="noreferrer">${t("Open")} ${escapeHtml(lesson.resource_name || t("resource"))}</a>` : ""}
        <div><button class="btn ${done ? "secondary" : ""}" type="button" data-toggle-lesson="${lesson.id}">${done ? t("Mark as not done") : t("Mark as complete")}</button></div>
      </div>
    </details>`;
  }).join("") : `<div class="empty-state">${t("Lessons will be added soon.")}</div>`;
  els.lessonList.querySelectorAll("[data-toggle-lesson]").forEach(button => button.addEventListener("click", () => toggleLesson(button.dataset.toggleLesson)));
}

async function toggleLesson(lessonId) {
  const done = isLessonDone(lessonId);
  const programId = state.lessons.find(lesson => lesson.id === lessonId)?.program_id;
  const before = programProgress(programId);
  const request = done
    ? supabase.from("training_progress").delete().eq("user_id", currentUser.id).eq("lesson_id", lessonId)
    : supabase.from("training_progress").insert({ user_id: currentUser.id, lesson_id: lessonId });
  const { error } = await request;
  if (error) return showToast(friendlyError(error));
  if (done) state.progress = state.progress.filter(entry => !(entry.lesson_id === lessonId && entry.user_id === currentUser.id));
  else state.progress.push({ user_id: currentUser.id, lesson_id: lessonId, completed_at: new Date().toISOString() });
  const after = programProgress(programId);
  state.focusLessonId = done ? lessonId : lessonsFor(programId).find(lesson => !isLessonDone(lesson.id))?.id || null;
  if (!done) els.lessonList.querySelector(`[data-lesson="${lessonId}"]`)?.removeAttribute("open");
  renderTraining();
  const focus = state.focusLessonId && els.lessonList.querySelector(`[data-lesson="${state.focusLessonId}"]`);
  if (focus && !done) focus.scrollIntoView({ behavior: "smooth", block: "nearest" });
  state.focusLessonId = null;
  if (after.total && after.done === after.total && before.done !== before.total) {
    showToast(t("Program completed! Your certificate is ready."));
  }
}

function renderVideo(url) {
  const safe = safeUrl(url);
  if (!safe) return "";
  const youtube = safe.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${youtube[1]}" title="Lesson video" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  const vimeo = safe.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="Lesson video" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(safe)) return `<div class="video-embed"><video src="${escapeHtml(safe)}" controls playsinline></video></div>`;
  return `<a class="recording-link" href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${t("Watch video")}</a>`;
}

function openCertificate() {
  const program = state.programs.find(entry => entry.id === state.selectedProgramId);
  if (!program) return;
  const lessons = lessonsFor(program.id);
  const dates = state.progress.filter(entry => entry.user_id === currentUser.id && lessons.some(lesson => lesson.id === entry.lesson_id)).map(entry => new Date(entry.completed_at));
  const finished = dates.length ? new Date(Math.max(...dates)) : new Date();
  const brand = state.settings.landing?.brandName || "";
  const minutes = lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);
  const win = window.open("", "_blank");
  if (!win) return showToast(t("Allow pop-ups to open the certificate."));
  win.document.write(`<!doctype html><html lang="${currentLang}" dir="${currentDir()}"><head><meta charset="utf-8"><title>${t("Certificate")} – ${escapeHtml(program.title)}</title>
  <style>
    @page { size: landscape; margin: 0; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f3f1ea; display: grid; place-items: center; min-height: 100vh; }
    .cert { width: 1000px; max-width: 94vw; aspect-ratio: 1.414; background: #fff; border: 14px solid #0f3a36; outline: 3px solid #c9902c; outline-offset: -26px; padding: 70px; box-sizing: border-box; text-align: center; display: grid; align-content: center; gap: 14px; }
    .brand { font-family: system-ui, sans-serif; letter-spacing: 4px; text-transform: uppercase; color: #0f766e; font-weight: 800; font-size: 14px; }
    h1 { margin: 0; font-size: 46px; color: #14211f; }
    .lead { color: #657371; font-size: 18px; margin: 0; }
    .name { font-size: 40px; color: #0f3a36; border-bottom: 2px solid #c9902c; padding-bottom: 6px; justify-self: center; min-width: 60%; margin: 6px 0; }
    .program { font-size: 24px; font-style: italic; color: #14211f; margin: 0; }
    .meta { display: flex; justify-content: space-around; margin-top: 30px; font-family: system-ui, sans-serif; color: #657371; font-size: 13px; }
    .meta b { display: block; color: #14211f; font-size: 15px; }
    .print { position: fixed; top: 16px; right: 16px; font: 700 14px system-ui; background: #0f766e; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; cursor: pointer; }
    @media print { .print { display: none; } body { background: #fff; } .cert { max-width: none; width: 100%; height: 100vh; aspect-ratio: auto; } }
  </style></head><body>
  <button class="print" onclick="window.print()">${t("Print / Save as PDF")}</button>
  <div class="cert">
    <div class="brand">${escapeHtml(brand)}</div>
    <h1>${t("Certificate of Completion")}</h1>
    <p class="lead">${t("This certifies that")}</p>
    <div class="name">${escapeHtml(currentUser.name)}</div>
    <p class="lead">${t("has successfully completed the training program")}</p>
    <p class="program">${escapeHtml(program.title)}</p>
    <div class="meta">
      <div><b>${new Intl.DateTimeFormat(currentLocale(), { dateStyle: "long" }).format(finished)}</b>${t("Date completed")}</div>
      <div><b>${lessons.length} ${t("lessons")}${minutes ? ` · ${minutes} ${t("min")}` : ""}</b>${t("Program length")}</div>
      <div><b>${escapeHtml([currentUser.discipline, currentUser.university].filter(Boolean).join(", ") || "—")}</b>${t("Participant")}</div>
    </div>
  </div></body></html>`);
  win.document.close();
}

/* ---- Training admin ---- */
function renderTrainingAdmin() {
  if (!state.trainingReady) {
    els.programsAdminList.innerHTML = `<div class="empty-state">${t("Run database update 0003 in Supabase to enable training programs.")}</div>`;
    els.trainingReport.innerHTML = "";
    return;
  }
  els.programsAdminList.innerHTML = state.programs.length ? state.programs.map(program => `
    <article class="editable-row"><div><strong>${escapeHtml(program.title)}</strong> ${program.active === false ? `<span class="tag">Draft</span>` : ""}<p class="hint">${lessonsFor(program.id).length} lessons · ${escapeHtml(program.level || "No level")} · Visible to: ${escapeHtml(audienceLabel(program.audience))}</p></div>
    <div class="row-actions"><button class="btn small" type="button" data-lessons-program="${program.id}">${t("Lessons")}</button><button class="btn secondary small" type="button" data-edit-program="${program.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-program="${program.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("No programs yet. Create the first one above.")}</div>`;
  els.programsAdminList.querySelectorAll("[data-lessons-program]").forEach(button => button.addEventListener("click", () => openLessonsAdmin(button.dataset.lessonsProgram)));
  els.programsAdminList.querySelectorAll("[data-edit-program]").forEach(button => button.addEventListener("click", () => editProgram(button.dataset.editProgram)));
  els.programsAdminList.querySelectorAll("[data-remove-program]").forEach(button => button.addEventListener("click", () => confirmDelete("training_programs", button.dataset.removeProgram, "this program and all its lessons")));

  if (state.adminProgramId && state.programs.some(program => program.id === state.adminProgramId)) renderLessonsAdmin();
  else els.lessonsAdmin.classList.add("hidden");

  const learners = state.users.filter(user => user.status === "approved");
  if (!state.programs.length || !learners.length) {
    els.trainingReport.innerHTML = `<div class="empty-state">${t("Progress will appear here once people start learning.")}</div>`;
    return;
  }
  els.trainingReport.innerHTML = `<table class="table"><thead><tr><th>Person</th>${state.programs.map(program => `<th>${escapeHtml(program.title)}</th>`).join("")}</tr></thead><tbody>${learners.map(user => `<tr><td>${escapeHtml(user.name)}<br><small class="hint">${escapeHtml(getRoleLabel(user.role))}</small></td>${state.programs.map(program => {
    const progress = programProgress(program.id, user.id);
    return `<td>${progress.total ? `${progress.percent}%<div class="progress-bar" style="margin-top: 4px;"><i style="width: ${progress.percent}%"></i></div>` : "—"}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table>`;
}

function audienceLabel(value) {
  return { all: "Everyone", user: "Clinicians", presenter: "Presenters", admin: "Admins only" }[value] || "Everyone";
}

async function saveProgram(event) {
  event.preventDefault();
  const payload = {
    title: els.programTitleInput.value.trim(),
    summary: els.programSummaryInput.value.trim(),
    level: els.programLevelInput.value.trim(),
    audience: els.programAudience.value,
    cover_url: els.programCoverData.value || "",
    sort_order: Number(els.programOrder.value) || 0,
    active: els.programActive.checked
  };
  if (els.programId.value) payload.id = els.programId.value;
  else payload.created_by = currentUser.id;
  const { data, error } = await supabase.from("training_programs").upsert(payload).select().single();
  if (error) return showToast(friendlyError(error));
  const isNew = !els.programId.value;
  clearProgramForm();
  await refresh();
  if (isNew && data) openLessonsAdmin(data.id);
  showToast(isNew ? t("Program created. Now add lessons.") : t("Program saved."));
}

function editProgram(id) {
  const program = state.programs.find(entry => entry.id === id);
  if (!program) return;
  els.programId.value = program.id;
  els.programTitleInput.value = program.title || "";
  els.programSummaryInput.value = program.summary || "";
  els.programLevelInput.value = program.level || "";
  els.programAudience.value = program.audience || "all";
  els.programCoverData.value = program.cover_url || "";
  els.programOrder.value = program.sort_order || 0;
  els.programActive.checked = program.active !== false;
  els.programTitleInput.focus();
}

function clearProgramForm() {
  els.programForm.reset();
  els.programId.value = "";
  els.programCoverData.value = "";
  els.programActive.checked = true;
}

function openLessonsAdmin(programId) {
  state.adminProgramId = programId;
  clearLessonForm();
  renderLessonsAdmin();
  els.lessonsAdmin.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLessonsAdmin() {
  const program = state.programs.find(entry => entry.id === state.adminProgramId);
  if (!program) return;
  els.lessonsAdmin.classList.remove("hidden");
  els.lessonsAdminTitle.textContent = `Lessons — ${program.title}`;
  const lessons = lessonsFor(program.id);
  if (!els.lessonId.value) els.lessonOrder.value = lessons.length ? Math.max(...lessons.map(lesson => lesson.sort_order || 0)) + 1 : 1;
  els.lessonsAdminList.innerHTML = lessons.length ? lessons.map((lesson, index) => `
    <article class="editable-row"><div><strong>${index + 1}. ${escapeHtml(lesson.title)}</strong><p class="hint">${lesson.duration_minutes || 0} min${lesson.video_url ? " · Video" : ""}${lesson.resource_url ? " · Resource" : ""}</p></div>
    <div class="row-actions"><button class="btn secondary small" type="button" data-edit-lesson="${lesson.id}">${t("Edit")}</button><button class="btn warn small" type="button" data-remove-lesson="${lesson.id}">${t("Remove")}</button></div></article>`).join("") : `<div class="empty-state">${t("No lessons yet.")}</div>`;
  els.lessonsAdminList.querySelectorAll("[data-edit-lesson]").forEach(button => button.addEventListener("click", () => editLesson(button.dataset.editLesson)));
  els.lessonsAdminList.querySelectorAll("[data-remove-lesson]").forEach(button => button.addEventListener("click", () => confirmDelete("training_lessons", button.dataset.removeLesson, "this lesson")));
}

async function saveLesson(event) {
  event.preventDefault();
  if (!state.adminProgramId) return;
  const payload = {
    program_id: state.adminProgramId,
    title: els.lessonTitle.value.trim(),
    body: els.lessonBody.value.trim(),
    video_url: els.lessonVideo.value.trim(),
    resource_url: els.lessonResourceUrl.value.trim() || els.lessonResourceData.value || "",
    resource_name: els.lessonResourceName.value || "",
    duration_minutes: Math.max(0, Number(els.lessonDuration.value) || 0),
    sort_order: Number(els.lessonOrder.value) || 0
  };
  if (els.lessonId.value) payload.id = els.lessonId.value;
  const { error } = await supabase.from("training_lessons").upsert(payload);
  if (error) return showToast(friendlyError(error));
  clearLessonForm();
  await refresh();
  showToast(t("Lesson saved."));
}

function editLesson(id) {
  const lesson = state.lessons.find(entry => entry.id === id);
  if (!lesson) return;
  els.lessonId.value = lesson.id;
  els.lessonTitle.value = lesson.title || "";
  els.lessonBody.value = lesson.body || "";
  els.lessonVideo.value = lesson.video_url || "";
  els.lessonResourceUrl.value = lesson.resource_url || "";
  els.lessonResourceData.value = "";
  els.lessonResourceName.value = lesson.resource_name || "";
  els.lessonDuration.value = lesson.duration_minutes || 0;
  els.lessonOrder.value = lesson.sort_order || 0;
  els.lessonTitle.focus();
}

function clearLessonForm() {
  els.lessonForm.reset();
  els.lessonId.value = "";
  els.lessonResourceData.value = "";
  els.lessonResourceName.value = "";
}

async function uploadProgramCover() {
  const url = await uploadFile(await enhanceImage(els.programCover.files[0], "training"), "public-images", "training");
  if (url) {
    els.programCoverData.value = url;
    showToast(t("Cover uploaded. Save the program to apply it."));
  }
}

async function uploadLessonResource() {
  const file = els.lessonResourceFile.files[0];
  const url = await uploadFile(file, "presenter-slides", "training");
  if (url) {
    els.lessonResourceData.value = url;
    els.lessonResourceUrl.value = url;
    els.lessonResourceName.value = file.name;
    showToast(t("File uploaded. Save the lesson to attach it."));
  }
}

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */
async function refresh() {
  await loadSharedData();
  renderAll();
}

async function confirmDelete(table, id, label) {
  if (!window.confirm(`Remove ${label}? This cannot be undone.`)) return;
  await deleteRow(table, id);
}

function safeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong.";
  if (/relation .* does not exist|schema cache/i.test(message)) return "This feature needs the latest database update. Please contact the administrator.";
  if (/row-level security|permission denied/i.test(message)) return "You do not have permission to do that.";
  return message;
}

function formatRelative(value) {
  const date = new Date(value);
  const diff = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "auto" });
  if (diff < 60) return rtf.format(0, "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 604800) return rtf.format(-Math.floor(diff / 86400), "day");
  return new Intl.DateTimeFormat(currentLocale(), { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/* ------------------------------------------------------------------
   Admin shortcuts
------------------------------------------------------------------ */
function openAdminSection(sectionId, focusEl) {
  showView("admin");
  document.querySelector(`[data-admin-section="${sectionId}"]`)?.click();
  window.setTimeout(() => focusEl?.focus(), 300);
}

/* ------------------------------------------------------------------
   Password reset
------------------------------------------------------------------ */

function showAuthPanel(panel) {
  const panels = { signin: els.loginForm, signup: els.signupForm, forgot: els.forgotForm, reset: els.resetForm, pending: els.pendingNotice };
  for (const [name, node] of Object.entries(panels)) node.classList.toggle("hidden", name !== panel);
  document.querySelector(".auth-tabs")?.classList.toggle("hidden", panel === "forgot" || panel === "reset");
  document.querySelectorAll(".auth-tabs [data-auth-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.authTab === panel);
  });
}

async function sendResetLink(event) {
  event.preventDefault();
  const submit = els.forgotForm.querySelector("button[type=submit]");
  submit.disabled = true;
  const email = els.forgotEmail.value.trim();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
  submit.disabled = false;
  if (error) return showToast(error.message);
  els.forgotForm.reset();
  showPendingNotice("reset-sent");
}

async function saveNewPassword(event) {
  event.preventDefault();
  if (els.resetPassword.value !== els.resetPassword2.value) return showToast(t("The two passwords do not match."));
  const { data, error } = await supabase.auth.updateUser({ password: els.resetPassword.value });
  if (error) return showToast(error.message);
  recoveryMode = false;
  els.resetForm.reset();
  history.replaceState(null, "", window.location.pathname);
  showToast(t("Password changed."));
  if (data?.user) await hydrateSession(data.user);
}

/* ------------------------------------------------------------------
   Image enhancement on upload
------------------------------------------------------------------ */
const IMAGE_TARGETS = {
  landing: { min: 1920, max: 2560 },
  training: { min: 1200, max: 1600 },
  people: { min: 600, max: 800 },
  profiles: { min: 600, max: 800 }
};

async function enhanceImage(file, purpose) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif|bmp)$/i.test(file.type)) return file;
  const target = IMAGE_TARGETS[purpose] || { min: 1200, max: 2000 };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const longEdge = Math.max(bitmap.width, bitmap.height);
  let scale = 1;
  if (longEdge > target.max) scale = target.max / longEdge;
  else if (longEdge < target.min) scale = Math.min(2, target.min / longEdge);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // Resize in steps of at most 2x for smoother, cleaner results.
  let source = bitmap;
  let currentW = bitmap.width;
  let currentH = bitmap.height;
  while (currentW !== width || currentH !== height) {
    const nextW = scale < 1 ? Math.max(width, Math.round(currentW / 2)) : Math.min(width, currentW * 2);
    const nextH = scale < 1 ? Math.max(height, Math.round(currentH / 2)) : Math.min(height, currentH * 2);
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const stepCtx = step.getContext("2d");
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(source, 0, 0, nextW, nextH);
    source = step;
    currentW = nextW;
    currentH = nextH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);

  const hasAlpha = /png|webp/i.test(file.type) && imageHasTransparency(ctx, width, height);
  // Stronger sharpening when the picture was enlarged.
  sharpen(ctx, width, height, scale > 1.2 ? 0.6 : 0.35);

  const type = hasAlpha ? "image/png" : "image/jpeg";
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.92));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + (hasAlpha ? ".png" : ".jpg");
  return new File([blob], name, { type });
}

function imageHasTransparency(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4 * 16) if (data[i] < 250) return true;
  return false;
}

// Unsharp mask: original + amount * (original - blurred), 3x3 kernel.
function sharpen(ctx, width, height, amount) {
  const image = ctx.getImageData(0, 0, width, height);
  const src = image.data;
  const out = new Uint8ClampedArray(src);
  const row = width * 4;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        const blur = (src[k - row - 4] + 2 * src[k - row] + src[k - row + 4]
          + 2 * src[k - 4] + 4 * src[k] + 2 * src[k + 4]
          + src[k + row - 4] + 2 * src[k + row] + src[k + row + 4]) / 16;
        out[k] = src[k] + amount * (src[k] - blur);
      }
    }
  }
  image.data.set(out);
  ctx.putImageData(image, 0, 0);
}

/* ------------------------------------------------------------------
   Home page picture slider
------------------------------------------------------------------ */

function heroImagesOf(landing) {
  const list = Array.isArray(landing?.heroImages) ? landing.heroImages.filter(Boolean) : [];
  if (list.length) return list;
  return landing?.heroImage ? [landing.heroImage] : [];
}

function renderHeroSlider(landing) {
  const images = heroImagesOf(landing).map(safeUrl).filter(Boolean);
  const signature = images.join("|");
  els.heroSlider.classList.toggle("hidden", images.length === 0);
  els.heroSlider.classList.toggle("single", images.length < 2);
  if (els.heroSlider.dataset.signature !== signature) {
    els.heroSlider.dataset.signature = signature;
    heroIndex = 0;
    const alt = escapeHtml(landing.heroHeadline || landing.brandName || "");
    els.heroSlides.innerHTML = images.map((src, index) => `
      <figure class="hero-slide ${index === 0 ? "active" : ""}" data-hero-index="${index}" style="margin: 0;">
        <div class="hero-slide-bg" style="background-image: url('${escapeHtml(src)}')"></div>
        <img src="${escapeHtml(src)}" alt="${alt}" ${index === 0 ? "" : 'loading="lazy"'} decoding="async">
      </figure>`).join("");
    els.heroDots.innerHTML = images.map((_, index) => `<button type="button" class="${index === 0 ? "active" : ""}" data-hero-dot="${index}" aria-label="Show picture ${index + 1}"></button>`).join("");
  }
  restartHeroTimer(landing);
}

function showHeroSlide(index) {
  const slides = els.heroSlides.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  heroIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle("active", i === heroIndex));
  els.heroDots.querySelectorAll("button").forEach((dot, i) => dot.classList.toggle("active", i === heroIndex));
}

function restartHeroTimer(landing = state.settings.landing) {
  window.clearInterval(heroTimer);
  const seconds = Number(landing?.heroInterval ?? 6);
  const count = els.heroSlides.querySelectorAll(".hero-slide").length;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (count < 2 || !seconds || reduce) return;
  heroTimer = window.setInterval(() => {
    if (!heroPaused && !document.hidden && !els.loginView.classList.contains("hidden")) showHeroSlide(heroIndex + 1);
  }, seconds * 1000);
}

function openLightbox(src, alt = "") {
  els.lightboxImage.src = src;
  els.lightboxImage.alt = alt;
  els.lightbox.classList.remove("hidden");
}

function closeLightbox() {
  els.lightbox.classList.add("hidden");
  els.lightboxImage.removeAttribute("src");
}

function renderHeroImagesAdmin(landing) {
  const images = heroImagesOf(landing);
  els.heroImagesAdmin.innerHTML = images.length ? images.map((src, index) => `
    <div class="hero-thumb">
      <img src="${escapeHtml(safeUrl(src))}" alt="Picture ${index + 1}">
      <div class="row-actions">
        <span>
          <button class="btn secondary small" type="button" data-hero-move="${index}" data-dir="-1" ${index === 0 ? "disabled" : ""} aria-label="Move earlier">←</button>
          <button class="btn secondary small" type="button" data-hero-move="${index}" data-dir="1" ${index === images.length - 1 ? "disabled" : ""} aria-label="Move later">→</button>
        </span>
        <button class="btn warn small" type="button" data-hero-remove="${index}">${t("Remove")}</button>
      </div>
    </div>`).join("") : `<div class="empty-state hero-thumb-empty">${t("No pictures yet. Use “+ Add pictures”.")}</div>`;
  els.adminLandingHeroInterval.value = String(landing.heroInterval ?? 6);
}

function readLandingForm() {
  const current = state.settings.landing || {};
  const images = heroImagesOf(current);
  return {
    ...current,
    brandName: els.adminLandingBrandName.value.trim(),
    brandTagline: els.adminLandingBrandTagline.value.trim(),
    loginHeadline: els.adminLandingLoginHeadline.value.trim(),
    loginLead: els.adminLandingLoginLead.value.trim(),
    heroBadge: els.adminLandingHeroBadge.value.trim(),
    heroHeadline: els.adminLandingHeroHeadline.value.trim(),
    heroImages: images,
    heroImage: images[0] || "",
    heroInterval: Number(els.adminLandingHeroInterval.value),
    copyright: els.adminLandingCopyright.value.trim(),
    metrics: readLandingMetricsFromAdmin(),
    cards: readLandingCardsFromAdmin()
  };
}

async function setHeroImages(images) {
  state.settings.landing = { ...readLandingForm(), heroImages: images, heroImage: images[0] || "" };
  renderLanding();
  await saveSettings();
}

async function uploadLandingHero() {
  const files = [...(els.adminLandingHeroImage.files || [])];
  if (!files.length) return;
  const added = [];
  for (const [index, file] of files.entries()) {
    showToast(`${t("Optimizing pictures…")} ${index + 1}/${files.length}`);
    const url = await uploadFile(await enhanceImage(file, "landing"), "public-images", "landing");
    if (url) added.push(url);
  }
  els.adminLandingHeroImage.value = "";
  if (!added.length) return;
  await setHeroImages([...heroImagesOf(state.settings.landing), ...added]);
}

/* ------------------------------------------------------------------
   Home page design: styles, free text boxes, theme, copyright
------------------------------------------------------------------ */

function cleanColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "";
}

function cleanStyle(style = {}) {
  const num = (value, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) && value !== "" && value !== null ? Math.min(max, Math.max(min, n)) : null;
  };
  return {
    font: FONT_STACKS[style.font] ? style.font : "",
    size: num(style.size, 10, 120),
    bold: style.bold === true ? true : style.bold === false ? false : null,
    italic: style.italic === true,
    align: ["left", "center", "right"].includes(style.align) ? style.align : "",
    color: cleanColor(style.color),
    fill: style.fill === "none" ? "none" : cleanColor(style.fill),
    radius: num(style.radius, 0, 40),
    hidden: style.hidden === true
  };
}

function applyElementStyle(el, raw, { text = true, box = true } = {}) {
  const st = cleanStyle(raw);
  if (box) {
    if (st.fill === "none") {
      el.style.background = "transparent";
      el.style.borderColor = "transparent";
    } else if (st.fill) {
      el.style.background = st.fill;
      el.style.backgroundImage = "none";
    } else {
      el.style.background = "";
      el.style.borderColor = "";
    }
    el.style.borderRadius = st.radius === null ? "" : `${st.radius}px`;
  }
  if (text) {
    el.style.fontFamily = st.font ? FONT_STACKS[st.font] : "";
    el.style.fontSize = st.size ? `${st.size}px` : "";
    el.style.fontWeight = st.bold === null ? "" : st.bold ? "800" : "400";
    el.style.fontStyle = st.italic ? "italic" : "";
    el.style.textAlign = st.align;
    el.style.color = st.color;
    el.style.webkitTextFillColor = st.color ? st.color : "";
    if (st.color) el.style.backgroundImage = "none";
    else if (!st.fill) el.style.backgroundImage = "";
  }
  el.classList.toggle("is-hidden-el", st.hidden);
}

function formatCopyright(template, brand) {
  return String(template || "").replaceAll("{year}", String(new Date().getFullYear())).replaceAll("{name}", brand || "");
}

function defaultCopyright(landing) {
  return `© {year} ${landing.brandName || ""}. All rights reserved.`;
}

function applyLandingDesign(landing, { editing = false } = {}) {
  const styles = landing.styles && typeof landing.styles === "object" ? landing.styles : {};
  const copyright = landing.copyright ?? defaultCopyright(landing);
  els.landingFooterName.textContent = editing ? copyright : formatCopyright(copyright, landing.brandName);
  els.appCopyright.textContent = formatCopyright(copyright, landing.brandName);

  els.loginView.querySelectorAll("[data-edit-key]").forEach(el => {
    const key = el.dataset.editKey;
    const isBox = el.hasAttribute("data-edit-box");
    applyElementStyle(el, styles[key], { text: true, box: !isBox && !el.closest("[data-edit-box]") });
  });
  els.loginView.querySelectorAll("[data-edit-box]").forEach(el => {
    if (el.classList.contains("free-box")) return;
    applyElementStyle(el, styles[el.dataset.editBox], { text: false, box: true });
  });

  renderFreeBoxes(landing, editing);

  const theme = landing.theme || {};
  const bg1 = cleanColor(theme.bg1);
  const bg2 = cleanColor(theme.bg2);
  els.loginView.style.background = bg1 && bg2 ? `linear-gradient(160deg, ${bg1}, ${bg2})` : bg1 || bg2 || "";
  const accent = cleanColor(theme.accent);
  els.loginView.style.setProperty("--lp-accent", accent || "");
  els.loginView.style.setProperty("--lp-accent-dark", accent || "");
  els.loginView.style.fontFamily = FONT_STACKS[theme.font] || "";
  els.loginView.classList.toggle("plain-headline", theme.gradient === false);
}

function renderFreeBoxes(landing, editing) {
  const boxes = Array.isArray(landing.boxes) ? landing.boxes : [];
  els.landingBoxes.innerHTML = "";
  for (const box of boxes) {
    const el = document.createElement("div");
    el.className = "free-box";
    el.dataset.freeBox = box.id;
    el.dataset.editBox = `box:${box.id}`;
    el.dir = "auto";
    const x = Math.min(98, Math.max(0, Number(box.x) || 0));
    const y = Math.min(98, Math.max(0, Number(box.y) || 0));
    const w = Math.min(100, Math.max(4, Number(box.w) || 25));
    const h = Math.min(900, Math.max(24, Number(box.h) || 60));
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.width = `${w}%`;
    el.style.minHeight = `${h}px`;
    el.style.zIndex = String(Math.min(999, Math.max(1, Number(box.z) || 1)));
    const text = document.createElement("div");
    text.className = "free-box-text";
    text.textContent = String(box.text || "");
    el.appendChild(text);
    applyElementStyle(el, box.style, { text: true, box: true });
    if (editing) {
      for (const dir of ["nw", "ne", "sw", "se", "e", "w"]) {
        const handle = document.createElement("span");
        handle.className = `handle ${dir}`;
        handle.dataset.handle = dir;
        el.appendChild(handle);
      }
    }
    els.landingBoxes.appendChild(el);
  }
}

/* ---------------- Editor ---------------- */

function startDesigner() {
  if (currentUser?.role !== "admin") return;
  designer.active = true;
  designer.draft = structuredClone(normalizeLanding(state.settings.landing));
  designer.draft.styles ||= {};
  designer.draft.boxes ||= [];
  designer.draft.theme ||= {};
  designer.draft.copyright ??= defaultCopyright(designer.draft);
  designer.undo = [];
  designer.selected = null;
  els.appView.classList.add("hidden");
  els.loginView.classList.remove("hidden");
  els.loginView.classList.add("designing");
  els.designerBar.classList.remove("hidden");
  showAuthPanel("signin");
  renderDesigner();
  window.scrollTo({ top: 0 });
  showDesignerHint("Click any text to edit it. Drag text boxes to move them, pull the corners to resize.");
}

function stopDesigner() {
  designer.active = false;
  deselect();
  els.loginView.classList.remove("designing");
  els.designerBar.classList.add("hidden");
  els.dTheme.classList.add("hidden");
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  renderLanding();
  showView("admin");
  document.querySelector('[data-admin-section="landingAdmin"]')?.click();
}

async function saveDesigner() {
  commitEditingText();
  state.settings.landing = structuredClone(designer.draft);
  els.dSave.disabled = true;
  await saveSettings();
  els.dSave.disabled = false;
  stopDesigner();
}

function cancelDesigner() {
  if (designer.undo.length && !window.confirm("Discard your changes to the home page?")) return;
  stopDesigner();
}

function renderDesigner() {
  const keepKey = designer.selected?.key;
  renderLandingView(designer.draft);
  applyLandingDesign(designer.draft, { editing: true });
  syncThemeControls();
  designer.selected = null;
  if (keepKey) {
    const el = keepKey.startsWith("box:")
      ? els.landingBoxes.querySelector(`[data-edit-box="${keepKey}"]`)
      : els.loginView.querySelector(`[data-edit-key="${keepKey}"]`);
    if (el) select(el, { focusText: false });
  }
  if (!designer.selected) updateFormatBar();
}

function pushUndo() {
  const now = Date.now();
  if (now - (pushUndo.last || 0) < 400) return;
  pushUndo.last = now;
  designer.undo.push(JSON.stringify(designer.draft));
  if (designer.undo.length > 60) designer.undo.shift();
}

function undoDesigner() {
  const last = designer.undo.pop();
  if (!last) return showToast(t("Nothing to undo."));
  designer.draft = JSON.parse(last);
  renderDesigner();
}

function showDesignerHint(text) {
  let hint = document.querySelector(".designer-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "designer-hint";
    document.body.appendChild(hint);
  }
  hint.textContent = text;
  window.clearTimeout(showDesignerHint.timer);
  hint.style.display = "block";
  showDesignerHint.timer = window.setTimeout(() => { hint.style.display = "none"; }, 5000);
}

/* ---- selection ---- */
function selectionFor(el) {
  if (el.classList.contains("free-box")) {
    return { el, key: el.dataset.editBox, boxKey: el.dataset.editBox, kind: "free", boxEl: el };
  }
  const key = el.dataset.editKey;
  const boxEl = el.closest("[data-edit-box]") || el;
  return { el, key, boxKey: boxEl.dataset.editBox || key, kind: "text", boxEl };
}

function select(el, { focusText = true } = {}) {
  if (designer.selected?.el === el) return;
  deselect();
  designer.selected = selectionFor(el);
  el.classList.add("is-selected");
  if (designer.selected.boxEl !== el) designer.selected.boxEl.classList.add("is-selected");
  if (designer.selected.kind === "text" && focusText) startTextEdit(el);
  updateFormatBar();
}

function deselect() {
  commitEditingText();
  els.loginView.querySelectorAll(".is-selected").forEach(node => node.classList.remove("is-selected"));
  designer.selected = null;
  updateFormatBar();
}

function startTextEdit(el) {
  const target = el.classList.contains("free-box") ? el.querySelector(".free-box-text") : el;
  if (!target) return;
  pushUndo();
  try {
    target.contentEditable = "plaintext-only";
  } catch {
    target.contentEditable = "true";
  }
  if (target.contentEditable !== "plaintext-only") target.contentEditable = "true";
  if (el.classList.contains("free-box")) el.classList.add("editing");
  target.focus();
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  designer.editing = { el, target };
}

function commitEditingText() {
  const editing = designer.editing;
  if (!editing) return;
  designer.editing = null;
  const text = editing.target.innerText.replace(/\n$/, "");
  editing.target.removeAttribute("contenteditable");
  editing.el.classList.remove("editing");
  setDraftText(editing.el, text);
}

function setDraftText(el, text) {
  const draft = designer.draft;
  if (el.classList.contains("free-box")) {
    const box = draft.boxes.find(item => item.id === el.dataset.freeBox);
    if (box) box.text = text.slice(0, 2000);
    return;
  }
  const key = el.dataset.editKey;
  const value = text.slice(0, 1000);
  let match;
  if ((match = key.match(/^metric:(\d+):(value|label)$/))) draft.metrics[Number(match[1])][match[2]] = value;
  else if ((match = key.match(/^card:(\d+):(title|text)$/))) draft.cards[Number(match[1])][match[2]] = value;
  else draft[key] = value;
}

/* ---- format bar ---- */
function styleOf(key) {
  if (!key) return {};
  if (key.startsWith("box:")) return designer.draft.boxes.find(box => `box:${box.id}` === key)?.style || {};
  return designer.draft.styles[key] || {};
}

function setStyle(key, patch, { rerender = false } = {}) {
  if (!key) return;
  commitEditingText();
  pushUndo();
  if (key.startsWith("box:")) {
    const box = designer.draft.boxes.find(item => `box:${item.id}` === key);
    if (!box) return;
    box.style = { ...(box.style || {}), ...patch };
  } else {
    designer.draft.styles[key] = { ...(designer.draft.styles[key] || {}), ...patch };
  }
  if (rerender) renderDesigner();
  else {
    applyLandingDesign(designer.draft, { editing: true });
    reapplySelectionClasses();
  }
  updateFormatBar();
}

function reapplySelectionClasses() {
  const sel = designer.selected;
  if (!sel) return;
  if (sel.kind === "free") {
    // free boxes were re-rendered; find the new node
    const el = els.landingBoxes.querySelector(`[data-edit-box="${sel.key}"]`);
    if (el) {
      designer.selected = selectionFor(el);
      el.classList.add("is-selected");
    }
  } else {
    sel.el.classList.add("is-selected");
    sel.boxEl.classList.add("is-selected");
  }
}

function labelFor(sel) {
  if (!sel) return "Click any text or box to edit it";
  if (sel.kind === "free") return "Text box";
  const key = sel.key;
  if (/^metric:/.test(key)) return "Small box";
  if (/^card:/.test(key)) return "Card";
  return KEY_LABELS[key] || "Text";
}

function updateFormatBar() {
  const sel = designer.selected;
  els.dFormat.classList.toggle("disabled", !sel);
  els.dSelLabel.textContent = labelFor(sel);
  if (!sel) return;
  const textStyle = cleanStyle(styleOf(sel.key));
  const boxStyle = cleanStyle(styleOf(sel.boxKey));
  const computed = window.getComputedStyle(sel.kind === "free" ? sel.el : sel.el);
  els.dFont.value = textStyle.font || "";
  els.dSize.value = textStyle.size || Math.round(parseFloat(computed.fontSize));
  els.dBold.classList.toggle("on", textStyle.bold === true || (textStyle.bold === null && Number(computed.fontWeight) >= 700));
  els.dItalic.classList.toggle("on", textStyle.italic);
  document.querySelectorAll("[data-align]").forEach(button => button.classList.toggle("on", (textStyle.align || "") === button.dataset.align));
  els.dColor.value = textStyle.color || rgbToHex(computed.color) || "#ffffff";
  els.dFill.value = boxStyle.fill && boxStyle.fill !== "none" ? boxStyle.fill : rgbToHex(window.getComputedStyle(sel.boxEl).backgroundColor) || "#ffffff";
  els.dRadius.value = boxStyle.radius ?? (parseFloat(window.getComputedStyle(sel.boxEl).borderTopLeftRadius) || 0);
  const removable = sel.kind === "free" || /^(metric|card):/.test(sel.key);
  els.dHide.textContent = removable ? t("Delete") : textStyle.hidden ? t("Show") : t("Hide");
  els.dFront.classList.toggle("hidden", sel.kind !== "free");
  els.dBack.classList.toggle("hidden", sel.kind !== "free");
}

function rgbToHex(value) {
  const match = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!match || (match[4] !== undefined && Number(match[4]) === 0)) return "";
  return `#${[match[1], match[2], match[3]].map(n => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

function deleteOrHideSelected() {
  const sel = designer.selected;
  if (!sel) return;
  let match;
  if (sel.kind === "free") {
    pushUndo();
    designer.draft.boxes = designer.draft.boxes.filter(box => `box:${box.id}` !== sel.key);
    designer.selected = null;
    renderDesigner();
  } else if ((match = sel.key.match(/^(metric|card):(\d+)/))) {
    pushUndo();
    const [, kind, idx] = match;
    const list = kind === "metric" ? designer.draft.metrics : designer.draft.cards;
    list.splice(Number(idx), 1);
    shiftStyleKeys(kind, Number(idx));
    designer.selected = null;
    renderDesigner();
  } else {
    setStyle(sel.key, { hidden: !cleanStyle(styleOf(sel.key)).hidden });
  }
}

function shiftStyleKeys(kind, removed) {
  const styles = designer.draft.styles;
  const next = {};
  for (const [key, value] of Object.entries(styles)) {
    const match = key.match(new RegExp(`^${kind}:(\\d+)(.*)$`));
    if (!match) { next[key] = value; continue; }
    const i = Number(match[1]);
    if (i === removed) continue;
    next[`${kind}:${i > removed ? i - 1 : i}${match[2]}`] = value;
  }
  designer.draft.styles = next;
}

function addFreeBox() {
  pushUndo();
  const canvas = els.landingCanvas.getBoundingClientRect();
  const viewMid = window.innerHeight / 2 - canvas.top;
  const y = Math.min(90, Math.max(2, (viewMid / canvas.height) * 100 - 4));
  const id = crypto.randomUUID().slice(0, 8);
  const z = Math.max(1, ...designer.draft.boxes.map(box => Number(box.z) || 1)) + 1;
  designer.draft.boxes.push({ id, text: "New text", x: 36, y, w: 28, h: 60, z, style: { size: 24, bold: true, color: "#ffffff", fill: "#0f766e", radius: 12, align: "center" } });
  designer.selected = null;
  renderDesigner();
  const el = els.landingBoxes.querySelector(`[data-free-box="${id}"]`);
  if (el) {
    select(el);
    startTextEdit(el);
    document.execCommand?.("selectAll");
  }
}

function addMetric() {
  pushUndo();
  designer.draft.metrics.push({ value: "New", label: "Small box" });
  renderDesigner();
}

function addCard() {
  pushUndo();
  designer.draft.cards.push({ title: "New card", text: "Write the card text here." });
  renderDesigner();
}

function syncThemeControls() {
  const theme = designer.draft.theme || {};
  els.tBg1.value = cleanColor(theme.bg1) || "#0b2421";
  els.tBg2.value = cleanColor(theme.bg2) || "#132d4a";
  els.tAccent.value = cleanColor(theme.accent) || "#0f766e";
  els.tFont.value = FONT_STACKS[theme.font] ? theme.font : "";
  els.tGradient.checked = theme.gradient !== false;
}

function setTheme(patch) {
  commitEditingText();
  pushUndo();
  designer.draft.theme = { ...(designer.draft.theme || {}), ...patch };
  applyLandingDesign(designer.draft, { editing: true });
  reapplySelectionClasses();
}

/* ---- pointer: select, drag, resize ---- */
function onDesignerPointerDown(event) {
  if (!designer.active || event.button !== 0) return;
  if (event.target.closest("#designerBar")) return;
  const freeBox = event.target.closest(".free-box");
  if (freeBox) {
    if (freeBox.classList.contains("editing")) return;
    event.preventDefault();
    select(freeBox, { focusText: false });
    const handle = event.target.closest("[data-handle]")?.dataset.handle || null;
    const box = designer.draft.boxes.find(item => item.id === freeBox.dataset.freeBox);
    const canvas = els.landingCanvas.getBoundingClientRect();
    designer.drag = {
      el: freeBox, box, handle, canvas,
      startX: event.clientX, startY: event.clientY,
      orig: { x: Number(box.x) || 0, y: Number(box.y) || 0, w: Number(box.w) || 25, h: freeBox.offsetHeight },
      moved: false
    };
    freeBox.setPointerCapture?.(event.pointerId);
    return;
  }
  const editable = event.target.closest("[data-edit-key]");
  if (editable && els.loginView.contains(editable)) {
    if (designer.editing?.el === editable) return;
    event.preventDefault();
    select(editable);
    return;
  }
  if (els.loginView.contains(event.target)) deselect();
}

function onDesignerPointerMove(event) {
  const drag = designer.drag;
  if (!drag) return;
  const dxPx = event.clientX - drag.startX;
  const dyPx = event.clientY - drag.startY;
  if (!drag.moved && Math.abs(dxPx) + Math.abs(dyPx) < 3) return;
  if (!drag.moved) {
    pushUndo();
    drag.moved = true;
  }
  const dx = (dxPx / drag.canvas.width) * 100;
  const dy = (dyPx / drag.canvas.height) * 100;
  const { orig, box, el, handle } = drag;
  if (!handle) {
    box.x = clampPct(orig.x + dx, 0, 100 - orig.w);
    box.y = clampPct(orig.y + dy, 0, 98);
  } else {
    if (handle.includes("e")) box.w = clampPct(orig.w + dx, 4, 100 - orig.x);
    if (handle.includes("w")) {
      const w = clampPct(orig.w - dx, 4, orig.x + orig.w);
      box.x = orig.x + orig.w - w;
      box.w = w;
    }
    if (handle.includes("s")) box.h = Math.max(24, Math.round(orig.h + dyPx));
    if (handle.includes("n")) {
      const h = Math.max(24, Math.round(orig.h - dyPx));
      box.y = clampPct(orig.y + ((orig.h - h) / drag.canvas.height) * 100, 0, 98);
      box.h = h;
    }
  }
  el.style.left = `${box.x}%`;
  el.style.top = `${box.y}%`;
  el.style.width = `${box.w}%`;
  el.style.minHeight = `${box.h || orig.h}px`;
}

function onDesignerPointerUp() {
  designer.drag = null;
}

function clampPct(value, min, max) {
  return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
}

function onDesignerDoubleClick(event) {
  if (!designer.active) return;
  const freeBox = event.target.closest(".free-box");
  if (!freeBox) return;
  select(freeBox, { focusText: false });
  startTextEdit(freeBox);
}

function onDesignerKeyDown(event) {
  if (!designer.active) return;
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === "z" && !designer.editing) {
    event.preventDefault();
    undoDesigner();
    return;
  }
  if (mod && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveDesigner();
    return;
  }
  if (designer.editing) {
    if (event.key === "Escape") {
      event.preventDefault();
      commitEditingText();
    } else if (event.key === "Enter" && !event.shiftKey) {
      const key = designer.editing.el.dataset.editKey;
      const multiline = designer.editing.el.classList.contains("free-box") || MULTILINE_KEYS.test(key || "");
      if (!multiline) {
        event.preventDefault();
        commitEditingText();
      }
    }
    return;
  }
  const sel = designer.selected;
  if (!sel) return;
  if (event.key === "Escape") return deselect();
  if (sel.kind === "free" && (event.key === "Delete" || event.key === "Backspace")) {
    event.preventDefault();
    deleteOrHideSelected();
    return;
  }
  if (sel.kind === "free" && event.key.startsWith("Arrow")) {
    event.preventDefault();
    const box = designer.draft.boxes.find(item => `box:${item.id}` === sel.key);
    if (!box) return;
    pushUndo();
    const step = event.shiftKey ? 2 : 0.5;
    if (event.key === "ArrowLeft") box.x = clampPct(box.x - step, 0, 100 - box.w);
    if (event.key === "ArrowRight") box.x = clampPct(box.x + step, 0, 100 - box.w);
    if (event.key === "ArrowUp") box.y = clampPct(box.y - step, 0, 98);
    if (event.key === "ArrowDown") box.y = clampPct(box.y + step, 0, 98);
    sel.el.style.left = `${box.x}%`;
    sel.el.style.top = `${box.y}%`;
  }
}

function bindDesigner() {
  els.openDesigner.addEventListener("click", startDesigner);
  els.dSave.addEventListener("click", saveDesigner);
  els.dCancel.addEventListener("click", cancelDesigner);
  els.dUndo.addEventListener("click", undoDesigner);
  els.dAddBox.addEventListener("click", addFreeBox);
  els.dAddMetric.addEventListener("click", addMetric);
  els.dAddCard.addEventListener("click", addCard);
  els.dThemeBtn.addEventListener("click", () => {
    els.dTheme.classList.toggle("hidden");
    els.dThemeBtn.classList.toggle("on", !els.dTheme.classList.contains("hidden"));
  });
  els.dFont.addEventListener("change", () => setStyle(designer.selected?.key, { font: els.dFont.value }));
  els.dSize.addEventListener("change", () => setStyle(designer.selected?.key, { size: Number(els.dSize.value) || null }));
  els.dBold.addEventListener("click", () => setStyle(designer.selected?.key, { bold: !els.dBold.classList.contains("on") }));
  els.dItalic.addEventListener("click", () => setStyle(designer.selected?.key, { italic: !els.dItalic.classList.contains("on") }));
  document.querySelectorAll("[data-align]").forEach(button => button.addEventListener("click", () => setStyle(designer.selected?.key, { align: button.dataset.align })));
  els.dColor.addEventListener("input", () => setStyle(designer.selected?.key, { color: els.dColor.value }));
  els.dFill.addEventListener("input", () => setStyle(designer.selected?.boxKey, { fill: els.dFill.value }));
  els.dNoFill.addEventListener("click", () => setStyle(designer.selected?.boxKey, { fill: "none" }));
  els.dRadius.addEventListener("input", () => setStyle(designer.selected?.boxKey, { radius: Number(els.dRadius.value) }));
  els.dReset.addEventListener("click", () => {
    const sel = designer.selected;
    if (!sel) return;
    pushUndo();
    if (sel.kind === "free") {
      const box = designer.draft.boxes.find(item => `box:${item.id}` === sel.key);
      if (box) box.style = { size: 24, bold: true, color: "#ffffff", fill: "#0f766e", radius: 12, align: "center" };
    } else {
      delete designer.draft.styles[sel.key];
      if (sel.boxKey !== sel.key) delete designer.draft.styles[sel.boxKey];
    }
    renderDesigner();
  });
  els.dHide.addEventListener("click", deleteOrHideSelected);
  els.dFront.addEventListener("click", () => {
    const sel = designer.selected;
    const box = sel && designer.draft.boxes.find(item => `box:${item.id}` === sel.key);
    if (!box) return;
    pushUndo();
    box.z = Math.max(...designer.draft.boxes.map(item => Number(item.z) || 1)) + 1;
    renderDesigner();
  });
  els.dBack.addEventListener("click", () => {
    const sel = designer.selected;
    const box = sel && designer.draft.boxes.find(item => `box:${item.id}` === sel.key);
    if (!box) return;
    pushUndo();
    designer.draft.boxes.forEach(item => { item.z = (Number(item.z) || 1) + 1; });
    box.z = 1;
    renderDesigner();
  });
  els.tBg1.addEventListener("input", () => setTheme({ bg1: els.tBg1.value, bg2: els.tBg2.value }));
  els.tBg2.addEventListener("input", () => setTheme({ bg1: els.tBg1.value, bg2: els.tBg2.value }));
  els.tAccent.addEventListener("input", () => setTheme({ accent: els.tAccent.value }));
  els.tFont.addEventListener("change", () => setTheme({ font: els.tFont.value }));
  els.tGradient.addEventListener("change", () => setTheme({ gradient: els.tGradient.checked }));
  els.tReset.addEventListener("click", () => {
    pushUndo();
    designer.draft.theme = {};
    renderDesigner();
  });
  // Keep the format bar's own clicks from stealing the text selection.
  els.designerBar.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) event.preventDefault();
  });
  document.addEventListener("pointerdown", onDesignerPointerDown, true);
  document.addEventListener("pointermove", onDesignerPointerMove);
  document.addEventListener("pointerup", onDesignerPointerUp);
  document.addEventListener("dblclick", onDesignerDoubleClick);
  document.addEventListener("keydown", onDesignerKeyDown);
  els.loginView.addEventListener("click", event => {
    if (designer.active && event.target.closest("a, button, form") && !event.target.closest("#designerBar")) event.preventDefault();
  }, true);
}

async function lookupEmailForUsername(username) {
  const { data, error } = await supabase.rpc("email_for_username", { lookup: username });
  if (!error) return data || "";
  // Fallback for databases where migration 0002 has not been applied yet.
  const fallback = await supabase.from("profiles").select("email").eq("username", username).maybeSingle();
  return fallback.data?.email || "";
}

async function loadPublicLanding() {
  const { data, error } = await supabase.rpc("public_landing");
  if (error || !data || !Object.keys(data).length) return;
  state.settings.landing = normalizeLanding(data);
  renderLanding();
}

function setAuthTab(tab) {
  showAuthPanel(tab === "signup" ? "signup" : "signin");
}

function showPendingNotice(status) {
  showAuthPanel("pending");
  if (status === "reset-sent") {
    els.pendingTitle.textContent = t("Check your email");
    els.pendingText.textContent = t("If an account exists for that email, a link to choose a new password is on its way. The link opens this page.");
  } else if (status === "rejected") {
    els.pendingTitle.textContent = t("Access not available");
    els.pendingText.textContent = t("This account does not have access. Please contact the organizers if you think this is a mistake.");
  } else if (status === "confirm-email") {
    els.pendingTitle.textContent = t("Check your email");
    els.pendingText.textContent = t("We sent you a confirmation link. After confirming, your account will be reviewed by the organizers.");
  } else {
    els.pendingTitle.textContent = t("Waiting for approval");
    els.pendingText.textContent = t("Your account was created and is waiting for approval. You can sign in once an organizer approves it.");
  }
}

async function signUp(event) {
  event.preventDefault();
  const submit = els.signupForm.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const username = els.signupUsername.value.trim().toLowerCase();
    const taken = await lookupEmailForUsername(username);
    if (taken) {
      showToast(t("That username is already taken."));
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: els.signupEmail.value.trim(),
      password: els.signupPassword.value,
      options: {
        data: {
          full_name: els.signupFullName.value.trim(),
          username,
          discipline: els.signupDiscipline.value.trim(),
          university: els.signupUniversity.value.trim()
        }
      }
    });
    if (error) {
      showToast(error.message);
      return;
    }
    els.signupForm.reset();
    if (data.session) await supabase.auth.signOut();
    showPendingNotice(data.session ? "pending" : "confirm-email");
  } finally {
    submit.disabled = false;
  }
}

function showToast(message) {
  els.toast.textContent = t(message);
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3000);
}
