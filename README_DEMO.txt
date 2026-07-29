NephroRounds Studio Demo
========================

Open the app
------------
1. Open index.html in a browser.
2. Demo clinician login: ali / 1234
3. Demo admin login: admin / admin123

What this demo shows
--------------------
- English nephrology morning report interface with a full Admin Console
- Editable landing/login page
- Landing page boxes and right-side cards can be added, removed, or fully cleared by admin
- Editable opening page hero image
- Editable calendar / schedule items with date, start time, end time, topic, and agenda notes
- Slide deck link or slide upload per schedule/session
- Recording link or demo video upload per schedule/session
- Zoom / Teams / Google Meet link support
- Users can join the video meeting from a phone
- Admin can add, edit, or remove any number of presenters
- Admin can add, edit, or remove any number of guests
- Presenter and guest photos can be uploaded from your computer
- Names, titles, introductions, universities, hospitals, and locations are editable
- Admin can add, edit, or remove weekly or monthly questions
- Admin can create users and passwords
- Admin can create clinician, presenter/temporary, or admin access
- Presenter users get a separate My Presentation page and cannot enter Admin Console
- Presenter users have a demo Presenting mode with mic, camera, and background controls
- Each user can update their own profile, username, password, photo, discipline, university, location, and bio
- Live Q&A chat box during the report
- Hand-raise requests that admin can approve or decline
- Participant mic/camera controls with browser permission prompts
- Admin audio/video permission controls for mute mic and block camera
- Editable design settings for box sizes, landing image height, photo size, and panel spacing
- Thank-you postcard/email cards after a session
- Users can submit answers once
- Users must choose an answer and write the reason for that choice
- After submission, answers and reasons are locked for that user
- Admin can view submitted responses, choices, and reasons
- Browser-based 15-minute meeting reminder demo

How to change questions
-----------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Questions tab.
4. Add a new question or click Edit on an existing question.
5. Add comma-separated answer options, for example:
   Yes, No, Needs attending input

How to edit the calendar
------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Schedule tab.
4. Choose a date, start time, optional end time, topic, and notes.
5. Optionally add a slides link or upload slides. PDF is best for in-app viewing.
6. Optionally add a recording link or upload a small demo video file.
7. Click Save schedule item.
8. Use Edit or Remove on existing schedule items.

How to add presenter slides
---------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Schedule tab.
4. Edit an existing session or create a new one.
5. Paste a Slides link, or upload a PDF / PowerPoint file under Upload slides.
6. Click Save schedule item.
7. On the Morning report page, click View slides on that session card.

PDF files usually show inside the app. PowerPoint files may open in a new tab
or download depending on the phone/computer. For the cleanest demo, export the
presentation as PDF and upload that PDF.

Will the data stay?
-------------------
Yes, in this demo the data stays in the same browser using localStorage. It does
not delete itself after the session ends. It is removed only if you click Reset
demo data, clear browser/site data, use a different browser/device, or open a
fresh copied file without the same browser storage.

Recording notes
---------------
For a demo, you can upload a small video file into a schedule item, or paste a
recording link. For real clinical use, use a secure backend or cloud storage for
recordings instead of browser storage, especially for large files or protected
clinical content.

How to edit the first / login page
----------------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Landing page tab.
4. Edit the app name, tagline, login headline, description, hero badge, hero headline, metrics, and cards.
5. Upload a new hero image if you want to replace the kidney image.
6. Use Add small box / Remove / Remove all to control the boxes under the hero image.
7. Use Add card / Remove / Remove all to control the right-side cards.
8. Click Save landing page.

Important: if you move only index.html to another folder, the default image in
the assets folder may not load. Keep the assets folder next to index.html, or
upload a hero image from the Landing page admin tab.

How to edit presenters and guests
---------------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the People tab.
4. Choose Presenter or Guest.
5. Add name, role/title, university/hospital, location, introduction, and optional photo.
6. Click Save person.
7. Use Edit or Remove on existing people.

How to give people access
-------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Users / Access tab.
4. Add the person's full name, username, password, and access level.
5. Choose Clinician / respondent for ordinary users.
6. Choose Presenter / temporary access for conference presenters.
7. Choose Admin / editor only for people who should edit the app content.
8. Users can later open My profile and change their own username, password,
   photo, discipline/specialty, university/hospital, location, and bio.

Demo presenter login: speaker / slides2026

How presenters upload slides without admin access
-------------------------------------------------
1. Sign in with a presenter account, for example: speaker / slides2026.
2. Open My Presentation.
3. Use Presenting mode to start/stop presenting, toggle mic/camera, and choose a video background.
4. Add a Slides link or upload a PDF / PowerPoint file for the correct session.
5. Presenter users cannot open Admin Console.

Presenting mode in this static demo shows the workflow only. Real microphone,
camera, virtual background, screen share, and participant audio/video approval
should be connected to Zoom/Teams SDK or a secure WebRTC video system in the
production version.

How to prepare thank-you postcard emails
----------------------------------------
1. Sign in as admin.
2. Add participant emails in Admin Console > Users / Access, or users can add
   their own email from My profile.
3. Open Admin Console > Thank-you cards.
4. Choose the session, edit the subject/message, and click Generate cards.
5. Click Open email for each participant.

This static demo prepares the email in your mail app. A production version can
send automatically through Gmail, SendGrid, or another secure email service.

How to use live Q&A and hand raise
----------------------------------
1. Participants type questions in Live Q&A and hand raise on the Morning report page.
2. Participants click Request to speak if they want audio/video permission.
3. Admin signs in, opens Admin Console, then opens Live room.
4. Admin can read questions and approve or decline each hand-raise request.

In this static demo, approval changes the participant's status inside the app.
For a real live meeting, audio/video approval should be connected to Zoom/Teams
SDK, WebRTC, or another secure video system.

How to test mic and camera
--------------------------
1. Sign in as any user.
2. Open Morning report.
3. Use Audio and video to turn mic or camera on.
4. The browser may ask for permission.
5. Admin can open Admin Console > Live room and mute mic or block camera for
   each participant.

For real multi-device control, the app should be hosted with a backend/live
connection. A local HTML file can demonstrate the workflow but cannot reliably
sync live audio/video permissions across separate devices.

How to change box sizes and design
----------------------------------
1. Sign in as admin.
2. Open Admin Console.
3. Open the Design tab.
4. Change schedule box height, landing image height, presenter/guest photo size,
   panel spacing, or app name alignment.
5. Click Save design.

The app name itself is editable from Admin Console > Landing page. That name is
used on the login page, inside the app sidebar, and as the browser tab title.

Important demo limitation
-------------------------
This is a front-end demo. It saves data in the browser for demonstration.
For a real shared clinical app, the next version should use a secure server,
database, real accounts, role-based access, and protected answer locking.
Real push notifications on iPhone/Android also require a hosted app with PWA
or server notification support.
