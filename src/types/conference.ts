export interface Conference {
  conf_id: string;
  conf_name: string;
  registration: string;
  notification: string;
  tags: string;
  link?: string;
}

export interface ConferenceWithDates extends Conference {
  registrationDate: Date;
  notificationDate: Date;
  tags_array: string[];
  isRollover?: boolean;
}