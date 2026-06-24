import React, { useState } from "react";
import { Link } from "wouter";
import { useListUsageLogs, getListUsageLogsQueryKey, useDeleteUsageLog, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
export default function UsageLogs() {
    const { isAdmin } = useAuth();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [logToDelete, setLogToDelete] = useState(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const deleteLog = useDeleteUsageLog();
    const { data: logs, isLoading } = useListUsageLogs({}, { query: { queryKey: getListUsageLogsQueryKey() } });
    const logsItems = Array.isArray(logs) ? logs : [];
    const handleDelete = () => {
        if (!logToDelete)
            return;
        deleteLog.mutate({ id: logToDelete }, {
            onSuccess: () => {
                toast({ title: "Log entry deleted" });
                queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey() });
                setDeleteOpen(false);
                setLogToDelete(null);
            },
            onError: () => {
                toast({ title: "Delete failed", variant: "destructive" });
            },
        });
    };
    const confirmDelete = (id) => {
        setLogToDelete(id);
        setDeleteOpen(true);
    };
    return (<Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usage Log</h1>
          <p className="text-muted-foreground mt-1">
            Full history of supply usage across all classrooms.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Supply</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-full max-w-[200px]"/></TableCell>
                      <TableCell></TableCell>
                    </TableRow>))) : logsItems.length > 0 ? (logsItems.map((log) => (<TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Clock className="w-3.5 h-3.5"/>
                          {format(new Date(log.usedAt), "MMM d, yyyy h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/supplies/${log.supplyId}`} className="hover:underline">
                          {log.supplyName}
                        </Link>
                      </TableCell>
                      <TableCell>{log.usedBy}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-destructive">-{log.quantityUsed}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                        {log.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {isAdmin && (<Button variant="ghost" size="icon" onClick={() => confirmDelete(log.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4"/>
                          </Button>)}
                      </TableCell>
                    </TableRow>))) : (<TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No usage logs found.
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Log Entry?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this log entry? This action cannot be undone and will not restore the inventory quantity.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLog.isPending}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>);
}
