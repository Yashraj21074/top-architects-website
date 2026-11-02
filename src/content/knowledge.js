// Editable company knowledge for the receptionist, in addition to the content files the website itself uses (studio, services, projects, process, team, journal).
// ONLY confirmed information belongs here. A field left as null means "not supplied": the receptionist will say it doesn't have it, never guess.
export const NOT_AVAILABLE = 'I don’t have that information available at the moment. Please contact our studio, and the team will be happy to assist.';
export const KNOWLEDGE = {
  philosophy: null,                 // no studio philosophy statement has been supplied. Add a sentence here when one exists.
  approach: 'It starts with listening: your aspirations, the site, the timing and how the building should feel to use.',   // taken from stage 01 of the Process page
  social: null,                     // no social profiles supplied
  visitingHours: null,              // not supplied
  careers: null,                    // not supplied
};
