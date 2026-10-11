"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import {

  Bell,

  CalendarDays,

  Check,

  ChevronDown,

  ChevronRight,

  Clipboard,

  Clock3,

  FileSpreadsheet,

  Filter,

  Info,

  Search,

  Send,

  ShieldCheck,

  Upload,

  Users,

  X,

} from "lucide-react";




type Contact = {
  id: number;
  dbId?: number;
  passport: string;
  birthDate: string;
  status: string;
  company: string;
  phone: string;
  login: string;
  telegram: string;
  note: string;
  message: string;
  sent: boolean;
  resolved: boolean;
};




type ExcelBatch = {

  id: number;

  name: string;

  range: string;

  date: string;

  uploaded: boolean;

  contacts: Contact[];

};



const initialBatches: ExcelBatch[] = [

  {

    id: 1,

    name: "Fargona_1-7.xlsx",

    range: "1–7",

    date: "2026-09-14 10:24",

    uploaded: true,

    contacts: [

      {

        id: 1,

        passport: "AB 7340421",

        birthDate: "30.07.1972",

        status: "Voyaga yetgan",

        company: "Mobile Mini M",

        phone: "703255725",

        login: "oripov_s",

        telegram: "@Oripov_SSH",

        note: "Hujjat yo‘q",

        message:

          "Assalomu alaykum, hujjatingizda imzo mavjud emas. Iltimos, imzolangan hujjatni yuboring.",

        sent: false,

        resolved: false,

      },

      {

        id: 2,

        passport: "AC 9987123",

        birthDate: "12.03.2008",

        status: "Voyaga yetmagan",

        company: "Global Servis",

        phone: "901234567",

        login: "azizbek_08",

        telegram: "@Azizbek_08",

        note: "Pasport yo‘q",

        message:

          "Assalomu alaykum, pasportingiz yuklanmagan. Iltimos, pasport nusxasini yuboring.",

        sent: true,

        resolved: false,

      },

      {

        id: 3,

        passport: "AD 1122334",

        birthDate: "15.11.2006",

        status: "Voyaga yetmagan",

        company: "Mobile Mini M",

        phone: "935556677",

        login: "nodir_j",

        telegram: "@Nodir_J",

        note: "Rozilik xati yo‘q",

        message:

          "Assalomu alaykum, ota-ona rozilik xati talab qilinadi. Iltimos, hujjatni yuboring.",

        sent: false,

        resolved: false,

      },

      {

        id: 4,

        passport: "BE 5566778",

        birthDate: "22.05.1999",

        status: "Voyaga yetgan",

        company: "UzAuto Trans",

        phone: "907778899",

        login: "behruz_t",

        telegram: "@Behruz_T",

        note: "To‘liq",

        message:

          "Assalomu alaykum! Hujjatlaringiz to‘liq va qabul qilindi. Rahmat!",

        sent: true,

        resolved: true,

      },

      {

        id: 5,

        passport: "AA 8877665",

        birthDate: "01.01.2007",

        status: "Voyaga yetmagan",

        company: "Global Servis",

        phone: "915551122",

        login: "dilshod_01",

        telegram: "@Dilshod_01",

        note: "Hujjat yo‘q",

        message:

          "Assalomu alaykum, hujjatda imzo yo‘q. Iltimos, imzolangan variantini yuboring.",

        sent: false,

        resolved: false,

      },

    ],

  },

  {

    id: 2,

    name: "Fargona_8-11.xlsx",

    range: "8–11",

    date: "2026-09-13 16:20",

    uploaded: true,

    contacts: [],

  },

  {

    id: 3,

    name: "Namangan_12-18.xlsx",

    range: "12–18",

    date: "2026-09-10 14:35",

    uploaded: true,

    contacts: [],

  },

  {

    id: 4,

    name: "Andijon_19-25.xlsx",

    range: "19–25",

    date: "2026-09-08 11:50",

    uploaded: false,

    contacts: [],

  },

];



