import React, { createContext, useContext } from "react";
import { useGetMe, useLogin, useLogout, useRegisterUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    // Fetch the current logged-in user on mount
    const { data: user, isLoading, error, isFetched } = useGetMe({
        query: {
            queryKey: getGetMeQueryKey(),
            retry: false,
            refetchOnWindowFocus: false,
        }
    });
    const loginMutation = useLogin();
    const logoutMutation = useLogout();
    const registerMutation = useRegisterUser();
    const login = async (data) => {
        const res = await loginMutation.mutateAsync({ data });
        // Update the getMe query data in cache
        queryClient.setQueryData(getGetMeQueryKey(), res);
        // Invalidate everything to refresh components with new data
        await queryClient.invalidateQueries();
        return res;
    };
    const logout = async () => {
        await logoutMutation.mutateAsync();
        // Clear user cache and invalidate all queries
        queryClient.setQueryData(getGetMeQueryKey(), null);
        await queryClient.invalidateQueries();
    };
    const register = async (data) => {
        const res = await registerMutation.mutateAsync({
            data: {
                username: data.username,
                name: data.name,
                password: data.password,
                classroomId: data.classroomId,
            },
        });
        return res;
    };
    const value = {
        user: user || null,
        isLoading: isLoading || (!isFetched && !error),
        login,
        logout,
        register,
        isAdmin: user?.role === "admin",
        isTeacher: user?.role === "teacher",
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
