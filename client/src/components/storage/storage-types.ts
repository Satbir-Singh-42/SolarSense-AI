import { z } from "zod";
import type { EnergyTrade } from "@/../../shared/schema";
import { Calendar, CheckCircle, AlertTriangle, X, Clock } from "lucide-react";

// ---------- Types ----------
export interface ExtendedEnergyTrade extends EnergyTrade {
  sellerHousehold?: { name: string; user: { username: string } };
  buyerHousehold?: { name: string; user: { username: string } };
  acceptanceCount?: number;
}

// ---------- Schema ----------
export const tradeFormSchema = z.object({
  energyAmount: z.coerce
    .number()
    .int("Must be whole number")
    .min(1, "Min 1 kWh"),
  pricePerKwh: z.coerce
    .number()
    .int("Must be whole number")
    .min(1, "Min ₹1/kWh"),
  tradeType: z.enum(["sell", "buy"], { required_error: "Required" }),
});
export type TradeFormValues = z.infer<typeof tradeFormSchema>;

// ---------- Constants ----------
export const FINALIZED_STATUSES = [
  "contacted",
  "applicant_rejected",
  "awarded",
  "owner_rejected",
  "withdrawn",
] as const;

// ---------- Status helpers ----------
type IconComponent = typeof Calendar;

export type StatusMeta = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: IconComponent;
  dotClass: string;
  showDetail: boolean;
};

const STATUS_MAP: Record<string, StatusMeta> = {
  applied: {
    label: "Applied",
    variant: "secondary",
    icon: Calendar,
    dotClass: "bg-yellow-500",
    showDetail: false,
  },
  awarded: {
    label: "Approved",
    variant: "default",
    icon: CheckCircle,
    dotClass: "bg-blue-500",
    showDetail: true,
  },
  owner_rejected: {
    label: "Declined",
    variant: "destructive",
    icon: X,
    dotClass: "bg-red-500",
    showDetail: false,
  },
  contacted: {
    label: "Contact Shared",
    variant: "default",
    icon: CheckCircle,
    dotClass: "bg-green-500",
    showDetail: true,
  },
  applicant_rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: X,
    dotClass: "bg-red-500",
    showDetail: false,
  },
  withdrawn: {
    label: "Withdrawn",
    variant: "outline",
    icon: X,
    dotClass: "bg-gray-500",
    showDetail: false,
  },
};

const DEFAULT_META: StatusMeta = {
  label: "Unknown",
  variant: "outline",
  icon: AlertTriangle,
  dotClass: "bg-gray-500",
  showDetail: false,
};

export function getApplicationStatusMeta(status: string): StatusMeta {
  return (
    STATUS_MAP[status] ?? {
      ...DEFAULT_META,
      label: status.charAt(0).toUpperCase() + status.slice(1),
    }
  );
}

// ---------- Result banner config ----------
type BannerEntry = {
  title: string;
  desc: string;
  color: "emerald" | "blue" | "red" | "slate";
  icon: IconComponent;
};

export const RESULT_BANNERS: Record<
  string,
  { applicant: BannerEntry; owner: BannerEntry }
> = {
  contacted: {
    applicant: {
      title: "Contact Details Shared",
      desc: "You shared contact details with the trade owner. Both parties can now coordinate the energy transfer.",
      color: "emerald",
      icon: CheckCircle,
    },
    owner: {
      title: "Contact Details Shared",
      desc: "The applicant shared contact details. Both parties can now coordinate the energy transfer.",
      color: "emerald",
      icon: CheckCircle,
    },
  },
  awarded: {
    applicant: {
      title: "Application Approved",
      desc: "The trade owner approved your application. Contact details have been automatically shared.",
      color: "blue",
      icon: CheckCircle,
    },
    owner: {
      title: "Application Approved",
      desc: "You approved this application. Contact details have been automatically shared.",
      color: "blue",
      icon: CheckCircle,
    },
  },
  applicant_rejected: {
    applicant: {
      title: "Trade Rejected",
      desc: "You rejected this trade after the owner accepted. It's now available for other applicants.",
      color: "red",
      icon: X,
    },
    owner: {
      title: "Rejected by Applicant",
      desc: "The applicant rejected after your approval. Your trade is now available for others.",
      color: "red",
      icon: X,
    },
  },
  owner_rejected: {
    applicant: {
      title: "Application Declined",
      desc: "The trade owner declined your application. Look for other available trades.",
      color: "red",
      icon: X,
    },
    owner: {
      title: "Application Declined",
      desc: "You declined this application. Your trade remains available.",
      color: "red",
      icon: X,
    },
  },
  withdrawn: {
    applicant: {
      title: "Application Withdrawn",
      desc: "You withdrew your application before the trade owner could respond.",
      color: "slate",
      icon: X,
    },
    owner: {
      title: "Application Withdrawn",
      desc: "The applicant withdrew before you could respond. Your trade remains available.",
      color: "slate",
      icon: X,
    },
  },
};

export const BANNER_COLORS: Record<
  string,
  { bg: string; title: string; desc: string }
> = {
  emerald: {
    bg: "bg-emerald-900/20 border-emerald-600/50",
    title: "text-emerald-400",
    desc: "text-emerald-300",
  },
  blue: {
    bg: "bg-blue-900/20 border-blue-600/50",
    title: "text-blue-400",
    desc: "text-blue-300",
  },
  red: {
    bg: "bg-red-900/20 border-red-600/50",
    title: "text-red-400",
    desc: "text-red-300",
  },
  slate: {
    bg: "bg-slate-800/50 border-slate-600/50",
    title: "text-slate-300",
    desc: "text-slate-400",
  },
};

// ---------- Trade lookup helper ----------
export function findTradeAndOffer(
  tradeId: number,
  trades: ExtendedEnergyTrade[],
  offers: any[],
  fallback?: any,
) {
  let trade: any = trades.find((t) => t.id === tradeId);
  const offerMatch = offers.find((o) => o.trade?.id === (trade?.id ?? tradeId));
  if (!trade) trade = offerMatch?.trade ?? fallback;
  return { trade, offerMatch };
}
