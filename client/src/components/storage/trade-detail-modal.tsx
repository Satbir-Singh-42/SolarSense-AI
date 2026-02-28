import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Zap, User, X } from "lucide-react";
import {
  formatTradePrice,
  formatTradeAmount,
  formatTradeTotal,
} from "@/lib/utils";
import type { ExtendedEnergyTrade } from "./storage-types";

/* ---------- Sub-components ---------- */

function InfoCell({
  label,
  value,
  highlight,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div
      className={`p-2 rounded border ${
        highlight
          ? "bg-emerald-900/20 border-emerald-600/30"
          : "bg-slate-700/30 border-slate-600/30"
      }`}>
      <div
        className={
          highlight ? "text-xs text-emerald-300" : "text-xs text-slate-400"
        }>
        {label}
      </div>
      <div
        className={`${
          highlight
            ? "font-semibold text-emerald-400"
            : "font-medium text-slate-100"
        } ${capitalize ? "capitalize" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function TradeInfoGrid({ trade }: { trade: any }) {
  if (!trade) return null;
  return (
    <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-3">
      <h3 className="font-medium text-slate-100 mb-2 flex items-center gap-2 text-sm">
        <Zap className="h-4 w-4 text-emerald-400" />
        Trade Information
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <InfoCell
          label="Energy"
          value={formatTradeAmount(trade.energyAmount || 0)}
        />
        <InfoCell
          label="Price/kWh"
          value={formatTradePrice(trade.pricePerKwh || 0)}
        />
        <InfoCell
          label="Total"
          value={formatTradeTotal(
            trade.energyAmount || 0,
            trade.pricePerKwh || 0,
          )}
          highlight
        />
        <InfoCell label="Type" value={trade.tradeType || "N/A"} capitalize />
      </div>
    </div>
  );
}

function ContactInfo({
  title,
  items,
}: {
  title: string;
  items: { label: string; value?: string | null }[];
}) {
  return (
    <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-3">
      <h3 className="font-medium text-blue-300 mb-2 flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-blue-400" />
        {title}
      </h3>
      <div className="space-y-2 text-sm">
        {items
          .filter((i) => i.value)
          .map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1 min-w-0">
              <span className="text-blue-400 flex-shrink-0">{label}:</span>
              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">
                {value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: any;
  energyTrades: ExtendedEnergyTrade[];
  availableTradesData: any[];
}

export function TradeDetailModal({
  open,
  onOpenChange,
  detail,
  energyTrades,
  availableTradesData,
}: Props) {
  if (!detail) return null;

  let content: React.ReactNode = (
    <div className="text-slate-400">Trade details not available</div>
  );

  if (detail.tradeId) {
    // My application result – look up the trade
    let trade =
      detail.trade || energyTrades.find((t) => t.id === detail.tradeId);
    const offerMatch = availableTradesData.find(
      (o: any) => o.trade?.id === (trade?.id ?? detail.tradeId),
    );
    if (!trade) trade = offerMatch?.trade;

    const cUser = detail.tradeOwner?.user || offerMatch?.user;
    const cName =
      detail.tradeOwner?.household?.name ||
      offerMatch?.household?.name ||
      `Household ${trade?.sellerHouseholdId || trade?.buyerHouseholdId}`;

    content = (
      <div className="space-y-4">
        <TradeInfoGrid trade={trade} />
        <ContactInfo
          title="Contact Details"
          items={[
            { label: "Name", value: cName },
            {
              label: "Location",
              value: `${cUser?.district || "N/A"}, ${cUser?.state || "N/A"}`,
            },
            { label: "Phone", value: cUser?.phone },
            { label: "Email", value: cUser?.email },
          ]}
        />
      </div>
    );
  } else if (detail.trade) {
    // My trade result – show applicant info
    const { applicant, applicantHousehold, trade } = detail;
    content = (
      <div className="space-y-4">
        <TradeInfoGrid trade={trade} />
        <ContactInfo
          title="Applicant Details"
          items={[
            {
              label: "Name",
              value: applicant?.username || applicantHousehold?.name,
            },
            { label: "Household", value: applicantHousehold?.name },
            {
              label: "Location",
              value: `${applicant?.district || "N/A"}, ${applicant?.state || "N/A"}`,
            },
            { label: "Phone", value: applicant?.phone },
            { label: "Email", value: applicant?.email },
          ]}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[min(100vw-24px,40rem)] sm:max-w-2xl p-4 sm:p-6 overflow-hidden bg-slate-900/95 border-slate-700/60">
        <DialogHeader className="pb-3 border-b border-slate-600/30">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-slate-200">Trade Details</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-3 min-w-0">
          {content}
          <div className="flex justify-end pt-3 mt-3 border-t border-slate-600/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50">
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
