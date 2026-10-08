
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import {
  DataTable,
  type Column,
} from "@/components/DataTable";

import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Pagination,
  Select,
} from "@/components/ui";

import { useToast } from "@/components/Toast";
import { useDebounced } from "@/lib/hooks";
import {
  formatDate,
  formatNumber,
} from "@/lib/format";

/* ============================================================
   TYPES
============================================================ */

type DealerRow = {
  id: number;
  region: string;
  name: string;
  company: string;
  login: string;
  phone: string;
  code: string;
  type: string;
  isActive: boolean;
  createdAt: string;
};

type DealerStats = {
  smsCount?: number;
  insuranceCount?: number;
  customerCount?: number;
  salesTotal?: number;
};

type DealerView = DealerRow & {
  stats?: DealerStats;
};

/* ============================================================
   LABELS
============================================================ */

const TYPE_LABELS: Record<string, string> = {
  "": "Barchasi",
  sms: "SMS",
  insurance: "SUG'URTA",
};

const STATUS_LABELS: Record<string, string> = {
  "": "Barchasi",
  active: "Faol",
  inactive: "Faol emas",
};

/* ============================================================
   PAGE
============================================================ */

function DealersPageInner() {
  const toast = useToast();
  const searchParams = useSearchParams();

  const highlight = searchParams.get("highlight");

  /* ----------------------------------------------------------
     TABLE
  ---------------------------------------------------------- */

  const [rows, setRows] = useState<DealerRow[]>([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);

  const pageSize = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null,
  );

  /* ----------------------------------------------------------
     FILTERS
  ---------------------------------------------------------- */

  const [q, setQ] = useState("");

  const debouncedQ = useDebounced(q);

  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");

  const [regions, setRegions] = useState<string[]>(
    [],
  );

  /* ----------------------------------------------------------
     MODALS
  ---------------------------------------------------------- */

  const [formOpen, setFormOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<DealerRow | null>(null);

  const [viewing, setViewing] =
    useState<DealerView | null>(null);

  const [saving, setSaving] = useState(false);

  /* ----------------------------------------------------------
     FORM
  ---------------------------------------------------------- */

  const [fRegion, setFRegion] = useState("");
  const [fName, setFName] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fLogin, setFLogin] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fCode, setFCode] = useState("");

  const [fType, setFType] =
    useState<"sms" | "insurance">("sms");

  const [fActive, setFActive] = useState(true);

  /* ==========================================================
     RESET PAGE WHEN FILTER CHANGES
  ========================================================== */

  useEffect(() => {
    setPage(1);
  }, [
    debouncedQ,
    type,
    status,
    region,
  ]);

  /* ==========================================================
     LOAD DEALERS
  ========================================================== */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (debouncedQ) {
        params.set("q", debouncedQ);
      }

      if (type) {
        params.set("type", type);
      }

      if (status) {
        params.set("status", status);
      }

      if (region) {
        params.set("region", region);
      }

      const res = await fetch(
        `/api/dealers?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Dilerlarni yuklashda xatolik.",
        );
      }

      setRows(data.rows ?? []);
      setTotal(Number(data.total ?? 0));
      setRegions(data.regions ?? []);
    } catch (error) {
      console.error(
        "DEALERS LOAD ERROR:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Dilerlarni yuklab bo'lmadi.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedQ,
    type,
    status,
    region,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  /* ==========================================================
     OPEN CREATE
  ========================================================== */

  const openCreate = () => {
    setEditing(null);

    setFRegion("");
    setFName("");
    setFCompany("");
    setFLogin("");
    setFPhone("");
    setFCode("");
    setFType("sms");
    setFActive(true);

    setFormOpen(true);
  };

  /* ==========================================================
     OPEN EDIT
  ========================================================== */

  const openEdit = (row: DealerRow) => {
    setEditing(row);

    setFRegion(row.region || "");
    setFName(row.name || "");
    setFCompany(row.company || "");
    setFLogin(row.login || "");
    setFPhone(row.phone || "");
    setFCode(row.code || "");

    setFType(
      row.type === "insurance"
        ? "insurance"
        : "sms",
    );

    setFActive(row.isActive);

    setFormOpen(true);
  };

  /* ==========================================================
     SAVE DEALER
  ========================================================== */

  const saveDealer = async () => {
    const name = fName.trim();
    const login = fLogin.trim();

    if (!name) {
      toast.error(
        "❌ Diler nomini kiriting.",
      );
      return;
    }

    if (!login) {
      toast.error(
        "❌ Loginni kiriting.",
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        region: fRegion.trim(),
        name,
        company: fCompany.trim(),
        login,
        phone: fPhone.trim(),
        code: fCode.trim(),
        type: fType,
        isActive: fActive,
      };

      const url = editing
        ? `/api/dealers/${editing.id}`
        : "/api/dealers";

      const method = editing
        ? "PATCH"
        : "POST";

      console.log(
        "DEALER REQUEST:",
        {
          url,
          method,
          payload,
        },
      );

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data =
        await res.json().catch(
          () => ({}),
        );

      console.log(
        "DEALER RESPONSE:",
        {
          status: res.status,
          data,
        },
      );

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `Server xatosi: ${res.status}`,
        );
      }

      toast.success(
        editing
          ? "✅ Diler yangilandi."
          : "✅ Diler muvaffaqiyatli qo'shildi.",
      );

      setFormOpen(false);

      setEditing(null);

      await load();
    } catch (error) {
      console.error(
        "SAVE DEALER ERROR:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "❌ Diler saqlanmadi.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     VIEW DEALER
  ========================================================== */

  const openView = async (
    row: DealerRow,
  ) => {
    setViewing(row);
    setViewOpen(true);

    try {
      const res = await fetch(
        `/api/dealers/${row.id}`,
        {
          cache: "no-store",
        },
      );

      const data =
        await res.json().catch(
          () => ({}),
        );

      if (
        res.ok &&
        data.dealer
      ) {
        setViewing({
          ...data.dealer,
          stats: data.stats,
        });
      }
    } catch (error) {
      console.error(
        "VIEW DEALER ERROR:",
        error,
      );
    }
  };

  /* ==========================================================
     TOGGLE ACTIVE
  ========================================================== */

  const toggleActive = async () => {
    if (!viewing) {
      return;
    }

    setSaving(true);

    try {
      if (viewing.isActive) {
        const res = await fetch(
          `/api/dealers/${viewing.id}`,
          {
            method: "DELETE",
          },
        );

        const data =
          await res.json().catch(
            () => ({}),
          );

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Dilerni faolsizlantirib bo'lmadi.",
          );
        }

        toast.success(
          "✅ Diler faolsizlantirildi.",
        );
      } else {
        const res = await fetch(
          `/api/dealers/${viewing.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              isActive: true,
            }),
          },
        );

        const data =
          await res.json().catch(
            () => ({}),
          );

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Dilerni faollashtirib bo'lmadi.",
          );
        }

        toast.success(
          "✅ Diler faollashtirildi.",
        );
      }

      setConfirmOpen(false);
      setViewOpen(false);

      await load();
    } catch (error) {
      console.error(
        "TOGGLE DEALER ERROR:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "❌ Amal bajarilmadi.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     COLUMNS
  ========================================================== */

  const columns: Column<DealerRow>[] = [
    {
      key: "idx",
      label: "#",
      render: (_, i) => (
        <span className="text-slate-400">
          {(page - 1) *
            pageSize +
            i +
            1}
        </span>
      ),
    },

    {
      key: "name",
      label: "Diler",
      render: (r) => (
        <span
          className={
            r.id === Number(highlight)
              ? "font-bold text-blue-700"
              : "font-medium text-slate-900"
          }
        >
          {r.name}
        </span>
      ),
    },

    {
      key: "region",
      label: "Hudud",
      render: (r) =>
        r.region || "—",
    },

    {
      key: "company",
      label: "Kompaniya",
      render: (r) =>
        r.company || "—",
    },

    {
      key: "login",
      label: "Login",
      render: (r) => (
        <span className="font-mono text-xs text-slate-600">
          {r.login}
        </span>
      ),
    },

    {
      key: "phone",
      label: "Telefon",
      render: (r) =>
        r.phone || "—",
    },

    {
      key: "code",
      label: "Kod",
      render: (r) =>
        r.code || "—",
    },

    {
      key: "type",
      label: "Turi",
      render: (r) =>
        r.type === "insurance" ? (
          <Badge tone="green">
            SUG'URTA
          </Badge>
        ) : (
          <Badge tone="blue">
            SMS
          </Badge>
        ),
    },

    {
      key: "isActive",
      label: "Holat",
      render: (r) =>
        r.isActive ? (
          <Badge tone="green">
            Faol
          </Badge>
        ) : (
          <Badge tone="slate">
            Faol emas
          </Badge>
        ),
    },

    {
      key: "actions",
      label: "Amallar",
      render: (r) => (
        <div className="flex flex-wrap gap-1">

          <Button
            variant="ghost"
            onClick={() =>
              openView(r)
            }
          >
            Ko'rish
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              openEdit(r)
            }
          >
            Tahrirlash
          </Button>

          {r.isActive ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                setViewing(r);
                setConfirmOpen(true);
              }}
            >
              Faolsizlantirish
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-emerald-600 hover:bg-emerald-50"
              onClick={async () => {
                try {
                  const res =
                    await fetch(
                      `/api/dealers/${r.id}`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                        body: JSON.stringify(
                          {
                            isActive:
                              true,
                          },
                        ),
                      },
                    );

                  const data =
                    await res
                      .json()
                      .catch(
                        () => ({}),
                      );

                  if (!res.ok) {
                    throw new Error(
                      data?.error ||
                        "Amal bajarilmadi.",
                    );
                  }

                  toast.success(
                    "✅ Diler faollashtirildi.",
                  );

                  await load();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "❌ Amal bajarilmadi.",
                  );
                }
              }}
            >
              Faollashtirish
            </Button>
          )}

        </div>
      ),
    },
  ];

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-full">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <PageHeader
        title="👥 Dilerlar"
        description="Master Dealer Database — barcha dilerlar bazasi."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            + Yangi diler
          </button>
        }
      />

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <Card bodyClassName="p-4">

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <Input
            type="search"
            placeholder="🔎 Diler, login, telefon..."
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
          />

          <Select
            value={type}
            onChange={(e) =>
              setType(e.target.value)
            }
          >
            {Object.entries(
              TYPE_LABELS,
            ).map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </Select>

          <Select
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value,
              )
            }
          >
            {Object.entries(
              STATUS_LABELS,
            ).map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </Select>

          <Select
            value={region}
            onChange={(e) =>
              setRegion(
                e.target.value,
              )
            }
          >
            <option value="">
              Barcha hududlar
            </option>

            {regions.map(
              (r) => (
                <option
                  key={r}
                  value={r}
                >
                  {r}
                </option>
              ),
            )}
          </Select>

          <Button
            variant="secondary"
            onClick={() => {
              setQ("");
              setType("");
              setStatus("");
              setRegion("");
            }}
          >
            Tozalash
          </Button>

        </div>

      </Card>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="mt-4">

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={
            q ||
            type ||
            status ||
            region
              ? "🔎 Qidiruv bo'yicha ma'lumot topilmadi."
              : "Ma'lumot topilmadi."
          }
          footer={
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPage={setPage}
            />
          }
        />

      </div>

      {/* ======================================================
          CREATE / EDIT DEALER MODAL
          CUSTOM MODAL — UI COMPONENTGA BOG'LIQ EMAS
      ====================================================== */}

      {formOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              if (!saving) {
                setFormOpen(
                  false,
                );
              }
            }
          }}
        >

          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editing
                    ? "Dilerni tahrirlash"
                    : "Yangi diler qo'shish"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Diler ma'lumotlarini
                  kiriting
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setFormOpen(
                    false,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">

              <div className="grid gap-5 sm:grid-cols-2">

                {/* REGION */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Hudud
                  </label>

                  <input
                    value={fRegion}
                    onChange={(e) =>
                      setFRegion(
                        e.target.value,
                      )
                    }
                    placeholder="Farg'ona"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* NAME */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Diler nomi{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    value={fName}
                    onChange={(e) =>
                      setFName(
                        e.target.value,
                      )
                    }
                    placeholder="Diler nomi"
                    autoFocus
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* COMPANY */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Kompaniya
                  </label>

                  <input
                    value={fCompany}
                    onChange={(e) =>
                      setFCompany(
                        e.target.value,
                      )
                    }
                    placeholder="UZTELECOM"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* LOGIN */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Login{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    value={fLogin}
                    onChange={(e) =>
                      setFLogin(
                        e.target.value,
                      )
                    }
                    placeholder="dealer001"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PHONE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Telefon
                  </label>

                  <input
                    value={fPhone}
                    onChange={(e) =>
                      setFPhone(
                        e.target.value,
                      )
                    }
                    placeholder="+998 90 123 45 67"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* CODE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Kod
                  </label>

                  <input
                    value={fCode}
                    onChange={(e) =>
                      setFCode(
                        e.target.value,
                      )
                    }
                    placeholder="001"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* TYPE */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Diler turi{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    {/* SMS */}

                    <button
                      type="button"
                      onClick={() =>
                        setFType(
                          "sms",
                        )
                      }
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        fType ===
                        "sms"
                          ? "border-blue-600 bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">

                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            fType ===
                            "sms"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100"
                          }`}
                        >
                          📱
                        </div>

                        <div>
                          <div className="font-bold text-slate-900">
                            SMS
                          </div>

                          <div className="text-xs text-slate-500">
                            SMS dileri
                          </div>
                        </div>

                      </div>
                    </button>

                    {/* INSURANCE */}

                    <button
                      type="button"
                      onClick={() =>
                        setFType(
                          "insurance",
                        )
                      }
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        fType ===
                        "insurance"
                          ? "border-emerald-600 bg-emerald-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">

                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            fType ===
                            "insurance"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100"
                          }`}
                        >
                          🛡️
                        </div>

                        <div>
                          <div className="font-bold text-slate-900">
                            SUG'URTA
                          </div>

                          <div className="text-xs text-slate-500">
                            Sug'urta dileri
                          </div>
                        </div>

                      </div>
                    </button>

                  </div>
                </div>

                {/* ACTIVE */}

                <div className="sm:col-span-2">

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">

                    <input
                      type="checkbox"
                      checked={
                        fActive
                      }
                      onChange={(
                        e,
                      ) =>
                        setFActive(
                          e.target
                            .checked,
                        )
                      }
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <div>
                      <div className="font-semibold text-slate-900">
                        Diler faol
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        Diler tizimda
                        faol holatda
                        bo'ladi
                      </div>
                    </div>

                  </label>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setFormOpen(
                    false,
                  )
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !fName.trim() ||
                  !fLogin.trim()
                }
                onClick={
                  saveDealer
                }
                className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saqlanmoqda..."
                  : editing
                    ? "Saqlash"
                    : "Diler yaratish"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          VIEW DEALER MODAL
      ====================================================== */}

      {viewOpen &&
        viewing && (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setViewOpen(
                  false,
                );
              }
            }}
          >

            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              onMouseDown={(e) =>
                e.stopPropagation()
              }
            >

              <div className="flex items-center justify-between border-b px-6 py-5">

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Diler ma'lumotlari
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Dilerning to'liq ma'lumotlari
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setViewOpen(
                      false,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl text-slate-400 hover:bg-slate-100"
                >
                  ×
                </button>

              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6">

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <InfoItem
                    label="Hudud"
                    value={
                      viewing.region ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Diler"
                    value={
                      viewing.name
                    }
                  />

                  <InfoItem
                    label="Kompaniya"
                    value={
                      viewing.company ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Login"
                    value={
                      viewing.login
                    }
                  />

                  <InfoItem
                    label="Telefon"
                    value={
                      viewing.phone ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Kod"
                    value={
                      viewing.code ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Turi"
                    value={
                      viewing.type ===
                      "insurance"
                        ? "SUG'URTA"
                        : "SMS"
                    }
                  />

                  <InfoItem
                    label="Holat"
                    value={
                      viewing.isActive
                        ? "Faol"
                        : "Faol emas"
                    }
                  />

                  <InfoItem
                    label="Yaratilgan sana"
                    value={
                      formatDate(
                        viewing.createdAt,
                      )
                    }
                  />

                </div>

                {viewing.stats && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                    <StatCard
                      label="SMS"
                      value={
                        viewing
                          .stats
                          .smsCount ??
                        0
                      }
                    />

                    <StatCard
                      label="Sug'urta"
                      value={
                        viewing
                          .stats
                          .insuranceCount ??
                        0
                      }
                    />

                    <StatCard
                      label="Mijozlar"
                      value={
                        viewing
                          .stats
                          .customerCount ??
                        0
                      }
                    />

                    <StatCard
                      label="Sotuvlar"
                      value={
                        viewing
                          .stats
                          .salesTotal ??
                        0
                      }
                    />

                  </div>
                )}

              </div>

              <div className="flex flex-col gap-2 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    setViewOpen(
                      false,
                    );
                    openEdit(
                      viewing,
                    );
                  }}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Tahrirlash
                </button>

                {viewing.isActive ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmOpen(
                        true,
                      )
                    }
                    className="h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Faolsizlantirish
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      toggleActive
                    }
                    className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Kutilmoqda..."
                      : "Faollashtirish"}
                  </button>
                )}

              </div>

            </div>

          </div>
        )}

      {/* ======================================================
          CONFIRM MODAL
      ====================================================== */}

      {confirmOpen &&
        viewing && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >

            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

              <div className="p-6">

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl">
                  ⚠️
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  Dilerni
                  faolsizlantirish
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {viewing.name}
                  </span>{" "}
                  dileri
                  faolsizlantiriladi.
                  Tarixiy ma'lumotlar
                  o'chirilmaydi.
                </p>

              </div>

              <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    setConfirmOpen(
                      false,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Bekor qilish
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    toggleActive
                  }
                  className="h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving
                    ? "Kutilmoqda..."
                    : "Ha, faolsizlantirish"}
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}

/* ============================================================
   EXPORT
============================================================ */

export default function DealersPage() {
  return (
    <Suspense
      fallback={
        <p className="py-12 text-center text-sm text-slate-500">
          ⏳ Yuklanmoqda...
        </p>
      }
    >
      <DealersPageInner />
    </Suspense>
  );
}