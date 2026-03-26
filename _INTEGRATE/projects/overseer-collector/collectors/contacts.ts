import { register } from '../src/registry.js';
import type { CollectorDefinition, LocalContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

interface ContactPhone {
  label: string;
  number: string;
}

interface ContactEmail {
  label: string;
  address: string;
}

interface ContactAddress {
  label: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  addresses: ContactAddress[];
  birthday?: string; // YYYY-MM-DD or MM-DD
}

interface ContactsData {
  contacts: Contact[];
  totalCount: number;
  collectedAt: string;
}

// Raw contact from contacts-cli
interface RawContact {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  company: string;
  jobTitle: string;
  department: string;
  phones: { label: string; number: string }[];
  emails: { label: string; address: string }[];
  addresses: {
    label: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
  birthday?: string;
}

interface ContactsCliOutput {
  contacts: RawContact[];
  count: number;
  error?: string;
}

async function fetchContacts(exec: LocalContext['exec']): Promise<Contact[]> {
  // Use compiled contacts-cli binary
  const result = await exec('~/bin/contacts-cli 2>&1');

  if (result.exitCode !== 0) {
    throw new Error(`contacts-cli failed: ${result.stderr || result.stdout}`);
  }

  let data: ContactsCliOutput;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Failed to parse contacts-cli output: ${result.stdout.slice(0, 200)}`);
  }

  if (data.error) {
    throw new Error(`contacts-cli error: ${data.error}`);
  }

  const contacts: Contact[] = data.contacts.map((raw) => {
    const fullName =
      [raw.firstName, raw.lastName].filter(Boolean).join(' ') ||
      raw.company ||
      'Unknown';

    return {
      id: raw.id,
      firstName: raw.firstName || '',
      lastName: raw.lastName || '',
      fullName,
      nickname: raw.nickname || undefined,
      company: raw.company || undefined,
      jobTitle: raw.jobTitle || undefined,
      department: raw.department || undefined,
      phones: raw.phones || [],
      emails: raw.emails || [],
      addresses: (raw.addresses || []).map((a) => ({
        label: a.label,
        street: a.street || undefined,
        city: a.city || undefined,
        state: a.state || undefined,
        postalCode: a.postalCode || undefined,
        country: a.country || undefined,
      })),
      birthday: raw.birthday || undefined,
    };
  });

  // Sort by full name
  contacts.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return contacts;
}

const contactsCollector: CollectorDefinition<ContactsData> = {
  id: 'contacts',
  schedule: {
    type: 'cron',
    expression: '0 3 * * *', // Daily at 3 AM
  },
  mode: 'local', // Requires exec() for contacts-cli
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    if (!isLocalContext(ctx)) {
      throw new Error('contacts collector requires local runtime with exec()');
    }

    const contacts = await fetchContacts(ctx.exec);

    return {
      contacts,
      totalCount: contacts.length,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(contactsCollector);
