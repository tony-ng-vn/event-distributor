import type { EventStatus } from "@/types/event";

export function statusStyles(status: EventStatus): string {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "scheduled":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "distributed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusDotColor(status: EventStatus): string {
  switch (status) {
    case "draft":
      return "bg-zinc-400";
    case "scheduled":
      return "bg-blue-500";
    case "distributed":
      return "bg-emerald-500";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusLabel(status: EventStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "distributed":
      return "Distributed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
