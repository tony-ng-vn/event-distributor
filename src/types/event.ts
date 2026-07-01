export type DistributionChannel = "email" | "slack" | "teams" | "sms";

export type EventStatus = "draft" | "scheduled" | "distributed";

export type CalendarView = "month" | "week";

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  recipients: string[];
  channels: DistributionChannel[];
  status: EventStatus;
  distributedAt?: string;
  createdAt: string;
}

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  recipients: string;
  channels: DistributionChannel[];
}

export const DISTRIBUTION_CHANNELS: {
  id: DistributionChannel;
  label: string;
  description: string;
}[] = [
  { id: "email", label: "Email", description: "Send to recipient inboxes" },
  { id: "slack", label: "Slack", description: "Post to Slack channels" },
  { id: "teams", label: "Teams", description: "Share via Microsoft Teams" },
  { id: "sms", label: "SMS", description: "Text message notifications" },
];