export default function TelegramPage() {

  const [batches, setBatches] = useState(initialBatches);

  const [expanded, setExpanded] = useState<number[]>([1]);

  const [query, setQuery] = useState("");

  const [uploadFilter, setUploadFilter] = useState("Barchasi");

  const [messageFilter, setMessageFilter] = useState("Barchasi");

  const [resolvedFilter, setResolvedFilter] = useState("Barchasi");

  const [selected, setSelected] = useState<number[]>([]);

  const [notice, setNotice] = useState("");

  const [pasteOpen, setPasteOpen] = useState(false);

  const [pasteText, setPasteText] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);



  const allContacts = batches.flatMap((batch) => batch.contacts);

  useEffect(() => {
    let cancelled = false;

    async function loadTelegramRows() {
      try {
        const response = await fetch("/api/telegram?page=1&pageSize=100", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Telegram ma'lumotlarini yuklab bo'lmadi.");
        }
        if (cancelled) return;

        const rows = Array.isArray(data.rows) ? data.rows : [];
        if (rows.length === 0) return;

        const contacts: Contact[] = rows.map((row: any, index: number) => ({
          id: -Math.abs(Number(row.id) || index + 1),
          dbId: Number(row.id),
          passport: row.passport ?? "",
          birthDate: row.birthDate ?? "",
          status: "",
          company: row.company ?? "",
          phone: row.phone ?? "",
          login: row.idr ?? "",
          telegram: row.telegram ?? "",
          note: [
            row.hasPassport === false && "Pasport yo'q",
            row.hasFatherPassport === false && "Ota pasporti yo'q",
            row.hasMotherPassport === false && "Ona pasporti yo'q",
            row.hasConsent === false && "Rozilik xati yo'q",
            row.hasSignature === false && "Imzo yo'q",
          ].filter(Boolean).join(", "),
          message: row.message ?? "",
          sent: row.sendStatus === "sent",
          resolved: false,
        }));

        setBatches((previous) => {
          const withoutDatabaseBatch = previous.filter((batch) => batch.id !== -99999);
          return [
            ...withoutDatabaseBatch,
            {
              id: -99999,
              name: "Bazadagi Telegram xabarlari",
              range: `1–${contacts.length}`,
              date: new Date().toLocaleString("uz-UZ"),
              uploaded: true,
              contacts,
            },
          ];
        });
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Telegram ma'lumotlarini yuklashda xatolik.",
          );
        }
      }
    }

    void loadTelegramRows();
    return () => {
      cancelled = true;
    };
  }, []);



  const sentCount = allContacts.filter((contact) => contact.sent).length;



  const pendingCount = allContacts.filter(

    (contact) => !contact.sent && !contact.resolved,

  ).length;



  const resolvedCount = allContacts.filter(

    (contact) => contact.resolved,

  ).length;



  const filteredBatches = useMemo(() => {

    return batches.map((batch) => ({

      ...batch,

      contacts: batch.contacts.filter((contact) => {

        const searchableText = [

          contact.passport,

          contact.phone,

          contact.login,

          contact.company,

          contact.telegram,

          contact.note,

        ]

          .join(" ")

          .toLowerCase();



        if (

          query.trim() &&

          !searchableText.includes(query.trim().toLowerCase())

        ) {

          return false;

        }



        if (uploadFilter === "Yuklangan" && !batch.uploaded) {

          return false;

        }



        if (uploadFilter === "Yuklanmagan" && batch.uploaded) {

          return false;

        }



        if (messageFilter === "Yuborilgan" && !contact.sent) {

          return false;

        }



        if (

          messageFilter === "Yuborilmagan" &&

          (contact.sent || contact.resolved)

        ) {

          return false;

        }



        if (resolvedFilter === "Hal bo‘lgan" && !contact.resolved) {

          return false;

        }



        if (

          resolvedFilter === "Hal bo‘lmagan" &&

          contact.resolved

        ) {

          return false;

        }



        return true;

      }),

    }));

  }, [

    batches,

    query,

    uploadFilter,

    messageFilter,

    resolvedFilter,

  ]);



  function updateContact(

    batchId: number,

    contactId: number,

    changes: Partial<Contact>,

  ) {

    setBatches((previous) =>

      previous.map((batch) =>

        batch.id !== batchId

          ? batch

          : {

              ...batch,

              contacts: batch.contacts.map((contact) =>

                contact.id === contactId

                  ? { ...contact, ...changes }

                  : contact,

              ),

            },

      ),

    );

  }



  function toggleExpanded(id: number) {

    setExpanded((previous) =>

      previous.includes(id)

        ? previous.filter((item) => item !== id)

        : [...previous, id],

    );

  }



  function handleFile(file?: File) {

    if (!file) return;



    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {

      setNotice("Excel yoki CSV fayl tanlang.");

      return;

    }



    const nextId =

      Math.max(0, ...batches.map((batch) => batch.id)) + 1;



    setBatches((previous) => [

      ...previous,

      {

        id: nextId,

        name: file.name,

        range: `${nextId}`,

        date: new Date().toLocaleString("uz-UZ"),

        uploaded: false,

        contacts: [],

      },

    ]);



    setExpanded((previous) => [...previous, nextId]);



    setNotice(

      `${file.name} ro‘yxatga qo‘shildi. Kontaktlarni import qilish uchun Excel parser va backend ulanishi kerak.`,

    );

  }



