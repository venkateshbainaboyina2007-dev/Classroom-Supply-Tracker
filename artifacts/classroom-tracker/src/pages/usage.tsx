import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListUsageLogs,
  getListUsageLogsQueryKey,
  useCreateUsageLog,
  useListSupplies,
  getListSuppliesQueryKey,
  useDeleteUsageLog
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const usageSchema = z.object({
  supplyId: z.coerce.number().min(1, "Select a supply"),
  quantityUsed: z.coerce.number().min(0.01, "Must use at least 0.01"),
  usedBy: z.string().min(1, "Name is required"),
  notes: z.string().optional(),
});

function LogUsageDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createUsageLog = useCreateUsageLog();
  
  const { data: supplies = [] } = useListSupplies({
    query: { queryKey: getListSuppliesQueryKey() }
  });
  
  const form = useForm<z.infer<typeof usageSchema>>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      supplyId: 0,
      quantityUsed: 1,
      usedBy: "",
      notes: "",
    },
  });

  const onSubmit = (values: z.infer<typeof usageSchema>) => {
    createUsageLog.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Usage logged", description: "Supply inventory updated." });
        queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSuppliesQueryKey() });
        form.reset();
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to log usage.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Log Usage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Supply Usage</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supply Item</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supply..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {supplies.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.quantity} {s.unit} available)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantityUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Used</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="usedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Used By (Teacher/Staff)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mr. Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Project details, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createUsageLog.isPending}>
                {createUsageLog.isPending ? "Saving..." : "Log Usage"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsageLogs() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteLog = useDeleteUsageLog();

  const { data: logs, isLoading } = useListUsageLogs(
    {},
    { query: { queryKey: getListUsageLogsQueryKey() } }
  );

  const handleDelete = () => {
    if (!logToDelete) return;
    deleteLog.mutate({ id: logToDelete }, {
      onSuccess: () => {
        toast({ title: "Log entry deleted" });
        queryClient.invalidateQueries({ queryKey: getListUsageLogsQueryKey() });
        setDeleteOpen(false);
        setLogToDelete(null);
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    });
  };

  const confirmDelete = (id: number) => {
    setLogToDelete(id);
    setDeleteOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Usage Log</h1>
            <p className="text-muted-foreground mt-1">Track who is using what and how quickly supplies are depleting.</p>
          </div>
          <LogUsageDialog open={createOpen} onOpenChange={setCreateOpen} />
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
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full max-w-[200px]" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(log.usedAt), 'MMM d, yyyy h:mm a')}
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => confirmDelete(log.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No usage logs found.
                    </TableCell>
                  </TableRow>
                )}
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
              Are you sure you want to delete this usage log? This action cannot be undone.
              Note: This will not restore the inventory quantity.
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
    </Layout>
  );
}
