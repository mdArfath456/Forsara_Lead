import { exploriumRequest } from './exploriumClient.js';

const PROSPECTS_URL = '/prospects';
const CONTACT_URL = '/prospects/contacts_information/enrich';
const PROFILE_URL = '/prospects/profiles/enrich';

const JOB_LEVELS = ['owner', 'founder', 'c-suite', 'president', 'vice president', 'director', 'senior manager', 'manager'];
const DEPARTMENTS = ['c-suite', 'engineering', 'it', 'product', 'operations', 'procurement', 'strategy', 'r&d', 'sales'];

function mapProspect(person) {
  const linkedin = person.linkedin || person.linkedin_url || person.linkedin_url_array?.[0];
  return {
    firstName: person.first_name,
    lastName: person.last_name,
    fullName: person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' '),
    title: person.job_title,
    department: person.job_department_main || person.job_department || person.job_department_array?.[0],
    seniority: person.job_level_main || person.job_seniority_level?.[0] || person.job_level_array?.[0],
    linkedinUrl: linkedin ? (linkedin.startsWith('http') ? linkedin : `https://${linkedin}`) : undefined,
    location: {
      city: person.city,
      state: person.region_name,
      country: person.country_name,
    },
    employmentHistory: Array.isArray(person.experience) ? person.experience.map((title) => ({ title })) : [],
    providerId: person.prospect_id,
    raw: person,
  };
}

function mapContact(data = {}) {
  const emails = Array.isArray(data.emails) ? data.emails : [];
  const phoneNumbers = Array.isArray(data.phone_numbers)
    ? data.phone_numbers.map((item) => typeof item === 'string' ? item : item?.number || item?.phone_number || item?.sanitized_number).filter(Boolean)
    : (typeof data.phone_numbers === 'string' ? [data.phone_numbers] : []);
  return {
    email: data.professions_email || emails.find(Boolean),
    emailStatus: data.professional_email_status,
    phone: phoneNumbers[0],
    mobilePhone: data.mobile_phone,
    rawContact: data,
  };
}

function mapProfile(data = {}) {
  const profile = {};
  if (data.first_name) profile.firstName = data.first_name;
  if (data.last_name) profile.lastName = data.last_name;
  if (data.full_name) profile.fullName = data.full_name;
  if (data.linkedin) profile.linkedinUrl = data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`;
  if (data.city || data.region_name || data.country_name) profile.location = { city: data.city, state: data.region_name, country: data.country_name };
  if (Array.isArray(data.experience)) profile.employmentHistory = data.experience.map((item) => typeof item === 'string' ? ({ title: item }) : item);
  return profile;
}

export class ExploriumPeopleProvider {
  key = 'explorium';

  async search({ businessId, perPage = 25 }) {
    if (!businessId) return [];

    const response = await exploriumRequest({
      method: 'post',
      url: PROSPECTS_URL,
      data: {
        mode: 'full',
        size: Math.min(perPage, 50),
        page_size: Math.min(perPage, 50),
        page: 1,
        filters: {
          business_id: { values: [businessId] },
          job_level: { values: JOB_LEVELS },
          job_department: { values: DEPARTMENTS },
          has_contact_details: { value: 'email_or_phone' },
        },
      },
    });

    return (response.data?.data || []).map(mapProspect).filter((person) => person.fullName && person.providerId);
  }

  async enrich(person) {
    if (!person.providerId) return null;

    const [contactResult, profileResult] = await Promise.allSettled([
      exploriumRequest({
        method: 'post',
        url: CONTACT_URL,
        data: { prospect_id: person.providerId, request_context: null, parameters: { contact_types: [] } },
      }),
      exploriumRequest({
        method: 'post',
        url: PROFILE_URL,
        data: { prospect_id: person.providerId, request_context: null, parameters: {} },
      }),
    ]);

    const contact = contactResult.status === 'fulfilled' ? mapContact(contactResult.value.data?.data) : {};
    const profile = profileResult.status === 'fulfilled' ? mapProfile(profileResult.value.data?.data) : {};

    return {
      ...person,
      ...profile,
      ...contact,
      raw: {
        prospect: person.raw,
        contact: contact.rawContact,
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data?.data : undefined,
      },
    };
  }
}