async function importPastedRows() {
  const rows = pasteText
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => row.split("\t"));

  if (!rows.length) {
    setNotice("Avval Excel ma’lumotlarini joylang.");
    return;
  }

  const importRows = rows.map((columns) => ({
    passport: columns[0]?.trim() ?? "",
    birthDate: columns[1]?.trim() ?? "",
    fullName: columns[2]?.trim() ?? "",
    company: columns[3]?.trim() ?? "",
    phone: columns[4]?.trim() ?? "",
    idr: columns[5]?.trim() ?? "",
    telegram: columns[6]?.trim() ?? "",
    source: "Excel import",
  }));

  try {
    setNotice("Excel ma’lumotlari bazaga saqlanmoqda...");

    const response = await fetch("/api/telegram/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: importRows }),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw new Error(result.error || "Import bajarilmadi.");
    }

    const reloadResponse = await fetch(
      "/api/telegram?page=1&pageSize=100",
      { cache: "no-store" },
    );

    const reloadData = await reloadResponse.json();

    if (!reloadResponse.ok) {
      throw new Error(
        reloadData.error || "Bazadagi ma’lumotlarni qayta yuklab bo‘lmadi.",
      );
    }

    const contacts: Contact[] = (reloadData.rows ?? []).map(
      (row: any, index: number) => ({
        id: -Math.abs(Number(row.id) || index + 1),
        dbId: Number(row.id),
        passport: row.passport ?? "",
        birthDate: row.birthDate ?? "",
        status: "",
        company: row.company ?? "",
        phone: row.phone ?? "",
        login: row.idr ?? "",
        telegram: row.telegram ?? "",
        note: [
          row.hasPassport === false && "Pasport yo‘q",
          row.hasFatherPassport === false && "Ota pasporti yo‘q",
          row.hasMotherPassport === false && "Ona pasporti yo‘q",
          row.hasConsent === false && "Rozilik xati yo‘q",
          row.hasSignature === false && "Imzo yo‘q",
        ]
          .filter(Boolean)
          .join(", "),
        message: row.message ?? "",
        sent: row.sendStatus === "sent",
        resolved: false,
      }),
    );

    setBatches((previous) => [
      ...previous.filter((batch) => batch.id !== -99999),
      {
        id: -99999,
        name: "Bazadagi Telegram xabarlari",
        range: `1–${contacts.length}`,
        date: new Date().toLocaleString("uz-UZ"),
        uploaded: true,
        contacts,
      },
    ]);

    setExpanded((previous) =>
      previous.includes(-99999) ? previous : [...previous, -99999],
    );

    setSelected([]);
    setPasteText("");
    setPasteOpen(false);

    setNotice(
      `Import tugadi: ${result.imported ?? 0} ta yozuv saqlandi, ${result.createdCustomers ?? 0} ta yangi mijoz yaratildi, ${result.skipped ?? 0} ta qator o'tkazib yuborildi.`,
    );
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "Excel importida xatolik yuz berdi.",
    );
  }
}



  function markResolved(batchId: number, contact: Contact) {

    if (contact.resolved) return;



    updateContact(batchId, contact.id, {

      resolved: true,

    });



    setSelected((previous) =>

      previous.filter((id) => id !== contact.id),

    );

  }



  function toggleSelected(contact: Contact) {

    if (contact.resolved || (!contact.telegram && !contact.dbId)) return;



    setSelected((previous) =>

      previous.includes(contact.id)

        ? previous.filter((id) => id !== contact.id)

        : [...previous, contact.id],

    );

  }



  function toggleBatchSelected(contacts: Contact[]) {

    const eligible = contacts

      
.filter(
  (contact) =>
    !contact.resolved &&
    (contact.telegram || contact.dbId)
)


      .map((contact) => contact.id);



    const allSelected =

      eligible.length > 0 &&

      eligible.every((id) => selected.includes(id));



    setSelected((previous) =>

      allSelected

        ? previous.filter((id) => !eligible.includes(id))

        : Array.from(new Set([...previous, ...eligible])),

    );

  }



  async function sendSelected() {
    const chosen = allContacts.filter(
      (contact) =>
        selected.includes(contact.id) &&
        !contact.resolved &&
        (Boolean(contact.telegram) || Boolean(contact.dbId)),
    );

    if (!chosen.length) {
      setNotice("Yuborish uchun Telegram kontaktlarini tanlang.");
      return;
    }

    const databaseContacts = chosen.filter((contact) => contact.dbId);
    if (!databaseContacts.length) {
      setNotice("Tanlangan kontaktlar bazada yo'q. Bazadan yuklangan guruhdagi kontaktlarni tanlang.");
      return;
    }

    setNotice("Telegram xabarlari yuborilmoqda...");
    let sent = 0;
    let failed = 0;
    let simulated = 0;

    for (const contact of databaseContacts) {
      try {
        const saveResponse = await fetch(`/api/telegram/${contact.dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: contact.message }),
        });

        if (!saveResponse.ok) {
          failed++;
          continue;
        }

        const response = await fetch(`/api/telegram/${contact.dbId}/send`, {
          method: "POST",
        });
        const result = await response.json();

        if (!response.ok) {
          failed++;
          continue;
        }

        if (result.simulated) simulated++;
        else sent++;

        setBatches((previous) =>
          previous.map((batch) => ({
            ...batch,
            contacts: batch.contacts.map((item) =>
              item.id === contact.id
                ? { ...item, sent: !result.simulated }
                : item,
            ),
          })),
        );
      } catch {
        failed++;
      }
    }

    setSelected([]);
    setNotice(
      `Yakunlandi: ${sent} ta haqiqiy yuborildi, ${failed} ta xatolik, ${simulated} ta sinov rejimida.`,
    );
  }



  return (

    <div className="w-full   text-slate-800">

      <main className=" ">

        {/* HEADER */}

        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">

          <div className="flex  items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 sm:h-14 sm:w-14">

              <Send size={25} />

            </div>



            <div className="min-w-0">

              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">

                Telegram xabar yuborish

              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">

                Excel fayllar bo‘yicha kontaktlar va xabarlarni boshqaring.

              </p>

            </div>

          </div>



          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">

            <Bell size={18} className="text-blue-600" />

            <span className="text-xs text-slate-500">

              Jami kontaktlar

            </span>

            <strong className="text-lg">{allContacts.length}</strong>

          </div>

        </header>



        {/* STATISTICS */}

        <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">

          {[

            {

              title: "Excel fayllar",

              value: batches.length,

              icon: FileSpreadsheet,

              color: "text-blue-600",

              bg: "bg-blue-50",

            },

            {

              title: "Kontaktlar",

              value: allContacts.length,

              icon: Users,

              color: "text-indigo-600",

              bg: "bg-indigo-50",

            },

            {

              title: "Yuborilgan",

              value: sentCount,

              icon: Send,

              color: "text-emerald-600",

              bg: "bg-emerald-50",

            },

            {

              title: "Yuborilmagan",

              value: pendingCount,

              icon: Clock3,

              color: "text-red-600",

              bg: "bg-red-50",

            },

          ].map(({ title, value, icon: Icon, color, bg }) => (

            <div

              key={title}

              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"

            >

              <div className="flex items-center gap-3">

                <div className={`rounded-xl p-3 ${bg} ${color}`}>

                  <Icon size={21} />

                </div>

                <div>

                  <p className="text-xs text-slate-500">{title}</p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">

                    {value}

                  </p>

                </div>

              </div>

            </div>

          ))}

        </section>



        {/* UPLOAD AND SEARCH */}

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

            <div className="flex flex-wrap gap-2">

              <button

                onClick={() => fileRef.current?.click()}

                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"

              >

                <Upload size={17} />

                Excel yuklash

              </button>



              <input

                ref={fileRef}

                type="file"

                accept=".xlsx,.xls,.csv"

                className="hidden"

                onChange={(event) => {

                  handleFile(event.target.files?.[0]);

                  event.target.value = "";

                }}

              />



              <button

                onClick={() => setPasteOpen(true)}

                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"

              >

                <Clipboard size={17} />

                Excel’dan nusxa ko‘chirish

              </button>

            </div>



            <div className="relative min-w-0 flex-1">

              <Search

                size={17}

                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"

              />

              <input

                value={query}

                onChange={(event) => setQuery(event.target.value)}

                placeholder="Telefon, login, passport yoki kompaniya..."

                className="w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

              />

            </div>

          </div>



          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">

            <FilterSelect

              label="Excel"

              value={uploadFilter}

              onChange={setUploadFilter}

              options={["Barchasi", "Yuklangan", "Yuklanmagan"]}

            />



            <FilterSelect

              label="Xabar"

              value={messageFilter}

              onChange={setMessageFilter}

              options={["Barchasi", "Yuborilgan", "Yuborilmagan"]}

            />



            <FilterSelect

              label="Muammo"

              value={resolvedFilter}

              onChange={setResolvedFilter}

              options={["Barchasi", "Hal bo‘lgan", "Hal bo‘lmagan"]}

            />



            <button

              onClick={() => {

                setQuery("");

                setUploadFilter("Barchasi");

                setMessageFilter("Barchasi");

                setResolvedFilter("Barchasi");

              }}

              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"

            >

              <Filter size={15} />

              Filtrni tozalash

            </button>

          </div>



          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">

            <ShieldCheck size={15} />

            Hal bo‘lgan muammolar: {resolvedCount}

          </div>

        </section>



        {/* NOTIFICATION */}

        {notice && (

          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">

            <div className="flex items-start gap-2">

              <Info size={18} className="mt-0.5 shrink-0" />

              <span>{notice}</span>

            </div>



            <button

              onClick={() => setNotice("")}

              aria-label="Xabarni yopish"

            >

              <X size={17} />

            </button>

          </div>

        )}



        {/* EXCEL GROUPS */}

        <div className="space-y-3">

          {filteredBatches.map((batch) => {

            const isExpanded = expanded.includes(batch.id);

            const originalBatch = batches.find(

              (item) => item.id === batch.id,

            )!;



            const originalContacts = originalBatch.contacts;

            const batchSent = originalContacts.filter(

              (contact) => contact.sent,

            ).length;



            const progress = originalContacts.length

              ? Math.round(

                  (batchSent / originalContacts.length) * 100,

                )

              : 0;



            return (

              <section

                key={batch.id}

                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"

              >

                {/* EXCEL HEADER */}

                <button

                  onClick={() => toggleExpanded(batch.id)}

                  className="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-left hover:bg-slate-50"

                >

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">

                    <FileSpreadsheet size={25} />

                  </div>



                  <div className="min-w-0 flex-1">

                    <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">

                      Excel {batch.id} — {batch.range} oralig‘i

                    </h2>



                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">

                      <span>{batch.name}</span>



                      <span className="flex items-center gap-1">

                        <CalendarDays size={13} />

                        {batch.date}

                      </span>



                      <span>{originalContacts.length} ta qator</span>



                      <span

                        className={`rounded-md px-2 py-1 font-medium ${

                          batch.uploaded

                            ? "bg-blue-50 text-blue-700"

                            : "bg-orange-50 text-orange-700"

                        }`}

                      >

                        ● {batch.uploaded ? "Yuklangan" : "Yuklanmagan"}

                      </span>

                    </div>

                  </div>



                  <div className="hidden w-32 items-center gap-2 md:flex">

                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">

                      <div

                        className={`h-full rounded-full ${

                          progress === 100

                            ? "bg-emerald-500"

                            : "bg-blue-600"

                        }`}

                        style={{ width: `${progress}%` }}

                      />

                    </div>



                    <span className="text-xs text-slate-500">

                      {progress}%

                    </span>

                  </div>



                  <div className="rounded-lg border border-slate-200 p-2">

                    {isExpanded ? (

                      <ChevronDown size={17} />

                    ) : (

                      <ChevronRight size={17} />

                    )}

                  </div>

                </button>



                {isExpanded && (

                  <div className="border-t border-slate-100">

                    <div className="m-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">

                      <Info size={16} className="mt-0.5 shrink-0" />

                      <p>

                        Bir xil loginli kontaktlarga bir xil xabar

                        qo‘llash mumkin. Hal bo‘lgan kontaktga qayta

                        xabar yuborilmasligi serverda ham tekshirilishi

                        kerak.

                      </p>

                    </div>



                    {batch.contacts.length === 0 ? (

                      <div className="m-3 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">

                        <FileSpreadsheet

                          size={30}

                          className="mx-auto mb-3 text-slate-300"

                        />



                        <p className="text-sm font-semibold text-slate-700">

                          Bu Excel guruhida kontaktlar yo‘q

                        </p>



                        <p className="mt-1 text-xs text-slate-500">

                          Excel qatorlarini nusxalash yoki haqiqiy

                          fayl importini backendga ulash kerak.

                        </p>

                      </div>

                    ) : (

                      <>

                        <div className="mx-3 overflow-x-auto rounded-lg border border-slate-200">

                          <table className="w-full min-w-[1450px] border-collapse text-left text-xs">

                            <thead className="bg-slate-50 text-slate-600">

                              <tr>

                                <th className="w-9 p-3">

                                  <input

                                    type="checkbox"

                                    checked={

                                      batch.contacts.filter(

                                        (contact) =>

                                          !contact.resolved &&

                                          contact.telegram,

                                      ).length > 0 &&

                                      batch.contacts

                                        .filter(

                                          (contact) =>

                                            !contact.resolved &&

                                            contact.telegram,

                                        )

                                        .every((contact) =>

                                          selected.includes(contact.id),

                                        )

                                    }

                                    onChange={() =>

                                      toggleBatchSelected(batch.contacts)

                                    }

                                    aria-label="Guruh kontaktlarini tanlash"

                                  />

                                </th>



                                <th className="p-3">#</th>

                                <th className="p-3">Passport</th>

                                <th className="p-3">Tug‘ilgan sana</th>

                                <th className="p-3">Holati</th>

                                <th className="p-3">Firma</th>

                                <th className="p-3">Telefon</th>

                                <th className="p-3">Login</th>

                                <th className="p-3">Telegram</th>

                                <th className="p-3">Izoh (hujjat holati)</th>

                                <th className="p-3">

                                  Xabar (tahrirlash mumkin)

                                </th>

                                <th className="p-3">Holat</th>

                                <th className="p-3">Amal</th>

                              </tr>

                            </thead>



                            <tbody className="divide-y divide-slate-100">

                              {batch.contacts.map((contact, index) => (

                                <tr

                                  key={contact.id}

                                  className={`align-top hover:bg-slate-50 ${

                                    contact.resolved

                                      ? "bg-emerald-50/30"

                                      : ""

                                  }`}

                                >

                                  <td className="p-3">

                                    <input

                                      type="checkbox"

                                      checked={selected.includes(contact.id)}

disabled={
  contact.resolved ||
  (!contact.telegram && !contact.dbId)
}


                                      onChange={() =>

                                        toggleSelected(contact)

                                      }

                                      aria-label={`${contact.login} kontaktini tanlash`}

                                    />

                                  </td>



                                  <td className="p-3 text-slate-400">

                                    {index + 1}

                                  </td>



                                  <td className="whitespace-nowrap p-3 font-medium">

                                    {contact.passport}

                                  </td>



                                  <td className="whitespace-nowrap p-3">

                                    {contact.birthDate}

                                  </td>



                                  <td className="p-3">

                                    <span

                                      className={`inline-block rounded-md px-2 py-1 text-[10px] font-medium ${

                                        contact.status.includes("yetmagan")

                                          ? "bg-orange-50 text-orange-700"

                                          : "bg-emerald-50 text-emerald-700"

                                      }`}

                                    >

                                      {contact.status}

                                    </span>

                                  </td>



                                  <td className="p-3">{contact.company}</td>



                                  <td className="whitespace-nowrap p-3">

                                    {contact.phone}

                                  </td>



                                  <td className="p-3 font-medium text-blue-700">

                                    {contact.login}

                                  </td>



                                  <td className="p-3 text-blue-700">

                                    {contact.telegram || "Mavjud emas"}

                                  </td>



                                  <td className="min-w-44 p-2">

                                    <textarea

                                      value={contact.note}

                                      onChange={(event) =>

                                        updateContact(

                                          batch.id,

                                          contact.id,

                                          { note: event.target.value },

                                        )

                                      }

                                      rows={2}

                                      className="w-full min-w-40 resize-y rounded-md border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                                    />

                                  </td>



                                  <td className="min-w-64 p-2">

                                    <textarea

                                      value={contact.message}

                                      disabled={contact.resolved}

                                      onChange={(event) =>

                                        updateContact(

                                          batch.id,

                                          contact.id,

                                          { message: event.target.value },

                                        )

                                      }

                                      rows={2}

                                      className="w-full min-w-60 resize-y rounded-md border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"

                                    />

                                  </td>



                                  <td className="p-3">

                                    {contact.resolved ? (

                                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">

                                        <Check size={12} />

                                        Hal bo‘lgan

                                      </span>

                                    ) : contact.sent ? (

                                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">

                                        <Check size={12} />

                                        Yuborilgan

                                      </span>

                                    ) : (

                                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700">

                                        <Clock3 size={12} />

                                        Yuborilmagan

                                      </span>

                                    )}

                                  </td>



                                  <td className="p-2">

                                    <button

                                      disabled={contact.resolved}

                                      onClick={() =>

                                        markResolved(batch.id, contact)

                                      }

                                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"

                                    >

                                      <Check size={14} />

                                      Hal bo‘ldi

                                    </button>

                                  </td>

                                </tr>

                              ))}

                            </tbody>

                          </table>

                        </div>



                        <div className="flex flex-wrap items-center justify-between gap-3 p-3">

                          <p className="text-xs text-slate-500">

                            Tanlangan:{" "}

                            <strong className="text-slate-800">

                              {

                                batch.contacts.filter((contact) =>

                                  selected.includes(contact.id),

                                ).length

                              }

                            </strong>{" "}

                            ta

                          </p>



                          <button

                            onClick={sendSelected}

                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"

                          >

                            <Send size={16} />

                            Tanlanganlarga xabar yuborish

                          </button>

                        </div>

                      </>

                    )}

                  </div>

                )}

              </section>

            );

          })}

        </div>



        {/* EXCEL PASTE MODAL */}

        {pasteOpen && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">

            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">

              <div className="mb-4 flex items-center justify-between gap-3">

                <h2 className="text-lg font-bold text-slate-900">

                  Excel’dan nusxa ko‘chirish

                </h2>



                <button

                  onClick={() => setPasteOpen(false)}

                  className="rounded-lg p-2 hover:bg-slate-100"

                  aria-label="Yopish"

                >

                  <X size={19} />

                </button>

              </div>



              <p className="mb-3 text-sm text-slate-500">

                Excel qatorlarini Ctrl+C bilan nusxalang va quyidagi

                maydonga Ctrl+V bilan joylang.

              </p>



              <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">

                Ustunlar tartibi: Passport, tug‘ilgan sana, holati,

                firma, telefon, login, Telegram, izoh, xabar.

              </div>



              <textarea

                value={pasteText}

                onChange={(event) => setPasteText(event.target.value)}

                placeholder="Excel qatorlarini shu yerga joylang..."

                rows={8}

                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

              />



              <div className="mt-4 flex justify-end gap-2">

                <button

                  onClick={() => setPasteOpen(false)}

                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"

                >

                  Bekor qilish

                </button>



                <button

                  onClick={importPastedRows}

                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"

                >

                  Import qilish

                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>

  );

}



function FilterSelect({

  label,

  value,

  options,

  onChange,

}: {

  label: string;

  value: string;

  options: string[];

  onChange: (value: string) => void;

}) {

  return (

    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">

      <span className="shrink-0 text-[11px] text-slate-400">

        {label}:

      </span>



      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"

      >

        {options.map((option) => (

          <option key={option} value={option}>

            {option}

          </option>

        ))}

      </select>

    </label>

  );

}
