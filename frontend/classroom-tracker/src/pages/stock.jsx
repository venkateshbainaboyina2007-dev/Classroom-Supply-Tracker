import React, { useState } from "react";
import { Link } from "wouter";
import { useListSupplies, getListSuppliesQueryKey, useListCategories, getListCategoriesQueryKey, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
function StockBar({ quantity, threshold, max }) {
    const pct = max > 0 ? Math.min((quantity / max) * 100, 100) : 0;
    const isOut = quantity === 0;
    const isLow = quantity <= threshold && !isOut;
    const color = isOut ? "bg-destructive" : isLow ? "bg-orange-400" : "bg-primary";
    return (<div className="flex items-center gap-3 min-w-40">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-sm font-semibold tabular-nums w-8 text-right">{quantity}</span>
    </div>);
}
export default function Stock() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState();
    const { data: supplies, isLoading } = useListSupplies({ category, search }, { query: { queryKey: getListSuppliesQueryKey({ category, search }) } });
    const { data: categories = [] } = useListCategories({
        query: { queryKey: getListCategoriesQueryKey() },
    });
    const suppliesItems = Array.isArray(supplies) ? supplies : [];
    const categoriesItems = Array.isArray(categories) ? categories : [];
    const maxQty = suppliesItems.length > 0 ? Math.max(...suppliesItems.map((s) => s.quantity), 1) : 1;
    const inStock = suppliesItems.filter((s) => s.quantity > s.reorderThreshold).length;
    const lowStock = suppliesItems.filter((s) => s.quantity <= s.reorderThreshold && s.quantity > 0).length;
    const outOfStock = suppliesItems.filter((s) => s.quantity === 0).length;
    return (<Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stock Overview</h1>
          <p className="text-muted-foreground mt-1">
            Current quantity levels for all classroom supplies.
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"/>
            {isLoading ? "—" : inStock} In Stock
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>
            {isLoading ? "—" : lowStock} Low Stock
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block"/>
            {isLoading ? "—" : outOfStock} Out of Stock
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search supplies..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)}/>
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
              {categoriesItems.map((c) => (<SelectItem key={c} value={c}>
                  {c}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock cards grid */}
        {isLoading ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (<Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-36"/>
                  <Skeleton className="h-3 w-20"/>
                  <Skeleton className="h-2 w-full"/>
                </CardContent>
              </Card>))}
          </div>) : suppliesItems.length > 0 ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliesItems.map((supply) => {
                const isOut = supply.quantity === 0;
                const isLow = supply.quantity <= supply.reorderThreshold && !isOut;
                const pct = maxQty > 0 ? Math.min((supply.quantity / maxQty) * 100, 100) : 0;
                const barColor = isOut
                    ? "bg-destructive"
                    : isLow
                        ? "bg-orange-400"
                        : "bg-primary";
                return (<Card key={supply.id} className={`transition-shadow hover:shadow-md ${isOut
                        ? "border-destructive/30 bg-destructive/5"
                        : isLow
                            ? "border-orange-200 bg-orange-50/50"
                            : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link href={`/supplies/${supply.id}`} className="font-semibold text-sm hover:underline leading-tight block">
                          {supply.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{supply.category}</span>
                      </div>
                      {isOut ? (<Badge variant="destructive" className="text-xs shrink-0">
                          Out of Stock
                        </Badge>) : isLow ? (<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 text-xs shrink-0">
                          Low Stock
                        </Badge>) : (<Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-xs shrink-0">
                          In Stock
                        </Badge>)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Quantity</span>
                        <span>
                          Reorder at{" "}
                          <span className="font-medium text-foreground">
                            {supply.reorderThreshold} {supply.unit}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }}/>
                        </div>
                        <span className={`text-base font-bold tabular-nums ${isOut ? "text-destructive" : isLow ? "text-orange-600" : "text-foreground"}`}>
                          {supply.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">{supply.unit}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
                      <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                        <Link href={`/supplies/${supply.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>);
            })}
          </div>) : (<Card>
            <CardContent className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              No supplies found. Try adjusting your filters.
            </CardContent>
          </Card>)}
      </div>
    </Layout>);
}
