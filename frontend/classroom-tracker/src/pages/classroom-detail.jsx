import React, { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useGetClassroom, getGetClassroomQueryKey, useListUsageLogs, getListUsageLogsQueryKey, useCreateUsageLog, useListClassroomSupplies, getListClassroomSuppliesQueryKey, useListRequests, getListRequestsQueryKey, useCreateRequest, useApproveRequest, useListSupplies, getListSuppliesQueryKey, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { School, User, Hash, GraduationCap, ChevronLeft, Clock, ClipboardList, PackageMinus, PackagePlus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
const GRADE_COLORS = {
    K: "bg-pink-100 text-pink-700 border-pink-200",
    "1": "bg-purple-100 text-purple-700 border-purple-200",
    "2": "bg-blue-100 text-blue-700 border-blue-200",
    "3": "bg-cyan-100 text-cyan-700 border-cyan-200",
    "4": "bg-teal-100 text-teal-700 border-teal-200",
    "5": "bg-green-100 text-green-700 border-green-200",
    "6": "bg-lime-100 text-lime-700 border-lime-200",
    "7": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "8": "bg-orange-100 text-orange-700 border-orange-200",
    "9": "bg-red-100 text-red-700 border-red-200",
    "10": "bg-rose-100 text-rose-700 border-rose-200",
    "11": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    "12": "bg-violet-100 text-violet-700 border-violet-200",
};
function gradeColor(grade) {
    const key = grade.replace(/[^0-9K]/gi, "").toUpperCase();
    return GRADE_COLORS[key] ?? "bg-muted text-muted-foreground border-border";
}
const usageLogSchema = z.object({
    supplyId: z.coerce.number().min(1, "Supply item is required"),
    quantityUsed: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    usedBy: z.string().min(1, "Name is required"),
    notes: z.string().optional(),
    type: z.enum(["usage", "damaged"]).default("usage"),
});
const requestSchema = z.object({
    supplyId: z.coerce.number().min(1, "Supply item is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
});
export default function ClassroomDetail({ params }) {
    const id = Number(params.id);
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [logUsageOpen, setLogUsageOpen] = useState(false);
    const [selectedSupplyToLog, setSelectedSupplyToLog] = useState(null);
    const [requestOpen, setRequestOpen] = useState(false);
    // Queries
    const { data: classroom, isLoading: loadingClassroom } = useGetClassroom(id, {
        query: { queryKey: getGetClassroomQueryKey(id), enabled: !!id },
    });
    const { data: supplies = [], isLoading: loadingSupplies } = useListClassroomSupplies({ classroomId: id }, { query: { queryKey: getListClassroomSuppliesQueryKey({ classroomId: id }), enabled: !!id } });
    const { data: requests = [], isLoading: loadingRequests } = useListRequests({ classroomId: id }, { query: { queryKey: getListRequestsQueryKey({ classroomId: id }), enabled: !!id } });
    const { data: logs = [], isLoading: loadingLogs } = useListUsageLogs({ classroomId: id }, { query: { queryKey: getListUsageLogsQueryKey({ classroomId: id }), enabled: !!id } });
    const { data: globalSupplies = [] } = useListSupplies({}, {
        query: { queryKey: getListSuppliesQueryKey(), enabled: requestOpen }
    });
    // Mutations
    const createUsageLog = useCreateUsageLog();
    const createRequest = useCreateRequest();
    const approveRequest = useApproveRequest();
    const suppliesItems = Array.isArray(supplies) ? supplies : [];
    const requestsItems = Array.isArray(requests) ? requests : [];
    const logsItems = Array.isArray(logs) ? logs : [];
    const globalSuppliesList = Array.isArray(globalSupplies) ? globalSupplies : [];
    // Forms
    const usageForm = useForm({
        resolver: zodResolver(usageLogSchema),
        defaultValues: {
            supplyId: undefined,
            quantityUsed: 1,
            usedBy: user?.name || "",
            notes: "",
            type: "usage",
        },
    });
    const requestForm = useForm({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            supplyId: undefined,
            quantity: 1,
        },
    });
    React.useEffect(() => {
        if (selectedSupplyToLog) {
            usageForm.reset({
                supplyId: selectedSupplyToLog.supplyId,
                quantityUsed: 1,
                usedBy: user?.name || "",
                notes: "",
                type: "usage",
            });
        }
    }, [selectedSupplyToLog, user]);
    React.useEffect(() => {
        if (requestOpen) {
            requestForm.reset({
                supplyId: undefined,
                quantity: 1,
            });
        }
    }, [requestOpen]);
    const onLogUsageSubmit = (values) => {
        const targetSupply = selectedSupplyToLog || suppliesItems.find(s => s.supplyId === values.supplyId);
        if (!targetSupply)
            return;
        if (values.quantityUsed > targetSupply.quantity) {
            usageForm.setError("quantityUsed", {
                type: "manual",
                message: `Insufficient stock. Max available: ${targetSupply.quantity} ${targetSupply.unit}`,
            });
            return;
        }
        createUsageLog.mutate({
            data: {
                supplyId: targetSupply.supplyId,
                classroomId: id,
                quantityUsed: values.quantityUsed,
                usedBy: values.usedBy,
                notes: values.notes || undefined,
                type: values.type || "usage",
            },
        }, {
            onSuccess: () => {
                invalidateAll();
                toast({ title: "Usage logged successfully" });
                setLogUsageOpen(false);
            },
            onError: (err) => {
                toast({ title: "Error", description: err?.message || "Failed to log usage", variant: "destructive" });
            },
        });
    };
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: getListClassroomSuppliesQueryKey({ classroomId: id }) });
        queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey({ classroomId: id }) });
        queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ classroomId: id }) });
    };
    const onRequestSubmit = async (values) => {
        const selectedSupply = globalSuppliesList.find(s => s.id === values.supplyId);
        if (!selectedSupply)
            return;
        if (user?.role === "admin") {
            // Direct Assignment: Create and immediately approve
            try {
                if (selectedSupply.quantity < values.quantity) {
                    requestForm.setError("quantity", {
                        type: "manual",
                        message: `Insufficient inventory. Global stock: ${selectedSupply.quantity} ${selectedSupply.unit}`,
                    });
                    return;
                }
                const newReq = await createRequest.mutateAsync({
                    data: {
                        supplyId: values.supplyId,
                        requestedQuantity: values.quantity,
                        classroomId: id,
                    }
                });
                await approveRequest.mutateAsync({
                    id: newReq.id,
                    data: {
                        approvedQuantity: values.quantity,
                        remarks: "Assigned directly by Administrator",
                    }
                });
                toast({ title: "Stock assigned successfully", description: `${values.quantity} ${selectedSupply.unit}(s) of ${selectedSupply.name} allocated.` });
                invalidateAll();
                setRequestOpen(false);
            }
            catch (err) {
                toast({ title: "Error allocating stock", description: err?.message || "Failed to assign stock.", variant: "destructive" });
            }
        }
        else {
            // Teacher Request Flow
            createRequest.mutate({
                data: {
                    supplyId: values.supplyId,
                    requestedQuantity: values.quantity,
                }
            }, {
                onSuccess: () => {
                    toast({ title: "Request submitted", description: `Requested ${values.quantity} ${selectedSupply.unit}(s) of ${selectedSupply.name}.` });
                    invalidateAll();
                    setRequestOpen(false);
                },
                onError: (err) => {
                    toast({ title: "Error submitting request", description: err?.message || "Failed to submit request.", variant: "destructive" });
                }
            });
        }
    };
    // Aggregation for Stats Card
    const supplyTotals = React.useMemo(() => {
        if (logsItems.length === 0)
            return [];
        const map = {};
        for (const log of logsItems) {
            if (!map[log.supplyId]) {
                map[log.supplyId] = { supplyId: log.supplyId, supplyName: log.supplyName, total: 0, count: 0 };
            }
            map[log.supplyId].total += log.quantityUsed;
            map[log.supplyId].count += 1;
        }
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [logsItems]);
    const hasLowStock = suppliesItems.some(s => s.quantity <= 3);
    return (<Layout>
      <div className="space-y-6">
        {/* Back button */}
        {user?.role === "admin" && (<Link href="/classrooms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4"/>
            Back to Classrooms
          </Link>)}

        {/* Classroom Header */}
        {loadingClassroom ? (<div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl"/>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-48"/>
              <Skeleton className="h-4 w-64"/>
            </div>
          </div>) : classroom ? (<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <School className="w-8 h-8 text-primary"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-semibold tracking-tight">{classroom.name}</h1>
                  <Badge className={`text-sm font-semibold border ${gradeColor(classroom.grade)}`}>
                    Grade {classroom.grade}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5"/> {classroom.teacher}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5"/> Room {classroom.roomNumber}
                  </span>
                  {classroom.notes && (<span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5"/> {classroom.notes}
                    </span>)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setRequestOpen(true)} className="w-full md:w-auto shadow-md">
                <PackagePlus className="w-4 h-4 mr-2"/>
                {user?.role === "admin" ? "Assign Stock" : "Request Supplies"}
              </Button>
            </div>
          </div>) : (<p className="text-muted-foreground">Classroom not found.</p>)}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="bg-slate-50/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Active Supplies</span>
                <PackageMinus className="w-4 h-4 text-muted-foreground"/>
              </div>
              {loadingSupplies ? (<Skeleton className="h-8 w-16"/>) : (<div className="text-3xl font-bold">{suppliesItems.length}</div>)}
            </CardContent>
          </Card>
          <Card className="bg-slate-50/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Pending Requests</span>
                <Clock className="w-4 h-4 text-muted-foreground"/>
              </div>
              {loadingRequests ? (<Skeleton className="h-8 w-16"/>) : (<div className="text-3xl font-bold text-amber-600">
                  {requestsItems.filter(r => r.status === "pending").length}
                </div>)}
            </CardContent>
          </Card>
          <Card className="bg-slate-50/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Log Entries</span>
                <ClipboardList className="w-4 h-4 text-muted-foreground"/>
              </div>
              {loadingLogs ? (<Skeleton className="h-8 w-16"/>) : (<div className="text-3xl font-bold">{logsItems.length}</div>)}
            </CardContent>
          </Card>
          <Card className="bg-slate-50/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Status Warnings</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground"/>
              </div>
              {loadingSupplies ? (<Skeleton className="h-8 w-16"/>) : (<div className={`text-3xl font-bold ${hasLowStock ? "text-destructive" : "text-emerald-600"}`}>
                  {hasLowStock ? "Low Stock Alert" : "All Good"}
                </div>)}
            </CardContent>
          </Card>
        </div>

        {/* Main Columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Classroom Stock Card */}
          <Card className="lg:col-span-1 shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <School className="w-5 h-5 text-primary"/> Remaining Stock
              </CardTitle>
              <CardDescription>Allocated items currently in this classroom</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSupplies ? (<div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => (<div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32"/>
                      <Skeleton className="h-4 w-48"/>
                    </div>))}
                </div>) : suppliesItems.length > 0 ? (<div className="divide-y divide-border">
                  {suppliesItems.map(item => (<div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-sm text-foreground truncate">{item.supplyName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Allocated Quantity:{" "}
                          <span className={`font-semibold ${item.quantity <= 3 ? "text-destructive font-extrabold" : "text-foreground"}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {item.quantity <= 3 && (<Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold animate-pulse">
                            Low
                          </Badge>)}
                        <Button variant="outline" size="sm" onClick={() => {
                    setSelectedSupplyToLog({
                        supplyId: item.supplyId,
                        supplyName: item.supplyName,
                        quantity: item.quantity,
                        unit: item.unit,
                    });
                    setLogUsageOpen(true);
                }} className="h-7 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-semibold" disabled={item.quantity <= 0}>
                          Log Usage
                        </Button>
                      </div>
                    </div>))}
                </div>) : (<div className="p-8 text-center text-muted-foreground">
                  <PackageMinus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"/>
                  <p className="text-sm font-medium">No stock allocated yet.</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px] mx-auto">
                    {user?.role === "admin" ? "Use 'Assign Stock' to assign items directly." : "Click 'Request Supplies' to submit a request."}
                  </p>
                </div>)}
            </CardContent>
          </Card>

          {/* Right Panels (Tabs for Requests / History) */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid grid-cols-2 max-w-sm mb-4">
                <TabsTrigger value="requests" className="flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4"/> Requests
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4"/> Usage & History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requests">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Supply Requests History</CardTitle>
                    <CardDescription>All requested stock for this classroom and their resolution status</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Requested Date</TableHead>
                          <TableHead>Supply Item</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Approved</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingRequests ? (Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                              <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                              <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                              <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-16 rounded"/></TableCell>
                              <TableCell><Skeleton className="h-4 w-24"/></TableCell>
                            </TableRow>))) : requestsItems.length > 0 ? (requestsItems.map(req => (<TableRow key={req.id}>
                              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                {format(new Date(req.requestedAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">{req.supplyName}</TableCell>
                              <TableCell className="text-sm font-medium">{req.requestedQuantity}</TableCell>
                              <TableCell className="text-sm font-semibold text-primary">
                                {req.status === "approved" ? req.approvedQuantity : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 whitespace-nowrap shadow-none ${req.status === "pending"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : req.status === "approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"}`}>
                                  {req.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate" title={req.remarks || ""}>
                                {req.remarks || "-"}
                              </TableCell>
                            </TableRow>))) : (<TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                              No supply requests made by this classroom yet.
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="md:col-span-1 shadow-sm border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Consumption Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingLogs ? (<div className="space-y-3">
                          {[1, 2, 3].map(i => (<div key={i} className="flex items-center justify-between">
                              <Skeleton className="h-4 w-24"/>
                              <Skeleton className="h-4 w-10"/>
                            </div>))}
                        </div>) : supplyTotals.length > 0 ? (<div className="space-y-3">
                          {supplyTotals.map(s => (<div key={s.supplyId} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground truncate max-w-[120px]">{s.supplyName}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground">{s.count} logs</span>
                                <Badge variant="outline" className="font-mono text-[10px] px-1 bg-rose-50 text-rose-700 border-rose-200 font-extrabold">
                                  -{s.total}
                                </Badge>
                              </div>
                            </div>))}
                        </div>) : (<p className="text-xs text-muted-foreground text-center py-4">No logged usage yet.</p>)}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 shadow-sm border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Usage Records</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Supply</TableHead>
                            <TableHead>By</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingLogs ? (Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                                <TableCell><Skeleton className="h-4 w-24"/></TableCell>
                                <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                                <TableCell><Skeleton className="h-4 w-8"/></TableCell>
                                <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                              </TableRow>))) : logsItems.length > 0 ? (logsItems.map(log => (<TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap text-muted-foreground text-[10px]">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-muted-foreground/75"/>
                                    {format(new Date(log.usedAt), "MMM d, h:mm a")}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-sm">{log.supplyName}</TableCell>
                                <TableCell className="text-xs font-medium">{log.usedBy}</TableCell>
                                <TableCell>
                                  <span className="font-semibold text-xs text-destructive">-{log.quantityUsed}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs max-w-[120px] truncate" title={log.notes || ""}>
                                  {log.notes || "-"}
                                </TableCell>
                              </TableRow>))) : (<TableRow>
                              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                                No usage logged for this classroom.
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Log Usage Dialog */}
      <Dialog open={logUsageOpen} onOpenChange={setLogUsageOpen}>
        <DialogContent className="max-w-md border-border bg-popover shadow-2xl">
          <DialogHeader>
            <DialogTitle>Log Classroom Supply Usage</DialogTitle>
            <DialogDescription>
              Record the usage or reporting of damaged supply stock. Deducted from local classroom stock.
            </DialogDescription>
          </DialogHeader>
          <Form {...usageForm}>
            <form onSubmit={usageForm.handleSubmit(onLogUsageSubmit)} className="space-y-4 pt-2">
              <FormField control={usageForm.control} name="supplyId" render={({ field }) => (<FormItem>
                    <FormLabel>Allocated Supply Item</FormLabel>
                    <Select onValueChange={(val) => {
                field.onChange(Number(val));
                const matched = suppliesItems.find(s => s.supplyId === Number(val));
                if (matched) {
                    setSelectedSupplyToLog({
                        supplyId: matched.supplyId,
                        supplyName: matched.supplyName,
                        quantity: matched.quantity,
                        unit: matched.unit,
                    });
                }
                usageForm.clearErrors("quantityUsed");
            }} value={field.value ? String(field.value) : ""} disabled={!!selectedSupplyToLog}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliesItems.map((s) => (<SelectItem key={s.supplyId} value={String(s.supplyId)} disabled={s.quantity <= 0}>
                            {s.supplyName} ({s.quantity} {s.unit} remaining)
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={usageForm.control} name="type" render={({ field }) => (<FormItem>
                      <FormLabel>Log Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Log Type"/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="usage">Normal Usage</SelectItem>
                          <SelectItem value="damaged">Damaged / Wasted</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>)}/>

                <FormField control={usageForm.control} name="quantityUsed" render={({ field }) => (<FormItem>
                      <FormLabel>
                        Quantity {selectedSupplyToLog ? `(${selectedSupplyToLog.unit})` : ""}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>)}/>
              </div>

              <FormField control={usageForm.control} name="usedBy" render={({ field }) => (<FormItem>
                    <FormLabel>Logged By</FormLabel>
                    <FormControl>
                      <Input placeholder="Teacher name" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={usageForm.control} name="notes" render={({ field }) => (<FormItem>
                    <FormLabel>Usage Notes / Damage Details (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explain usage reasons or damage descriptions..." {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setLogUsageOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUsageLog.isPending}>
                  {createUsageLog.isPending ? "Logging..." : "Log Usage"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Request Supplies / Assign Stock Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md border-border bg-popover shadow-2xl">
          <DialogHeader>
            <DialogTitle>
              {user?.role === "admin" ? "Assign Classroom Stock" : "Request Classroom Supplies"}
            </DialogTitle>
            <DialogDescription>
              {user?.role === "admin"
            ? "Directly allocate stock items from the global inventory to this classroom."
            : "Submit a request to allocation managers for classroom supplies."}
            </DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4 pt-2">
              <FormField control={requestForm.control} name="supplyId" render={({ field }) => (<FormItem>
                    <FormLabel>Supply Item</FormLabel>
                    <Select onValueChange={(val) => {
                field.onChange(Number(val));
                requestForm.clearErrors("quantity");
            }} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select global catalog item"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {globalSuppliesList.map((s) => (<SelectItem key={s.id} value={String(s.id)} disabled={s.quantity <= 0}>
                            {s.name} ({s.quantity} {s.unit} in inventory)
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={requestForm.control} name="quantity" render={({ field }) => (<FormItem>
                    <FormLabel>
                      Quantity{" "}
                      {requestForm.watch("supplyId") &&
                `(${globalSuppliesList.find(s => s.id === requestForm.watch("supplyId"))?.unit || ""})`}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequest.isPending || approveRequest.isPending}>
                  {createRequest.isPending || approveRequest.isPending
            ? user?.role === "admin" ? "Assigning..." : "Submitting..."
            : user?.role === "admin" ? "Assign Stock" : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>);
}
