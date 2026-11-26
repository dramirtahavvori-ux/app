import { createClient } from "@supabase/supabase-js";

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
  landingHeroImage: $("landingHeroImage"),
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
  trainingReport: $("trainingReport")
};

const UPDATE_LABELS = { update: "Update", reminder: "Reminder", event: "Event", training: "Training" };
const VIEWS = ["report", "updates", "training", "profile", "presenter", "admin"];

boot();

async function boot() {
  els.todayText.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());

  renderLanding();
  bindEvents();
  await loadPublicLanding();
  window.setInterval(updateCountdown, 1000);

  const { data } = await supabase.auth.getSession();
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
    state.settings.landing.heroImage = "";
    els.landingHeroImageData.value = "";
    renderLanding();
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
      showToast("No account found for that username.");
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
    showToast("Your account does not have a profile yet. Please contact the organizers.");
    return;
  }

  const status = profile.status || "approved";
  if (status !== "approved") {
    await supabase.auth.signOut();
    showPendingNotice(status);
    return;
  }

  currentUser = normalizeProfile(profile);
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.adminTab.classList.toggle("hidden", currentUser.role !== "admin");
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
  renderLanding();
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
  els.landingBrandName.textContent = landing.brandName || "";
  document.title = landing.brandName || "NephroRounds Studio";
  els.appShellName.textContent = landing.brandName || "NephroRounds";
  els.landingBrandTagline.textContent = landing.brandTagline || "";
  els.landingFooterName.textContent = `© ${new Date().getFullYear()} ${landing.brandName || ""}`;
  els.landingLoginHeadline.textContent = landing.loginHeadline || "";
  els.landingLoginLead.textContent = landing.loginLead || "";
  els.landingHeroBadge.textContent = landing.heroBadge || "";
  els.landingHeroHeadline.textContent = landing.heroHeadline || "";
  els.landingMetrics.innerHTML = landing.metrics.map(item => `<div class="metric"><b>${escapeHtml(item.value)}</b><span>${escapeHtml(item.label)}</span></div>`).join("");
  els.landingMetrics.classList.toggle("hidden", landing.metrics.length === 0);
  els.landingCards.innerHTML = landing.cards.map(item => `<div class="mini-card"><strong>${escapeHtml(item.title)}</strong><p class="hint">${escapeHtml(item.text)}</p></div>`).join("");
  els.landingCards.classList.toggle("hidden", landing.cards.length === 0);
  applyLandingHeroImage(landing);
  els.landingHeroImage.alt = landing.heroHeadline || "Landing hero image";
  els.adminLandingBrandName.value = landing.brandName || "";
  els.adminLandingBrandTagline.value = landing.brandTagline || "";
  els.adminLandingLoginHeadline.value = landing.loginHeadline || "";
  els.adminLandingLoginLead.value = landing.loginLead || "";
  els.adminLandingHeroBadge.value = landing.heroBadge || "";
  els.adminLandingHeroHeadline.value = landing.heroHeadline || "";
  els.landingHeroImageData.value = landing.heroImage || "";
  renderLandingMetricsAdmin(landing.metrics);
  renderLandingCardsAdmin(landing.cards);
}

function applyLandingHeroImage(landing) {
  const image = document.getElementById("landingHeroImage");
  if (!image) return;
  const src = landing?.heroImage || "";
  image.classList.toggle("hidden", !src);
  if (src) {
    image.src = src;
  } else {
    image.removeAttribute("src");
  }
}

function renderLandingMetricsAdmin(metrics) {
  els.landingMetricsAdminList.innerHTML = metrics.length
    ? metrics.map((item, index) => `
      <article class="editable-row">
        <div class="form-grid">
          <div class="field"><label>Big text</label><input data-landing-metric-value="${index}" value="${escapeHtml(item.value)}"></div>
          <div class="field"><label>Small text</label><input data-landing-metric-label="${index}" value="${escapeHtml(item.label)}"></div>
        </div>
        <div class="row-actions"><button class="btn warn small" type="button" data-remove-landing-metric="${index}">Remove</button></div>
      </article>`).join("")
    : `<div class="empty-state">No small boxes. Click Add small box if you want one.</div>`;
}

