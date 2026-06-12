import React, { useState } from "react";
import {
  useListClassrooms,
  getListClassroomsQueryKey,
  useCreateClassroom,
  useUpdateClassroom,
  useDeleteClassroom,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, School, Pencil, Trash2, GraduationCap, User, Hash, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const classroomSchema = z.object({
  name: z.string().min(1, "Classroom name is required"),
  grade: z.string().min(1, "Grade is required"),
  teacher: z.string().min(1, "Teacher name is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  notes: z.string().optional(),
});

type ClassroomFormValues = z.infer<typeof classroomSchema>;

const GRADE_COLORS: Record<string, string> = {
  "K":    "bg-pink-100 text-pink-700 border-pink-200",
  "1":    "bg-purple-100 text-purple-700 border-purple-200",
  "2":    "bg-blue-100 text-blue-700 border-blue-200",
  "3":    "bg-cyan-100 text-cyan-700 border-cyan-200",
  "4":    "bg-teal-100 text-teal-700 border-teal-200",
  "5":    "bg-green-100 text-green-700 border-green-200",
  "6":    "bg-lime-100 text-lime-700 border-lime-200",
  "7":    "bg-yellow-100 text-yellow-700 border-yellow-200",
  "8":    "bg-orange-100 text-orange-700 border-orange-200",
  "9":    "bg-red-100 text-red-700 border-red-200",
  "10":   "bg-rose-100 text-rose-700 border-rose-200",
  "11":   "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "12":   "bg-violet-100 text-violet-700 border-violet-200",
};

function gradeColor(grade: string) {
  const key = grade.replace(/[^0-9K]/gi, "").toUpperCase();
  return GRADE_COLORS[key] ?? "bg-muted text-muted-foreground border-border";
}

function ClassroomFormDialog({
  open,
  onOpenChange,
  defaultValues,
  mode,
  classroomId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultValues?: Partial<ClassroomFormValues>;
  mode: "create" | "edit";
  classroomId?: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();

  const form = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: "",
      grade: "",
      teacher: "",
      roomNumber: "",
      notes: "",
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (open) form.reset({ name: "", grade: "", teacher: "", roomNumber: "", notes: "", ...defaultValues });
  }, [open]);

  const onSubmit = (values: ClassroomFormValues) => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() });

    if (mode === "create") {
      createClassroom.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast({ title: "Classroom added", description: `${values.name} has been created.` });
            invalidate();
            onOpenChange(false);
          },
          onError: () =>
            toast({ title: "Error", description: "Failed to create classroom.", variant: "destructive" }),
        }
      );
    } else if (classroomId !== undefined) {
      updateClassroom.mutate(
        { id: classroomId, data: values },
        {
          onSuccess: () => {
            toast({ title: "Classroom updated", description: `${values.name} has been saved.` });
            invalidate();
            onOpenChange(false);
          },
          onError: () =>
            toast({ title: "Error", description: "Failed to update classroom.", variant: "destructive" }),
        }
      );
    }
  };

  const isPending = createClassroom.isPending || updateClassroom.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Classroom" : "Edit Classroom"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classroom Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Room A, Science Lab" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 3, K, 10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 101, B-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="teacher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ms. Johnson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    </Dialog>
  );
}

export default function Classrooms() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editState, setEditState] = useState<{ open: boolean; id?: number; defaults?: Partial<ClassroomFormValues> }>({ open: false });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteClassroom = useDeleteClassroom();

  const { data: classrooms, isLoading } = useListClassrooms({
    query: { queryKey: getListClassroomsQueryKey() },
  });

  const filtered = classrooms?.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher.toLowerCase().includes(search.toLowerCase()) ||
      c.grade.toLowerCase().includes(search.toLowerCase()) ||
      c.roomNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, name: string) => {
    deleteClassroom.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Classroom removed", description: `${name} has been deleted.` });
          queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() });
        },
        onError: () =>
          toast({ title: "Error", description: "Failed to delete classroom.", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Classrooms</h1>
            <p className="text-muted-foreground mt-1">
              Manage all classrooms and their assigned teachers.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Classroom
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, teacher, grade..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Count badge */}
        {!isLoading && (
          <div className="text-sm text-muted-foreground">
            {filtered?.length ?? 0} classroom{(filtered?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        )}

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((classroom) => (
              <Card
                key={classroom.id}
                className="group hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">{classroom.name}</h3>
                        <span className="text-xs text-muted-foreground">Added {new Date(classroom.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={`text-xs font-semibold border ${gradeColor(classroom.grade)}`}>
                      Grade {classroom.grade}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-medium text-foreground">{classroom.teacher}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span>Room {classroom.roomNumber}</span>
                    </div>
                    {classroom.notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{classroom.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        setEditState({
                          open: true,
                          id: classroom.id,
                          defaults: {
                            name: classroom.name,
                            grade: classroom.grade,
                            teacher: classroom.teacher,
                            roomNumber: classroom.roomNumber,
                            notes: classroom.notes ?? "",
                          },
                        })
                      }
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
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
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(classroom.id, classroom.name)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="h-48 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <School className="w-7 h-7 text-muted-foreground" />
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
          </Card>
        )}
      </div>

      {/* Create dialog */}
      <ClassroomFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      {/* Edit dialog */}
      <ClassroomFormDialog
        open={editState.open}
        onOpenChange={(o) => setEditState((s) => ({ ...s, open: o }))}
        mode="edit"
        classroomId={editState.id}
        defaultValues={editState.defaults}
      />
    </Layout>
  );
}
