import React, { useState } from "react";
import { Link } from "wouter";
import { useListClassrooms, getListClassroomsQueryKey, useCreateClassroom, useUpdateClassroom, useDeleteClassroom, } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, School, Pencil, Trash2, GraduationCap, User, Hash, Search, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
const classroomSchema = z.object({
    name: z.string().min(1, "Classroom name is required"),
    grade: z.string().min(1, "Grade is required"),
    teacher: z.string().min(1, "Teacher name is required"),
    roomNumber: z.string().min(1, "Room number is required"),
    notes: z.string().optional(),
    teacherUsername: z.string().min(3, "Username must be at least 3 characters"),
    teacherPassword: z.string().optional().refine(val => !val || val.length >= 6, {
        message: "Password must be at least 6 characters"
    }),
    approved: z.boolean().default(true),
});
const GRADE_COLORS = {
    "K": "bg-pink-100 text-pink-700 border-pink-200",
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
function ClassroomFormDialog({ open, onOpenChange, defaultValues, mode, classroomId, }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const createClassroom = useCreateClassroom();
    const updateClassroom = useUpdateClassroom();
    const form = useForm({
        resolver: zodResolver(classroomSchema),
        defaultValues: {
            name: "",
            grade: "",
            teacher: "",
            roomNumber: "",
            notes: "",
            teacherUsername: "",
            teacherPassword: "",
            approved: true,
            ...defaultValues,
        },
    });
    React.useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                grade: "",
                teacher: "",
                roomNumber: "",
                notes: "",
                teacherUsername: "",
                teacherPassword: "",
                approved: true,
                ...defaultValues,
            });
        }
    }, [open, defaultValues]);
    const onSubmit = (values) => {
        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() });
            queryClient.invalidateQueries({ queryKey: ["teachers-list"] });
        };
        if (mode === "create") {
            if (!values.teacherPassword) {
                form.setError("teacherPassword", { message: "Password is required for new teacher accounts" });
                return;
            }
            createClassroom.mutate({ data: values }, {
                onSuccess: () => {
                    toast({ title: "Classroom added", description: `${values.name} has been created.` });
                    invalidate();
                    onOpenChange(false);
                },
                onError: (err) => toast({ title: "Error", description: err?.message || "Failed to create classroom.", variant: "destructive" }),
            });
        }
        else if (classroomId !== undefined) {
            const updateData = { ...values };
            if (!updateData.teacherPassword) {
                delete updateData.teacherPassword;
            }
            updateClassroom.mutate({ id: classroomId, data: updateData }, {
                onSuccess: () => {
                    toast({ title: "Classroom updated", description: `${values.name} has been saved.` });
                    invalidate();
                    onOpenChange(false);
                },
                onError: (err) => toast({ title: "Error", description: err?.message || "Failed to update classroom.", variant: "destructive" }),
            });
        }
    };
    const isPending = createClassroom.isPending || updateClassroom.isPending;
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Classroom" : "Edit Classroom"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                  <FormLabel>Classroom Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room A, Science Lab" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="grade" render={({ field }) => (<FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 3, K, 10" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
              <FormField control={form.control} name="roomNumber" render={({ field }) => (<FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 101, B-12" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>
            <FormField control={form.control} name="teacher" render={({ field }) => (<FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ms. Johnson" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <div className="border-t border-border/60 my-4 pt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-foreground">
                <User className="w-4 h-4"/> Teacher Account Credentials
              </h4>
              <div className="space-y-4">
                <FormField control={form.control} name="teacherUsername" render={({ field }) => (<FormItem>
                      <FormLabel>Teacher Username</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. msjohnson" {...field}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>)}/>
                <FormField control={form.control} name="teacherPassword" render={({ field }) => (<FormItem>
                      <FormLabel>
                        {mode === "create" ? "Teacher Password" : "Reset Password (Optional)"}
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={mode === "create" ? "Min 6 characters" : "Leave blank to keep current password"} {...field}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>)}/>
                {mode === "edit" && (<FormField control={form.control} name="approved" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel>Account Status</FormLabel>
                          <div className="text-[12px] text-muted-foreground">
                            Enable or disable this teacher's login access
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange}/>
                        </FormControl>
                      </FormItem>)}/>)}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending
            ? mode === "create"
                ? "Adding..."
                : "Saving..."
            : mode === "create"
                ? "Add Classroom"
                : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function Classrooms() {
    const { isAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editState, setEditState] = useState({ open: false });
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const deleteClassroom = useDeleteClassroom();
    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-list"],
        queryFn: async () => {
            const res = await fetch("/api/users/teachers");
            if (!res.ok)
                throw new Error("Failed to fetch teachers");
            return res.json();
        },
    });
    const { data: pendingTeachers = [], refetch: refetchPending } = useQuery({
        queryKey: ["pending-teachers-list"],
        queryFn: async () => {
            const res = await fetch("/api/users/pending");
            if (!res.ok)
                throw new Error("Failed to fetch pending teachers");
            return res.json();
        },
        enabled: isAdmin,
    });
    const approveTeacher = useMutation({
        mutationFn: async (userId) => {
            const res = await fetch(`/api/users/${userId}/approve`, {
                method: "POST",
            });
            if (!res.ok)
                throw new Error("Failed to approve teacher account.");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Teacher Approved", description: "Teacher account has been successfully approved and assigned." });
            queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() });
            queryClient.invalidateQueries({ queryKey: ["teachers-list"] });
            refetchPending();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message || "Failed to approve teacher.", variant: "destructive" });
        }
    });
    const declineTeacher = useMutation({
        mutationFn: async (userId) => {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });
            if (!res.ok)
                throw new Error("Failed to decline registration.");
        },
        onSuccess: () => {
            toast({ title: "Registration Request Declined", description: "Teacher registration has been declined and removed." });
            refetchPending();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message || "Failed to decline registration.", variant: "destructive" });
        }
    });
    const { data: classrooms, isLoading } = useListClassrooms({
        query: { queryKey: getListClassroomsQueryKey() },
    });
    const classroomsItems = Array.isArray(classrooms) ? classrooms : [];
    const filtered = classroomsItems.filter((c) => !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.teacher.toLowerCase().includes(search.toLowerCase()) ||
        c.grade.toLowerCase().includes(search.toLowerCase()) ||
        c.roomNumber.toLowerCase().includes(search.toLowerCase()));
    const handleDelete = (id, name) => {
        deleteClassroom.mutate({ id }, {
            onSuccess: () => {
                toast({ title: "Classroom removed", description: `${name} has been deleted.` });
                queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() });
            },
            onError: () => toast({ title: "Error", description: "Failed to delete classroom.", variant: "destructive" }),
        });
    };
    return (<Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Classrooms</h1>
            <p className="text-muted-foreground mt-1">
              Manage all classrooms and their assigned teachers.
            </p>
          </div>
          {isAdmin && (<Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2"/> Add Classroom
            </Button>)}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search by name, teacher, grade..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>

        {/* Pending Teacher Approval Requests */}
        {isAdmin && pendingTeachers.length > 0 && (<Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/10 backdrop-blur-md shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500 animate-pulse"/>
                <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-400">
                  Pending Teacher Registrations ({pendingTeachers.length})
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The following teachers have registered accounts and are awaiting approval to manage their assigned classroom.
              </p>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registered Date</TableHead>
                      <TableHead>Teacher Name</TableHead>
                      <TableHead>Email / Username</TableHead>
                      <TableHead>Requested Classroom</TableHead>
                      <TableHead className="text-right font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTeachers.map((teacher) => (<TableRow key={teacher.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(teacher.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{teacher.name}</TableCell>
                        <TableCell className="text-sm">{teacher.username}</TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium text-primary">{teacher.classroomName || "N/A"}</span>
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" onClick={() => approveTeacher.mutate(teacher.id)} disabled={approveTeacher.isPending || declineTeacher.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-8 text-xs cursor-pointer">
                            {approveTeacher.isPending ? "Approving..." : "Approve"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => declineTeacher.mutate(teacher.id)} disabled={approveTeacher.isPending || declineTeacher.isPending} className="h-8 text-xs cursor-pointer">
                            {declineTeacher.isPending ? "Declining..." : "Decline"}
                          </Button>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>)}

        {/* Count badge */}
        {!isLoading && (<div className="text-sm text-muted-foreground">
            {filtered.length} classroom{filtered.length !== 1 ? "s" : ""}
          </div>)}

        {/* Cards grid */}
        {isLoading ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (<Card key={i}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-6 w-36"/>
                    <Skeleton className="h-5 w-10 rounded-full"/>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28"/>
                    <Skeleton className="h-4 w-20"/>
                  </div>
                </CardContent>
              </Card>))}
          </div>) : filtered.length > 0 ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((classroom) => (<Card key={classroom.id} className="group hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  {/* Card header — clicking name/icon navigates to detail */}
                  <Link href={`/classrooms/${classroom.id}`} className="block mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <School className="w-5 h-5 text-primary"/>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight group-hover:underline">{classroom.name}</h3>
                          <span className="text-xs text-muted-foreground">Added {new Date(classroom.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge className={`text-xs font-semibold border ${gradeColor(classroom.grade)}`}>
                        Grade {classroom.grade}
                      </Badge>
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3.5 h-3.5 shrink-0"/>
                      <span className="truncate font-medium text-foreground">{classroom.teacher}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-3.5 h-3.5 shrink-0"/>
                      <span>Room {classroom.roomNumber}</span>
                    </div>
                    {classroom.notes && (<div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
                        <span className="line-clamp-2">{classroom.notes}</span>
                      </div>)}
                  </div>

                  {/* Actions */}
                  {isAdmin && (<div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                        const matchedTeacher = teachers.find((t) => t.classroomId === classroom.id);
                        setEditState({
                            open: true,
                            id: classroom.id,
                            defaults: {
                                name: classroom.name,
                                grade: classroom.grade,
                                teacher: classroom.teacher,
                                roomNumber: classroom.roomNumber,
                                notes: classroom.notes ?? "",
                                teacherUsername: matchedTeacher?.username ?? "",
                                teacherPassword: "",
                                approved: matchedTeacher?.approved ?? true,
                            },
                        });
                    }}>
                        <Pencil className="w-3.5 h-3.5 mr-1"/> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5 mr-1"/> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {classroom.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this classroom. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(classroom.id, classroom.name)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>)}
                </CardContent>
              </Card>))}
          </div>) : (<Card>
            <CardContent className="h-48 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <School className="w-7 h-7 text-muted-foreground"/>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {search ? "No classrooms match your search" : "No classrooms yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search ? "Try a different search term." : "Click \"Add Classroom\" to get started."}
                </p>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Create dialog */}
      <ClassroomFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create"/>

      {/* Edit dialog */}
      <ClassroomFormDialog open={editState.open} onOpenChange={(o) => setEditState((s) => ({ ...s, open: o }))} mode="edit" classroomId={editState.id} defaultValues={editState.defaults}/>
    </Layout>);
}
