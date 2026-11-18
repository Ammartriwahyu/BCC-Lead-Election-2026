/**
 * Committee candidate form copy (A7 / A8, dialogs, toasts, spec 4.4). Split from candidatesCopy so
 * the list page does not ship it (JS budget). Entries marked NEW are logged in DEVIATIONS.
 */
export const candidateFormCopy = {
  toast: {
    added: 'Candidate added',
    saved: 'Changes saved',
    removed: 'Candidate removed',
    photoFailed: "Candidate saved, but the photo didn't upload. Add it again.", // NEW
    locked: 'Voting has opened, so candidates can no longer change.', // NEW
  },
  form: {
    back: 'Back to candidates',
    addTitle: 'Add candidate',
    addSubtitle: 'Fields marked * are required. Members see this information on the ballot.',
    editTitle: (name: string) => `Edit ${name}`,
    editSubtitle: 'Changes show up for members as soon as you save.',
    errorSummary: (n: number) =>
      n === 1
        ? '1 field needs your attention before you can save.'
        : `${n} fields need your attention before you can save.`,
    details: 'Candidate details',
    photo: 'Photo',
    photoPrompt: 'Drag a photo here or',
    photoBrowse: 'browse',
    photoHint: 'JPG or PNG, up to 2 MB. A 4:5 portrait works best.',
    photoMeta: (size: string, width: number, height: number) => `${size} · ${width} × ${height} px`,
    photoMetaSize: (size: string) => size, // NEW: dimensions not known yet
    photoSaved: 'Current photo', // NEW: file name of a photo that is already saved
    replace: 'Replace',
    remove: 'Remove',
    ballot: 'Ballot number',
    ballotHint: 'Order on the ballot. Each number can be used once.',
    ballotTaken: (n: string) => `${n} (taken)`, // NEW: disabled option
    ballotPlaceholder: 'Select number', // NEW
    name: 'Full name',
    namePlaceholder: 'e.g. Rizky Pratama',
    studyProgram: 'Study program',
    studyProgramPlaceholder: 'Select study program',
    classYear: 'Class year',
    classYearPlaceholder: 'Select year',
    visionMission: 'Vision & mission',
    visionMissionIntro:
      'Write it the way the candidate wants members to read it. Keep each point short.',
    vision: 'Vision',
    visionPlaceholder: 'One or two sentences about where the candidate wants to take BCC',
    counter: (n: number, max: number) => `${n} / ${max}`,
    mission: 'Mission',
    missionIntro: 'Add 1 to 5 points. Members see them as a numbered list.',
    missionPlaceholder: 'e.g. Run monthly beginner classes',
    missionLabel: (n: number) => `Mission point ${n}`, // NEW: accessible name
    removeMission: (n: number) => `Remove mission point ${n}`, // NEW: accessible name
    addMission: '+ Add mission point',
    cancel: 'Cancel',
    saveNew: 'Save candidate',
    saveEdit: 'Save changes',
    preview: 'Preview',
    previewIntro: 'How members see this candidate on the ballot.',
    previewName: 'Candidate name',
    previewProgram: 'Study program',
    previewYear: '—',
    previewDetails: (program: string, year: string) => `${program}, class of ${year}`,
    deleteTitle: 'Delete candidate',
    deleteBody: 'Removes this candidate from the ballot. You can only do this before voting opens.',
    deleteAction: 'Delete candidate',
    errors: {
      photoRequired: 'Add a photo of the candidate.',
      photoType: 'Use a JPG or PNG file.', // NEW
      photoSize: 'The photo is larger than 2 MB. Choose a smaller file.', // NEW
      ballotRequired: 'Choose a ballot number.', // NEW
      ballotTaken: 'Another candidate already has this number.', // NEW
      nameRequired: "Enter the candidate's full name.",
      nameTooLong: (max: number) => `Keep the name to ${max} characters.`, // NEW
      studyProgramRequired: 'Choose a study program.',
      classYearRequired: 'Choose a class year.',
      visionRequired: "Write the candidate's vision.",
      visionTooLong: (max: number) => `Keep the vision to ${max} characters.`, // NEW
      missionRequired: 'Write at least one mission point.',
      missionTooLong: (max: number) => `Keep each point to ${max} characters.`, // NEW
      server: "We couldn't save the candidate. Check your connection and try again.", // NEW
    },
  },
  /** NEW (spec 4.4): no Figma frames for these dialogs; built from the Dialog component. */
  dialogs: {
    discardTitle: 'Discard this candidate?',
    discardBody: "What you typed here won't be saved.",
    discardConfirm: 'Discard',
    keepEditing: 'Keep editing',
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: 'The candidate and their photo are removed from the ballot.',
    deleteConfirm: 'Delete candidate',
    cancel: 'Cancel',
  },
  /** Study programs offered in the form (FILKOM UB). A saved value outside this list stays selectable. */
  studyPrograms: [
    'Informatics Engineering',
    'Information Systems',
    'Computer Engineering',
    'Information Technology',
    'Information Technology Education',
  ],
} as const;
