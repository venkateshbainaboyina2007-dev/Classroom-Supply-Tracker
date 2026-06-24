import React, { useState } from "react";
import { Link, useSearch } from "wouter";
import { useGetLowStockSupplies, getGetLowStockSuppliesQueryKey, useRestockSupply, getListSuppliesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackagePlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
const restockSchema = z.object({
    quantity: z.coerce.number().min(1, "Must restock at least 1"),
    notes: z.string().optional(),
});
function QuickRestockDialog({ supplyId, supplyName, defaultQuantity, open, onOpenChange }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const restockSupply = useRestockSupply();
    const form = useForm({
        resolver: zodResolver(restockSchema),
        defaultValues: {
            quantity: defaultQuantity,
            notes: "Quick restock from Low Stock view",
        },
    });
    const onSubmit = (values) => {
        restockSupply.mutate({ id: supplyId, data: values }, {
            onSuccess: () => {
                toast({ title: "Restock successful", description: `${supplyName} inventory updated.` });
                queryClient.invalidateQueries({ queryKey: getGetLowStockSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
                form.reset();
                onOpenChange(false);
            },
            onError: () => {
                toast({ title: "Error", description: "Failed to restock supply.", variant: "destructive" });
            }
        });
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PackagePlus className="w-4 h-4 mr-2"/> Restock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Restock {supplyName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem>
                  <FormLabel>Quantity to Add</FormLabel>
                  <FormControl>
                    <Input type="number" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={restockSupply.isPending}>
                {restockSupply.isPending ? "Restocking..." : "Restock Items"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function LowStock() {
    const [activeDialogs, setActiveDialogs] = useState({});
    const search = useSearch();
    const params = new URLSearchParams(search);
    const filterOutOfStock = params.get("filter") === "out-of-stock";
    const { data: allSupplies, isLoading } = useGetLowStockSupplies({
        query: { queryKey: getGetLowStockSuppliesQueryKey() }
    });
    const allSuppliesItems = Array.isArray(allSupplies) ? allSupplies : [];
    const supplies = filterOutOfStock
        ? allSuppliesItems.filter((s) => s.quantity === 0)
        : allSuppliesItems;
    const handleDialogChange = (id, open) => {
        setActiveDialogs(prev => ({ ...prev, [id]: open }));
    };
    return (<Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {filterOutOfStock ? "Out of Stock" : "Replenishment Needs"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {filterOutOfStock
            ? "Supplies with zero remaining stock that need immediate restocking."
            : "Supplies that are at or below their designated reorder threshold."}
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supply</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto"/></TableCell>
                    </TableRow>))) : supplies.length > 0 ? (supplies.map((supply) => {
            const isOutOfStock = supply.quantity === 0;
            return (<TableRow key={supply.id} className={isOutOfStock ? "bg-destructive/5 hover:bg-destructive/10" : ""}>
                        <TableCell className="font-medium">
                          <Link href={`/supplies/${supply.id}`} className="hover:underline">
                            {supply.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{supply.category}</div>
                        </TableCell>
                        <TableCell>
                          {isOutOfStock ? (<Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <AlertTriangle className="w-3 h-3"/> Out of Stock
                            </Badge>) : (<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 flex w-fit items-center gap-1">
                              <AlertTriangle className="w-3 h-3"/> Low Stock
                            </Badge>)}
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${isOutOfStock ? 'text-destructive' : 'text-orange-600'}`}>
                            {supply.quantity}
                          </span>
                          <span className="text-muted-foreground text-sm ml-1">{supply.unit}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{supply.reorderThreshold}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <QuickRestockDialog supplyId={supply.id} supplyName={supply.name} defaultQuantity={supply.reorderQuantity} open={!!activeDialogs[supply.id]} onOpenChange={(open) => handleDialogChange(supply.id, open)}/>
                        </TableCell>
                      </TableRow>);
        })) : (<TableRow>
                    <TableCell colSpan={5} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="w-12 h-12 text-primary/40 mb-3"/>
                        <p className="text-lg font-medium text-foreground">All stocked up!</p>
                        <p className="text-muted-foreground">No supplies are currently running low.</p>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>);
}
