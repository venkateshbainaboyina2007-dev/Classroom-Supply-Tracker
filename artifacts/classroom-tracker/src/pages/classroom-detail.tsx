import React from "react";
import { Link } from "wouter";
import {
  useGetClassroom,
  getGetClassroomQueryKey,
  useListUsageLogs,
  getListUsageLogsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  School,
  User,
  Hash,
  GraduationCap,
  ChevronLeft,
  Clock,
  ClipboardList,
  PackageMinus,
} from "lucide-react";
import { format } from "date-fns";

const GRADE_COLORS: Record<string, string> = {
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

function gradeColor(grade: string) {
  const key = grade.replace(/[^0-9K]/gi, "").toUpperCase();
  return GRADE_COLORS[key] ?? "bg-muted text-muted-foreground border-border";
}

interface Props {
  params: { id: string };
}

export default function ClassroomDetail({ params }: Props) {
  const id = Number(params.id);

  const { data: classroom, isLoading: loadingClassroom } = useGetClassroom(id, {
    query: { queryKey: getGetClassroomQueryKey(id), enabled: !!id },
  });

  const { data: logs, isLoading: loadingLogs } = useListUsageLogs(
    { classroomId: id },
    { query: { queryKey: getListUsageLogsQueryKey({ classroomId: id }), enabled: !!id } }
  );

  // Aggregate: total uses per supply
  const supplyTotals = React.useMemo(() => {
    if (!logs) return [];
    const map: Record<number, { supplyId: number; supplyName: string; total: number; count: number }> = {};
    for (const log of logs) {
      if (!map[log.supplyId]) {
        map[log.supplyId] = { supplyId: log.supplyId, supplyName: log.supplyName, total: 0, count: 0 };
      }
      map[log.supplyId].total += log.quantityUsed;
      map[log.supplyId].count += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [logs]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back button */}
        <Link href="/classrooms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Classrooms
        </Link>

        {/* Classroom header */}
        {loadingClassroom ? (
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        ) : classroom ? (
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <School className="w-8 h-8 text-primary" />
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
                  <User className="w-3.5 h-3.5" /> {classroom.teacher}
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Room {classroom.roomNumber}
                </span>
                {classroom.notes && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> {classroom.notes}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Classroom not found.</p>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Log Entries</span>
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
              </div>
              {loadingLogs ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{logs?.length ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Unique Supplies Used</span>
                <PackageMinus className="w-4 h-4 text-muted-foreground" />
              </div>
              {loadingLogs ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{supplyTotals.length}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Most Used Item</span>
                <School className="w-4 h-4 text-muted-foreground" />
              </div>
              {loadingLogs ? (
                <Skeleton className="h-8 w-32" />
              ) : supplyTotals[0] ? (
                <div className="text-lg font-bold truncate">{supplyTotals[0].supplyName}</div>
              ) : (
                <div className="text-muted-foreground text-sm">No usage yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Supply breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Supplies Used</CardTitle>
              <CardDescription>Total quantities consumed by this classroom</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : supplyTotals.length > 0 ? (
                <div className="space-y-3">
                  {supplyTotals.map((s) => (
                    <div key={s.supplyId} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/supplies/${s.supplyId}`}
                        className="text-foreground hover:underline font-medium truncate max-w-[160px]"
                      >
                        {s.supplyName}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{s.count}x</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          -{s.total}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No supplies used yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Full usage log */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Usage History</CardTitle>
              <CardDescription>All supply usage events for this classroom</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supply</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : logs && logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.usedAt), "MMM d, h:mm a")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/supplies/${log.supplyId}`} className="hover:underline">
                            {log.supplyName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{log.usedBy}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-destructive">-{log.quantityUsed}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">
                          {log.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                        No usage recorded for this classroom yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
