import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useListClassrooms, getListClassroomsQueryKey, useListSupplies, getListSuppliesQueryKey, useCreateUsageLog, getListUsageLogsQueryKey, useListRequests, getListRequestsQueryKey, useListClassroomSupplies, getListClassroomSuppliesQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Archive, ClipboardList, Layers, School, Users, PackagePlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
const usageLogSchema = z.object({
    supplyId: z.coerce.number().min(1, "Supply is required"),
    classroomId: z.coerce.number().optional().nullable(),
    quantityUsed: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    usedBy: z.string().min(1, "Name is required"),
    notes: z.string().optional(),
});
function LogUsageDialog({ open, onOpenChange }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const createUsageLog = useCreateUsageLog();
    // If teacher, fetch local classroom supplies. If admin, fetch global supplies.
    const { data: globalSupplies = [] } = useListSupplies({}, {
        query: { queryKey: getListSuppliesQueryKey(), enabled: !!user && user.role === "admin" }
    });
    const { data: classroomSupplies = [] } = useListClassroomSupplies({ classroomId: user?.classroomId || undefined }, { query: { queryKey: getListClassroomSuppliesQueryKey({ classroomId: user?.classroomId || undefined }), enabled: !!user && user.role === "teacher" && !!user.classroomId } });
    const { data: classrooms = [] } = useListClassrooms({
        query: { queryKey: getListClassroomsQueryKey(), enabled: !!user && user.role === "admin" }
    });
    const suppliesList = user?.role === "admin"
        ? (Array.isArray(globalSupplies) ? globalSupplies : [])
        : (Array.isArray(classroomSupplies) ? classroomSupplies.map(cs => ({
            id: cs.supplyId,
            name: cs.supplyName,
            quantity: cs.quantity,
            unit: cs.unit
        })) : []);
    const classroomsList = Array.isArray(classrooms) ? classrooms : [];
    const form = useForm({
        resolver: zodResolver(usageLogSchema),
        defaultValues: {
            supplyId: undefined,
            classroomId: user?.role === "teacher" ? user.classroomId : undefined,
            quantityUsed: 1,
            usedBy: user?.name || "",
            notes: "",
        },
    });
    React.useEffect(() => {
        if (open) {
            form.reset({
                supplyId: undefined,
                classroomId: user?.role === "teacher" ? user.classroomId : undefined,
                quantityUsed: 1,
                usedBy: user?.name || "",
                notes: "",
            });
        }
    }, [open, user]);
    const onSubmit = (values) => {
        const selectedSupply = suppliesList.find((s) => s.id === values.supplyId);
        if (!selectedSupply) {
            form.setError("supplyId", { type: "manual", message: "Invalid supply selected" });
            return;
        }
        if (values.quantityUsed > selectedSupply.quantity) {
            form.setError("quantityUsed", {
                type: "manual",
                message: `Insufficient stock. Max available: ${selectedSupply.quantity} ${selectedSupply.unit}`,
            });
            return;
        }
        createUsageLog.mutate({
            data: {
                supplyId: values.supplyId,
                classroomId: user?.role === "teacher" ? (user.classroomId ?? undefined) : (values.classroomId || undefined),
                quantityUsed: values.quantityUsed,
                usedBy: values.usedBy,
                notes: values.notes || undefined,
            },
        }, {
            onSuccess: () => {
                toast({ title: "Usage logged successfully" });
                queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey({ limit: 10 }) });
                queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey() });
                queryClient.invalidateQueries({ queryKey: getListClassroomSuppliesQueryKey({ classroomId: user?.classroomId || undefined }) });
                onOpenChange(false);
            },
            onError: (err) => {
                toast({ title: "Error", description: err?.message || "Failed to log usage", variant: "destructive" });
            },
        });
    };
    const selectedSupplyId = form.watch("supplyId");
    const selectedSupplyObj = suppliesList.find((s) => s.id === selectedSupplyId);
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Supply Usage</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="supplyId" render={({ field }) => (<FormItem>
                  <FormLabel>Supply Item</FormLabel>
                  <Select onValueChange={(val) => {
                field.onChange(Number(val));
                form.clearErrors("quantityUsed");
            }} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={user?.role === "teacher" ? "Select allocated supply" : "Select a supply"}/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliesList.map((s) => (<SelectItem key={s.id} value={String(s.id)} disabled={s.quantity <= 0}>
                          {s.name} ({s.quantity} {s.unit} available)
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}/>

            <div className="grid grid-cols-2 gap-4">
              {user?.role === "admin" ? (<FormField control={form.control} name="classroomId" render={({ field }) => (<FormItem>
                      <FormLabel>Classroom</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))} value={field.value ? String(field.value) : "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select classroom"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">General / No Classroom</SelectItem>
                          {classroomsList.map((c) => (<SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>) : (<FormItem>
                  <Label>Location</Label>
                  <Input value="My Classroom" disabled className="bg-slate-100 dark:bg-slate-900"/>
                </FormItem>)}

              <FormField control={form.control} name="quantityUsed" render={({ field }) => (<FormItem>
                    <FormLabel>
                      Quantity {selectedSupplyObj ? `(${selectedSupplyObj.unit})` : ""}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <FormField control={form.control} name="usedBy" render={({ field }) => (<FormItem>
                  <FormLabel>Used By</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                  <FormLabel>Notes / Damage Report (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Purpose or damage details..." {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createUsageLog.isPending}>
                {createUsageLog.isPending ? "Logging..." : "Log Usage"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function Dashboard() {
    const [logUsageOpen, setLogUsageOpen] = React.useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    // Queries for stats
    const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
        query: { queryKey: getGetDashboardSummaryQueryKey() }
    });
    const categoryCounts = Array.isArray(summary?.categoryCounts) ? summary.categoryCounts : [];
    const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 }, { query: { queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } });
    const activityItems = Array.isArray(activity) ? activity : [];
    const hasActivityError = activity != null && !Array.isArray(activity);
    // Classroom list for dashboard count
    const { data: classrooms = [] } = useListClassrooms({
        query: { queryKey: getListClassroomsQueryKey(), enabled: isAdmin }
    });
    // Requests list to count approvals/pendings
    const { data: requests = [] } = useListRequests({ classroomId: isAdmin ? undefined : (user?.classroomId ?? undefined) }, { query: { queryKey: getListRequestsQueryKey({ classroomId: isAdmin ? undefined : (user?.classroomId ?? undefined) }) } });
    // Classroom Supplies to show allocated supply count for teachers
    const { data: allocatedSupplies = [] } = useListClassroomSupplies({ classroomId: user?.classroomId || undefined }, { query: { queryKey: getListClassroomSuppliesQueryKey({ classroomId: user?.classroomId || undefined }), enabled: !isAdmin && !!user?.classroomId } });
    const pendingCount = Array.isArray(requests) ? requests.filter(r => r.status === "pending").length : 0;
    const approvedCount = Array.isArray(requests) ? requests.filter(r => r.status === "approved").length : 0;
    // Custom teachers query for Admin Directory card
    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-list"],
        queryFn: async () => {
            const res = await fetch("/api/users/teachers");
            if (!res.ok)
                throw new Error("Failed to fetch teachers");
            return res.json();
        },
        enabled: isAdmin,
    });
    const activeTeachersCount = teachers.filter(t => t.approved).length;
    return (<Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin
            ? "Overview of classroom supplies and teacher usage logs."
            : `Overview of classroom stock and supply requests for ${user?.name || "Teacher"}.`}
            </p>
          </div>
          <div className="flex gap-3">
            {!isAdmin && (<Link href="/requests">
                <Button variant="outline">
                  <PackagePlus className="w-4 h-4 mr-2"/> Request Supplies
                </Button>
              </Link>)}
            <Button onClick={() => setLogUsageOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-2"/> Log Usage / Damage
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {isAdmin ? (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/classrooms" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Classrooms</CardTitle>
                  <School className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classrooms.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Manage classrooms</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/teachers" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTeachersCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">View active teachers</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/stock" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
                  <Archive className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalSupplies || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">View supplies catalog</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/low-stock" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{summary?.lowStockCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">View reorder alerts</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/requests" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <PackagePlus className="h-4 w-4 text-blue-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Review requests</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/requests" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                  <Layers className="h-4 w-4 text-emerald-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">View request history</p>
                </CardContent>
              </Card>
            </Link>
          </div>) : (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href={`/classrooms/${user?.classroomId || 0}`} className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Classroom Stock</CardTitle>
                  <School className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allocatedSupplies.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Allocated supply items</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/requests" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <PackagePlus className="h-4 w-4 text-blue-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/requests" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                  <Layers className="h-4 w-4 text-emerald-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ready for pickup</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/usage" className="block group">
              <Card className="cursor-pointer transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usage Logs</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">View Log</div>
                  <p className="text-xs text-muted-foreground mt-1">Usage history</p>
                </CardContent>
              </Card>
            </Link>
          </div>)}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart/Allocations */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{isAdmin ? "Supplies by Category" : "My Allocated Supplies"}</CardTitle>
              <CardDescription>
                {isAdmin ? "Current inventory count across categories" : "Current stock allocated to your classroom"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {isAdmin ? (isLoadingSummary ? (<div className="h-75 flex items-center justify-center">
                    <Skeleton className="h-62.5 w-full mx-4"/>
                  </div>) : categoryCounts.length > 0 ? (<ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryCounts}>
                      <defs>
                        <linearGradient id="colorCategory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}/>
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, border: "none" }} labelClassName="font-semibold text-xs border-b border-slate-700/50 pb-1 mb-1" itemStyle={{ fontSize: 12, color: "#38bdf8" }}/>
                      <Bar dataKey="count" fill="url(#colorCategory)" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>) : (<div className="h-75 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>)) : (allocatedSupplies.length > 0 ? (<div className="space-y-4 max-h-[300px] overflow-y-auto px-4">
                    {allocatedSupplies.map((s) => (<div key={s.id} className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div>
                          <p className="font-semibold text-sm">{s.supplyName}</p>
                          <span className="text-xs text-muted-foreground">Allocated Item</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-lg">{s.quantity}</span>
                          <span className="text-xs text-muted-foreground ml-1">{s.unit}(s)</span>
                        </div>
                      </div>))}
                  </div>) : (<div className="h-75 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <Archive className="w-10 h-10 text-muted-foreground"/>
                    <div>
                      <p className="font-medium text-foreground">No allocated stock yet</p>
                      <p className="text-sm text-muted-foreground">Submit a request to fetch classroom supplies.</p>
                    </div>
                  </div>))}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest usage and replenishment actions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (<div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-9 w-9 rounded-full"/>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-50"/>
                        <Skeleton className="h-3 w-37.5"/>
                      </div>
                    </div>))}
                </div>) : hasActivityError ? (<div className="text-center py-8 text-destructive text-sm">
                  Unexpected activity response from the API.
                </div>) : activityItems.length > 0 ? (<div className="space-y-6">
                  {activityItems.map((item) => (<div key={item.id} className="flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${item.type === 'restock' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {item.type === 'restock' ? <Archive className="w-4 h-4"/> : <ClipboardList className="w-4 h-4"/>}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {isAdmin ? (<Link href={`/supplies/${item.supplyId}`} className="hover:underline">
                              {item.supplyName}
                            </Link>) : (item.supplyName)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.type === 'usage' ? (<span><span className="font-medium text-foreground">{item.usedBy}</span> logged {item.quantityUsed}</span>) : (<span>Restocked {item.quantityUsed} items</span>)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.usedAt), 'MMM d, h:mm a')}
                      </div>
                    </div>))}
                </div>) : (<div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity logged.
                </div>)}
            </CardContent>
          </Card>
        </div>
      </div>
      <LogUsageDialog open={logUsageOpen} onOpenChange={setLogUsageOpen}/>
    </Layout>);
}
