import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Search, Menu, CloudSun, MessageCircle, Bot, X, HelpCircle, User, LogOut, Activity, TrendingUp, HomeIcon, RefreshCw, Zap, ArrowRightLeft, Plus, ExternalLink, Sun, Users, Battery, Gauge, Leaf, MapPin, Edit, ShoppingCart, Target, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEnergyTradeSchema } from "@/../../shared/schema";
import type { EnergyTrade, Household } from "@/../../shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatTradePrice, formatTradeAmount, formatTradeTotal, formatNumber, formatCurrency, formatCarbonSavings } from "@/lib/utils";

import AIChatWidget from "@/components/mobile-ai-chat-widget";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import ValidationCard from "@/components/validation-card";
import { SimulationDashboard } from "@/components/simulation-dashboard";
import { LocationRequest } from "@/components/location-request";
import { locationService, UserLocation } from "@/lib/location-service";


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'energy-dashboard' | 'energy-trading' | 'simulation'>('energy-dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showValidationCard, setShowValidationCard] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationType, setValidationType] = useState<"success" | "error" | "warning">("warning");
  const [showCreateTradeDialog, setShowCreateTradeDialog] = useState(false);
  const [showEditTradeDialog, setShowEditTradeDialog] = useState(false);
  const [editingTrade, setEditingTrade] = useState<EnergyTrade | null>(null);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionChecked, setLocationPermissionChecked] = useState(false);
  const { user, logoutMutation, healthStatus } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Check for location permission intelligently - only show dialog when needed
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (!locationService.isGeolocationSupported() || !user) {
        setLocationPermissionChecked(true);
        return;
      }

      try {
        // Check if we should show the location dialog
        const shouldShow = await locationService.shouldShowLocationDialog();
        
        if (shouldShow) {
          console.log('🗺️ Location permission needed, showing dialog');
          setShowLocationRequest(true);
        } else {
          // Try to get cached location if available
          const cachedLocation = locationService.getCachedLocation();
          if (cachedLocation) {
            console.log('📍 Using cached location:', cachedLocation);
            setUserLocation(cachedLocation);
          } else {
            console.log('🚫 Location permission handled, no dialog needed');
          }
        }
      } catch (error) {
        console.warn('Error checking location permission:', error);
      } finally {
        setLocationPermissionChecked(true);
      }
    };

    checkLocationPermission();
  }, [user]);

  const handleLocationGranted = (location: UserLocation) => {
    console.log('Location granted:', location);
    setUserLocation(location);
    setShowLocationRequest(false);
    
    // Force refresh market data with new location
    queryClient.invalidateQueries({ queryKey: ['/api/market/realtime'] });
    
    toast({
      title: "Location Access Granted",
      description: "Weather data will now be customized for your location to improve solar efficiency calculations.",
    });
  };

  const handleLocationDenied = () => {
    setShowLocationRequest(false);
    toast({
      title: "Location Access Declined",
      description: "Using general weather data. You can enable location access later in your browser settings.",
      variant: "destructive",
    });
  };

  // Fetch ONLY real user energy trades - no synthetic/fake data
  const { data: energyTrades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['/api/energy-trades'],
    refetchInterval: user ? 20000 : false, // Reduced from 10s to 20s to optimize performance
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch available trade offers from other users for marketplace
  const { data: availableTrades = [], isLoading: availableTradesLoading } = useQuery<Array<{trade: EnergyTrade, household: any, user: any}>>({
    queryKey: ['/api/trade-offers'],
    refetchInterval: user ? 20000 : false, // Reduced from 10s to 20s to optimize performance
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch user's trade acceptances to check if they've already applied to trades
  const { data: userTradeAcceptances = [] } = useQuery<Array<{ id: number; tradeId: number; status: string; acceptorUserId: number; acceptorHouseholdId: number }>>({
    queryKey: ['/api/trade-acceptances'],
    refetchInterval: user ? 30000 : false,
    enabled: !!user,
  });


  // Fetch ONLY real market data - this endpoint requires location for authentic weather
  const { data: marketData, error: marketError, isLoading: marketLoading } = useQuery<{
    supply: number;
    demand: number;
    gridStability: number;
    weather: {
      condition: string;
      temperature: number;
      efficiency: number;
    };
    aiInsight?: {
      insight: string;
      trend: string;
      optimal_time: string;
    };
  }>({
    queryKey: ['/api/market/realtime', userLocation?.latitude, userLocation?.longitude],
    refetchInterval: 20000, // Auto-refresh every 20 seconds for real-time data
    retry: 3,
    staleTime: 0, // Always consider data stale to force fresh fetches
    gcTime: 1000, // Keep cache for only 1 second (TanStack Query v5 uses gcTime instead of cacheTime)
    enabled: !!user && !!userLocation, // Only fetch when user is logged in and location is available
    queryFn: async () => {
      if (!userLocation) {
        throw new Error('Location required for weather data');
      }
      
      // Send location as query parameters (what the server expects)
      const params = new URLSearchParams({
        latitude: userLocation.latitude.toString(),
        longitude: userLocation.longitude.toString()
      });
      
      // Add session ID header if available  
      const headers: Record<string, string> = {};
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        headers['x-session-id'] = sessionId;
      }

      const response = await fetch(`/api/market/realtime?${params}`, { 
        credentials: 'include',
        headers
      });
      
      // If location is required but not provided, skip showing dialog again if already shown
      if (response.status === 400 && !userLocation) {
        throw new Error('Location required for weather data');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch market data');
      }
      
      const data = await response.json();
      console.log('✅ Market data received:', data);
      return data;
    },
  });

  // Debug market data state
  console.log('🔍 Market query debug:', {
    marketData,
    marketError: marketError?.message,
    marketLoading,
    userLocation,
    locationPermissionChecked,
    user: !!user
  });

  // Fetch ONLY real user households - no demo/synthetic data
  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    refetchInterval: user ? 60000 : false, // Reduced to 1 minute - household data changes infrequently
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch network analytics based ONLY on real user data
  const { data: networkAnalytics } = useQuery<{
    network: {
      totalHouseholds: number;
      activeHouseholds: number;
      totalGenerationCapacity: string;
      totalStorageCapacity: string;
      storageUtilization: string;
    };
    trading: {
      totalTrades: number;
      averagePrice: string;
      carbonSaved: string;
    };
    efficiency: {
      networkEfficiency: string;
      averageDistance: string;
    };
  }>({
    queryKey: ['/api/analytics/network'], 
    refetchInterval: user ? 60000 : false, // Analytics don't need frequent updates - changed to 1 minute
    enabled: !!user, // Only run query if user is authenticated
    retry: false,
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/market/realtime'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/analytics/network'] });
      toast({
        title: "Data Refreshed",
        description: "Latest energy market data has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Remove duplicate household query (already fetched as userHouseholds above)
  const households = userHouseholds; // Use the authenticated user households

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/energy-trades', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'] });
      setShowCreateTradeDialog(false);
      toast({
        title: "Trade Created",
        description: "Your energy trade offer has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create trade offer.",
        variant: "destructive",
      });
    },
  });

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/energy-trades/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'] });
      setShowEditTradeDialog(false);
      toast({
        title: "Trade Updated",
        description: "Your energy trade has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trade.",
        variant: "destructive",
      });
    },
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/energy-trades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'] });
      toast({
        title: "Trade Deleted",
        description: "Your energy trade has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trade.",
        variant: "destructive",
      });
    },
  });

  // Cancel trade acceptance mutation
  const cancelTradeMutation = useMutation({
    mutationFn: (acceptanceId: number) => apiRequest('DELETE', `/api/trade-acceptances/${acceptanceId}`),
    onSuccess: async (data, acceptanceId) => {
      console.log('🗑️ Cancel mutation success, invalidating cache...');
      
      // Immediately update cache to remove the cancelled acceptance
      queryClient.setQueryData<Array<{ id: number; tradeId: number; status: string; acceptorUserId: number; acceptorHouseholdId: number }>>(
        ['/api/trade-acceptances'], 
        (prev) => (prev || []).filter(a => a.id !== acceptanceId)
      );
      
      // Force remove cache and refetch data
      await queryClient.removeQueries({ queryKey: ['/api/trade-acceptances'] });
      await queryClient.removeQueries({ queryKey: ['/api/trade-offers'] });
      await queryClient.removeQueries({ queryKey: ['/api/energy-trades'] });
      
      // Refetch all data immediately
      await queryClient.refetchQueries({ queryKey: ['/api/trade-acceptances'] });
      await queryClient.refetchQueries({ queryKey: ['/api/trade-offers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/energy-trades'] });
      
      console.log('✅ Cache cleared and data refetched');
      
      toast({
        title: "Application Cancelled",
        description: "Your trade application has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel application.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get household name from trade data
  const getHouseholdName = (tradeItem: any, type: 'seller' | 'buyer'): string => {
    // For nested trade offer structure with household data
    if (tradeItem.household?.name) {
      return tradeItem.household.name;
    }
    
    // For direct trade structure
    if (type === 'seller') {
      return tradeItem.sellerHouseholdName || (tradeItem.sellerHouseholdId ? `Household #${tradeItem.sellerHouseholdId}` : 'Unknown Household');
    } else {
      return tradeItem.buyerHouseholdName || (tradeItem.buyerHouseholdId ? `Household #${tradeItem.buyerHouseholdId}` : 'Unknown Household');
    }
  };

  // Check if user can accept a trade (not their own trade)
  const canAcceptTrade = (trade: EnergyTrade) => {
    if (!userHouseholdId) return false;
    
    // For sell trades, user can buy if they're not the seller
    if (trade.tradeType === 'sell') {
      return trade.sellerHouseholdId !== userHouseholdId;
    }
    
    // For buy trades, user can sell if they're not the buyer
    if (trade.tradeType === 'buy') {
      return trade.buyerHouseholdId !== userHouseholdId;
    }
    
    return false;
  };

  // Check if user has already applied to a trade - use current data to avoid stale closure
  const hasUserApplied = (tradeId: number) => {
    return (userTradeAcceptances || []).some((acceptance) => 
      acceptance.tradeId === tradeId && ['applied', 'accepted', 'pending', 'awarded'].includes(acceptance.status)
    );
  };

  // Get user's acceptance for a trade (to get acceptance ID for cancellation) - use current data
  const getUserAcceptance = (tradeId: number) => {
    return (userTradeAcceptances || []).find((acceptance) => 
      acceptance.tradeId === tradeId && ['applied', 'accepted', 'pending', 'awarded'].includes(acceptance.status)
    );
  };

  // Helper function to get application status text
  const getApplicationStatusText = (tradeId: number, acceptanceCount?: number): { text: string; className: string } => {
    const userApplied = hasUserApplied(tradeId);
    const count = parseInt(String(acceptanceCount)) || 0; // Handle string/number types
    
    if (count > 0) {
      return {
        text: `${count} applied`,
        className: userApplied ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"
      };
    } else {
      return {
        text: "0 applied",
        className: "bg-slate-500/10 text-slate-400"
      };
    }
  };

  // Helper function to get smart trade status 
  const getSmartTradeStatus = (tradeStatus: string, acceptanceCount?: number): { text: string; className: string } => {
    const count = acceptanceCount || 0;
    
    // If trade is cancelled, completed, or rejected - show actual status
    if (tradeStatus === 'cancelled' || tradeStatus === 'completed') {
      return {
        text: tradeStatus,
        className: tradeStatus === 'completed' 
          ? "bg-emerald-500/15 text-emerald-400" 
          : "bg-muted text-gray-600"
      };
    }
    
    // If trade is rejected by owner
    if (tradeStatus === 'rejected') {
      return {
        text: "rejected",
        className: "bg-red-100 text-red-700"
      };
    }
    
    // For pending trades, show smart status based on applications
    if (tradeStatus === 'pending') {
      if (count > 0) {
        return {
          text: "pending",
          className: "bg-yellow-100 text-yellow-700"
        };
      } else {
        return {
          text: "available",
          className: "bg-emerald-500/15 text-emerald-400"
        };
      }
    }
    
    // Fallback - show the original status
    return {
      text: tradeStatus,
      className: "bg-muted text-gray-600"
    };
  };

  // Handle cancelling a trade application
  const handleCancelApplication = (tradeId: number) => {
    const acceptance = getUserAcceptance(tradeId);
    if (acceptance && window.confirm('Are you sure you want to cancel your application for this trade?')) {
      cancelTradeMutation.mutate(acceptance.id);
    }
  };

  // Handle accepting a trade
  const handleAcceptTrade = (tradeItem: any) => {
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }
    
    setAcceptingTrade(tradeItem);
    setShowAcceptTradeDialog(true);
  };

  // Trade acceptance mutation
  const acceptTradeMutation = useMutation({
    mutationFn: async (tradeData: { tradeId: number; acceptorHouseholdId: number }) => {
      const response = await apiRequest('POST', '/api/trade-acceptances', {
        tradeId: tradeData.tradeId,
        acceptorHouseholdId: tradeData.acceptorHouseholdId,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Accepted!",
        description: data.message || "You have successfully accepted this trade offer. Contact information will be shared.",
      });
      setShowAcceptTradeDialog(false);
      setAcceptingTrade(null);
      
      // Refresh trades to show updated status
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept trade offer.",
        variant: "destructive",
      });
    },
  });

  // Confirm trade acceptance
  const confirmAcceptTrade = () => {
    if (!acceptingTrade || !userHouseholdId) return;
    
    // Get trade ID from the nested trade object
    const tradeId = acceptingTrade.trade.id;
    
    acceptTradeMutation.mutate({
      tradeId: tradeId,
      acceptorHouseholdId: userHouseholdId,
    });
  };

  // Helper function to check if a trade belongs to the current user
  const isOwnTrade = (trade: EnergyTrade): boolean => {
    const userHouseholdIds = userHouseholds.map(h => h.id);
    
    // For sell trades, check if sellerHouseholdId belongs to user
    if (trade.tradeType === 'sell') {
      return trade.sellerHouseholdId ? userHouseholdIds.includes(trade.sellerHouseholdId) : false;
    }
    
    // For buy trades, check if buyerHouseholdId belongs to user  
    if (trade.tradeType === 'buy') {
      return trade.buyerHouseholdId ? userHouseholdIds.includes(trade.buyerHouseholdId) : false;
    }
    
    return false;
  };

  // Calculate market rates based on average of active trade prices - separate for selling and buying
  const calculateMarketRates = () => {
    if (Array.isArray(energyTrades) && energyTrades.length > 0) {
      // Get all active (pending) trades with realistic pricing (filter out outliers)
      const activeTrades = (energyTrades as EnergyTrade[]).filter(trade => 
        trade.status === 'pending' && trade.pricePerKwh >= 3 && trade.pricePerKwh <= 20
      );
      
      // Separate sell and buy trades
      const sellTrades = activeTrades.filter(trade => trade.tradeType === 'sell');
      const buyTrades = activeTrades.filter(trade => trade.tradeType === 'buy');
      
      // Calculate average selling rate
      let averageSellingRate = 6; // Default
      if (sellTrades.length > 0) {
        const totalSellingPrice = sellTrades.reduce((sum, trade) => sum + Math.round(trade.pricePerKwh), 0);
        averageSellingRate = Math.round(totalSellingPrice / sellTrades.length);
      }
      
      // Calculate average buying rate
      let averageBuyingRate = 7; // Default slightly higher for buying
      if (buyTrades.length > 0) {
        const totalBuyingPrice = buyTrades.reduce((sum, trade) => sum + Math.round(trade.pricePerKwh), 0);
        averageBuyingRate = Math.round(totalBuyingPrice / buyTrades.length);
      }
      
      return {
        selling: averageSellingRate,
        buying: averageBuyingRate,
        overall: Math.round((averageSellingRate + averageBuyingRate) / 2)
      };
    }
    return {
      selling: 6, // Default selling rate
      buying: 7,  // Default buying rate
      overall: 6  // Default overall rate
    };
  };

  const marketRates = calculateMarketRates();
  const currentMarketRate = marketRates.overall;
  const minPrice = Math.max(3, Math.round(currentMarketRate * 0.7)); // Min 30% below market - integers only
  const maxPrice = 500; // Max ₹500 per kWh as requested by user

  // Form for creating trades with realistic price validation - INTEGERS ONLY
  const tradeFormSchema = z.object({
    sellerHouseholdId: z.number().optional(),
    buyerHouseholdId: z.number().optional(),
    energyAmount: z.coerce.number().min(1, "Energy amount must be at least 1 kWh"),
    pricePerKwh: z.coerce.number()
      .min(minPrice, `Price too low. Minimum allowed: ₹${minPrice}/kWh`)
      .max(maxPrice, `Price too high. Maximum allowed: ₹${maxPrice}/kWh`),
    tradeType: z.enum(['sell', 'buy']),
  });

  const form = useForm({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      sellerHouseholdId: userHouseholds[0]?.id || 1,
      buyerHouseholdId: undefined,
      energyAmount: 0,
      pricePerKwh: currentMarketRate,
      tradeType: 'sell',
    },
  });

  // Edit trade form
  const editForm = useForm({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      sellerHouseholdId: userHouseholds[0]?.id || 1,
      buyerHouseholdId: undefined,
      energyAmount: 0,
      pricePerKwh: currentMarketRate,
      tradeType: 'sell',
    },
  });

  const onSubmit = (data: any) => {
    const userHouseholdId = userHouseholds[0]?.id;
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }

    // Set household IDs based on trade type - ensure integers only
    const tradeData = {
      ...data,
      energyAmount: Math.round(data.energyAmount), // Ensure integer kWh
      pricePerKwh: Math.round(data.pricePerKwh), // Store as rupees
      sellerHouseholdId: data.tradeType === 'sell' ? userHouseholdId : undefined,
      buyerHouseholdId: data.tradeType === 'buy' ? userHouseholdId : undefined,
    };
    createTradeMutation.mutate(tradeData);
  };

  const onEditSubmit = (data: any) => {
    if (!editingTrade) return;
    
    const userHouseholdId = userHouseholds[0]?.id;
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }

    // Set household IDs based on trade type - ensure integers only
    const updateData = {
      ...data,
      energyAmount: Math.round(data.energyAmount), // Ensure integer kWh
      pricePerKwh: Math.round(data.pricePerKwh), // Store as rupees
      sellerHouseholdId: data.tradeType === 'sell' ? userHouseholdId : undefined,
      buyerHouseholdId: data.tradeType === 'buy' ? userHouseholdId : undefined,
    };
    updateTradeMutation.mutate({ id: editingTrade.id, data: updateData });
  };

  // Handle edit trade
  const handleEditTrade = (trade: EnergyTrade) => {
    setEditingTrade(trade);
    // Pre-populate the edit form with existing trade data - INTEGERS ONLY
    editForm.reset({
      energyAmount: Math.round(trade.energyAmount),
      pricePerKwh: Math.round(trade.pricePerKwh), // Already in rupees
      tradeType: trade.tradeType,
    });
    setShowEditTradeDialog(true);
  };

  // Handle delete trade
  const handleDeleteTrade = (trade: EnergyTrade) => {
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to delete this ${trade.tradeType} trade for ${trade.energyAmount} kWh?`)) {
      deleteTradeMutation.mutate(trade.id);
    }
  };

  // Filter states
  const [offerFilter, setOfferFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [selectedTradeForDetails, setSelectedTradeForDetails] = useState<{trade: EnergyTrade, household: any, user: any} | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showAcceptTradeDialog, setShowAcceptTradeDialog] = useState(false);
  const [acceptingTrade, setAcceptingTrade] = useState<{trade: EnergyTrade, household: any, user: any} | null>(null);

  // Get user's household ID to filter out own trades from marketplace
  const userHouseholdId = userHouseholds?.[0]?.id;
  
  // Separate offers and requests from available trades (already excludes user's own trades)
  let energyOffers = (availableTrades as any[]).filter((item: any) => 
    item.trade.tradeType === 'sell' && 
    item.trade.status === 'pending'
  );
  let energyRequests = (availableTrades as any[]).filter((item: any) => 
    item.trade.tradeType === 'buy' && 
    item.trade.status === 'pending'
  );

  // Apply filters
  if (offerFilter === 'cheapest') {
    energyOffers = energyOffers.sort((a: any, b: any) => a.trade.pricePerKwh - b.trade.pricePerKwh);
  } else if (offerFilter === 'biggest') {
    energyOffers = energyOffers.sort((a: any, b: any) => b.trade.energyAmount - a.trade.energyAmount);
  }

  if (requestFilter === 'cheapest') {
    energyRequests = energyRequests.sort((a: any, b: any) => b.trade.pricePerKwh - a.trade.pricePerKwh);
  } else if (requestFilter === 'biggest') {
    energyRequests = energyRequests.sort((a: any, b: any) => b.trade.energyAmount - a.trade.energyAmount);
  }

  // Check URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'energy-trading') {
      setActiveTab('energy-trading');
    } else if (tab === 'energy-dashboard') {
      setActiveTab('energy-dashboard');
    } else if (tab === 'simulation') {
      setActiveTab('simulation');
    }
  }, []);

  // Show server unavailability message only for authenticated users who lose session
  useEffect(() => {
    // Only show server error if BOTH server AND database are down - not for AI issues
    // Don't show validation cards for "degraded" status caused by AI quota/config issues
    if (healthStatus && user && healthStatus.status === 'unhealthy' && healthStatus.message) {
      setValidationMessage(healthStatus.message);
      setValidationType("error");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
      }, 8000);
    }
  }, [healthStatus, user]);

  // Show logout success message after page reload
  useEffect(() => {
    const logoutSuccess = localStorage.getItem("logoutSuccess");
    if (logoutSuccess === "true") {
      localStorage.removeItem("logoutSuccess");
      setValidationMessage("You have logged out successfully.");
      setValidationType("success");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
      }, 3000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar 
        currentPage="dashboard" 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.history.pushState({}, '', `/?tab=${tab}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Hero Section - Now visible on all devices */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 text-white pb-6 sm:pb-8 md:pb-10 lg:pb-12 xl:pb-16 pt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center flex flex-col justify-center items-center min-h-[150px] sm:min-h-[160px] md:min-h-[170px] lg:min-h-[180px] xl:min-h-[190px] pt-6 sm:pt-8 md:pt-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 lg:mb-8">SolarSense: Intelligent Energy Solutions</h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 px-2 max-w-4xl mx-auto">
              Decentralized energy trading platform for a sustainable future
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs - Positioned below hero section */}
      <div className="bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-blue-900/40 border-b border-border shadow-sm">
        <div className="w-full">
          <div className="flex bg-gradient-to-r from-slate-900/50 via-slate-800/30 to-slate-900/50 p-1 backdrop-blur-sm">
            <button
              onClick={() => {
                setActiveTab('energy-dashboard');
                window.history.pushState({}, '', '/?tab=energy-dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-all duration-300 text-sm sm:text-base flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2 rounded-lg ${
                activeTab === 'energy-dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Home className="" size={16} />
              <div>
                <span>Market</span>
                <span className="hidden sm:inline"> Dashboard</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('energy-trading');
                window.history.pushState({}, '', '/?tab=energy-trading');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-all duration-300 text-sm sm:text-base flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2 rounded-lg ${
                activeTab === 'energy-trading'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="" size={16} />
              <div>
                <span>Trading</span>
                <span className="hidden sm:inline"> Center</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('simulation');
                window.history.pushState({}, '', '/?tab=simulation');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-all duration-300 text-sm sm:text-base flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2 rounded-lg ${
                activeTab === 'simulation'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className="" size={16} />
              <div>
                <span>Simulation</span>
                <span className="hidden sm:inline"> Lab</span>
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* Main Application Interface */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 relative">
        {/* Subtle background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-transparent to-purple-900/5 pointer-events-none rounded-lg"></div>
        <div className="relative z-10">
        {/* Content Sections */}
        <AnimatePresence mode="wait">
        {activeTab === 'energy-dashboard' && (
          <motion.div 
            key="energy-dashboard"
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="space-y-6">
            {/* Real-time Market Overview */}
            <div className="bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-600/30 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-300 via-emerald-300 to-purple-300 bg-clip-text text-transparent">Real-time Energy Market</h2>
                <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline" data-testid="button-refresh" className="w-full sm:w-auto border-slate-600 hover:bg-slate-700/50 bg-gradient-to-r from-slate-700/50 to-slate-600/50">
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
                  <span className="sm:hidden">{refreshing ? 'Update' : 'Refresh'}</span>
                </Button>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-emerald-950/40 via-emerald-900/25 to-emerald-800/30 border-emerald-700/40 relative overflow-hidden backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-emerald-400 mb-1 truncate">Network Generation</h3>
                      <p className="text-lg sm:text-2xl font-bold text-emerald-200 truncate" data-testid="text-total-generation">
                        {networkAnalytics?.network?.totalGenerationCapacity || "0 kW"}
                      </p>
                      <p className="text-xs text-emerald-300 truncate">Solar capacity online</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/25 to-emerald-600/20 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2 backdrop-blur-sm border border-emerald-400/20">
                      <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
              
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-950/40 via-blue-900/25 to-blue-800/30 border-blue-700/40 relative overflow-hidden backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-blue-400 mb-1 truncate">Energy Trades</h3>
                      <p className="text-lg sm:text-2xl font-bold text-blue-200 truncate" data-testid="text-active-trades">
                        {availableTrades.length || 0}
                      </p>
                      <p className="text-xs text-blue-300 truncate">Active exchanges</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/25 to-blue-600/20 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2 backdrop-blur-sm border border-blue-400/20">
                      <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
              
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-950/40 via-purple-900/25 to-purple-800/30 border-purple-700/40 relative overflow-hidden backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-purple-400 mb-1 truncate">Average Price</h3>
                      <p className="text-lg sm:text-2xl font-bold text-purple-200 truncate" data-testid="text-average-price">
{networkAnalytics?.trading?.averagePrice || "₹0"}/kWh
                      </p>
                      <p className="text-xs text-purple-300 truncate">Current market rate</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/25 to-purple-600/20 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2 backdrop-blur-sm border border-purple-400/20">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
              
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-950/40 via-emerald-900/25 to-green-800/30 border-green-700/40 relative overflow-hidden backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-green-400 mb-1 truncate">Carbon Saved</h3>
                      <p className="text-lg sm:text-2xl font-bold text-green-200 truncate" data-testid="text-carbon-saved">
                        {networkAnalytics?.trading?.carbonSaved ? 
                          formatCarbonSavings(parseFloat(networkAnalytics.trading.carbonSaved.replace(/[^\d.]/g, ''))) : 
                          "0 kg CO2"}
                      </p>
                      <p className="text-xs text-green-300 truncate">CO₂ avoided today</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/25 to-green-600/20 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2 backdrop-blur-sm border border-green-400/20">
                      <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            {/* Live Market Data */}
            {marketLoading ? (
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">
                  Loading Market Data...
                </h3>
                <div className="animate-pulse space-y-3">
                  <div className="h-3 sm:h-4 bg-muted rounded"></div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-1/2"></div>
                </div>
              </Card>
            ) : marketData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-900/60 via-blue-950/40 to-slate-800/60 border border-blue-500/20 backdrop-blur-sm shadow-xl">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-full">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    </div>
                    <span className="hidden sm:inline bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Live Market Activity</span>
                    <span className="sm:hidden bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Market Activity</span>
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                      Live Data
                    </span>
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-emerald-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          Current Supply
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-300 truncate">Available for trading</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-emerald-300 ml-2" data-testid="text-current-supply">
                          {marketData?.supply ?? "No data"} {marketData?.supply ? "kWh" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-blue-900/40 to-blue-800/30 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-blue-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          Current Demand
                        </div>
                        <p className="text-xs sm:text-sm text-blue-300 truncate">Energy needed now</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-blue-300 ml-2" data-testid="text-current-demand">
                          {marketData?.demand ?? "No data"} {marketData?.demand ? "kWh" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-xl border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-purple-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                          Grid Stability
                        </div>
                        <p className="text-xs sm:text-sm text-purple-300 truncate">Network balance score</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-purple-300 ml-2" data-testid="text-grid-stability">
                          {marketData?.gridStability ?? "No data"}{marketData?.gridStability ? "%" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 bg-gradient-to-br from-sky-950/60 via-blue-900/40 to-indigo-950/60 border border-sky-400/30 backdrop-blur-sm shadow-xl">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 sm:p-2 bg-sky-500/20 rounded-full">
                        <CloudSun className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400" />
                      </div>
                      <span className="hidden sm:inline bg-gradient-to-r from-sky-400 to-blue-300 bg-clip-text text-transparent">Weather Impact</span>
                      <span className="sm:hidden bg-gradient-to-r from-sky-400 to-blue-300 bg-clip-text text-transparent">Weather</span>
                    </div>
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                      Live Weather API
                    </span>
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-sky-900/40 to-sky-800/30 rounded-xl border border-sky-500/30 hover:border-sky-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sky-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
                          Current Conditions
                        </div>
                        <p className="text-xs sm:text-sm text-sky-300 truncate">Weather status</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-sky-300 ml-2 capitalize" data-testid="text-weather-condition">
                          {marketData?.weather?.condition?.replace('-', ' ') || "No data"}
                        </p>
                        {userLocation && (
                          <p className="text-xs text-sky-400">
                            {userLocation.city}, {userLocation.state}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-orange-900/40 to-orange-800/30 rounded-xl border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-orange-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                          Temperature
                        </div>
                        <p className="text-xs sm:text-sm text-orange-300 truncate">Current temp</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-orange-300 ml-2" data-testid="text-temperature">
                          {marketData?.weather?.temperature ? `${marketData.weather.temperature}°C` : "No data"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-emerald-200 text-sm sm:text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          Solar Efficiency
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-300 truncate">Power generation rate</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg sm:text-xl font-bold ml-2 ${(marketData?.weather?.efficiency || 0) <= 0 ? 'text-gray-400' : 'text-emerald-300'}`} data-testid="text-solar-efficiency">
                          {marketData?.weather?.efficiency !== undefined ? `${Math.round(marketData.weather.efficiency)}%` : "No data"}
                        </p>
                        {(marketData?.weather?.efficiency || 0) <= 0 && (
                          <p className="text-xs text-gray-400">
                            Night - No Solar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center text-secondary-custom">
                  No Market Data Available
                </h3>
                <p className="text-center text-muted-foreground">
                  Real-time market data will appear here when households are connected and trading energy.
                </p>
                {!user && (
                  <div className="mt-4 p-3 bg-blue-500/10 dark:bg-blue-950/50 rounded-lg">
                    <p className="text-sm text-blue-400 dark:text-blue-300 text-center">
                      Please log in to view authentic energy market data and connect your household
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Network Health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="p-4 sm:p-6 bg-gradient-to-br from-indigo-950/40 via-indigo-900/25 to-indigo-800/30 border border-indigo-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-indigo-500/20 rounded-full">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                    </div>
                    <span className="hidden sm:inline text-indigo-200">Connected Households</span>
                    <span className="sm:hidden text-indigo-200">Households</span>
                  </h3>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-300 mb-2" data-testid="text-total-households">
                  {networkAnalytics?.network?.totalHouseholds || 0}
                </p>
                <p className="text-xs sm:text-sm text-indigo-400">
                  {networkAnalytics?.network?.activeHouseholds || 0} currently active
                </p>
              </Card>
              
              <Card className="p-4 sm:p-6 bg-gradient-to-br from-emerald-950/40 via-emerald-900/25 to-emerald-800/30 border border-emerald-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-full">
                      <Battery className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    </div>
                    <span className="hidden sm:inline text-emerald-200">Battery Storage</span>
                    <span className="sm:hidden text-emerald-200">Storage</span>
                  </h3>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-300 mb-2" data-testid="text-battery-capacity">
                  {userHouseholds.length > 0 ? `${userHouseholds[0].batteryCapacity || 0} kWh` : "0 kWh"}
                </p>
                <p className="text-xs sm:text-sm text-emerald-400">
                  Household battery capacity
                </p>
              </Card>
              
              <Card className="p-4 sm:p-6 bg-gradient-to-br from-cyan-950/40 via-cyan-900/25 to-cyan-800/30 border border-cyan-500/20 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-full">
                      <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                    </div>
                    <span className="hidden sm:inline text-cyan-200">Network Efficiency</span>
                    <span className="sm:hidden text-cyan-200">Efficiency</span>
                  </h3>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-cyan-300 mb-2" data-testid="text-network-efficiency">
                  {networkAnalytics?.efficiency?.networkEfficiency || "0%"}
                </p>
                <p className="text-xs sm:text-sm text-cyan-400">
                  Avg. distance: {networkAnalytics?.efficiency?.averageDistance || "0 km"}
                </p>
              </Card>
            </div>
            
            <Card className="p-6 bg-gradient-to-br from-slate-900/60 via-blue-950/40 to-slate-800/60 border border-blue-500/20 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Getting Started with SolarSense</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-900/40 to-blue-800/30 rounded-xl border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-blue-200">1. Register Your Household</h4>
                  </div>
                  <p className="text-sm text-slate-300">Add your solar installation and battery details to join the energy trading network.</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 rounded-xl border border-emerald-500/20 hover:border-emerald-400/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-emerald-200">2. Monitor Energy Flow</h4>
                  </div>
                  <p className="text-sm text-slate-300">Track your energy production, consumption, and battery levels in real-time.</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-900/40 to-purple-800/30 rounded-xl border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-purple-200">3. Trade Energy</h4>
                  </div>
                  <p className="text-sm text-slate-300">Buy and sell surplus energy with neighbors for optimal grid balance.</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-violet-900/40 to-violet-800/30 rounded-xl border border-violet-500/20 hover:border-violet-400/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                      <Bot className="h-4 w-4 text-violet-400" />
                    </div>
                    <h4 className="font-semibold text-violet-200">4. AI Optimization</h4>
                  </div>
                  <p className="text-sm text-slate-300">Let our AI optimize energy distribution and trading opportunities for you.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        
        {activeTab === 'energy-trading' && (
          <motion.div 
            key="energy-trading"
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="space-y-6">
            {/* Enhanced Header Section */}
            <div className="bg-gradient-to-br from-slate-900/60 via-blue-950/40 to-slate-800/60 rounded-xl p-3 sm:p-4 lg:p-6 border border-blue-500/20 backdrop-blur-sm shadow-2xl">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Energy Trading Marketplace</h2>
                  </div>
                  <p className="text-sm sm:text-base text-slate-200 mb-3 sm:mb-4">Connect directly with neighbors to trade renewable energy. Smart matching, instant transfers, fair pricing.</p>
                  
                  {/* Market Stats */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-xl border border-blue-500/20">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">{energyOffers.length}</p>
                      <p className="text-xs text-blue-200">Active Offers</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-emerald-900/40 to-emerald-800/30 rounded-xl border border-emerald-500/20">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-300">{energyRequests.length}</p>
                      <p className="text-xs text-emerald-200">Energy Requests</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-900/40 to-purple-800/30 rounded-xl border border-purple-500/20">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-300">{networkAnalytics?.trading?.averagePrice || "₹0"}</p>
                      <p className="text-xs text-purple-200">Avg Price/kWh</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:flex-col">
                  <Button onClick={() => setShowCreateTradeDialog(true)} data-testid="button-create-trade" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg text-xs sm:text-sm px-3 py-2">
                    <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Create Trade</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} size="sm" data-testid="button-refresh-trades" className="text-xs sm:text-sm px-3 py-2" disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
                    <span className="sm:hidden">{refreshing ? 'Update' : 'Refresh'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation('/storage')}
                    data-testid="button-your-trade"
                    className="text-xs sm:text-sm px-3 py-2"
                  >
                    <ArrowRightLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {(() => {
                      // Count user's active trades - backend now only returns pending trades
                      const activeTrades = Array.isArray(energyTrades) ? energyTrades.length : 0;
                      return (
                        <>
                          <span className="hidden sm:inline">Your Trades ({activeTrades})</span>
                          <span className="sm:hidden">Trades ({activeTrades})</span>
                        </>
                      );
                    })()}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-emerald-950/40 via-emerald-900/25 to-emerald-800/30 border border-emerald-500/20 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-emerald-500/15 rounded-full">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                    </div>
                    <span className="text-sm sm:text-base">Energy Available</span>
                    <span className="bg-emerald-500/15 text-emerald-200 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
                      {energyOffers.length}
                    </span>
                  </h3>
                  <Select value={offerFilter} onValueChange={(value) => setOfferFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Offers</SelectItem>
                      <SelectItem value="cheapest">💰 Best Price</SelectItem>
                      <SelectItem value="biggest">⚡ Most Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {tradesLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 border border-slate-600/30 rounded-lg animate-pulse bg-slate-800/40">
                          <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : energyOffers.length > 0 ? (
                    energyOffers.map((item: any) => (
                      <div key={item.trade.id} className="p-3 sm:p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-xl backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-emerald-500/100 rounded-full animate-pulse"></div>
                              <p className="font-bold text-emerald-400 text-base sm:text-lg">{item.trade.energyAmount} kWh</p>
                              {(() => {
                                const smartStatus = getSmartTradeStatus(item.trade.status, (item as any).acceptanceCount);
                                return (
                                  <span className={`${smartStatus.className} px-2 py-1 rounded-full text-xs font-medium`}>
                                    {smartStatus.text}
                                  </span>
                                );
                              })()}
                              {(() => {
                                const statusInfo = getApplicationStatusText(item.trade.id, (item as any).acceptanceCount);
                                return (
                                  <span className={`${statusInfo.className} px-2 py-1 rounded-full text-xs font-medium`}>
                                    {statusInfo.text}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-secondary-custom mb-1">
                              <HomeIcon className="h-4 w-4" />
                              <span className="truncate">{item.household?.name || 'Unknown Household'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span className="hidden sm:inline">Ludhiana, Punjab</span>
                                <span className="sm:hidden">Ludhiana</span>
                              </div>
                              <span className="hidden sm:inline">•</span>
                              <span>{new Date(item.trade.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto sm:text-right">
                            <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-lg mb-3">
                              <p className="text-xs sm:text-sm text-secondary-custom">Total</p>
                              <p className="font-bold text-xl sm:text-2xl text-emerald-400">{formatTradeTotal(item.trade.energyAmount, item.trade.pricePerKwh)}</p>
                              <p className="text-xs text-muted-foreground">Price per kWh: {formatTradePrice(item.trade.pricePerKwh)}</p>
                            </div>
                            {isOwnTrade(item.trade) ? (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditTrade(item.trade)}
                                  className="w-full border-blue-300 text-blue-400"
                                  data-testid={`button-edit-offer-${item.trade.id}`}
                                >
                                  ✏️ Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteTrade(item.trade)}
                                  disabled={deleteTradeMutation.isPending}
                                  className="w-full border-red-300 text-red-700"
                                  data-testid={`button-delete-offer-${item.trade.id}`}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            ) : hasUserApplied(item.trade.id) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleCancelApplication(item.trade.id)}
                                disabled={cancelTradeMutation.isPending}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                data-testid="button-cancel-offer"
                              >
                                ✕ Cancel Offer
                              </Button>
                            ) : canAcceptTrade(item.trade) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleAcceptTrade(item)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                data-testid="button-accept-offer"
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Accept Offer
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedTradeForDetails(item);
                                  setShowContactDialog(true);
                                }}
                                className="w-full h-8 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                variant="outline"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-8 w-8 text-emerald-300" />
                      </div>
                      <h4 className="font-semibold text-primary-custom mb-2">No Energy Offers Yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">Be the first to sell surplus solar energy!</p>
                      <Button onClick={() => {
                        form.setValue('tradeType', 'sell');
                        setShowCreateTradeDialog(true);
                      }} size="sm" variant="outline">
                        Create First Offer
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-blue-950/40 via-blue-900/25 to-blue-800/30 border border-blue-500/20 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-blue-500/15 rounded-full">
                      <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                    </div>
                    <span className="text-sm sm:text-base">Energy Needed</span>
                    <span className="bg-blue-500/15 text-blue-200 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
                      {energyRequests.length}
                    </span>
                  </h3>
                  <Select value={requestFilter} onValueChange={(value) => setRequestFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requests</SelectItem>
                      <SelectItem value="cheapest">💰 Best Offer</SelectItem>
                      <SelectItem value="biggest">⚡ Most Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {tradesLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 border border-slate-600/30 rounded-lg animate-pulse bg-slate-800/40">
                          <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : energyRequests.length > 0 ? (
                    energyRequests.map((request: {trade: EnergyTrade, household: any, user: any}) => (
                      <div key={request.trade.id} className="p-3 sm:p-4 border-2 border-blue-500/30 rounded-xl hover:border-blue-400/50 transition-all duration-200 hover:shadow-md bg-gradient-to-r from-slate-800/50 to-slate-700/30 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500/100 rounded-full animate-pulse"></div>
                              <p className="font-bold text-blue-400 text-base sm:text-lg">{request.trade.energyAmount} kWh</p>
                              {(() => {
                                const smartStatus = getSmartTradeStatus(request.trade.status, (request as any).acceptanceCount);
                                return (
                                  <span className={`${smartStatus.className} px-2 py-1 rounded-full text-xs font-medium`}>
                                    {smartStatus.text}
                                  </span>
                                );
                              })()}
                              {(() => {
                                const statusInfo = getApplicationStatusText(request.trade.id, (request as any).acceptanceCount);
                                return (
                                  <span className={`${statusInfo.className} px-2 py-1 rounded-full text-xs font-medium`}>
                                    {statusInfo.text}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-secondary-custom mb-1">
                              <HomeIcon className="h-4 w-4" />
                              <span className="truncate">{request.household?.name || 'Unknown Household'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span className="hidden sm:inline">Ludhiana, Punjab</span>
                                <span className="sm:hidden">Ludhiana</span>
                              </div>
                              <span className="hidden sm:inline">•</span>
                              <span>{new Date(request.trade.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto sm:text-right">
                            <div className="bg-blue-500/10 p-2 sm:p-3 rounded-lg mb-3">
                              <p className="text-xs sm:text-sm text-secondary-custom">Total willing to pay</p>
                              <p className="font-bold text-xl sm:text-2xl text-blue-400">{formatTradeTotal(request.trade.energyAmount, request.trade.pricePerKwh)}</p>
                              <p className="text-xs text-blue-300">Price per kWh: {formatTradePrice(request.trade.pricePerKwh)}</p>
                            </div>
                            {isOwnTrade(request.trade) ? (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditTrade(request.trade)}
                                  className="w-full border-blue-300 text-blue-400"
                                  data-testid={`button-edit-request-${request.trade.id}`}
                                >
                                  ✏️ Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteTrade(request.trade)}
                                  disabled={deleteTradeMutation.isPending}
                                  className="w-full border-red-300 text-red-700"
                                  data-testid={`button-delete-request-${request.trade.id}`}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            ) : hasUserApplied(request.trade.id) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleCancelApplication(request.trade.id)}
                                disabled={cancelTradeMutation.isPending}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                data-testid="button-cancel-offer"
                              >
                                ✕ Cancel Offer
                              </Button>
                            ) : canAcceptTrade(request.trade) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleAcceptTrade(request)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="button-fulfill-request"
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Fulfill Request
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedTradeForDetails(request);
                                  setShowContactDialog(true);
                                }}
                                className="w-full h-8 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border-slate-500/50"
                                variant="outline"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ArrowRightLeft className="h-8 w-8 text-blue-300" />
                      </div>
                      <h4 className="font-semibold text-blue-200 mb-2">No Energy Requests</h4>
                      <p className="text-sm text-blue-300 mb-4">Be the first to request clean energy!</p>
                      <Button onClick={() => {
                        form.setValue('tradeType', 'buy');
                        setShowCreateTradeDialog(true);
                      }} size="sm" variant="outline">
                        Create First Request
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Enhanced Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-purple-950/40 via-purple-900/25 to-pink-900/30 border border-purple-500/20 backdrop-blur-sm shadow-xl">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="p-2 bg-purple-500/20 rounded-full">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">Market Insights</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                    <span className="text-sm font-medium text-purple-200">Peak Trading Hours</span>
                    <span className="text-sm text-purple-300 font-semibold">6PM - 10PM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                    <span className="text-sm font-medium text-purple-200">Current Market Rate</span>
                    <span className="text-sm text-purple-300 font-semibold">{networkAnalytics?.trading?.averagePrice || "₹0"}/kWh</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                    <span className="text-sm font-medium text-purple-200">Grid Stability</span>
                    <span className={`text-sm font-semibold ${(marketData?.gridStability || 0) > 70 ? 'text-emerald-300' : (marketData?.gridStability || 0) > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {marketData?.gridStability || 0}%
                    </span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-slate-950/40 via-blue-950/25 to-slate-900/30 border border-blue-500/20 backdrop-blur-sm shadow-xl">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-full">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <span className="text-sm sm:text-base bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">How Trading Works</span>
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 rounded-xl border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xs sm:text-sm flex-shrink-0">1</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-emerald-200">Create Your Offer</h4>
                      <p className="text-xs text-emerald-400">Set your energy amount and price</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs sm:text-sm flex-shrink-0">2</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-blue-200">Smart Matching</h4>
                      <p className="text-xs text-blue-400">AI finds the best local matches</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-xs sm:text-sm flex-shrink-0">3</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-purple-200">Instant Transfer</h4>
                      <p className="text-xs text-purple-400">Automatic grid routing and billing</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'simulation' && (
          <motion.div 
            key="simulation"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="space-y-6">
            <SimulationDashboard />
          </motion.div>
        )}
        </AnimatePresence>
        
        </div> {/* Close relative z-10 div */}
      </main>

      {/* AI Chat Widget */}
      <AIChatWidget />
      
      {/* Create Trade Dialog */}
      <Dialog open={showCreateTradeDialog} onOpenChange={setShowCreateTradeDialog}>
        <DialogContent className="w-[calc(100vw-0.5rem)] sm:w-[90vw] max-w-md mx-auto my-1 sm:my-2 max-h-[95vh] overflow-y-auto z-50 p-4 sm:p-5 bg-slate-900 border border-slate-600/50 rounded-xl shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white dark:text-white">
              <Plus className="h-5 w-5 text-blue-400" />
              Quick Trade
            </DialogTitle>
            <DialogDescription className="text-sm text-blue-200 dark:text-blue-200">
              Create a new energy trade with local households
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 pt-2 sm:pt-4">
              
              {/* Compact Market Info */}
              <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Market Rate:</span>
                  <span className="font-semibold text-blue-400">
                    ₹{form.watch("tradeType") === "sell" ? marketRates.selling : form.watch("tradeType") === "buy" ? marketRates.buying : currentMarketRate}/kWh
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-300">Range:</span>
                  <span className="font-semibold text-emerald-400">₹{minPrice}-₹{maxPrice}</span>
                </div>
              </div>
              <FormField
                control={form.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-200">Action Type</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button"
                        variant={field.value === 'sell' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-16 p-2 transition-all ${
                          field.value === 'sell' 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'border-slate-600/50 hover:border-emerald-500 bg-slate-800/50 text-slate-300'
                        }`}
                        onClick={() => field.onChange('sell')}
                        data-testid="option-have-energy"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Zap className="h-4 w-4" />
                          <span className="text-xs font-medium">SELL</span>
                        </div>
                      </Button>
                      <Button 
                        type="button"
                        variant={field.value === 'buy' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-16 p-2 transition-all ${
                          field.value === 'buy' 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'border-slate-600/50 hover:border-blue-500 bg-slate-800/50 text-slate-300'
                        }`}
                        onClick={() => field.onChange('buy')}
                        data-testid="option-need-energy"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Battery className="h-4 w-4" />
                          <span className="text-xs font-medium">BUY</span>
                        </div>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="energyAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-200">
                        Amount (kWh)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="1"
                          placeholder="5"
                          data-testid="input-energy-amount"
                          className="h-9 bg-slate-800/70 border-slate-600/50 text-white placeholder:text-slate-400"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerKwh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-200">
                        Price (₹/kWh)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="1"
                          max="500"
                          placeholder="6.0"
                          data-testid="input-price-per-kwh"
                          className="h-9 bg-slate-800/70 border-slate-600/50 text-white placeholder:text-slate-400"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Quick Price Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => form.setValue('pricePerKwh', minPrice)}
                  className="h-8 text-xs bg-slate-800/50 border-slate-600/50 hover:border-blue-500 text-slate-300"
                  data-testid="button-price-low"
                >
                  Low: ₹{Math.round(minPrice)}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => form.setValue('pricePerKwh', currentMarketRate)}
                  className="h-8 text-xs bg-slate-800/50 border-slate-600/50 hover:border-emerald-500 text-slate-300"
                  data-testid="button-price-market"
                >
                  Market: ₹{Math.round(currentMarketRate)}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => form.setValue('pricePerKwh', 9)}
                  className="h-8 text-xs bg-slate-800/50 border-slate-600/50 hover:border-purple-500 text-slate-300"
                  data-testid="button-price-high"
                >
                  High: ₹9
                </Button>
              </div>

              {/* Total Display */}
              {form.watch('energyAmount') > 0 && form.watch('pricePerKwh') > 0 && (
                <div className="bg-gradient-to-r from-emerald-950/40 to-emerald-900/30 p-3 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Total Value:</span>
                    <span className="font-bold text-lg text-emerald-400">
                      ₹{Math.round((form.watch('energyAmount') || 0) * (form.watch('pricePerKwh') || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTradeDialog(false)}
                  className="flex-1 h-10 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:border-red-500"
                  data-testid="button-cancel-trade"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createTradeMutation.isPending}
                  className={`flex-1 h-10 font-medium text-white ${
                    form.watch("tradeType") === "sell"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  data-testid="button-submit-trade"
                >
                  {createTradeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : form.watch("tradeType") === "sell" ? (
                    "Sell Energy"
                  ) : form.watch("tradeType") === "buy" ? (
                    "Buy Energy"
                  ) : (
                    "Create Trade"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Trade Acceptance Dialog */}
      <Dialog open={showAcceptTradeDialog} onOpenChange={setShowAcceptTradeDialog}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto my-4 max-h-[95vh] overflow-y-auto z-50 p-4 sm:p-6 bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-100">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
              Accept Energy Trade
            </DialogTitle>
          </DialogHeader>
          
          {acceptingTrade && (
            <div className="space-y-4 sm:space-y-6 pt-4">
              <div className="bg-gradient-to-r from-emerald-950/40 to-emerald-900/30 p-3 sm:p-4 rounded-lg border border-emerald-500/20">
                <h4 className="font-semibold text-emerald-200 mb-3 text-sm sm:text-base">
                  {acceptingTrade.trade.tradeType === 'sell' ? '🌟 Accept Energy Offer' : '⚡ Fulfill Energy Request'}
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Energy Amount:</span>
                    <span className="font-semibold text-slate-200">{acceptingTrade.trade.energyAmount} kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Price per kWh:</span>
                    <span className="font-semibold text-slate-200">{formatTradePrice(acceptingTrade.trade.pricePerKwh)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2">
                    <span className="text-slate-300 font-medium">Total Cost:</span>
                    <span className="font-bold text-base sm:text-lg text-emerald-400">
                      {formatTradeTotal(acceptingTrade.trade.energyAmount, acceptingTrade.trade.pricePerKwh)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 flex-shrink-0">
                      {acceptingTrade.trade.tradeType === 'sell' ? 'Seller:' : 'Buyer:'}
                    </span>
                    <span className="font-medium text-right ml-2 break-words text-slate-200">
                      {acceptingTrade.trade.tradeType === 'sell' ? getHouseholdName(acceptingTrade, 'seller') : getHouseholdName(acceptingTrade, 'buyer')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-600/50">
                <h5 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Activity className="h-4 w-4" />
                  What happens next?
                </h5>
                <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Your contact information will be shared with the other party</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>You'll receive their contact details for energy transfer coordination</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>SolarSense facilitates secure peer-to-peer energy exchange</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Trade completion is tracked for network transparency</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowAcceptTradeDialog(false)}
                  variant="outline"
                  className="w-full sm:flex-1 order-2 sm:order-1 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:border-red-500"
                  data-testid="button-cancel-accept"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAcceptTrade}
                  disabled={acceptTradeMutation.isPending}
                  className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white order-1 sm:order-2"
                  data-testid="button-confirm-accept"
                >
                  {acceptTradeMutation.isPending ? 'Processing...' : 
                    acceptingTrade.trade.tradeType === 'sell' ? 'Accept Offer' : 'Fulfill Request'
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Details Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="h-5 w-5" />
              Contact Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTradeForDetails && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">
                  {selectedTradeForDetails.trade.tradeType === 'sell' ? 'Energy Offer' : 'Energy Request'}
                </h4>
                <p><strong>Amount:</strong> {selectedTradeForDetails.trade.energyAmount} kWh</p>
                <p><strong>Price:</strong> {formatTradePrice(selectedTradeForDetails.trade.pricePerKwh)}/kWh</p>
                <p><strong>Total Value:</strong> {formatTradeTotal(selectedTradeForDetails.trade.energyAmount, selectedTradeForDetails.trade.pricePerKwh)}</p>
                <p><strong>Created:</strong> {new Date(selectedTradeForDetails.trade.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <h4 className="font-semibold mb-2">💌 Express Interest</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Click below to send an automated email expressing your interest in this trade. 
                  Your contact details will be shared with the other party.
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // Send interest email
                    const subject = `Energy Trade Interest - ${selectedTradeForDetails.trade.energyAmount} kWh`;
                    const body = `Hello,\n\nI am interested in your energy ${selectedTradeForDetails.trade.tradeType === 'sell' ? 'offer' : 'request'} of ${selectedTradeForDetails.trade.energyAmount} kWh at ₹${selectedTradeForDetails.trade.pricePerKwh}/kWh.\n\nPlease contact me if you are available and interested to proceed with this trade.\n\nBest regards,\n${user?.username || 'Energy Trader'}`;
                    
                    // Open email client
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    
                    toast({
                      title: "Email Opened",
                      description: "Your email client has been opened with a pre-filled message. Send it to express your interest!",
                    });
                    setShowContactDialog(false);
                  }}
                  data-testid="button-send-interest"
                >
                  📧 Send Interest Email
                </Button>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold mb-2">📍 Location & Contact</h4>
                <p className="text-sm text-gray-600">
                  <strong>Area:</strong> Ludhiana, Punjab<br/>
                  <strong>Household:</strong> {selectedTradeForDetails.trade?.tradeType === 'sell' ? getHouseholdName(selectedTradeForDetails, 'seller') : getHouseholdName(selectedTradeForDetails, 'buyer')}<br/>
                  <strong>Contact:</strong> Details shared upon mutual interest<br/>
                  <strong>Safety:</strong> All trades are verified through SolarSense platform
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Trade Dialog */}
      <Dialog open={showEditTradeDialog} onOpenChange={setShowEditTradeDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Edit className="h-6 w-6" />
              Edit Energy Trade
            </DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 pt-4">
              
              {/* Smart Price Recommendation */}
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-200 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  💡 Current Market Rate
                </h4>
                <p className="text-sm text-blue-400">
                  Market rate: <strong>₹5/kWh</strong> • Weather impact: <strong>Stormy conditions reducing solar</strong>
                </p>
              </div>

              <FormField
                control={editForm.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you want to do?</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          field.value === 'sell' 
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200' 
                            : 'border-slate-600/50 hover:border-slate-500/70 text-slate-300'
                        }`}
                        onClick={() => field.onChange('sell')}
                        data-testid="edit-option-have-energy"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">⚡</div>
                          <div className="font-semibold">I HAVE</div>
                          <div className="text-xs">Surplus Energy</div>
                        </div>
                      </div>
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          field.value === 'buy' 
                            ? 'border-blue-500 bg-blue-500/20 text-blue-200' 
                            : 'border-slate-600/50 hover:border-slate-500/70 text-slate-300'
                        }`}
                        onClick={() => field.onChange('buy')}
                        data-testid="edit-option-need-energy"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">🔋</div>
                          <div className="font-semibold">I NEED</div>
                          <div className="text-xs">Extra Power</div>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="energyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editForm.watch("tradeType") === "sell" 
                        ? "How much energy do you have? (kWh)" 
                        : editForm.watch("tradeType") === "buy"
                        ? "How much energy do you need? (kWh)"
                        : "Energy Amount (kWh)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder={editForm.watch("tradeType") === "sell" 
                          ? "e.g., 5 (surplus to sell)" 
                          : editForm.watch("tradeType") === "buy"
                          ? "e.g., 3 (power needed)"
                          : "e.g., 5"}
                        data-testid="edit-input-energy-amount"
                        className="w-full"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="pricePerKwh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {editForm.watch("tradeType") === "sell" 
                        ? "💰 Your Selling Price" 
                        : editForm.watch("tradeType") === "buy"
                        ? "💳 Maximum You'll Pay"
                        : "💱 Price per kWh"}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="1"
                              max="500"
                              placeholder={editForm.watch("tradeType") === "sell" 
                                ? "e.g., 5" 
                                : editForm.watch("tradeType") === "buy"
                                ? "e.g., 6"
                                : "e.g., 5"}
                              data-testid="edit-input-price-per-kwh"
                              className="w-full"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 rounded border">
                          ₹/kWh
                        </div>
                      </div>
                      {field.value > 0 && (
                        <div className="flex gap-2 text-xs">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(3.8)}
                            className="text-xs px-2 py-1"
                          >
                            Low: ₹3.8
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(5)}
                            className="text-xs px-2 py-1"
                          >
                            Market: ₹5
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(5.2)}
                            className="text-xs px-2 py-1"
                          >
                            Premium
                          </Button>
                        </div>
                      )}
                      {field.value > 0 && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          💰 Total Value: ₹{Math.round((editForm.watch("energyAmount") || 0) * field.value)}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditTradeDialog(false)}
                  className="flex-1 w-full text-red-600"
                  data-testid="button-cancel-edit-trade"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTradeMutation.isPending}
                  className="flex-1 w-full"
                  data-testid="button-update-trade"
                >
                  {updateTradeMutation.isPending 
                    ? "Updating..." 
                    : editForm.watch("tradeType") === "sell"
                    ? "Update Energy Offer"
                    : editForm.watch("tradeType") === "buy"
                    ? "Update Energy Request"
                    : "Update Trade"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Location Request Dialog */}
      <LocationRequest
        isOpen={showLocationRequest}
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />

      {/* Validation Card for Server Issues and Logout - Responsive positioning below navbar */}
      {showValidationCard && (
        <div className="fixed top-20 sm:top-24 md:top-28 right-2 sm:right-4 md:right-6 z-[10000] w-full max-w-xs sm:max-w-sm md:max-w-md px-2 sm:px-0">
          <ValidationCard
            type={validationType}
            title={validationType === "success" ? "Logout Successful" : "Server Notice"}
            description={validationMessage}
            onClose={() => setShowValidationCard(false)}
          />
        </div>
      )}
    </div>
  );
}
