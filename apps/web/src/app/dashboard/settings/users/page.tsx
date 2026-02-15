'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MoreHorizontal,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { addToast } from '../../../../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../../../lib/utils';

/* ─── Types ─── */

type UserRole = 'agent' | 'managing_broker' | 'principal_broker' | 'owner';

interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'active' | 'invited' | 'deactivated';
  lastLogin: string | null;
  createdAt: string;
}

interface UsersResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
}

const ROLE_LABELS: Record<UserRole, string> = {
  agent: 'Agent',
  managing_broker: 'Managing Broker',
  principal_broker: 'Principal Broker',
  owner: 'Owner',
};

const ROLE_COLORS: Record<UserRole, string> = {
  agent: 'bg-blue-50 text-blue-700',
  managing_broker: 'bg-purple-50 text-purple-700',
  principal_broker: 'bg-amber-50 text-amber-700',
  owner: 'bg-emerald-50 text-emerald-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  invited: 'bg-yellow-50 text-yellow-700',
  deactivated: 'bg-gray-100 text-gray-500',
};

/* ─── Invite Schema ─── */

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['agent', 'managing_broker', 'principal_broker']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

/* ─── Page Component ─── */

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ManagedUser | null>(null);
  const [roleDropdownUser, setRoleDropdownUser] = useState<string | null>(null);
  const pageSize = 10;

  const {
    data,
    isLoading,
    error,
  } = useQuery<UsersResponse>({
    queryKey: ['managed-users', page, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      return api<UsersResponse>(`/users?${params.toString()}`);
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  /* ─── Invite Mutation ─── */

  const inviteMutation = useMutation({
    mutationFn: (formData: InviteFormData) =>
      api('/users/invite', {
        method: 'POST',
        body: JSON.stringify(formData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      setInviteModalOpen(false);
      addToast({ type: 'success', title: 'Invitation sent successfully.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to send invitation', message: err.message });
    },
  });

  /* ─── Role Change Mutation ─── */

  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      setRoleDropdownUser(null);
      addToast({ type: 'success', title: 'User role updated.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to change role', message: err.message });
    },
  });

  /* ─── Delete Mutation ─── */

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      api(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      setDeleteConfirm(null);
      addToast({ type: 'success', title: 'User removed.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to remove user', message: err.message });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#1B3A5C]" />
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            {data && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {data.total} users
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search users..."
                className="w-56 rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
              />
            </div>
            {/* Invite button */}
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading users...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card text-center py-8">
          <p className="text-sm text-red-600">Failed to load users.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['managed-users'] })}
            className="btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* User Table */}
      {data && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#1B3A5C]/10 flex items-center justify-center text-xs font-semibold text-[#1B3A5C]">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setRoleDropdownUser(
                                roleDropdownUser === user.id ? null : user.id,
                              )
                            }
                            disabled={user.role === 'owner'}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                              ROLE_COLORS[user.role],
                              user.role !== 'owner' && 'cursor-pointer hover:opacity-80',
                            )}
                          >
                            {ROLE_LABELS[user.role]}
                            {user.role !== 'owner' && (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {roleDropdownUser === user.id && user.role !== 'owner' && (
                            <div className="absolute z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                              {(
                                Object.entries(ROLE_LABELS) as [UserRole, string][]
                              )
                                .filter(([r]) => r !== 'owner' && r !== user.role)
                                .map(([role, label]) => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() =>
                                      roleChangeMutation.mutate({
                                        userId: user.id,
                                        role,
                                      })
                                    }
                                    disabled={roleChangeMutation.isPending}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                                  >
                                    {label}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                            STATUS_COLORS[user.status] ?? 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {user.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {data.users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        {searchQuery
                          ? 'No users match your search.'
                          : 'No users found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, data.total)} of {data.total} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          onSubmit={(data) => inviteMutation.mutate(data)}
          isPending={inviteMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          user={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

/* ─── Invite Modal ─── */

function InviteModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: InviteFormData) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'agent',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#1B3A5C]" />
            <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="inviteEmail"
              type="email"
              {...register('email')}
              placeholder="user@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inviteFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="inviteFirstName"
                type="text"
                {...register('firstName')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="inviteLastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="inviteLastName"
                type="text"
                {...register('lastName')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="inviteRole"
              {...register('role')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            >
              <option value="agent">Agent</option>
              <option value="managing_broker">Managing Broker</option>
              <option value="principal_broker">Principal Broker</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteConfirmModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Remove User</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to remove{' '}
          <span className="font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </span>{' '}
          ({user.email}) from your brokerage? Their data will be preserved but they will
          lose access immediately.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Remove User
          </button>
        </div>
      </div>
    </div>
  );
}
