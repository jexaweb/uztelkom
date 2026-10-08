"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  UserRound,
  KeyRound,
  Power,
  X,
  Loader2,
} from "lucide-react";

type UserRole = "admin" | "operator";

type User = {
  id: number;
  fullName: string;
  login: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  fullName: string;
  login: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};

const emptyForm: FormData = {
  fullName: "",
  login: "",
  password: "",
  role: "operator",
  isActive: true,
};

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // USERLARNI OLISH
  // =========================

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Foydalanuvchilarni olishda xatolik");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Foydalanuvchilarni olishda xatolik",
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // CURRENT USER
  // =========================

  async function loadCurrentUser() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch {
      // AppShell authni tekshiradi
    }
  }

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  // =========================
  // SEARCH
  // =========================

  const filteredUsers = users.filter((user) => {
    const text = search.toLowerCase().trim();

    if (!text) return true;

    return (
      user.fullName.toLowerCase().includes(text) ||
      user.login.toLowerCase().includes(text) ||
      user.role.toLowerCase().includes(text)
    );
  });

  // =========================
  // MODAL OCHISH
  // =========================

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);

    setForm({
      fullName: user.fullName,
      login: user.login,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
  }

  // =========================
  // FORM
  // =========================

  function updateForm<K extends keyof FormData>(
    key: K,
    value: FormData[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // =========================
  // CREATE
  // =========================

  async function createUser() {
    if (!form.fullName.trim()) {
      setError("Ism familiyani kiriting");
      return;
    }

    if (!form.login.trim()) {
      setError("Loginni kiriting");
      return;
    }

    if (!form.password) {
      setError("Parolni kiriting");
      return;
    }

    if (form.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          login: form.login.trim(),
          password: form.password,
          role: form.role,
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Foydalanuvchi yaratilmadi");
      }

      setSuccess("Foydalanuvchi muvaffaqiyatli yaratildi");

      await loadUsers();

      setTimeout(() => {
        setShowModal(false);
        setSuccess("");
        setForm(emptyForm);
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Foydalanuvchi yaratishda xatolik",
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // UPDATE
  // =========================

  async function updateUser() {
    if (!editingUser) return;

    if (!form.fullName.trim()) {
      setError("Ism familiyani kiriting");
      return;
    }

    if (!form.login.trim()) {
      setError("Loginni kiriting");
      return;
    }

    if (form.password && form.password.length < 6) {
      setError("Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        login: form.login.trim(),
        role: form.role,
        isActive: form.isActive,
      };

      if (form.password.trim()) {
        body.password = form.password;
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Foydalanuvchini yangilab bo‘lmadi");
      }

      setSuccess("Foydalanuvchi muvaffaqiyatli yangilandi");

      await loadUsers();

      setTimeout(() => {
        setShowModal(false);
        setSuccess("");
        setEditingUser(null);
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Foydalanuvchini yangilashda xatolik",
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE
  // =========================

  async function deleteUser(user: User) {
    if (currentUser?.id === user.id) {
      setError("O‘zingizni o‘chira olmaysiz");
      return;
    }

    const confirmed = window.confirm(
      `"${user.fullName}" foydalanuvchisini o‘chirishni xohlaysizmi?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Foydalanuvchini o‘chirib bo‘lmadi");
      }

      setSuccess("Foydalanuvchi o‘chirildi");

      await loadUsers();

      setTimeout(() => {
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Foydalanuvchini o‘chirishda xatolik",
      );
    }
  }

  // =========================
  // STATUS O'ZGARTIRISH
  // =========================

  async function toggleUserStatus(user: User) {
    if (currentUser?.id === user.id && user.isActive) {
      setError("O‘zingizni bloklay olmaysiz");
      return;
    }

    try {
      setError("");

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Statusni o‘zgartirib bo‘lmadi");
      }

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Statusni o‘zgartirishda xatolik",
      );
    }
  }

  const isAdmin = currentUser?.role === "admin";

  // =========================
  // UI
  // =========================

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Sozlamalar
              </h1>

              <p className="text-sm text-slate-500">
                Foydalanuvchilar va tizim boshqaruvi
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Yangi foydalanuvchi
          </button>
        )}
      </div>

      {/* ALERTS */}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {/* USER CARD */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* TOOLBAR */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Foydalanuvchilar
            </h2>

            <p className="text-sm text-slate-500">
              Jami: {users.length} ta foydalanuvchi
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki login bo‘yicha qidirish..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                Yuklanmoqda...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center">
              <UserRound
                size={42}
                className="mb-3 text-slate-300"
              />

              <p className="font-semibold text-slate-700">
                Foydalanuvchilar topilmadi
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Qidiruvni o‘zgartiring yoki yangi foydalanuvchi qo‘shing.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Foydalanuvchi
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Login
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Rol
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Holat
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Sana
                  </th>

                  {isAdmin && (
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Amallar
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-slate-400">
                      {index + 1}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {user.fullName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.fullName}
                          </p>

                          {currentUser?.id === user.id && (
                            <span className="text-xs text-blue-600">
                              Siz
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700">
                        {user.login}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">
                          <ShieldCheck size={14} />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                          <UserRound size={14} />
                          OPERATOR
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          Bloklangan
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString(
                        "uz-UZ",
                      )}
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              toggleUserStatus(user)
                            }
                            title={
                              user.isActive
                                ? "Bloklash"
                                : "Faollashtirish"
                            }
                            disabled={
                              currentUser?.id === user.id
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Power size={16} />
                          </button>

                          <button
                            onClick={() =>
                              openEditModal(user)
                            }
                            title="Tahrirlash"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() =>
                              deleteUser(user)
                            }
                            title="O‘chirish"
                            disabled={
                              currentUser?.id === user.id
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingUser
                    ? "Foydalanuvchini tahrirlash"
                    : "Yangi foydalanuvchi"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Foydalanuvchi ma’lumotlarini o‘zgartiring"
                    : "Yangi tizim foydalanuvchisini yarating"}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {/* FULL NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Ism familiya
                </label>

                <input
                  value={form.fullName}
                  onChange={(e) =>
                    updateForm("fullName", e.target.value)
                  }
                  placeholder="Masalan: Ali Valiyev"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* LOGIN */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Login
                </label>

                <input
                  value={form.login}
                  onChange={(e) =>
                    updateForm("login", e.target.value)
                  }
                  placeholder="Masalan: ali_001"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <KeyRound size={16} />
                  {editingUser
                    ? "Yangi parol"
                    : "Parol"}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    updateForm("password", e.target.value)
                  }
                  placeholder={
                    editingUser
                      ? "O‘zgartirmasangiz bo‘sh qoldiring"
                      : "Kamida 6 ta belgi"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* ROLE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Rol
                </label>

                <select
                  value={form.role}
                  onChange={(e) =>
                    updateForm(
                      "role",
                      e.target.value as UserRole,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="operator">
                    Operator — faqat ko‘rish
                  </option>

                  <option value="admin">
                    Admin — to‘liq huquq
                  </option>
                </select>
              </div>

              {/* STATUS */}

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    Foydalanuvchi aktiv
                  </p>

                  <p className="text-xs text-slate-500">
                    Aktiv bo‘lmasa tizimga kira olmaydi
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    updateForm(
                      "isActive",
                      e.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-slate-900"
                />
              </label>
            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Bekor qilish
              </button>

              <button
                onClick={
                  editingUser ? updateUser : createUser
                }
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {editingUser
                  ? "Saqlash"
                  : "Yaratish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}