function renderLandingCardsAdmin(cards) {
  els.landingCardsAdminList.innerHTML = cards.length
    ? cards.map((item, index) => `
      <article class="editable-row">
        <div class="form-grid">
          <div class="field"><label>Card title</label><input data-landing-card-title="${index}" value="${escapeHtml(item.title)}"></div>
          <div class="field"><label>Card text</label><input data-landing-card-text="${index}" value="${escapeHtml(item.text)}"></div>
        </div>
        <div class="row-actions"><button class="btn warn small" type="button" data-remove-landing-card="${index}">Remove</button></div>
      </article>`).join("")
    : `<div class="empty-state">No right-side cards. Click Add card if you want one.</div>`;
}

function renderMeeting() {
  const meeting = state.settings.meeting;
  els.reportHeading.textContent = meeting.reportHeading || "Morning Report";
  els.reportSubheading.textContent = meeting.reportSubheading || "";
  els.meetingTitle.textContent = meeting.title || "Meeting details";
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
  els.notificationTitle.textContent = "Session reminders";
  if (!start) {
    els.notificationText.textContent = "Reminders will be available once the next session is on the schedule.";
    return;
  }
  const minutes = Math.round((start.getTime() - Date.now()) / 60000);
  if (minutes < 0) {
    els.notificationTitle.textContent = "Session in progress";
    els.notificationText.textContent = "Join video to take part now.";
  } else if (minutes <= 15) {
    els.notificationTitle.textContent = "Starting soon";
    els.notificationText.textContent = `The next session starts in about ${minutes} minutes. Join video when ready.`;
  } else {
    els.notificationText.textContent = "Add sessions to your phone or computer calendar to get a reminder the day before and 15 minutes before each one.";
  }
}

