import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { School, Calendar, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
export default function Teachers() {
    const { isAdmin } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const { data: teachers = [], isLoading } = useQuery({
        queryKey: ["teachers-list"],
        queryFn: async () => {
            const res = await fetch("/api/users/teachers");
            if (!res.ok)
                throw new Error("Failed to fetch teachers");
            return res.json();
        },
    });
    const deleteTeacherMutation = useMutation({
        mutationFn: async (userId) => {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });
            if (!res.ok)
                throw new Error("Failed to delete teacher");
        },
        onSuccess: () => {
            toast({ title: "Teacher deleted", description: "Teacher account was successfully removed." });
            queryClient.invalidateQueries({ queryKey: ["teachers-list"] });
        },
        onError: (err) => {
            toast({ title: "Error deleting teacher", description: err.message || "Failed to delete teacher account.", variant: "destructive" });
        }
    });
    const filteredTeachers = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.username.toLowerCase().includes(search.toLowerCase()) ||
        (t.classroomName && t.classroomName.toLowerCase().includes(search.toLowerCase())));
    return (<Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Teachers Directory</h1>
          <p className="text-muted-foreground mt-1">
            View all approved teachers and their assigned classrooms.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search by name, username, or classroom..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>

        {/* Teachers count */}
        {!isLoading && (<div className="text-sm text-muted-foreground">
            {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? "s" : ""} registered
          </div>)}

        <Card>
          <CardContent className="p-0">
            <Table>
               <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Username / Email</TableHead>
                  <TableHead>Assigned Classroom</TableHead>
                  <TableHead>Date Registered</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-9 w-9 rounded-full"/>
                          <Skeleton className="h-5 w-32"/>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-40"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                      <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                      {isAdmin && <TableCell><Skeleton className="h-8 w-8 ml-auto"/></TableCell>}
                    </TableRow>))) : filteredTeachers.length > 0 ? (filteredTeachers.map((teacher) => (<TableRow key={teacher.id} className="group hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {teacher.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{teacher.name}</p>
                            <span className="text-xs text-muted-foreground">ID: {teacher.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {teacher.username}
                      </TableCell>
                      <TableCell>
                        {teacher.classroomName ? (<Link href={`/classrooms/${teacher.classroomId}`}>
                            <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium cursor-pointer">
                              <School className="w-4 h-4"/>
                              {teacher.classroomName}
                            </span>
                          </Link>) : (<Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 font-medium">
                            No classroom assigned
                          </Badge>)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4"/>
                          {format(new Date(teacher.createdAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      {isAdmin && (<TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer" disabled={deleteTeacherMutation.isPending}>
                                <Trash2 className="w-4.5 h-4.5"/>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Teacher Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete {teacher.name}'s account? This action cannot be undone and will revoke their classroom access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTeacherMutation.mutate(teacher.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>)}
                    </TableRow>))) : (<TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="h-32 text-center text-muted-foreground">
                      No teachers found matching search parameters.
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>);
}
