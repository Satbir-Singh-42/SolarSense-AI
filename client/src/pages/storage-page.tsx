import { useAuth } from "@/hooks/use-auth";
import { formatTradeAmount } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/navbar";
import {
  Zap,
  CheckCircle,
  Loader2,
  LogIn,
  User,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
  Clock,
  Plus,
  Store,
  Handshake,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Household } from "@/../../shared/schema";

import {
  type ExtendedEnergyTrade,
  tradeFormSchema,
  type TradeFormValues,
  FINALIZED_STATUSES,
  getApplicationStatusMeta,
  RESULT_BANNERS,
  BANNER_COLORS,
  findTradeAndOffer,
} from "@/components/storage/storage-types";
import { useTradeMutations } from "@/components/storage/use-trade-mutations";
import { TradeCard } from "@/components/storage/trade-card";
import { EditTradeDialog } from "@/components/storage/edit-trade-dialog";
import { TradeDetailModal } from "@/components/storage/trade-detail-modal";

/* ------------------------------------------------------------------ */
/*  ResultBanner – data-driven replacement for duplicate switch blocks */
/* ------------------------------------------------------------------ */
function ResultBanner({
  status,
  perspective,
}: {
  status: string;
  perspective: "applicant" | "owner";
}) {
  const entry = RESULT_BANNERS[status]?.[perspective];
  if (!entry) {
    return (
      <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-slate-300 mb-2">
          <Clock className="h-4 w-4" />
          <span className="font-medium">Status: {status}</span>
        </div>
        <p className="text-sm text-slate-400">
          Application status is being processed.
        </p>
      </div>
    );
  }
  const c = BANNER_COLORS[entry.color];
  const Icon = entry.icon;
  return (
    <div className={`border rounded-lg p-3 ${c.bg}`}>
      <div className={`flex items-center gap-2 ${c.title} mb-2`}>
        <Icon className="h-4 w-4" />
        <span className="font-medium">{entry.title}</span>
      </div>
      <p className={`text-sm ${c.desc}`}>{entry.desc}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function StoragePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // UI state
  const [activeTab, setActiveTab] = useState<
    "my-listings" | "my-requests" | "applications" | "request-results"
  >("my-listings");
  const [editingTrade, setEditingTrade] = useState<ExtendedEnergyTrade | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  /* ---- Queries ---- */
  const {
    data: energyTrades = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ExtendedEnergyTrade[]>({
    queryKey: ["/api/energy-trades"],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchInterval:
      activeTab === "my-listings" || activeTab === "my-requests"
        ? 1000 * 45
        : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: availableTradesData = [],
    isLoading: availableTradesLoading,
    refetch: refetchOffers,
  } = useQuery<any[]>({
    queryKey: ["/api/trade-offers"],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ["/api/households"],
    enabled: !!user,
  });

  const {
    data: tradeAcceptances = [],
    isLoading: acceptancesLoading,
    refetch: refetchAcceptances,
  } = useQuery<any[]>({
    queryKey: ["/api/trade-acceptances"],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const {
    data: tradeApplications = [],
    isLoading: applicationsLoading,
    refetch: refetchApplications,
  } = useQuery<any[]>({
    queryKey: ["/api/my-trade-applications"],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  /* ---- Memos ---- */
  const userHouseholdIds = useMemo(
    () => userHouseholds.map((h) => h.id),
    [userHouseholds],
  );

  const sortedTrades = useMemo(
    () =>
      [...energyTrades].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [energyTrades],
  );

  const applicationCountMap = useMemo(() => {
    const m = new Map<number, number>();
    tradeApplications.forEach((a: any) => {
      const tid = a.acceptance?.tradeId || a.tradeId;
      if (tid) m.set(tid, (m.get(tid) || 0) + 1);
    });
    return m;
  }, [tradeApplications]);

  const withCounts = (list: ExtendedEnergyTrade[]) =>
    list.map((t) => ({
      ...t,
      acceptanceCount: applicationCountMap.get(t.id) || 0,
    }));

  const myListings = useMemo(
    () =>
      withCounts(
        sortedTrades.filter(
          (t) =>
            t.tradeType === "sell" &&
            t.sellerHouseholdId &&
            userHouseholdIds.includes(t.sellerHouseholdId),
        ),
      ),
    [sortedTrades, userHouseholdIds, applicationCountMap],
  );

  const myRequests = useMemo(
    () =>
      withCounts(
        sortedTrades.filter(
          (t) =>
            t.tradeType === "buy" &&
            t.buyerHouseholdId &&
            userHouseholdIds.includes(t.buyerHouseholdId),
        ),
      ),
    [sortedTrades, userHouseholdIds, applicationCountMap],
  );

  const userInfo = useMemo(() => {
    if (!user) return null;
    const ownCount = sortedTrades.filter(
      (t) =>
        (t.sellerHouseholdId &&
          userHouseholdIds.includes(t.sellerHouseholdId)) ||
        (t.buyerHouseholdId && userHouseholdIds.includes(t.buyerHouseholdId)),
    ).length;
    const done = ["awarded", "contacted"];
    return {
      totalTrades:
        ownCount + tradeAcceptances.length + tradeApplications.length,
      activeSellListings: myListings.filter((t) => t.status === "pending")
        .length,
      activeBuyRequests: myRequests.filter((t) => t.status === "pending")
        .length,
      completedTrades:
        tradeAcceptances.filter((a: any) => done.includes(a.status)).length +
        tradeApplications.filter((a: any) =>
          done.includes(a.acceptance?.status),
        ).length,
      availableOffers: availableTradesData.length,
    };
  }, [
    user,
    sortedTrades,
    userHouseholdIds,
    myListings,
    myRequests,
    availableTradesData,
    tradeAcceptances,
    tradeApplications,
  ]);

  /* ---- Animations ---- */
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (!isLoading && !applicationsLoading)
      setTimeout(() => setDataLoaded(true), 100);
  }, [isLoading, applicationsLoading]);

  /* ---- Mutations ---- */
  const {
    createTrade: createTradeMutation,
    updateTrade: updateTradeMutation,
    cancelTrade: cancelTradeMutation,
    shareContact: shareContactMutation,
    withdraw: withdrawApplicationMutation,
    decline: declineApplicationMutation,
    approve: approveApplicationMutation,
    applicantReject: applicantRejectMutation,
  } = useTradeMutations({
    onCreateSuccess: () => setIsCreateDialogOpen(false),
    onEditSuccess: () => {
      setIsEditDialogOpen(false);
      setEditingTrade(null);
    },
  });

  /* ---- Forms ---- */
  const createForm = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: { energyAmount: 0, pricePerKwh: 0, tradeType: "sell" },
  });

  const editForm = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: { energyAmount: 0, pricePerKwh: 0, tradeType: "sell" },
  });

  const handleEditTrade = (trade: ExtendedEnergyTrade) => {
    setEditingTrade(trade);
    editForm.reset({
      energyAmount: trade.energyAmount,
      pricePerKwh: trade.pricePerKwh,
      tradeType: trade.tradeType as "sell" | "buy",
    });
    setIsEditDialogOpen(true);
  };

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetch(),
        refetchOffers(),
        refetchAcceptances(),
        refetchApplications(),
      ]);
      toast({
        title: "Data Refreshed",
        description: "All trade data has been updated successfully.",
      });
    } catch {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ---- Helpers ---- */
  const formatEnergy = (amount: number) => formatTradeAmount(amount);
  const anyLoading =
    isLoading ||
    availableTradesLoading ||
    acceptancesLoading ||
    applicationsLoading;

  const activeAcceptances = tradeAcceptances.filter(
    (a: any) => !FINALIZED_STATUSES.includes(a.status),
  );
  const activeApplications = tradeApplications.filter(
    (a: any) => !FINALIZED_STATUSES.includes(a.acceptance?.status),
  );
  const finalAcceptances = tradeAcceptances.filter((a: any) =>
    FINALIZED_STATUSES.includes(a.status),
  );
  const finalApplications = tradeApplications.filter((a: any) =>
    FINALIZED_STATUSES.includes(a.acceptance?.status),
  );

  /* ---- Stats card config ---- */
  const statCards = userInfo
    ? [
        {
          icon: Store,
          cls: "text-blue-400",
          title: "My Sell Listings",
          value: userInfo.activeSellListings,
          sub: "Energy for sale",
        },
        {
          icon: ShoppingCart,
          cls: "text-emerald-400",
          title: "My Buy Requests",
          value: userInfo.activeBuyRequests,
          sub: "Energy needed",
        },
        {
          icon: Handshake,
          cls: "text-blue-400",
          title: "Available Offers",
          value: userInfo.availableOffers,
          sub: "To accept",
        },
        {
          icon: CheckCircle,
          cls: "text-purple-400",
          title: "Completed Trades",
          value: userInfo.completedTrades,
          sub: "Successful",
        },
        {
          icon: Zap,
          cls: "text-indigo-400",
          title: "Total Activity",
          value: userInfo.totalTrades,
          sub: "All time",
        },
      ]
    : [];

  /* ---- Auth guards ---- */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-200">
                <LogIn className="h-5 w-5 text-emerald-400" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-6">
                Please log in to view your energy trading history and manage
                your listings.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar currentPage="storage" />
      <div
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 transition-all duration-300 ease-out ${
          isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}>
        {/* ---------- Header ---------- */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
              Energy Trading Hub
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Manage your energy listings, requests, and trading history
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={anyLoading}
              className="flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none btn-smooth">
              <RefreshCw
                className={`mr-2 h-4 w-4 ${anyLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {anyLoading ? "Updating..." : "Refresh"}
              </span>
              <span className="sm:hidden">
                {anyLoading ? "Update" : "Refresh"}
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation("/?tab=energy-trading")}
              className="flex items-center justify-center gap-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 flex-1 sm:flex-none btn-smooth">
              <TrendingUp className="h-4 w-4" />
              <span>Trade Market</span>
            </Button>

            {/* Create Trade dialog */}
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none btn-smooth">
                  <Plus className="h-4 w-4" />
                  <span>Create Trade</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800/50 border-slate-600/50">
                <DialogHeader>
                  <DialogTitle className="text-slate-200">
                    Create Energy Trade
                  </DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((d) =>
                      createTradeMutation.mutate(d),
                    )}
                    className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="tradeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trade type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sell">Sell Energy</SelectItem>
                              <SelectItem value="buy">Buy Energy</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="energyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Amount (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="pricePerKwh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per kWh (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:border-red-500">
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTradeMutation.isPending}>
                        {createTradeMutation.isPending
                          ? "Creating..."
                          : "Create Trade"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ---------- Stats Cards ---------- */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {statCards.map((s) => (
              <Card
                key={s.title}
                className="bg-slate-800/50 border-slate-600/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <s.icon className={`h-4 w-4 ${s.cls}`} />
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ---------- Data Status ---------- */}
        <Card className="mb-6 bg-slate-800/50 border-slate-600/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  <span className="font-medium text-sm sm:text-base text-slate-200">
                    Data Status:
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-6 sm:ml-0">
                  {!isLoading && !error && energyTrades.length > 0 && (
                    <Badge variant="default" className="text-xs sm:text-sm">
                      Connected •{" "}
                      {
                        energyTrades.filter((t) => t.status === "pending")
                          .length
                      }{" "}
                      active trade
                      {energyTrades.filter((t) => t.status === "pending")
                        .length !== 1
                        ? "s"
                        : ""}
                    </Badge>
                  )}
                  {!isLoading && energyTrades.length === 0 && (
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      No trades in system
                    </Badge>
                  )}
                  {error && (
                    <Badge variant="destructive" className="text-xs sm:text-sm">
                      Connection Error
                    </Badge>
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        Loading...
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="text-xs sm:text-sm text-slate-400 ml-6 sm:ml-0"
                aria-live="polite">
                Last updated: {format(new Date(), "HH:mm:ss")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  TABS                                                            */}
        {/* ================================================================ */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 sm:gap-2 text-xs sm:text-sm mb-6 bg-slate-800/50 border-slate-600/50">
            <TabsTrigger
              value="my-listings"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Store className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sell Listings</span>
              <span className="sm:hidden">Sell</span>({myListings.length})
            </TabsTrigger>
            <TabsTrigger
              value="my-requests"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Buy Requests</span>
              <span className="sm:hidden">Buy</span>({myRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>(
              {activeAcceptances.length + activeApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="request-results"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Results</span>
              <span className="sm:hidden">Results</span>(
              {finalAcceptances.length + finalApplications.length})
            </TabsTrigger>
          </TabsList>

          {/* ---- Sell Listings ---- */}
          <TabsContent
            value="my-listings"
            forceMount
            className="tab-panel"
            data-state={activeTab === "my-listings" ? "active" : "inactive"}>
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <Store className="h-5 w-5 text-blue-400" />
                  Energy You're Selling
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Energy listings you've posted for others to buy
                </p>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No sell listings yet</p>
                    <p className="text-sm text-slate-500">
                      Create energy listings to start selling surplus power
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myListings.map((trade, i) => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        variant="sell"
                        index={i}
                        dataLoaded={dataLoaded}
                        cancelPending={cancelTradeMutation.isPending}
                        onEdit={() => handleEditTrade(trade)}
                        onCancel={() => cancelTradeMutation.mutate(trade.id)}
                        onViewApplications={() => setActiveTab("applications")}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Buy Requests ---- */}
          <TabsContent
            value="my-requests"
            forceMount
            className="tab-panel"
            data-state={activeTab === "my-requests" ? "active" : "inactive"}>
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  Energy You're Requesting
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Active and manageable buy requests (edit or cancel here)
                </p>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No buy requests yet</p>
                    <p className="text-sm text-slate-500">
                      Create requests to purchase energy from other users
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((trade, i) => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        variant="buy"
                        index={i}
                        dataLoaded={dataLoaded}
                        cancelPending={cancelTradeMutation.isPending}
                        onEdit={() => handleEditTrade(trade)}
                        onCancel={() => cancelTradeMutation.mutate(trade.id)}
                        onViewApplications={() => setActiveTab("applications")}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Applications ---- */}
          <TabsContent
            value="applications"
            forceMount
            className="tab-panel"
            data-state={activeTab === "applications" ? "active" : "inactive"}>
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Applications
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Applications you submitted to others and applications others
                  submitted to your trades
                </p>
              </CardHeader>
              <CardContent>
                {acceptancesLoading || applicationsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-400">Loading applications...</p>
                  </div>
                ) : tradeAcceptances.length === 0 &&
                  tradeApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No applications yet</p>
                    <p className="text-sm text-slate-500">
                      Apply to energy trades or wait for others to apply to your
                      trades
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ---- Applications I Submitted ---- */}
                    {activeAcceptances.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-emerald-400" />
                          Applications I Submitted ({activeAcceptances.length})
                        </h3>
                        <div className="space-y-4">
                          {activeAcceptances.map((acceptance: any) => {
                            const { trade } = findTradeAndOffer(
                              acceptance.tradeId,
                              energyTrades,
                              availableTradesData,
                              acceptance.trade,
                            );
                            const sm = getApplicationStatusMeta(
                              acceptance.status,
                            );
                            return (
                              <Card
                                key={acceptance.id}
                                className="overflow-hidden border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-700/50 border-slate-600/50">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-5 w-5 text-emerald-400" />
                                      <h3 className="text-lg font-semibold text-slate-200">
                                        Energy{" "}
                                        {trade?.tradeType === "sell"
                                          ? "Sale"
                                          : "Purchase"}
                                        :{" "}
                                        {formatEnergy(trade?.energyAmount || 0)}
                                      </h3>
                                    </div>
                                    <Badge
                                      variant={sm.variant}
                                      className="flex items-center gap-1">
                                      <sm.icon className="h-3 w-3" />
                                      {sm.label}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-slate-400 mt-1">
                                    Applied:{" "}
                                    {format(
                                      new Date(acceptance.acceptedAt),
                                      "MMM dd, yyyy HH:mm",
                                    )}
                                  </div>
                                </CardHeader>

                                <CardContent className="py-3">
                                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                                    <User className="h-4 w-4 text-emerald-400" />
                                    <span>Applicant Details</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-slate-400">
                                        Name:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {user?.username || "User"}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Household:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {userHouseholds[0]?.name ||
                                          "Not specified"}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Location:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {user?.district || "Not specified"}
                                        {user?.state && `, ${user.state}`}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Contact:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {acceptance.status === "awarded" ? (
                                          <div className="space-y-1">
                                            <div>
                                              {user?.email ||
                                                "Email not available"}
                                            </div>
                                            {user?.phone && (
                                              <div>{user.phone}</div>
                                            )}
                                            {userHouseholds[0]?.address && (
                                              <div className="text-xs text-slate-400">
                                                Address:{" "}
                                                {userHouseholds[0].address}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "Hidden until approved"
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>

                                <CardFooter className="pt-3 border-t border-slate-600/50">
                                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                                    <div>
                                      <span className="text-slate-400">
                                        Energy Amount:
                                      </span>
                                      <div className="font-semibold text-slate-200">
                                        {trade?.energyAmount || 0}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Price:
                                      </span>
                                      <div className="font-semibold text-emerald-400">
                                        {trade?.pricePerKwh || 0} /kwh
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Status:
                                      </span>
                                      <div className="flex items-center gap-1 font-medium text-slate-200">
                                        <div
                                          className={`w-2 h-2 rounded-full ${sm.dotClass}`}
                                        />
                                        {sm.label}
                                      </div>
                                    </div>
                                  </div>
                                </CardFooter>

                                {acceptance.status === "applied" && (
                                  <div className="px-6 pb-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        withdrawApplicationMutation.mutate(
                                          acceptance.id,
                                        )
                                      }
                                      disabled={
                                        withdrawApplicationMutation.isPending
                                      }
                                      className="text-red-600 border-red-300 hover:bg-red-50 w-full">
                                      <X className="h-3 w-3 mr-1" />
                                      {withdrawApplicationMutation.isPending
                                        ? "Withdrawing..."
                                        : "Withdraw Application"}
                                    </Button>
                                  </div>
                                )}
                                {acceptance.status === "awarded" && (
                                  <div className="px-6 pb-4 flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        applicantRejectMutation.mutate(
                                          acceptance.id,
                                        )
                                      }
                                      disabled={
                                        applicantRejectMutation.isPending
                                      }
                                      className="text-red-600 border-red-300 hover:bg-red-50 flex-1">
                                      <X className="h-3 w-3 mr-1" />
                                      {applicantRejectMutation.isPending
                                        ? "Rejecting..."
                                        : "Decline"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        shareContactMutation.mutate(
                                          acceptance.id,
                                        )
                                      }
                                      disabled={shareContactMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700 flex-1">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {shareContactMutation.isPending
                                        ? "Sharing..."
                                        : "Share Contact"}
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ---- Applications to My Trades ---- */}
                    {activeApplications.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4 text-emerald-400" />
                          Applications to My Trades ({activeApplications.length}
                          )
                        </h3>
                        <div className="space-y-4">
                          {activeApplications.map((application: any) => {
                            const sm = getApplicationStatusMeta(
                              application.acceptance.status,
                            );
                            return (
                              <Card
                                key={application.acceptance.id}
                                className="overflow-hidden border-l-4 border-l-emerald-400 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-800/50 border-slate-600/50">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-5 w-5 text-emerald-400" />
                                      <h3 className="text-lg font-semibold text-slate-200">
                                        Energy{" "}
                                        {application.trade?.tradeType === "sell"
                                          ? "Sale"
                                          : "Purchase"}
                                        :{" "}
                                        {formatEnergy(
                                          application.trade?.energyAmount || 0,
                                        )}
                                      </h3>
                                    </div>
                                    <Badge
                                      variant={sm.variant}
                                      className="flex items-center gap-1">
                                      <sm.icon className="h-3 w-3" />
                                      {sm.label}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-slate-400 mt-1">
                                    Applied:{" "}
                                    {format(
                                      new Date(
                                        application.acceptance.acceptedAt,
                                      ),
                                      "MMM dd, yyyy HH:mm",
                                    )}
                                  </div>
                                </CardHeader>

                                <CardContent className="py-3">
                                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                                    <User className="h-4 w-4 text-emerald-400" />
                                    <span>Applicant Details</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-slate-400">
                                        Name:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {application.applicant?.username ||
                                          "User"}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Household:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {application.applicantHousehold?.name ||
                                          "Not specified"}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Location:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {application.applicant?.district ||
                                          "Not specified"}
                                        {application.applicant?.state &&
                                          `, ${application.applicant.state}`}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Contact:
                                      </span>
                                      <div className="font-medium text-slate-200">
                                        {application.acceptance.status ===
                                        "awarded" ? (
                                          <div className="space-y-1">
                                            <div>
                                              {application.applicant?.email ||
                                                "Email not available"}
                                            </div>
                                            {application.applicant?.phone && (
                                              <div>
                                                {application.applicant.phone}
                                              </div>
                                            )}
                                            {application.applicantHousehold
                                              ?.address && (
                                              <div className="text-xs text-slate-400">
                                                Address:{" "}
                                                {
                                                  application.applicantHousehold
                                                    .address
                                                }
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "Hidden until approved"
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>

                                <CardFooter className="pt-3 border-t border-slate-600/50">
                                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                                    <div>
                                      <span className="text-slate-400">
                                        Energy Amount:
                                      </span>
                                      <div className="font-semibold text-slate-200">
                                        {application.trade?.energyAmount || 0}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Price:
                                      </span>
                                      <div className="font-semibold text-emerald-400">
                                        {application.trade?.pricePerKwh || 0}{" "}
                                        /kwh
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Status:
                                      </span>
                                      <div className="flex items-center gap-1 font-medium text-slate-200">
                                        <div
                                          className={`w-2 h-2 rounded-full ${sm.dotClass}`}
                                        />
                                        {sm.label}
                                      </div>
                                    </div>
                                  </div>
                                </CardFooter>

                                {application.acceptance.status ===
                                  "applied" && (
                                  <div className="px-6 pb-4 flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        declineApplicationMutation.mutate(
                                          application.acceptance.id,
                                        )
                                      }
                                      disabled={
                                        declineApplicationMutation.isPending
                                      }
                                      className="text-red-400 border-red-600/50 hover:bg-red-900/20 bg-slate-700/50 flex-1">
                                      <X className="h-3 w-3 mr-1" />
                                      {declineApplicationMutation.isPending
                                        ? "Rejecting..."
                                        : "Decline"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        approveApplicationMutation.mutate(
                                          application.acceptance.id,
                                        )
                                      }
                                      disabled={
                                        approveApplicationMutation.isPending
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {approveApplicationMutation.isPending
                                        ? "Approving..."
                                        : "Approve"}
                                    </Button>
                                  </div>
                                )}
                                {application.acceptance.status ===
                                  "awarded" && (
                                  <div className="px-6 pb-4">
                                    <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-lg p-3">
                                      <div className="flex items-center gap-2 text-emerald-400">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="font-medium">
                                          Application Approved
                                        </span>
                                      </div>
                                      <p className="text-sm text-emerald-300 mt-1">
                                        You approved this application. Waiting
                                        for applicant to share contact or
                                        reject.
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {application.acceptance.status ===
                                  "owner_rejected" && (
                                  <div className="px-6 pb-4">
                                    <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                      <div className="flex items-center gap-2 text-red-400">
                                        <X className="h-4 w-4" />
                                        <span className="font-medium">
                                          Application Rejected
                                        </span>
                                      </div>
                                      <p className="text-sm text-red-300 mt-1">
                                        You rejected this application. Trade
                                        remains available.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Results ---- */}
          <TabsContent
            value="request-results"
            forceMount
            className="tab-panel"
            data-state={
              activeTab === "request-results" ? "active" : "inactive"
            }>
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Your Results
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Completed trade interactions with contact details and outcomes
                </p>
              </CardHeader>
              <CardContent>
                {finalAcceptances.length === 0 &&
                finalApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-300">
                      No completed trade interactions yet
                    </p>
                    <p className="text-sm text-slate-400">
                      When applications are finalized (contact shared or
                      rejected), they will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* My Application Results */}
                    {finalAcceptances.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-emerald-400" />
                          My Application Results ({finalAcceptances.length})
                        </h3>
                        <div className="space-y-3">
                          {finalAcceptances.map((acceptance: any) => {
                            const { trade, offerMatch } = findTradeAndOffer(
                              acceptance.tradeId,
                              energyTrades,
                              availableTradesData,
                              acceptance.trade,
                            );
                            const meta = getApplicationStatusMeta(
                              acceptance.status,
                            );
                            const borderCls =
                              acceptance.status === "contacted"
                                ? "border-l-emerald-400"
                                : acceptance.status === "awarded"
                                  ? "border-l-blue-400"
                                  : "border-l-red-400";
                            const houseId =
                              trade?.sellerHouseholdId ||
                              trade?.buyerHouseholdId;

                            return (
                              <Card
                                key={acceptance.id}
                                className={`p-3 border-l-4 bg-slate-800/50 border-slate-600/50 ${borderCls}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 space-y-1">
                                    {trade ? (
                                      <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-base text-slate-200">
                                            {trade.tradeType === "sell"
                                              ? "Energy Purchase"
                                              : "Energy Sale"}
                                          </div>
                                          <div className="text-sm text-slate-400">
                                            {trade.energyAmount} at{" "}
                                            {trade.pricePerKwh} /kwh •{" "}
                                            {format(
                                              new Date(acceptance.acceptedAt),
                                              "MMM dd, yyyy",
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="font-medium text-base text-slate-200">
                                          Trade Application
                                        </div>
                                        <div className="text-xs text-slate-400">
                                          Reference: {acceptance.tradeId} •{" "}
                                          {format(
                                            new Date(acceptance.acceptedAt),
                                            "MMM dd, yyyy",
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={meta.variant}
                                        className="flex items-center gap-1">
                                        <meta.icon className="h-3 w-3" />
                                        {meta.label}
                                      </Badge>
                                      {meta.showDetail && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                          onClick={() => {
                                            setSelectedTradeDetail(acceptance);
                                            setIsDetailModalOpen(true);
                                          }}>
                                          <FileText className="h-3 w-3 mr-1" />
                                          Details
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ResultBanner
                                  status={acceptance.status}
                                  perspective="applicant"
                                />
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* My Trade Results */}
                    {finalApplications.length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4 text-emerald-400" />
                          My Trade Results ({finalApplications.length})
                        </h3>
                        <div className="space-y-3">
                          {finalApplications.map((application: any) => {
                            const meta = getApplicationStatusMeta(
                              application.acceptance.status,
                            );
                            const borderCls =
                              application.acceptance.status === "contacted"
                                ? "border-l-emerald-400"
                                : application.acceptance.status === "awarded"
                                  ? "border-l-blue-400"
                                  : "border-l-red-400";

                            return (
                              <Card
                                key={application.acceptance.id}
                                className={`p-3 border-l-4 bg-slate-800/50 border-slate-600/50 ${borderCls}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium text-base text-slate-200">
                                          {application.trade?.tradeType ===
                                          "sell"
                                            ? "Your Sell Listing"
                                            : "Your Buy Request"}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                          {application.trade?.energyAmount} at{" "}
                                          {application.trade?.pricePerKwh} /kwh
                                          •{" "}
                                          {format(
                                            new Date(
                                              application.acceptance.acceptedAt,
                                            ),
                                            "MMM dd, yyyy",
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={meta.variant}
                                        className="flex items-center gap-1">
                                        <meta.icon className="h-3 w-3" />
                                        {meta.label}
                                      </Badge>
                                      {meta.showDetail && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                          onClick={() => {
                                            setSelectedTradeDetail(application);
                                            setIsDetailModalOpen(true);
                                          }}>
                                          <FileText className="h-3 w-3 mr-1" />
                                          Details
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ResultBanner
                                  status={application.acceptance.status}
                                  perspective="owner"
                                />
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ---------- Edit Trade Dialog ---------- */}
        <EditTradeDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          form={editForm}
          onSubmit={(data) =>
            editingTrade &&
            updateTradeMutation.mutate({ id: editingTrade.id, data })
          }
          isPending={updateTradeMutation.isPending}
        />

        {/* ---------- Trade Detail Modal ---------- */}
        <TradeDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          detail={selectedTradeDetail}
          energyTrades={energyTrades}
          availableTradesData={availableTradesData}
        />
      </div>
    </div>
  );
}
