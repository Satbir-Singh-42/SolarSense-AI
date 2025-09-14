import { useAuth } from "@/hooks/use-auth";
import { formatTradePrice, formatTradeAmount, formatTradeTotal } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/navbar";
import { Calendar, Zap, AlertTriangle, CheckCircle, Loader2, LogIn, User, TrendingUp, TrendingDown, ShoppingCart, RefreshCw, Edit2, X, FileText, ArrowRight, ArrowLeft, Clock, Plus, Store, Handshake, Database } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EnergyTrade, Household } from "@/../../shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ExtendedEnergyTrade extends EnergyTrade {
  sellerHousehold?: { name: string; user: { username: string } };
  buyerHousehold?: { name: string; user: { username: string } };
  acceptanceCount?: number;
}

const tradeFormSchema = z.object({
  energyAmount: z.coerce.number().int("Energy amount must be a whole number").min(1, "Energy amount must be at least 1 kWh"),
  pricePerKwh: z.coerce.number().int("Price must be a whole number").min(1, "Price must be at least ₹1 per kWh"),
  tradeType: z.enum(["sell", "buy"], { required_error: "Trade type is required" }),
});

export default function StoragePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-listings' | 'my-requests' | 'applications' | 'request-results'>('my-listings');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [editingTrade, setEditingTrade] = useState<ExtendedEnergyTrade | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Animation states
  const [isMounted, setIsMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch energy trades
  const { data: energyTrades = [], isLoading, error, refetch } = useQuery<ExtendedEnergyTrade[]>({
    queryKey: ['/api/energy-trades'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchInterval: activeTab === 'my-listings' || activeTab === 'my-requests' ? 1000 * 45 : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Fetch available trade offers from other users  
  const { data: availableTradesData = [], isLoading: availableTradesLoading, refetch: refetchOffers } = useQuery<any[]>({
    queryKey: ['/api/trade-offers'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 3,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  // Fetch user's households
  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    enabled: !!user,
  });

  // Fetch user's trade acceptances (applications they submitted to other people's trades)
  const { data: tradeAcceptances = [], isLoading: acceptancesLoading, refetch: refetchAcceptances } = useQuery<any[]>({
    queryKey: ['/api/trade-acceptances'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchInterval: false,
    refetchOnWindowFocus: true,
  });

  // Fetch applications TO user's trades (people who want to accept their trades)
  const { data: tradeApplications = [], isLoading: applicationsLoading, error: applicationsError, refetch: refetchApplications } = useQuery<any[]>({
    queryKey: ['/api/my-trade-applications'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 2,
    refetchInterval: false,
    refetchOnWindowFocus: true,
  });

  // Memoized user household IDs
  const userHouseholdIds = useMemo(() => 
    userHouseholds.map(h => h.id), 
    [userHouseholds]
  );

  // Memoized helper function to check if trade belongs to user
  const isOwnTrade = useCallback((trade: ExtendedEnergyTrade) => {
    return (
      (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
      (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId))
    );
  }, [userHouseholdIds]);

  // Memoized sorted trades (avoid mutating original array)
  const sortedTrades = useMemo(() => 
    [...energyTrades].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ), 
    [energyTrades]
  );

  // Memoized application count mapping
  const applicationCountMap = useMemo(() => {
    const countMap = new Map<number, number>();
    tradeApplications.forEach((application: any) => {
      const tradeId = application.acceptance?.tradeId || application.tradeId;
      if (tradeId) {
        countMap.set(tradeId, (countMap.get(tradeId) || 0) + 1);
      }
    });
    return countMap;
  }, [tradeApplications]);

  // Memoized trade categorizations with application counts
  const myListings = useMemo(() =>
    sortedTrades
      .filter(trade => 
        trade.tradeType === 'sell' && trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)
      )
      .map(trade => ({
        ...trade,
        acceptanceCount: applicationCountMap.get(trade.id) || 0
      })),
    [sortedTrades, userHouseholdIds, applicationCountMap]
  );

  const myRequests = useMemo(() =>
    sortedTrades
      .filter(trade => 
        trade.tradeType === 'buy' && trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId)
      )
      .map(trade => ({
        ...trade,
        acceptanceCount: applicationCountMap.get(trade.id) || 0
      })),
    [sortedTrades, userHouseholdIds, applicationCountMap]
  );

  // Animation effects
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !applicationsLoading) {
      setTimeout(() => setDataLoaded(true), 100);
    }
  }, [isLoading, applicationsLoading]);

  const myAllTrades = useMemo(() =>
    sortedTrades.filter(trade => isOwnTrade(trade)),
    [sortedTrades, isOwnTrade]
  );

  // Memoized available offers
  const availableOffers = useMemo(() =>
    availableTradesData.map((item: any) => ({
      ...item.trade,
      sellerHousehold: item.household ? { name: item.household.name, user: { username: item.user?.username || 'Unknown' } } : undefined,
    })),
    [availableTradesData]
  );

  // Memoized user info display
  const userInfo = useMemo(() => {
    if (!user) return null;
    
    return {
      username: user.username,
      email: user.email,
      totalTrades: myAllTrades.length + tradeAcceptances.length + tradeApplications.length,
      activeSellListings: myListings.filter(t => t.status === 'pending').length,
      activeBuyRequests: myRequests.filter(t => t.status === 'pending').length,
      completedTrades: (() => {
        // Count completed trades: both awarded (auto contact share) and contacted status
        const completedStatuses = ['awarded', 'contacted'];
        const myCompletedApplications = tradeAcceptances.filter((acceptance: any) => 
          completedStatuses.includes(acceptance.status)
        ).length;
        
        const myCompletedTrades = tradeApplications.filter((application: any) => 
          completedStatuses.includes(application.acceptance?.status)
        ).length;
        
        return myCompletedApplications + myCompletedTrades;
      })(),
      joinDate: user.createdAt ? new Date(user.createdAt) : new Date(),
      availableOffers: availableOffers.length
    };
  }, [user, myAllTrades, myListings, myRequests, availableOffers, tradeAcceptances, tradeApplications]);

  // Helper function to get counterparty name safely
  const getCounterpartyName = useCallback((trade: ExtendedEnergyTrade) => {
    if (!user || !trade) return 'User';
    const isSeller = !!trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId);
    return isSeller
      ? (trade.buyerHousehold?.user?.username ?? 'Buyer')
      : (trade.sellerHousehold?.user?.username ?? 'Seller');
  }, [user, userHouseholdIds]);

  // Helper function to get acceptance counterparty name
  const getAcceptanceCounterparty = useCallback((acceptance: any) => {
    return acceptance.applicant?.username || acceptance.user?.username || 'User';
  }, []);

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tradeFormSchema>) => {
      return apiRequest('POST', '/api/energy-trades', {
        energyAmount: Math.round(data.energyAmount), // Store actual kWh value
        pricePerKwh: Math.round(data.pricePerKwh), // Store as rupees
        tradeType: data.tradeType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      setIsCreateDialogOpen(false);
      toast({
        title: "Trade Created",
        description: "Your energy trade has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof tradeFormSchema> }) => {
      return apiRequest('PUT', `/api/energy-trades/${id}`, {
        energyAmount: Math.round(data.energyAmount), // Store actual kWh value
        pricePerKwh: Math.round(data.pricePerKwh), // Store as rupees
        tradeType: data.tradeType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      toast({
        title: "Trade Updated",
        description: "Your energy trade has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel trade mutation with optimistic updates
  const cancelTradeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('PATCH', `/api/energy-trades/${id}/cancel`);
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/energy-trades'] });
      
      // Snapshot the previous value
      const previousTrades = queryClient.getQueryData<ExtendedEnergyTrade[]>(['/api/energy-trades']);
      
      // Optimistically update to the new value
      queryClient.setQueryData<ExtendedEnergyTrade[]>(['/api/energy-trades'], (old) => {
        if (!old) return old;
        return old.map(trade => 
          trade.id === id ? { ...trade, status: 'cancelled' as const } : trade
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousTrades };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Trade Cancelled",
        description: "Your energy trade has been cancelled successfully.",
      });
    },
    onError: (error: any, id: number, context) => {
      // Rollback on error
      if (context?.previousTrades) {
        queryClient.setQueryData(['/api/energy-trades'], context.previousTrades);
      }
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel trade. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
    },
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/energy-trades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Trade Deleted",
        description: "Your energy trade has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Accept trade mutation
  const acceptTradeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      return apiRequest('POST', '/api/trade-acceptances', { tradeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Trade Accepted",
        description: "You have successfully accepted this trade offer.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Share contact information mutation
  const shareContactMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('POST', `/api/trade-acceptances/${acceptanceId}/share-contact`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      toast({
        title: "Contact Shared Automatically",
        description: "Contact information has been shared automatically for energy delivery coordination.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share contact information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete trade mutation
  const completeTradeCompletionMutation = useMutation({
    mutationFn: async ({ acceptanceId, status }: { acceptanceId: number; status: string }) => {
      return apiRequest('PATCH', `/api/trade-acceptances/${acceptanceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      toast({
        title: "Trade Updated",
        description: "Trade status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trade status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel/withdraw application mutation
  const withdrawApplicationMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('DELETE', `/api/trade-acceptances/${acceptanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      toast({
        title: "Application Withdrawn",
        description: "Your application has been successfully withdrawn.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to withdraw application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Decline application mutation (owner rejects an application)
  const declineApplicationMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('PATCH', `/api/trade-acceptances/${acceptanceId}/owner-decision`, { 
        decision: 'reject' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Application Rejected",
        description: "The application has been rejected. Trade remains available for other applicants.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to reject application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve application mutation (owner accepts an application)
  const approveApplicationMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('PATCH', `/api/trade-acceptances/${acceptanceId}/owner-decision`, { 
        decision: 'accept' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Application Approved",
        description: "Application accepted! Waiting for applicant to share contact or reject.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Applicant reject mutation (applicant rejects after owner accepted)
  const applicantRejectMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('PATCH', `/api/trade-acceptances/${acceptanceId}/applicant-reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'], refetchType: 'all' });
      toast({
        title: "Trade Rejected",
        description: "You have rejected this trade. It's now available for other applicants.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApproveAndAutoShare = (acceptance: any) => {
    // Automatically share contact details without confirmation dialog
    shareContactMutation.mutate(acceptance.id);
  };

  const handleConfirmTransfer = (acceptance: any) => {
    completeTradeCompletionMutation.mutate({ acceptanceId: acceptance.id, status: 'completed' });
  };

  // Comprehensive refresh function that refreshes all data
  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetch(),
        refetchOffers(),
        refetchAcceptances(),
        refetchApplications()
      ]);
      toast({
        title: "Data Refreshed",
        description: "All trade data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createForm = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      energyAmount: 0,
      pricePerKwh: 0,
      tradeType: "sell",
    },
  });

  const editForm = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      energyAmount: 0,
      pricePerKwh: 0,
      tradeType: "sell",
    },
  });

  const handleEditTrade = (trade: ExtendedEnergyTrade) => {
    setEditingTrade(trade);
    editForm.reset({
      energyAmount: trade.energyAmount, // Use actual kWh value
      pricePerKwh: trade.pricePerKwh, // Already in rupees
      tradeType: trade.tradeType as "sell" | "buy",
    });
    setIsEditDialogOpen(true);
  };

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
                Please log in to view your energy trading history and manage your listings.
              </p>
              <Button 
                onClick={() => setLocation('/login')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-login"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Calendar className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatEnergy = (amount: number) => formatTradeAmount(amount);
  const formatPrice = (price: number) => formatTradePrice(price);
  const formatTotal = (amount: number, price: number) => formatTradeTotal(amount, price);

  // Comprehensive status mapping for all trade acceptance statuses
  const getApplicationStatusMeta = (status: string) => {
    switch (status) {
      case 'applied':
        return {
          label: 'Applied',
          variant: 'secondary' as const,
          icon: Calendar,
          dotClass: 'bg-yellow-500',
          showDetail: false
        };
      case 'awarded':
        return {
          label: 'Approved',
          variant: 'default' as const,
          icon: CheckCircle,
          dotClass: 'bg-blue-500',
          showDetail: true
        };
      case 'owner_rejected':
        return {
          label: 'Declined',
          variant: 'destructive' as const,
          icon: X,
          dotClass: 'bg-red-500',
          showDetail: false
        };
      case 'contacted':
        return {
          label: 'Contact Shared',
          variant: 'default' as const,
          icon: CheckCircle,
          dotClass: 'bg-green-500',
          showDetail: true
        };
      case 'applicant_rejected':
        return {
          label: 'Rejected',
          variant: 'destructive' as const,
          icon: X,
          dotClass: 'bg-red-500',
          showDetail: false
        };
      case 'withdrawn':
        return {
          label: 'Withdrawn',
          variant: 'outline' as const,
          icon: X,
          dotClass: 'bg-gray-500',
          showDetail: false
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          variant: 'outline' as const,
          icon: AlertTriangle,
          dotClass: 'bg-gray-500',
          showDetail: false
        };
    }
  };

  // Helper function to determine if a status allows viewing detail
  const canViewDetail = (status: string) => {
    return ['awarded', 'contacted'].includes(status);
  };

  // Helper function to get consistent badge configuration
  const getStatusBadgeConfig = (status: string) => {
    const meta = getApplicationStatusMeta(status);
    return {
      variant: meta.variant,
      icon: meta.icon,
      label: meta.label
    };
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar currentPage="storage" />
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 transition-all duration-300 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}>
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">Energy Trading Hub</h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Manage your energy listings, requests, and trading history
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={isLoading || availableTradesLoading || acceptancesLoading || applicationsLoading}
              className="flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none btn-smooth"
              data-testid="button-refresh"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || availableTradesLoading || acceptancesLoading || applicationsLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoading || availableTradesLoading || acceptancesLoading || applicationsLoading ? 'Updating...' : 'Refresh'}</span>
              <span className="sm:hidden">{isLoading || availableTradesLoading || acceptancesLoading || applicationsLoading ? 'Update' : 'Refresh'}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/?tab=energy-trading')}
              className="flex items-center justify-center gap-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 flex-1 sm:flex-none btn-smooth"
              data-testid="button-trade-market"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="sm:inline">Trade Market</span>
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none btn-smooth">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">Create Trade</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800/50 border-slate-600/50">
                <DialogHeader>
                  <DialogTitle className="text-slate-200">Create Energy Trade</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit((data) => createTradeMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="tradeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:border-red-500">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTradeMutation.isPending}>
                        {createTradeMutation.isPending ? 'Creating...' : 'Create Trade'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* User Stats Cards */}
        {userInfo && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <Store className="h-4 w-4 text-blue-400" />
                  My Sell Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{userInfo.activeSellListings}</div>
                <p className="text-xs text-slate-400">Energy for sale</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <ShoppingCart className="h-4 w-4 text-emerald-400" />
                  My Buy Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">{userInfo.activeBuyRequests}</div>
                <p className="text-xs text-slate-400">Energy needed</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <Handshake className="h-4 w-4 text-blue-400" />
                  Available Offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{userInfo.availableOffers}</div>
                <p className="text-xs text-slate-400">To accept</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <CheckCircle className="h-4 w-4 text-purple-400" />
                  Completed Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{userInfo.completedTrades}</div>
                <p className="text-xs text-slate-400">Successful</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  Total Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-400">{userInfo.totalTrades}</div>
                <p className="text-xs text-slate-400">All time</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Source Status */}
        <Card className="mb-6 bg-slate-800/50 border-slate-600/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  <span className="font-medium text-sm sm:text-base text-slate-200">Data Status:</span>
                </div>
                <div className="flex items-center gap-2 ml-6 sm:ml-0" data-testid="connection-status">
                  {!isLoading && !error && energyTrades.length > 0 && (
                    <Badge variant="default" className="text-xs sm:text-sm">
                      Connected • {energyTrades.filter(trade => trade.status === 'pending').length} active trade{energyTrades.filter(trade => trade.status === 'pending').length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {!isLoading && energyTrades.length === 0 && (
                    <Badge variant="outline" className="text-xs sm:text-sm">No trades in system</Badge>
                  )}
                  {error && (
                    <Badge variant="destructive" className="text-xs sm:text-sm">Connection Error</Badge>
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <Badge variant="secondary" className="text-xs sm:text-sm">Loading...</Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-400 ml-6 sm:ml-0" aria-live="polite" data-testid="last-updated">
                Last updated: {format(new Date(), 'HH:mm:ss')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Trading Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 sm:gap-2 text-xs sm:text-sm mb-6 bg-slate-800/50 border-slate-600/50">
            <TabsTrigger value="my-listings" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-listings">
              <Store className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sell Listings</span>
              <span className="sm:hidden">Sell</span>
              ({myListings.length})
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-requests">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Buy Requests</span>
              <span className="sm:hidden">Buy</span>
              ({myRequests.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-applications">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
              ({(() => {
                // Count only non-finalized applications (same logic as content filtering)
                const nonFinalizedStatuses = ['applied', 'pending']; // Active statuses only
                const myActiveAcceptances = tradeAcceptances.filter((acceptance: any) => 
                  !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(acceptance.status)
                );
                const myActiveApplications = tradeApplications.filter((application: any) => 
                  !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(application.acceptance?.status)
                );
                return myActiveAcceptances.length + myActiveApplications.length;
              })()})
            </TabsTrigger>
            <TabsTrigger value="request-results" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-request-results">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Results</span>
              <span className="sm:hidden">Results</span>
              ({(() => {
                // Use centralized status mapping to determine finalized results
                const finalizedStatuses = ['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'];
                const myApplicationResults = tradeAcceptances.filter((acceptance: any) => 
                  finalizedStatuses.includes(acceptance.status)
                );
                const myTradeResults = tradeApplications.filter((application: any) => 
                  finalizedStatuses.includes(application.acceptance?.status)
                );
                return myApplicationResults.length + myTradeResults.length;
              })()})
            </TabsTrigger>
          </TabsList>

          {/* My Sell Listings */}
          <TabsContent value="my-listings" forceMount className="tab-panel" data-state={activeTab === 'my-listings' ? 'active' : 'inactive'}>
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
                  <div className="text-center py-8" data-testid="empty-listings">
                    <Store className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No sell listings yet</p>
                    <p className="text-sm text-slate-500">Create energy listings to start selling surplus power</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myListings.map((trade, index) => (
                      <Card key={trade.id} className={`p-3 sm:p-4 bg-slate-700/50 border-slate-600/50 card-stagger ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{animationDelay: `${index * 50}ms`}}>
                        <div className="mb-4">
                          {/* Mobile compact layout */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold text-lg text-emerald-400">{formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                              <Badge variant={trade.acceptanceCount && trade.acceptanceCount > 0 ? "secondary" : getStatusBadgeVariant(trade.status)} className="flex items-center gap-1 text-xs" data-testid={`status-badge-mobile-${trade.id}`}>
                                {trade.acceptanceCount && trade.acceptanceCount > 0 ? <User className="h-3 w-3" /> : getStatusIcon(trade.status)}
                                {trade.acceptanceCount && trade.acceptanceCount > 0 ? `${trade.acceptanceCount} applied` : trade.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400 mb-2" data-testid={`text-date-mobile-${trade.id}`}>
                              Listed: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                            {trade.acceptanceCount !== undefined && trade.acceptanceCount > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs mb-2" data-testid={`badge-acceptances-mobile-${trade.id}`}>
                                <User className="h-3 w-3" />
                                {trade.acceptanceCount} applied
                              </Badge>
                            )}
                            <div className="flex justify-between text-sm" data-testid={`mobile-details-${trade.id}`}>
                              <span className="font-medium text-slate-200" data-testid={`text-amount-mobile-${trade.id}`}>{formatEnergy(trade.energyAmount)}</span>
                              <span className="font-semibold text-slate-400" data-testid={`text-price-mobile-${trade.id}`}>{formatTradePrice(trade.pricePerKwh)}/kWh</span>
                            </div>
                          </div>
                          
                          {/* Desktop layout */}
                          <div className="hidden sm:block">
                            <div className="flex justify-between items-start gap-3 mb-4">
                              <div className="flex-1">
                                <div className="font-bold text-xl text-emerald-400 mb-2">{formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                                <div className="text-sm text-slate-400">
                                  Listed: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={trade.acceptanceCount && trade.acceptanceCount > 0 ? "secondary" : getStatusBadgeVariant(trade.status)} className="flex items-center gap-1 text-xs">
                                  {trade.acceptanceCount && trade.acceptanceCount > 0 ? <User className="h-3 w-3" /> : getStatusIcon(trade.status)}
                                  {trade.acceptanceCount && trade.acceptanceCount > 0 ? `${trade.acceptanceCount} applied` : trade.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                              <div className="font-medium text-base text-slate-200">{formatEnergy(trade.energyAmount)}</div>
                              <div className="font-semibold text-slate-400">{formatTradePrice(trade.pricePerKwh)}/kWh</div>
                            </div>
                          </div>
                        </div>
                        {trade.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {trade.acceptanceCount && trade.acceptanceCount > 0 ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setActiveTab('applications')}
                                className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-blue-600/50 hover:bg-blue-600 text-slate-200 border-blue-500"
                                data-testid="button-view-applications"
                              >
                                <FileText className="h-3 w-3" />
                                Applications
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditTrade(trade)}
                                className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-slate-600/50 hover:bg-slate-600 text-slate-200 border-slate-500"
                                data-testid="button-edit-trade"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelTradeMutation.mutate(trade.id)}
                              disabled={cancelTradeMutation.isPending}
                              className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/50"
                              data-testid="button-cancel-trade"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Buy Requests */}
          <TabsContent value="my-requests" forceMount className="tab-panel" data-state={activeTab === 'my-requests' ? 'active' : 'inactive'}>
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
                  <div className="text-center py-8" data-testid="empty-requests">
                    <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No buy requests yet</p>
                    <p className="text-sm text-slate-500">Create requests to purchase energy from other users</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((trade, index) => (
                      <Card key={trade.id} className={`p-3 sm:p-4 bg-slate-700/50 border-slate-600/50 card-stagger ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{animationDelay: `${index * 50}ms`}}>
                        <div className="mb-4">
                          {/* Mobile compact layout */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold text-lg text-blue-400">{formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                              <Badge variant={trade.acceptanceCount && trade.acceptanceCount > 0 ? "secondary" : getStatusBadgeVariant(trade.status)} className="flex items-center gap-1 text-xs" data-testid={`status-badge-mobile-${trade.id}`}>
                                {trade.acceptanceCount && trade.acceptanceCount > 0 ? <User className="h-3 w-3" /> : getStatusIcon(trade.status)}
                                {trade.acceptanceCount && trade.acceptanceCount > 0 ? `${trade.acceptanceCount} applied` : trade.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400 mb-2" data-testid={`text-date-mobile-${trade.id}`}>
                              Requested: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                            {trade.acceptanceCount !== undefined && trade.acceptanceCount > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs mb-2" data-testid={`badge-acceptances-mobile-${trade.id}`}>
                                <User className="h-3 w-3" />
                                {trade.acceptanceCount} applied
                              </Badge>
                            )}
                            <div className="flex justify-between text-sm" data-testid={`mobile-details-${trade.id}`}>
                              <span className="font-medium text-slate-200" data-testid={`text-amount-mobile-${trade.id}`}>{formatEnergy(trade.energyAmount)}</span>
                              <span className="font-semibold text-slate-400" data-testid={`text-price-mobile-${trade.id}`}>{formatTradePrice(trade.pricePerKwh)}/kWh</span>
                            </div>
                          </div>
                          
                          {/* Desktop layout */}
                          <div className="hidden sm:block">
                            <div className="flex justify-between items-start gap-3 mb-4">
                              <div className="flex-1">
                                <div className="font-bold text-xl text-blue-400 mb-2">{formatTradeTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                                <div className="text-sm text-slate-400">
                                  Requested: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={trade.acceptanceCount && trade.acceptanceCount > 0 ? "secondary" : getStatusBadgeVariant(trade.status)} className="flex items-center gap-1 text-xs">
                                  {trade.acceptanceCount && trade.acceptanceCount > 0 ? <User className="h-3 w-3" /> : getStatusIcon(trade.status)}
                                  {trade.acceptanceCount && trade.acceptanceCount > 0 ? `${trade.acceptanceCount} applied` : trade.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                              <div className="font-medium text-base text-slate-200">{formatEnergy(trade.energyAmount)}</div>
                              <div className="font-semibold text-slate-400">{formatTradePrice(trade.pricePerKwh)}/kWh</div>
                            </div>
                          </div>
                        </div>
                        {trade.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {trade.acceptanceCount && trade.acceptanceCount > 0 ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setActiveTab('applications')}
                                className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-blue-600/50 hover:bg-blue-600 text-slate-200 border-blue-500"
                                data-testid="button-view-applications"
                              >
                                <FileText className="h-3 w-3" />
                                Applications
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditTrade(trade)}
                                className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-slate-600/50 hover:bg-slate-600 text-slate-200 border-slate-500"
                                data-testid="button-edit-trade"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelTradeMutation.mutate(trade.id)}
                              disabled={cancelTradeMutation.isPending}
                              className="flex items-center justify-center gap-1 min-h-[44px] w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/50"
                              data-testid="button-cancel-trade"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications - Combined Tab */}
          <TabsContent value="applications" forceMount className="tab-panel" data-state={activeTab === 'applications' ? 'active' : 'inactive'}>
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Applications
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Applications you submitted to others and applications others submitted to your trades
                </p>
              </CardHeader>
              <CardContent>
                {(acceptancesLoading || applicationsLoading) ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-400">Loading applications...</p>
                  </div>
                ) : (tradeAcceptances.length === 0 && tradeApplications.length === 0) ? (
                  <div className="text-center py-8" data-testid="empty-applications">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No applications yet</p>
                    <p className="text-sm text-slate-500">Apply to energy trades or wait for others to apply to your trades</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Applications I submitted to others */}
                    {tradeAcceptances.filter((acceptance: any) => 
                      !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(acceptance.status)
                    ).length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-emerald-400" />
                          Applications I Submitted ({tradeAcceptances.filter((acceptance: any) => 
                            !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(acceptance.status)
                          ).length})
                        </h3>
                        <div className="space-y-4">
                          {tradeAcceptances.filter((acceptance: any) => 
                            !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(acceptance.status)
                          ).map((acceptance: any) => {
                            // Find trade and offer match data
                            let trade = energyTrades.find(t => t.id === acceptance.tradeId);
                            let offerMatch = null;
                            
                            if (!trade) {
                              offerMatch = availableTradesData.find(o => o.trade?.id === acceptance.tradeId);
                              trade = offerMatch?.trade;
                            } else {
                              offerMatch = availableTradesData.find(o => o.trade?.id === trade?.id);
                            }
                            
                            const statusMeta = getApplicationStatusMeta(acceptance.status);
                            
                            return (
                              <Card key={acceptance.id} className="overflow-hidden border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-700/50 border-slate-600/50" data-testid={`card-application-${acceptance.id}`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-5 w-5 text-emerald-400" />
                                      <h3 className="text-lg font-semibold text-slate-200" data-testid={`text-title-${acceptance.id}`}>
                                        Energy {trade?.tradeType === 'sell' ? 'Sale' : 'Purchase'}: {formatEnergy(trade?.energyAmount || 0)}
                                      </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={statusMeta.variant} className="flex items-center gap-1" data-testid={`badge-status-${acceptance.id}`}>
                                        <statusMeta.icon className="h-3 w-3" />
                                        {statusMeta.label}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                                    Applied: {format(new Date(acceptance.acceptedAt), 'MMM dd, yyyy HH:mm')}
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="py-3">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                      <User className="h-4 w-4 text-emerald-400" />
                                      <span>Applicant Details</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-slate-400">Name:</span>
                                        <div className="font-medium text-slate-200">{user?.username || 'User'}</div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">Household:</span>
                                        <div className="font-medium text-slate-200">{userHouseholds[0]?.name || 'Not specified'}</div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">Location:</span>
                                        <div className="font-medium text-slate-200">
                                          {user?.district || 'Not specified'}
                                          {user?.state && `, ${user.state}`}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">Contact:</span>
                                        <div className="font-medium text-slate-200">
                                          {acceptance.status === 'awarded' 
                                            ? (
                                                <div className="space-y-1">
                                                  <div>{user?.email || 'Email not available'}</div>
                                                  {user?.phone && (
                                                    <div>{user.phone}</div>
                                                  )}
                                                  {userHouseholds[0]?.address && (
                                                    <div className="text-xs text-slate-400">Address: {userHouseholds[0].address}</div>
                                                  )}
                                                </div>
                                              )
                                            : 'Hidden until approved'
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                                
                                <CardFooter className="pt-3 border-t border-slate-600/50">
                                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                                    <div>
                                      <span className="text-slate-400">Energy Amount:</span>
                                      <div className="font-semibold text-slate-200" data-testid={`text-amount-${acceptance.id}`}>{trade?.energyAmount || 0}</div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Price:</span>
                                      <div className="font-semibold text-emerald-400" data-testid={`text-price-${acceptance.id}`}>{trade?.pricePerKwh || 0} /kwh</div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Status:</span>
                                      <div className="flex items-center gap-1 font-medium text-slate-200">
                                        <div className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`}></div>
                                        {statusMeta.label}
                                      </div>
                                    </div>
                                  </div>
                                </CardFooter>
                              
                              {/* Action buttons */}
                              {acceptance.status === 'applied' && (
                                <div className="px-6 pb-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => withdrawApplicationMutation.mutate(acceptance.id)}
                                    disabled={withdrawApplicationMutation.isPending}
                                    className="text-red-600 border-red-300 hover:bg-red-50 w-full"
                                    data-testid="button-withdraw-application"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    {withdrawApplicationMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
                                  </Button>
                                </div>
                              )}
                              
                              {acceptance.status === 'awarded' && (
                                <div className="px-6 pb-4">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => applicantRejectMutation.mutate(acceptance.id)}
                                      disabled={applicantRejectMutation.isPending}
                                      className="text-red-600 border-red-300 hover:bg-red-50 flex-1"
                                      data-testid="button-reject-trade"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {applicantRejectMutation.isPending ? 'Rejecting...' : 'Decline'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => shareContactMutation.mutate(acceptance.id)}
                                      disabled={shareContactMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700 flex-1"
                                      data-testid="button-share-contact"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {shareContactMutation.isPending ? 'Sharing...' : 'Share Contact'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Applications from others to my trades */}
                    {tradeApplications.filter((application: any) => 
                      !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(application.acceptance.status)
                    ).length > 0 && (
                      <div>
                        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4 text-emerald-400" />
                          Applications to My Trades ({tradeApplications.filter((application: any) => 
                            !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(application.acceptance.status)
                          ).length})
                        </h3>
                        <div className="space-y-4">
                          {tradeApplications.filter((application: any) => 
                            !['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'].includes(application.acceptance.status)
                          ).map((application: any) => {
                            const statusMeta = getApplicationStatusMeta(application.acceptance.status);
                            
                            return (
                            <Card key={application.acceptance.id} className="overflow-hidden border-l-4 border-l-emerald-400 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-800/50 border-slate-600/50" data-testid={`card-application-${application.acceptance.id}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-emerald-400" />
                                    <h3 className="text-lg font-semibold text-slate-200" data-testid={`text-title-${application.acceptance.id}`}>
                                      Energy {application.trade?.tradeType === 'sell' ? 'Sale' : 'Purchase'}: {formatEnergy(application.trade?.energyAmount || 0)}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={statusMeta.variant} className="flex items-center gap-1" data-testid={`badge-status-${application.acceptance.id}`}>
                                      <statusMeta.icon className="h-3 w-3" />
                                      {statusMeta.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                                  Applied: {format(new Date(application.acceptance.acceptedAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </CardHeader>

                              <CardContent className="py-3">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <User className="h-4 w-4 text-emerald-400" />
                                    <span>Applicant Details</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-slate-400">Name:</span>
                                      <div className="font-medium text-slate-200">{application.applicant?.username || 'User'}</div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Household:</span>
                                      <div className="font-medium text-slate-200">{application.applicantHousehold?.name || 'Not specified'}</div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Location:</span>
                                      <div className="font-medium text-slate-200">
                                        {application.applicant?.district || 'Not specified'}
                                        {application.applicant?.state && `, ${application.applicant.state}`}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Contact:</span>
                                      <div className="font-medium text-slate-200">
                                        {application.acceptance.status === 'awarded' 
                                          ? (
                                              <div className="space-y-1">
                                                <div>{application.applicant?.email || 'Email not available'}</div>
                                                {application.applicant?.phone && (
                                                  <div>{application.applicant.phone}</div>
                                                )}
                                                {application.applicantHousehold?.address && (
                                                  <div className="text-xs text-slate-400">Address: {application.applicantHousehold.address}</div>
                                                )}
                                              </div>
                                            )
                                          : 'Hidden until approved'
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>

                              <CardFooter className="pt-3 border-t border-slate-600/50">
                                <div className="grid grid-cols-3 gap-4 w-full text-sm">
                                  <div>
                                    <span className="text-slate-400">Energy Amount:</span>
                                    <div className="font-semibold text-slate-200" data-testid={`text-amount-${application.acceptance.id}`}>{application.trade?.energyAmount || 0}</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Price:</span>
                                    <div className="font-semibold text-emerald-400" data-testid={`text-price-${application.acceptance.id}`}>{application.trade?.pricePerKwh || 0} /kwh</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Status:</span>
                                    <div className="flex items-center gap-1 font-medium text-slate-200">
                                      <div className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`}></div>
                                      {statusMeta.label}
                                    </div>
                                  </div>
                                </div>
                              </CardFooter>

                              
                              {/* Action buttons */}
                              {application.acceptance.status === 'applied' && (
                                <div className="px-6 pb-4">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => declineApplicationMutation.mutate(application.acceptance.id)}
                                      disabled={declineApplicationMutation.isPending}
                                      className="text-red-400 border-red-600/50 hover:bg-red-900/20 bg-slate-700/50 flex-1"
                                      data-testid="button-reject-application"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {declineApplicationMutation.isPending ? 'Rejecting...' : 'Decline'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => approveApplicationMutation.mutate(application.acceptance.id)}
                                      disabled={approveApplicationMutation.isPending}
                                      className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                                      data-testid="button-approve-application"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {approveApplicationMutation.isPending ? 'Approving...' : 'Approve'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {application.acceptance.status === 'awarded' && (
                                <div className="px-6 pb-4">
                                  <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                      <CheckCircle className="h-4 w-4" />
                                      <span className="font-medium">Application Approved</span>
                                    </div>
                                    <p className="text-sm text-emerald-300 mt-1">
                                      You approved this application. Waiting for applicant to share contact or reject.
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {application.acceptance.status === 'owner_rejected' && (
                                <div className="px-6 pb-4">
                                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-red-400">
                                      <X className="h-4 w-4" />
                                      <span className="font-medium">Application Rejected</span>
                                    </div>
                                    <p className="text-sm text-red-300 mt-1">
                                      You rejected this application. Trade remains available.
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

          {/* Your Results */}
          <TabsContent value="request-results" forceMount className="tab-panel" data-state={activeTab === 'request-results' ? 'active' : 'inactive'}>
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
                {(() => {
                  // Get results from both sources using centralized status mapping
                  // Include all finalized statuses that represent completed interactions
                  const getFinalizedStatuses = () => {
                    return ['contacted', 'applicant_rejected', 'awarded', 'owner_rejected', 'withdrawn'];
                  };
                  
                  const finalizedStatuses = getFinalizedStatuses();
                  const myApplicationResults = tradeAcceptances.filter((acceptance: any) => 
                    finalizedStatuses.includes(acceptance.status)
                  );
                  
                  const myTradeResults = tradeApplications.filter((application: any) => 
                    finalizedStatuses.includes(application.acceptance?.status)
                  );
                  
                  const allResults = [...myApplicationResults, ...myTradeResults];
                  
                  if (allResults.length === 0) {
                    return (
                      <div className="text-center py-8" data-testid="empty-results">
                        <CheckCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-300">No completed trade interactions yet</p>
                        <p className="text-sm text-slate-400">When applications are finalized (contact shared or rejected), they will appear here</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {/* Results from applications I submitted */}
                      {myApplicationResults.length > 0 && (
                        <div>
                          <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-emerald-400" />
                            My Application Results ({myApplicationResults.length})
                          </h3>
                          <div className="space-y-3">
                            {myApplicationResults.map((acceptance: any) => (
                              <Card key={acceptance.id} className={`p-3 border-l-4 bg-slate-800/50 border-slate-600/50 ${
                                acceptance.status === 'contacted' 
                                  ? 'border-l-emerald-400' 
                                  : acceptance.status === 'awarded' 
                                    ? 'border-l-blue-400'
                                    : 'border-l-red-400'
                              }`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="space-y-1">
                                      {(() => {
                                        // First try to find in energyTrades (my own trades), then in availableTradesData (others' trades)
                                        let trade = energyTrades.find(t => t.id === acceptance.tradeId);
                                        let offerMatch = null;
                                        
                                        if (!trade) {
                                          // Look for the trade in available trades data (trades from others)
                                          offerMatch = availableTradesData.find(o => o.trade?.id === acceptance.tradeId);
                                          trade = offerMatch?.trade;
                                        } else {
                                          // Find the counterparty information for my own trades
                                          offerMatch = availableTradesData.find(o => o.trade?.id === trade?.id);
                                        }
                                        
                                        if (!trade && !acceptance.trade) return (
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="font-medium text-base text-slate-200">Trade Application</div>
                                            <div className="text-xs text-slate-400">
                                              Reference: {acceptance.tradeId} • {format(new Date(acceptance.acceptedAt), 'MMM dd, yyyy')}
                                            </div>
                                          </div>
                                        );
                                        
                                        // Use trade from acceptance if available
                                        if (!trade && acceptance.trade) {
                                          trade = acceptance.trade;
                                        }
                                        
                                        // Ensure we have trade data before proceeding
                                        if (!trade) return null;
                                        
                                        const tradeHouseholdId = trade.sellerHouseholdId || trade.buyerHouseholdId;
                                        const counterpartyName = offerMatch?.household?.name || (tradeHouseholdId ? `Household ${tradeHouseholdId}` : 'User');
                                        
                                        return (
                                          <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="font-medium text-base text-slate-200">
                                                {trade.tradeType === 'sell' ? 'Energy Purchase' : 'Energy Sale'}
                                              </div>
                                              <div className="text-sm text-slate-400">
                                                {trade.energyAmount} at {trade.pricePerKwh} /kwh • {format(new Date(acceptance.acceptedAt), 'MMM dd, yyyy')}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const statusConfig = getStatusBadgeConfig(acceptance.status);
                                          const StatusIcon = statusConfig.icon;
                                          return (
                                            <Badge 
                                              variant={statusConfig.variant}
                                              className="flex items-center gap-1"
                                            >
                                              <StatusIcon className="h-3 w-3" />
                                              {statusConfig.label}
                                            </Badge>
                                          );
                                        })()}
                                        {canViewDetail(acceptance.status) && (
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                            onClick={() => {
                                              setSelectedTradeDetail(acceptance);
                                              setIsDetailModalOpen(true);
                                            }}
                                            data-testid={`button-view-detail-${acceptance.id}`}
                                          >
                                            <FileText className="h-3 w-3 mr-1" />
                                            Details
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {(() => {
                                  switch (acceptance.status) {
                                    case 'contacted':
                                      return (
                                        <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">Contact Details Shared</span>
                                          </div>
                                          <p className="text-sm text-emerald-300 mb-3">
                                            You shared contact details with the trade owner. Both parties can now coordinate the energy transfer.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'awarded':
                                      return (
                                        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-blue-400 mb-2">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">Application Approved</span>
                                          </div>
                                          <p className="text-sm text-blue-300 mb-3">
                                            Great news! The trade owner approved your application. Contact details have been automatically shared and both parties can now coordinate the energy transfer.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'applicant_rejected':
                                      return (
                                        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Trade Rejected</span>
                                          </div>
                                          <p className="text-sm text-red-300 mb-3">
                                            You rejected this trade after the owner accepted your application. The trade is now available for other applicants.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'owner_rejected':
                                      return (
                                        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Application Declined</span>
                                          </div>
                                          <p className="text-sm text-red-300 mb-3">
                                            The trade owner declined your application. You can look for other available trades in the marketplace.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'withdrawn':
                                      return (
                                        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-slate-300 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Application Withdrawn</span>
                                          </div>
                                          <p className="text-sm text-slate-400 mb-3">
                                            You withdrew your application before the trade owner could respond. The trade remains available for other applicants.
                                          </p>
                                        </div>
                                      );
                                    
                                    default:
                                      return (
                                        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-slate-300 mb-2">
                                            <Clock className="h-4 w-4" />
                                            <span className="font-medium">Status: {acceptance.status}</span>
                                          </div>
                                          <p className="text-sm text-slate-400">
                                            Application status is being processed.
                                          </p>
                                        </div>
                                      );
                                  }
                                })()}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Results from applications to my trades */}
                      {myTradeResults.length > 0 && (
                        <div>
                          <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4 text-emerald-400" />
                            My Trade Results ({myTradeResults.length})
                          </h3>
                          <div className="space-y-3">
                            {myTradeResults.map((application: any) => (
                              <Card key={application.acceptance.id} className={`p-3 border-l-4 bg-slate-800/50 border-slate-600/50 ${
                                application.acceptance.status === 'contacted' 
                                  ? 'border-l-emerald-400' 
                                  : application.acceptance.status === 'awarded' 
                                    ? 'border-l-blue-400'
                                    : 'border-l-red-400'
                              }`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium text-base text-slate-200">
                                          {application.trade?.tradeType === 'sell' ? 'Your Sell Listing' : 'Your Buy Request'}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                          {application.trade?.energyAmount} at {application.trade?.pricePerKwh} /kwh • {format(new Date(application.acceptance.acceptedAt), 'MMM dd, yyyy')}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const statusConfig = getStatusBadgeConfig(application.acceptance.status);
                                        const StatusIcon = statusConfig.icon;
                                        return (
                                          <Badge 
                                            variant={statusConfig.variant}
                                            className="flex items-center gap-1"
                                          >
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig.label}
                                          </Badge>
                                        );
                                      })()}
                                      {canViewDetail(application.acceptance.status) && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                          onClick={() => {
                                            setSelectedTradeDetail(application);
                                            setIsDetailModalOpen(true);
                                          }}
                                          data-testid={`button-view-detail-trade-${application.acceptance.id}`}
                                        >
                                          <FileText className="h-3 w-3 mr-1" />
                                          Details
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {(() => {
                                  switch (application.acceptance.status) {
                                    case 'contacted':
                                      return (
                                        <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">Contact Details Shared</span>
                                          </div>
                                          <p className="text-sm text-emerald-300 mb-3">
                                            The applicant shared contact details. Both parties can now coordinate the energy transfer.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'awarded':
                                      return (
                                        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-blue-400 mb-2">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">Application Approved</span>
                                          </div>
                                          <p className="text-sm text-blue-300">
                                            You approved this application. Contact details have been automatically shared and both parties can now coordinate the energy transfer.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'applicant_rejected':
                                      return (
                                        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Application Rejected by Applicant</span>
                                          </div>
                                          <p className="text-sm text-red-300 mb-3">
                                            The applicant rejected the trade after you approved their application. Your trade is now available for other applicants.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'owner_rejected':
                                      return (
                                        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Application Declined</span>
                                          </div>
                                          <p className="text-sm text-red-300 mb-3">
                                            You declined this application. Your trade remains available for other applicants.
                                          </p>
                                        </div>
                                      );
                                    
                                    case 'withdrawn':
                                      return (
                                        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-slate-300 mb-2">
                                            <X className="h-4 w-4" />
                                            <span className="font-medium">Application Withdrawn</span>
                                          </div>
                                          <p className="text-sm text-slate-400 mb-3">
                                            The applicant withdrew their application before you could respond. Your trade remains available.
                                          </p>
                                        </div>
                                      );
                                    
                                    default:
                                      return (
                                        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                                          <div className="flex items-center gap-2 text-slate-300 mb-2">
                                            <Clock className="h-4 w-4" />
                                            <span className="font-medium">Status: {application.acceptance.status}</span>
                                          </div>
                                          <p className="text-sm text-slate-400">
                                            Application status is being processed.
                                          </p>
                                        </div>
                                      );
                                  }
                                })()}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Edit Trade Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent 
            className="w-[95vw] sm:max-w-[500px] p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-2xl mx-2 sm:mx-0 bg-slate-900/95 backdrop-blur-xl border border-slate-600/40 shadow-2xl shadow-black/20"
            data-testid="dialog-edit-trade"
          >
            <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2 text-center sm:text-left break-words mb-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              Edit Energy Trade
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm sm:text-base leading-relaxed border-b border-slate-700/50 pb-4 mb-4 break-words">
              Update your trade details below. All changes are validated in real-time.
            </DialogDescription>
            <Form {...editForm}>
              <form id="edit-trade-form" onSubmit={editForm.handleSubmit((data) => editingTrade && updateTradeMutation.mutate({ id: editingTrade.id, data }))} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={editForm.control}
                    name="tradeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-semibold text-sm sm:text-base flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                          </div>
                          Trade Type
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-trade-type"
                              className="h-11 sm:h-12 bg-slate-800/70 border-slate-600/50 hover:border-slate-500/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 rounded-lg text-slate-100"
                            >
                              <SelectValue placeholder="Choose your trade type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800/95 backdrop-blur-sm border-slate-600/50 rounded-lg">
                            <SelectItem value="sell" className="flex items-center">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-400" />
                                Sell Energy
                              </div>
                            </SelectItem>
                            <SelectItem value="buy" className="flex items-center">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-blue-400" />
                                Buy Energy
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">Choose your trading action</p>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="energyAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-semibold text-sm sm:text-base flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-yellow-500/20 flex items-center justify-center">
                            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                          </div>
                          Energy Amount
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              data-testid="input-energy-amount"
                              className="h-11 sm:h-12 bg-slate-800/70 border-slate-600/50 hover:border-slate-500/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 pl-9 sm:pl-10 pr-12 sm:pr-14 text-slate-100 placeholder:text-slate-500 rounded-lg"
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              placeholder="Enter kWh"
                              {...field}
                            />
                            <Zap className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400/70" />
                            <div className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 bg-slate-700/80 text-slate-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold">
                              kWh
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">Whole numbers only, minimum 1 kWh</p>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="pricePerKwh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-semibold text-sm sm:text-base flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-green-500/20 flex items-center justify-center">
                            <Store className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                          </div>
                          Price per kWh
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              data-testid="input-price-per-kwh"
                              className="h-11 sm:h-12 bg-slate-800/70 border-slate-600/50 hover:border-slate-500/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 pl-9 sm:pl-10 pr-14 sm:pr-16 text-slate-100 placeholder:text-slate-500 rounded-lg"
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              placeholder="Enter price"
                              {...field}
                            />
                            <Store className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400/70" />
                            <div className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 bg-slate-700/80 text-slate-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold">
                              ₹/kWh
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">Set your rate in rupees per kWh</p>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
              </form>
            </Form>
            
            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-t border-slate-600/40 pt-4 mt-6 pb-[calc(env(safe-area-inset-bottom)+12px)] flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsEditDialogOpen(false)} 
                data-testid="button-cancel"
                className="w-full sm:w-auto text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-all duration-300 px-4 py-2.5 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                form="edit-trade-form"
                disabled={updateTradeMutation.isPending || !editForm.formState.isDirty || !editForm.formState.isValid}
                data-testid="button-update"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-700 hover:via-cyan-700 hover:to-emerald-700 text-white font-semibold shadow-xl shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm rounded-lg"
                onClick={() => {
                  const form = document.getElementById('edit-trade-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
              >
                {updateTradeMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Trade'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trade Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="w-full max-w-[min(100vw-24px,40rem)] sm:max-w-2xl p-4 sm:p-6 overflow-hidden bg-slate-900/95 border-slate-700/60">
            <DialogHeader className="pb-3 border-b border-slate-600/30">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-slate-200">Trade Details</span>
              </DialogTitle>
            </DialogHeader>
            {selectedTradeDetail && (
              <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden space-y-3 min-w-0">
                {(() => {
                  // Determine if this is from myApplicationResults or myTradeResults
                  const isMyApplication = selectedTradeDetail.tradeId;
                  const isMyTrade = selectedTradeDetail.trade;
                  
                  if (isMyApplication) {
                    // This is from my application results - show trade owner's details
                    // First check if trade data is included in the acceptance response
                    let trade = selectedTradeDetail.trade || energyTrades.find(t => t.id === selectedTradeDetail.tradeId);
                    let offerMatch = null;
                    
                    if (!trade) {
                      offerMatch = availableTradesData.find(o => o.trade?.id === selectedTradeDetail.tradeId);
                      trade = offerMatch?.trade;
                    } else {
                      offerMatch = availableTradesData.find(o => o.trade?.id === trade?.id);
                    }

                    // Use trade owner data if available from backend
                    const counterpartyName = selectedTradeDetail.tradeOwner?.household?.name || 
                                            offerMatch?.household?.name || 
                                            `Household ${trade?.sellerHouseholdId || trade?.buyerHouseholdId}`;
                    const counterpartyUser = selectedTradeDetail.tradeOwner?.user || offerMatch?.user;
                    const counterpartyHousehold = selectedTradeDetail.tradeOwner?.household || offerMatch?.household;
                    
                    return (
                      <div className="space-y-4">
                        {/* Trade Information */}
                        <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-3">
                          <h3 className="font-medium text-slate-100 mb-2 flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-emerald-400" />
                            Trade Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm min-w-0">
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Energy</div>
                              <div className="font-medium text-slate-100">{formatEnergy(trade?.energyAmount || 0)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Price/kWh</div>
                              <div className="font-medium text-slate-100">{formatPrice(trade?.pricePerKwh || 0)}</div>
                            </div>
                            <div className="bg-emerald-900/20 p-2 rounded border border-emerald-600/30">
                              <div className="text-xs text-emerald-300">Total</div>
                              <div className="font-semibold text-emerald-400">{formatTotal(trade?.energyAmount || 0, trade?.pricePerKwh || 0)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Type</div>
                              <div className="font-medium capitalize text-slate-100">{trade?.tradeType}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Contact Information */}
                        <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-3">
                          <h3 className="font-medium text-blue-300 mb-2 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-blue-400" />
                            Contact Details
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-1 min-w-0">
                              <span className="text-blue-400 flex-shrink-0">Name:</span>
                              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{counterpartyName}</span>
                            </div>
                            <div className="flex justify-between py-1 min-w-0">
                              <span className="text-blue-400 flex-shrink-0">Location:</span>
                              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{counterpartyUser?.district || 'N/A'}, {counterpartyUser?.state || 'N/A'}</span>
                            </div>
                            {counterpartyUser?.phone && (
                              <div className="flex justify-between py-1 min-w-0">
                                <span className="text-blue-400 flex-shrink-0">Phone:</span>
                                <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{counterpartyUser.phone}</span>
                              </div>
                            )}
                            {counterpartyUser?.email && (
                              <div className="flex justify-between py-1 min-w-0">
                                <span className="text-blue-400 flex-shrink-0">Email:</span>
                                <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{counterpartyUser.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (isMyTrade) {
                    // This is from my trade results - show applicant's details
                    const applicantUser = selectedTradeDetail.applicant;
                    const applicantHousehold = selectedTradeDetail.applicantHousehold;
                    const trade = selectedTradeDetail.trade;
                    
                    return (
                      <div className="space-y-4">
                        {/* Trade Information */}
                        <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-3">
                          <h3 className="font-medium text-slate-100 mb-2 flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-emerald-400" />
                            Trade Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm min-w-0">
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Energy</div>
                              <div className="font-medium text-slate-100">{formatEnergy(trade?.energyAmount || 0)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Price/kWh</div>
                              <div className="font-medium text-slate-100">{formatPrice(trade?.pricePerKwh || 0)}</div>
                            </div>
                            <div className="bg-emerald-900/20 p-2 rounded border border-emerald-600/30">
                              <div className="text-xs text-emerald-300">Total</div>
                              <div className="font-semibold text-emerald-400">{formatTotal(trade?.energyAmount || 0, trade?.pricePerKwh || 0)}</div>
                            </div>
                            <div className="bg-slate-700/30 p-2 rounded border border-slate-600/30">
                              <div className="text-xs text-slate-400">Type</div>
                              <div className="font-medium capitalize text-slate-100">{trade?.tradeType}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Contact Information */}
                        <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-3">
                          <h3 className="font-medium text-blue-300 mb-2 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-blue-400" />
                            Applicant Details
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-1 min-w-0">
                              <span className="text-blue-400 flex-shrink-0">Name:</span>
                              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{applicantUser?.username || applicantHousehold?.name}</span>
                            </div>
                            <div className="flex justify-between py-1 min-w-0">
                              <span className="text-blue-400 flex-shrink-0">Household:</span>
                              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{applicantHousehold?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between py-1 min-w-0">
                              <span className="text-blue-400 flex-shrink-0">Location:</span>
                              <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{applicantUser?.district || 'N/A'}, {applicantUser?.state || 'N/A'}</span>
                            </div>
                            {applicantUser?.phone && (
                              <div className="flex justify-between py-1 min-w-0">
                                <span className="text-blue-400 flex-shrink-0">Phone:</span>
                                <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{applicantUser.phone}</span>
                              </div>
                            )}
                            {applicantUser?.email && (
                              <div className="flex justify-between py-1 min-w-0">
                                <span className="text-blue-400 flex-shrink-0">Email:</span>
                                <span className="text-blue-100 font-medium break-words ml-2 min-w-0">{applicantUser.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return <div className="text-slate-400">Trade details not available</div>;
                })()}
                
                <div className="flex justify-end pt-3 mt-3 border-t border-slate-600/30">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="h-8 px-3 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                    data-testid="button-close-detail-modal-bottom"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}