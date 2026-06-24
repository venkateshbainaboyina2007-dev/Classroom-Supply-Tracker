import React, { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useListRequests, getListRequestsQueryKey, useCreateRequest, useApproveRequest, useRejectRequest, useListSupplies, getListSuppliesQueryKey, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, School } from "lucide-react";
import { format } from "date-fns";
const requestFormSchema = z.object({
    supplyId: z.coerce.number().min(1, "Supply item is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
});
const approveFormSchema = z.object({
    approvedQuantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    remarks: z.string().optional(),
});
const rejectFormSchema = z.object({
    remarks: z.string().min(1, "Remarks/Reason for rejection is required"),
});
export default function Requests() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [approveState, setApproveState] = useState({ open: false });
    const [rejectState, setRejectState] = useState({ open: false });
    const isTeacher = user?.role === "teacher";
    const classroomId = isTeacher ? (user.classroomId ?? undefined) : undefined;
    // Queries
    const { data: requests = [], isLoading: loadingRequests } = useListRequests({ classroomId }, { query: { queryKey: getListRequestsQueryKey({ classroomId }) } });
    const { data: globalSupplies = [] } = useListSupplies({}, {
        query: { queryKey: getListSuppliesQueryKey(), enabled: createOpen || approveState.open }
    });
    // Mutations
    const createRequest = useCreateRequest();
    const approveRequest = useApproveRequest();
    const rejectRequest = useRejectRequest();
    const requestsList = Array.isArray(requests) ? requests : [];
    const globalSuppliesList = Array.isArray(globalSupplies) ? globalSupplies : [];
    // Forms
    const requestForm = useForm({
        resolver: zodResolver(requestFormSchema),
        defaultValues: {
            supplyId: undefined,
            quantity: 1,
        },
    });
    const approveForm = useForm({
        resolver: zodResolver(approveFormSchema),
        defaultValues: {
            approvedQuantity: 1,
            remarks: "",
        },
    });
    const rejectForm = useForm({
        resolver: zodResolver(rejectFormSchema),
        defaultValues: {
            remarks: "",
        },
    });
    React.useEffect(() => {
        if (createOpen) {
            requestForm.reset({
                supplyId: undefined,
                quantity: 1,
            });
        }
    }, [createOpen]);
    React.useEffect(() => {
        if (approveState.open && approveState.request) {
            approveForm.reset({
                approvedQuantity: approveState.request.requestedQuantity,
                remarks: "",
            });
        }
    }, [approveState.open, approveState.request]);
    React.useEffect(() => {
        if (rejectState.open) {
            rejectForm.reset({
                remarks: "",
            });
        }
    }, [rejectState.open]);
    const handleCreateRequest = (values) => {
        const selectedSupply = globalSuppliesList.find(s => s.id === values.supplyId);
        if (!selectedSupply)
            return;
        createRequest.mutate({
            data: {
                supplyId: values.supplyId,
                requestedQuantity: values.quantity,
            },
        }, {
            onSuccess: () => {
                toast({ title: "Request submitted", description: `Requested ${values.quantity} ${selectedSupply.unit}(s) of ${selectedSupply.name}.` });
                queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ classroomId }) });
                setCreateOpen(false);
            },
            onError: (err) => {
                toast({ title: "Error submitting request", description: err?.message || "Failed to submit request.", variant: "destructive" });
            },
        });
    };
    const handleApprove = (values) => {
        const req = approveState.request;
        if (!req)
            return;
        const matchedSupply = globalSuppliesList.find(s => s.id === req.supplyId);
        if (matchedSupply && matchedSupply.quantity < values.approvedQuantity) {
            approveForm.setError("approvedQuantity", {
                type: "manual",
                message: `Quantity exceeds inventory stock (${matchedSupply.quantity} ${matchedSupply.unit} available).`,
            });
            return;
        }
        approveRequest.mutate({
            id: req.id,
            data: {
                approvedQuantity: values.approvedQuantity,
                remarks: values.remarks || undefined,
            },
        }, {
            onSuccess: () => {
                toast({ title: "Request approved" });
                queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
                setApproveState({ open: false });
            },
            onError: (err) => {
                toast({ title: "Error approving request", description: err?.message || "Failed to approve request", variant: "destructive" });
            },
        });
    };
    const handleReject = (values) => {
        const req = rejectState.request;
        if (!req)
            return;
        rejectRequest.mutate({
            id: req.id,
            data: {
                remarks: values.remarks,
            },
        }, {
            onSuccess: () => {
                toast({ title: "Request rejected" });
                queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
                setRejectState({ open: false });
            },
            onError: (err) => {
                toast({ title: "Error rejecting request", description: err?.message || "Failed to reject request", variant: "destructive" });
            },
        });
    };
    const pendingRequests = requestsList.filter(r => r.status === "pending");
    const completedRequests = requestsList.filter(r => r.status !== "pending");
    return (<Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Supply Requests</h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher
            ? "Request classroom materials and view request outcomes."
            : "Review and approve/reject materials requests submitted by classrooms."}
            </p>
          </div>
          {isTeacher && (<Button onClick={() => setCreateOpen(true)} className="shadow-md">
              <Plus className="w-4 h-4 mr-2"/> Request Supplies
            </Button>)}
        </div>

        {/* Admin Pending Requests Area */}
        {!isTeacher && pendingRequests.length > 0 && (<Card className="border-amber-200 bg-amber-50/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/30">
              <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600"/> Pending Action Required
              </CardTitle>
              <CardDescription className="text-amber-800">
                You have {pendingRequests.length} pending supply request{pendingRequests.length > 1 ? "s" : ""} to process.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-amber-50/10">
                  <TableRow>
                    <TableHead className="text-amber-900">Request Date</TableHead>
                    <TableHead className="text-amber-900">Classroom</TableHead>
                    <TableHead className="text-amber-900">Item</TableHead>
                    <TableHead className="text-amber-900">Requested Qty</TableHead>
                    <TableHead className="text-amber-900 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map(req => (<TableRow key={req.id} className="hover:bg-amber-50/30 border-amber-100">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {format(new Date(req.requestedAt), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">
                        <Link href={`/classrooms/${req.classroomId}`} className="hover:underline flex items-center gap-1.5 text-primary">
                          <School className="w-3.5 h-3.5"/>
                          {req.classroomName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">{req.supplyName}</TableCell>
                      <TableCell className="font-bold text-sm text-slate-800">{req.requestedQuantity}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 font-semibold" onClick={() => setApproveState({ open: true, request: req })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 font-semibold" onClick={() => setRejectState({ open: true, request: req })}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>)}

        {/* Requests List */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>{isTeacher ? "My Classroom Requests" : "All Supply Requests"}</CardTitle>
            <CardDescription>
              {isTeacher
            ? "Track allocations, pending statuses, and manager remarks."
            : "Detailed history log of all requests submitted to date."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested Date</TableHead>
                  {!isTeacher && <TableHead>Classroom</TableHead>}
                  <TableHead>Supply Item</TableHead>
                  <TableHead>Requested Qty</TableHead>
                  <TableHead>Approved Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  {!isTeacher && pendingRequests.length === 0 && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRequests ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                      {!isTeacher && <TableCell><Skeleton className="h-4 w-28"/></TableCell>}
                      <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                      <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                      <TableCell><Skeleton className="h-4 w-12"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell><Skeleton className="h-4 w-24"/></TableCell>
                      {!isTeacher && pendingRequests.length === 0 && <TableCell><Skeleton className="h-8 w-20 ml-auto"/></TableCell>}
                    </TableRow>))) : requestsList.length > 0 ? ((isTeacher ? requestsList : completedRequests).map(req => (<TableRow key={req.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(req.requestedAt), "MMM d, yyyy")}
                      </TableCell>
                      {!isTeacher && (<TableCell className="font-semibold text-sm">
                          <Link href={`/classrooms/${req.classroomId}`} className="hover:underline flex items-center gap-1 text-primary">
                            <School className="w-3.5 h-3.5"/>
                            {req.classroomName}
                          </Link>
                        </TableCell>)}
                      <TableCell className="font-semibold text-sm">{req.supplyName}</TableCell>
                      <TableCell className="font-medium text-sm">{req.requestedQuantity}</TableCell>
                      <TableCell className="font-semibold text-sm text-primary">
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
                      <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={req.remarks || ""}>
                        {req.remarks || "-"}
                      </TableCell>
                      {!isTeacher && pendingRequests.length === 0 && (<TableCell className="text-right">
                          {req.status === "pending" ? (<div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs px-2" onClick={() => setApproveState({ open: true, request: req })}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => setRejectState({ open: true, request: req })}>
                                Reject
                              </Button>
                            </div>) : (<span className="text-xs text-muted-foreground">Processed</span>)}
                        </TableCell>)}
                    </TableRow>))) : (<TableRow>
                    <TableCell colSpan={isTeacher ? 6 : 8} className="h-32 text-center text-muted-foreground">
                      No supply requests found.
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Submit Request Dialog (Teacher View) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md border-border bg-popover shadow-2xl">
          <DialogHeader>
            <DialogTitle>Submit Supply Request</DialogTitle>
            <DialogDescription>
              Submit a materials request. Once approved, the stock will be allocated to your classroom.
            </DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(handleCreateRequest)} className="space-y-4 pt-2">
              <FormField control={requestForm.control} name="supplyId" render={({ field }) => (<FormItem>
                    <FormLabel>Catalog Supply Item</FormLabel>
                    <Select onValueChange={(val) => {
                field.onChange(Number(val));
                requestForm.clearErrors("quantity");
            }} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {globalSuppliesList.map((s) => (<SelectItem key={s.id} value={String(s.id)} disabled={s.quantity <= 0}>
                            {s.name} ({s.quantity} {s.unit} in stock)
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={requestForm.control} name="quantity" render={({ field }) => (<FormItem>
                    <FormLabel>
                      Requested Quantity{" "}
                      {requestForm.watch("supplyId") &&
                `(${globalSuppliesList.find(s => s.id === requestForm.watch("supplyId"))?.unit || ""})`}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog (Admin View) */}
      <Dialog open={approveState.open} onOpenChange={(o) => setApproveState(s => ({ ...s, open: o }))}>
        <DialogContent className="max-w-md border-border bg-popover shadow-2xl">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Confirm stock allocation details. You may adjust the approved quantity if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm bg-muted/30 p-3 rounded border space-y-1">
            <p><span className="font-semibold text-muted-foreground">Classroom:</span> {approveState.request?.classroomName}</p>
            <p><span className="font-semibold text-muted-foreground">Supply Item:</span> {approveState.request?.supplyName}</p>
            <p><span className="font-semibold text-muted-foreground">Requested Quantity:</span> {approveState.request?.requestedQuantity}</p>
          </div>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4 pt-2">
              <FormField control={approveForm.control} name="approvedQuantity" render={({ field }) => (<FormItem>
                    <FormLabel>Approved Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={approveForm.control} name="remarks" render={({ field }) => (<FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add instructions or notes..." {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setApproveState({ open: false })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={approveRequest.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {approveRequest.isPending ? "Approving..." : "Approve & Allocate"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog (Admin View) */}
      <Dialog open={rejectState.open} onOpenChange={(o) => setRejectState(s => ({ ...s, open: o }))}>
        <DialogContent className="max-w-md border-border bg-popover shadow-2xl">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Provide a reason/remarks for rejecting this supply request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm bg-muted/30 p-3 rounded border space-y-1">
            <p><span className="font-semibold text-muted-foreground">Classroom:</span> {rejectState.request?.classroomName}</p>
            <p><span className="font-semibold text-muted-foreground">Supply Item:</span> {rejectState.request?.supplyName}</p>
            <p><span className="font-semibold text-muted-foreground">Requested Quantity:</span> {rejectState.request?.requestedQuantity}</p>
          </div>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4 pt-2">
              <FormField control={rejectForm.control} name="remarks" render={({ field }) => (<FormItem>
                    <FormLabel>Reason for Rejection</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explain why the request is rejected..." {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRejectState({ open: false })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={rejectRequest.isPending} variant="destructive">
                  {rejectRequest.isPending ? "Rejecting..." : "Reject Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>);
}
