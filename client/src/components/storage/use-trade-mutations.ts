import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExtendedEnergyTrade, TradeFormValues } from "./storage-types";

const ALL_KEYS = [
  "/api/energy-trades",
  "/api/trade-offers",
  "/api/trade-acceptances",
  "/api/my-trade-applications",
];

export function useTradeMutations(callbacks: {
  onCreateSuccess: () => void;
  onEditSuccess: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const inv = (...keys: string[]) =>
    keys.forEach((k) =>
      qc.invalidateQueries({ queryKey: [k], refetchType: "all" }),
    );

  const ok = (title: string, description: string) =>
    toast({ title, description });

  const fail = (msg: string) =>
    toast({ title: "Error", description: msg, variant: "destructive" });

  const createTrade = useMutation({
    mutationFn: (data: TradeFormValues) =>
      apiRequest("POST", "/api/energy-trades", {
        energyAmount: Math.round(data.energyAmount),
        pricePerKwh: Math.round(data.pricePerKwh),
        tradeType: data.tradeType,
      }),
    onSuccess: () => {
      inv("/api/energy-trades", "/api/trade-offers");
      callbacks.onCreateSuccess();
      ok("Trade Created", "Your energy trade has been posted successfully.");
    },
    onError: () => fail("Failed to create trade. Please try again."),
  });

  const updateTrade = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TradeFormValues }) =>
      apiRequest("PUT", `/api/energy-trades/${id}`, {
        energyAmount: Math.round(data.energyAmount),
        pricePerKwh: Math.round(data.pricePerKwh),
        tradeType: data.tradeType,
      }),
    onSuccess: () => {
      inv("/api/energy-trades", "/api/trade-offers");
      callbacks.onEditSuccess();
      ok("Trade Updated", "Your energy trade has been updated successfully.");
    },
    onError: () => fail("Failed to update trade. Please try again."),
  });

  const cancelTrade = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/energy-trades/${id}/cancel`),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["/api/energy-trades"] });
      const prev = qc.getQueryData<ExtendedEnergyTrade[]>([
        "/api/energy-trades",
      ]);
      qc.setQueryData<ExtendedEnergyTrade[]>(["/api/energy-trades"], (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, status: "cancelled" as const } : t,
        ),
      );
      return { prev };
    },
    onSuccess: () => {
      inv("/api/energy-trades", "/api/trade-offers");
      ok("Trade Cancelled", "Your energy trade has been cancelled.");
    },
    onError: (error: any, _: number, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/energy-trades"], ctx.prev);
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel trade.",
        variant: "destructive",
      });
    },
    onSettled: () => inv("/api/energy-trades", "/api/trade-offers"),
  });

  const shareContact = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/trade-acceptances/${id}/share-contact`),
    onSuccess: () => {
      inv("/api/trade-acceptances", "/api/my-trade-applications");
      ok(
        "Contact Shared",
        "Contact information shared for energy delivery coordination.",
      );
    },
    onError: () => fail("Failed to share contact. Please try again."),
  });

  const withdraw = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/trade-acceptances/${id}`),
    onSuccess: () => {
      inv(...ALL_KEYS);
      ok(
        "Application Withdrawn",
        "Your application has been successfully withdrawn.",
      );
    },
    onError: () => fail("Failed to withdraw application. Please try again."),
  });

  const decline = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/trade-acceptances/${id}/owner-decision`, {
        decision: "reject",
      }),
    onSuccess: () => {
      inv(...ALL_KEYS);
      ok("Application Rejected", "The application has been rejected.");
    },
    onError: () => fail("Failed to reject application. Please try again."),
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/trade-acceptances/${id}/owner-decision`, {
        decision: "accept",
      }),
    onSuccess: () => {
      inv(...ALL_KEYS);
      ok(
        "Application Approved",
        "Waiting for applicant to share contact or reject.",
      );
    },
    onError: () => fail("Failed to approve application. Please try again."),
  });

  const applicantReject = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/trade-acceptances/${id}/applicant-reject`),
    onSuccess: () => {
      inv(...ALL_KEYS);
      ok("Trade Rejected", "This trade is now available for other applicants.");
    },
    onError: () => fail("Failed to reject trade. Please try again."),
  });

  return {
    createTrade,
    updateTrade,
    cancelTrade,
    shareContact,
    withdraw,
    decline,
    approve,
    applicantReject,
  };
}
