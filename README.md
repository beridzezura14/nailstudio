# ფრჩხილის სტუდია

Next.js + Supabase პროექტი ფრჩხილის სტუდიისთვის. საიტი სრულად ქართულადაა, მომხმარებელს შეუძლია სერვისის და სპეციალისტის არჩევა, თავისუფალი დროის ნახვა და ჯავშნის გაკეთება. ადმინ პანელი დაცულია Supabase Auth login-ით.

## ფუნქციები

- მთავარი გვერდი: ჰედერი, ჰერო, სერვისები, სპეციალისტები, გალერეა, კონტაქტი/მისამართი და ფუტერი.
- ცალკე About და Gallery გვერდები.
- ქართული UI და custom caps font `public/Fonts/caps.woff2`-დან.
- responsive დიზაინი მობილურზე, ტაბლეტზე და desktop-ზე.
- სერვისების მონიშვნა, საერთო ხანგრძლივობის დათვლა და ფასის ჩვენება.
- სპეციალისტის ბარათიდან პირდაპირ დაჯავშნის popup-ის გახსნა.
- სპეციალისტზე მიბმული სერვისები.
- თავისუფალი დროების გამოთვლა სამუშაო საათებით: `10:00-20:00`.
- დღევანდელ დღეზე უკვე გასული დროების დაბლოკვა.
- სპეციალისტის სამუშაო დღეები და არ ყოფნის პერიოდები.
- მომხმარებლის კალენდარში არამუშა/მიუწვდომელი დღეები გამკრთალებულია და ვერ აირჩევა.
- მომხმარებელს მიზეზი არ უჩნდება, მხოლოდ ხედავს რომ დღე მიუწვდომელია.
- Supabase Realtime განახლებები ჯავშნებზე, სერვისებზე, სპეციალისტებზე და ხელმისაწვდომობაზე.
- toast შეტყობინებები `alert()`-ების ნაცვლად.
- ადმინ პანელი login-ით, logout ღილაკით და RLS SQL-ით.
- ადმინში ჯავშნის დამატება, შეცვლა, შესრულებულად მონიშვნა, წაშლა და CSV export.
- მიმდინარე ჯავშანი ჩანს `მიმდინარე` badge-ით.
- შესრულებული ჯავშნები ინახება არქივში სტატისტიკისთვის.
- SEO: metadata, Open Graph, robots და sitemap.

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
NEXT_PUBLIC_SITE_URL=https://your-domain.ge
```

`NEXT_PUBLIC_ADMIN_EMAILS` არის comma-separated სია:

```env
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,second@example.com
```

თუ ეს ცვლადი ცარიელია, UI დონეზე ყველა authenticated user შეძლებს admin-ში შესვლას. production-ზე აუცილებლად მიუთითე მხოლოდ admin email-ები.

`NEXT_PUBLIC_SITE_URL` გამოიყენება SEO-სთვის: canonical URL-ები, Open Graph და sitemap ამ domain-ზე აიგება.

## Supabase SQL

საჭირო ცხრილები და policies მზად არის `supabase/` საქაღალდეში.

ახალი ბაზისთვის რეკომენდებული გაშვების რიგი:

```text
supabase/upsert_services.sql
supabase/add_services_sort_order.sql
supabase/add_booking_source.sql
supabase/add_booking_services.sql
supabase/add_booking_archive_status.sql
supabase/add_specialists.sql
supabase/add_specialist_availability.sql
supabase/enable_realtime.sql
supabase/secure_admin_rls.sql
```

`supabase/add_specialist_availability.sql` ამატებს:

- `specialist_working_days` ცხრილს.
- `specialist_time_off` ცხრილს.
- RLS policies-ს ამ ცხრილებისთვის.
- არსებულ სპეციალისტებზე საწყის სამუშაო დღეებს.
- database trigger-ს, რომელიც ბლოკავს ჯავშანს თუ სპეციალისტი იმ დღეს არ მუშაობს ან მიუწვდომელია.

თუ Supabase-დან მოდის შეცდომა `specialist is unavailable on this date`, ეს ნიშნავს რომ database trigger-მა დაიცვა ბაზა და ამ დღეზე ჯავშანი არ უნდა გაკეთდეს.

`supabase/enable_realtime.sql` რთავს Realtime-ს მთავარ ცხრილებზე, მათ შორის ხელმისაწვდომობის ცხრილებზე.

უსაფრთხოებისთვის მთავარი ფაილია:

```text
supabase/secure_admin_rls.sql
```

ეს ფაილი:

- რთავს RLS-ს მთავარ ცხრილებზე.
- public-ს უტოვებს სერვისების/სპეციალისტების წაკითხვას.
- public-ს უტოვებს ჯავშნის შექმნას.
- admin update/delete მოქმედებებს აძლევს მხოლოდ authenticated user-ს.

მნიშვნელოვანი: ძველი ფაილები `allow_booking_admin_changes.sql` და `allow_booking_cancel.sql` სატესტო რეჟიმისთვის იყო და permissive policies-ს ქმნის. production-ზე `secure_admin_rls.sql`-ის შემდეგ აღარ გაუშვა, თუ ზუსტად არ იცი რატომ გჭირდება.

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

## ადმინის გამოყენება

1. შედი `/admin/login`.
2. შეიყვანე Supabase Auth-ში შექმნილი admin email და password.
3. `/admin`-ში მენიუდან აირჩიე:
   - `ჯავშნები`
   - `სერვისები`
   - `სპეციალისტები`
4. ჯავშნებში შეგიძლია ხელით დაამატო/შეცვალო ჯავშანი, მონიშნო შესრულებულად ან წაშალო.
5. `Excel-ში გადმოწერა` ქმნის CSV ფაილს ჯავშნების backup/export-ისთვის.

## სპეციალისტების ხელმისაწვდომობა

ადმინში სპეციალისტის შეცვლისას შეგიძლია:

- მიუთითო სამუშაო დღეები.
- დაამატო არ ყოფნის პერიოდი და მიზეზი.
- წაშალო უკვე დამატებული პერიოდი.

სპეციალისტის ბარათზე ადმინში ჩანს:

- მიზეზი, თუ დღეს სპეციალისტი მიუწვდომელია.
- `დღეს არ მუშაობს` თუ დღეს სამუშაო დღე არ აქვს.
- `მიზეზი: YYYY-MM-DD - YYYY-MM-DD` თუ მომავალი არ ყოფნის პერიოდი აქვს.

მომხმარებლის მხარეს ეს ინფორმაცია უფრო მშვიდად ჩანს: ასეთი დღეები უბრალოდ გამკრთალებულია და ვერ აირჩევა.

## ფაილების სტრუქტურა

```text
app/
  page.tsx
  about/page.tsx
  gallery/page.tsx
  layout.tsx
  robots.ts
  sitemap.ts
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
  availability.ts
  booking-errors.ts
  toast.ts
  admin-auth.ts
  seo.ts

supabase/
  *.sql
```

## დიზაინი

პალიტრა განახლებულია `porcelain + sage + charcoal` მიმართულებით, რომ საიტი განსხვავდებოდეს თბილი კრემისფერი/ყავისფერი დიზაინებისგან.

ძირითადი ტონები:

- ფონები: ღია porcelain/sage.
- accent: sage green.
- ტექსტი და მთავარი ღილაკები: charcoal.
- შეტყობინებები: toast popup-ები ზედა მარჯვენა კუთხეში.

## შენიშვნები

- მომხმარებლის მხარეს დროები ითვლება სპეციალისტის მიხედვით.
- თუ მიმდინარე სამუშაო საათები გასულია, თავისუფალი დროების ბლოკი ამას აჩვენებს.
- მობილურზე დროების სია ორ სვეტად ჩანს.
- popup-ის გახსნისას გვერდი უკან აღარ ისქროლება.
- admin-ში დღევანდელი აქტიური ჯავშანი, რომელიც ახლა მიმდინარეობს, მწვანედ ჩანს `მიმდინარე` ნიშნით.
