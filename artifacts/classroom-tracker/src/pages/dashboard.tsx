import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
  useGetLowStockSupplies,
  getGetLowStockSuppliesQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, ClipboardList, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity(
    { limit: 10 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } }
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your classroom supplies and usage.</p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/stock" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Supplies</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{summary?.totalSupplies || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">View all items</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/low-stock" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-orange-600">{summary?.lowStockCount || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">View low stock items</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/out-of-stock" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-destructive">{summary?.outOfStockCount || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">View out of stock items</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/usage" className="block group">
            <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usage This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{summary?.totalUsageThisWeek || 0}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoadingSummary ? <Skeleton className="h-3 w-16" /> : `${summary?.totalUsageToday || 0} today`}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Supplies by Category</CardTitle>
              <CardDescription>Current inventory count across categories</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {isLoadingSummary ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full mx-4" />
                </div>
              ) : summary?.categoryCounts && summary.categoryCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.categoryCounts}>
                    <XAxis
                      dataKey="category"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {summary.categoryCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest usage and restocks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-6">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        item.type === 'restock' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.type === 'restock' ? <Archive className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <Link href={`/supplies/${item.supplyId}`} className="hover:underline">
                            {item.supplyName}
                          </Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.type === 'usage' ? (
                            <span><span className="font-medium text-foreground">{item.usedBy}</span> used {item.quantityUsed}</span>
                          ) : (
                            <span>Restocked {item.quantityUsed} items</span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.usedAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