function renderSchedule() {
  if (!state.schedule.length) {
    els.schedule.innerHTML = `<div class="empty-state">No schedule items yet.</div>`;
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
  els.presenters.innerHTML = presenters.length ? presenters.map(renderPersonCard).join("") : `<div class="empty-state">No presenters yet.</div>`;
  els.guests.innerHTML = guests.length ? guests.map(renderPersonCard).join("") : `<div class="empty-state">No guests yet.</div>`;
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
  els.submitAnswers.textContent = locked ? "Answers submitted" : "Submit answers";
  els.submitState.textContent = locked ? "Submitted" : "Awaiting response";
  if (!state.questions.length) {
    els.questions.innerHTML = `<div class="empty-state">No questions have been added for this round.</div>`;
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
      <div class="reason-box"><label for="reason-${question.id}">Reason for your choice</label>${saved ? `<div class="locked-reason">${escapeHtml(answer.reason || "No reason provided")}</div>` : `<textarea id="reason-${question.id}" data-reason-question="${question.id}" placeholder="Briefly explain why you selected this answer.">${escapeHtml(answer.reason || "")}</textarea>`}</div>`;
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
    ? state.liveMessages.map(message => `<article class="chat-message"><strong>${escapeHtml(message.profiles?.full_name || "Participant")} <span class="hint">| ${escapeHtml(formatDate(message.created_at))}</span></strong><div>${escapeHtml(message.body)}</div></article>`).join("")
    : `<div class="empty-state">No live questions yet.</div>`;
  const request = state.handRaises.find(item => item.user_id === currentUser?.id);
  if (!request) {
    els.handRaiseStatus.textContent = "No request";
    els.raiseHandBtn.disabled = false;
    els.raiseHandBtn.textContent = "Request to speak";
  } else if (request.status === "pending") {
    els.handRaiseStatus.textContent = "Waiting for approval";
    els.raiseHandBtn.disabled = true;
    els.raiseHandBtn.textContent = "Request pending";
  } else {
    els.handRaiseStatus.textContent = request.status === "approved" ? "Approved to speak" : "Request declined";
    els.raiseHandBtn.disabled = false;
    els.raiseHandBtn.textContent = "Request again";
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
  els.userMicToggle.textContent = micBlocked ? "Mic muted by admin" : localMedia.mic ? "Turn mic off" : "Turn mic on";
  els.userCameraToggle.textContent = cameraBlocked ? "Camera blocked by admin" : localMedia.camera ? "Turn camera off" : "Turn camera on";
  els.mediaAccessLabel.textContent = micBlocked || cameraBlocked ? "Admin controlled" : "Ready";
  els.mediaStatus.textContent = localMedia.status;
  els.localMediaPreview.classList.toggle("hidden", !localMedia.camera);
}

function renderPresenterSlides() {
  if (!currentUser || currentUser.role !== "presenter") return;
  if (!state.schedule.length) {
    els.presenterSlidesList.innerHTML = `<div class="empty-state">No sessions have been scheduled yet.</div>`;
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
  els.presentingStatus.textContent = presenterMode.presenting ? "Live presenting" : "Not presenting";
  els.presentingToggle.textContent = presenterMode.presenting ? "Stop presenting" : "Start presenting";
  els.presenterMicToggle.textContent = presenterMode.mic ? "Mic on" : "Mic off";
  els.presenterCameraToggle.textContent = presenterMode.camera ? "Camera on" : "Camera off";
  els.presenterBackground.value = presenterMode.background;
  els.presenterPreview.classList.toggle("blur-bg", presenterMode.background === "blur");
  els.presenterPreview.classList.toggle("kidney-bg", presenterMode.background === "kidney");
  els.presenterPreview.classList.toggle("conference-bg", presenterMode.background === "conference");
  els.presenterPreviewText.textContent = presenterMode.camera ? `${currentUser?.name || "Presenter"} camera preview` : "Camera preview off";
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
    <article class="editable-row"><div><strong>${escapeHtml(item.topic)}</strong><p class="hint">${formatScheduleDate(item.date)} | ${escapeHtml(formatTimeRange(item))}<br>${escapeHtml(item.notes || "")}${item.slidesUrl || item.slidesData ? "<br>Slides attached" : ""}${item.recordingUrl || item.recordingData ? "<br>Recording attached" : ""}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-schedule="${item.id}">Edit</button><button class="btn warn small" type="button" data-remove-schedule="${item.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">No schedule items yet.</div>`;
  els.scheduleAdminList.querySelectorAll("[data-edit-schedule]").forEach(button => button.addEventListener("click", () => editSchedule(button.dataset.editSchedule)));
  els.scheduleAdminList.querySelectorAll("[data-remove-schedule]").forEach(button => button.addEventListener("click", () => deleteRow("schedules", button.dataset.removeSchedule)));
}

function renderPeopleAdmin() {
  els.peopleAdminList.innerHTML = state.people.length ? state.people.map(person => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(person)}<div><strong>${escapeHtml(person.name)}</strong><p class="hint">${escapeHtml(person.type)} | ${escapeHtml(person.role)}<br>${escapeHtml(person.institution)}${person.location ? ` | ${escapeHtml(person.location)}` : ""}<br>${escapeHtml(person.introduction || "")}</p></div></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-person="${person.id}">Edit</button><button class="btn warn small" type="button" data-remove-person="${person.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">No people yet.</div>`;
  els.peopleAdminList.querySelectorAll("[data-edit-person]").forEach(button => button.addEventListener("click", () => editPerson(button.dataset.editPerson)));
  els.peopleAdminList.querySelectorAll("[data-remove-person]").forEach(button => button.addEventListener("click", () => deleteRow("people", button.dataset.removePerson)));
}

function renderQuestionsAdmin() {
  els.questionsAdminList.innerHTML = state.questions.length ? state.questions.map(question => `
    <article class="editable-row"><div><strong>${escapeHtml(question.text)}</strong><p class="hint">${question.options.map(escapeHtml).join(", ")}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-question="${question.id}">Edit</button><button class="btn warn small" type="button" data-remove-question="${question.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">No questions yet.</div>`;
  els.questionsAdminList.querySelectorAll("[data-edit-question]").forEach(button => button.addEventListener("click", () => editQuestion(button.dataset.editQuestion)));
  els.questionsAdminList.querySelectorAll("[data-remove-question]").forEach(button => button.addEventListener("click", () => deleteRow("questions", button.dataset.removeQuestion)));
}

function renderUsersAdmin() {
  const pending = state.users.filter(user => user.status === "pending");
  els.pendingCount.textContent = String(pending.length);
  els.pendingUsersList.innerHTML = pending.length ? pending.map(user => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><p class="hint">Username: ${escapeHtml(user.username)}<br>Email: ${escapeHtml(user.email || "No email")}<br>${escapeHtml(user.discipline || "")}${user.university ? ` | ${escapeHtml(user.university)}` : ""}</p></div></div><div class="row-actions">
      <select data-approve-role="${user.id}" aria-label="Access level"><option value="user">Clinician / attendee</option><option value="presenter">Presenter / speaker</option><option value="admin">Admin / panelist</option></select>
      <button class="btn small" type="button" data-approve-user="${user.id}">Approve</button>
      <button class="btn warn small" type="button" data-reject-user="${user.id}">Reject</button>
    </div></article>`).join("") : `<div class="empty-state">No one is waiting for approval.</div>`;
  els.pendingUsersList.querySelectorAll("[data-approve-user]").forEach(button => button.addEventListener("click", () => {
    const role = els.pendingUsersList.querySelector(`[data-approve-role="${button.dataset.approveUser}"]`)?.value || "user";
    setUserAccess(button.dataset.approveUser, "approved", role);
  }));
  els.pendingUsersList.querySelectorAll("[data-reject-user]").forEach(button => button.addEventListener("click", () => setUserAccess(button.dataset.rejectUser, "rejected")));

  const others = state.users.filter(user => user.status !== "pending");
  els.usersAdminList.innerHTML = others.length ? others.map(user => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><p class="hint">Username: ${escapeHtml(user.username)}<br>Email: ${escapeHtml(user.email || "No email")}<br>Access: ${escapeHtml(getRoleLabel(user.role))}${user.status === "rejected" ? " (blocked)" : ""}<br>${escapeHtml(user.discipline || "")}${user.university ? ` | ${escapeHtml(user.university)}` : ""}</p></div></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-user="${user.id}">Edit profile</button></div></article>`).join("") : `<div class="empty-state">No users yet.</div>`;
  els.usersAdminList.querySelectorAll("[data-edit-user]").forEach(button => button.addEventListener("click", () => editUser(button.dataset.editUser)));
}

async function setUserAccess(id, status, role) {
  if (id === currentUser?.id) return showToast("You cannot change your own access.");
  const payload = { status };
  if (role) payload.role = role;
  const { error } = await supabase.from("profiles").update(payload).eq("id", id);
  if (error) return showToast(error.message);
  await loadSharedData();
  renderAll();
  showToast(status === "approved" ? "Account approved." : "Account rejected.");
}

function renderLiveRoomAdmin() {
  const mediaUsers = state.users.filter(user => user.role !== "admin");
  els.liveRoomAdminList.innerHTML = `
    <article class="editable-row"><div><strong>Hand-raise requests</strong><p class="hint">${state.handRaises.filter(item => item.status === "pending").length} waiting for approval</p></div><button class="btn secondary small" type="button" data-clear-live-room="all">Clear live room</button></article>
    ${state.handRaises.length ? state.handRaises.map(request => `<article class="editable-row"><div><strong>${escapeHtml(request.profiles?.full_name || "Participant")}</strong><p class="hint">Status: ${escapeHtml(request.status)} | ${escapeHtml(formatDate(request.created_at))}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-hand-raise="${request.id}" data-hand-status="approved">Approve</button><button class="btn warn small" type="button" data-hand-raise="${request.id}" data-hand-status="declined">Decline</button></div></article>`).join("") : `<div class="empty-state">No hand-raise requests yet.</div>`}
    <article class="editable-row"><div><strong>Live questions</strong><p class="hint">${state.liveMessages.length} question${state.liveMessages.length === 1 ? "" : "s"} received</p></div></article>
    ${state.liveMessages.length ? state.liveMessages.map(message => `<article class="chat-message"><strong>${escapeHtml(message.profiles?.full_name || "Participant")} <span class="hint">| ${escapeHtml(formatDate(message.created_at))}</span></strong><div>${escapeHtml(message.body)}</div></article>`).join("") : `<div class="empty-state">No live questions yet.</div>`}
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
    els.thankYouList.innerHTML = `<div class="empty-state">Add a schedule item before generating thank-you cards.</div>`;
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
    els.answersTable.innerHTML = `<div class="empty-state">No responses submitted yet.</div>`;
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
  state.settings.landing = {
    brandName: els.adminLandingBrandName.value.trim(),
    brandTagline: els.adminLandingBrandTagline.value.trim(),
    loginHeadline: els.adminLandingLoginHeadline.value.trim(),
    loginLead: els.adminLandingLoginLead.value.trim(),
    heroBadge: els.adminLandingHeroBadge.value.trim(),
    heroHeadline: els.adminLandingHeroHeadline.value.trim(),
    heroImage: els.landingHeroImageData.value || state.settings.landing.heroImage || "",
    metrics: readLandingMetricsFromAdmin(),
    cards: readLandingCardsFromAdmin()
  };
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
  showToast("Saved to Supabase.");
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
    showToast("Choose a user from the list below to edit. New people create their own account from the home page.");
    return;
  }
  if (els.userId.value === currentUser?.id && (els.userRole.value !== currentUser.role || els.userStatus.value !== "approved")) {
    showToast("You cannot change your own access level or status.");
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
  showToast("Profile saved.");
}

async function submitAnswers() {
  if (!currentUser) return;
  const missing = state.questions.some(question => {
    const answer = normalizeAnswer(draftAnswers[question.id]);
    return !answer.choice || !answer.reason.trim();
  });
  if (missing) return showToast("Please select an answer and write a reason for every question.");
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
  if (!text) return showToast("Write a question first.");
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

async function uploadLandingHero() {
  const url = await uploadFile(els.adminLandingHeroImage.files[0], "public-images", "landing");
  if (url) {
    els.landingHeroImageData.value = url;
    state.settings.landing = {
      brandName: els.adminLandingBrandName.value.trim(),
      brandTagline: els.adminLandingBrandTagline.value.trim(),
      loginHeadline: els.adminLandingLoginHeadline.value.trim(),
      loginLead: els.adminLandingLoginLead.value.trim(),
      heroBadge: els.adminLandingHeroBadge.value.trim(),
      heroHeadline: els.adminLandingHeroHeadline.value.trim(),
      heroImage: url,
      metrics: readLandingMetricsFromAdmin(),
      cards: readLandingCardsFromAdmin()
    };
    applyLandingHeroImage(state.settings.landing);
    await saveSettings();
  }
}

async function uploadPersonPhoto() {
  const url = await uploadFile(els.personPhoto.files[0], "public-images", "people");
  if (url) els.personPhotoData.value = url;
}

async function uploadProfilePhoto() {
  const url = await uploadFile(els.profilePhoto.files[0], "public-images", "profiles");
  if (url) els.profilePhotoData.value = url;
}

async function uploadUserPhoto() {
  const url = await uploadFile(els.userPhoto.files[0], "public-images", "profiles");
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
    showToast("Video meeting link copied.");
  } catch {
    showToast("Copy failed.");
  }
}

async function setLocalMedia({ mic, camera }) {
  const controls = getMediaControl(currentUser.id);
  if (mic && controls.mic_allowed === false) return showToast("Admin has muted your microphone.");
  if (camera && controls.camera_allowed === false) return showToast("Admin has blocked your camera.");
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
    showToast("Camera/microphone permission failed.");
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
  if (!start || start.getTime() < Date.now()) return showToast("There is no upcoming session to remind you about.");
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
  showToast("Reminder set while this page is open. For a reminder on your phone, use \"Add to my calendar\".");
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
    cards: Array.isArray(landing.cards) ? landing.cards : defaults.landing.cards
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
  return `<button class="recording-link slides-link" type="button" data-view-slides="${item.id}">View slides</button>`;
}

function renderRecordingButton(item) {
  const href = item.recordingUrl || item.recordingData || "";
  if (!href) return "";
  const safe = safeUrl(href);
  if (!safe) return "";
  return `<a class="recording-link" href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">Watch recording</a>`;
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
  if (role === "admin") return "Administrator";
  if (role === "presenter") return "Presenter";
  return "Clinician";
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
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatTimeRange(item) {
  if (!item.time) return "No time";
  return item.endTime ? `${item.time} - ${item.endTime}` : item.time;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
        <span class="tag ${category}">${UPDATE_LABELS[category]}</span>
        ${item.pinned ? `<span class="tag pin">Pinned</span>` : ""}
        ${!compact && isUnread(item) ? `<span class="tag">New</span>` : ""}
      </div>
      <small class="hint">${formatRelative(item.created_at)}</small>
    </div>
    <h4>${escapeHtml(item.title)}</h4>
    ${item.body ? `<p>${escapeHtml(compact && item.body.length > 220 ? `${item.body.slice(0, 220)}…` : item.body)}</p>` : ""}
    ${link ? `<a class="update-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Open link →</a>` : ""}
  </article>`;
}

function renderUpdates() {
  const filter = state.updateFilter || "all";
  const items = visibleUpdates().filter(item => filter === "all" || (item.category || "update") === filter);
  els.updatesList.innerHTML = items.length
    ? items.map(item => renderUpdateCard(item)).join("")
    : `<div class="empty-state">No ${filter === "all" ? "updates" : `${UPDATE_LABELS[filter].toLowerCase()}s`} yet.</div>`;
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
  showToast(`New ${UPDATE_LABELS[first.category] ? UPDATE_LABELS[first.category].toLowerCase() : "update"}: ${first.title}`);
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification(first.title, { body: first.body?.slice(0, 140) || "" });
  }
}

function renderUpdatesAdmin() {
  const items = [...state.announcements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  els.updatesAdminList.innerHTML = items.length ? items.map(item => `
    <article class="editable-row"><div><span class="tag ${escapeHtml(item.category || "update")}">${UPDATE_LABELS[item.category] || "Update"}</span>${item.pinned ? ` <span class="tag pin">Pinned</span>` : ""}${item.active === false ? ` <span class="tag">Hidden</span>` : ""}<br><strong>${escapeHtml(item.title)}</strong><p class="hint">${formatDate(item.created_at)}<br>${escapeHtml((item.body || "").slice(0, 160))}</p></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-update="${item.id}">Edit</button><button class="btn warn small" type="button" data-remove-update="${item.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">Nothing published yet.</div>`;
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
  showToast("Published.");
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
    els.nextSessionCountdown.innerHTML = `<div><b>Live</b><span>now</span></div>`;
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const parts = days > 0
    ? [[days, "days"], [hours, "hrs"], [minutes, "min"]]
    : [[hours, "hrs"], [minutes, "min"], [seconds, "sec"]];
  els.nextSessionCountdown.innerHTML = parts.map(([value, label]) => `<div><b>${String(value).padStart(2, "0")}</b><span>${label}</span></div>`).join("");
}

function calendarButtons(item) {
  if (!sessionStart(item)) return "";
  return `<div class="calendar-actions">
    <a class="recording-link" href="${escapeHtml(googleCalendarUrl(item))}" target="_blank" rel="noreferrer">+ Google Calendar</a>
    <button class="recording-link" type="button" data-ics="${item.id}">+ Apple / Outlook</button>
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
  if (!items.length) return showToast("There are no upcoming sessions to add.");
  const blob = new Blob([buildIcs(items)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast("Calendar file ready. Open it to add the reminder to your calendar.");
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
    [programs.length, "Programs available"],
    [inProgress, "In progress"],
    [completed, "Completed"],
    [lessonsDone, "Lessons finished"],
    [minutes ? `${Math.round(minutes / 6) / 10} h` : "0 h", "Learning time"]
  ].map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("");

  if (!state.trainingReady) {
    els.trainingPrograms.innerHTML = `<div class="empty-state">Training programs will appear here soon.</div>`;
    return;
  }
  els.trainingPrograms.innerHTML = programs.length ? programs.map(program => {
    const progress = programProgress(program.id);
    const cover = safeUrl(program.cover_url);
    return `<button class="program-card" type="button" data-open-program="${program.id}">
      <div class="program-cover" style="${cover ? `background-image: url('${escapeHtml(cover)}')` : ""}">${cover ? "" : escapeHtml(getInitials(program.title.replace(/[^\p{L}\p{N}\s]/gu, " ")))}</div>
      <div class="program-body">
        <div>${program.level ? `<span class="tag">${escapeHtml(program.level)}</span>` : ""}${program.active === false ? ` <span class="tag">Draft</span>` : ""}</div>
        <strong>${escapeHtml(program.title)}</strong>
        <p class="hint">${escapeHtml((program.summary || "").slice(0, 140))}</p>
        <div class="progress-bar"><i style="width: ${progress.percent}%"></i></div>
        <div class="progress-meta"><span>${progress.done}/${progress.total} lessons</span><span>${progress.total && progress.done === progress.total ? "Completed ✓" : `${progress.percent}%`}</span></div>
      </div>
    </button>`;
  }).join("") : `<div class="empty-state">No training programs yet.</div>`;
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
  els.programLevel.textContent = program.level || "Program";
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
        <span><strong>${escapeHtml(lesson.title)}</strong><br><small class="hint">${lesson.duration_minutes ? `${lesson.duration_minutes} min` : ""}</small></span>
        <span class="tag">${done ? "Done" : "To do"}</span>
      </summary>
      <div class="lesson-content">
        ${video}
        ${lesson.body ? `<p>${escapeHtml(lesson.body)}</p>` : ""}
        ${resource ? `<a class="recording-link" href="${escapeHtml(resource)}" target="_blank" rel="noreferrer">Open ${escapeHtml(lesson.resource_name || "resource")}</a>` : ""}
        <div><button class="btn ${done ? "secondary" : ""}" type="button" data-toggle-lesson="${lesson.id}">${done ? "Mark as not done" : "Mark as complete"}</button></div>
      </div>
    </details>`;
  }).join("") : `<div class="empty-state">Lessons will be added soon.</div>`;
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
    showToast("Program completed! Your certificate is ready.");
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
  return `<a class="recording-link" href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">Watch video</a>`;
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
  if (!win) return showToast("Allow pop-ups to open the certificate.");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificate – ${escapeHtml(program.title)}</title>
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
  <button class="print" onclick="window.print()">Print / Save as PDF</button>
  <div class="cert">
    <div class="brand">${escapeHtml(brand)}</div>
    <h1>Certificate of Completion</h1>
    <p class="lead">This certifies that</p>
    <div class="name">${escapeHtml(currentUser.name)}</div>
    <p class="lead">has successfully completed the training program</p>
    <p class="program">${escapeHtml(program.title)}</p>
    <div class="meta">
      <div><b>${new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(finished)}</b>Date completed</div>
      <div><b>${lessons.length} lessons${minutes ? ` · ${minutes} min` : ""}</b>Program length</div>
      <div><b>${escapeHtml([currentUser.discipline, currentUser.university].filter(Boolean).join(", ") || "—")}</b>Participant</div>
    </div>
  </div></body></html>`);
  win.document.close();
}

/* ---- Training admin ---- */
function renderTrainingAdmin() {
  if (!state.trainingReady) {
    els.programsAdminList.innerHTML = `<div class="empty-state">Run database update 0003 in Supabase to enable training programs.</div>`;
    els.trainingReport.innerHTML = "";
    return;
  }
  els.programsAdminList.innerHTML = state.programs.length ? state.programs.map(program => `
    <article class="editable-row"><div><strong>${escapeHtml(program.title)}</strong> ${program.active === false ? `<span class="tag">Draft</span>` : ""}<p class="hint">${lessonsFor(program.id).length} lessons · ${escapeHtml(program.level || "No level")} · Visible to: ${escapeHtml(audienceLabel(program.audience))}</p></div>
    <div class="row-actions"><button class="btn small" type="button" data-lessons-program="${program.id}">Lessons</button><button class="btn secondary small" type="button" data-edit-program="${program.id}">Edit</button><button class="btn warn small" type="button" data-remove-program="${program.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">No programs yet. Create the first one above.</div>`;
  els.programsAdminList.querySelectorAll("[data-lessons-program]").forEach(button => button.addEventListener("click", () => openLessonsAdmin(button.dataset.lessonsProgram)));
  els.programsAdminList.querySelectorAll("[data-edit-program]").forEach(button => button.addEventListener("click", () => editProgram(button.dataset.editProgram)));
  els.programsAdminList.querySelectorAll("[data-remove-program]").forEach(button => button.addEventListener("click", () => confirmDelete("training_programs", button.dataset.removeProgram, "this program and all its lessons")));

  if (state.adminProgramId && state.programs.some(program => program.id === state.adminProgramId)) renderLessonsAdmin();
  else els.lessonsAdmin.classList.add("hidden");

  const learners = state.users.filter(user => user.status === "approved");
  if (!state.programs.length || !learners.length) {
    els.trainingReport.innerHTML = `<div class="empty-state">Progress will appear here once people start learning.</div>`;
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
  showToast(isNew ? "Program created. Now add lessons." : "Program saved.");
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
    <div class="row-actions"><button class="btn secondary small" type="button" data-edit-lesson="${lesson.id}">Edit</button><button class="btn warn small" type="button" data-remove-lesson="${lesson.id}">Remove</button></div></article>`).join("") : `<div class="empty-state">No lessons yet.</div>`;
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
  showToast("Lesson saved.");
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
  const url = await uploadFile(els.programCover.files[0], "public-images", "training");
  if (url) {
    els.programCoverData.value = url;
    showToast("Cover uploaded. Save the program to apply it.");
  }
}

async function uploadLessonResource() {
  const file = els.lessonResourceFile.files[0];
  const url = await uploadFile(file, "presenter-slides", "training");
  if (url) {
    els.lessonResourceData.value = url;
    els.lessonResourceUrl.value = url;
    els.lessonResourceName.value = file.name;
    showToast("File uploaded. Save the lesson to attach it.");
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
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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
  const signup = tab === "signup";
  els.loginForm.classList.toggle("hidden", signup);
  els.signupForm.classList.toggle("hidden", !signup);
  els.pendingNotice.classList.add("hidden");
  document.querySelectorAll(".auth-tabs [data-auth-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.authTab === tab);
  });
}

function showPendingNotice(status) {
  els.loginForm.classList.add("hidden");
  els.signupForm.classList.add("hidden");
  els.pendingNotice.classList.remove("hidden");
  if (status === "rejected") {
    els.pendingTitle.textContent = "Access not available";
    els.pendingText.textContent = "This account does not have access. Please contact the organizers if you think this is a mistake.";
  } else if (status === "confirm-email") {
    els.pendingTitle.textContent = "Check your email";
    els.pendingText.textContent = "We sent you a confirmation link. After confirming, your account will be reviewed by the organizers.";
  } else {
    els.pendingTitle.textContent = "Waiting for approval";
    els.pendingText.textContent = "Your account was created and is waiting for approval. You can sign in once an organizer approves it.";
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
      showToast("That username is already taken.");
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
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3000);
}
