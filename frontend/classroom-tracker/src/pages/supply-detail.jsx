import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSupply, getGetSupplyQueryKey, useUpdateSupply, useDeleteSupply, useRestockSupply, useListUsageLogs, getListUsageLogsQueryKey, getListSuppliesQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, PackagePlus, AlertCircle, Clock, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
const editSupplySchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: z.string().min(1, "Category is required"),
    quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
    unit: z.string().min(1, "Unit is required"),
    reorderThreshold: z.coerce.number().min(0, "Threshold must be 0 or more"),
    reorderQuantity: z.coerce.number().min(1, "Reorder quantity must be at least 1"),
    notes: z.string().optional(),
});
const restockSchema = z.object({
    quantity: z.coerce.number().min(1, "Must restock at least 1"),
    notes: z.string().optional(),
});
export default function SupplyDetail({ params }) {
    const { isAdmin } = useAuth();
    const id = parseInt(params.id);
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [restockOpen, setRestockOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { data: supply, isLoading: supplyLoading } = useGetSupply(id, {
        query: { queryKey: getGetSupplyQueryKey(id), enabled: !isNaN(id) }
    });
    const { data: usageLogs, isLoading: logsLoading } = useListUsageLogs({ supplyId: id }, { query: { queryKey: getListUsageLogsQueryKey({ supplyId: id }), enabled: !isNaN(id) } });
    const usageLogItems = Array.isArray(usageLogs) ? usageLogs : [];
    const updateSupply = useUpdateSupply();
    const deleteSupply = useDeleteSupply();
    const restockSupply = useRestockSupply();
    const editForm = useForm({
        resolver: zodResolver(editSupplySchema),
        values: supply ? {
            name: supply.name,
            category: supply.category,
            quantity: supply.quantity,
            unit: supply.unit,
            reorderThreshold: supply.reorderThreshold,
            reorderQuantity: supply.reorderQuantity,
            notes: supply.notes || "",
        } : undefined
    });
    const restockForm = useForm({
        resolver: zodResolver(restockSchema),
        defaultValues: {
            quantity: supply?.reorderQuantity || 1,
            notes: ""
        }
    });
    React.useEffect(() => {
        if (supply && !restockForm.formState.isDirty) {
            restockForm.setValue('quantity', supply.reorderQuantity);
        }
    }, [supply, restockForm]);
    const onEditSubmit = (values) => {
        updateSupply.mutate({ id, data: values }, {
            onSuccess: () => {
                toast({ title: "Supply updated" });
                queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(id) });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                setEditOpen(false);
            },
            onError: () => {
                toast({ title: "Update failed", variant: "destructive" });
            }
        });
    };
    const onRestockSubmit = (values) => {
        restockSupply.mutate({ id, data: values }, {
            onSuccess: () => {
                toast({ title: "Restock successful" });
                queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(id) });
                queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey({ supplyId: id }) });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                setRestockOpen(false);
                restockForm.reset();
            },
            onError: () => {
                toast({ title: "Restock failed", variant: "destructive" });
            }
        });
    };
    const handleDelete = () => {
        deleteSupply.mutate({ id }, {
            onSuccess: () => {
                toast({ title: "Supply deleted" });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                setLocation("/supplies");
            },
            onError: () => {
                toast({ title: "Delete failed", variant: "destructive" });
            }
        });
    };
    if (supplyLoading) {
        return (<Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8"/>
            <Skeleton className="h-10 w-64"/>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="col-span-2 space-y-6">
              <Skeleton className="h-48 w-full"/>
              <Skeleton className="h-64 w-full"/>
            </div>
            <Skeleton className="h-48 w-full"/>
          </div>
        </div>
      </Layout>);
    }
    if (!supply) {
        return (<Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Supply not found</h2>
          <Button asChild className="mt-4"><Link href="/supplies">Back to Supplies</Link></Button>
        </div>
      </Layout>);
    }
    const isOutOfStock = supply.quantity === 0;
    const isLowStock = supply.quantity <= supply.reorderThreshold && !isOutOfStock;
    return (<Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <Link href="/supplies"><ArrowLeft className="h-4 w-4"/></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                {supply.name}
                {isOutOfStock ? (<Badge variant="destructive" className="ml-2">Out of Stock</Badge>) : isLowStock ? (<Badge className="bg-orange-100 text-orange-800 border-orange-200">Low Stock</Badge>) : null}
              </h1>
              <p className="text-muted-foreground mt-1">{supply.category}</p>
            </div>
          </div>
          
          {isAdmin && (<div className="flex gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Supply</DialogTitle>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input {...field}/></FormControl>
                            <FormMessage />
                          </FormItem>)}/>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={editForm.control} name="category" render={({ field }) => (<FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl><Input {...field}/></FormControl>
                              <FormMessage />
                            </FormItem>)}/>
                        <FormField control={editForm.control} name="unit" render={({ field }) => (<FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl><Input {...field}/></FormControl>
                              <FormMessage />
                            </FormItem>)}/>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField control={editForm.control} name="quantity" render={({ field }) => (<FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" {...field}/></FormControl>
                              <FormMessage />
                            </FormItem>)}/>
                        <FormField control={editForm.control} name="reorderThreshold" render={({ field }) => (<FormItem>
                              <FormLabel>Threshold</FormLabel>
                              <FormControl><Input type="number" {...field}/></FormControl>
                              <FormMessage />
                            </FormItem>)}/>
                        <FormField control={editForm.control} name="reorderQuantity" render={({ field }) => (<FormItem>
                              <FormLabel>Restock Qty</FormLabel>
                              <FormControl><Input type="number" {...field}/></FormControl>
                              <FormMessage />
                            </FormItem>)}/>
                      </div>
                      <FormField control={editForm.control} name="notes" render={({ field }) => (<FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea {...field}/></FormControl>
                            <FormMessage />
                          </FormItem>)}/>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={updateSupply.isPending}>Save Changes</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PackagePlus className="w-4 h-4 mr-2"/> Restock
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Restock {supply.name}</DialogTitle>
                  </DialogHeader>
                  <Form {...restockForm}>
                    <form onSubmit={restockForm.handleSubmit(onRestockSubmit)} className="space-y-4">
                      <FormField control={restockForm.control} name="quantity" render={({ field }) => (<FormItem>
                            <FormLabel>Quantity to Add</FormLabel>
                            <FormControl><Input type="number" {...field}/></FormControl>
                            <FormMessage />
                          </FormItem>)}/>
                      <FormField control={restockForm.control} name="notes" render={({ field }) => (<FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="e.g. Received new shipment" {...field}/></FormControl>
                            <FormMessage />
                          </FormItem>)}/>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={restockSupply.isPending}>Restock Items</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>)}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground"/> 
                  Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Current Stock</p>
                    <p className={`text-3xl font-bold ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-orange-600' : ''}`}>
                      {supply.quantity} <span className="text-lg font-normal text-muted-foreground">{supply.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Low Stock Alert At</p>
                    <p className="text-xl font-semibold">{supply.reorderThreshold}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Standard Restock</p>
                    <p className="text-xl font-semibold">{supply.reorderQuantity}</p>
                  </div>
                </div>
                {supply.notes && (<div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{supply.notes}</p>
                  </div>)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-muted-foreground"/> 
                  Usage History
                </CardTitle>
                <CardDescription>Recent activity for this item</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (<div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full"/>)}
                  </div>) : usageLogItems.length > 0 ? (<div className="space-y-4">
                    {usageLogItems.map((log) => (<div key={log.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium">{log.usedBy}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3 mr-1"/>
                            {format(new Date(log.usedAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-destructive">-{log.quantityUsed} {supply.unit}</p>
                          {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                        </div>
                      </div>))}
                  </div>) : (<div className="text-center py-6 text-muted-foreground text-sm">
                    No usage history recorded.
                  </div>)}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/usage?supplyId=${supply.id}`}>Log Usage</Link>
                </Button>
                
                {isAdmin && (<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start text-destructive hover:bg-destructive/10" variant="ghost">
                        <Trash2 className="w-4 h-4 mr-2"/> Delete Supply
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Supply?</DialogTitle>
                        <CardDescription className="py-4">
                          Are you sure you want to delete {supply.name}? This action cannot be undone and will not delete associated usage logs.
                        </CardDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteSupply.isPending}>
                          Delete Permanently
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>);
}
