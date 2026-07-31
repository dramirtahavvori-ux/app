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
    heroImage: "",
    metrics: [
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
  mediaControls: []
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
  resetDemo: $("resetDemo"),
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
  clearLandingHeroImage: $("clearLandingHeroImage")
};

boot();

async function boot() {
  els.todayText.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());

  renderLanding();
  bindEvents();

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await hydrateSession(data.session.user);
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", signIn);
  els.logoutBtn.addEventListener("click", signOut);
  els.reportTab.addEventListener("click", showReport);
  els.profileTab.addEventListener("click", showProfile);
  els.presenterTab.addEventListener("click", showPresenter);
  els.adminTab.addEventListener("click", showAdmin);
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
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", identifier)
      .maybeSingle();
    if (error || !data?.email) {
      showToast("No Supabase profile found for that username.");
      return;
    }
    email = data.email;
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
    showToast("Your auth user does not have a profile row.");
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
}

let subscribed = false;
function subscribeToSharedData() {
  if (subscribed) return;
  subscribed = true;
  supabase
    .channel("nephrorounds-shared-data")
    .on("postgres_changes", { event: "*", schema: "public" }, async () => {
      await loadSharedData();
      renderAll();
    })
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
  const start = getMeetingStartDate();
  if (!start) {
    els.notificationTitle.textContent = "15-minute meeting reminder";
    els.notificationText.textContent = "Add a meeting time like 08:30 - 09:00 to enable the reminder.";
    return;
  }
  const minutes = Math.round((start.getTime() - Date.now()) / 60000);
  if (minutes > 15) {
    els.notificationTitle.textContent = "15-minute meeting reminder";
    els.notificationText.textContent = `Round starts in about ${minutes} minutes. Enable reminders to be notified 15 minutes before start.`;
  } else if (minutes >= 0) {
    els.notificationTitle.textContent = "Round starting soon";
    els.notificationText.textContent = `The meeting starts in about ${minutes} minutes. Join video when ready.`;
  } else {
    els.notificationTitle.textContent = "Round time has passed";
    els.notificationText.textContent = "Update the meeting time in Admin Console for the next round reminder.";
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
  els.usersAdminList.innerHTML = state.users.length ? state.users.map(user => `
    <article class="editable-row"><div class="person-card" style="border: 0; padding: 0; background: transparent;">${renderAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><p class="hint">Username: ${escapeHtml(user.username)}<br>Email: ${escapeHtml(user.email || "No email")}<br>Access: ${escapeHtml(getRoleLabel(user.role))}<br>${escapeHtml(user.discipline || "")}${user.university ? ` | ${escapeHtml(user.university)}` : ""}</p></div></div><div class="row-actions"><button class="btn secondary small" type="button" data-edit-user="${user.id}">Edit profile</button></div></article>`).join("") : `<div class="empty-state">No users yet.</div>`;
  els.usersAdminList.querySelectorAll("[data-edit-user]").forEach(button => button.addEventListener("click", () => editUser(button.dataset.editUser)));
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
    showToast("Create Auth users in Supabase first, then edit their profile here. No elevated server key is used in browser.");
    return;
  }
  const payload = {
    id: els.userId.value,
    username: els.userUsername.value.trim(),
    full_name: els.userFullName.value.trim(),
    email: els.userEmail.value.trim(),
    role: els.userRole.value,
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
  els.userId.value = "";
  els.userPhotoData.value = "";
}

function showReport() {
  els.reportView.classList.remove("hidden");
  els.profileView.classList.add("hidden");
  els.presenterView.classList.add("hidden");
  els.adminView.classList.add("hidden");
  els.reportTab.classList.add("active");
  els.profileTab.classList.remove("active");
  els.presenterTab.classList.remove("active");
  els.adminTab.classList.remove("active");
}

function showProfile() {
  if (!currentUser) return;
  els.reportView.classList.add("hidden");
  els.profileView.classList.remove("hidden");
  els.presenterView.classList.add("hidden");
  els.adminView.classList.add("hidden");
  els.reportTab.classList.remove("active");
  els.profileTab.classList.add("active");
  els.presenterTab.classList.remove("active");
  els.adminTab.classList.remove("active");
  renderProfile();
}

function showPresenter() {
  if (!currentUser || currentUser.role !== "presenter") return;
  els.reportView.classList.add("hidden");
  els.profileView.classList.add("hidden");
  els.presenterView.classList.remove("hidden");
  els.adminView.classList.add("hidden");
  els.reportTab.classList.remove("active");
  els.profileTab.classList.remove("active");
  els.presenterTab.classList.add("active");
  els.adminTab.classList.remove("active");
}

function showAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;
  els.reportView.classList.add("hidden");
  els.profileView.classList.add("hidden");
  els.presenterView.classList.add("hidden");
  els.adminView.classList.remove("hidden");
  els.reportTab.classList.remove("active");
  els.profileTab.classList.remove("active");
  els.presenterTab.classList.remove("active");
  els.adminTab.classList.add("active");
  renderAdmin();
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
  const start = getMeetingStartDate();
  if (!start) return showToast("Set a valid meeting time first.");
  const reminderAt = new Date(start.getTime() - 15 * 60000);
  const delay = Math.max(0, reminderAt.getTime() - Date.now());
  window.clearTimeout(reminderTimer);
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  reminderTimer = window.setTimeout(() => {
    const message = `${state.settings.meeting.title} starts in 15 minutes.`;
    if ("Notification" in window && Notification.permission === "granted") new Notification("NephroRounds reminder", { body: message });
    showToast(message);
  }, delay);
  showToast("15-minute reminder enabled.");
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
  return `<a class="recording-link" href="${href}" target="_blank" rel="noreferrer">Watch recording</a>`;
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

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3000);
}
