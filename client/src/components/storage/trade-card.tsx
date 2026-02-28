import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Edit2,
  X,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  formatTradePrice,
  formatTradeAmount,
  formatTradeTotal,
} from "@/lib/utils";
import type { ExtendedEnergyTrade } from "./storage-types";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="h-4 w-4" />;
  if (status === "cancelled") return <AlertTriangle className="h-4 w-4" />;
  return <Calendar className="h-4 w-4" />;
}

const BADGE_VARIANT: Record<string, string> = {
  completed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

interface TradeCardProps {
  trade: ExtendedEnergyTrade;
  variant: "sell" | "buy";
  index: number;
  dataLoaded: boolean;
  cancelPending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onViewApplications: () => void;
}

export function TradeCard({
  trade,
  variant,
  index,
  dataLoaded,
  cancelPending,
  onEdit,
  onCancel,
  onViewApplications,
}: TradeCardProps) {
  const color = variant === "sell" ? "text-emerald-400" : "text-blue-400";
  const label = variant === "sell" ? "Listed:" : "Requested:";
  const hasApps = (trade.acceptanceCount ?? 0) > 0;
  const badgeVariant = (
    hasApps ? "secondary" : (BADGE_VARIANT[trade.status] ?? "outline")
  ) as any;

  const badgeContent = (
    <>
      {hasApps ? (
        <User className="h-3 w-3" />
      ) : (
        <StatusIcon status={trade.status} />
      )}
      {hasApps ? `${trade.acceptanceCount} applied` : trade.status}
    </>
  );

  return (
    <Card
      className={`p-3 sm:p-4 bg-slate-700/50 border-slate-600/50 card-stagger ${
        dataLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}>
      {/* Mobile layout */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`font-bold text-lg ${color}`}>
            {formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}
          </div>
          <Badge
            variant={badgeVariant}
            className="flex items-center gap-1 text-xs">
            {badgeContent}
          </Badge>
        </div>
        <div className="text-xs text-slate-400 mb-2">
          {label} {format(new Date(trade.createdAt), "MMM dd, yyyy HH:mm")}
        </div>
        {hasApps && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs mb-2">
            <User className="h-3 w-3" />
            {trade.acceptanceCount} applied
          </Badge>
        )}
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-200">
            {formatTradeAmount(trade.energyAmount)}
          </span>
          <span className="font-semibold text-slate-400">
            {formatTradePrice(trade.pricePerKwh)}/kWh
          </span>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block mb-4">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1">
            <div className={`font-bold text-xl ${color} mb-2`}>
              {formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}
            </div>
            <div className="text-sm text-slate-400">
              {label} {format(new Date(trade.createdAt), "MMM dd, yyyy HH:mm")}
            </div>
          </div>
          <Badge
            variant={badgeVariant}
            className="flex items-center gap-1 text-xs">
            {badgeContent}
          </Badge>
        </div>
        <div className="flex justify-between items-center mb-4">
          <div className="font-medium text-base text-slate-200">
            {formatTradeAmount(trade.energyAmount)}
          </div>
          <div className="font-semibold text-slate-400">
            {formatTradePrice(trade.pricePerKwh)}/kWh
          </div>
        </div>
      </div>

      {trade.status === "pending" && (
        <div className="flex flex-col sm:flex-row gap-2">
          {hasApps ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewApplications}
              className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-blue-600/50 hover:bg-blue-600 text-slate-200 border-blue-500">
              <FileText className="h-3 w-3" />
              Applications
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-slate-600/50 hover:bg-slate-600 text-slate-200 border-slate-500">
              <Edit2 className="h-3 w-3" />
              Edit
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancel}
            disabled={cancelPending}
            className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/50">
            <X className="h-3 w-3" />
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
