import { Conference, ConferenceWithDates } from '../types/conference';

const parseDate = (dateStr: string): Date | null => {
  try {
    console.log('Parsing date:', dateStr);
    if (!dateStr || typeof dateStr !== 'string') {
      console.warn('Invalid date input:', dateStr);
      return null;
    }
    
    // Check if it matches the expected format
    if (!dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      console.warn('Date not in expected DD/MM/YYYY format:', dateStr);
      return null;
    }
    
    const [day, month, year] = dateStr.split('/').map(num => parseInt(num.trim(), 10));
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      // Use safer date construction
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      
      // Verify the date is valid (e.g., not Feb 31)
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        console.warn('Invalid date components (e.g., Feb 31):', dateStr);
        return null;
      }
      
      console.log('Parsed date result:', date);
      return isNaN(date.getTime()) ? null : date;
    }
    console.warn('Invalid date format:', dateStr);
    return null;
  } catch (error) {
    console.warn('Error parsing date:', dateStr, error);
    return null;
  }
};

export const processConferences = (conferences: Conference[]): ConferenceWithDates[] => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  console.log('Processing conferences:', conferences);
  
  if (!Array.isArray(conferences)) {
    console.warn('Expected conferences to be an array, got:', typeof conferences);
    return [];
  }

  const processedConferences = conferences
    .filter(conf => {
      if (!conf || typeof conf !== 'object') {
        console.warn('Invalid conference object:', conf);
        return false;
      }
      
      if (!conf.registration || !conf.notification || !conf.conf_id || !conf.conf_name) {
        console.warn('Skipping invalid conference:', conf);
        return false;
      }
      
      const regDate = parseDate(conf.registration);
      const notifDate = parseDate(conf.notification);
      
      if (!regDate || !notifDate) {
        console.warn('Invalid dates for conference:', conf);
        return false;
      }
      
      return true;
    })
    .flatMap(conf => {
      console.log('Processing conference:', conf);
      const registrationDate = parseDate(conf.registration)!;
      const notificationDate = parseDate(conf.notification)!;
      
      // Ensure we're working with valid dates
      if (!registrationDate || !notificationDate) {
        console.warn('Failed to parse dates for:', conf);
        return [];
      }
      
      const durationInDays = Math.max(
        1, // Minimum 1 day duration to avoid NaN issues
        (notificationDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const conferences: ConferenceWithDates[] = [{
        ...conf,
        registrationDate,
        notificationDate,
        tags_array: conf.tags ? conf.tags.split(';').map(tag => tag.trim()) : [],
        isRollover: false
      }];

      if (notificationDate < currentDate) {
        console.log('Conference is in the past, creating projected version');
        const projectedReg = new Date(registrationDate);
        projectedReg.setFullYear(currentYear);

        const projectedNotif = new Date(projectedReg.getTime() + (durationInDays * 24 * 60 * 60 * 1000));

        conferences.push({
          ...conf,
          conf_id: `${conf.conf_id}_projected`,
          registrationDate: projectedReg,
          notificationDate: projectedNotif,
          tags_array: conf.tags ? conf.tags.split(';').map(tag => tag.trim()) : [],
          isRollover: true
        });
      }

      return conferences;
    });

  console.log('Final processed conferences:', processedConferences);
  return processedConferences;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const TAG_COLORS = [
  { bg: 'bg-[#F2FCE2]', text: 'text-[#2F4858]' },
  { bg: 'bg-[#FEF7CD]', text: 'text-[#8B4513]' },
  { bg: 'bg-[#FEC6A1]', text: 'text-[#7B341E]' },
  { bg: 'bg-[#E5DEFF]', text: 'text-[#4C1D95]' },
  { bg: 'bg-[#FFDEE2]', text: 'text-[#9D174D]' },
  { bg: 'bg-[#FDE1D3]', text: 'text-[#9A3412]' },
  { bg: 'bg-[#D3E4FD]', text: 'text-[#1E40AF]' },
  { bg: 'bg-[#F1F0FB]', text: 'text-[#312E81]' }
];

export const getTagColor = (tag: string): string => {
  const hash = tag.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  return `${TAG_COLORS[colorIndex].bg} ${TAG_COLORS[colorIndex].text}`;
};