import React, { useState } from "react";
import { Link } from "wouter";
import { useListSupplies, getListSuppliesQueryKey, useListCategories, getListCategoriesQueryKey, useCreateSupply, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
const supplySchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: z.string().min(1, "Category is required"),
    quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
    unit: z.string().min(1, "Unit is required"),
    reorderThreshold: z.coerce.number().min(0, "Threshold must be 0 or more"),
    reorderQuantity: z.coerce.number().min(1, "Reorder quantity must be at least 1"),
    notes: z.string().optional(),
});
function CreateSupplyDialog({ categories, onOpenChange, open }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const createSupply = useCreateSupply();
    const form = useForm({
        resolver: zodResolver(supplySchema),
        defaultValues: {
            name: "",
            category: "",
            quantity: 0,
            unit: "packs",
            reorderThreshold: 5,
            reorderQuantity: 10,
            notes: "",
        },
    });
    const onSubmit = (values) => {
        createSupply.mutate({ data: values }, {
            onSuccess: () => {
                toast({ title: "Supply created", description: "The new supply item has been added." });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
                form.reset();
                onOpenChange(false);
            },
            onError: (err) => {
                toast({ title: "Error", description: err?.message || "Failed to create supply.", variant: "destructive" });
            }
        });
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2"/> Add Supply</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Supply</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Dry Erase Markers" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem>
                    <FormLabel>Category</FormLabel>                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                          <SelectItem value="Art">Art</SelectItem>
                          <SelectItem value="Writing">Writing</SelectItem>
                          <SelectItem value="Paper">Paper</SelectItem>
                          <SelectItem value="Cleaning">Cleaning</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}/>
              <FormField control={form.control} name="unit" render={({ field }) => (<FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. boxes, sheets" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem>
                    <FormLabel>Initial Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
              <FormField control={form.control} name="reorderThreshold" render={({ field }) => (<FormItem>
                    <FormLabel>Low Stock At</FormLabel>
                    <FormControl>
                      <Input type="number" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
              <FormField control={form.control} name="reorderQuantity" render={({ field }) => (<FormItem>
                    <FormLabel>Restock Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>
            
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createSupply.isPending}>
                {createSupply.isPending ? "Creating..." : "Save Supply"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function Supplies() {
    const { isAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState();
    const [createOpen, setCreateOpen] = useState(false);
    const { data: supplies, isLoading } = useListSupplies({ category, search }, { query: { queryKey: getListSuppliesQueryKey({ category, search }) } });
    const { data: categories = [] } = useListCategories({
        query: { queryKey: getListCategoriesQueryKey() }
    });
    const suppliesItems = Array.isArray(supplies) ? supplies : [];
    const categoriesItems = Array.isArray(categories) ? categories : [];
    return (<Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Supplies Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage all classroom classroom supplies and monitor stock levels.</p>
          </div>
          {isAdmin && <CreateSupplyDialog categories={categoriesItems} open={createOpen} onOpenChange={setCreateOpen}/>}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search supplies..." className="pl-9 w-full" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <Select value={category || "all"} onValueChange={(val) => setCategory(val === "all" ? undefined : val)}>
            <SelectTrigger className="w-full sm:w-50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4"/>
                <SelectValue placeholder="All Categories"/>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesItems.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto"/></TableCell>
                    </TableRow>))) : suppliesItems.length > 0 ? (suppliesItems.map((supply) => {
            const isOutOfStock = supply.quantity === 0;
            const isLowStock = supply.quantity <= supply.reorderThreshold && !isOutOfStock;
            return (<TableRow key={supply.id}>
                        <TableCell className="font-medium">
                          <Link href={`/supplies/${supply.id}`} className="hover:underline">
                            {supply.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-0">
                            {supply.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{supply.quantity}</span>
                            <span className="text-muted-foreground text-sm">{supply.unit}</span>
                            {isOutOfStock ? (<Badge variant="destructive" className="ml-2 py-0">Out of Stock</Badge>) : isLowStock ? (<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 ml-2 py-0">
                                Low Stock
                              </Badge>) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={`/supplies/${supply.id}`}>View Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>);
        })) : (<TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No supplies found. Try adjusting your search or category filter.
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>);
}
