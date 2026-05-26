# ფრჩხილის სტუდია

Next.js + Supabase პროექტი ფრჩხილის სტუდიისთვის. საიტი არის ქართულად, მომხმარებელს შეუძლია სერვისის და სპეციალისტის არჩევა, თავისუფალი დროის ნახვა და ჯავშნის გაკეთება. ადმინ პანელი დაცულია Supabase Auth login-ით.

## ფუნქციები

- მთავარი გვერდი: ჰედერი, ჰერო, სერვისები, სპეციალისტები, გალერეა, კონტაქტი და ფუტერი.
- About და Gallery გვერდები.
- ქართული UI და custom caps font `public/Fonts/caps.woff2`-დან.
- responsive დიზაინი მობილურისთვის და desktop-ისთვის.
- სერვისების მონიშვნა და საერთო ხანგრძლივობის დათვლა.
- სპეციალისტის ბარათიდან პირდაპირ დაჯავშნის popup-ის გახსნა.
- სპეციალისტზე მიბმული სერვისები.
- თავისუფალი დროების გამოთვლა სამუშაო საათებით: `10:00-20:00`.
- უკვე გასული დროების დაბლოკვა დღევანდელ დღეზე.
- Supabase Realtime განახლებები ჯავშნებზე, სერვისებზე და სპეციალისტებზე.
- toast შეტყობინებები `alert()`-ების ნაცვლად.
- ადმინ პანელი login-ით, logout ღილაკით და RLS SQL-ით.
- ადმინში ჯავშნის დამატება, შეცვლა, შესრულებულად მონიშვნა, წაშლა და CSV export.
- მიმდინარე ჯავშნის მონიშვნა `მიმდინარე` badge-ით.
- დასრულებული ჯავშნები ინახება არქივში სტატისტიკისთვის.

## გაშვება

```bash
npm install
npm run dev
```

ლოკალური მისამართები:

- მთავარი გვერდი: [http://localhost:3000](http://localhost:3000)
- ადმინი: [http://localhost:3000/admin](http://localhost:3000/admin)
- ადმინ login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Production build:

```bash
npm run build
```

## გარემოს ცვლადები

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_EMAILS=your-admin-email@example.com
```

`NEXT_PUBLIC_ADMIN_EMAILS` არის comma-separated სია. მაგალითად:

```env
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,second@example.com
```

თუ ეს ცვლადი ცარიელია, UI დონეზე ყველა authenticated user შეძლებს admin-ში შესვლას. ამიტომ production-ზე აუცილებლად მიუთითე admin email.

## Supabase

საჭირო ცხრილები და policies მზად არის `supabase/` საქაღალდეში.

ახალი ბაზისთვის რეკომენდებული გაშვების რიგი:

```text
supabase/upsert_services.sql
supabase/add_services_sort_order.sql
supabase/add_booking_source.sql
supabase/add_booking_services.sql
supabase/add_booking_archive_status.sql
supabase/add_specialists.sql
supabase/enable_realtime.sql
supabase/secure_admin_rls.sql
```

უსაფრთხოებისთვის მთავარი ფაილია:

```text
supabase/secure_admin_rls.sql
```

ეს ფაილი:

- რთავს RLS-ს მთავარ ცხრილებზე.
- public-ს უტოვებს სერვისების/სპეციალისტების წაკითხვას.
- public-ს უტოვებს ჯავშნის შექმნას.
- admin update/delete მოქმედებებს აძლევს მხოლოდ authenticated user-ს.

მნიშვნელოვანი: ძველი ფაილები `allow_booking_admin_changes.sql` და `allow_booking_cancel.sql` ტესტ რეჟიმისთვის იყო და permissive policies-ს ქმნის. production-ზე `secure_admin_rls.sql`-ის შემდეგ აღარ გაუშვა, თუ ზუსტად არ იცი რატომ გჭირდება.

## უსაფრთხოება

ამ ეტაპზე დაცვა შედგება ორი ნაწილისგან:

- UI guard: `/admin` login-ის გარეშე გადადის `/admin/login`-ზე.
- Supabase RLS: admin ცვლილებები მხოლოდ authenticated user-ს შეუძლია.

აუცილებლად გაითვალისწინე:

- Supabase Auth-ში public signup გამორთე.
- admin user შექმენი ხელით Supabase dashboard-იდან.
- frontend-ში არასდროს ჩადო Supabase `service_role` key.
- production environment-ში დაამატე `NEXT_PUBLIC_ADMIN_EMAILS`.
- RLS policies გადაამოწმე Supabase Dashboard-ში.

უფრო მკაცრი შემდეგი ნაბიჯი იქნება `admin_users` ცხრილის დამატება და RLS-ში `auth.uid()`-ით კონკრეტული admin user-ების შემოწმება.

## ფაილების სტრუქტურა

```text
app/
  page.tsx
  about/page.tsx
  gallery/page.tsx
  layout.tsx
  globals.css

  components/
    Header.tsx
    HomeHero.tsx
    HomeAboutPreview.tsx
    Services.tsx
    SpecialistsSection.tsx
    HomeGalleryPreview.tsx
    ContactSection.tsx
    BookingForm.tsx
    SiteFooter.tsx
    ToastHost.tsx

    about/
      AboutHero.tsx
      AboutImageStrip.tsx
      AboutValues.tsx

    gallery/
      GalleryHero.tsx
      GalleryGrid.tsx

  admin/
    page.tsx
    AdminAuthGate.tsx
    BookingAdmin.tsx
    ServiceAdmin.tsx
    SpecialistAdmin.tsx
    login/
      page.tsx
      LoginForm.tsx

lib/
  supabase.ts
  scheduling.ts
  toast.ts
  admin-auth.ts

supabase/
  *.sql
```

## დიზაინი

პალიტრა განახლებულია `porcelain + sage + charcoal` მიმართულებით, რომ განსხვავდებოდეს თბილი კრემისფერი/ყავისფერი საიტებისგან.

ძირითადი ტონები:

- ფონები: ღია porcelain/sage
- accent: sage green
- ტექსტი და მთავარი ღილაკები: charcoal
- შეტყობინებები: toast popup-ები ზედა მარჯვენა კუთხეში

## ადმინის გამოყენება

1. შედი `/admin/login`.
2. შეიყვანე Supabase Auth-ში შექმნილი admin email და password.
3. `/admin`-ში აირჩიე მენიუდან:
   - `ჯავშნები`
   - `სერვისები`
   - `სპეციალისტები`
4. ჯავშნებში შეგიძლია ხელით დაამატო/შეცვალო ჯავშანი, მონიშნო შესრულებულად ან წაშალო.
5. `Excel-ში გადმოწერა` ქმნის CSV ფაილს ჯავშნების backup/export-ისთვის.

## შენიშვნები

- მომხმარებლის მხარეს დროები ითვლება სპეციალისტის მიხედვით.
- თუ მიმდინარე სამუშაო საათები გასულია, თავისუფალი დროების ბლოკი ამას აჩვენებს.
- მობილურზე დროების სია ორ სვეტად ჩანს.
- popup-ის გახსნისას გვერდი უკან აღარ ისქროლება.
- admin-ში დღევანდელი აქტიური ჯავშანი, რომელიც ახლა მიმდინარეობს, მწვანედ ჩანს `მიმდინარე` ნიშნით.
