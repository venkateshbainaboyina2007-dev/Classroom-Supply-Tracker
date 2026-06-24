import React, { useState } from "react";
import { Link } from "wouter";
import { useListSupplies, getListSuppliesQueryKey, useRestockSupply, getGetLowStockSuppliesQueryKey, getGetDashboardSummaryQueryKey, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { PackagePlus, PackageX, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
const restockSchema = z.object({
    quantity: z.coerce.number().min(1, "Must restock at least 1"),
    notes: z.string().optional(),
});
function RestockDialog({ supplyId, supplyName, defaultQuantity, open, onOpenChange, }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const restockSupply = useRestockSupply();
    const form = useForm({
        resolver: zodResolver(restockSchema),
        defaultValues: { quantity: defaultQuantity, notes: "" },
    });
    const onSubmit = (values) => {
        restockSupply.mutate({ id: supplyId, data: values }, {
            onSuccess: () => {
                toast({ title: "Restock successful", description: `${supplyName} is back in stock.` });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetLowStockSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
                form.reset();
                onOpenChange(false);
            },
            onError: () => {
                toast({ title: "Error", description: "Failed to restock supply.", variant: "destructive" });
            },
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
export default function OutOfStock() {
    const [activeDialogs, setActiveDialogs] = useState({});
    const { data: allSupplies, isLoading } = useListSupplies({}, { query: { queryKey: getListSuppliesQueryKey() } });
    const allSuppliesItems = Array.isArray(allSupplies) ? allSupplies : [];
    const supplies = allSuppliesItems.filter((s) => s.quantity === 0);
    const handleDialogChange = (id, open) => {
        setActiveDialogs((prev) => ({ ...prev, [id]: open }));
    };
    return (<Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <PackageX className="w-5 h-5 text-destructive"/>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Out of Stock</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Supplies with zero remaining quantity that need immediate restocking.
            </p>
          </div>
          {!isLoading && supplies.length > 0 && (<Badge variant="destructive" className="text-base px-3 py-1 mt-1">
              {supplies.length} item{supplies.length !== 1 ? "s" : ""}
            </Badge>)}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supply</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Restock Qty</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto"/></TableCell>
                    </TableRow>))) : supplies.length > 0 ? (supplies.map((supply) => (<TableRow key={supply.id} className="bg-destructive/5 hover:bg-destructive/10">
                      <TableCell className="font-medium">
                        <Link href={`/supplies/${supply.id}`} className="hover:underline">
                          {supply.name}
                        </Link>
                        {supply.notes && (<div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {supply.notes}
                          </div>)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted border-0 text-muted-foreground">
                          {supply.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{supply.unit}</TableCell>
                      <TableCell>
                        <span className="font-medium">{supply.reorderQuantity}</span>
                        <span className="text-muted-foreground text-sm ml-1">{supply.unit}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <RestockDialog supplyId={supply.id} supplyName={supply.name} defaultQuantity={supply.reorderQuantity} open={!!activeDialogs[supply.id]} onOpenChange={(open) => handleDialogChange(supply.id, open)}/>
                      </TableCell>
                    </TableRow>))) : (<TableRow>
                    <TableCell colSpan={5} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-primary/40"/>
                        <p className="text-lg font-medium">All items in stock!</p>
                        <p className="text-muted-foreground text-sm">
                          No supplies are currently out of stock.
                        </p>
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
