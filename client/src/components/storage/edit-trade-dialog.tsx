import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import {
  Edit2,
  ShoppingCart,
  Zap,
  Store,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { TradeFormValues } from "./storage-types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: UseFormReturn<TradeFormValues>;
  onSubmit: (data: TradeFormValues) => void;
  isPending: boolean;
}

export function EditTradeDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-2xl mx-2 sm:mx-0 bg-slate-900/95 backdrop-blur-xl border border-slate-600/40 shadow-2xl shadow-black/20">
        <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2 mb-2">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          Edit Energy Trade
        </DialogTitle>
        <DialogDescription className="text-slate-400 text-sm leading-relaxed border-b border-slate-700/50 pb-4 mb-4">
          Update your trade details below.
        </DialogDescription>

        <Form {...form}>
          <form
            id="edit-trade-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="tradeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                      <ShoppingCart className="h-3 w-3 text-blue-400" />
                    </div>
                    Trade Type
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-slate-800/70 border-slate-600/50 text-slate-100">
                        <SelectValue placeholder="Choose type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800/95 border-slate-600/50">
                      <SelectItem value="sell">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          Sell Energy
                        </div>
                      </SelectItem>
                      <SelectItem value="buy">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-blue-400" />
                          Buy Energy
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energyAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-yellow-500/20 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-yellow-400" />
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
                        className="h-11 bg-slate-800/70 border-slate-600/50 pl-9 pr-12 text-slate-100"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="Enter kWh"
                        {...field}
                      />
                      <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-400/70" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-700/80 text-slate-200 px-2 py-0.5 rounded-md text-xs font-semibold">
                        kWh
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-slate-500 mt-1">
                    Whole numbers only, minimum 1 kWh
                  </p>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerKwh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-200 font-semibold flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-green-500/20 flex items-center justify-center">
                      <Store className="h-3 w-3 text-green-400" />
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
                        className="h-11 bg-slate-800/70 border-slate-600/50 pl-9 pr-14 text-slate-100"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="Enter price"
                        {...field}
                      />
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400/70" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-700/80 text-slate-200 px-2 py-0.5 rounded-md text-xs font-semibold">
                        ₹/kWh
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-slate-500 mt-1">
                    Set your rate in rupees per kWh
                  </p>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="sticky bottom-0 bg-slate-900/80 border-t border-slate-600/40 pt-4 mt-6 pb-[calc(env(safe-area-inset-bottom)+12px)] flex flex-col-reverse sm:flex-row gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-slate-400 hover:text-slate-200">
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-trade-form"
            disabled={
              isPending || !form.formState.isDirty || !form.formState.isValid
            }
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-700 hover:via-cyan-700 hover:to-emerald-700 text-white font-semibold shadow-xl">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            ) : (
              "Update Trade"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
