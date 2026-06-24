import React, { useState } from "react";
import { useGetUsageReport, getGetUsageReportQueryKey, useGetMostRequestedReport, getGetMostRequestedReportQueryKey, useGetLowStockSupplies, getGetLowStockSuppliesQueryKey, useListUsageLogs, getListUsageLogsQueryKey, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { format } from "date-fns";
import { TrendingUp, AlertTriangle, FileSpreadsheet, Printer, Layers, ArrowUpRight } from "lucide-react";
const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
export default function Reports() {
    const { toast } = useToast();
    const [period, setPeriod] = useState("weekly");
    // Queries
    const { data: usageReport = [], isLoading: loadingUsage } = useGetUsageReport({ period }, { query: { queryKey: getGetUsageReportQueryKey({ period }) } });
    const { data: mostRequested = [], isLoading: loadingRequested } = useGetMostRequestedReport({
        query: { queryKey: getGetMostRequestedReportQueryKey() }
    });
    const { data: lowStock = [], isLoading: loadingLowStock } = useGetLowStockSupplies({
        query: { queryKey: getGetLowStockSuppliesQueryKey() }
    });
    const { data: usageLogs = [] } = useListUsageLogs({ limit: 1000 }, { query: { queryKey: getListUsageLogsQueryKey({ limit: 1000 }) } });
    const usageDataList = Array.isArray(usageReport) ? usageReport : [];
    const requestedList = Array.isArray(mostRequested) ? mostRequested : [];
    const lowStockList = Array.isArray(lowStock) ? lowStock : [];
    const allLogs = Array.isArray(usageLogs) ? usageLogs : [];
    // Export to Excel (CSV)
    const handleExportCSV = () => {
        if (allLogs.length === 0) {
            toast({
                title: "No data to export",
                description: "There are no usage logs available to generate CSV.",
                variant: "destructive"
            });
            return;
        }
        const headers = ["Date", "Supply Item", "Classroom", "Used By", "Quantity Used", "Notes"];
        const rows = allLogs.map(log => [
            format(new Date(log.usedAt), "yyyy-MM-dd HH:mm:ss"),
            log.supplyName,
            log.classroomName || "General / No Classroom",
            log.usedBy,
            log.quantityUsed,
            log.notes || ""
        ]);
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `classroom_supplies_usage_log_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "CSV exported successfully", description: "CSV file downloaded." });
    };
    // Export to PDF
    const handleExportPDF = () => {
        window.print();
    };
    // Chart Formatting Helpers
    const chartData = usageDataList.map((item) => ({
        name: item.date ? format(new Date(item.date), period === "monthly" ? "MMM yyyy" : "MMM d") : "Date",
        quantity: item.quantityUsed || 0,
        supply: item.supplyName || "Supplies",
        classroom: item.classroomName || "Classrooms"
    }));
    const pieData = requestedList.slice(0, 7).map((item) => ({
        name: item.supplyName || "Item",
        value: item.totalRequested || 0
    }));
    return (<Layout>
      {/* Stylesheet injector for print view optimization */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, button, .print-hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
          }
          .grid-print-full {
            grid-template-columns: 1fr !important;
          }
          .print-break-before {
            page-break-before: always !important;
          }
        }
      ` }}/>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hidden">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Analyze classroom supply consumption trends and monitor resource efficiency.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none">
              <FileSpreadsheet className="w-4 h-4 mr-2"/> Export to Excel
            </Button>
            <Button onClick={handleExportPDF} className="flex-1 sm:flex-none shadow-md">
              <Printer className="w-4 h-4 mr-2"/> Export to PDF
            </Button>
          </div>
        </div>

        {/* Printable Title Block */}
        <div className="hidden print:block border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Classroom Supply Management Report</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")} | Administrator Analytics
          </p>
        </div>

        {/* Main Charts & Analytics Block */}
        <div className="grid gap-6 md:grid-cols-3 grid-print-full">
          {/* Main Consumption Trend Chart */}
          <Card className="md:col-span-2 shadow-sm border-slate-200 card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600"/> Usage Consumption Trends
                </CardTitle>
                <CardDescription>Visual supply usage patterns over time</CardDescription>
              </div>
              <div className="print-hidden">
                <Select value={period} onValueChange={(val) => setPeriod(val)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Period"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsage ? (<Skeleton className="h-72 w-full"/>) : chartData.length > 0 ? (<div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false}/>
                      <YAxis fontSize={11} stroke="#94a3b8" tickLine={false}/>
                      <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, border: "none" }} labelClassName="font-semibold text-xs border-b border-slate-700/50 pb-1 mb-1" itemStyle={{ fontSize: 12, color: "#38bdf8" }}/>
                      <Bar dataKey="quantity" fill="url(#colorUsage)" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>) : (<div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                  No consumption recorded for this period.
                </div>)}
            </CardContent>
          </Card>

          {/* Most Requested Items breakdown */}
          <Card className="shadow-sm border-slate-200 card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600"/> Most Requested Items
              </CardTitle>
              <CardDescription>Most requested supplies by classroom teachers</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              {loadingRequested ? (<Skeleton className="h-56 w-full rounded-full"/>) : pieData.length > 0 ? (<div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
                      </Pie>
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, marginTop: 10 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>) : (<div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                  No requests submitted yet.
                </div>)}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert Block & Detailed Stats Tables */}
        <div className="grid gap-6 md:grid-cols-2 grid-print-full print-break-before">
          {/* Low Stock Warnings */}
          <Card className="shadow-sm border-slate-200 card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4"/> Global Low Stock Indicators
              </CardTitle>
              <CardDescription>Items in global inventory currently at or below the reorder threshold</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Remaining Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLowStock ? (Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                        <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                        <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                        <TableCell><Skeleton className="h-4 w-8"/></TableCell>
                      </TableRow>))) : lowStockList.length > 0 ? (lowStockList.map(item => (<TableRow key={item.id} className="hover:bg-red-50/10">
                        <TableCell className="font-semibold text-sm text-foreground">{item.name}</TableCell>
                        <TableCell>
                          <span className="font-bold text-destructive">{item.quantity}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.reorderThreshold}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.unit}</TableCell>
                      </TableRow>))) : (<TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                        All supplies are comfortably stocked.
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Requested Ranking Details */}
          <Card className="shadow-sm border-slate-200 card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-indigo-900 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-indigo-600"/> Requests Analytics Ranking
              </CardTitle>
              <CardDescription>Top supply allocation requests and approval statistics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Total Requested</TableHead>
                    <TableHead>Total Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRequested ? (Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                        <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                        <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                      </TableRow>))) : requestedList.length > 0 ? (requestedList.map(item => (<TableRow key={item.supplyId}>
                        <TableCell className="font-semibold text-sm text-foreground">{item.supplyName}</TableCell>
                        <TableCell className="font-medium text-sm text-slate-700">{item.totalRequested}</TableCell>
                        <TableCell className="font-bold text-sm text-indigo-600">{item.totalApproved}</TableCell>
                      </TableRow>))) : (<TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                        No requests processed yet.
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>);
}
